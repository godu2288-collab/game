// inventory.js — инвентарь как UI: слоты экипировки + сетка предметов.
// Предметы можно перетаскивать (мышью и пальцем) или нажимать для подробностей.
// Перетащить из сетки в слот — надеть. Из слота обратно в сетку — снять.

const ITEM_ICONS = {
  fists: "✊", rusty_obrez: "🔫", iron_pipe: "🔧",
  rag_jacket: "🧥", hide_vest: "🦺",
  medkit: "💊", dried_fish: "🐟", vaccine: "💉",
  candle_ash: "🕯️", diary_baykal: "📓", baikal_ice: "🧊",
  collar_ash_1: "⛓️", collar_ash_2: "⛓️", alpha_hide: "🐺", dog_fang: "🦷",
  gear_artifact: "⚙️",
  bear_track: "🐾", hunter_diary: "📔", key_irk: "🗝️",
  rags: "🧵", rat_tail: "🐀", bone: "🦴", hide: "🟫", feather: "🪶", rope: "🪢",
};
const TYPE_ICONS = { weapon: "🔫", armor: "🦺", artifact: "💎", consumable: "🧪", quest: "📜", loot: "📦" };
const TYPE_LABELS = {
  weapon: "Оружие", armor: "Броня", artifact: "Артефакт",
  consumable: "Расходник", quest: "Квестовый предмет", loot: "Добыча",
};
const TYPE_ORDER = ["weapon", "armor", "artifact", "consumable", "quest", "loot"];
const MIN_GRID_CELLS = 12;

function itemIcon(id) {
  const it = ITEMS[id];
  return ITEM_ICONS[id] || (it && TYPE_ICONS[it.type]) || "❔";
}

function openInventory() {
  renderInventory();
  showScreen("inventory");
}

function invHint(text) {
  const el = document.getElementById("inv-hint");
  if (el) el.textContent = text;
}

function cellHtml(id, qty, from) {
  const it = ITEMS[id];
  const drag = slotOf(id) ? " draggable" : "";
  return `<div class="item-cell${drag}" data-item="${id}" data-from="${from}">
    <div class="ic">${itemIcon(id)}</div>
    ${qty > 1 ? `<div class="qty">×${qty}</div>` : ""}
    <div class="nm">${it.name}</div>
  </div>`;
}

function renderInventory() {
  const p = getPlayer();
  if (!p) return;

  // --- слоты экипировки ---
  const slotsEl = document.getElementById("eq-slots");
  slotsEl.innerHTML = Object.entries(EQUIP_SLOTS).map(([slot, def]) => {
    const cur = p.equip[slot];
    let inner;
    if (!cur) {
      inner = `<div class="item-cell empty"><div class="ic ghost">${def.icon}</div><div class="nm">пусто</div></div>`;
    } else if (cur === "fists") {
      inner = `<div class="item-cell"><div class="ic">${itemIcon(cur)}</div><div class="nm">${ITEMS[cur].name}</div></div>`;
    } else {
      inner = cellHtml(cur, 1, slot);
    }
    return `<div class="eq-slot" data-slot="${slot}"><div class="eq-label">${def.title}</div>${inner}</div>`;
  }).join("");

  // --- сводка по характеристикам ---
  const b = equipBonus(p);
  document.getElementById("eq-stats").textContent =
    `🔫 Урон оружия ${ITEMS[p.weapon].damage}   🛡 Защита ${p.defense + b.defense}   🧠 Воля ${p.will + b.will}`;

  // --- сетка предметов ---
  const entries = Object.entries(getInventory()).filter(([id]) => ITEMS[id]);
  entries.sort((a, b2) => TYPE_ORDER.indexOf(ITEMS[a[0]].type) - TYPE_ORDER.indexOf(ITEMS[b2[0]].type));
  const cells = entries.map(([id, qty]) => cellHtml(id, qty, "inv"));
  const total = Math.max(MIN_GRID_CELLS, Math.ceil(cells.length / 4) * 4);
  while (cells.length < total) cells.push(`<div class="item-cell empty"></div>`);
  document.getElementById("inventory-grid").innerHTML = cells.join("");

  if (!document.getElementById("inv-hint").textContent) {
    invHint("Перетащи предмет в слот или нажми на него");
  }
}

// ---------- ДЕЙСТВИЯ ----------
function doEquip(id) {
  const err = equipItem(id);
  invHint(err || `Надето: ${ITEMS[id].name}`);
  renderInventory();
  renderMenu();
}

function doUnequip(slot) {
  const name = ITEMS[getPlayer().equip[slot]]?.name;
  const err = unequipSlot(slot);
  invHint(err || `Снято: ${name}`);
  renderInventory();
  renderMenu();
}

