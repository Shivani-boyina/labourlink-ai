import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';

const credentials = JSON.parse(await readFile('.dataset-demo-credentials.json', 'utf8'));
const login = await fetch('http://127.0.0.1:8080/auth/login', {
  method: 'POST', body: new URLSearchParams({ phone: credentials.contractor_phone, password: credentials.password }),
});
assert.equal(login.status, 200);
const session = await login.json();
session.role = 'contractor';
const profile = await mkdtemp(join(tmpdir(), 'labourlink-analytics-'));
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-background-networking', '--disable-extensions', '--no-first-run',
  '--no-default-browser-check', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
  '--user-data-dir=' + profile, '--window-size=1440,1000', 'about:blank',
], { stdio: 'ignore', windowsHide: true });
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split(/\r?\n/)[0];
    if (/^\d+$/.test(port)) break;
    await pause(100);
  }
  assert.ok(port);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    if (message.error) task.reject(new Error(JSON.stringify(message.error)));
    else task.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (fn, ...args) => {
    const result = await send('Runtime.evaluate', { expression: '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')', returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, 'Browser evaluation failed');
    return result.result.value;
  };
  const waitFor = async (fn, label) => {
    for (let i = 0; i < 100; i++) { if (await evaluate(fn).catch(() => false)) return; await pause(200); }
    const state = await evaluate(() => ({ url: location.href, title: document.title, text: document.body?.innerText.slice(0, 700) }));
    throw new Error('Timed out waiting for ' + label + ' ' + JSON.stringify(state));
  };
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://*'] });
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await waitFor(() => Boolean(document.querySelector('#main')), 'frontend');
  await evaluate(data => {
    localStorage.setItem('ll_token', data.token);
    localStorage.setItem('ll_session', JSON.stringify(data));
    localStorage.setItem('labourlink-language', 'en');
  }, session);
  await send('Page.navigate', { url: 'http://localhost:5173/contractor/analytics' });
  await waitFor(() => document.querySelector('#main')?.innerText.includes('Employment status'), 'analytics');
  assert.equal(await evaluate(() => document.querySelectorAll('[role=alert]').length), 0);
  const choose = async (index, value) => evaluate((index, value) => {
    const select = document.querySelectorAll('#main select')[index];
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, index, value);
  await choose(0, 'demo');
  await waitFor(() => document.querySelector('#main')?.innerText.includes('1,000'), 'demo cohort');
  await waitFor(() => document.querySelector('#main')?.innerText.includes('Zero suitable recommendations'), 'validation results');
  await choose(1, '7');
  await waitFor(() => document.querySelector('svg[aria-label^="Workers with dated"] polyline')?.getAttribute('points')?.split(' ').length === 7, 'weekly trend');
  await mkdir('docs/analytics-screenshots', { recursive: true });
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await pause(400);
    const dimensions = await evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    assert.ok(dimensions.documentWidth <= dimensions.width + 1, `${name} horizontal overflow: ${JSON.stringify(dimensions)}`);
    const metrics = await send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize;
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 } });
    await writeFile(`docs/analytics-screenshots/${name}.png`, Buffer.from(screenshot.data, 'base64'));
  }
  console.log('PASS: authenticated analytics, demo cohort, validation report, weekly chart and desktop/mobile layout.');
} finally {
  socket?.close();
  browser.kill();
}
