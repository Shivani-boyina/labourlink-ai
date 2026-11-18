import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomInt } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';

const run = process.env.LABOURLINK_RELEASE_RUN;
const backend = new URL(process.env.LABOURLINK_RELEASE_BACKEND);
assert.equal(backend.hostname, '127.0.0.1');
assert.match(run, /[\\/]RestoreVerification[\\/][a-f0-9]{32}$/);
const app = resolve('labourlink-ai-frontend');
const bundle = join(run, 'release-frontend');
const vite = join(app, 'node_modules', 'vite', 'bin', 'vite.js');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const password = 'Rehearsal-' + randomBytes(16).toString('hex');
const failureSwitch = join(run, 'fastapi-unavailable');
const dashboardRepairOnly = process.env.LABOURLINK_DASHBOARD_REPAIR_TEST === 'true';
const actors = {
  owner: { name: 'Release contractor', phone: '6990000901', role: 'contractor' },
  other: { name: 'Release outside contractor', phone: '6990000902', role: 'contractor' },
  regular: { name: 'Release allocated worker', phone: '6990000903', role: 'worker' },
  alternate: { name: 'Release replacement worker', phone: '6990000904', role: 'worker' },
  incomplete: { name: 'Release incomplete worker', phone: '6990000905', role: 'worker' },
  unsupported: { name: 'Release unsupported worker', phone: '6990000906', role: 'worker' },
};
const day = (offset = 0) => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(Date.now() + offset * 86_400_000));
const today = day();
if (dashboardRepairOnly) actors.regular.phone = '6' + String(randomInt(1_000_000_000)).padStart(9, '0');

let frontend;
let browser;
let page;
let origin;
let title = 'Release rehearsal job';
let jobId;
let allocationId;
let requestId;
let pass = 0;

const wait = async (fn, label, duration = 10_000) => {
  const deadline = Date.now() + duration;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await pause(100);
  }
  throw new Error('Timed out waiting for ' + label);
};

const launch = (executable, args, env = process.env, cwd = process.cwd()) =>
  spawn(executable, args, { env, cwd, stdio: 'ignore', windowsHide: true });
const exited = (process) => process.exitCode !== null || process.signalCode !== null;
const finish = (process) => new Promise((resolve) => {
  if (exited(process)) resolve(process.exitCode);
  else process.once('exit', resolve);
});

async function request(path, { actor, method = 'GET', body, form, status = 200 } = {}) {
  const headers = {};
  if (actor?.token) headers.Authorization = 'Bearer ' + actor.token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (form !== undefined) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  const result = await fetch(new URL(path, backend), {
    method, headers, signal: AbortSignal.timeout(7000),
    body: body !== undefined ? JSON.stringify(body) : form ? new URLSearchParams(form) : undefined,
  });
  if (result.status !== status) {
    const message = await result.text();
    const diagnostic = /bad sql grammar|syntax error/i.test(message) ? ' (database statement rejected)' : '';
    throw new Error(method + ' ' + path.replace(/\?.*/, '') + ' expected ' + status + ', got ' + result.status + diagnostic);
  }
  const text = await result.text();
  return result.ok && text ? JSON.parse(text) : null;
}

const select = (name) => '[name="' + name + '"]';
const selectors = {
  worker: ['name','phone','skill','experience','expectedWagePerDay','location','category','state','district','password','confirmPassword'],
  contractor: ['contractorName','companyName','phone','location','state','district','password'],
};

async function browserProtocol(url) {
  const ws = new WebSocket(url);
  await new Promise((ok, fail) => { ws.addEventListener('open', ok, { once: true }); ws.addEventListener('error', fail, { once: true }); });
  const pending = new Map();
  let next = 0;
  ws.addEventListener('message', ({ data }) => {
    const response = JSON.parse(data);
    const current = pending.get(response.id);
    if (!current) return;
    pending.delete(response.id);
    if (response.error) current.fail(new Error('Browser protocol command failed'));
    else current.ok(response.result);
  });
  return {
    close: () => ws.close(),
    send: (method, params = {}) => new Promise((ok, fail) => {
      const id = ++next;
      pending.set(id, { ok, fail });
      ws.send(JSON.stringify({ id, method, params }));
    }),
  };
}

