// hospital.js — госпиталь в текущей локации. Лечение за шестерёнки ⚙️.
// Данные (названия, цены) — в data.js: HOSPITALS и HOSPITAL_SERVICES.
// Логика (цена, оплата) — в state.js: hospitalQuote / hospitalTreat.

function openHospital() {
  const p = getPlayer();
  if (STATE.fight) { showDialog("Сейчас не до госпиталя — ты в бою!"); return; }
  if (p.sleep_end) { showDialog("Ты спишь. Сначала проснись."); return; }
  renderHospital();
  showScreen("hospital");
}

function renderHospital() {
  const p = getPlayer();
  const locId = getCurrentLocationId();
  const h = HOSPITALS[locId];

  document.getElementById("hospital-title").textContent = h.name;
  document.getElementById("hospital-desc").textContent = h.desc;
  document.getElementById("hospital-status").textContent =
    `❤️ ${p.hp}/${p.max_hp}     ⚙️ ${p.gears}`;

  document.getElementById("hospital-list").innerHTML = HOSPITAL_SERVICES.map(s => {
    const q = hospitalQuote(locId, s.id);
    let label, disabled = false;
    if (q.heal <= 0) {
      label = "Не нужно";
      disabled = true;
    } else {
      label = `${q.cost} ⚙️`;
      if (p.gears < q.cost) disabled = true;
    }
    return `<div class="card row hospital-row">
      <span>${s.title}<br><small style="color:#8a8f98">${q.heal > 0 ? `+${q.heal} HP` : "HP полное"}</small></span>
      <button ${disabled ? "disabled" : ""} onclick="doTreat('${s.id}')">${label}</button>
    </div>`;
  }).join("");
}

function doTreat(serviceId) {
  const locId = getCurrentLocationId();
  const res = hospitalTreat(locId, serviceId);
  if (res.error) { showDialog(res.error, { title: "🏥 Госпиталь" }); renderHospital(); return; }
  renderHospital();
  renderMenu();
  showDialog(`Тебя подлатали.\n+${res.heal} ❤️\n−${res.cost} ⚙️`, { title: "🏥 Госпиталь" });
}
