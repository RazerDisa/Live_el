// The catalogue uses stable IDs so an in-flight quest can survive an overlay update.
const rankedQuests = (() => {
  const offerMs = 30_000;
  const redrawMs = 120_000;
  const ranks = [
    { code: 'G', level: 1, low: 32, high: 3, seconds: 30, penalty: 10, quests: [
      ['yarn', 'Сбежавший клубок', 'Пройди по красной нити через двор и распутай котёнка.', 9, 24],
      ['tea', 'Чай к началу стрима', 'Донеси Лене чай через террасу, где котята устроили гонки.', 15, 14],
      ['crest', 'Первый герб', 'Помоги оруженосцу оставить на щите ровно один золотой след лапы.', 12, 25],
      ['mice', 'Мышиный концерт', 'Подбери на колокольчиках последнюю ноту для мышиного хора.', 8, 32],
      ['bakery', 'Караул у булочной', 'Найди вора, который оставляет сдачу, но уносит булочки вместе с корзиной.', 13, 18]
    ]},
    { code: 'F', level: 8, low: 25, high: 4, seconds: 40, penalty: 10, quests: [
      ['magpie', 'Торг с сорокой', 'За три обмена преврати яблоко в серебряную пряжку рыцаря.', 24, 28],
      ['letter', 'Письмо без адреса', 'Доставь письмо тому, кто первым желает всем доброго утра.', 17, 44],
      ['vane', 'Упрямый флюгер', 'Узнай, почему петушок на башне при любом ветре смотрит на кухню.', 21, 34],
      ['ferry', 'Последний паром', 'Уговори барсука-паромщика подождать самого маленького ёжика.', 16, 48],
      ['patrol', 'Сигнал Матвея', 'Запомни порядок фонарей и проведи ночной патруль сквозь туман.', 19, 39]
    ]},
    { code: 'E', level: 16, low: 18, high: 6, seconds: 50, penalty: 15, quests: [
      ['seal', 'Печать Каспера', 'Прочти тайное донесение по строчкам, которые проявляет светлячок.', 25, 64],
      ['mimic', 'Сундук с икотой', 'Рассмеши мимика, чтобы он выпустил проглоченную карту сокровищ.', 33, 51],
      ['roots', 'Сад вверх корнями', 'Верни яблоню в землю, пока последнее яблоко не упало в небо.', 23, 72],
      ['frogs', 'Хор болотных жаб', 'Повтори песню жаб, чтобы кувшинки сложились в тропу.', 28, 58],
      ['salt', 'Соль для великана', 'Отмерь великану щепотку соли по его меркам и доставь её в харчевню.', 36, 42]
    ]},
    { code: 'D', level: 28, low: 12, high: 8, seconds: 60, penalty: 20, quests: [
      ['mill', 'Мельница наоборот', 'Почини жернова, которые превращают хлеб обратно в зерно.', 49, 66],
      ['shadow', 'Танец с тенью', 'Повтори танец сбежавшей тени и помоги ей узнать хозяина.', 31, 108],
      ['snow', 'Ледяной курьер', 'Пронеси снежинку с королевской печатью через квартал кузниц.', 44, 80],
      ['echo', 'Шёпот под руинами', 'Отличи голос разведчика от эха, которое указывает ложный путь.', 35, 100],
      ['forgery', 'Поддельный приказ', 'Найди ошибку в королевской печати, пока стража не впустила самозванца.', 41, 92]
    ]},
    { code: 'C', level: 40, low: 7, high: 12, seconds: 90, penalty: 25, quests: [
      ['beacon', 'Подводный маяк', 'Поверни луч затонувшего маяка к кораблям, потерявшимся в тумане.', 48, 150],
      ['auction', 'Торги за память', 'Выиграй для рыцаря воспоминание о его первой встрече с дочерью.', 68, 104],
      ['autumn', 'Ветка вечной осени', 'Найди в заколдованном саду дерево, которое ещё помнит весну.', 42, 172],
      ['river', 'Выбор реки', 'Уговори речного духа направить паводок в обход деревни.', 54, 132],
      ['minecart', 'Вагонетка без тормозов', 'Переведи стрелку и спаси вагонетку со звёздным хрусталём.', 62, 116]
    ]},
    { code: 'B', level: 55, low: 4, high: 19, seconds: 120, penalty: 30, quests: [
      ['dice', 'Кости каменного великана', 'Выиграй право пройти перевал. Каждая игральная кость тяжелее тебя.', 96, 158],
      ['minute', 'Сбежавшая минута', 'Найди в башенных часах минуту, в которой пропадает гонец.', 58, 270],
      ['griffin', 'Грифон в грозу', 'Проведи раненого грифона между молниями к его птенцу.', 73, 220],
      ['toast', 'Тост для двух королей', 'Распознай проклятие в тосте до того, как короли скрепят им мир.', 85, 184],
      ['aurora', 'Ключ из сияния', 'Выкуй ключ из полосы северного сияния, пока виден её цвет.', 64, 248]
    ]},
    { code: 'A', level: 68, low: 1.3, high: 23, seconds: 150, penalty: 35, quests: [
      ['whale', 'Город на спине кита', 'Разбуди небесного кита и уведи от гор город на его спине.', 108, 360],
      ['armour', 'Доспехи без рыцаря', 'Одолей пустые доспехи, которые запоминают каждый твой приём.', 128, 310],
      ['foxes', 'Беглое созвездие', 'Собери звёздных лисиц, чтобы моряки снова нашли север.', 82, 470],
      ['dragon', 'Долг золотого дракона', 'Предъяви дракону древнюю расписку и освободи его пленников.', 145, 270],
      ['canvas', 'Полночь на холсте', 'Выведи художника из картины до полуночи на нарисованных часах.', 94, 420]
    ]},
    { code: 'S', level: 82, low: 0.6, high: 17, seconds: 180, penalty: 40, quests: [
      ['banners', 'Марш пустых знамён', 'Передай знаменосцу призраков запоздавший приказ возвращаться домой.', 168, 600],
      ['mirror', 'Зеркальная Императрица', 'Узнай настоящую Лену среди двойников по именам первых котят-рыцарей.', 142, 710],
      ['train', 'Поезд похищенных снов', 'Отцепи вагон кошмаров, пока поезд проходит через сны столицы.', 185, 520],
      ['trial', 'Суд четырёх стихий', 'Докажи на суде духов, кто украл дождь у лесных жителей.', 128, 780],
      ['moon', 'Ужин Пожирателя звёзд', 'Вымени проглоченную звезду на отражение луны в серебряном блюде.', 210, 440]
    ]},
    { code: 'SS', level: 95, low: 0.1, high: 8, seconds: 240, penalty: 50, quests: [
      ['dawn', 'Первый рассвет', 'Верни солнцу его первое имя, пока мир ещё помнит утро.', 250, 1050],
      ['chronicle', 'Хроника, где нас нет', 'Верни королевство в книгу истории по отпечатку лапы на обложке.', 195, 1450],
      ['names', 'Партия за имена', 'Обыграй Безымянного короля, пока помнишь имя того, ради кого пришёл.', 335, 760],
      ['rift', 'Шов между мирами', 'Собери искры девяти стихий и зашей разлом в тронном зале.', 290, 900],
      ['heartlight', 'Сердце-маяк Live_El', 'Зажги сердце-маяк на арке террасы и верни домой потерянных котят-рыцарей.', 220, 1250]
    ]}
  ];
  const catalogue = new Map();
  for (const rank of ranks) {
    rank.quests = rank.quests.map(([id, title, story, gold, xp]) => {
      const quest = { id, title, story, gold, xp, rank };
      catalogue.set(id, quest);
      return quest;
    });
  }

  const help = '📜 Квест · Ранги сложности G, F, E, D, C, B, A, S, SS. В каждом 5 заданий. Уровень повышает шанс успеха. !квест/!quest — награда и штраф. 30 с на !принять/!accept или !отклонить/!decline. Отказ и пропуск бесплатны. Поход автоматический, отдых вдвое короче.';
  const prefix = '📜 Квест · ';
  const seconds = ms => Math.max(0, Math.ceil(ms / 1000)) + ' с';
  const label = q => q.rank.code + ' «' + q.title + '»';
  const chanceFor = (lv, rank) => Math.max(5, Math.min(95, 70 + 2 * (lv - rank.level)));

  function bookFor(d) {
    // Older saves contain only the timestamp of the old two-minute quest.
    return d.questBook ??= { seen: {}, notes: [], recent: [],
      nextOffer: Number.isFinite(d.quest) ? d.quest + redrawMs : 0, rest: 0, current: null };
  }

  function draw(book, lv, random) {
    const progress = (Math.max(1, Math.min(100, lv)) - 1) / 99;
    let roll = random() * 100;
    const rank = ranks.find(r => (roll -= r.low + (r.high - r.low) * progress) < 0) || ranks[ranks.length - 1];
    let seen = book.seen[rank.code] || [];
    let choices = rank.quests.filter(q => !seen.includes(q.id));
    if (!choices.length) {
      // Also avoid starting a new bag with the last quest from the previous bag.
      choices = rank.quests.filter(q => q.id !== seen[seen.length - 1]);
      seen = [];
    }
    const q = choices[Math.floor(random() * choices.length)];
    book.seen[rank.code] = [...seen, q.id];
    return { id: q.id, phase: 'offer', due: 0, chance: chanceFor(lv, rank),
      gold: q.gold, xp: q.xp, fee: Math.ceil(q.gold * rank.penalty / 100), duration: rank.seconds * 1000 };
  }

  function offerText(s) {
    const q = catalogue.get(s.id);
    return label(q) + '. ' + q.story + ' Шанс ' + s.chance + '% · ' + seconds(s.duration) +
      ' · ' + s.gold + ' золота и ' + s.xp + ' XP · штраф ' + s.fee +
      ' золота. 30 с на !принять / !отклонить.';
  }

  function notify(b, text, replyId = '', offer = false) {
    b.notes.push({ text, replyId, offer });
  }

  // A decision window starts only when the offer actually leaves the reply queue.
  function delivered(d, note, now) {
    const b = d.questBook;
    if (b.notes[0] !== note) return;
    b.notes.shift();
    if (note.offer && b.current?.phase === 'offer' && !b.current.due) {
      b.current.due = now + offerMs;
      b.nextOffer = now + redrawMs;
    }
  }

  function advance(d, now) {
    const b = d.questBook, s = b?.current;
    if (!s || !s.due || now < s.due) return false;
    const name = label(catalogue.get(s.id));
    b.current = null;
    if (s.phase === 'offer') {
      notify(b, name + ' отменён. Время на принятие истекло. Золото сохранено.');
      return true;
    }
    // Reserve was deducted from spendable gold at acceptance. On a loss it is
    // consumed once. A delayed wake-up still rests from the actual finish time.
    b.rest = s.due + s.duration / 2;
    b.nextOffer = 0;
    let text;
    if (s.won) {
      d.gold += s.fee + s.gold;
      d.xp += s.xp;
      text = name + ' выполнен! Награда — ' + s.gold + ' золота и ' + s.xp + ' XP. Залог возвращён.';
    } else {
      text = name + ' провален. Штраф — ' + s.fee + ' золота из залога. Опыт сохранён.';
    }
    notify(b, text + (b.rest > now ? ' Отдых ещё ' + seconds(b.rest - now) + '.' : ' Фамильяр уже отдохнул.'));
    return true;
  }

  // advance() is also called before command() by the runtime to settle a deadline
  // that fell exactly on the incoming message. Only state-changing commands enqueue notes.
  function command(d, cmd, lv, now, replyId = '', random = Math.random) {
    const b = bookFor(d), s = b.current;
    if (replyId && b.recent.includes(replyId)) return { changed: false };
    function changed() {
      if (replyId) b.recent = [...b.recent.slice(-7), replyId];
      return { changed: true };
    }
    const status = text => ({ changed: false, text });
    if (s?.phase === 'active') return status('Уже есть активный квест ' + label(catalogue.get(s.id)) +
      '. До возвращения ' + seconds(s.due - now) + '.');
    if (s) {
      if (!s.due) return status('Предложение уже готовится к отправке.');
      const name = label(catalogue.get(s.id));
      if (cmd === '!decline') {
        b.current = null;
        notify(b, name + ' отменён по твоему решению. Золото сохранено.', replyId);
        return changed();
      }
      if (cmd === '!accept') {
        if (d.gold < s.fee) return status('Для ' + name + ' нужно ' + s.fee + ' золота в залог. Доступно ' +
          d.gold + '. Можно выбрать !отклонить.');
        d.gold -= s.fee;
        s.phase = 'active';
        s.due = now + s.duration;
        s.won = random() * 100 < s.chance;
        notify(b, name + ' принят! Фамильяр вернётся через ' + seconds(s.duration) +
          '. В залоге ' + s.fee + ' золота.', replyId);
        return changed();
      }
      return status('У тебя уже есть предложение ' + name + '. Осталось ' + seconds(s.due - now) +
        '. Шанс ' + s.chance + '%, награда ' + s.gold + ' золота и ' + s.xp + ' XP, штраф ' + s.fee +
        '. !принять / !отклонить.');
    }
    if (b.rest > now) return status('Фамильяр ещё отдыхает. Следующий квест через ' + seconds(b.rest - now) + '.');
    if (cmd !== '!quest') return status('Сейчас нет предложения для принятия или отказа. Напиши !квест.');
    if (b.nextOffer > now) return status('Следующее предложение через ' + seconds(b.nextOffer - now) + '.');
    b.current = draw(b, lv, random);
    notify(b, offerText(b.current), replyId, true);
    return changed();
  }

  function validBook(b) {
    if (b === undefined) return true;
    if (!b || typeof b !== 'object' || !b.seen || typeof b.seen !== 'object' || Array.isArray(b.seen) ||
        !Object.values(b.seen).every(ids => Array.isArray(ids) && ids.every(id => typeof id === 'string')) ||
        !Array.isArray(b.notes) || !b.notes.every(n => n && typeof n.text === 'string' && typeof n.replyId === 'string' && typeof n.offer === 'boolean') ||
        !Array.isArray(b.recent) || !b.recent.every(id => typeof id === 'string') ||
        !Number.isSafeInteger(b.rest) || !Number.isSafeInteger(b.nextOffer)) return false;
    const s = b.current;
    if (s === null) return true;
    if (!s || !catalogue.has(s.id) || !Number.isSafeInteger(s.due) || s.due < 0 ||
        ![s.gold, s.xp, s.duration, s.fee].every(v => Number.isSafeInteger(v) && v > 0) ||
        !Number.isInteger(s.chance) || s.chance < 5 || s.chance > 95) return false;
    return s.phase === 'offer' ? s.due > 0 || b.notes.some(n => n.offer) :
      s.phase === 'active' && s.due > 0 && typeof s.won === 'boolean';
  }

  return { ranks, catalogue, chanceFor, help, prefix, command, delivered, advance, validBook };
})();
