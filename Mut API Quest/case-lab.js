const http = require('node:http');

const challenges = [
  { id: 'p11', level: 11, title: 'Prueba el límite del descuento', prompt: 'Una compra recibe descuento cuando su monto es de S/ 100 o más. Diseña casos que comprueben la regla.', instructions: 'Incluye un monto menor que 100, uno exactamente igual a 100 y uno mayor que 100.', outcomes: [['discount', 'Con descuento'], ['no-discount', 'Sin descuento']] },
  { id: 'p12', level: 12, title: 'Valida la creación de productos', prompt: 'Un producto se acepta solo cuando tiene nombre y un precio mayor que cero. Si falta el nombre o el precio, debe rechazarse.', instructions: 'Prueba un producto válido, un precio negativo, un precio cero, un nombre vacío y un precio vacío. Cambia una condición por caso para aislar cada fallo.', outcomes: [['accepted', 'Producto aceptado'], ['rejected', 'Producto rechazado']] },
  { id: 'p13', level: 13, title: 'Comprueba los permisos', prompt: 'Un administrador puede eliminar cualquier recurso. Un usuario puede eliminar únicamente sus propios recursos. Una persona sin sesión no puede eliminar recursos.', instructions: 'Combina cada rol con un recurso propio y uno de otra persona. Decide cuándo debe permitirse la eliminación.', outcomes: [['allowed', 'Eliminación permitida'], ['denied', 'Eliminación rechazada']] }
];

function money(value, allowMissing) {
  if (value === '' || value === null || value === undefined) {
    if (allowMissing) return null;
    throw new Error('Completa el monto de cada caso.');
  }
  if (!['string', 'number'].includes(typeof value) || !/^-?\d+(\.\d{1,2})?$/.test(String(value)) || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > 1000000) {
    throw new Error('Usa importes de hasta 1 000 000 y como máximo dos decimales.');
  }
  return Math.round(Number(value) * 100);
}

function normalizeCases(level, cases) {
  const challenge = challenges.find(item => item.level === level);
  if (!challenge || !Array.isArray(cases) || !cases.length || cases.length > 12) throw new Error('Agrega entre 1 y 12 casos de prueba.');
  const seen = new Set();
  return cases.map((item, index) => {
    if (!item || typeof item !== 'object' || !challenge.outcomes.some(([value]) => item.expected === value)) throw new Error(`Selecciona el resultado esperado del caso ${index + 1}.`);
    let input;
    if (level === 11) {
      input = { total: money(item.total, false) };
      if (input.total < 0) throw new Error('El monto de compra debe ser cero o mayor.');
    } else if (level === 12) {
      if (typeof item.name !== 'string' || item.name.length > 80) throw new Error('El nombre del producto admite hasta 80 caracteres.');
      input = { name: item.name.trim(), price: money(item.price, true) };
    } else {
      if (!['admin', 'user', 'guest'].includes(item.role) || !['own', 'other'].includes(item.owner)) throw new Error(`Selecciona el rol y el propietario del caso ${index + 1}.`);
      input = { role: item.role, owner: item.owner };
    }
    const key = JSON.stringify(input);
    if (seen.has(key)) throw new Error(`El caso ${index + 1} repite los mismos datos. Cambia los datos o elimina ese caso.`);
    seen.add(key);
    return { input, expected: item.expected };
  });
}

// Currency inputs are integer cents, so the boundary at S/ 100 is exact.
function apiResponse(level, input, mutation = '') {
  if (level === 11) {
    let discount = input.total >= 10000;
    if (mutation === 'strict-boundary') discount = input.total > 10000;
    if (mutation === 'always') discount = true;
    if (mutation === 'never') discount = false;
    return { status: 200, outcome: discount ? 'discount' : 'no-discount' };
  }
  if (level === 12) {
    const nameValid = mutation === 'missing-name' || Boolean(input.name);
    let priceValid = input.price !== null && input.price > 0;
    if (mutation === 'negative') priceValid = input.price !== null && input.price !== 0;
    if (mutation === 'zero') priceValid = input.price !== null && input.price >= 0;
    if (mutation === 'missing-price') priceValid = input.price === null || input.price > 0;
    const accepted = nameValid && priceValid;
    return { status: accepted ? 201 : 400, outcome: accepted ? 'accepted' : 'rejected' };
  }
  let allowed = input.role === 'admin' || (input.role === 'user' && input.owner === 'own');
  if (mutation === 'user-any') allowed = input.role !== 'guest';
  if (mutation === 'guest-any') allowed = input.role === 'guest' || allowed;
  if (mutation === 'admin-own') allowed = input.role !== 'guest' && input.owner === 'own';
  if (mutation === 'user-denied') allowed = input.role === 'admin';
  return { status: allowed ? 200 : input.role === 'guest' ? 401 : 403, outcome: allowed ? 'allowed' : 'denied' };
}

