// state.js — localStorage вместо SQLite + реген

const SAVE_KEY = "baykal_game_state";

let STATE = {
  player: null,
  inventory: {},
  quests: {},
  flags: {},
  fight: null,
  scene: null,
  storyPage: 0,
  pendingName: ""
};

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(STATE));
}

function load() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    try { 
      const parsed = JSON.parse(raw); 
      // Сохраняем методы и дефолтные значения, если сейв старый
      STATE = Object.assign(STATE, parsed);
    } catch (e) { 
      console.error("bad save", e); 
    }
  }
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function regen(p) {
  const now = nowSec();
  if (!p.sleep_end) {
    if (p.energy >= MAX_ENERGY) {
      p.energy_ts = now;
    } else {
      const ticks = Math.floor((now - p.energy_ts) / 360);
      if (ticks > 0) {
        const newEnergy = Math.min(MAX_ENERGY, p.energy + ticks);
        p.energy = newEnergy;
        p.energy_ts = newEnergy >= MAX_ENERGY ? now : p.energy_ts + ticks * 360;
      }
    }
  }
  if (PASSIVE_HP_REGEN) {
    if (p.hp >= p.max_hp) {
      p.hp_ts = now;
    } else {
      const ticks = Math.floor((now - p.hp_ts) / 60);
      if (ticks > 0) {
        const heal = Math.max(1, Math.floor(p.max_hp * 2 / 100)) * ticks;
        const newHp = Math.min(p.max_hp, p.hp + heal);
        p.hp = newHp;
        p.hp_ts = newHp >= p.max_hp ? now : p.hp_ts + ticks * 60;
      }
    }
  }
}

function getPlayer() {
  if (STATE.player) {
    ensureEquip(STATE.player);
    regen(STATE.player);
  }
  return STATE.player;
}

function createPlayer(name, cls) {
  const stats = CLASSES[cls].stats;
  const now = nowSec();
  STATE.player = {
    user_id: 1,
    name: name,
    class: cls,
    level: 1,
    exp: 0,
    hp: stats.max_hp,
    max_hp: stats.max_hp,
    attack: stats.attack,
    defense: stats.defense,
    will: stats.will,
    agility: stats.agility,
    gears: 0,
    energy: 100,
    energy_ts: now,
    hp_ts: now,
    weapon: "fists",
    equip: { weapon: "fists", armor: null, artifact: null },
    buff_cd: 0,
    sleep_start: 0,
    sleep_end: 0,
    sleep_rate: 0,
    sleep_hp_pct: 0,
  };
  STATE.inventory = {};
  STATE.quests = {};
  STATE.flags = {};
  STATE.fight = null;
  STATE.scene = null;
  save();
}

function addItem(itemId, qty = 1) {
  STATE.inventory[itemId] = (STATE.inventory[itemId] || 0) + qty;
  save();
}

function takeItem(itemId, qty = 1) {
  const have = STATE.inventory[itemId] || 0;
  if (have < qty) return false;
  if (have === qty) delete STATE.inventory[itemId];
  else STATE.inventory[itemId] = have - qty;
  save();
  return true;
}

function getInventory() {
  return { ...STATE.inventory };
}

function setQuest(qid, status, progress = 0) {
  STATE.quests[qid] = { status: status, progress: progress };
  save();
}

function incFlag(flag, n = 1) {
  STATE.flags[flag] = (STATE.flags[flag] || 0) + n;
  save();
  return STATE.flags[flag];
}

function setFlag(flag, value = 1) {
  STATE.flags[flag] = value;
  save();
}

function getFlags() {
  return { ...STATE.flags };
}

function spendEnergy(amount) {
  const p = STATE.player;
  p.energy -= amount;
  if (p.energy >= MAX_ENERGY) p.energy_ts = nowSec();
  save();
}

function bedFor(inventory) {
  let best = GROUND_BED;
  for (const itemId of Object.keys(inventory)) {
    const it = ITEMS[itemId];
    if (it.type === "sleeping_bag" &&
        it.energy >= best.energy && it.hp_pct >= best.hp_pct) {
      best = it;
    }
  }
  return best;
}

function wakePlayer(interrupted = false) {
  const p = STATE.player;
  if (!p || !p.sleep_end) return null;
  const now = nowSec();
  const total = p.sleep_end - p.sleep_start;
  const elapsed = Math.max(0, Math.min(now, p.sleep_end) - p.sleep_start);
  const energy = Math.min(MAX_ENERGY, p.energy + Math.floor(p.sleep_rate * elapsed / SLEEP_TICK));
  const hpGain = total ? Math.round(p.max_hp * p.sleep_hp_pct / 100 * elapsed / total) : 0;
  const hp = Math.min(p.max_hp, p.hp + hpGain);
  const oldEnergy = p.energy;
  const oldHp = p.hp;
  p.energy = energy;
  p.energy_ts = now;
  p.hp = hp;
  p.hp_ts = now;
  p.sleep_start = 0;
  p.sleep_end = 0;
  p.sleep_rate = 0;
  p.sleep_hp_pct = 0;
  save();
  let text = interrupted ? "⏰ Ты прервал сон раньше времени." : "☀️ Ты проснулся.";
  text += `\n+${energy - oldEnergy} ⚡`;
  if (hp > oldHp) text += `, +${hp - oldHp} ❤️`;
  return text;
}

