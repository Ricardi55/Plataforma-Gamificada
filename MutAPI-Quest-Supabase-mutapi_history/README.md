# MutAPI Quest

Plataforma gamificada tipo Duolingo para una tesis sobre **pruebas de mutacion de software en API REST**.

## Que incluye

- Frontend en HTML, CSS y JavaScript puro.
- Backend en Node.js sin dependencias externas.
- 10 niveles:
  - Nivel 1 al 3: Principiante, teoria y respuestas marcadas.
  - Nivel 4 al 7: Intermedio, casos evaluados por un agente local mediante rubrica.
  - Nivel 8 al 10: Avanzado, lectura de colecciones Postman pegadas o subidas como JSON.
- Pantalla inicial obligatoria para registrar el nombre del estudiante antes de jugar.
- Progreso separado por nombre de estudiante.
- Desbloqueo inmediato del siguiente nivel cuando la respuesta es correcta.
- Pantalla de "Nivel superado" al eliminar un mutante.
- Sistema de 5 vidas: cada error resta 1 vida.
- Puntaje tematico de "mutantes eliminados" por cada nivel superado.
- Insignias oficiales por tipo de nivel:
  - Bronce: al completar Principiante.
  - Plata: al completar Intermedio.
  - Oro: al completar Avanzado.
- Ayudas acumulables:
  - Principiante: gana 1 ayuda al responder correctamente un nivel.
  - Intermedio: gana 1 ayuda solo si responde correctamente antes de que el cronometro llegue a 0.
  - Avanzado: no entrega ayudas.
  - Tipos de ayuda: pista, eliminar opcion, tiempo extra y ejemplo guia.
- Cronometro en niveles intermedios y avanzados.
- 1 ejercicio aleatorio por nivel, manteniendo los bancos completos de preguntas.
- Panel lateral con preguntas resueltas, aciertos, errores y ayudas del usuario actual.
- Guardado historico en Supabase si configuras credenciales.
- Respaldo local en archivo JSON si Supabase no esta configurado.

## Como ejecutar

Desde esta carpeta:

```bash
node server.js
```

Luego abre:

```text
http://localhost:3000
```

Si quieres usar otro puerto:

```bash
PORT=4000 node server.js
```

En PowerShell:

```powershell
$env:PORT=4000; node server.js
```

## Guardado historico con Supabase

1. En Supabase, abre el SQL Editor.
2. Ejecuta el contenido de:

```text
supabase-mutapi-history.sql
```

3. Configura estas variables antes de iniciar el servidor:

```powershell
$env:SUPABASE_URL="https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
$env:SUPABASE_TABLE="mutapi_history"
node server.js
```

Tambien puedes usar `SUPABASE_ANON_KEY`, pero para backend es mejor `SUPABASE_SERVICE_ROLE_KEY`. No coloques esa key en el frontend.

La tabla `mutapi_history` guarda:

- `event_type = attempt`: cada respuesta enviada por el estudiante.
- `event_type = session`: la sesion del estudiante, actualizada mientras juega.
- `payload`: detalle completo en formato JSONB para analisis historico.

## Respaldo local

Si Supabase no esta configurado, las respuestas se guardan automaticamente en:

```text
data/responses.json
```

Cada intento guarda:

- estudiante
- fecha y hora
- nivel
- tipo de nivel
- ejercicio
- respuesta o nombre de archivo
- resultado correcto/incorrecto
- puntaje
- segundos restantes
- si uso ayuda

El archivo se puede revisar directamente para analizar los intentos registrados.

## Backend disponible

- `GET /api/exercises`: devuelve niveles y bancos de ejercicios.
- `POST /api/answer`: evalua y guarda una respuesta.
- `GET /api/responses`: devuelve las respuestas guardadas.

## Nota para tesis

El agente evaluador del nivel intermedio y avanzado esta implementado como una rubrica local basada en conceptos clave. Esto permite explicar la evaluacion, repetir resultados y evitar depender de servicios externos durante la sustentacion.
