// ui.js

// --- ИКОНКИ МОБОВ ---
function getMobIcon(mobId) {
  const icons = {
    rat: "🐀", dog: "🐕", crow: "🐦",
    ash_dog: "🐺", garden_guard: "🚜", bellringer: "🕯️", grey_leader: "🩸"
  };
  return icons[mobId] || "👹";
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById("screen-" + name);
  if (el) el.classList.add("active");
  window.scrollTo(0, 0);
}

// Старое имя оставлено: все toast("...") теперь открывают диалоговое окно (см. dialog.js)
function toast(msg, ms) {
  showDialog(msg);
}

// ---------- ИСТОРИЯ ----------
function renderStory() {
  const textEl = document.getElementById("story-text");
  const navEl = document.getElementById("story-nav");
  if (!textEl || !navEl) return;
  
  if (typeof STATE.storyPage === "undefined") STATE.storyPage = 0;
  
  textEl.textContent = STORY_PAGES[STATE.storyPage];
  if (STATE.storyPage < STORY_PAGES.length - 1) {
    navEl.innerHTML = `<button class="primary" onclick="nextStory()">Далее ▶️</button>`;
  } else {
    navEl.innerHTML = `<button class="primary" onclick="showScreen('create-name')">✨ Создать героя</button>`;
  }
}

function nextStory() {
  if (typeof STATE.storyPage === "undefined") STATE.storyPage = 0;
  STATE.storyPage += 1;
  renderStory();
}

// ---------- СОЗДАНИЕ ГЕРОЯ ----------
function submitName() {
  const val = document.getElementById("create-name-input").value.trim();
  const err = document.getElementById("create-name-error");
  err.textContent = "";
  if (val.length < 2 || val.length > 16) {
    err.textContent = "Имя должно быть от 2 до 16 символов";
    return;
  }
  STATE.pendingName = val;
  document.getElementById("create-class-title").textContent = `Отлично, ${val}! Выбери своё ремесло:`;
  renderClassList();
  showScreen("create-class");
}

function renderClassList() {
  const box = document.getElementById("class-list");
  box.innerHTML = Object.entries(CLASSES).map(([key, c]) => `
    <div class="class-card" onclick="pickClass('${key}')">
      <div class="title">${c.title}</div>
      <div class="line">▫️ ${c.passive}</div>
      <div class="line">▫️ ${c.active}</div>
      <div class="stats-line">
        ❤️${c.stats.max_hp} ⚔️${c.stats.attack} 🛡${c.stats.defense}
        🧠${c.stats.will} 💨${c.stats.agility}
      </div>
    </div>`).join("");
}

function pickClass(key) {
  createPlayer(STATE.pendingName || "Герой", key);
  const intro = CLASSES[key].intro || "Ты приходишь в себя на разбитом хуторе.";
  renderMenu();
  showScreen("menu");
  showDialog(intro, { title: `${STATE.pendingName || "Герой"}, ${CLASSES[key].title}` });
}

// ---------- МЕНЮ И ЛОКАЦИИ ----------
function renderMenu() {
  const p = getPlayer();
  if (!p) return;
  document.getElementById("hero-name").textContent = p.name;
  document.getElementById("hero-class").textContent = CLASSES[p.class].title;
  document.getElementById("stat-hp").textContent = `❤️ ${p.hp}/${p.max_hp}`;
  document.getElementById("stat-energy").textContent = `⚡ ${p.energy}/${MAX_ENERGY}`;
  document.getElementById("stat-gears").textContent = `⚙️ ${p.gears}`;

  const shopBtn = document.getElementById("menu-shop-btn");
  if (shopBtn) shopBtn.style.display = STATE.flags.shop_open ? "block" : "none";

  const locName = document.getElementById("loc-name");
  const locDesc = document.getElementById("loc-desc");
  if (STATE.flags.zone_blockpost) {
    locName.textContent = "🩸 Бетонный блокпост";
    locDesc.textContent = "Здесь пахнет кровью и железом. Осторожно, Главарь.";
  } else if (STATE.flags.zone_church) {
    locName.textContent = "⛪ Церковь Пепла";
    locDesc.textContent = "Здесь пахнет воском и ржавчиной. Слышен звон.";
  } else if (STATE.flags.zone_ogorody) {
    locName.textContent = "🌾 Мёртвые огороды";
    locDesc.textContent = "Здесь пахнет гнилой картошкой и железом. Осторожно, вороны.";
  } else {
    locName.textContent = "🏚️ Разбитый хутор";
    locDesc.textContent = "Пыль, руины и запах гари. Здесь пока безопасно.";
  }

  const banner = document.getElementById("sleep-banner");
  if (p.sleep_end) {
    const left = Math.max(1, Math.ceil((p.sleep_end - nowSec()) / 60));
    banner.style.display = "block";
    banner.textContent = `😴 Ты спишь. До пробуждения ≈ ${left} мин.`;
  } else {
    banner.style.display = "none";
  }
}