function showItemDialog(id, from) {
  const it = ITEMS[id];
  const qty = STATE.inventory[id] || 0;
  const lines = [TYPE_LABELS[it.type] || "Предмет"];
  if (it.desc) lines.push(it.desc);
  else if (it.type === "weapon") lines.push(`Урон: ${it.damage}`);
  if (it.type === "artifact" && !it.bonus) lines.push("Эффект пока не действует в бою.");
  if (from === "inv" && qty > 1) lines.push(`В инвентаре: ×${qty}`);

  const buttons = [];
  if (from !== "inv") {
    buttons.push({ text: "Снять", primary: true, onClick: () => doUnequip(from) });
  } else if (slotOf(id)) {
    buttons.push({ text: "Надеть", primary: true, onClick: () => doEquip(id) });
  } else if (it.type === "consumable") {
    buttons.push({ text: "Использовать", primary: true, onClick: () => useConsumable(id) });
  }
  showDialog(lines.join("\n"), { title: `${itemIcon(id)} ${it.name}`, buttons });
}

// ---------- ПЕРЕТАСКИВАНИЕ ----------
let drag = null;
const DRAG_THRESHOLD = 8;

function initInventoryDnD() {
  const root = document.getElementById("screen-inventory");
  if (!root) return;
  root.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const cell = e.target.closest && e.target.closest(".item-cell[data-item]");
    if (!cell || drag) return;
    drag = {
      id: cell.dataset.item,
      from: cell.dataset.from,
      cell,
      canDrag: !!slotOf(cell.dataset.item),
      pid: e.pointerId,
      sx: e.clientX, sy: e.clientY,
      active: false, ghost: null,
    };
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", onDragCancel);
  });
}

function onDragMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > DRAG_THRESHOLD;
  if (!drag.active && moved) {
    drag.moved = true;
    if (!drag.canDrag) return;
    startDrag();
  }
  if (!drag.active) return;
  drag.ghost.style.transform = `translate(${e.clientX - 32}px, ${e.clientY - 32}px)`;

  // подсветка слота под пальцем
  const t = document.elementFromPoint(e.clientX, e.clientY);
  const over = t && t.closest(".eq-slot, .inv-zone");
  document.querySelectorAll(".eq-slot.hover, .inv-zone.hover").forEach(el => el.classList.remove("hover"));
  if (over && over.classList.contains("can-drop")) over.classList.add("hover");
}

function startDrag() {
  drag.active = true;
  const ghost = document.createElement("div");
  ghost.className = "drag-ghost";
  ghost.textContent = itemIcon(drag.id);
  document.body.appendChild(ghost);
  drag.ghost = ghost;
  drag.cell.classList.add("dragging");

  if (drag.from === "inv") {
    const slot = slotOf(drag.id);
    document.querySelectorAll(".eq-slot").forEach(el => {
      if (el.dataset.slot === slot) el.classList.add("can-drop");
    });
    invHint(`Перетащи в слот «${EQUIP_SLOTS[slot].title}»`);
  } else {
    document.querySelector(".inv-zone").classList.add("can-drop");
    invHint("Перетащи в сетку, чтобы снять");
  }
}

function endDragVisuals() {
  if (drag && drag.ghost) drag.ghost.remove();
  if (drag) drag.cell.classList.remove("dragging");
  document.querySelectorAll(".can-drop, .hover").forEach(el => el.classList.remove("can-drop", "hover"));
  document.removeEventListener("pointermove", onDragMove);
  document.removeEventListener("pointerup", onDragEnd);
  document.removeEventListener("pointercancel", onDragCancel);
}

function onDragEnd(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag;
  const t = document.elementFromPoint(e.clientX, e.clientY);
  endDragVisuals();
  drag = null;

  if (!d.active) {
    // обычный тап (без сдвига) — подробности предмета
    if (!d.moved) showItemDialog(d.id, d.from);
    return;
  }

  const slotEl = t && t.closest(".eq-slot");
  if (d.from === "inv") {
    if (slotEl && slotEl.dataset.slot === slotOf(d.id)) doEquip(d.id);
    else if (slotEl) invHint(`Сюда нельзя: «${ITEMS[d.id].name}» надевается в слот «${EQUIP_SLOTS[slotOf(d.id)].title}»`);
    else invHint("Перетащи предмет в слот или нажми на него");
  } else {
    if (t && t.closest(".inv-zone")) doUnequip(d.from);
    else invHint("Перетащи предмет в слот или нажми на него");
  }
}

function onDragCancel(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  endDragVisuals();
  drag = null;
}

initInventoryDnD();
