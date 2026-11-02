// ============ ИСТОРИЯ ============
const STORY_PAGES = [
  "☢️ 2047 год. Мир закончился за один день.\n\nСтолицы, заводы, вся Большая земля стёрты ядерным огнём. Связь оборвалась. Те, кто остался, перестали ждать помощи.",
  "🏔 Но Иркутск выжил.\n\nУдар пришёлся на окраины, а Байкал и Ангара приняли радиацию на себя и смягчили её. Город уцелел израненный, но живой.",
  "🌫 Прошло сорок лет. На дворе 2087-й.\n\nИркутск стал лоскутным одеялом: банды делят улицы, мутанты выходят из пепельных лесов, а по кварталам ползёт Чума. Порт, подземелья, Ангарск, Академгородок, Ольхон у каждого места свои законы.",
  "🧭 И ты один из тех, кто остался.\n\nЗдесь выживает не сильнейший, а тот, кто знает своё ремесло. Кем ты станешь в этом городе?"
];

// ============ КВЕСТЫ ============
const QUESTS = {
  g1: {
    classes: OTHER_CLASSES, title: "Очнулся", min_level: 1, requires: null,
    text: "Старейшина хутора: «Ты живой? Хвала Байкалу. Возьми обрез, отгони крыс от амбара».",
    objectives: [{ type: "kill", mob: "rat", count: 3, text: "убить 3 крыс-мутантов" }],
    on_accept: { weapon: "rusty_obrez" },
    reward: { gears: 50, items: { medkit: 1 } },
    reward_text: "50 ⚙️ и 1 аптечка"
  },
  p1: {
    classes: OTHER_CLASSES, title: "Голод не тётка", min_level: 1, requires: "g1",
    text: "«Принеси-ка мне пару крысиных хвостов, сварю похлёбку».",
    objectives: [{ type: "item", item: "rat_tail", count: 2, consume: true, text: "принести 2 хвоста крысы" }],
    reward: { gears: 30, items: { dried_fish: 1 } },
    reward_text: "30 ⚙️, вяленая рыба"
  },
  p2: {
    classes: OTHER_CLASSES, title: "Кости и тряпки", min_level: 2, requires: "g1",
    text: "«Охоться на бродячих псов, принеси кости и шкуры».",
    objectives: [
      { type: "item", item: "bone", count: 2, text: "собрать 2 кости" },
      { type: "item", item: "hide", count: 1, text: "содрать 1 шкуру пса" }
    ],
    reward: { gears: 50, items: { medkit: 2 } },
    reward_text: "50 ⚙️, 2 аптечки"
  },
  p3: {
  classes: OTHER_CLASSES, title: "Вороны-падальщики", min_level: 3, requires: "p2",
  text: "«Вороны совсем обнаглели — таскают зерно с хутора. Прибей трёх, а я покажу тебе тропу на Мёртвые огороды».",
  objectives: [{ type: "kill", mob: "crow", count: 3, text: "убить 3 ворон (водятся на хуторе и огородах)" }],
  reward: { gears: 80, flags: { zone_ogorody: 1 } },
  reward_text: "80 ⚙️, доступ к «Мёртвым огородам»"
  },
  q1: {
    classes: ["hunter"], title: "Следы на пепле", min_level: 1, requires: null,
    text: "Старейшина хутора: «Медведь оставил след у амбара. Отгони крыс и найди следы».",
    objectives: [
      { type: "kill", mob: "rat", count: 3, text: "убить 3 крыс-мутантов" },
      { type: "item", item: "bear_track", count: 2, consume: true, text: "найти 2 следа медведя" }
    ],
    on_accept: { weapon: "rusty_obrez" },
    reward: { gears: 60, items: { hunter_diary: 1 } },
    reward_text: "60 ⚙️, дневник охотника"
  },
  q2: {
    classes: ["hunter"], title: "Пёс, который не лаял", min_level: 3, requires: "q1",
    text: "«На огородах бродит пёс. Проверь его».",
    objectives: [{ type: "flag", key: "q2_resolved", text: "решить судьбу пса" }],
    on_accept: { items: { dried_fish: 1 } },
    action: { button: "🔎 Выйти к огородам", scene: "q2_dog" },
    reward: { gears: 120, flags: { zone_ogorody: 1 } },
    reward_text: "120 ⚙️, доступ к «Мёртвым огородам»"
  },
  q3: {
    classes: ["hunter"], title: "Огородный страж", min_level: 4, requires: "q2",
    text: "«Страж ожил. Найди, откуда звук».",
    objectives: [
      { type: "flag", key: "q3_guard_dead", text: "победить стража" },
      { type: "item", item: "collar_ash_1", count: 1, text: "найти Ошейник" }
    ],
    action: { button: "⚔️ Сразиться со стражем", intro: "Трактор заводится сам!", fight: { mob: "garden_guard", on_win: { q3_guard_dead: 1 } } },
    reward: { gears: 150, items: { gear_artifact: 1 } },
    reward_text: "150 ⚙️, Шестерёнка"
  },
  q4: {
    classes: ["hunter"], title: "Сектанты Пепла", min_level: 6, requires: "q3",
    text: "Сектанты звонят в колокол. Найди Звонаря в церкви.",
    objectives: [{ type: "flag", key: "q4_done", text: "найти Звонаря" }],
    action: { button: "🚪 Войти в церковь", scene: "q4_bellringer" },
    reward: { gears: 200, flags: { zone_church: 1 } },
    reward_text: "200 ⚙️, доступ к церкви"
  },
  q5: {
    classes: ["hunter"], title: "Звонарь", min_level: 8, requires: "q4",
    text: "«Реши судьбу Звонаря».",
    objectives: [{ type: "flag", key: "q5_done", text: "решить судьбу Звонаря" }],
    action: { button: "⚔️ Найти Звонаря", scene: "q5_bellringer_fight" },
    reward: { gears: 300, flags: { zone_blockpost: 1 } },
    reward_text: "300 ⚙️, доступ к блокпосту"
  },
  q6: {
    classes: ["hunter"], title: "Главарь Серых", min_level: 10, requires: "q5",
    text: "«Победи Главаря Серых».",
    objectives: [
      { type: "flag", key: "q6_done", text: "победить Главаря" },
      { type: "item", item: "key_irk", count: 1, text: "забрать Ключ" }
    ],
    action: { button: "🩸 Бой с Главаром", intro: "Главарь: «Я ждал тебя».", fight: { mob: "grey_leader", on_win: { q6_done: 1 } } },
    reward: { gears: 500, flags: { title_mechenyi: 1 } },
    reward_text: "500 ⚙️, титул «Меченый»"
  }
};