// ---------- ОХОТА ----------
function openHunt() {
  const p = getPlayer();
  if (p.sleep_end) { toast("Ты спишь. Сначала проснись."); return; }
  if (STATE.fight) { toast("Ты уже в бою!"); return; }
  if (p.energy < HUNT_ENERGY) { toast("Не хватает энергии ⚡. Поспи или подожди."); return; }

  const box = document.getElementById("hunt-list");
  const entries = Object.entries(LOCATIONS).filter(([lid, loc]) =>
    !loc.unlock_flag || STATE.flags[loc.unlock_flag]);
  
  box.innerHTML = entries.map(([lid, loc]) => {
    const mobIds = Object.keys(loc.mobs);
    const mobNames = mobIds.map(id => MOBS[id].name).join(", ");
    return `
      <div class="hunt-card" onclick="startHunt('${lid}')">
        <div class="h-icon">📍</div>
        <div class="h-info">
          <div class="h-name">${loc.name}</div>
          <div class="h-desc">Враги: ${mobNames}</div>
        </div>
      </div>
    `;
  }).join("");
  
  showScreen("hunt");
}

function startHunt(lid) {
  const loc = LOCATIONS[lid];
  const mobIds = Object.keys(loc.mobs);
  const weights = Object.values(loc.mobs);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  let mobId = mobIds[0];
  for (let i = 0; i < mobIds.length; i++) {
    r -= weights[i];
    if (r <= 0) { mobId = mobIds[i]; break; }
  }
  spendEnergy(HUNT_ENERGY);
  startFight(mobId, `Из укрытия выскакивает ${MOBS[mobId].name}!`);
}

// ---------- БОЙ ----------
function startFight(mobId, intro, onWin = null, free = false) {
  const p = getPlayer();
  const f = newFight(p, mobId, !!STATE.flags.pet_dog, onWin, free);
  f.log = [intro];
  STATE.fight = f;
  save();
  renderMenu();
  renderFight();
  showScreen("fight");
}

function renderFight() {
  const f = STATE.fight;
  if (!f) return;
  const p = getPlayer();
  const mob = MOBS[f.mob_id];
  
  document.getElementById("mob-icon").textContent = getMobIcon(f.mob_id);
  document.getElementById("fight-mob").textContent = `⚔️ Бой: ${mob.name}`;
  
  const mobPct = Math.max(0, f.mob_hp / mob.hp * 100);
  const heroPct = Math.max(0, f.hp / p.max_hp * 100);
  document.getElementById("mob-hp-text").textContent = `${Math.max(f.mob_hp, 0)}/${mob.hp}`;
  document.getElementById("hero-hp-text").textContent = `${Math.max(f.hp, 0)}/${p.max_hp}`;
  document.getElementById("mob-hp-bar").style.width = mobPct + "%";
  document.getElementById("hero-hp-bar").style.width = heroPct + "%";
  const logEl = document.getElementById("fight-log");
  logEl.textContent = f.log.join("\n");
  logEl.scrollTop = logEl.scrollHeight;

  const buff = CLASSES[p.class].buff;
  let buffText = `🎭 ${buff.name}`;
  if (f.buff_used || p.buff_cd > 0) {
    buffText += p.buff_cd > 0 ? ` (${p.buff_cd})` : " (исп.)";
  }
  const medkits = STATE.inventory.medkit || 0;
  document.getElementById("fight-actions").innerHTML = `
    <button onclick="fightAction('attack')">🔫 Атака</button>
    <button onclick="fightAction('buff')">${buffText}</button>
    <button onclick="fightAction('medkit')">🧪 Аптечка ×${medkits}</button>
    <button onclick="fightAction('flee')">🏃 Бежать</button>`;
}

