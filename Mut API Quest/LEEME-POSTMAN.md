# MutAPI Quest — editor de pruebas

## Abrir y usar

Ejecuta INICIAR.cmd y abre http://localhost:3000. La primera vez se instalan las dependencias con npm y se necesita Internet. Mantén la ventana del servidor abierta.

Escribe tu nombre y avanza por el mapa. Los laboratorios avanzados corresponden a los niveles 8, 9 y 10.

Cada reto incluye un código inicial. Corrige o completa la prueba en el editor y pulsa Ejecutar prueba. El borrador se conserva en el navegador por estudiante y ejercicio. La pista es opcional.

## Retos y fuentes

Los casos son adaptaciones didácticas de los operadores descritos en las fuentes. El laboratorio usa respuestas HTTP de práctica.

| Nivel | Cambio que la prueba debe detectar | Referencia |
|---|---|---|
| 8 | La API cambia la respuesta de creación de 201 a 200. | [HttpMutator, sustitución de estado R2XX](https://github.com/isa-group/HTTPMutator/blob/master/docs/mutation-operators.md#r2xx---replacement-with-status-code-2xx). |
| 9 | La API elimina la propiedad `id` del JSON y conserva el estado 200. | [HttpMutator, eliminación de propiedad OPR](https://github.com/isa-group/HTTPMutator/blob/master/docs/mutation-operators.md#opr---object-property-removal). |
| 10 | La condición de descuento pasa de `total >= 100` a `total > 100`. | [PIT, mutación del límite de una condición](https://pitest.org/quickstart/mutators/#conditionals-boundary-mutator-conditionals_boundary). |

Los dos primeros niveles se basan en *Black-Box Mutation Testing of Web APIs* ([artículo](https://doi.org/10.1145/3861082), [material de reproducción](https://zenodo.org/records/21339140)). El nivel 10 adapta un cambio de operador relacional a una regla observable mediante una respuesta REST. Este ejercicio utiliza la idea del operador de PIT en el laboratorio de Node.js.

La evaluación ejecuta las comprobaciones contra respuestas válidas y versiones con fallos del contrato. Para superar el reto, la prueba debe aceptar las respuestas válidas y rechazar los cambios definidos en el ejercicio. El resultado muestra una indicación concreta y permite corregir el código. No muestra cantidades de mutantes detectados.

## Código admitido

Usa pm.test con comprobaciones directas sobre pm.response: status, property, equal, eql, a, an, exist, ok y not.be.empty. No se admiten bucles, llamadas externas ni declaraciones de variables. El nivel 10 admite además la primera instrucción const total = un número; para configurar el dato de la petición. Las comprobaciones del nivel 10 utilizan pm.response.json().discount.

El editor ofrece JavaScript limitado a estas formas para los ejercicios. El servidor analiza la sintaxis antes de ejecutarla, prepara una petición local y utiliza Newman en un proceso separado con límites de tiempo y memoria. Las respuestas pertenecen a una API de práctica con datos preparados. La evaluación verifica los fallos definidos en estos retos, no certifica la calidad de una suite para cualquier API.

## Administración

Los archivos activos del nuevo formato son code-lab.js, code-worker.js, public/app.js y server.js. Se conservan módulos de versiones anteriores como referencia.

Los intentos guardan el código, su hash, la duración y el resultado en data/responses.json y en la integración existente con Supabase cuando se configura. El ZIP excluye historiales, credenciales y node_modules.

Esta entrega se ejecuta localmente. Para que otros equipos accedan por un enlace se necesita alojar el servidor Node.js con soporte para procesos hijos.
