const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const RESPONSES_FILE = path.join(DATA_DIR, "responses.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const exercises = {
  beginner: [
    {
      id: "b1",
      title: "Que es un mutante",
      question: "En pruebas de mutacion, que es un mutante?",
      options: [
        "Una prueba automatica creada para validar una API REST",
        "Un pequeno cambio intencional en el codigo para comprobar si las pruebas lo detectan",
        "Un reporte de errores generado al ejecutar Postman",
        "Una version final del codigo lista para produccion"
      ],
      answer: 1,
      explanation: "Un mutante es un cambio pequeno hecho a proposito. Si tus pruebas fallan, significa que detectaron el cambio.",
      hint: "Imagina que cambias una regla pequena para ver si la prueba se da cuenta.",
      lesson: {
        goal: "Entender la idea central de la mutacion.",
        concept: "La mutacion sirve para medir si tus pruebas realmente protegen el comportamiento del sistema.",
        example: "Si antes una API respondia 201 y alguien la cambia a 200, una buena prueba deberia notarlo."
      }
    },
    {
      id: "b2",
      title: "Mutante muerto",
      question: "Si una prueba detecta el cambio hecho por un mutante, que paso con ese mutante?",
      options: [
        "El mutante queda pendiente hasta ejecutar pruebas manuales",
        "El mutante sobrevive porque la API respondio algo",
        "El mutante fue eliminado o muerto porque la prueba fallo al detectar el cambio",
        "El mutante se convierte automaticamente en una nueva prueba"
      ],
      answer: 2,
      explanation: "Cuando la prueba falla por el cambio, se dice que el mutante fue matado. Eso es buena senal.",
      hint: "Si la prueba detecta el cambio, el mutante no sobrevive.",
      lesson: {
        goal: "Diferenciar mutante muerto y mutante sobreviviente.",
        concept: "Un mutante muerto significa que la prueba si encontro el comportamiento incorrecto.",
        example: "Si cambias 201 por 200 y la prueba esperaba 201, la prueba falla y mata al mutante."
      }
    },
    {
      id: "b3",
      title: "Mutante sobreviviente",
      question: "Que significa que un mutante sobreviva?",
      options: [
        "Que las pruebas no detectaron un cambio que podria alterar el comportamiento",
        "Que todas las pruebas fueron eliminadas correctamente",
        "Que el endpoint dejo de responder por un problema de red",
        "Que Postman corrigio automaticamente el caso de prueba"
      ],
      answer: 0,
      explanation: "Si el mutante sobrevive, tus pruebas pasaron aunque el comportamiento cambio. Eso muestra una oportunidad de mejora.",
      hint: "Sobrevive porque nadie lo atrapo.",
      lesson: {
        goal: "Reconocer una debilidad de prueba.",
        concept: "Un mutante sobreviviente no siempre es culpa del codigo; muchas veces falta una asercion en la prueba.",
        example: "La API devuelve un email incorrecto, pero la prueba solo revisa que responda 200. El mutante puede sobrevivir."
      }
    },
    {
      id: "b4",
      title: "Para que sirve",
      question: "Para que sirven las pruebas de mutacion?",
      options: [
        "Para reemplazar las pruebas funcionales por pruebas manuales",
        "Para medir si las pruebas detectan cambios pequenos pero importantes en el codigo",
        "Para generar datos falsos sin validar respuestas",
        "Para publicar endpoints REST sin ejecutar verificaciones"
      ],
      answer: 1,
      explanation: "La mutacion ayuda a evaluar la calidad de las pruebas. No solo importa tener pruebas, sino que detecten cambios peligrosos.",
      hint: "La idea es comprobar que las pruebas son fuertes.",
      lesson: {
        goal: "Comprender el objetivo de la tecnica.",
        concept: "Una prueba fuerte no solo ejecuta la API; tambien verifica resultados esperados.",
        example: "No basta con recibir respuesta. Tambien conviene validar status, campos y mensajes."
      }
    },
    {
      id: "b5",
      title: "API REST y respuesta",
      question: "En una API REST, que parte suele validar una buena prueba?",
      options: [
        "Solo el nombre visual de la coleccion en Postman",
        "La velocidad del navegador donde se abre la aplicacion",
        "El codigo de estado, el contenido JSON y las reglas esperadas de la respuesta",
        "El orden de los botones en la interfaz del estudiante"
      ],
      answer: 2,
      explanation: "En API REST se validan resultados observables: status HTTP, cuerpo JSON, mensajes, reglas y permisos.",
      hint: "Piensa en lo que la API devuelve al cliente.",
      lesson: {
        goal: "Conectar mutacion con APIs REST.",
        concept: "Los mutantes pueden cambiar status, campos JSON, permisos o reglas de negocio.",
        example: "Si falta el campo email, una prueba debe revisar que ese campo exista."
      }
    },
    {
      id: "b6",
      title: "Postman y pruebas",
      question: "En Postman, donde se escriben normalmente las comprobaciones automaticas de una peticion?",
      options: [
        "En el historial del navegador despues de enviar la peticion",
        "En el titulo de la coleccion para que se ejecute al abrir Postman",
        "En la URL de la peticion, reemplazando los parametros",
        "En la pestana Tests usando comprobaciones como pm.test o pm.expect"
      ],
      answer: 3,
      explanation: "La pestana Tests permite escribir comprobaciones con pm.test y pm.expect.",
      hint: "Busca el lugar donde se escriben pm.test y pm.expect.",
      lesson: {
        goal: "Ubicar donde se automatiza una prueba en Postman.",
        concept: "Postman permite comprobar respuestas sin hacerlo manualmente cada vez.",
        example: "pm.test puede revisar que la respuesta tenga status 200 o que exista un campo JSON."
      }
    }
  ],
  intermediate: [
    {
      id: "i1",
      title: "Caso simple: email obligatorio",
      prompt: "Una API permite crear un usuario sin email. Explica una prueba sencilla para detectar ese problema.",
      keywords: ["email", "400", "obligatorio", "error", "sin email", "validar"],
      model: "Enviaria una solicitud sin email y validaria que la API responda un error, por ejemplo 400, indicando que el email es obligatorio.",
      hint: "Prueba enviar datos incompletos.",
      lesson: {
        goal: "Aprender una prueba negativa basica.",
        concept: "Una prueba negativa envia un dato invalido para comprobar que la API lo rechace.",
        example: "Crear usuario sin email deberia devolver 400 o un mensaje de validacion.",
        steps: [
          "Envia una solicitud para crear usuario sin el campo email.",
          "Observa si la API rechaza la solicitud.",
          "Escribe que esperas un error 400 o un mensaje que diga que email es obligatorio."
        ],
        starter: "Enviaria un usuario sin email y esperaria que la API responda error 400 porque el email es obligatorio."
      }
    },
    {
      id: "i2",
      title: "Caso simple: edad minima",
      prompt: "La regla dice que un usuario de 18 anos si puede registrarse. Que prueba harias para revisar esa regla?",
      keywords: ["18", "edad", "aceptar", "registrar", "201", "borde"],
      model: "Probaria registrar un usuario con edad 18 y esperaria que la API lo acepte. Ese valor ayuda a detectar cambios en la condicion.",
      hint: "Usa justo el valor limite.",
      lesson: {
        goal: "Entender un valor limite.",
        concept: "Los valores limite son importantes porque pequenos cambios en condiciones suelen aparecer ahi.",
        example: "Si cambia edad >= 18 por edad > 18, el caso edad 18 descubre el problema.",
        steps: [
          "Usa exactamente la edad 18.",
          "Intenta registrar al usuario con ese valor.",
          "Explica que deberia aceptarse porque 18 cumple la regla minima."
        ],
        starter: "Probaria registrar un usuario con edad 18 y esperaria que sea aceptado, porque 18 es el limite permitido."
      }
    },
    {
      id: "i3",
      title: "Caso simple: acceso sin token",
      prompt: "Un endpoint privado muestra datos aunque no envies token. Que prueba sencilla agregarias?",
      keywords: ["token", "sin token", "401", "403", "no autorizado", "privado"],
      model: "Enviaria la peticion sin token y validaria que la API responda 401 o 403, sin mostrar datos privados.",
      hint: "Prueba entrar como si no tuvieras permiso.",
      lesson: {
        goal: "Aprender a probar seguridad basica.",
        concept: "Una API protegida debe rechazar solicitudes sin autorizacion.",
        example: "GET /orders sin token deberia responder 401 o 403.",
        steps: [
          "Envia la peticion sin token de acceso.",
          "Revisa que no se devuelvan datos privados.",
          "Indica que la respuesta esperada es 401 o 403."
        ],
        starter: "Haria la peticion sin token y esperaria 401 o 403, sin mostrar informacion privada."
      }
    },
    {
      id: "i4",
      title: "Caso simple: metodo HTTP",
      prompt: "Un endpoint solo debe aceptar POST para crear usuarios. Que revisarias con una prueba?",
      keywords: ["post", "get", "metodo", "rechazar", "405", "crear"],
      model: "Probaria usar un metodo incorrecto, como GET, y validaria que la API no cree el usuario y lo rechace.",
      hint: "REST usa metodos como GET, POST, PUT y DELETE.",
      lesson: {
        goal: "Entender que el metodo tambien forma parte del contrato.",
        concept: "No solo importa la URL; tambien importa usar el metodo HTTP correcto.",
        example: "Crear usuario normalmente usa POST, no GET.",
        steps: [
          "Identifica cual metodo es el correcto para crear.",
          "Prueba un metodo incorrecto, como GET.",
          "Explica que la API no deberia crear nada y deberia rechazarlo."
        ],
        starter: "Probaria usar GET en lugar de POST y verificaria que la API no cree el usuario."
      }
    },
    {
      id: "i5",
      title: "Caso simple: cantidad de resultados",
      prompt: "Pides limit=10, pero la API devuelve muchos mas registros. Que comprobaria tu prueba?",
      keywords: ["limit", "10", "cantidad", "registros", "maximo", "arreglo"],
      model: "Comprobaria que la cantidad de registros devueltos sea como maximo 10.",
      hint: "Cuenta cuantos elementos devuelve la API.",
      lesson: {
        goal: "Aprender a validar cantidades.",
        concept: "Una prueba puede revisar no solo valores, tambien la cantidad de elementos retornados.",
        example: "Si pides 10 usuarios, no deberian llegar 100.",
        steps: [
          "Pide la lista usando limit=10.",
          "Cuenta cuantos elementos devuelve el arreglo.",
          "Explica que la cantidad debe ser 10 o menos."
        ],
        starter: "Solicitaria limit=10 y comprobaria que la respuesta devuelva como maximo 10 registros."
      }
    },
    {
      id: "i6",
      title: "Caso simple: formato de fecha",
      prompt: "La API debe devolver fechas con formato ISO, por ejemplo 2026-06-29. Que validarias?",
      keywords: ["fecha", "formato", "iso", "2026", "validar", "contrato"],
      model: "Validaria que el campo fecha exista y tenga el formato esperado, por ejemplo ano-mes-dia.",
      hint: "No basta con que haya una fecha; debe tener el formato acordado.",
      lesson: {
        goal: "Comprender el contrato de datos.",
        concept: "Un contrato de API tambien define el formato de los campos.",
        example: "2026-06-29 y 29/06/2026 pueden representar lo mismo, pero no cumplen el mismo contrato.",
        steps: [
          "Busca el campo de fecha en la respuesta.",
          "Compara su formato con el formato esperado.",
          "Explica que debe verse como ano-mes-dia, por ejemplo 2026-06-29."
        ],
        starter: "Validaria que el campo fecha exista y tenga formato ano-mes-dia, como 2026-06-29."
      }
    },
    {
      id: "i7",
      title: "Caso simple: eliminar de verdad",
      prompt: "La API responde que elimino un recurso, pero el recurso sigue existiendo. Como lo comprobarias?",
      keywords: ["delete", "get", "eliminar", "404", "buscar", "recurso"],
      model: "Primero haria DELETE y luego buscaria el mismo recurso con GET. Esperaria que ya no exista o que responda 404.",
      hint: "Despues de eliminar, intenta buscar otra vez.",
      lesson: {
        goal: "Validar el efecto de una accion.",
        concept: "Una buena prueba no solo mira el status; tambien confirma que la accion realmente ocurrio.",
        example: "Despues de DELETE /users/1, GET /users/1 deberia indicar que ya no existe.",
        steps: [
          "Primero elimina el recurso con DELETE.",
          "Luego busca el mismo recurso con GET.",
          "Explica que deberia responder 404 o indicar que ya no existe."
        ],
        starter: "Haria DELETE al recurso y luego un GET al mismo id para comprobar que ya no exista."
      }
    },
    {
      id: "i8",
      title: "Caso simple: cambio que no afecta",
      prompt: "Un mutante cambia el orden de los campos JSON, pero la respuesta significa lo mismo. Que podrias decir?",
      keywords: ["equivalente", "orden", "json", "no afecta", "mismo"],
      model: "Podria ser un mutante equivalente o un cambio que no afecta el comportamiento importante de la API.",
      hint: "A veces el cambio no altera el resultado real.",
      lesson: {
        goal: "Conocer la idea de mutante equivalente.",
        concept: "No todo mutante sobreviviente significa mala prueba; algunos cambios no modifican el comportamiento observable.",
        example: "En JSON, el orden de los campos muchas veces no cambia el significado.",
        steps: [
          "Compara si la informacion sigue siendo la misma.",
          "Revisa si el contrato exige un orden especifico.",
          "Si el comportamiento no cambia, puede ser equivalente."
        ],
        starter: "Diria que puede ser un mutante equivalente si el orden del JSON no cambia el significado de la respuesta."
      }
    }
  ],
  advanced: [
    {
      id: "a1",
      title: "Mutante en codigo de estado",
      prompt: "Un mutante cambia la creacion de usuario de 201 Created a 200 OK. Explica que prueba escribirias en Postman para detectar ese cambio.",
      keywords: ["201", "status", "created", "postman", "pm.response", "mutante", "crear"],
      model: "Enviaria un POST para crear usuario y agregaria una asercion que espere status 201. Si el mutante responde 200, la prueba fallaria y lo mataria.",
      hint: "El punto clave es validar el codigo exacto esperado, no solo que la respuesta sea exitosa.",
      lesson: {
        goal: "Detectar cambios pequenos en codigos HTTP.",
        concept: "En mutacion, cambiar 201 por 200 puede parecer pequeno, pero rompe el contrato de creacion.",
        example: "pm.test('crea con 201', () => pm.response.to.have.status(201));",
        steps: [
          "Identifica el endpoint y el status correcto.",
          "Propone una peticion POST de creacion valida.",
          "Explica que una asercion de status 201 mataria al mutante."
        ],
        starter: "Enviaria un POST valido y validaria status 201; si responde 200, la prueba falla y mata al mutante."
      }
    },
    {
      id: "a2",
      title: "Mutante elimina campo JSON",
      prompt: "Un mutante elimina el campo id de la respuesta al crear un recurso. Que prueba avanzada agregarias para descubrirlo?",
      keywords: ["id", "json", "campo", "pm.expect", "propiedad", "respuesta", "mutante"],
      model: "Convertiria la respuesta a JSON y validaria que exista la propiedad id y que no venga vacia. Si el mutante elimina el campo, la asercion falla.",
      hint: "No basta con validar status; revisa el cuerpo JSON y una propiedad importante.",
      lesson: {
        goal: "Validar datos esenciales en el cuerpo.",
        concept: "Los mutantes pueden conservar el status correcto pero cambiar o quitar informacion del JSON.",
        example: "const body = pm.response.json(); pm.expect(body).to.have.property('id');",
        steps: [
          "Obtiene el body como JSON.",
          "Valida que el campo id exista.",
          "Explica que la prueba falla si el mutante elimina ese campo."
        ],
        starter: "Tomaria el JSON de respuesta y validaria que tenga id; si el campo desaparece, la prueba mata al mutante."
      }
    },
    {
      id: "a3",
      title: "Mutante en validacion negativa",
      prompt: "Un mutante permite crear productos con precio negativo. Explica una prueba que ayude a matar ese mutante.",
      keywords: ["precio", "negativo", "400", "validacion", "error", "rechazar", "mutante"],
      model: "Enviaria un producto con precio -1 y esperaria error 400 o mensaje de validacion. La prueba debe comprobar que no se cree el producto.",
      hint: "Usa una entrada invalida y explica que la API debe rechazarla.",
      lesson: {
        goal: "Usar pruebas negativas para fortalecer la suite.",
        concept: "Los mutantes sobreviven si solo pruebas caminos felices; tambien necesitas entradas invalidas.",
        example: "POST /products con price: -1 deberia responder 400.",
        steps: [
          "Envia un precio invalido, por ejemplo -1.",
          "Espera que la API lo rechace con error.",
          "Aclara que no deberia crearse ningun producto."
        ],
        starter: "Enviaria precio -1 y validaria error 400; asi el mutante que acepta precios negativos queda detectado."
      }
    },
    {
      id: "a4",
      title: "Mutante cambia operador de regla",
      prompt: "La regla permite descuentos solo si el total es mayor o igual a 100. Un mutante cambia >= por >. Que caso probarias?",
      keywords: ["100", "limite", "mayor", "igual", "descuento", "borde", "mutante"],
      model: "Probaria exactamente total 100 y esperaria que aplique descuento. Si el mutante usa >, ese caso falla y revela el cambio.",
      hint: "Cuando cambia un operador, el valor limite suele descubrir el problema.",
      lesson: {
        goal: "Aplicar valores borde para matar mutantes.",
        concept: "Los cambios de >= a > suelen detectarse usando exactamente el limite.",
        example: "Si la regla es total >= 100, el caso total=100 debe pasar.",
        steps: [
          "Identifica el limite de la regla.",
          "Usa exactamente total 100.",
          "Explica que el descuento debe aplicarse en ese borde."
        ],
        starter: "Probaria total 100 y esperaria descuento; si el mutante cambio >= por >, la prueba fallaria."
      }
    },
    {
      id: "a5",
      title: "Mutante en permisos",
      prompt: "Un mutante permite que un usuario comun elimine recursos de administrador. Como disenarias una prueba para detectar ese fallo?",
      keywords: ["usuario", "comun", "admin", "403", "permiso", "delete", "autorizacion"],
      model: "Usaria un token de usuario comun para intentar eliminar un recurso de administrador y validaria 403 o no autorizado.",
      hint: "La prueba debe usar un rol sin permisos, no el usuario administrador.",
      lesson: {
        goal: "Probar reglas de autorizacion.",
        concept: "Los mutantes de seguridad pueden sobrevivir si solo pruebas con usuarios permitidos.",
        example: "DELETE /admin/users/5 con rol comun deberia responder 403.",
        steps: [
          "Usa credenciales o token de usuario comun.",
          "Intenta ejecutar una accion de administrador.",
          "Valida 403, 401 o mensaje de no autorizado."
        ],
        starter: "Intentaria DELETE con un usuario comun y validaria 403; asi detecto si el mutante rompe permisos."
      }
    },
    {
      id: "a6",
      title: "Mutante sobreviviente",
      prompt: "Un mutante sobrevive porque la prueba solo valida status 200, pero no revisa el contenido. Que mejora concreta agregarias?",
      keywords: ["body", "json", "contenido", "campo", "pm.expect", "asercion", "mutante"],
      model: "Agregaria aserciones sobre el body JSON: campos obligatorios, valores esperados o cantidad de elementos. Asi no basta con responder 200.",
      hint: "Piensa que un status correcto puede esconder un cuerpo incorrecto.",
      lesson: {
        goal: "Mejorar una prueba debil.",
        concept: "Una prueba fuerte valida comportamiento observable, no solo que la API respondio.",
        example: "Ademas de status 200, validar body.email, body.id o la cantidad de registros.",
        steps: [
          "Detecta que la prueba actual solo mira status.",
          "Agrega una asercion sobre datos del JSON.",
          "Explica como esa asercion mataria al mutante sobreviviente."
        ],
        starter: "Agregaria validaciones del JSON, por ejemplo campos esperados; asi un mutante que cambia contenido no sobrevive."
      }
    }
  ]
};

