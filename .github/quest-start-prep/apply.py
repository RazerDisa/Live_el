from pathlib import Path

def replace(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f'Expected one occurrence of {old[:80]!r}')
    return text.replace(old, new, 1)

p = Path('familiars.html')
s = p.read_text(encoding='utf-8')
s = replace(s, "code: 'G', level: 1, low: 32", "code: 'G', level: 1, starterWeight: 70, low: 32")
s = replace(s, "code: 'F', level: 8, low: 25", "code: 'F', level: 8, starterWeight: 30, low: 25")
a = s.index('  const decisionHint = ')
b = s.index('  const prefix = ', a)
s = s[:a] + """  const shortDecisions = new Map([
    ['!беру', 'accept'], ['!qtake', 'accept'],
    ['!пас', 'decline'], ['!qskip', 'decline']
  ]);

  function argumentFor(words) {
    if (words[0] === '!квест' || words[0] === '!quest') return words.slice(1).join(' ');
    if (words.length === 1) return shortDecisions.get(words[0]);
  }

  const decisionHint = '!беру/!qtake — принять, !пас/!qskip — отклонить';
  const help = '📜 Квест · По 5 заданий рангов G, F, E, D, C, B, A, S, SS. На уровнях 1–20 G и F чаще и легче. ' +
    '!квест — шанс, награда и штраф. ' + decisionHint + '. Ответ за 30 с. ' +
    'Отмена бесплатна. Поход автоматический, отдых вдвое короче.';
""" + s[b:]
s = replace(s, '  const chanceFor = (lv, rank) => Math.max(5, Math.min(95, 70 + 2 * (lv - rank.level)));', """  // The beginner adjustment fades linearly over levels 1–20.
  const starterLevels = 20;
  const starterFactor = lv => Math.max(0, Math.min(1, (starterLevels + 1 - lv) / starterLevels));

  function rankWeight(lv, rank) {
    const progress = (Math.max(1, Math.min(100, lv)) - 1) / 99;
    const normal = rank.low + (rank.high - rank.low) * progress;
    const starterShare = 0.20 * starterFactor(lv);
    return normal + ((rank.starterWeight || 0) - normal) * starterShare;
  }

  function chanceFor(lv, rank) {
    const bonus = rank.starterWeight ? Math.ceil(10 * starterFactor(lv)) : 0;
    return Math.max(5, Math.min(95, 70 + 2 * (lv - rank.level) + bonus));
  }""")
s = replace(s, """    const progress = (Math.max(1, Math.min(100, lv)) - 1) / 99;
    let roll = random() * 100;
    const rank = ranks.find(r => (roll -= r.low + (r.high - r.low) * progress) < 0) || ranks[ranks.length - 1];""", """    let roll = random() * 100;
    const rank = ranks.find(r => (roll -= rankWeight(lv, r)) < 0) || ranks[ranks.length - 1];""")
s = replace(s, "' золота. 30 с на ' + decisionHint + '.';", "' золота. На ответ 30 с. ' + decisionHint + '.';")
s = replace(s, "text: 'Напиши !квест для задания. Ответь одной из команд — ' + decisionHint + '.'", "text: 'Напиши !квест для задания. ' + decisionHint + '.'")
s = replace(s, "'. Можно выбрать !квест отклонить.'", "'. Для отказа напиши !пас или !qskip.'")
s = replace(s, 'return { ranks, catalogue, chanceFor, help, prefix, offerText, command, delivered, advance, validBook };',
              'return { ranks, catalogue, rankWeight, chanceFor, help, prefix, argumentFor, offerText, command, delivered, advance, validBook };')
s = replace(s, "  ['!квест', '!quest'],\n", '')
s = replace(s, """cmd = commandAliases.get(cmd) ?? cmd;
if (cmd === '!quest') {
  handleQuest(id, p, words.slice(1).join(' '), messageId, now);
  return;
}""", """const questArgument = rankedQuests.argumentFor(words);
if (questArgument !== undefined) {
  handleQuest(id, p, questArgument, messageId, now);
  return;
}
cmd = commandAliases.get(cmd) ?? cmd;""")
s = replace(s, '!quest accept / !квест принять · !quest decline / !квест отклонить',
              '!беру / !qtake — принять квест · !пас / !qskip — отклонить')
s = replace(s, '!elgame квест или !elgame quest — ранги и награды. Справка без задержки.',
              '!elgame квест или !elgame quest — ранги, награды и штрафы. На уровнях 1–20 квесты G и F выпадают чаще и их легче пройти. Справка без задержки.')
s = replace(s, '!quest / !квест — приключение. Ранги и правила в !elgame квест.',
              '!квест/!quest — задание, !беру — принять, !пас — отклонить. На уровнях 1–20 чаще G и F. Правила — !elgame квест.')
s = replace(s, '!heart — стихийное сердце (3,5 сек.).', '!heart — стихийное сердце (3,5 сек.). Квест — !квест, затем !беру или !пас.')
s = replace(s, '🐾 Королевство фамильяров Live_El. !elgame pet — питомцы, !elgame actions — действия и танцы, !elgame style — украшения, !elgame stats — прокачка и золото, !elgame квест — ранги и награды, !elgame boss — битва с боссом, !elgame mod — модераторы. !pay @ник сумма — перевод без комиссии.',
              '🐾 Королевство фамильяров. В !elgame есть pet (питомцы), actions (действия), style (украшения), stats (прокачка), boss (рейд), mod (модерация). !elgame квест — правила. !квест — задание, !беру / !пас — ответ. !pay @ник сумма — без комиссии.')
s = replace(s, '💰 !stats — о себе, !stats @ник — о зрителе. !квест/!quest — задание, !беру — принять, !пас — отклонить. На уровнях 1–20 чаще G и F. Правила — !elgame квест. !feed / !покормить — 10 XP за 5 золота раз в 30 с. За чат — 5 XP и 1 золото в минуту. !pay @ник сумма — перевод без комиссии тому, кто писал в чат. Сумма целая, от 1.', '💰 !stats [@ник] — статистика. !квест/!quest — задание, !беру / !пас — ответ. Ранги — !elgame квест. !feed/!покормить — 10 XP за 5 золота раз в 30 с. Чат — 5 XP и 1 золото в минуту. !pay @ник сумма — без комиссии тем, кто писал в чат. Целое от 1.')
p.write_text(s, encoding='utf-8')

p = Path('chat.html')
s = p.read_text(encoding='utf-8')
s = replace(s, '  // Quest decisions use an argument after !quest or !квест.\n', '')
s = replace(s, "const familiarAuthKey =", """// Only standalone shortcuts are decisions. A longer phrase can be ordinary chat.
const shortQuestCommands = new Set(['!беру', '!qtake', '!пас', '!qskip']);
const familiarAuthKey =""")
s = replace(s, ' return familiarCommands.has(command);', ' return familiarCommands.has(command) || shortQuestCommands.has(body.toLowerCase());')
p.write_text(s, encoding='utf-8')

Path('.github/scripts/test_quests.mjs').write_bytes((Path(__file__).resolve().parent/'test_quests.mjs').read_bytes())
