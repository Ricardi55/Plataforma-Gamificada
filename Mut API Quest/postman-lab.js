const acorn = require('acorn');
const { fork } = require('child_process');
const path = require('path');

const challenges = [
  { id: 'p11', level: 11, title: 'Postman: código de estado', path: '/users', prompt: 'Crea un usuario con POST /users. La API correcta devuelve 201 y un JSON con id, name y email. El mutante cambia 201 por 200. Escribe una prueba que detecte ese cambio.', body: { name: 'Ana', email: 'ana@example.test' }, assertion: 'pm.response.to.have.status(201);' },
  { id: 'p12', level: 12, title: 'Postman: campo id obligatorio', path: '/users', prompt: 'Crea un usuario con POST /users. La respuesta correcta tiene status 201 y los campos id, name y email. El mutante elimina id. Comprueba que exista esa propiedad.', body: { name: 'Ana', email: 'ana@example.test' }, assertion: 'pm.expect(pm.response.json()).to.have.property("id");' },
  { id: 'p13', level: 13, title: 'Postman: precio negativo', path: '/products', prompt: 'Envía POST /products con name y price negativo. La API correcta rechaza el producto con status 400 y un campo error. El mutante lo crea con status 201. Comprueba el rechazo.', body: { name: 'Producto de prueba', price: -1 }, assertion: 'pm.response.to.have.status(400);' }
];

function practiceResponse(level, mutant, route, method, body) {
  const challenge = challenges.find(item => item.level === level);
  if (!challenge || route !== challenge.path) return { status: 404, body: { error: 'Recurso no encontrado' } };
  if (method !== 'POST') return { status: 405, body: { error: 'Usa POST' } };
  if (route === '/users') {
    if (typeof body.name !== 'string' || !body.name.trim() || typeof body.email !== 'string' || !body.email.includes('@')) {
      return { status: 400, body: { error: 'name y email válidos son obligatorios' } };
    }
    const result = { id: 'user-1', name: body.name, email: body.email };
    if (mutant && level === 12) delete result.id;
    return { status: mutant && level === 11 ? 200 : 201, body: result };
  }
  if (typeof body.name !== 'string' || !body.name.trim() || typeof body.price !== 'number' || !Number.isFinite(body.price)) {
    return { status: 400, body: { error: 'name y price numérico son obligatorios' } };
  }
  if (body.price < 0 && !mutant) return { status: 400, body: { error: 'El precio no puede ser negativo' } };
  return { status: 201, body: { id: 'product-1', name: body.name, price: body.price } };
}

function collectionTemplate(level, baseUrl, solved = false) {
  const challenge = challenges.find(item => item.level === level);
  if (!challenge) throw new Error('Nivel Postman inválido.');
  return {
    info: { name: `MutAPI nivel ${level}${solved ? ' - ejemplo resuelto' : ' - plantilla'}`, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    variable: [{ key: 'baseUrl', value: `${baseUrl}/practice/${level}`, type: 'string' }],
    item: [{ name: challenge.title,
      request: { method: 'POST', header: [{ key: 'Content-Type', value: 'application/json' }], url: `{{baseUrl}}${challenge.path}`, body: { mode: 'raw', raw: JSON.stringify(challenge.body, null, 2), options: { raw: { language: 'json' } } } },
      event: [{ listen: 'test', script: { type: 'text/javascript', exec: solved ? ['pm.test("Detecta el cambio del mutante", function () {', `  ${challenge.assertion}`, '});'] : ['// Escribe aquí una comprobación pm.test sobre la respuesta.', '// Luego exporta la colección como JSON v2.1 y súbela a MutAPI.'] } }]
    }]
  };
}

function memberName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'MemberExpression' && !node.computed && !node.optional) return `${memberName(node.object)}.${node.property.name}`;
  return '';
}

function literal(node) {
  return node?.type === 'Literal' && !node.regex && (node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value));
}

