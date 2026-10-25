const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const srcRoot = path.resolve(__dirname, '../src');
const firebaseModule = path.join(srcRoot, 'lib', 'firebase.ts');
const extensions = ['.ts', '.tsx', '.css', '.png'];
const originalExtensions = new Map(extensions.map((ext) => [ext, Module._extensions[ext]]));
const originalLoad = Module._load;

function compileSource(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(output, filename);
}

Module._extensions['.ts'] = compileSource;
Module._extensions['.tsx'] = compileSource;
Module._extensions['.css'] = (module) => { module.exports = ''; };
Module._extensions['.png'] = (module, filename) => { module.exports = filename; };
Module._load = function (request, parent, isMain) {
  if (request === 'leaflet') return { icon: (config) => config };
  if (request === 'react-leaflet') {
    return {
      MapContainer: ({ children }) => React.createElement('div', null, children),
      TileLayer: () => null,
      Marker: () => null,
      useMapEvents: () => undefined,
    };
  }
  if (Module._resolveFilename(request, parent, isMain) === firebaseModule) {
    return { db: {}, auth: { currentUser: null }, storage: {}, messaging: null };
  }
  return originalLoad.apply(this, arguments);
};

let IncidentReportForm;
let PlateVerificationBadge;
try {
  IncidentReportForm = require('../src/components/IncidentReportForm').default;
  PlateVerificationBadge = require('../src/components/PlateVerificationBadge').default;
} finally {
  Module._load = originalLoad;
  for (const ext of extensions) {
    if (originalExtensions.get(ext)) Module._extensions[ext] = originalExtensions.get(ext);
    else delete Module._extensions[ext];
  }
}

const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
function renderWithStates(Component, props, states = {}) {
  let stateIndex = 0;
  const previousDispatcher = internals.H;
  let tree;
  try {
    internals.H = {
      useState(initial) {
        const index = stateIndex++;
        return [Object.hasOwn(states, index) ? states[index] : initial, () => undefined];
      },
      useEffect() {},
      useRef(initial) { return { current: initial }; },
      useContext() { return { user: null, profile: null, loading: false }; },
    };
    tree = Component(props);
  } finally {
    internals.H = previousDispatcher;
  }
  return renderToStaticMarkup(tree);
}

function tagWith(html, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<[^>]*${escaped}[^>]*>`));
  assert.ok(match, `Missing rendered tag containing ${marker}`);
  return match[0];
}

function tagForText(html, tag, text) {
  const offset = html.indexOf(text);
  assert.ok(offset >= 0, `Missing rendered text: ${text}`);
  const matches = [...html.slice(0, offset).matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))];
  assert.ok(matches.length, `Missing <${tag}> before ${text}`);
  return matches.at(-1)[0];
}

function svgTagForButtonText(html, text) {
  const textOffset = html.indexOf(text);
  assert.ok(textOffset >= 0, `Missing rendered button text: ${text}`);
  const buttonOffset = html.lastIndexOf('<button', textOffset);
  assert.ok(buttonOffset >= 0, `Missing <button> before ${text}`);
  const svgOffset = html.indexOf('<svg', buttonOffset);
  assert.ok(svgOffset > buttonOffset && svgOffset < textOffset, `Missing SVG inside button ${text}`);
  return html.slice(svgOffset, html.indexOf('>', svgOffset) + 1);
}

function checkClasses(tag, expected, absent = []) {
  const className = tag.match(/class="([^"]*)"/)?.[1] || '';
  const tokens = className.split(/\s+/);
  for (const token of expected) assert.ok(tokens.includes(token), `Missing ${token} in ${tag}`);
  for (const token of absent) assert.ok(!tokens.includes(token), `Unexpected ${token} in ${tag}`);
}

const incidentProps = { isOpen: true, onClose() {} };

test('IncidentReportForm renders the real sheet markup', () => {
  const html = renderWithStates(IncidentReportForm, incidentProps);
  assert.match(html, /REPORTE DE INCIDENTE/);
  assert.match(html, /<form /);
  assert.ok(tagWith(html, 'placeholder="Ej:'));
  assert.ok(tagWith(html, 'min-h-[85px]'));
  checkClasses(tagWith(html, 'aria-label="Cerrar reporte'), ['min-h-11', 'min-w-11']);
  checkClasses(tagWith(html, 'z-[2000]'), ['bg-slate-950/80']);
});

test('IncidentReportForm uses coherent light surfaces with deliberate dark exceptions', () => {
  const html = renderWithStates(IncidentReportForm, incidentProps, {
    0: 'ROBO', 2: 'GKLP42', 12: true, 19: true, 20: true,
  });
  checkClasses(tagWith(html, 'max-w-xl'), ['bg-white', 'text-slate-900'], ['bg-slate-950']);
  checkClasses(tagWith(html, 'z-[2000]'), ['bg-slate-950/80']);
  checkClasses(tagWith(html, 'p-4 border-b'), ['from-red-50', 'via-white', 'to-white']);
  checkClasses(tagForText(html, 'h2', 'REPORTE DE INCIDENTE'), ['text-slate-900']);
  checkClasses(tagForText(html, 'label', 'Tipo de Evento'), ['text-slate-700']);
  checkClasses(tagForText(html, 'button', 'Robo / Asalto'), ['bg-red-50', 'text-red-700']);
  checkClasses(tagWith(html, 'placeholder="Ej:'), ['bg-white', 'border-slate-300', 'text-slate-900']);
  checkClasses(tagWith(html, 'min-h-[85px]'), ['bg-white', 'border-slate-300', 'text-slate-900']);
  checkClasses(tagWith(html, 'title="Nota de Voz'), ['bg-slate-100', 'text-slate-600']);
  checkClasses(tagForText(html, 'button', 'Escanear Patente'), ['bg-slate-50', 'border-slate-300']);
  checkClasses(tagWith(html, 'absolute inset-0 z-30'), ['bg-white', 'text-slate-900']);
  checkClasses(tagForText(html, 'div', 'Toca el mapa'), ['bg-slate-50', 'border-slate-200']);
  checkClasses(tagForText(html, 'h3', 'Toca el mapa'), ['text-slate-900']);
  checkClasses(tagForText(html, 'button', 'Mi GPS'), ['bg-white', 'border-slate-300', 'text-slate-700']);
  const photoHtml = renderWithStates(IncidentReportForm, incidentProps, { 11: 'data:image/jpeg;base64,AA==' });
  checkClasses(tagWith(photoHtml, 'aria-label="Quitar foto"'), ['bg-slate-950/80', 'hover:text-white', 'min-h-11', 'min-w-11']);
});

test('IncidentReportForm uses readable light-theme placeholders', () => {
  const html = renderWithStates(IncidentReportForm, incidentProps);
  checkClasses(tagWith(html, 'placeholder="Ej:'), ['placeholder:text-slate-500'], ['placeholder:text-slate-400']);
  checkClasses(tagWith(html, 'min-h-[85px]'), ['placeholder:text-slate-500'], ['placeholder:text-slate-400']);
});
