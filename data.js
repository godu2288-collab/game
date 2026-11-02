// ============ КОНСТАНТЫ ============
const MAX_ENERGY = 100;
const HUNT_ENERGY = 5;
const PASSIVE_HP_REGEN = true;
const SLEEP_TICK = 900;
const SLEEP_DURATIONS = [15, 30, 60];
const GROUND_BED = { name: "холодная земля", energy: 5, hp_pct: 0 };

function expNeeded(level) {
  return 30 * level;
}

// ============ КЛАССЫ ============
const CLASSES = {
  rechnik: {
    title: "🪓 Речник", passive: "«Волна»: +30% скорость на воде, уклонение +15%", active: "«Волна»: 10 сек +30% скорости, не поймать в ловушку",
    buff: { name: "Волна", cd: 3, effect: { dodge: [30, 3] } },
    stats: { max_hp: 100, attack: 9, defense: 6, will: 6, agility: 11 },
    intro: "📖 Пролог: «Лодка без весла»\n\nТы помнишь воду. Ангару. Лодку, которая унесла тебя от берега, когда всё горело. Тебя нашли в Листвянке — мокрого, с обрывком сети в руке. Старейшина: «Речники не тонут. Но и не прощают. Твой первый урок — найди весло. Оно в Порт-Байкале. И не спрашивай, почему оно в крови».",
  },
  kuznets: {
    title: "🔨 Кузнец", passive: "«Наковальня»: +40% брони, отражение 10% урона", active: "«Наковальня»: 8 сек +40% брони, отражение 10% урона",
    buff: { name: "Наковальня", cd: 3, effect: { reduce: [40, 3], reflect: 10 } },
    stats: { max_hp: 125, attack: 10, defense: 12, will: 6, agility: 4 },
    intro: "📖 Пролог: «Молот без рукояти»\n\nТы помнишь руки. Мозоли. Молот, который держал твой дед. Когда бомба упала, кузня сгорела, но молот ты вынес. Старейшина: «Кузнец без рукояти — не кузнец. Найди дерево в Мёртвой тайге. И не бери с собой обрез — молот сам защитит».",
  },
  institut: {
    title: "🧪 Институтский", passive: "«Сыворотка»: лечение 30%, иммунитет к Чуме 50%", active: "«Сыворотка»: лечит 30% HP себе или союзнику, снимает яд",
    buff: { name: "Сыворотка", cd: 2, effect: { heal_pct: 30 } },
    stats: { max_hp: 90, attack: 5, defense: 5, will: 10, agility: 7 },
    intro: "📖 Пролог: «Пробирка без крышки»\n\nТы помнишь холод. Лабораторию. Пробирку с твоей кровью — единственную, что уцелела. Старейшина: «Институтские не верят в Байкал. Они верят в вакцины. Найди крышку от пробирки в Академгородке. И не открывай её без нужды».",
  },
  shaman: {
    title: "🪶 Шаман", passive: "«Чутьё»: видит лут и врагов, +25% воля", active: "«Дух Байкала»: 12 сек +25% воли (против страха и контроля)",
    buff: { name: "Дух Байкала", cd: 4, effect: { will: 3 } },
    stats: { max_hp: 95, attack: 6, defense: 6, will: 13, agility: 7 },
    intro: "📖 Пролог: «Бубен без кожи»\n\nТы помнишь звук. Бубен. Голос матери, которая пела над Байкалом. Бубен уцелел, кожа — нет. Старейшина: «Шаман без бубна — не шаман. Найди кожу в Мёртвой тайге. И не убивай зверя без нужды — иначе бубен замолчит навсегда».",
  },
  kirovets: {
    title: "🗡️ Кировец", passive: "«Тень»: невидимость 6 сек, удар x2", active: "«Тень»: 6 сек невидимость, следующий удар x2",
    buff: { name: "Тень", cd: 3, effect: { next_mult: 2, enemy_skip: 1 } },
    stats: { max_hp: 90, attack: 11, defense: 4, will: 5, agility: 12 },
    intro: "📖 Пролог: «Нож без рукояти»\n\nТы помнишь тьму. Подвал. Нож, который дал тебе незнакомец в плаще. «Кировцы не спрашивают. Кировцы берут». Старейшина: «Нож без рукояти — не нож. Найди рукоять в подземельях Иркутска. И не спрашивай, чья кровь на лезвии».",
  },
  hunter: {
    title: "🐻 Пепельный охотник", passive: "«Метка Пепельного»: медведи агрятся на 20% реже, +30% урона по ним, +50% дропа", active: "«Капкан»: обездвиживает врага на 3 сек",
    buff: { name: "Капкан", cd: 2, effect: { enemy_skip: 1 } },
    stats: { max_hp: 110, attack: 11, defense: 8, will: 7, agility: 7 },
    intro: "📖 Пролог: «Он не должен был выжить»\n\nТы помнишь только рев. Не бомбы — зверя. Пепельный медведь прошёл через хутор, когда тебе было шесть. Он не тронул тебя. Обнюхал — и ушёл. С тех пор ты знаешь: медведи не убивают всех. Они выбирают.\n\nТебя выбрали. И ты хочешь понять почему.",
  },
};