function checkSleepOnLoad() {
  const p = STATE.player;
  if (!p) return null;
  if (p.sleep_end && nowSec() >= p.sleep_end) {
    return wakePlayer(false);
  }
  return null;
}

function buyItem(itemId, qty = 1) {
  const price = (() => {
    for (const tab of SHOP) {
      for (const it of tab.items) {
        if (it.id === itemId) return it.price;
      }
    }
    return null;
  })();
  if (price === null) return "Такого товара нет";
  if (STATE.player.gears < price * qty) return "Не хватает шестерёнок ⚙️";
  STATE.player.gears -= price * qty;
  addItem(itemId, qty);
  save();
  return null;
}

// ============ ЭКИПИРОВКА ============
const SLOT_BY_TYPE = { weapon: "weapon", armor: "armor", artifact: "artifact" };

// В какой слот надевается предмет (null — не надевается)
function slotOf(itemId) {
  const it = ITEMS[itemId];
  return it ? (SLOT_BY_TYPE[it.type] || null) : null;
}

// Миграция старых сохранений: у них есть только p.weapon
function ensureEquip(p) {
  if (!p.equip) p.equip = { weapon: p.weapon || "fists", armor: null, artifact: null };
  if (!ITEMS[p.equip.weapon]) p.equip.weapon = "fists";
  for (const slot of ["armor", "artifact"]) {
    if (p.equip[slot] && !ITEMS[p.equip[slot]]) p.equip[slot] = null;
  }
  p.weapon = p.equip.weapon; // combat.js читает p.weapon
}

// Надеть предмет из инвентаря. Возвращает текст ошибки или null.
function equipItem(itemId) {
  const p = getPlayer();
  const slot = slotOf(itemId);
  if (!slot) return "Это нельзя надеть";
  if (!(STATE.inventory[itemId] > 0)) return "Предмета нет в инвентаре";
  const old = p.equip[slot];
  takeItem(itemId);
  if (old && old !== "fists") addItem(old);
  p.equip[slot] = itemId;
  ensureEquip(p);
  save();
  return null;
}

// Снять предмет из слота обратно в инвентарь
function unequipSlot(slot) {
  const p = getPlayer();
  const cur = p.equip[slot];
  if (!cur || cur === "fists") return "Слот пуст";
  addItem(cur);
  p.equip[slot] = slot === "weapon" ? "fists" : null;
  ensureEquip(p);
  save();
  return null;
}

// Сумма бонусов от надетых предметов
function equipBonus(p) {
  const total = { defense: 0, will: 0, dmg_pct: 0, vs: {} };
  for (const slot of Object.keys(EQUIP_SLOTS)) {
    const it = ITEMS[(p.equip || {})[slot]];
    if (!it || !it.bonus) continue;
    for (const [k, v] of Object.entries(it.bonus)) {
      if (k === "vs") {
        for (const [mob, pct] of Object.entries(v)) total.vs[mob] = (total.vs[mob] || 0) + pct;
      } else {
        total[k] = (total[k] || 0) + v;
      }
    }
  }
  return total;
}

// ============ ГОСПИТАЛЬ ============
// Текущая локация — самая дальняя из открытых (как и в карточке меню)
function getCurrentLocationId() {
  const f = STATE.flags;
  if (f.zone_blockpost) return "blockpost";
  if (f.zone_church) return "church";
  if (f.zone_ogorody) return "ogorody";
  return "khutor";
}

// Сколько HP вернёт услуга и сколько она стоит
function hospitalQuote(locId, serviceId) {
  const p = STATE.player;
  const h = HOSPITALS[locId];
  const s = HOSPITAL_SERVICES.find(x => x.id === serviceId);
  if (!p || !h || !s) return { heal: 0, cost: 0 };
  const missing = p.max_hp - p.hp;
  const heal = Math.max(0, Math.min(missing, Math.round(p.max_hp * s.heal_pct / 100)));
  return { heal, cost: Math.ceil(heal * h.rate) };
}

// Оплатить лечение. Возвращает { error } или { heal, cost }
function hospitalTreat(locId, serviceId) {
  const p = getPlayer();
  const q = hospitalQuote(locId, serviceId);
  if (q.heal <= 0) return { error: "Ты и так здоров." };
  if (p.gears < q.cost) return { error: `Не хватает шестерёнок: нужно ${q.cost} ⚙️.` };
  p.gears -= q.cost;
  p.hp = Math.min(p.max_hp, p.hp + q.heal);
  p.hp_ts = nowSec();
  save();
  return q;
}
