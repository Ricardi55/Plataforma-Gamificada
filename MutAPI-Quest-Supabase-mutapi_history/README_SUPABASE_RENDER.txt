MUTAPI QUEST + SUPABASE + RENDER

Tabla usada:
  public.mutapi_history

Columnas esperadas:
  external_id, event_type, student_name, level, level_type, exercise_id,
  session_id, correct, score, duration_seconds, remaining_seconds,
  used_hint, used_hint_type, had_wrong_attempt, status, payload.

Variables que debes configurar en Render > Settings > Environment:
  SUPABASE_URL = https://TU-PROYECTO.supabase.co
  SUPABASE_SERVICE_ROLE_KEY = tu service_role key

No uses la anon key para este guardado.

Configuracion Render:
  Build Command: npm install
  Start Command: npm start

El proyecto no necesita instalar @supabase/supabase-js.
Usa fetch nativo de Node.js para insertar/upsert en Supabase.

Los intentos se guardan como event_type = attempt.
La sesion se guarda como event_type = session usando upsert por (event_type, external_id),
por eso no genera muchas filas repetidas para la misma sesion.