function fightAction(action) {
  const f = STATE.fight;
  const p = getPlayer();
  if (!f) return;
  p.hp = f.hp;
  const log = [];

  if (action === "attack") {
    playerAttack(p, f, log);
  } else if (action === "buff") {
    if (f.buff_used || p.buff_cd > 0) { toast("Активка ещё не готова."); return; }
    useBuff(p, f, log);
  } else if (action === "medkit") {
    if (!takeItem("medkit")) { toast("Аптечек нет."); return; }
    healMedkit(p, f, log);
  } else if (action === "flee") {
    if (Math.random() < 0.5) {
      finishFight("flee", ["Ты бросаешься наутёк..."]);
      return;
    }
    log.push("🏃 Сбежать не удалось!");
  }

  if (f.mob_hp <= 0) { finishFight("win", log); return; }

  enemyTurn(p, f, log);

  if (f.mob_hp <= 0) finishFight("win", log);
  else if (f.hp <= 0) finishFight("lose", log);
  else {
    f.log.push(...log);
    save();
    renderMenu();
    renderFight();
  }
}

function finishFight(result, log) {
  const f = STATE.fight;
  const p = getPlayer();
  const mob = MOBS[f.mob_id];
  p.buff_cd = Math.max(0, p.buff_cd - 1);
  if (f.buff_used) p.buff_cd = CLASSES[p.class].buff.cd + 1;

  if (result === "win") {
    const gears = randInt(mob.gears[0], mob.gears[1]);
    p.gears += gears;
    let exp = p.exp + mob.exp;
    let level = p.level;
    let maxHp = p.max_hp;
    log.push(`🏆 ${mob.name} повержен!`);
    log.push(`+${gears} ⚙️, +${mob.exp} опыта`);
    for (const entry of mob.loot) {
      const [item, chance, needQ] = entry;
      if (needQ && (!STATE.quests[needQ] || STATE.quests[needQ].status !== "active")) continue;
      if (Math.random() < chance) {
        addItem(item, 1);
        log.push(`🎒 Добыча: ${ITEMS[item].name}`);
      }
    }
    while (exp >= expNeeded(level)) {
      exp -= expNeeded(level);
      level += 1;
      maxHp += 8;
      p.hp = maxHp;
      log.push(`⭐ Новый уровень: ${level}! Макс. HP +8`);
    }
    p.exp = exp; p.level = level; p.max_hp = maxHp;
    for (const [flag, value] of Object.entries(f.on_win || {})) {
      setFlag(flag, value);
    }
    for (const [qid, q] of Object.entries(QUESTS)) {
      if (!STATE.quests[qid] || STATE.quests[qid].status !== "active") continue;
      for (const o of q.objectives) {
        if (o.type === "kill" && o.mob === f.mob_id) {
          const cur = incFlag(`${qid}:kill:${o.mob}`);
          log.push(`📜 ${q.title}: ${Math.min(cur, o.count)}/${o.count}`);
        }
      }
    }
    p.hp = Math.max(f.hp, 1);
    p.hp_ts = nowSec();
  } else if (result === "lose") {
    p.hp = Math.max(1, Math.round(p.max_hp * 0.3));
    p.hp_ts = nowSec();
    log.push("💀 Ты теряешь сознание... Очнулся на хуторе, едва живой.");
  } else {
    p.hp = Math.max(f.hp, 1);
    p.hp_ts = nowSec();
    log.push("🏃 Ты удрал от врага.");
  }

  STATE.fight = null;
  save();
  renderMenu();

  const text = log.join("\n");
  const box = document.getElementById("fight-log");
  if (box) box.textContent = text;
  const titles = { win: "🏆 Победа", lose: "💀 Поражение", flee: "🏃 Бегство" };
  setTimeout(() => {
    showScreen("menu");
    showDialog(text, { title: titles[result] });
  }, 800);
}

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// ---------- ИНВЕНТАРЬ: см. inventory.js ----------

function useConsumable(itemId) {
  const p = getPlayer();
  const it = ITEMS[itemId];
  if (!it || it.type !== "consumable") return;
  if (STATE.fight) { toast("В бою используй кнопки боя."); return; }
  if ("heal_pct" in it) {
    if (p.hp >= p.max_hp) { toast("HP уже полное."); return; }
    const heal = Math.round(p.max_hp * it.heal_pct / 100);
    p.hp = Math.min(p.max_hp, p.hp + heal);
    p.hp_ts = nowSec();
  }
  if ("energy" in it) {
    if (p.energy >= MAX_ENERGY) { toast("Энергия уже полная."); return; }
    p.energy = Math.min(MAX_ENERGY, p.energy + it.energy);
    p.energy_ts = nowSec();
  }
  if (!takeItem(itemId)) { toast("Предмета нет."); return; }
  save();
  toast(`Использовано: ${it.name}`);
  renderMenu();
  openInventory();
}