function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RESPONSES_FILE)) {
    fs.writeFileSync(RESPONSES_FILE, JSON.stringify({ attempts: [], sessions: [] }, null, 2));
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", chunk => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > 10_000_000) {
        req.destroy();
        reject(new Error("Payload demasiado grande"));
      }
    });
    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const body = decodeRequestBody(buffer).trim();
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("La solicitud no tiene un formato JSON valido. Verifica que estas usando la plataforma desde el navegador y vuelve a intentarlo."));
      }
    });
    req.on("error", reject);
  });
}

function decodeRequestBody(buffer) {
  if (buffer.length >= 2) {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.subarray(2).toString("utf16le");
    if (buffer[0] === 0xfe && buffer[1] === 0xff) return swapUtf16Bytes(buffer.subarray(2)).toString("utf16le");
  }
  const utf8 = buffer.toString("utf8");
  const nulCount = (utf8.match(/\u0000/g) || []).length;
  if (nulCount > utf8.length / 8) return buffer.toString("utf16le");
  return utf8.replace(/^\uFEFF/, "");
}

function swapUtf16Bytes(buffer) {
  const copy = Buffer.from(buffer);
  for (let index = 0; index + 1 < copy.length; index += 2) {
    const current = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = current;
  }
  return copy;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function saveAttempt(attempt) {
  const db = readResponsesStore();
  db.attempts.push({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...attempt
  });
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(db, null, 2));
}