function missingCoverage(level, cases) {
  const inputs = cases.map(item => item.input);
  if (level === 11) {
    const missing = [];
    if (!inputs.some(input => input.total < 10000)) missing.push('Agrega una compra por debajo de S/ 100.');
    if (!inputs.some(input => input.total === 10000)) missing.push('Prueba una compra de exactamente S/ 100.');
    if (!inputs.some(input => input.total > 10000)) missing.push('Agrega una compra por encima de S/ 100.');
    return missing;
  }
  if (level === 12) return [
    [inputs.some(input => input.name && input.price > 0), 'Incluye un producto válido, con nombre y precio positivo.'],
    [inputs.some(input => input.name && input.price !== null && input.price < 0), 'Prueba un precio negativo con el nombre completo.'],
    [inputs.some(input => input.name && input.price === 0), 'Prueba el precio cero con el nombre completo.'],
    [inputs.some(input => !input.name && input.price > 0), 'Deja el nombre vacío y utiliza un precio válido.'],
    [inputs.some(input => input.name && input.price === null), 'Deja el precio vacío y completa el nombre.']
  ].filter(([covered]) => !covered).map(([, hint]) => hint);
  const labels = { admin: 'administrador', user: 'usuario', guest: 'persona sin sesión' };
  return ['admin', 'user', 'guest'].flatMap(role => ['own', 'other'].filter(owner => !inputs.some(input => input.role === role && input.owner === owner)).map(owner => `Prueba el rol ${labels[role]} con un recurso ${owner === 'own' ? 'propio' : 'de otra persona'}.`));
}

let active = 0;
async function evaluateCases(payload) {
  const start = Date.now();
  const level = Number(payload.level);
  let cases;
  try {
    if (payload.exerciseId !== `p${level}`) throw new Error('El ejercicio no corresponde al nivel.');
    cases = normalizeCases(level, payload.cases);
  } catch (error) { return { correct: false, evaluationError: true, feedback: error.message }; }
  if (active >= 4) return { correct: false, evaluationError: true, feedback: 'El laboratorio está ocupado. Intenta nuevamente en unos segundos.' };
  active++;
  // The learner supplies data only. Each assessment owns its HTTP practice API.
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 10000) req.destroy(); });
    req.on('end', () => {
      try {
        const result = apiResponse(level, JSON.parse(raw), req.url.slice(1));
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ outcome: result.outcome }));
      } catch { res.writeHead(400); res.end('{}'); }
    });
  });
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const base = `http://127.0.0.1:${server.address().port}`;
    async function execute(item, mutation = '') {
      const response = await fetch(`${base}/${mutation}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.input), signal: AbortSignal.timeout(2000) });
      const body = await response.json();
      if (!body.outcome) throw new Error('Respuesta incompleta');
      return { expected: item.expected, actual: body.outcome, matches: item.expected === body.outcome, httpStatus: response.status };
    }
    const results = [];
    for (const item of cases) results.push(await execute(item));
    const missing = missingCoverage(level, cases);
    const baselineCorrect = results.every(item => item.matches);
    let detectsChanges = false;
    if (baselineCorrect && !missing.length) {
      const mutations = level === 11 ? ['strict-boundary', 'always', 'never'] : level === 12 ? ['negative', 'zero', 'missing-name', 'missing-price'] : ['user-any', 'guest-any', 'admin-own', 'user-denied'];
      detectsChanges = true;
      for (const mutation of mutations) {
        let detected = false;
        for (const item of cases) if (!(await execute(item, mutation)).matches) detected = true;
        if (!detected) detectsChanges = false;
      }
    }
    const correct = baselineCorrect && !missing.length && detectsChanges;
    const feedback = !baselineCorrect ? 'Revisa los resultados esperados de los casos marcados. Compáralos con la regla del reto.'
      : missing.length ? 'Tus resultados esperados son correctos. Agrega los escenarios que faltan para completar el reto.'
      : correct ? '¡Reto superado! Tus casos respetan la regla y permiten descubrir cambios incorrectos en la API.'
      : 'Revisa tus casos de prueba para cubrir las condiciones de la regla.';
    return { correct, evaluationError: false, score: correct ? 100 : 0, feedback, evaluationDurationMs: Date.now() - start,
      report: { cases: results, suggestions: baselineCorrect ? missing : [], outcome: correct ? 'passed' : 'review' } };
  } catch { return { correct: false, evaluationError: true, feedback: 'La API de práctica no pudo completar la evaluación. Vuelve a intentar.', evaluationDurationMs: Date.now() - start }; }
  finally { server.closeAllConnections(); server.close(); active--; }
}

module.exports = { challenges, normalizeCases, apiResponse, missingCoverage, evaluateCases };