function evaluate(fn, ...args) {
  return page.send('Runtime.evaluate', {
    expression: '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')',
    returnByValue: true,
  }).then((result) => {
    if (result.exceptionDetails) throw new Error('Browser interaction raised an exception');
    return result.result.value;
  });
}
const text = (value) => evaluate((needle) => document.querySelector('#main')?.innerText.includes(needle) ?? false, value).catch(() => false);
const see = (value, timeout) => wait(() => text(value), value, timeout);
const path = (value) => wait(() => evaluate((expected) => location.pathname === expected, value), 'navigation to ' + value);
const visible = (selector) => wait(() => evaluate((s) => Boolean(document.querySelector(s)?.getClientRects().length), selector), selector);
async function go(url) {
  await page.send('Page.navigate', { url: origin + url });
  await wait(() => evaluate((target) => location.pathname === target && Boolean(document.querySelector('#main')), url)
    .catch(() => false), 'page ' + url, 4000).catch(async () => {
      await visible('#main'); // React may already have redirected to a role-specific route.
    });
}
async function fill(selector, value) {
  await visible(selector);
  const applied = await evaluate((css, input) => {
    const el = document.querySelector(css);
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    if (!setter) return false;
    el.focus();
    setter.call(el, String(input));
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    el.blur();
    return el.value === String(input);
  }, selector, value);
  assert.ok(applied, 'Could not set ' + selector);
}
async function click(label, scope = '#main', contains = '') {
  await wait(() => evaluate((label, scope, fragment) => {
    const roots = [...document.querySelectorAll(scope)].filter((el) => el.innerText.includes(fragment));
    const control = roots.flatMap((root) => [...root.querySelectorAll('button,a')])
      .find((el) => el.innerText.trim() === label && !el.disabled && el.getClientRects().length);
    if (!control) return false;
    control.click();
    return true;
  }, label, scope, contains), 'control ' + label);
}
async function submit(css = '#main form') {
  await wait(() => evaluate((css) => {
    const form = document.querySelector(css);
    const button = form?.querySelector('button[type=submit]');
    if (!button || button.disabled || !button.getClientRects().length) return false;
    button.click();
    return true;
  }, css), 'form submit');
}
async function login(actor) {
  await evaluate(() => ['ll_token', 'll_session', 'll_worker_profile'].forEach((key) => localStorage.removeItem(key)));
  await go(actor.role === 'worker' ? '/worker/login' : '/login');
  await fill('#phone', actor.phone);
  await fill('#password', password);
  await submit();
  await path('/' + actor.role + '/dashboard');
  const session = await evaluate(() => JSON.parse(localStorage.getItem('ll_session') ?? '{}'));
  assert.equal(session.role, actor.role);
  actor.id = session.userId;
  actor.token = await evaluate(() => localStorage.getItem('ll_token'));
  assert.ok(typeof actor.token === 'string' && actor.token.length > 50, 'Browser received a session');
}
async function registerViaBrowser(actor) {
  await go('/' + actor.role + '/register');
  const fields = actor.role === 'worker'
    ? { name: actor.name, phone: actor.phone, skill: 'Mason', experience: '5', expectedWagePerDay: '550',
        location: 'Hyderabad', category: 'skilled', state: 'Telangana', district: 'Hyderabad', password, confirmPassword: password }
    : { contractorName: actor.name, companyName: 'Release fixture team', phone: actor.phone,
        location: 'Hyderabad', state: 'Telangana', district: 'Hyderabad', password };
  for (const name of selectors[actor.role]) await fill(select(name), fields[name]);
  await submit();
  await see(actor.role === 'worker' ? 'Registration Complete!' : 'Contractor Registration Complete');
}
async function fixtureActor(actor, extras = {}) {
  await request('/' + (actor.role === 'worker' ? 'workers' : 'contractors') + '/register', {
    method: 'POST', status: actor.role === 'worker' ? 200 : 201,
    body: actor.role === 'worker'
      ? { name: actor.name, phone: actor.phone, password, skill: 'Mason', experience: 2, location: 'Hyderabad',
          category: 'skilled', state: 'Telangana', district: 'Hyderabad', expectedWagePerDay: 500, availability: true, ...extras }
      : { contractorName: actor.name, companyName: 'Release fixture team', phone: actor.phone, password, location: 'Hyderabad' },
  });
  const auth = await request(actor.role === 'worker' ? '/auth/worker/login' : '/auth/login', {
    method: 'POST', form: { phone: actor.phone, password },
  });
  actor.token = auth.token;
  actor.id = auth.userId;
}
async function group(name, runGroup) {
  try {
    await runGroup();
    pass++;
    console.log('BROWSER PASS ' + name);
  } catch (error) {
    console.error('BROWSER FAIL ' + name + ' | ' + error.message);
    throw new Error('Workflow dependency blocked further browser checks');
  }
}

