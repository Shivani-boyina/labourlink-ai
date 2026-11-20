import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';

const dist = resolve('labourlink-ai-frontend/dist');
const chrome = process.env.LABOURLINK_TEST_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const html = await readFile(join(dist, 'index.html'), 'utf8');

function installFixtures(role, scenario) {
  const worker = {
    workerId: 9, name: 'Fixture worker', phone: '6990000903', skill: 'Carpenter',
    experience: 5, location: 'Vijayawada', availability: true,
  };
  const job = {
    jobId: 1, contractorId: 4, title: 'Cabinet installation', description: 'Cabinet installation',
    requiredSkill: 'Carpenter', location: 'Vijayawada', wagePerDay: 500,
    status: 'OPEN', requiredWorkers: 2,
  };
  const fallback = { method: 'RULE_BASED', matchPercentage: null, fallbackReason: 'MODEL_UNAVAILABLE', featureIssues: [] };
  const ml = { method: 'ML', matchPercentage: 92.55, fallbackReason: null, featureIssues: [] };
  const identity = {
    userId: role === 'worker' ? worker.workerId : job.contractorId,
    phone: worker.phone, name: role === 'worker' ? worker.name : 'Fixture contractor', role,
  };
  localStorage.setItem('ll_token', 'fixture-bearer');
  localStorage.setItem('ll_session', JSON.stringify(identity));
  localStorage.setItem('i18nextLng', 'en');

  window.fetch = async (url, options) => {
    const endpoint = new URL(url);
    switch (endpoint.pathname) {
      case '/auth/me':
        return Response.json({ ...identity, role: role.toUpperCase() });
      case '/workers/me':
        return Response.json(worker);
      case '/jobs':
        return Response.json([job]);
      case '/jobs/recommendations/me':
        if (options.headers.Authorization !== 'Bearer fixture-bearer' || endpoint.searchParams.get('details') !== 'true') {
          return Response.json({}, { status: 403 });
        }
        if (scenario === 'error') return Response.json({}, { status: 503 });
        if (scenario === 'invalid') return Response.json({ data: [] });
        if (scenario === 'empty') return Response.json({ recommendations: [], exclusions: ['LOCATION'] });
        return Response.json({
          recommendations: [{ job, matchingScore: 100, contractorName: 'Fixture contractor',
            recommendation: fallback, matchingReasons: ['SKILL', 'LOCATION'] }],
          exclusions: [],
        });
      case '/jobs/1/matches':
        if (options.headers.Authorization !== 'Bearer fixture-bearer') return Response.json({}, { status: 403 });
        return Response.json([{ ...worker, matchingScore: 100, recommendation: ml, matchingReasons: ['SKILL'] }]);
      default:
        return Response.json([]);
    }
  };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/assets/')) {
      const asset = basename(url.pathname);
      response.setHeader('Content-Type', asset.endsWith('.js') ? 'text/javascript' : 'text/css');
      response.end(await readFile(join(dist, 'assets', asset)));
      return;
    }
    const role = url.pathname.startsWith('/contractor') ? 'contractor' : 'worker';
    const args = [role, url.searchParams.get('scenario')].map((value) => JSON.stringify(value)).join(',');
    response.setHeader('Content-Type', 'text/html');
    response.end(html.replace('</head>', '<script>(' + installFixtures.toString() + ')(' + args + ')</script></head>'));
  } catch {
    response.writeHead(404).end();
  }
});

const profile = await mkdtemp(join(tmpdir(), 'labourlink-matching-'));
let browser;
let ws;
try {
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  browser = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let launchError;
  browser.on('error', (error) => { launchError = error; });

  let port;
  for (let attempt = 0; attempt < 80 && !port; attempt++) {
    if (launchError) throw launchError;
    try {
      port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0];
    } catch {
      await pause(100);
    }
  }
  assert.ok(port, 'Chrome did not start');
  const [page] = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ready, fail) => {
    ws.addEventListener('open', ready, { once: true });
    ws.addEventListener('error', fail, { once: true });
  });

  let messageId = 0;
  function cdp(method, params = {}) {
    const id = ++messageId;
    return new Promise((done, fail) => {
      const onMessage = ({ data }) => {
        const reply = JSON.parse(data);
        if (reply.id !== id) return;
        clearTimeout(timeout);
        ws.removeEventListener('message', onMessage);
        if (reply.error) fail(new Error(reply.error.message));
        else done(reply.result);
      };
      const timeout = setTimeout(() => {
        ws.removeEventListener('message', onMessage);
        fail(new Error(method + ' timed out'));
      }, 5000);
      ws.addEventListener('message', onMessage);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  const base = 'http://127.0.0.1:' + server.address().port;

  async function check(path, expected, absent = [], alert = false) {
    await cdp('Page.navigate', { url: base + path });
    let state;
    for (let attempt = 0; attempt < 70; attempt++) {
      try {
        const { result } = await cdp('Runtime.evaluate', {
          expression: '({ location: location.pathname + location.search, text: document.body.innerText, alert: !!document.querySelector("[role=alert]"), overflow: document.documentElement.scrollWidth > innerWidth })',
          returnByValue: true,
        });
        state = result.value;
        if (state?.location === path && expected.every((value) => state.text.includes(value)) && (!alert || state.alert)) break;
      } catch {
        // The old execution context can disappear during navigation.
      }
      await pause(100);
    }
    assert.equal(state?.location, path);
    for (const value of expected) assert.ok(state.text.includes(value), path + ' missing ' + value);
    for (const value of absent) assert.ok(!state.text.includes(value), path + ' unexpectedly shows ' + value);
    assert.equal(state.alert, alert);
    assert.equal(state.overflow, false);
    console.log('PASS ' + path);
  }

  const worker = '/worker/dashboard';
  await check(worker, ['AI Recommended Jobs', 'Fixture contractor', 'Rule-based compatibility score',
    '100/100', 'Model scoring is unavailable', 'Cabinet installation']);
  await check(worker + '?scenario=empty', ['No eligible jobs right now', 'Some jobs for your skill have a different location.',
    'All Available Jobs'], ['Rule-based compatibility score']);
  await check(worker + '?scenario=error', ['AI Recommended Jobs', 'All Available Jobs'], ['No eligible jobs right now'], true);
  await check(worker + '?scenario=invalid', ['The server returned an invalid recommendation response.'],
    ['No eligible jobs right now'], true);
  await check('/contractor/dashboard', ['Recommended Workers', 'Fixture worker', 'ML match score', '92.55/100']);
} finally {
  ws?.close();
  if (browser?.pid && browser.exitCode === null) {
    const exited = new Promise((done) => browser.once('exit', done));
    browser.kill();
    await exited;
  }
  server.close();
  if (dirname(resolve(profile)) === resolve(tmpdir()) && basename(profile).startsWith('labourlink-matching-')) {
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
