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
  timerId: null,
  remainingSeconds: 0,
  advancedFile: null
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
  example: "file"
};

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
    advanced: "Checklist antes de subir tu coleccion"
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
      { icon: "file", label: "Respuesta modelo", text: lesson.example || "Responde: enviaria..., esperaria..., validaria..." }
    ],
    advanced: [
      { icon: "lightbulb", label: "Objetivo", text: lesson.goal || "Practicar una comprobacion simple en Postman." },
      { icon: "check", label: "Que debe verse", text: lesson.concept || "Incluye pm.test, pm.expect o validaciones de status/cuerpo." },
      { icon: "file", label: "Mini ejemplo", text: lesson.example || exercise.hint || "Demuestra una asercion observable." }
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
  const practiceGuide = type === "intermediate" ? intermediatePracticeGuide(lesson) : "";
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
  const steps = Array.isArray(lesson.steps) && lesson.steps.length
    ? lesson.steps
    : [
        "Identifica que dato o regla se esta probando.",
        "Di que enviarias a la API.",
        "Di que respuesta esperarias y que revisarias."
      ];
  const stepHtml = steps.map((step, index) => `
    <li>
      <strong>${index + 1}</strong>
      <span>${escapeHtml(step)}</span>
    </li>
  `).join("");
  const starter = lesson.starter || "Enviaria..., esperaria..., y validaria...";
  return `
    <div class="answer-guide">
      <div class="answer-guide-title">
        ${icon("check", "coach-icon")}
        <strong>Como puedes responder</strong>
      </div>
      <ol>${stepHtml}</ol>
      <div class="starter-box">
        <span>Frase de inicio</span>
        <p>${escapeHtml(starter)}</p>
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
      ? "Tu archivo ya muestra una comprobacion automatica. Eso es lo que permite detectar cambios en la API."
      : "Revisa que tu coleccion tenga una prueba visible, por ejemplo pm.test, pm.expect o una validacion de status."
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
      : "Lectura de coleccion Postman";
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
  if (state.currentLevel.type === "advanced") {
    els.helpActions.hidden = true;
    return;
  }

  els.helpActions.hidden = false;
  const helps = state.currentLevel.type === "beginner"
    ? [
        { type: "hint", label: "Pista" },
        { type: "eliminate", label: "Eliminar opcion" }
      ]
    : [
        { type: "hint", label: "Pista" },
        { type: "time", label: "+30 segundos" },
        { type: "example", label: "Ejemplo" }
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
    <div class="file-zone">
      <input id="postmanFile" type="file" accept=".json,.txt,application/json">
      <textarea id="fileContent" placeholder="Tambien puedes pegar aqui el JSON exportado de Postman..."></textarea>
    </div>
    <div id="feedback" class="feedback"></div>
  `;
  els.exerciseHost.querySelector("#postmanFile").addEventListener("change", async event => {
    const [file] = event.target.files;
    if (!file) return;
    const content = await file.text();
    state.advancedFile = { name: file.name, content };
    els.exerciseHost.querySelector("#fileContent").value = content;
  });
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
    usedHintType: state.usedHintType
  };

  if (type === "beginner") return { ...base, answer: state.selectedAnswer };
  if (type === "intermediate") {
    return { ...base, answer: els.exerciseHost.querySelector("#textAnswer").value.trim() };
  }
  const pasted = els.exerciseHost.querySelector("#fileContent").value.trim();
  return {
    ...base,
    answer: pasted,
    fileName: state.advancedFile?.name || "texto-pegado.json",
    fileContent: pasted || state.advancedFile?.content || ""
  };
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
  if (payload.type === "advanced" && !payload.fileContent) {
    showInlineFeedback("Sube o pega una coleccion Postman en esta seccion.", false);
    return;
  }
  if (payload.type === "advanced" && !looksLikePostmanContent(payload.fileContent)) {
    showInlineFeedback("Sube o pega el JSON exportado desde Postman. Debe contener campos como info, item o scripts pm.test.", false);
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

function looksLikePostmanContent(content) {
  const text = String(content || "").trim();
  if (!text) return false;
  if (text.includes("pm.test") || text.includes("pm.expect")) return true;
  try {
    const parsed = JSON.parse(text);
    return Boolean(parsed.info || parsed.item);
  } catch (error) {
    return false;
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
      option.disabled = true;
      if (result.correct && index === payload.answer) option.classList.add("correct");
      if (!result.correct && index === payload.answer) option.classList.add("wrong");
    });
  }

  if (result.correct) {
    markExerciseSolved(payload);
    const completedNow = completeLevel(false);
    state.progress.correct += 1;
    state.progress.streak += 1;
    els.exerciseProgress.style.width = "100%";
    if (payload.type === "intermediate" && payload.remainingSeconds > 0 && completedNow) {
      state.progress.fastWins += 1;
    }
    if (shouldGiveReward(payload, completedNow)) {
      state.progress.rewards += 1;
      showToast("Ayuda adicional desbloqueada.");
    }
  } else {
    state.progress.wrong += 1;
    state.progress.streak = 0;
    state.progress.lives = Math.max(0, state.progress.lives - 1);
    if (state.progress.lives === 0) {
      handleGameOver();
      return;
    }
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
  if (payload.type === "beginner") return true;
  if (payload.type === "intermediate") return payload.remainingSeconds > 0;
  return false;
}

function nextExercise() {
  els.exerciseDialog.close();
}

function completeLevel(closeDialog = true) {
  stopTimer();
  const levelNumber = state.currentLevel.level;
  const completedNow = !state.progress.completedLevels.includes(levelNumber);
  if (completedNow) {
    state.progress.completedLevels.push(levelNumber);
    state.progress.mutants += 1;
    state.progress.lives = Math.min(maxLives, state.progress.lives + 1);
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
  if (els.exerciseDialog.open) els.exerciseDialog.close();
  if (els.levelCompleteDialog.open) els.levelCompleteDialog.close();
  els.appShell.hidden = true;
  els.startScreen.hidden = false;
  els.playerName.focus();
}

function useHint(type) {
  const exercise = activeExercise();
  if (state.currentLevel.type === "advanced" || state.progress.rewards <= 0) return;
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
  } else if (type === "example") {
    const starter = exercise.lesson?.starter || exercise.model || "Menciona que enviarias, que esperarias y que validarias.";
    feedback.innerHTML = helpFeedback("Ejemplo guiado", starter);
  } else {
    const hint = state.currentLevel.type === "intermediate"
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

init().catch(error => {
  console.error(error);
  showToast("No se pudo iniciar la plataforma.");
});
