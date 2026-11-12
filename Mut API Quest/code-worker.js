const http = require('node:http');
const newman = require('newman');

function variants(level, total) {
  if (level === 8) {
    const original = { status: 201, body: { id: 'user-1' } };
    return {
      originals: [original],
      mutants: [{ ...original, status: 200, hint: 'Tu prueba todavía acepta el estado 200.' }]
    };
  }
  if (level === 9) {
    const original = { status: 200, body: { id: 'product-1', price: 29.9, stock: 3 } };
    const { id, ...withoutId } = original.body;
    return {
      originals: [original, { ...original, body: { ...original.body, id: 'product-2' } }],
      mutants: [{ ...original, body: withoutId, hint: 'Tu prueba todavía pasa cuando falta id.' }]
    };
  }
  return { originals: [{ status: 200, body: { discount: total >= 100 } }], mutants: [{ status: 200, body: { discount: total > 100 }, hint: total !== 100 ? 'Con ese total, >= y > producen el mismo resultado. Ajusta el dato para probar el límite exacto.' : 'El dato llega al límite. Agrega una comprobación del valor de discount para detectar el cambio.' }] };
}

function run(collection, baseUrl) {
  return new Promise((resolve, reject) => {
    newman.run({ collection, envVar: [{ key: 'baseUrl', value: baseUrl }], reporters: [], timeout: 5000, timeoutRequest: 1500, timeoutScript: 1000, ignoreRedirects: true }, (error, summary) => {
      if (error) return reject(error);
      const failures = summary.run.failures;
      const checks = summary.run.executions.flatMap(item => (item.assertions || []).map(assertion => ({ name: assertion.assertion, passed: !assertion.error, detail: assertion.error?.message || '' })));
      const valid = summary.run.stats.requests.total === 1 && checks.length > 0 && !summary.run.error && failures.every(failure => failure.error.name === 'AssertionError');
      resolve({ valid, passed: valid && failures.length === 0, checks });
    });
  });
}

process.once('message', async ({ level, total, source }) => {
  const fixtures = variants(level, total);
  let current = fixtures.originals[0];
  const server = http.createServer((req, res) => { req.resume(); res.writeHead(current.status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(current.body)); });
  const collection = { info: { name: 'Prueba del estudiante', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, item: [{ name: 'Petición preparada', request: { method: level === 8 ? 'POST' : 'GET', url: '{{baseUrl}}/exercise' }, event: [{ listen: 'test', script: { type: 'text/javascript', exec: source.split('\n') } }] }] };
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    for (const original of fixtures.originals) {
      current = original;
      const result = await run(collection, baseUrl);
      if (!result.valid) throw new Error('execution');
      if (!result.passed) {
        process.send({ correct: false, score: 0, feedback: 'Tu prueba rechaza una respuesta válida. Compara tus comprobaciones con el contrato del reto.', report: { stage: 'original', checks: result.checks } });
        return;
      }
    }
    for (const mutant of fixtures.mutants) {
      current = mutant;
      const result = await run(collection, baseUrl);
      if (!result.valid) throw new Error('execution');
      if (result.passed) {
        process.send({ correct: false, score: 0, feedback: mutant.hint, report: { stage: 'mutation' } });
        return;
      }
    }
    process.send({ correct: true, score: 100, feedback: 'Tu prueba acepta las respuestas válidas y descubre los cambios incorrectos del reto.', report: { stage: 'passed' } });
  } catch { process.send({ correct: false, evaluationError: true, feedback: 'No se pudo ejecutar la prueba. Revisa la sintaxis de las comprobaciones o vuelve a intentar.' }); }
  finally { server.closeAllConnections(); server.close(); }
});