// ---------- ПРОФИЛЬ ----------
function openProfile() {
  const p = getPlayer();
  const b = equipBonus(p);
  const inv = getInventory();
  const invText = Object.entries(inv).map(([i, q]) => `• ${ITEMS[i].name} ×${q}`).join("<br>") || "пусто";
  document.getElementById("profile-body").innerHTML = `
    <div class="row"><span>Имя</span><span>${p.name}</span></div>
    <div class="row"><span>Класс</span><span>${CLASSES[p.class].title}</span></div>
    <div class="row"><span>Уровень</span><span>${p.level} (${p.exp}/${expNeeded(p.level)})</span></div>
    <div class="row"><span>❤️ HP</span><span>${p.hp}/${p.max_hp}</span></div>
    <div class="row"><span>⚡ Энергия</span><span>${p.energy}/${MAX_ENERGY}</span></div>
    <div class="row"><span>⚙️ Шестерёнки</span><span>${p.gears}</span></div>
    <div class="row"><span>🔫 Оружие</span><span>${ITEMS[p.equip.weapon].name}</span></div>
    <div class="row"><span>🦺 Броня</span><span>${p.equip.armor ? ITEMS[p.equip.armor].name : "—"}</span></div>
    <div class="row"><span>💎 Артефакт</span><span>${p.equip.artifact ? ITEMS[p.equip.artifact].name : "—"}</span></div>
    <div class="row"><span>🛡 Защита</span><span>${p.defense + b.defense}${b.defense ? ` (+${b.defense})` : ""}</span></div>
    <div class="row"><span>🧠 Воля</span><span>${p.will + b.will}${b.will ? ` (+${b.will})` : ""}</span></div>
    <div class="row"><span>⚔️ Атака</span><span>${p.attack}</span></div>
    <div class="row"><span>💨 Ловкость</span><span>${p.agility}</span></div>
    <div class="row" style="display:block"><span>🎒 Инвентарь:</span><br>${invText}</div>`;
  showScreen("profile");
}

// ---------- КВЕСТЫ ----------
function objectiveStatus(qid, o) {
  if (o.type === "kill") {
    return [STATE.flags[`${qid}:kill:${o.mob}`] || 0, o.count];
  } else if (o.type === "item") {
    return [STATE.inventory[o.item] || 0, o.count];
  } else {
    return [STATE.flags[o.key] ? 1 : 0, 1];
  }
}

function questComplete(qid, q) {
  return q.objectives.every(o => {
    const [cur, need] = objectiveStatus(qid, o);
    return cur >= need;
  });
}

function goalsText(qid, q, progress = true) {
  return q.objectives.map(o => {
    const [cur, need] = objectiveStatus(qid, o);
    if (progress) {
      const mark = cur >= need ? "✅" : "⬜";
      const extra = need > 1 ? `: ${cur}/${need}` : "";
      return `${mark} ${o.text}${extra}`;
    }
    return `▫️ ${o.text}`;
  }).join("\n");
}

function openQuests() {
  const p = getPlayer();
  const box = document.getElementById("quests-list");
  const items = [];
  const done = [];

  for (const [qid, q] of Object.entries(QUESTS)) {
    if (!q.classes.includes(p.class)) continue;
    const st = STATE.quests[qid];
    if (st && st.status === "done") { done.push(q.title); continue; }
    if (q.requires && (!STATE.quests[q.requires] || STATE.quests[q.requires].status !== "done")) continue;

    if (!st) {
      if (p.level < q.min_level) {
        items.push(`<div class="card">🔒 ${q.title} — нужен ${q.min_level} уровень</div>`);
        continue;
      }
      items.push(`<div class="card">
        <strong>❗ ${q.title}</strong>
        <div style="margin:8px 0;white-space:pre-line">${q.text}</div>
        <div style="white-space:pre-line;color:#b0b5bd">${goalsText(qid, q, false)}</div>
        <div style="margin-top:8px;color:#8a8f98">Награда: ${q.reward_text}</div>
        <button style="margin-top:8px" onclick="acceptQuest('${qid}')">Принять</button>
      </div>`);
    } else {
      const complete = questComplete(qid, q);
      let buttons = "";
      if (complete) {
        buttons = `<button style="margin-top:8px" onclick="turnQuest('${qid}')">Сдать: ${q.title}</button>`;
      } else if (q.action) {
        buttons = `<button style="margin-top:8px" onclick="questAction('${qid}')">${q.action.button}</button>`;
      }
      items.push(`<div class="card">
        <strong>🔸 ${q.title}</strong>
        <div style="margin:8px 0;white-space:pre-line">${goalsText(qid, q, true)}</div>
        ${buttons}
      </div>`);
    }
  }
  if (done.length) items.push(`<div class="card">✅ Выполнено: ${done.join(", ")}</div>`);
  box.innerHTML = items.join("") || `<div class="card">Новых заданий пока нет.</div>`;
  showScreen("quests");
}

