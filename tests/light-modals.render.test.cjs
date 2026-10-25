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

const plateProps = { plate: 'HRGR53', autoCheck: false };
const vehicleResult = {
  plate: 'HRGR53', formattedPlate: 'HR·GR·53', hasStolenReport: false, status: 'CLEAN',
  statusText: 'SIN ENCARGO POR ROBO REGISTRADO', checkedAt: '2026-10-25T00:00:00.000Z',
  source: 'Registro de prueba',
  vehicleDetails: { brand: 'CHEVROLET', model: 'SPARK GT', year: 2016, color: 'GRIS', vehicleType: 'AUTOMOVIL' },
};
function renderPlateResult(result, states = {}) {
  return renderWithStates(PlateVerificationBadge, plateProps, { 4: result, 5: result.plate, ...states });
}

test('PlateVerificationBadge manual action icons inherit the button foreground', () => {
  const clean = renderPlateResult(vehicleResult);
  checkClasses(tagForText(clean, 'button', 'Reportar Robo a la Red'), ['text-red-700', 'hover:bg-red-600', 'hover:text-white']);
  checkClasses(svgTagForButtonText(clean, 'Reportar Robo a la Red'), [], ['text-red-600']);

  const stolen = renderPlateResult({ ...vehicleResult, status: 'STOLEN', hasStolenReport: true });
  checkClasses(tagForText(stolen, 'button', 'Marcar Recuperado'), ['text-emerald-700', 'hover:bg-emerald-600', 'hover:text-white']);
  checkClasses(svgTagForButtonText(stolen, 'Marcar Recuperado'), [], ['text-emerald-600']);
});

test('PlateVerificationBadge uses readable source text on semantic light surfaces', () => {
  for (const result of [
    vehicleResult,
    { ...vehicleResult, status: 'STOLEN', hasStolenReport: true },
  ]) {
    const html = renderPlateResult(result);
    checkClasses(tagForText(html, 'span', 'Fuente:'), ['text-slate-600'], ['text-slate-500']);
  }
});

test('PlateVerificationBadge uses a readable stolen status pill', () => {
  const html = renderPlateResult({ ...vehicleResult, status: 'STOLEN', hasStolenReport: true });
  checkClasses(tagForText(html, 'span', '¡ENCARGO POR ROBO VIGENTE!'), ['bg-red-600', 'text-white'], ['bg-red-500']);
});

test('PlateVerificationBadge lightens pending surfaces', () => {
  const manual = renderWithStates(PlateVerificationBadge, plateProps);
  checkClasses(tagForText(manual, 'button', 'Verificar en AutoSeguro'), ['bg-white', 'border-slate-300', 'text-sky-700']);
  const loading = renderWithStates(PlateVerificationBadge, plateProps, { 0: true });
  checkClasses(tagForText(loading, 'div', 'Consultando base nacional'), ['bg-slate-50', 'border-slate-200', 'text-slate-600']);
});

test('PlateVerificationBadge keeps semantic tones on light result surfaces', () => {
  const tones = [
    ['STOLEN', 'bg-red-50', 'border-red-500', 'text-red-900'],
    ['UNKNOWN', 'bg-amber-50', 'border-amber-500', 'text-amber-900'],
    ['CLEAN', 'bg-emerald-50', 'border-emerald-500/60', 'text-emerald-900'],
  ];
  for (const [status, background, border, foreground] of tones) {
    const result = {
      ...vehicleResult, status, hasStolenReport: status === 'STOLEN',
      statusText: status === 'STOLEN' ? 'ENCARGO POR ROBO VIGENTE' : status === 'UNKNOWN' ? 'NO SE PUDO VERIFICAR' : vehicleResult.statusText,
      ...(status === 'STOLEN' ? { stolenDetails: {
        reportDate: '2026-10-25', policeAgency: 'CARABINEROS DE CHILE', policeStation: 'Comisaría',
        commune: 'Coquimbo', reportNumber: 'PAR-1', riskLevel: 'CRÍTICO',
      } } : {}),
    };
    const html = renderPlateResult(result);
    checkClasses(tagWith(html, 'rounded-2xl border-2 p-4'), [background, border, foreground]);
    checkClasses(tagForText(html, 'span', result.formattedPlate), ['text-slate-900']);
    checkClasses(tagWith(html, 'aria-label="Volver a consultar"'), ['bg-white/80', 'border-slate-300', 'min-h-11', 'min-w-11']);
    checkClasses(tagForText(html, 'div', 'Marca / Modelo'), ['bg-white/80', 'border-slate-200']);
    assert.doesNotMatch(html, /bg-(?:slate-900|slate-800|red-950|amber-950|emerald-950)/);
    if (status === 'UNKNOWN') assert.doesNotMatch(html, /Reportar Robo a la Red/);
    if (status === 'CLEAN') checkClasses(tagForText(html, 'button', 'Reportar Robo a la Red'), ['bg-red-50', 'text-red-700']);
    if (status === 'STOLEN') {
      checkClasses(tagWith(html, 'mt-2.5 p-3'), ['bg-red-100/80', 'border-red-300']);
      checkClasses(tagForText(html, 'button', 'Marcar Recuperado'), ['bg-emerald-50', 'text-emerald-700']);
    }
  }
  const pending = renderPlateResult(vehicleResult, { 2: true });
  checkClasses(tagForText(pending, 'div', '¿Reportar'), ['bg-white/90', 'border-slate-300']);
  checkClasses(tagForText(pending, 'button', 'Confirmar'), ['bg-red-600', 'text-white']);
  checkClasses(tagForText(pending, 'button', 'Cancelar'), ['bg-slate-100', 'border-slate-300', 'text-slate-700']);
});
