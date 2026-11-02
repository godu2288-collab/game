// dialog.js — диалоговое окно вместо всплывающих сообщений.
// Закрывается кнопкой, крестиком, клавишей Esc и тапом по затемнению.
//
// showDialog("текст")
// showDialog("текст", { title: "Заголовок", buttons: [{ text: "Надеть", primary: true, onClick: () => {} }] })
//
// Старый toast(msg, ms) продолжает работать — он просто открывает диалог.

let dialogOpen = false;
const dialogQueue = [];
let dialogOnClose = null;

function showDialog(text, opts = {}) {
  // Если уже открыт другой диалог — встаём в очередь
  if (dialogOpen) { dialogQueue.push([text, opts]); return; }

  const overlay = document.getElementById("dialog-overlay");
  if (!overlay) { console.warn("[dialog]", text); return; }

  const titleEl = document.getElementById("dialog-title");
  titleEl.textContent = opts.title || "";
  titleEl.style.display = opts.title ? "block" : "none";
  document.getElementById("dialog-text").textContent = text || "";

  const actions = document.getElementById("dialog-actions");
  actions.innerHTML = "";
  const buttons = (opts.buttons && opts.buttons.length) ? opts.buttons : [];
  for (const b of buttons) {
    const btn = document.createElement("button");
    btn.textContent = b.text;
    if (b.primary) btn.className = "primary";
    btn.onclick = () => {
      closeDialog();
      if (b.onClick) b.onClick();
    };
    actions.appendChild(btn);
  }
  // Кнопка закрытия есть всегда
  const closeBtn = document.createElement("button");
  closeBtn.className = "dialog-close";
  closeBtn.textContent = buttons.length ? "Закрыть" : "Ок";
  closeBtn.onclick = () => closeDialog();
  actions.appendChild(closeBtn);

  dialogOnClose = opts.onClose || null;
  dialogOpen = true;
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("show"));
  closeBtn.focus();
}

function closeDialog() {
  const overlay = document.getElementById("dialog-overlay");
  if (!overlay || !dialogOpen) return;
  dialogOpen = false;
  overlay.classList.remove("show");
  overlay.hidden = true;
  const cb = dialogOnClose;
  dialogOnClose = null;
  if (cb) cb();
  // Следующее сообщение из очереди
  if (!dialogOpen && dialogQueue.length) {
    const [text, opts] = dialogQueue.shift();
    showDialog(text, opts);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && dialogOpen) closeDialog();
});

document.addEventListener("click", (e) => {
  // тап по затемнению или по крестику
  if (!dialogOpen) return;
  if (e.target.id === "dialog-overlay" || e.target.id === "dialog-x") closeDialog();
});
