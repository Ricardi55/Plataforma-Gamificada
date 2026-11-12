const acorn = require('acorn');
const path = require('node:path');
const { fork } = require('node:child_process');
const { validateScript } = require('./postman-lab');

const challenges = [
  {
    id: 'p11', level: 8, title: 'Comprueba el código de respuesta',
    prompt: 'Al crear un usuario, la API debe responder 201. Corrige la prueba para que falle si devuelve 200.',
    hint: 'Busca status(...) en la prueba. El número entre paréntesis es el código que esperas recibir. Compáralo con lo que exige el enunciado al crear un usuario y elige el que permita aceptar la respuesta válida y detectar la respuesta modificada.',
    starter: 'pm.test("Usuario creado", function () {\n  pm.response.to.have.status(200);\n});'
  },
  {
    id: 'p12', level: 9, title: 'Detecta un campo que falta',
    prompt: 'La API devuelve un producto. La prueba ya revisa el estado 200. Agrega una comprobación para que falle si falta el campo id.',
    hint: 'Comprobar el estado HTTP no detecta un campo que falta. Dentro de pm.test, añade una comprobación sobre pm.response.json() usando .to.have.property("campo"). Sustituye "campo" por la propiedad obligatoria que indica el enunciado.',
    starter: 'pm.test("Producto recibido", function () {\n  pm.response.to.have.status(200);\n  // Comprueba que el JSON incluya id.\n});'
  },
  {
    id: 'p13', level: 10, title: 'Prueba el límite del descuento',
    prompt: 'La API aplica el descuento desde S/ 100. La versión con el fallo lo aplica solo por encima de S/ 100. Cambia total para que la prueba distinga ambas respuestas.',
    hint: 'Con un monto claramente superior al mínimo, ambas versiones aplican el descuento. Busca el punto donde “desde” y “por encima de” producen resultados distintos. Cambia solo total y comprueba que la respuesta original siga cumpliendo lo esperado.',
    starter: 'const total = 150;\n\npm.test("Aplica el descuento", function () {\n  pm.expect(pm.response.json().discount).to.equal(true);\n});'
  }
];

function compileCode(level, code) {
  if (![8, 9, 10].includes(level) || typeof code !== 'string' || !code.trim() || code.length > 12000) throw new Error('Escribe una prueba de hasta 12 000 caracteres.');
  let source = code;
  let total = 0;
  if (level === 10) {
    let tree;
    try { tree = acorn.parse(code, { ecmaVersion: 2020 }); } catch (error) { throw new Error(`Revisa la sintaxis del código (línea ${error.loc?.line || '?'}).`); }
    const statement = tree.body[0];
    const declaration = statement?.declarations?.[0];
    if (statement?.type !== 'VariableDeclaration' || statement.kind !== 'const' || statement.declarations.length !== 1 || declaration.id.type !== 'Identifier' || declaration.id.name !== 'total' || declaration.init?.type !== 'Literal' || typeof declaration.init.value !== 'number' || !Number.isFinite(declaration.init.value) || declaration.init.value < 0 || declaration.init.value > 1000000) {
      throw new Error('La primera instrucción debe ser const total = un número entre 0 y 1000000;');
    }
    total = declaration.init.value;
    source = code.slice(statement.end);
  }
  if (!validateScript(source)) throw new Error('Agrega al menos una prueba pm.test con una comprobación.');
  return { total, source };
}

let active = 0;
async function evaluateCode(payload) {
  const level = Number(payload.level);
  let compiled;
  try {
    if (payload.exerciseId !== `p${level + 3}`) throw new Error('El ejercicio no corresponde al nivel.');
    compiled = compileCode(level, payload.code);
  } catch (error) { return { correct: false, evaluationError: true, feedback: error.message }; }
  if (active >= 2) return { correct: false, evaluationError: true, feedback: 'El evaluador está ocupado. Intenta nuevamente en unos segundos.' };
  active++;
  const startedAt = Date.now();
  return new Promise(resolve => {
    let worker;
    let completed = false;
    let timer;
    const finish = result => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      active--;
      worker?.kill();
      resolve({ ...result, evaluationDurationMs: Date.now() - startedAt });
    };
    try {
      worker = fork(path.join(__dirname, 'code-worker.js'), [], { execArgv: ['--max-old-space-size=128'], env: { SystemRoot: process.env.SystemRoot || '', TEMP: process.env.TEMP || '', TMP: process.env.TMP || '' }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      timer = setTimeout(() => finish({ correct: false, evaluationError: true, feedback: 'La evaluación tardó demasiado. Intenta nuevamente.' }), 40000);
      worker.on('message', finish);
      worker.on('error', () => finish({ correct: false, evaluationError: true, feedback: 'No se pudo iniciar el evaluador. Intenta nuevamente.' }));
      worker.on('exit', () => finish({ correct: false, evaluationError: true, feedback: 'El evaluador se interrumpió. Intenta nuevamente.' }));
      worker.send({ level, ...compiled });
    } catch { finish({ correct: false, evaluationError: true, feedback: 'No se pudo iniciar el evaluador.' }); }
  });
}

module.exports = { challenges, compileCode, evaluateCode };