function saveSession(session) {
  const db = readResponsesStore();
  const sessionId = session.sessionId || crypto.randomUUID();
  const existingIndex = db.sessions.findIndex(item => item.sessionId === sessionId);
  const record = {
    sessionId,
    studentName: session.studentName || "Estudiante",
    startedAt: session.startedAt || new Date().toISOString(),
    endedAt: session.endedAt || null,
    durationSeconds: Number(session.durationSeconds || 0),
    status: session.status || "active",
    completedLevels: Array.isArray(session.completedLevels) ? session.completedLevels : [],
    correct: Number(session.correct || 0),
    wrong: Number(session.wrong || 0),
    lives: Number(session.lives || 0),
    badges: Array.isArray(session.badges) ? session.badges : [],
    updatedAt: new Date().toISOString()
  };
  if (existingIndex >= 0) {
    db.sessions[existingIndex] = { ...db.sessions[existingIndex], ...record };
  } else {
    db.sessions.push({ id: crypto.randomUUID(), ...record });
  }
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(db, null, 2));
}

function readResponsesStore() {
  ensureDataStore();
  const raw = fs.readFileSync(RESPONSES_FILE, "utf8").replace(/^\uFEFF/, "");
  try {
    const db = JSON.parse(raw);
    return {
      attempts: Array.isArray(db.attempts) ? db.attempts : [],
      sessions: Array.isArray(db.sessions) ? db.sessions : []
    };
  } catch (error) {
    return { attempts: [], sessions: [] };
  }
}