// ============ СЦЕНЫ ============
const SCENES = {
  q2_dog: {
    text: "На краю огорода сидит пёс. Он не рычит. Что ты сделаешь?",
    choices: [
      { text: "🍖 Покормить", need_item: "dried_fish", effects: { take: { dried_fish: 1 }, flags: { pet_dog: 1, q2_resolved: 1 } }, next: "q2_fed" },
      { text: "🔫 Убить", effects: { fight: { mob: "ash_dog", on_win: { q2_resolved: 1, dog_killed: 1 } } } },
      { text: "🚶 Уйти" }
    ]
  },
  q2_fed: {
    text: "Пёс берёт рыбу и идёт за тобой.",
    choices: [{ text: "Дальше ▶️" }]
  },
  q4_bellringer: {
    text: "Звонарь: «Я знал, что ты придёшь. Садись».",
    choices: [
      { text: "🗡️ Угрожать", effects: {}, next: "q4_threat" },
      { text: "🪑 Сесть", effects: {}, next: "q4_sit" },
      { text: "🔍 Осмотреть люк", effects: { flags: { q4_luk: 1 } }, next: "q4_luk" }
    ]
  },
  q4_threat: {
    text: "Звонарь: «Ты глуп».",
    choices: [
      { text: "⚔️ Атаковать", effects: { fight: { mob: "bellringer", on_win: { q4_done: 1 } } } },
      { text: "🪑 Сесть", effects: {}, next: "q4_sit" }
    ]
  },
  q4_sit: {
    text: "Звонарь: «Ты — приманка».",
    choices: [
      { text: "🕊️ Помочь", effects: { flags: { q4_done: 1 }, give: { diary_baykal: 1, candle_ash: 1 } }, next: "q4_help" },
      { text: "🗡️ Убить", effects: { fight: { mob: "bellringer", on_win: { q4_done: 1 } } } }
    ]
  },
  q4_luk: {
    text: "Ты нашёл вакцины и дневник.",
    choices: [{ text: "Забрать", effects: { give: { vaccine: 3, diary_baykal: 1 }, flags: { q4_done: 1 } }, next: "q4_luk_end" }]
  },
  q4_luk_end: {
    text: "Звонарь уходит.",
    choices: [{ text: "Дальше ▶️" }]
  },
  q4_help: {
    text: "Звонарь даёт дневник и уходит.",
    choices: [{ text: "Дальше ▶️" }]
  },
  q5_bellringer_fight: {
    text: "Звонарь ждёт твоего решения.",
    choices: [
      { text: "🕊️ Пощадить", effects: { flags: { q5_done: 1, bellringer_spared: 1 } }, next: "q5_spare" },
      { text: "⚔️ Убить", effects: { fight: { mob: "bellringer", on_win: { q5_done: 1, bellringer_killed: 1 } } } }
    ]
  },
  q5_spare: {
    text: "Звонарь уходит. Сектанты не враждебны.",
    choices: [{ text: "Дальше ▶️" }]
  }
};