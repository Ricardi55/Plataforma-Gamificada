const state = {
  levels: [],
  pools: {},
  progress: {
    unlockedLevel: 1,
    completedLevels: [],
    rewards: 0,
    correct: 0,
    wrong: 0,
    lives: 5,
    mutants: 0,
    badges: [],
    streak: 0,
    fastWins: 0,
    usedExercises: {
      beginner: [],
      intermediate: [],
      advanced: []
    }
  },
  playerName: "",
  currentLevel: null,
  currentExercises: [],
  currentIndex: 0,
  selectedAnswer: null,
  usedHint: false,
  currentAttemptHadWrong: false,
  timerId: null,
  remainingSeconds: 0,
  advancedFile: null,
  sessionId: null,
  sessionStartedAt: null,
  sessionTimerId: null,
  sessionSaveId: null
};

const els = {
  startScreen: document.querySelector("#startScreen"),
  startForm: document.querySelector("#startForm"),
  playerName: document.querySelector("#playerName"),
  appShell: document.querySelector("#appShell"),
  sidebarPlayer: document.querySelector("#sidebarPlayer"),
  levelMap: document.querySelector("#levelMap"),
  completed: document.querySelector("#completed"),
  mutants: document.querySelector("#mutants"),
  lives: document.querySelector("#lives"),
  correctCount: document.querySelector("#correctCount"),
  wrongCount: document.querySelector("#wrongCount"),
  rewards: document.querySelector("#rewards"),
  sessionTime: document.querySelector("#sessionTime"),
  badges: document.querySelector("#badges"),
  exerciseDialog: document.querySelector("#exerciseDialog"),
  levelCompleteDialog: document.querySelector("#levelCompleteDialog"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  resultMedal: document.querySelector("#resultMedal"),
  resultMutants: document.querySelector("#resultMutants"),
  resultBadges: document.querySelector("#resultBadges"),
  lessonType: document.querySelector("#lessonType"),
  lessonTitle: document.querySelector("#lessonTitle"),
  timer: document.querySelector("#timer"),
  exerciseProgress: document.querySelector("#exerciseProgress"),
  exerciseHost: document.querySelector("#exerciseHost"),
  helpActions: document.querySelector("#helpActions"),
  submitAnswer: document.querySelector("#submitAnswer"),
  nextExercise: document.querySelector("#nextExercise"),
  closeLesson: document.querySelector("#closeLesson"),
  backToStart: document.querySelector("#backToStart"),
  toast: document.querySelector("#toast")
};

const localKey = "mutapiQuestProgress";
const maxLives = 5;

const badgeCatalog = [
  {
    id: "bronze-beginner",
    image: "assets/badge-bronze-principiante.svg",
    tier: "bronze",
    title: "Bronce - Nivel Principiante",
    when: progress => progress.completedLevels.includes(3)
  },
  {
    id: "silver-intermediate",
    image: "assets/badge-silver-intermedio.svg",
    tier: "silver",
    title: "Plata - Nivel Intermedio",
    when: progress => progress.completedLevels.includes(7)
  },
  {
    id: "gold-advanced",
    image: "assets/badge-gold-avanzado.svg",
    tier: "gold",
    title: "Oro - Nivel Avanzado",
    when: progress => progress.completedLevels.includes(10)
  }
];

const courseBadgeIds = ["bronze-beginner", "silver-intermediate", "gold-advanced"];
const medalLabels = {
  bronze: "bronce",
  silver: "plata",
  gold: "oro"
};

const levelIcons = {
  beginner: "lightbulb",
  intermediate: "clock",
  advanced: "file"
};

const helpIcons = {
  hint: "lightbulb",
  eliminate: "x",
  time: "clock",
  guide: "file"
};

function makeSessionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getSessionSeconds() {
  if (!state.sessionStartedAt) return 0;
  return Math.floor((Date.now() - state.sessionStartedAt) / 1000);
}

function renderSessionTime() {
  if (!els.sessionTime) return;
  els.sessionTime.textContent = formatDuration(getSessionSeconds());
}

function icon(name, className = "ui-icon") {
  return `<svg class="${className}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function learningCard(exercise) {
  const type = state.currentLevel?.type || "beginner";
  const lesson = exercise.lesson || {};
  const titleByType = {
    beginner: "Aprende antes de marcar",
    intermediate: "Guia para construir tu respuesta",
    advanced: "Guia para resolver un caso avanzado"
  };
  const contentByType = {
    beginner: [
      { icon: "lightbulb", label: "Objetivo", text: lesson.goal || "Aprender una idea base de pruebas de mutacion." },
      { icon: "check", label: "Concepto", text: lesson.concept || exercise.hint || "Busca que comportamiento deberia validar la prueba." },
      { icon: "file", label: "Ejemplo", text: lesson.example || "Una buena prueba comprueba status, cuerpo JSON o reglas de negocio." }
    ],
    intermediate: [
      { icon: "lightbulb", label: "Objetivo", text: lesson.goal || "Resolver un caso sencillo de API REST." },
      { icon: "check", label: "Idea guia", text: lesson.concept || "Identifica que regla del contrato debe cumplirse." },
      { icon: "file", label: "Criterio", text: "Tu respuesta debe explicar la entrada de prueba, el resultado esperado y que validacion revisarias." }
    ],
    advanced: [
      { icon: "lightbulb", label: "Objetivo", text: lesson.goal || "Analizar un mutante y proponer una prueba que lo detecte." },
      { icon: "check", label: "Que debe verse", text: lesson.concept || "Menciona entrada, respuesta esperada, asercion y por que mata al mutante." },
      { icon: "file", label: "Criterio avanzado", text: "Primero identifica el cambio del mutante; luego plantea que comportamiento observable debe comprobar la prueba." }
    ]
  };
  const items = contentByType[type].map(item => `
    <li>
      ${icon(item.icon, "coach-icon")}
      <div>
        <strong>${item.label}</strong>
        <span>${escapeHtml(item.text)}</span>
      </div>
    </li>
  `).join("");
  const practiceGuide = type === "intermediate" || type === "advanced" ? intermediatePracticeGuide(lesson) : "";
  return `
    <section class="learning-card" aria-label="Guia de aprendizaje">
      <div class="learning-card-header">
        ${icon("help", "coach-icon")}
        <div>
          <span>Modo tutor</span>
          <strong>${titleByType[type]}</strong>
        </div>
      </div>
      <ul class="coach-list">${items}</ul>
      ${practiceGuide}
    </section>
  `;
}

function intermediatePracticeGuide(lesson = {}) {
  const steps = [
    "Identifica la regla o comportamiento que esta en riesgo.",
    "Piensa que dato, rol, metodo o condicion pondrias a prueba.",
    "Describe el resultado esperado y la validacion que confirmaria ese resultado."
  ];
  const stepHtml = steps.map((step, index) => `
    <li>
      <strong>${index + 1}</strong>
      <span>${escapeHtml(step)}</span>
    </li>
  `).join("");
  return `
    <div class="answer-guide">
      <div class="answer-guide-title">
        ${icon("check", "coach-icon")}
        <strong>Ruta para pensar</strong>
      </div>
      <ol>${stepHtml}</ol>
      <div class="starter-box">
        <span>Antes de responder</span>
        <p>No busques una frase exacta. Construye tu idea con: caso de prueba, respuesta esperada y validacion.</p>
      </div>
    </div>
  `;
}

function feedbackLesson(result, payload) {
  const exercise = activeExercise();
  const type = payload.type;
  const message = escapeHtml(result.feedback || "Respuesta recibida.");
  const correctTitle = "Correcto, te llevas esta idea";
  const wrongTitle = "Casi, mira esta pista de aprendizaje";
  const guideByType = {
    beginner: result.correct
      ? "Las pruebas de mutacion sirven para comprobar si tus pruebas detectan cambios pequenos. Esa es la idea principal."
      : "Vuelve a la tarjeta de tutor y busca la palabra clave: mutante, prueba, cambio o deteccion.",
    intermediate: result.correct
      ? "Una buena respuesta simple dice tres cosas: que enviarias, que esperarias y que revisarias."
      : "No necesitas escribir como experto. Basta con explicar: enviaria este dato, esperaria esta respuesta y revisaria este resultado.",
    advanced: result.correct
      ? "Tu analisis conecta mutante, prueba y asercion. Esa relacion es lo que permite detectar cambios peligrosos en una API."
      : "Revisa que tu respuesta diga que mutante podria aparecer, que enviarias, que esperarias y que asercion lo detectaria."
  };

  return `
    <div class="feedback-title">
      ${icon(result.correct ? "check" : "lightbulb", "coach-icon")}
      <strong>${result.correct ? correctTitle : wrongTitle}</strong>
    </div>
    <p>${message}</p>
    <div class="feedback-lesson">
      <span>Aprendizaje</span>
      <p>${escapeHtml(guideByType[type])}</p>
    </div>
  `;
}

function defaultProgress() {
  return {
    unlockedLevel: 1,
    completedLevels: [],
    rewards: 0,
    correct: 0,
    wrong: 0,
    lives: maxLives,
    mutants: 0,
    badges: [],
    streak: 0,
    fastWins: 0,
    usedExercises: {
      beginner: [],
      intermediate: [],
      advanced: []
    }
  };
}

function playerKey(name) {
  return `${localKey}:${name.trim().toLowerCase()}`;
}

function loadProgress(name) {
  const saved = localStorage.getItem(playerKey(name));
  state.progress = defaultProgress();
  if (!saved) return;
  try {
    state.progress = { ...state.progress, ...JSON.parse(saved) };
    state.progress.badges = state.progress.badges.filter(id => courseBadgeIds.includes(id));
    state.progress.usedExercises = normalizeUsedExercises(state.progress.usedExercises);
  } catch (error) {
    console.warn("No se pudo cargar progreso local", error);
  }
}

function normalizeUsedExercises(usedExercises = {}) {
  return {
    beginner: Array.isArray(usedExercises.beginner) ? usedExercises.beginner : [],
    intermediate: Array.isArray(usedExercises.intermediate) ? usedExercises.intermediate : [],
    advanced: Array.isArray(usedExercises.advanced) ? usedExercises.advanced : []
  };
}

function saveProgress() {
  if (!state.playerName) return;
  localStorage.setItem(playerKey(state.playerName), JSON.stringify(state.progress));
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function pickExercises(type, count) {
  const used = new Set(state.progress.usedExercises[type] || []);
  const available = state.pools[type].filter(exercise => !used.has(exercise.id));
  const source = available.length >= count ? available : state.pools[type];
  return shuffle(source).slice(0, count);
}

function renderStats() {
  els.sidebarPlayer.textContent = state.playerName || "-";
  els.completed.textContent = `${state.progress.completedLevels.length}/10`;
  els.mutants.textContent = state.progress.mutants;
  els.lives.innerHTML = renderLives();
  els.correctCount.textContent = state.progress.correct;
  els.wrongCount.textContent = state.progress.wrong;
  els.rewards.textContent = state.progress.rewards;
  renderSessionTime();
  renderBadges();
  saveProgress();
}

function renderLives() {
  const hearts = Array.from({ length: maxLives }, (_, index) => {
    const active = index < state.progress.lives ? "active" : "";
    return `<span class="life ${active}" aria-hidden="true"></span>`;
  }).join("");
  return `<span class="lives-hearts">${hearts}</span><span class="lives-count">${state.progress.lives}/${maxLives}</span>`;
}

function renderBadges() {
  if (!state.progress.badges.length) {
    els.badges.innerHTML = "<small>Aun no hay insignias</small>";
    return;
  }
  els.badges.innerHTML = state.progress.badges
    .map(id => badgeCatalog.find(badge => badge.id === id))
    .filter(Boolean)
    .map(badge => `
      <span class="course-badge badge-${badge.tier}">
        <img src="${badge.image}" alt="" aria-hidden="true">
        <strong>${badge.title}</strong>
      </span>
    `)
    .join("");
}

function renderMap() {
  els.levelMap.innerHTML = "";
  state.levels.forEach(level => {
    const button = document.createElement("button");
    const isLocked = level.level > state.progress.unlockedLevel;
    const isComplete = state.progress.completedLevels.includes(level.level);
    button.className = `level-card ${level.type}${isLocked ? " locked" : ""}${isComplete ? " complete" : ""}`;
    button.type = "button";
    button.disabled = isLocked || isComplete;
    button.setAttribute(
      "aria-label",
      isComplete
        ? `${level.title} ${level.level}, completado`
        : isLocked
          ? `${level.title} ${level.level}, bloqueado`
          : `${level.title} ${level.level}, disponible`
    );
    button.innerHTML = `
      <div class="level-token">${isLocked ? icon("lock", "level-icon") : isComplete ? icon("check", "level-icon") : icon(levelIcons[level.type], "level-icon")}</div>
      <div>
        <strong>${level.title} ${level.level}</strong>
        <span>${isComplete ? "Completado" : `${level.exerciseCount} ejercicio`}</span>
      </div>
    `;
    button.addEventListener("click", () => startLevel(level));
    els.levelMap.appendChild(button);
  });
}

function showToast(message) {
  const openDialog = els.exerciseDialog.open ? els.exerciseDialog : els.levelCompleteDialog.open ? els.levelCompleteDialog : null;
  const targetHost = openDialog || document.body;
  if (els.toast.parentElement !== targetHost) targetHost.appendChild(els.toast);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 2800);
}

function startLevel(level) {
  if (state.progress.lives <= 0) {
    handleGameOver();
    return;
  }
  if (state.progress.completedLevels.includes(level.level)) {
    showToast(`El nivel ${level.level} ya fue completado.`);
    return;
  }
  if (level.level > state.progress.unlockedLevel) {
    showToast(`El nivel ${level.level} aun esta bloqueado.`);
    return;
  }
  state.currentLevel = level;
  state.currentExercises = pickExercises(level.type, level.exerciseCount);
  state.currentIndex = 0;
  els.lessonType.textContent = `${level.title} · Nivel ${level.level}`;
  els.lessonTitle.textContent = level.type === "beginner"
    ? "Teoria y respuestas marcadas"
    : level.type === "intermediate"
      ? "Casos evaluados por agente"
      : "Casos avanzados de mutacion";
  if (level.timed) startTimer(level.seconds);
  else stopTimer();
  els.exerciseDialog.showModal();
  renderExercise();
}

function startTimer(seconds) {
  stopTimer();
  state.remainingSeconds = seconds;
  els.timer.hidden = false;
  updateTimerText();
  state.timerId = window.setInterval(() => {
    state.remainingSeconds = Math.max(0, state.remainingSeconds - 1);
    updateTimerText();
    if (state.remainingSeconds === 0) {
      stopTimer(false);
      showToast("Tiempo agotado. Puedes responder, pero sin recompensa por rapidez.");
    }
  }, 1000);
}

function stopTimer(hide = true) {
  window.clearInterval(state.timerId);
  state.timerId = null;
  if (hide) els.timer.hidden = true;
}

function updateTimerText() {
  const minutes = String(Math.floor(state.remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(state.remainingSeconds % 60).padStart(2, "0");
  els.timer.textContent = `${minutes}:${seconds}`;
}

function renderExercise() {
  const exercise = state.currentExercises[state.currentIndex];
  state.selectedAnswer = null;
  state.usedHint = false;
  state.usedHintType = null;
  state.currentAttemptHadWrong = false;
  state.advancedFile = null;
  els.submitAnswer.hidden = false;
  els.submitAnswer.disabled = false;
  els.nextExercise.hidden = true;
  els.nextExercise.innerHTML = `${icon("map")}<span>Cerrar</span>`;
  renderHelpActions();
  els.exerciseProgress.style.width = `${(state.currentIndex / state.currentExercises.length) * 100}%`;

  if (state.currentLevel.type === "beginner") renderBeginner(exercise);
  if (state.currentLevel.type === "intermediate") renderIntermediate(exercise);
  if (state.currentLevel.type === "advanced") renderAdvanced(exercise);
}

function renderHelpActions() {
  els.helpActions.innerHTML = "";

  els.helpActions.hidden = false;
  const helps = state.currentLevel.type === "beginner"
    ? [
        { type: "hint", label: "Pista" },
        { type: "eliminate", label: "Eliminar opcion" }
      ]
    : [
        { type: "hint", label: "Pista" },
        { type: "time", label: "+30 segundos" },
        { type: "guide", label: "Guia" }
      ];

  helps.forEach(help => {
    const button = document.createElement("button");
    button.className = "ghost-button icon-button";
    button.type = "button";
    button.innerHTML = `${icon(helpIcons[help.type])}<span>${help.label}</span>`;
    button.title = help.label;
    button.disabled = state.progress.rewards <= 0;
    button.addEventListener("click", () => useHint(help.type));
    els.helpActions.appendChild(button);
  });
}

function renderBeginner(exercise) {
  const optionHtml = exercise.options.map((option, index) => `
    <button class="option" type="button" data-index="${index}">
      <span>${String.fromCharCode(65 + index)}</span>
      <strong>${option}</strong>
    </button>
  `).join("");
  els.exerciseHost.innerHTML = `
    <h3 class="exercise-title">${exercise.title}</h3>
    ${learningCard(exercise)}
    <p>${exercise.question}</p>
    <div class="option-list">${optionHtml}</div>
    <div id="feedback" class="feedback"></div>
  `;
  els.exerciseHost.querySelectorAll(".option").forEach(option => {
    option.addEventListener("click", () => {
      els.exerciseHost.querySelectorAll(".option").forEach(item => item.classList.remove("selected"));
      option.classList.add("selected");
      state.selectedAnswer = Number(option.dataset.index);
    });
  });
}

function renderIntermediate(exercise) {
  els.exerciseHost.innerHTML = `
    <h3 class="exercise-title">${exercise.title}</h3>
    ${learningCard(exercise)}
    <p>${exercise.prompt}</p>
    <textarea id="textAnswer" placeholder="Escribe tu analisis, caso de prueba y aserciones esperadas..."></textarea>
    <div id="feedback" class="feedback"></div>
  `;
}

function renderAdvanced(exercise) {
  els.exerciseHost.innerHTML = `
    <h3 class="exercise-title">${exercise.title}</h3>
    ${learningCard(exercise)}
    <p>${exercise.prompt}</p>
    <textarea id="textAnswer" placeholder="Escribe un analisis avanzado: mutante posible, prueba en Postman, aserciones y resultado esperado..."></textarea>
    <div id="feedback" class="feedback"></div>
  `;
}

function activeExercise() {
  return state.currentExercises[state.currentIndex];
}

function getPayload() {
  const type = state.currentLevel.type;
  const exercise = activeExercise();
  const base = {
    studentName: state.playerName,
    level: state.currentLevel.level,
    type,
    exerciseId: exercise.id,
    remainingSeconds: state.remainingSeconds,
    usedHint: state.usedHint,
    usedHintType: state.usedHintType,
    hadWrongAttempt: state.currentAttemptHadWrong
  };

  if (type === "beginner") return { ...base, answer: state.selectedAnswer };
  if (type === "intermediate") {
    return { ...base, answer: els.exerciseHost.querySelector("#textAnswer").value.trim() };
  }
  return { ...base, answer: els.exerciseHost.querySelector("#textAnswer").value.trim() };
}

async function submitAnswer() {
  const payload = getPayload();
  if (payload.type === "beginner" && payload.answer === null) {
    showInlineFeedback("Marca una respuesta antes de comprobar.", false);
    return;
  }
  if (payload.type === "intermediate" && payload.answer.length < 12) {
    showInlineFeedback("Escribe una idea un poco mas completa: que enviarias y que esperarias.", false);
    els.exerciseHost.querySelector("#textAnswer")?.focus();
    return;
  }
  if (payload.type === "advanced" && payload.answer.length < 35) {
    showInlineFeedback("Escribe un analisis mas completo: mutante, prueba, asercion y resultado esperado.", false);
    els.exerciseHost.querySelector("#textAnswer")?.focus();
    return;
  }

  els.submitAnswer.disabled = true;
  try {
    const result = await postAnswer(payload);
    showFeedback(result, payload);
  } catch (error) {
    showFeedback({
      correct: false,
      feedback: "No se pudo comprobar la respuesta en este momento. Actualiza la pagina o vuelve a intentarlo."
    }, payload);
  }
}

function showInlineFeedback(message, success) {
  const feedback = els.exerciseHost.querySelector("#feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `feedback show ${success ? "success" : "error"}`;
}

async function postAnswer(payload) {
  const response = await fetch("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      correct: false,
      feedback: "La plataforma recibio una respuesta inesperada del servidor. Vuelve a intentarlo."
    };
  }
}

function showFeedback(result, payload) {
  const feedback = els.exerciseHost.querySelector("#feedback");
  feedback.innerHTML = feedbackLesson(result, payload);
  feedback.className = `feedback show ${result.correct ? "success" : "error"}`;

  if (payload.type === "beginner") {
    els.exerciseHost.querySelectorAll(".option").forEach(option => {
      const index = Number(option.dataset.index);
      if (result.correct) {
        option.disabled = true;
        if (index === payload.answer) option.classList.add("correct");
      } else if (index === payload.answer) {
        option.disabled = true;
        option.classList.remove("selected");
        option.classList.add("wrong");
      }
    });
    if (!result.correct) state.selectedAnswer = null;
  }

  if (result.correct) {
    markExerciseSolved(payload);
    const completedNow = completeLevel(false, !payload.hadWrongAttempt);
    state.progress.correct += 1;
    state.progress.streak += 1;
    els.exerciseProgress.style.width = "100%";
    if ((payload.type === "intermediate" || payload.type === "advanced") && payload.remainingSeconds > 0 && completedNow) {
      state.progress.fastWins += 1;
    }
    if (shouldGiveReward(payload, completedNow)) {
      state.progress.rewards += 1;
      showToast("Ayuda adicional desbloqueada.");
    }
  } else {
    const firstWrongAttempt = !state.currentAttemptHadWrong;
    if (firstWrongAttempt) state.progress.wrong += 1;
    state.progress.streak = 0;
    if (firstWrongAttempt) state.progress.lives = Math.max(0, state.progress.lives - 1);
    state.currentAttemptHadWrong = true;
    if (state.progress.lives === 0) {
      handleGameOver();
      return;
    }
    renderStats();
    renderMap();
    els.submitAnswer.disabled = false;
    els.submitAnswer.hidden = false;
    els.nextExercise.hidden = true;
    showToast(firstWrongAttempt ? "Puedes intentarlo otra vez. No perderas otra vida en este ejercicio." : "Sigue intentando este mismo ejercicio.");
    return;
  }
  renderStats();
  renderMap();
  els.submitAnswer.hidden = true;
  els.nextExercise.hidden = false;
}

function markExerciseSolved(payload) {
  const used = state.progress.usedExercises[payload.type] || [];
  if (!used.includes(payload.exerciseId)) used.push(payload.exerciseId);
  state.progress.usedExercises[payload.type] = used;
}

function shouldGiveReward(payload, completedNow) {
  if (!completedNow) return false;
  if (payload.hadWrongAttempt) return false;
  if (payload.type === "beginner") return true;
  if (payload.type === "intermediate") return payload.remainingSeconds > 0;
  return false;
}

function nextExercise() {
  els.exerciseDialog.close();
}

function completeLevel(closeDialog = true, giveLifeBonus = true) {
  stopTimer();
  const levelNumber = state.currentLevel.level;
  const completedNow = !state.progress.completedLevels.includes(levelNumber);
  if (completedNow) {
    state.progress.completedLevels.push(levelNumber);
    state.progress.mutants += 1;
    if (giveLifeBonus) state.progress.lives = Math.min(maxLives, state.progress.lives + 1);
    const newBadges = awardBadges();
    showLevelComplete(levelNumber, newBadges);
  }
  state.progress.unlockedLevel = Math.max(state.progress.unlockedLevel, Math.min(10, levelNumber + 1));
  renderStats();
  renderMap();
  if (closeDialog) els.exerciseDialog.close();
  if (completedNow) showToast(`Nivel ${levelNumber} superado.`);
  return completedNow;
}

function awardBadges() {
  const newBadges = [];
  badgeCatalog.forEach(badge => {
    if (!state.progress.badges.includes(badge.id) && badge.when(state.progress)) {
      state.progress.badges.push(badge.id);
      newBadges.push(badge);
    }
  });
  return newBadges;
}

function showLevelComplete(levelNumber, newBadges = []) {
  const courseBadge = newBadges.find(badge => courseBadgeIds.includes(badge.id));
  els.resultMedal.hidden = !courseBadge;
  els.resultMedal.className = `result-medal ${courseBadge?.tier || ""}`;
  els.resultMedal.innerHTML = courseBadge
    ? `<img src="${courseBadge.image}" alt="${courseBadge.title}">`
    : "";
  els.resultTitle.textContent = courseBadge ? `Ganaste insignia de ${medalLabels[courseBadge.tier]}` : `Nivel ${levelNumber} completado`;
  els.resultText.textContent = courseBadge
    ? `${courseBadge.title}. Superaste todo este tipo de nivel y la insignia ya fue agregada a tu menu.`
    : "Buen trabajo. Eliminaste un mutante y fortaleciste tus pruebas de API REST.";
  els.resultMutants.textContent = state.progress.mutants;
  els.resultBadges.textContent = state.progress.badges.length;
  if (els.exerciseDialog.open) els.exerciseDialog.close();
  if (!els.levelCompleteDialog.open) els.levelCompleteDialog.showModal();
}

function handleGameOver() {
  const keptBadges = [...new Set(state.progress.badges.filter(id => courseBadgeIds.includes(id)))];
  state.progress = {
    ...defaultProgress(),
    badges: keptBadges
  };
  stopTimer();
  renderStats();
  renderMap();
  if (els.exerciseDialog.open) els.exerciseDialog.close();
  showGameOverDialog();
}

function showGameOverDialog() {
  els.resultMedal.hidden = false;
  els.resultMedal.className = "result-medal defeat";
  els.resultMedal.innerHTML = icon("heart", "defeat-icon");
  els.resultTitle.textContent = "Perdiste todas tus vidas";
  els.resultText.textContent = "Intenta nuevamente. Volveras a iniciar desde el nivel 1 con 5 vidas. Tus insignias ganadas se mantienen.";
  els.resultMutants.textContent = state.progress.mutants;
  els.resultBadges.textContent = state.progress.badges.length;
  if (!els.levelCompleteDialog.open) els.levelCompleteDialog.showModal();
}

function backToStart() {
  stopTimer();
  endSession(false);
  if (els.exerciseDialog.open) els.exerciseDialog.close();
  if (els.levelCompleteDialog.open) els.levelCompleteDialog.close();
  els.appShell.hidden = true;
  els.startScreen.hidden = false;
  els.playerName.focus();
}

function useHint(type) {
  const exercise = activeExercise();
  if (state.progress.rewards <= 0) return;
  state.progress.rewards -= 1;
  state.usedHint = true;
  state.usedHintType = type;
  renderStats();
  const feedback = els.exerciseHost.querySelector("#feedback");

  if (type === "eliminate") {
    eliminateWrongOption(exercise);
    feedback.innerHTML = helpFeedback("Opcion eliminada", "Se elimino una alternativa incorrecta para que compares con mas calma.");
  } else if (type === "time") {
    state.remainingSeconds += 30;
    updateTimerText();
    feedback.innerHTML = helpFeedback("Tiempo adicional", "Se agregaron 30 segundos. Usa ese tiempo para seguir los pasos del tutor.");
  } else if (type === "guide") {
    feedback.innerHTML = helpFeedback(
      "Guia de razonamiento",
      "Ordena tu respuesta asi: identifica el comportamiento que podria fallar, propone un caso de prueba y menciona que validacion confirmaria si la API actua correctamente."
    );
  } else {
    const hint = state.currentLevel.type === "intermediate" || state.currentLevel.type === "advanced"
      ? `${exercise.hint} Recuerda responder con esta forma: enviaria..., esperaria..., validaria...`
      : exercise.hint;
    feedback.innerHTML = helpFeedback("Pista de aprendizaje", hint);
  }
  feedback.className = "feedback show";
  renderHelpActions();
}

function helpFeedback(title, text) {
  return `
    <div class="feedback-title">
      ${icon("lightbulb", "coach-icon")}
      <strong>${escapeHtml(title)}</strong>
    </div>
    <p>${escapeHtml(text)}</p>
  `;
}

function eliminateWrongOption(exercise) {
  const options = Array.from(els.exerciseHost.querySelectorAll(".option"));
  const wrongOption = options.find(option => Number(option.dataset.index) !== exercise.answer && !option.disabled);
  if (wrongOption) {
    wrongOption.disabled = true;
    wrongOption.classList.add("wrong");
  }
}

function startSessionTimer() {
  endSession(false);
  state.sessionId = makeSessionId();
  state.sessionStartedAt = Date.now();
  renderSessionTime();
  state.sessionTimerId = window.setInterval(renderSessionTime, 1000);
  state.sessionSaveId = window.setInterval(() => saveSession(false), 15000);
  saveSession(false);
}

function getSessionPayload(status = "active") {
  return {
    sessionId: state.sessionId,
    studentName: state.playerName,
    startedAt: state.sessionStartedAt ? new Date(state.sessionStartedAt).toISOString() : null,
    endedAt: status === "active" ? null : new Date().toISOString(),
    durationSeconds: getSessionSeconds(),
    status,
    completedLevels: state.progress.completedLevels,
    correct: state.progress.correct,
    wrong: state.progress.wrong,
    lives: state.progress.lives,
    badges: state.progress.badges
  };
}

function saveSession(useBeacon = false, status = "active") {
  if (!state.sessionId || !state.playerName) return;
  const payload = getSessionPayload(status);
  if (useBeacon && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon("/api/session", blob);
    return;
  }
  fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => {});
}

function endSession(useBeacon = true) {
  if (!state.sessionId) return;
  window.clearInterval(state.sessionTimerId);
  window.clearInterval(state.sessionSaveId);
  state.sessionTimerId = null;
  state.sessionSaveId = null;
  saveSession(useBeacon, "closed");
  state.sessionId = null;
  state.sessionStartedAt = null;
  renderSessionTime();
}

async function init() {
  const response = await fetch("/api/exercises");
  const data = await response.json();
  state.levels = data.levels;
  state.pools = data.pools;
}

els.startForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = els.playerName.value.trim();
  if (!name) {
    showToast("Ingresa tu nombre para empezar.");
    return;
  }
  state.playerName = name;
  loadProgress(name);
  startSessionTimer();
  awardBadges();
  renderStats();
  renderMap();
  els.startScreen.hidden = true;
  els.appShell.hidden = false;
  showToast(`Bienvenido, ${name}.`);
});

els.submitAnswer.addEventListener("click", submitAnswer);
els.nextExercise.addEventListener("click", nextExercise);
els.closeLesson.addEventListener("click", () => stopTimer());
els.backToStart.addEventListener("click", backToStart);
els.exerciseDialog.addEventListener("close", () => stopTimer());
window.addEventListener("beforeunload", () => endSession(true));

init().catch(error => {
  console.error(error);
  showToast("No se pudo iniciar la plataforma.");
});