function getAllExercises() {
  return Object.values(exercises).flat();
}

function evaluateChoice(payload) {
  const exercise = getAllExercises().find(item => item.id === payload.exerciseId);
  if (!exercise || typeof exercise.answer !== "number") {
    return { correct: false, feedback: "Ejercicio no encontrado." };
  }
  const correct = Number(payload.answer) === exercise.answer;
  return {
    correct,
    feedback: correct ? exercise.explanation : `Aun no. ${exercise.explanation}`,
    reward: correct ? "Ayuda adicional desbloqueada" : null
  };
}

function evaluateText(payload) {
  const type = payload.type === "advanced" ? "advanced" : "intermediate";
  const exercise = exercises[type].find(item => item.id === payload.exerciseId);
  if (!exercise) return { correct: false, score: 0, feedback: "Ejercicio no encontrado." };
  const answer = String(payload.answer || "").toLowerCase();
  const hits = exercise.keywords.filter(word => answer.includes(word.toLowerCase()));
  const score = Math.round((hits.length / Math.min(exercise.keywords.length, 5)) * 100);
  const minHits = type === "advanced" ? 3 : 2;
  const minLength = type === "advanced" ? 45 : 20;
  const correct = hits.length >= minHits && answer.length >= minLength;
  return {
    correct,
    score: Math.min(score, 100),
    detectedConcepts: hits,
    feedback: correct
      ? `Buen trabajo. Tu respuesta ya reconoce la idea clave: ${hits.join(", ")}.`
      : `Aun falta una idea importante. Guia: ${exercise.model}`,
    reward: correct && payload.remainingSeconds > 0 ? "Ayuda por resolver antes del tiempo" : null
  };
}

function routeApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/exercises") {
    return sendJson(res, 200, { levels: buildLevels(), pools: exercises });
  }
  if (req.method === "GET" && url.pathname === "/api/responses") {
    return sendJson(res, 200, readResponsesStore());
  }
  if (req.method === "POST" && url.pathname === "/api/answer") {
    return readJsonBody(req)
      .then(payload => {
        const evaluators = {
          beginner: evaluateChoice,
          intermediate: evaluateText,
          advanced: evaluateText
        };
        const result = (evaluators[payload.type] || evaluateChoice)(payload);
        saveAttempt({
          studentName: payload.studentName || "Estudiante",
          level: payload.level,
          type: payload.type,
          exerciseId: payload.exerciseId,
          answer: payload.answer,
          fileName: payload.fileName || null,
          correct: result.correct,
          score: result.score ?? (result.correct ? 100 : 0),
          remainingSeconds: payload.remainingSeconds ?? null,
          usedHint: Boolean(payload.usedHint),
          usedHintType: payload.usedHintType || null,
          hadWrongAttempt: Boolean(payload.hadWrongAttempt)
        });
        sendJson(res, 200, result);
      })
      .catch(() => sendJson(res, 400, { correct: false, feedback: "No se pudo procesar la respuesta. Vuelve a intentarlo." }));
  }
  if (req.method === "POST" && url.pathname === "/api/session") {
    return readJsonBody(req)
      .then(payload => {
        saveSession(payload);
        sendJson(res, 200, { saved: true });
      })
      .catch(() => sendJson(res, 400, { saved: false, error: "No se pudo guardar la sesion." }));
  }
  sendJson(res, 404, { error: "Ruta API no encontrada" });
}

function buildLevels() {
  return Array.from({ length: 10 }, (_, index) => {
    const level = index + 1;
    const type = level <= 3 ? "beginner" : level <= 7 ? "intermediate" : "advanced";
    return {
      level,
      type,
      title: level <= 3 ? "Principiante" : level <= 7 ? "Intermedio" : "Avanzado",
      exerciseCount: 1,
      poolSize: exercises[type].length,
      timed: type !== "beginner",
      seconds: type === "intermediate" ? 180 : type === "advanced" ? 240 : null
    };
  });
}

function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

ensureDataStore();

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) return routeApi(req, res, url);
  serveStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`Plataforma disponible en http://localhost:${PORT}`);
  console.log(`Respuestas guardadas en ${RESPONSES_FILE}`);
});
