// Порт combat.py — 1:1

function newFight(player, mobId, pet = false, onWin = null, free = false) {
  return {
    mob_id: mobId,
    mob_hp: MOBS[mobId].hp,
    hp: player.hp,
    enemy_skip: 0,
    next_mult: 1.0,
    reduce_pct: 0,
    reduce_turns: 0,
    reflect_pct: 0,
    dodge_pct: 0,
    dodge_turns: 0,
    will_turns: 0,
    buff_used: false,
    rounds: 0,
    pet: pet,
    on_win: onWin || {},
    free: free,
    log: [],
  };
}

function playerAttack(p, f, log) {
  const bonus = equipBonus(p);
  let dmg = ITEMS[p.weapon].damage + p.level * 2;
  dmg *= 1 + (bonus.dmg_pct + (bonus.vs[f.mob_id] || 0)) / 100;
  dmg *= f.next_mult;
  f.next_mult = 1.0;
  const crit = Math.random() < 0.10;
  if (crit) dmg *= 2;
  dmg = Math.max(1, Math.round(dmg));
  f.mob_hp -= dmg;
  log.push(`🔫 Ты наносишь ${dmg} урона` + (crit ? " — критический удар!" : ""));
}

function useBuff(p, f, log) {
  const buff = CLASSES[p.class].buff;
  const eff = buff.effect;
  f.buff_used = true;
  log.push(`🎭 Ты применяешь «${buff.name}»`);
  if ("heal_pct" in eff) {
    const heal = Math.round(p.max_hp * eff.heal_pct / 100);
    f.hp = Math.min(p.max_hp, f.hp + heal);
    log.push(`💚 Восстановлено ${heal} HP`);
  }
  if ("enemy_skip" in eff) f.enemy_skip += eff.enemy_skip;
  if ("next_mult" in eff) {
    f.next_mult = eff.next_mult;
    log.push("⚡ Следующий удар будет усилен");
  }
  if ("reduce" in eff) {
    f.reduce_pct = eff.reduce[0];
    f.reduce_turns = eff.reduce[1];
    log.push(`🛡 Броня +${f.reduce_pct}% на ${f.reduce_turns} хода`);
  }
  if ("reflect" in eff) f.reflect_pct = eff.reflect;
  if ("dodge" in eff) {
    f.dodge_pct = eff.dodge[0];
    f.dodge_turns = eff.dodge[1];
    log.push(`💨 Уклонение +${f.dodge_pct}% на ${f.dodge_turns} хода`);
  }
  if ("will" in eff) {
    f.will_turns = eff.will;
    log.push("🧠 Воля повышена (пока без эффекта: нет страха и оглушения)");
  }
}

function healMedkit(p, f, log) {
  const heal = Math.round(p.max_hp * 0.30);
  f.hp = Math.min(p.max_hp, f.hp + heal);
  log.push(`🧪 Аптечка: +${heal} HP`);
}

function enemyTurn(p, f, log) {
  const mob = MOBS[f.mob_id];
  if (f.enemy_skip > 0) {
    f.enemy_skip -= 1;
    log.push(`${mob.name} не может действовать`);
  } else {
    const dodge = 5 + (f.dodge_turns > 0 ? f.dodge_pct : 0);
    if (Math.random() * 100 < dodge) {
      log.push(`💨 Ты уклонился от атаки ${mob.name}`);
    } else {
      let defense = p.defense + equipBonus(p).defense + (f.reduce_turns > 0 ? f.reduce_pct : 0);
      defense = Math.min(defense, 80);
      const dmg = Math.max(1, Math.round(mob.attack * (1 - defense / 100)));
      f.hp -= dmg;
      log.push(`${mob.name} наносит тебе ${dmg} урона`);
      if (f.reduce_turns > 0 && f.reflect_pct) {
        const back = Math.max(1, Math.round(dmg * f.reflect_pct / 100));
        f.mob_hp -= back;
        log.push(`🔨 Отражено ${back} урона`);
      }
    }
  }
  for (const key of ["reduce_turns", "dodge_turns", "will_turns"]) {
    if (f[key] > 0) f[key] -= 1;
  }
  f.rounds += 1;
  if (f.pet && f.rounds % 3 === 0) {
    f.mob_hp -= 5;
    log.push("🐕 Пёс кусает врага: 5 урона");
  }
}