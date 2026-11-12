function createLabCollection(exercise, bodyText, checkType, expected) {
  let body;
  try { body = JSON.parse(bodyText); } catch { throw new Error('Revisa los datos de la petición. Deben tener formato JSON válido.'); }
  if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error('Los datos deben ser un objeto JSON entre llaves.');
  const value = expected.trim();
  let assertion;
  if (checkType === 'status') {
    if (!/^[1-5][0-9]{2}$/.test(value)) throw new Error('Escribe el código HTTP esperado de tres dígitos.');
    assertion = `pm.response.to.have.status(${Number(value)});`;
  } else if (checkType === 'property') {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value) || ['constructor', 'prototype'].includes(value)) throw new Error('Escribe el nombre del campo que debe existir, por ejemplo id.');
    assertion = `pm.expect(pm.response.json()).to.have.property(${JSON.stringify(value)});`;
  } else { throw new Error('Selecciona qué quieres comprobar.'); }
  return {
    info: { name: `Mi prueba del nivel ${exercise.level}`, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: [{ name: exercise.title, request: { method: 'POST', url: `{{baseUrl}}${exercise.path}`, header: [{ key: 'Content-Type', value: 'application/json' }], body: { mode: 'raw', raw: JSON.stringify(body) } },
      event: [{ listen: 'test', script: { type: 'text/javascript', exec: ['pm.test("Mi comprobación", function () {', `  ${assertion}`, '});'] } }]
    }]
  };
}

if (typeof module !== 'undefined') module.exports = { createLabCollection };