const OTHER_CLASSES = Object.keys(CLASSES).filter(c => c !== "hunter");

// ============ ПРЕДМЕТЫ ============
const ITEMS = {
  fists: { name: "Кулаки", type: "weapon", damage: 3 },
  rusty_obrez: { name: "Обрез «Ржавый»", type: "weapon", damage: 5 },
  medkit: { name: "Аптечка", type: "consumable", heal_pct: 30, desc: "Лечит 30% HP" },
  dried_fish: { name: "Вяленая рыба", type: "consumable", energy: 15, desc: "+15 энергии" },
  vaccine: { name: "Вакцина", type: "consumable", heal_pct: 50, desc: "Лечит 50% HP и снимает яд" },
  candle_ash: { name: "Свеча Пепла", type: "artifact", desc: "+5% анти-страх" },
  diary_baykal: { name: "Дневник проекта БАЙКАЛ", type: "artifact", desc: "+15% урона по медведям" },
  baikal_ice: { name: "Байкальский лёд", type: "artifact", desc: "+2 воля, лечит раз в день" },
  collar_ash_1: { name: "Ошейник Пепельного", type: "artifact", desc: "+2 урона по медведям" },
  collar_ash_2: { name: "Второй ошейник", type: "artifact", desc: "+5% урон по всем" },
  alpha_hide: { name: "Шкура альфа-пса", type: "artifact", desc: "+3 защита, +10% урон по псам" },
  dog_fang: { name: "Клык Пепельного пса", type: "artifact", desc: "+10% урона по медведям" },
  bear_track: { name: "След медведя", type: "quest" },
  hunter_diary: { name: "Дневник охотника", type: "quest" },
  key_irk: { name: "Ключ от Иркутска", type: "quest" },
  rags: { name: "Тряпьё", type: "loot" },
  rat_tail: { name: "Хвост крысы-мутанта", type: "loot" },
  bone: { name: "Кость", type: "loot" },
  hide: { name: "Шкура пса", type: "loot" },
  feather: { name: "Перо", type: "loot" },
  rope: { name: "Верёвка", type: "loot" },
  gear_artifact: { name: "Шестерёнка", type: "artifact", desc: "+5% крафт" },
};

// ============ МОБЫ ============
const MOBS = {
  rat: { name: "🐀 Крыса-мутант", hp: 40, attack: 5, exp: 10, gears: [5, 10], loot: [["rags", 0.4], ["rat_tail", 0.6], ["bear_track", 0.5, "q1"]] },
  dog: { name: "🐕 Бродячий пёс", hp: 55, attack: 7, exp: 14, gears: [8, 15], loot: [["bone", 0.5], ["hide", 0.3]] },
  crow: { name: "🐦 Ворона-падальщик", hp: 35, attack: 6, exp: 12, gears: [6, 12], loot: [["feather", 0.6], ["rope", 0.4]] },
  ash_dog: { name: "🐺 Пепельный пёс", hp: 70, attack: 9, exp: 20, gears: [20, 35], loot: [["dog_fang", 1.0]] },
  garden_guard: { name: "🚜 Огородный страж", hp: 120, attack: 10, exp: 40, gears: [40, 60], loot: [["collar_ash_1", 1.0]] },
  bellringer: { name: "🕯️ Звонарь", hp: 300, attack: 15, exp: 200, gears: [200, 200], loot: [["baikal_ice", 1.0]] },
  grey_leader: { name: "🩸 Главарь Серых", hp: 500, attack: 20, exp: 500, gears: [500, 500], loot: [["alpha_hide", 1.0], ["collar_ash_2", 1.0], ["key_irk", 1.0]] },
};