function acceptQuest(qid) {
  const q = QUESTS[qid];
  const p = getPlayer();
  if (STATE.quests[qid]) { toast("Квест уже взят"); return; }
  setQuest(qid, "active", 0);
  let msg = `Квест принят: ${q.title}`;
  const on = q.on_accept || {};
  if (on.weapon && p.equip.weapon === "fists") {
    p.equip.weapon = on.weapon;
    p.weapon = on.weapon;
    msg += `\nТы получил: ${ITEMS[on.weapon].name}`;
  }
  for (const [item, qty] of Object.entries(on.items || {})) {
    addItem(item, qty);
    msg += `\nТы получил: ${ITEMS[item].name}`;
  }
  save();
  toast(msg, 3000);
  openQuests();
  renderMenu();
}

function turnQuest(qid) {
  const q = QUESTS[qid];
  const st = STATE.quests[qid];
  if (!st || st.status !== "active" || !questComplete(qid, q)) {
    toast("Квест ещё не выполнен");
    return;
  }
  for (const o of q.objectives) {
    if (o.type === "item" && o.consume) takeItem(o.item, o.count);
  }
  const rw = q.reward;
  if (rw.gears) STATE.player.gears += rw.gears;
  for (const [item, qty] of Object.entries(rw.items || {})) addItem(item, qty);
  for (const [flag, value] of Object.entries(rw.flags || {})) setFlag(flag, value);
  setQuest(qid, "done", 0);
  let text = `✅ Квест выполнен: ${q.title}\nНаграда: ${q.reward_text}`;
  if (q.done_text) text += `\n\n📖 ${q.done_text}`;
  showDialog(text, { title: "📜 Квест" });
  openQuests();
  renderMenu();
}

function questAction(qid) {
  const q = QUESTS[qid];
  const act = q.action;
  if (!act || !STATE.quests[qid] || STATE.quests[qid].status !== "active") return;
  if (STATE.fight) { toast("Ты уже в бою!"); return; }
  if (act.scene) {
    openScene(act.scene);
  } else if (act.fight) {
    startFight(act.fight.mob, act.intro || "Враг нападает!", act.fight.on_win, true);
  }
}

// ---------- СЦЕНЫ ----------
function openScene(sceneId) {
  const sc = SCENES[sceneId];
  if (!sc) return;
  STATE.scene = sceneId;
  save();
  document.getElementById("scene-text").textContent = sc.text;
  document.getElementById("scene-choices").innerHTML = sc.choices.map((ch, i) => `
    <button onclick="sceneChoice('${sceneId}', ${i})">${ch.text}</button>
  `).join("");
  showScreen("scene");
}

function sceneChoice(sceneId, idx) {
  const sc = SCENES[sceneId];
  const ch = sc.choices[idx];
  if (ch.need_item && !(STATE.inventory[ch.need_item] > 0)) {
    toast(`Нужно: ${ITEMS[ch.need_item].name}`);
    return;
  }
  const eff = ch.effects || {};
  if (eff.fight) {
    STATE.scene = null;
    save();
    startFight(eff.fight.mob, "Ты поднимаешь обрез...", eff.fight.on_win, true);
    return;
  }
  for (const [item, qty] of Object.entries(eff.take || {})) takeItem(item, qty);
  for (const [item, qty] of Object.entries(eff.give || {})) addItem(item, qty);
  if (eff.gears) STATE.player.gears += eff.gears;
  for (const [flag, value] of Object.entries(eff.flags || {})) setFlag(flag, value);
  save();
  if (ch.next) {
    openScene(ch.next);
  } else {
    STATE.scene = null;
    save();
    openQuests();
  }
  renderMenu();
}