async function scanBundle(root) {
  const canaries = [password, process.env.LABOURLINK_RELEASE_JWT_CANARY];
  assert.ok(canaries[1]?.length > 20, 'JWT canary supplied');
  let scanned = 0;
  for (const directory of [root, join(root, 'assets')]) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !/\.(js|html|css|map)$/.test(entry.name)) continue;
      const content = await readFile(join(directory, entry.name), 'utf8');
      assert.ok(canaries.every((secret) => !content.includes(secret)), 'Scratch credentials absent from ' + entry.name);
      assert.ok(!/jdbc:mysql:|BEGIN (?:RSA |EC )?PRIVATE KEY|sk-(?:proj-)?[A-Za-z0-9_-]{30,}/.test(content),
        'No connection URI or recognizable private key in ' + entry.name);
      scanned++;
    }
  }
  assert.ok(scanned >= 3, 'Production bundle files were scanned');
}

try {
  const config = { ...process.env, VITE_API_BASE_URL: backend.origin, VITE_USE_MOCK_DATA: 'false' };
  const build = launch(process.execPath, [vite, 'build', '--outDir', bundle], config, app);
  assert.equal(await finish(build), 0, 'Isolated Vite production build succeeded');
  await scanBundle(bundle);
  console.log('BROWSER CHECK Production bundle canaries and key patterns absent');

  for (const port of [5173, 3000, 8080]) {
    const candidate = 'http://localhost:' + port;
    try { await fetch(candidate, { signal: AbortSignal.timeout(250) }); continue; } catch {}
    frontend = launch(process.execPath, [vite, 'preview', '--host', 'localhost', '--port', String(port), '--strictPort',
      '--outDir', bundle], config, app);
    try {
      await wait(async () => !exited(frontend) && (await fetch(candidate, { signal: AbortSignal.timeout(400) }).catch(() => null))?.ok,
        'private Vite preview', 3500);
      origin = candidate;
      break;
    } catch { if (!exited(frontend)) frontend.kill(); }
  }
  assert.ok(origin, 'A private Vite preview is available');
  const profile = join(run, 'release-chrome-profile');
  await mkdir(profile);
  browser = launch(chrome, ['--headless=new', '--disable-background-networking', '--disable-extensions',
    '--disable-sync', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1', '--user-data-dir=' + profile, '--window-size=1300,900', 'about:blank']);
  let debugPort;
  await wait(async () => {
    debugPort = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split(/\r?\n/)[0];
    return /^\d+$/.test(debugPort);
  }, 'scratch Chrome', 12000);
  const tabs = await (await fetch('http://127.0.0.1:' + debugPort + '/json/list')).json();
  const target = tabs.find((entry) => entry.type === 'page');
  page = await browserProtocol(target.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Network.enable');
  await page.send('Network.setBlockedURLs', { urls: ['https://*'] });

  if (dashboardRepairOnly) {
    await group('worker registration, login, dashboard and persistent profile on repaired schema', async () => {
      const worker = actors.regular;
      await registerViaBrowser(worker);
      await login(worker);
      await see(worker.name);
      const first = await request('/workers/me', { actor: worker });
      assert.equal(first.workerId, worker.id);
      assert.equal(first.averageRating, null);
      assert.equal(first.reviewCount, 0);
      await login(worker);
      await see(worker.name);
      const persisted = await request('/workers/me', { actor: worker });
      assert.equal(persisted.workerId, first.workerId);
      assert.equal(persisted.category, 'skilled');
    });
  } else {
  await group('anonymous redirect and English/Telugu navigation', async () => {
    await go('/worker/attendance');
    await path('/worker/login');
    await see('Login to LabourLink AI');
    await fill('select[aria-label="Language"]', 'te');
    await wait(() => evaluate(() => /\p{Script=Telugu}/u.test(document.querySelector('#main h1')?.textContent ?? '')), 'Telugu heading');
    await fill('select[aria-label="భాష"]', 'en');
    await see('Login to LabourLink AI');
    await submit();
    await wait(() => evaluate(() => Boolean(document.querySelector('#main [role=alert]'))), 'empty login validation');
  });
  await group('worker registration, login and profile edit', async () => {
    const worker = actors.regular;
    await registerViaBrowser(worker);
    await login(worker);
    await go('/worker/profile');
    await see('Matching profile');
    await fill('form:has([name=category]) [name=category]', 'semi-skilled');
    await click('Save profile details');
    await see('Profile details saved.');
    assert.equal((await request('/workers/me', { actor: worker })).category, 'semi-skilled');
    await go('/contractor/dashboard');
    await path('/worker/dashboard');
  });
  await group('contractor registration, login and profile edit', async () => {
    await evaluate(() => ['ll_token','ll_session','ll_worker_profile'].forEach((key) => localStorage.removeItem(key)));
    await registerViaBrowser(actors.owner);
    await login(actors.owner);
    await go('/contractor/profile');
    await see('Business region');
    await fill('form:has([name=district]) [name=district]', 'Ranga Reddy');
    await click('Save profile details');
    await see('Profile details saved.');
    assert.equal((await request('/contractors/me', { actor: actors.owner })).data.district, 'Ranga Reddy');
  });
  await group('job creation, editing and public details', async () => {
    await go('/contractor/jobs/create');
    await see('Post a New Job');
    const values = { title, requiredSkill: 'Mason', location: 'Hyderabad', category: 'Masonry', state: 'Telangana',
      district: 'Hyderabad', wagePerDay: '700', requiredWorkers: '1', minimumExperience: '1', durationDays: '2',
      startDate: day(-1), endDate: today };
    for (const [field, value] of Object.entries(values)) await fill(select(field), value);
    await submit();
    await see('Job created.');
    await path('/contractor/dashboard');
    const job = (await request('/jobs', { actor: actors.owner })).find((record) => record.title === title);
    assert.ok(job, 'Saved job exists');
    jobId = job.jobId;
    await go('/contractor/jobs/' + jobId + '/edit');
    await see('Edit Job Details');
    await fill('#title', title + ' edited');
    await submit();
    await see('Job updated.');
    title += ' edited';
    await go('/jobs/' + jobId);
    await see(title);
  });
  await group('original ML score, missing and unsupported encodings, and simulated service outage', async () => {
    await fixtureActor(actors.alternate);
    await fixtureActor(actors.incomplete, { category: null, expectedWagePerDay: 500 });
    await fixtureActor(actors.unsupported, { category: 'Untrained release category' });
    await page.send('Network.emulateNetworkConditions', {
      offline: false, latency: 800, downloadThroughput: -1, uploadThroughput: -1,
    });
    try {
      await go('/jobs/' + jobId + '/matches');
      await see('Finding matching workers...');
    } finally {
      await page.send('Network.emulateNetworkConditions', {
        offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
      });
    }
    await see('Original model score', 14000);
    await see('Rule-based recommendation');
    await see('Worker category — missing');
    await see('Worker category — unsupported by the trained model');
    const candidate = (await request('/jobs/' + jobId + '/matches', { actor: actors.owner })).find((row) => row.workerId === actors.regular.id);
    assert.equal(candidate?.recommendation.method, 'ML');
    assert.ok(candidate.recommendation.matchPercentage >= 0 && candidate.recommendation.matchPercentage <= 100);
    const job = await request('/jobs/' + jobId);
    await writeFile(failureSwitch, '503');
    try {
      await request('/jobs/' + jobId, { actor: actors.owner, method: 'PUT', body: { ...job, durationDays: 3 } });
      await go('/jobs/' + jobId + '/matches');
      await see('Model scoring is unavailable.', 12000);
    } finally {
      await unlink(failureSwitch);
    }
  });
  await group('worker applies and contractor accepts only one slot', async () => {
    const worker = actors.regular;
    await login(worker);
    await go('/jobs/' + jobId);
    await click('Apply for this Job');
    await see('You have applied for this job!');
    await request('/applications?jobId=' + jobId, { actor: actors.alternate, method: 'POST' });
    await login(actors.owner);
    await click('View Applicants', '#applicants > div > div', title);
    await see(worker.name);
    await click('Accept', '#applicants article', worker.name);
    const rows = await request('/applications/job/' + jobId, { actor: actors.owner });
    const own = rows.find((row) => row.workerId === worker.id);
    const other = rows.find((row) => row.workerId === actors.alternate.id);
    await wait(async () => (await request('/applications/job/' + jobId, { actor: actors.owner }))
      .some((row) => row.applicationId === own.applicationId && row.status === 'ACCEPTED'), 'accepted application');
    await request('/applications/' + other.applicationId + '/status?status=ACCEPTED',
      { actor: actors.owner, method: 'PUT', status: 409 });
    const allocations = await request('/allocations/contractor', { actor: actors.owner });
    assert.equal(allocations.filter((row) => row.jobId === jobId).length, 1);
    allocationId = allocations.find((row) => row.jobId === jobId).allocationId;
  });
  await group('hiring history, authorization and archive isolation', async () => {
    await go('/contractor/hiring-history');
    await see(title);
    await see('Selected on');
    await fixtureActor(actors.other);
    await request('/jobs/' + jobId + '/matches', { actor: actors.other, status: 403 });
    await request('/applications/job/' + jobId, { actor: actors.other, status: 403 });
    await request('/allocations/worker/' + allocationId + '/attendance', { actor: actors.alternate, status: 403 });
    await request('/applications/history/archived', { actor: actors.owner, status: 403 });
    assert.equal((await request('/applications/history/archived', { actor: actors.regular })).length, 0);
    await login(actors.regular);
    await go('/worker/applications');
    await see('Archived applications');
    await see('No archived applications available.');
    await see(title);
  });
  await group('attendance marks, correction audit and worker history', async () => {
    const owner = actors.owner;
    await login(owner);
    await go('/contractor/allocations');
    await fill('#allocation-choice', allocationId);
    await fill('#attendance-date', day(-1));
    await fill('#attendance-status', 'PRESENT');
    await click('Save attendance');
    await see('Marked');
    await fill('#attendance-date', today);
    await fill('#attendance-status', 'PENDING');
    await click('Save attendance');
    await wait(async () => (await request('/allocations/contractor/' + allocationId + '/attendance', { actor: owner }))
      .some((row) => row.workDate === today && row.status === 'PENDING'), 'pending mark');
    await click('Correct attendance or view history', 'li', today);
    await fill('form:has(textarea[minlength="12"]) select', 'ABSENT');
    await fill('textarea[minlength="12"]', 'Release rehearsal verified the attendance sheet');
    await click('Save correction');
    await wait(async () => (await request('/allocations/contractor/' + allocationId + '/attendance/' + today + '/corrections',
      { actor: owner })).some((row) => row.newStatus === 'ABSENT'), 'correction audit saved');
    await see('Release rehearsal verified the attendance sheet');
    await request('/allocations/contractor/' + allocationId + '/attendance/' + today + '/corrections', { actor: actors.other, status: 403 });
    await login(actors.regular);
    await go('/worker/attendance');
    await fill('#allocation-choice', allocationId);
    await see('Absent');
    await see('Present');
    assert.equal(await text('Release rehearsal verified the attendance sheet'), false);
  });
  await group('verified review and worker profile rating', async () => {
    await login(actors.owner);
    await go('/contractor/reviews');
    await see(title);
    await fill('#main select', '4');
    await fill('#main textarea', 'Release rehearsal review fixture');
    await click('Submit review');
    await see('4 out of 5');
    await request('/reviews/contractor/jobs/' + jobId + '/workers/' + actors.regular.id, {
      actor: actors.other, method: 'POST', body: { rating: 5 }, status: 403,
    });
    await login(actors.regular);
    await go('/worker/profile');
    await see('4 out of 5 · 1 review');
    await go('/worker/reviews');
    await see('Release rehearsal review fixture');
  });
  await group('replacement request, offer, acceptance, attendance and correction', async () => {
    await login(actors.owner);
    await go('/contractor/replacements');
    await see('Recorded absences');
    await click('Request coverage', 'li', title);
    await click('Find available replacements', 'article', title);
    await click('Send offer', 'li', actors.alternate.name);
    await see('Awaiting response');
    const rows = await request('/replacements/contractor/requests', { actor: actors.owner });
    requestId = rows.find((row) => row.jobTitle === title).requestId;
    const offer = rows.find((row) => row.requestId === requestId).offers.find((row) => row.workerId === actors.alternate.id);
    await request('/replacements/worker/offers/' + offer.offerId + '/response', {
      actor: actors.incomplete, method: 'PUT', body: { decision: 'ACCEPT' }, status: 403,
    });
    await login(actors.alternate);
    await go('/worker/replacements');
    await click('Accept offer');
    await see('Coverage accepted');
    await see('Not marked');
    await login(actors.owner);
    await go('/contractor/replacements');
    await click('Mark Present');
    await see('Replacement attendance · Present');
    await click('Correct attendance or view history');
    await fill('form:has(textarea[minlength="12"]) select', 'ABSENT');
    await fill('textarea[minlength="12"]', 'Release rehearsal verified replacement attendance');
    await click('Save correction');
    await see('Replacement attendance · Absent');
    await see('Release rehearsal verified replacement attendance');
    await see('Coverage confirmed');
  });
  }
  const secrets = [password, process.env.LABOURLINK_RELEASE_JWT_CANARY, ...Object.values(actors).map((actor) => actor.token)]
    .filter((value) => value?.length > 20);
  const logFiles = dashboardRepairOnly
    ? ['spring-test.log', 'browser-output.log'] : ['spring-test.log', 'fastapi.out', 'fastapi.err', 'browser-output.log'];
  for (const filename of logFiles) {
    const log = await readFile(join(run, filename), 'utf8');
    assert.ok(secrets.every((secret) => !log.includes(secret)), 'No browser test password, session token or signing key in ' + filename);
    assert.ok(!log.includes('Using generated security password:'), 'No generated fallback credential in ' + filename);
  }
  console.log('BROWSER CHECK Scratch session and credential canaries absent from the inspected service logs');
  console.log('BROWSER TOTAL ' + pass + ' passed, 0 failed, 0 skipped');
} catch (error) {
  console.error('BROWSER STOP ' + error.message);
  console.error('BROWSER TOTAL ' + pass + ' passed, 1 failed, '
    + Math.max(0, (dashboardRepairOnly ? 0 : 9) - pass) + ' not reached');
  process.exitCode = 1;
} finally {
  await unlink(failureSwitch).catch(() => {});
  if (page) {
    await Promise.race([page.send('Browser.close').catch(() => {}), pause(2000)]);
    page.close();
  }
  if (browser && !exited(browser)) browser.kill();
  if (frontend && !exited(frontend)) frontend.kill();
}
