// Инициализация, загрузка, музыка.
// Важно: storyPage объявлена ТОЛЬКО в ui.js, здесь её не трогаем.

const MUSIC_VOLUME = 0.35;
let musicStarted = false;

// ---------- ЗАГРУЗКА ----------
function setLoading(pct, text) {
  const fill = document.getElementById("loading-fill");
  const status = document.getElementById("loading-status");
  if (fill) fill.style.width = pct + "%";
  if (status && text) status.textContent = text;
}

function runLoading() {
  const steps = [
    [15, "Пробуждение..."],
    [35, "Проверка сохранения..."],
    [55, "Загрузка мира..."],
    [75, "Настройка Байкала..."],
    [100, "Готово."],
  ];
  let i = 0;
  const tick = () => {
    if (i >= steps.length) {
      const btn = document.getElementById("loading-start");
      if (btn) btn.style.display = "block";
      return;
    }
    setLoading(steps[i][0], steps[i][1]);
    i += 1;
    setTimeout(tick, 300);
  };
  tick();
}

// Показывает ошибку крупно на экране
function showFatal(title, err) {
  const msg = (err && err.name ? err.name + ": " : "") +
              (err && err.message ? err.message : String(err));
  const stack = err && err.stack ? "\n\n" + err.stack : "";
  console.error(title, err);
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;top:8px;left:8px;right:8px;background:#5a1a1a;color:#fff;" +
    "padding:12px;border-radius:8px;z-index:99999;font-size:13px;white-space:pre-wrap;" +
    "max-height:60vh;overflow:auto;font-family:monospace";
  box.textContent = title + "\n" + msg + stack;
  document.body.appendChild(box);
}

// ---------- СТАРТ ИГРЫ ----------
function startGame() {
  console.log("[startGame] нажата");
  try {
    try { startMusic(); } catch (e) { console.warn("[music]", e); }

    const loading = document.getElementById("screen-loading");
    if (loading) loading.classList.remove("active");

    if (STATE.player) {
      renderMenu();
      showScreen("menu");
    } else {
      storyPage = 0;          // просто присваиваем, НЕ объявляем заново
      renderStory();
      showScreen("story");
    }
    console.log("[startGame] OK");
  } catch (e) {
    showFatal("Ошибка старта:", e);
  }
}

// ---------- МУЗЫКА ----------
function startMusic() {
  if (musicStarted) return;
  const audio = document.getElementById("bg-music");
  if (!audio) return;
  audio.volume = MUSIC_VOLUME;
  const p = audio.play();
  if (p && p.then) {
    p.then(() => { musicStarted = true; }).catch(err => console.warn("[music]", err));
  }
}

function toggleMusic() {
  const audio = document.getElementById("bg-music");
  if (!audio) { toast("Аудио не найдено"); return; }
  if (audio.paused) {
    audio.play().then(() => { musicStarted = true; }).catch(() => {});
    toast("🔊 Музыка включена");
  } else {
    audio.pause();
    toast("🔇 Музыка выключена");
  }
}

// ---------- ИНИЦИАЛИЗАЦИЯ ----------
(function init() {
  console.log("[init] старт");

  try {
    showScreen("loading");
    runLoading();
  } catch (e) {
    showFatal("Ошибка на экране загрузки:", e);
    return;
  }

  try {
    load();
    console.log("[init] сейв загружен, player =", STATE.player ? STATE.player.name : "нет");
  } catch (e) {
    console.warn("[init] битый сейв, чистим:", e);
    try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
    STATE.player = null;
  }

  try {
    const sleepMsg = checkSleepOnLoad();
    if (sleepMsg) setTimeout(() => toast(sleepMsg, 4000), 1200);
  } catch (e) {
    console.warn("[init] checkSleepOnLoad", e);
  }

  setInterval(() => {
    try {
      if (STATE.player) {
        getPlayer();
        save();
        const menu = document.getElementById("screen-menu");
        if (menu && menu.classList.contains("active")) renderMenu();
      }
    } catch (e) { console.warn("[autosave]", e); }
  }, 30000);
// ---------- ВКЛАДКИ (декоративно) ----------
function switchTab(el, id) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  if (el) el.classList.add("active");
  return false;
}
})();