// ============ ЛОКАЦИИ ============
const LOCATIONS = {
  khutor: {
    name: "🏚️ Разбитый хутор",
    levels: "1–3",
    unlock_flag: null,
    mobs: { rat: 60, dog: 30, crow: 10 }   // ← добавлена ворона с шансом 10%
  },
  ogorody:   { name: "🌾 Мёртвые огороды",        levels: "2–5",  unlock_flag: "zone_ogorody",  mobs: { crow: 100 } },
  church:    { name: "⛪ Церковь Пепла",          levels: "6–8",  unlock_flag: "zone_church",   mobs: { bellringer: 100 } },
  blockpost: { name: "🩸 Бетонный блокпост",      levels: "9–10", unlock_flag: "zone_blockpost", mobs: { grey_leader: 100 } },
};

// ============ МАГАЗИН ============
const SHOP = [
  { id: "cons", title: "🧪 Расходники", items: [{ id: "medkit", price: 25 }, { id: "dried_fish", price: 10 }] },
  { id: "sleep", title: "🛏️ Сон и быт", items: [{ id: "bag_ragged", price: 80 }, { id: "bag_warm", price: 200 }, { id: "bag_baikal", price: 500 }] },
];

// ============ ЭКИПИРОВКА ============
// Слоты, в которые можно надеть предметы
const EQUIP_SLOTS = {
  weapon:   { title: "Оружие",   icon: "🔫" },
  armor:    { title: "Броня",    icon: "🦺" },
  artifact: { title: "Артефакт", icon: "💎" },
};

// Новая экипировка
Object.assign(ITEMS, {
  rag_jacket: { name: "Тряпичная куртка", type: "armor", bonus: { defense: 2 }, desc: "+2 защита" },
  hide_vest:  { name: "Жилет из шкуры", type: "armor", bonus: { defense: 4 }, desc: "+4 защита" },
  iron_pipe:  { name: "Железная труба", type: "weapon", damage: 7, desc: "Урон 7" },
});

// Артефакты, у которых эффект уже работает в бою (bonus).
// vs — процент урона по конкретным мобам, dmg_pct — по всем.
ITEMS.alpha_hide.bonus   = { defense: 3, vs: { dog: 10, ash_dog: 10 } };
ITEMS.collar_ash_2.bonus = { dmg_pct: 5 };
ITEMS.baikal_ice.bonus   = { will: 2 };

// Откуда берётся экипировка
MOBS.rat.loot.push(["rag_jacket", 0.10]);
MOBS.dog.loot.push(["hide_vest", 0.08], ["iron_pipe", 0.05]);

// ============ ГОСПИТАЛИ ============
// Госпиталь есть в каждой локации. rate — цена за 1 недостающий HP в ⚙️.
// Чем дальше локация, тем дороже лечение.
const HOSPITALS = {
  khutor:    { name: "🏥 Медпункт Старейшины", desc: "Стол, чистая простыня и бутыль самогона вместо антисептика.", rate: 0.5 },
  ogorody:   { name: "🏥 Полевая палатка", desc: "Брезент, керосиновая лампа и фельдшер, который не задаёт вопросов.", rate: 0.8 },
  church:    { name: "🏥 Лазарет Пепла", desc: "Сектанты лечат молча. Лучше не спрашивать, чем они платят за лекарства.", rate: 1.2 },
  blockpost: { name: "🏥 Перевязочная блокпоста", desc: "Бетонная комната. Врач работает быстро и берёт дорого.", rate: 1.5 },
};

// Услуги: heal_pct — сколько от максимума HP лечит (100 = до полного)
const HOSPITAL_SERVICES = [
  { id: "patch", title: "🩹 Перевязка", heal_pct: 30 },
  { id: "full",  title: "💉 Полное лечение", heal_pct: 100 },
];
