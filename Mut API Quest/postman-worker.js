const http = require('http');
const newman = require('newman');
const { practiceResponse } = require('./postman-lab');

function run(collection, baseUrl) {
  return new Promise((resolve, reject) => {
    newman.run({ collection, envVar: [{ key: 'baseUrl', value: baseUrl }], reporters: [], timeout: 7000, timeoutRequest: 2000, timeoutScript: 1000, ignoreRedirects: true }, (error, summary) => {
      if (error) return reject(error);
      const failures = summary.run.failures.map(failure => ({ name: failure.error.name, test: failure.error.test || failure.at, message: failure.error.message }));
      resolve({ assertions: summary.run.stats.assertions.total, failed: summary.run.stats.assertions.failed, requests: summary.run.stats.requests.total,
        executionError: Boolean(summary.run.error) || failures.some(failure => failure.name !== 'AssertionError'),
        failures, checks: summary.run.executions.flatMap(execution => (execution.assertions || []).map(assertion => ({ name: assertion.assertion, passed: !assertion.error, message: assertion.error?.message || '' }))) });
    });
  });
}

process.once('message', async ({ collection, level }) => {
  let mutant = false;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 262144) req.destroy(); });
    req.on('end', () => {
      let body;
      try { body = JSON.parse(raw || '{}'); } catch { body = {}; }
      const result = practiceResponse(level, mutant, req.url, req.method, body);
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.body));
    });
  });
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const original = await run(collection, baseUrl);
    mutant = true;
    const mutated = await run(collection, baseUrl);
    const evaluationError = original.executionError || mutated.executionError || !original.assertions || original.assertions !== mutated.assertions || original.requests !== collection.item.length || mutated.requests !== collection.item.length;
    const correct = !evaluationError && original.failed === 0 && mutated.failed > 0;
    const feedback = evaluationError ? 'Evaluación incompleta por un error de ejecución. Revisa los detalles y reintenta.'
      : original.failed > 0 ? 'Tu prueba falla en la API correcta. Corrige las comprobaciones o los datos enviados.'
      : correct ? '¡Mutante detectado! Tu prueba pasa en la API correcta y una comprobación falla al introducir el cambio.'
      : 'El mutante sobrevivió. Tu prueba pasa en ambas versiones. Agrega una comprobación sobre el cambio del reto.';
    process.send({ correct, evaluationError, feedback, score: correct ? 100 : 0, report: { original, mutant: mutated, killed: correct ? 1 : 0, totalMutants: 1 } });
  } catch {
    process.send({ correct: false, evaluationError: true, feedback: 'Newman no pudo completar la ejecución. Revisa tu prueba y vuelve a intentar.' });
  } finally { server.close(); }
});