// ---------- СОН ----------
function openSleep() {
  const p = getPlayer();
  if (STATE.fight) { toast("Сейчас не до сна — ты в бою!"); return; }
  if (p.sleep_end) {
    const left = Math.max(1, Math.ceil((p.sleep_end - nowSec()) / 60));
    document.getElementById("sleep-body").innerHTML = `😴 Ты спишь. До пробуждения ≈ ${left} мин.`;
    document.getElementById("sleep-actions").innerHTML =
      `<button onclick="doWake()">⏰ Проснуться сейчас</button>`;
  } else {
    const bed = bedFor(STATE.inventory);
    document.getElementById("sleep-body").innerHTML =
      `🛏 Спим на: ${bed.name}<br>+${bed.energy}⚡ каждые 15 мин` +
      (bed.hp_pct ? `, +${bed.hp_pct}% HP за сон` : "") +
      `<br><br>На сколько ляжешь?`;
    document.getElementById("sleep-actions").innerHTML = SLEEP_DURATIONS.map(m =>
      `<button onclick="doSleep(${m})">${m} мин</button>`).join("");
  }
  showScreen("sleep");
}

function doSleep(minutes) {
  const p = getPlayer();
  if (STATE.fight) { toast("Нельзя уснуть в бою."); return; }
  if (p.sleep_end) { toast("Ты уже спишь."); return; }
  if (p.energy >= MAX_ENERGY && p.hp >= p.max_hp) { toast("Ты и так полон сил."); return; }
  const bed = bedFor(STATE.inventory);
  const now = nowSec();
  p.sleep_start = now;
  p.sleep_end = now + minutes * 60;
  p.sleep_rate = bed.energy;
  p.sleep_hp_pct = bed.hp_pct;
  save();
  toast(`😴 Спишь ${minutes} мин.`);
  openSleep();
  renderMenu();
  setTimeout(() => {
    if (STATE.player && STATE.player.sleep_end && nowSec() >= STATE.player.sleep_end) {
      const text = wakePlayer(false);
      if (text) { toast(text, 4000); renderMenu(); }
    }
  }, minutes * 60 * 1000);
}

function doWake() {
  const text = wakePlayer(true);
  if (!text) { toast("Ты не спишь."); return; }
  toast(text, 3000);
  renderMenu();
  showScreen("menu");
}

// ---------- МАГАЗИН ----------
function openShop() {
  if (!STATE.flags.shop_open) { toast("Магазин ещё закрыт."); return; }
  const p = getPlayer();
  document.getElementById("shop-gears").textContent = `⚙️ У тебя: ${p.gears}`;
  const box = document.getElementById("shop-list");
  box.innerHTML = SHOP.map(tab => `
    <div class="card">
      <strong>${tab.title}</strong>
      ${tab.items.map(it => `
        <div class="row">
          <span>${ITEMS[it.id].name}<br><small style="color:#8a8f98">${ITEMS[it.id].desc || ""}</small></span>
          <button onclick="doBuy('${it.id}')">${it.price} ⚙️</button>
        </div>`).join("")}
    </div>`).join("");
  showScreen("shop");
}

function doBuy(itemId) {
  const err = buyItem(itemId, 1);
  if (err) { toast(err); return; }
  toast("Куплено");
  openShop();
  renderMenu();
}

// ---------- СБРОС ----------
function resetGame() {
  if (confirm("Ты уверен, что хочешь удалить героя и начать заново?")) {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}
// ---------- ИЛЛЮСТРАЦИИ ЛОКАЦИЙ ----------
const LOC_ART = {
  khutor:    { img: "assets/art-khutor.jpg",    cap: "Разбитый хутор · 2087" },
  ogorody:   { img: "assets/art-ogorody.jpg",   cap: "Мёртвые огороды" },
  church:    { img: "assets/art-church.jpg",    cap: "Церковь Пепла" },
  blockpost: { img: "assets/art-blockpost.jpg", cap: "Бетонный блокпост" },
};

function updateLocationArt() {
  const a = LOC_ART[getCurrentLocationId()] || LOC_ART.khutor;
  const img = document.getElementById("loc-art");
  const cap = document.getElementById("loc-art-caption");
  if (img && img.getAttribute("src") !== a.img) img.src = a.img;
  if (cap) cap.textContent = a.cap;
}