function responseValue(node) {
  if (memberName(node) === 'pm.response.code') return true;
  if (node?.type === 'CallExpression' && memberName(node.callee) === 'pm.response.json' && node.arguments.length === 0) return true;
  return node?.type === 'MemberExpression' && !node.computed && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(node.property.name)
    && !['constructor', 'prototype', '__proto__'].includes(node.property.name) && responseValue(node.object);
}

// Only these AST forms are ever executed. Other JavaScript is rejected before Newman.
function validateAssertion(node) {
  if (node?.type === 'CallExpression' && memberName(node.callee) === 'pm.response.to.have.status') {
    return node.arguments.length === 1 && literal(node.arguments[0]) && Number.isInteger(node.arguments[0].value);
  }
  let expression = node;
  let args = null;
  if (node?.type === 'CallExpression') { expression = node.callee; args = node.arguments; }
  const chain = [];
  while (expression?.type === 'MemberExpression' && !expression.computed) {
    chain.unshift(expression.property.name);
    expression = expression.object;
  }
  if (expression?.type !== 'CallExpression' || memberName(expression.callee) !== 'pm.expect'
      || expression.arguments.length !== 1 || !responseValue(expression.arguments[0])) return false;
  const name = chain.join('.');
  if (args === null) return ['to.exist', 'to.be.ok', 'to.not.be.empty'].includes(name);
  if (!args.every(literal)) return false;
  if (['to.equal', 'to.eql', 'to.be.a', 'to.be.an'].includes(name)) return args.length === 1;
  if (name === 'to.have.property') return (args.length === 1 || args.length === 2) && typeof args[0].value === 'string' && !['__proto__', 'constructor', 'prototype'].includes(args[0].value);
  return false;
}

function validateScript(source) {
  if (source.length > 12000) throw new Error('El script supera 12 KB.');
  let tree;
  try { tree = acorn.parse(source, { ecmaVersion: 2020 }); } catch { throw new Error('El script tiene un error de sintaxis JavaScript.'); }
  if (tree.body.length > 10) throw new Error('Máximo 10 pruebas pm.test por petición.');
  for (const statement of tree.body) {
    const call = statement.expression;
    const callback = call?.arguments?.[1];
    if (statement.type !== 'ExpressionStatement' || call?.type !== 'CallExpression' || memberName(call.callee) !== 'pm.test'
        || call.arguments.length !== 2 || !literal(call.arguments[0]) || typeof call.arguments[0].value !== 'string'
        || !['FunctionExpression', 'ArrowFunctionExpression'].includes(callback?.type) || callback.async || callback.generator
        || callback.params.length || callback.body.type !== 'BlockStatement' || !callback.body.body.length || callback.body.body.length > 10
        || !callback.body.body.every(item => item.type === 'ExpressionStatement' && validateAssertion(item.expression))) {
      throw new Error('Usa pm.test con comprobaciones directas sobre pm.response. Esta versión admite status, property, equal, eql, a, an, exist, ok y not.be.empty. Descarga el ejemplo de referencia. No admite variables, bucles, imports ni otras llamadas.');
    }
  }
  return tree.body.length;
}

