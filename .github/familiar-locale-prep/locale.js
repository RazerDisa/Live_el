// Russian inputs resolve to the same IDs that are stored in viewer inventories.
const shortItemNames = new Map([
  ['lantern', 'фонарик'], ['wings', 'крылья'], ['aura', 'аура']
]);
const styleArguments = new Map([['снять', 'none'], ['инвентарь', 'owned']]);
const shop = Object.entries(accessories).sort(([, a], [, b]) => a.cost - b.cost);
for (const [id, item] of shop) {
  styleArguments.set(item.name.toLowerCase(), id);
  if (shortItemNames.has(id)) styleArguments.set(shortItemNames.get(id), id);
}
const shopPrices = shop.map(([id, item]) =>
  (shortItemNames.get(id) || item.name.toLowerCase()) + ' ' + item.cost
).join(', ');

const petArguments = new Map([
  ['огонь', 'fire'], ['вода', 'water'], ['лес', 'nature'], ['воздух', 'air'], ['гроза', 'thunder'],
  ['лёд', 'ice'], ['лед', 'ice'], ['космос', 'cosmic'], ['фейри', 'fairy'], ['мистика', 'psychic']
]);
for (const [id, [name]] of Object.entries(types)) petArguments.set(name.toLowerCase(), id);

const helpSections = new Map([
  ['питомцы', 'pet'], ['питомец', 'pet'], ['действия', 'actions'], ['украшения', 'style'],
  ['стиль', 'style'], ['статистика', 'stats'], ['квесты', 'quest'], ['квест', 'quest'],
  ['босс', 'boss'], ['модераторы', 'mod']
]);
const gameHelp = {
  quest: rankedQuests.help,
  pet: '🐾 !питомец огонь или !pet fire сменит стихию. Варианты — огонь/fire, вода/water, лес/nature, воздух/air, гроза/thunder, лёд/ice, космос/cosmic, фейри/fairy, мистика/psychic.',
  actions: '🎭 !прыжок/!jump — прыгнуть по дуге, !танец/!dance — танцевать 10 с, !спать/!sleep — спать 12 с, !сердце/!heart — показать стихийное сердце на 3,5 с. Квест — !квест, затем !беру или !пас.',
  stats: '💰 !статистика/!stats [@ник]. !квест, затем !беру / !пас. Ранги — !справка квесты. !покормить/!feed — 10 XP за 5 золота раз в 30 с. Чат — 5 XP + 1 золото в минуту. !перевести @ник сумма (!pay) — без комиссии тому, кто писал в чат. Целое от 1.',
  style: '👑 !стиль фонарик или !style lantern — купить и надеть. Цены в золоте — ' + shopPrices +
    '. !стиль снять · !стиль инвентарь. Повторное надевание платное.',
  boss: '⚔ !атака/!attack — урон 6 + уровень раз в 5 с. !ульта/!ulta — урон ×10 раз в 20 с. Максимум 100 уровней. HP босса равны 70 × суммарный урон активных фамильяров и меняются с их составом. Рейд длится 5 мин. За победу участникам по 60 XP и 35 золота.',
  mod: '🛡 Стример и модераторы могут вызвать !босс/!boss, запустить !общийтанец/!danceall или !общаяатака/!attackall (обычная атака раз в 5 с). Только KR4V3R и Live_El — !задатьуровень @ник 1–100 (!setlevel), !выдатьзолото @ник сумма (!addgold).'
};
const helpMenu = '🐾 Королевство фамильяров. Разделы !справка — питомцы, действия, украшения, статистика, квесты, босс, модераторы. Пример — !справка украшения. !квест, затем !беру / !пас. !перевести @ник сумма — без комиссии. Также работает !elgame.';
