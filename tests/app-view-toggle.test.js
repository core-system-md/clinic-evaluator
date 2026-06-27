const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

function createAppContext() {
  const dom = new JSDOM(`<!doctype html><html><body>
    <div class="container">
      <div id="view-lead-form" style="display:none"></div>
      <div id="view-assessment" style="display:none"></div>
      <div id="view-loading" style="display:none"></div>
      <div id="view-results" style="display:none"></div>
      <div id="fatal-error"></div>
    </div>
  </body></html>`, { url: 'http://localhost/' });

  const context = vm.createContext({
    console,
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    location: dom.window.location,
  });
  context.window.window = context.window;
  context.window.document = dom.window.document;
  context.window.console = console;
  context.window.fetch = context.fetch;
  context.window.setTimeout = global.setTimeout;
  context.window.clearTimeout = global.clearTimeout;
  context.window.setInterval = global.setInterval;
  context.window.clearInterval = global.clearInterval;

  const source = fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'app.js' });
  const ClinicEvaluatorApp = vm.runInContext('ClinicEvaluatorApp', context);

  return { ClinicEvaluatorApp, document: dom.window.document };
}

test('showView removes inline display none so the section becomes visible', () => {
  const { ClinicEvaluatorApp, document } = createAppContext();
  const app = new ClinicEvaluatorApp();
  const view = document.getElementById('view-assessment');

  app.hideView('view-assessment');
  assert.equal(view.style.display, 'none');

  app.showView('view-assessment');
  assert.equal(view.style.display, '');
  assert.equal(view.classList.contains('hidden'), false);
});