function validateCollection(collection, level) {
  const challenge = challenges.find(item => item.level === level);
  if (!challenge || !collection || typeof collection !== 'object' || !Array.isArray(collection.item)) throw new Error('Selecciona una colección Postman JSON v2.1.');
  if (collection.info?.schema !== 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json') throw new Error('Exporta la colección en formato Postman Collection v2.1.');
  if (JSON.stringify(collection).length > 262144) throw new Error('Máximo 256 KB por colección.');
  const items = [];
  let tests = 0;
  let visited = 0;
  function walk(group, depth) {
    if (depth > 5 || ++visited > 30) throw new Error('La colección tiene demasiadas carpetas o peticiones.');
    if (group.auth && group.auth.type !== 'noauth') throw new Error('La API de práctica usa No Auth.');
    if (group.event?.length && !group.request) throw new Error('Coloca las pruebas solo en Post-response de cada petición.');
    if (group.item) {
      if (!Array.isArray(group.item)) throw new Error('Estructura de colección inválida.');
      group.item.forEach(item => walk(item, depth + 1));
      return;
    }
    const request = group.request;
    if (!request || request.method !== 'POST') throw new Error('El reto requiere una petición POST.');
    if (request.auth && request.auth.type !== 'noauth') throw new Error('Selecciona No Auth en la petición.');
    const url = typeof request.url === 'string' ? request.url : request.url?.raw;
    if (url !== `{{baseUrl}}${challenge.path}`) throw new Error(`Usa exactamente {{baseUrl}}${challenge.path} como URL. La plataforma asigna la API de práctica.`);
    if (request.body?.mode !== 'raw') throw new Error('Usa Body > raw > JSON.');
    let body;
    try { body = JSON.parse(request.body.raw); } catch { throw new Error('El body debe contener JSON válido, sin variables.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('El body debe ser un objeto JSON.');
    const scripts = [];
    if (group.event && !Array.isArray(group.event)) throw new Error('Lista de scripts inválida.');
    for (const event of group.event || []) {
      const source = Array.isArray(event.script?.exec) ? event.script.exec.join('\n') : event.script?.exec || '';
      if (typeof source !== 'string') throw new Error('Script inválido.');
      if (event.listen !== 'test') {
        if (source.trim()) throw new Error('Este laboratorio admite solo scripts Post-response.');
        continue;
      }
      tests += validateScript(source);
      scripts.push({ listen: 'test', script: { type: 'text/javascript', exec: source.split('\n') } });
    }
    items.push({ name: String(group.name || 'Prueba').slice(0, 120), request: { method: 'POST', url: `{{baseUrl}}${challenge.path}`, header: [{ key: 'Content-Type', value: 'application/json' }], body: { mode: 'raw', raw: JSON.stringify(body) } }, event: scripts });
    if (items.length > 5) throw new Error('Máximo 5 peticiones por colección.');
  }
  walk(collection, 0);
  if (!items.length || !tests) throw new Error('La colección debe incluir peticiones y al menos una comprobación pm.test.');
  return { info: { name: 'Evaluación MutAPI', schema: collection.info.schema }, item: items };
}

let active = 0;
function evaluateCollection(payload) {
  const startedAt = Date.now();
  const level = Number(payload.level);
  if (payload.exerciseId !== `p${level}`) return Promise.resolve({ correct: false, evaluationError: true, feedback: 'El ejercicio no corresponde al nivel.' });
  let collection;
  try { collection = validateCollection(payload.collection, level); }
  catch (error) { return Promise.resolve({ correct: false, evaluationError: true, feedback: error.message }); }
  if (active >= 2) return Promise.resolve({ correct: false, evaluationError: true, feedback: 'Hay dos evaluaciones en curso. Intenta nuevamente en unos segundos.' });
  active += 1;
  return new Promise(resolve => {
    const worker = fork(path.join(__dirname, 'postman-worker.js'), [], { execArgv: ['--max-old-space-size=128'], env: { SystemRoot: process.env.SystemRoot || '', TEMP: process.env.TEMP || '', TMP: process.env.TMP || '' }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    let completed = false;
    const finish = result => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      active -= 1;
      worker.kill();
      resolve({ ...result, evaluationDurationMs: Date.now() - startedAt });
    };
    const timeout = setTimeout(() => finish({ correct: false, evaluationError: true, feedback: 'La evaluación excedió 20 segundos. Revisa la colección y reintenta.' }), 20000);
    worker.on('message', finish);
    worker.on('error', () => finish({ correct: false, evaluationError: true, feedback: 'No se pudo iniciar Newman. Ejecuta npm install y reinicia.' }));
    worker.on('exit', () => finish({ correct: false, evaluationError: true, feedback: 'El evaluador se interrumpió. Verifica npm install y vuelve a intentar.' }));
    worker.send({ collection, level });
  });
}

module.exports = { challenges, practiceResponse, collectionTemplate, validateCollection, evaluateCollection, validateScript };
