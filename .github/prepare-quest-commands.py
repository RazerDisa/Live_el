from pathlib import Path

def change(text, before, after):
    count = text.count(before)
    if count != 1:
        raise ValueError(f'Expected a single match for {before[:100]!r}, got {count}')
    return text.replace(before, after, 1)

p = Path('familiars.html')
s = p.read_text(encoding='utf-8')
s = change(s, '!accept / !принять · !decline / !отклонить', '!quest accept / !квест принять · !quest decline / !квест отклонить')
start = s.index('  const help = ')
end = s.index('  const prefix = ', start)
s = s[:start] + """  const decisions = new Map([
    ['', 'offer'],
    ['принять', 'accept'], ['accept', 'accept'],
    ['отклонить', 'decline'], ['decline', 'decline']
  ]);
  const decisionHint = '!квест принять / !квест отклонить';
  const help = '📜 Квест · Ранги сложности G, F, E, D, C, B, A, S, SS. По 5 заданий. Уровень повышает шанс успеха. ' +
    '!квест — награда и штраф. 30 с на ' + decisionHint + ' (!quest accept / !quest decline). ' +
    'Отказ и пропуск бесплатны. Поход автоматический, отдых вдвое короче.';
""" + s[end:]
s = change(s, "' золота. 30 с на !принять / !отклонить.';", "' золота. 30 с на ' + decisionHint + '.';")
s = change(s, "function command(d, cmd, lv, now, replyId = '', random = Math.random) {",
    """function command(d, argument, lv, now, replyId = '', random = Math.random) {
    const action = decisions.get(argument);
    if (!action) return { changed: false, text: 'Напиши !квест для задания. Ответь одной из команд — ' + decisionHint + '.' };""")
s = change(s, "if (cmd === '!decline') {", "if (action === 'decline') {")
s = change(s, "if (cmd === '!accept') {", "if (action === 'accept') {")
s = change(s, "'. Можно выбрать !отклонить.'", "'. Можно выбрать !квест отклонить.'")
s = change(s, "'. !принять / !отклонить.');", "'. ' + decisionHint + '.');")
s = change(s, "if (cmd !== '!quest') return status(", "if (action !== 'offer') return status(")
s = change(s, 'return { ranks, catalogue, chanceFor, help, prefix, command, delivered, advance, validBook };',
              'return { ranks, catalogue, chanceFor, help, prefix, offerText, command, delivered, advance, validBook };')
s = change(s, "function handleQuest(id, p, cmd, messageId, now) {", "function handleQuest(id, p, argument, messageId, now) {")
s = change(s, "if (settleQuest(id, now) && cmd !== '!quest') return;", "if (settleQuest(id, now) && argument) return;")
s = change(s, 'rankedQuests.command(d, cmd, before, now, messageId)', 'rankedQuests.command(d, argument, before, now, messageId)')
s = change(s, '  const text = rankedQuests.prefix + note.text;', """  // Rebuild an undelivered offer from its saved terms so it uses the current commands.
  const current = d.questBook.current;
  const message = note.offer && current?.phase === 'offer' ? rankedQuests.offerText(current) : note.text;
  const text = rankedQuests.prefix + message;""")
s = change(s, "  ['!принять', '!accept'],\n  ['!отклонить', '!decline'],\n", '')
s = change(s, r"[cmd,arg]=msg.trim().toLowerCase().split(/\s+/);", r"words=msg.replace(/[\u200b-\u200f\u2060\ufeff]/g,'').trim().toLowerCase().split(/\s+/),[cmd,arg]=words;")
s = change(s, """if (cmd === '!quest' || cmd === '!accept' || cmd === '!decline') {
  handleQuest(id, p, cmd, messageId, now);""", """if (cmd === '!quest') {
  handleQuest(id, p, words.slice(1).join(' '), messageId, now);""")
p.write_text(s, encoding='utf-8')

p = Path('chat.html')
s = change(p.read_text(encoding='utf-8'), "  '!quest', '!квест', '!accept', '!принять', '!decline', '!отклонить',",
    """  // Quest decisions use an argument after !quest or !квест.
  '!quest', '!квест',""")
p.write_text(s, encoding='utf-8')

p = Path('.github/scripts/test_quests.mjs')
s = p.read_text(encoding='utf-8')
idx = s.index('// Use the overlay')
unit = s[:idx].replace("'!quest'", "''").replace("'!accept'", "'accept'").replace("'!decline'", "'decline'")
unit = change(unit, "const request = (d, cmd, t, roll = 0, id = '') => game.command(d, cmd,", "const request = (d, argument, t, roll = 0, id = '') => game.command(d, argument,")
unit += """// Only a complete decision argument after a quest command may change an offer.
for (const argument of ['принять', 'accept', 'отклонить', 'decline']) {
  const d = player();
  request(d, '', start);
  const offer = d.questBook.current;
  assert.match(game.offerText(offer), /!квест принять \\/ !квест отклонить/);
  deliver(d, start);
  for (const typo of ['!принять', '!отклонить', '!accept', '!decline', 'принять подарок', 'accept now']) {
    const saved = JSON.stringify(d);
    assert.equal(request(d, typo, start + 1).changed, false);
    assert.equal(JSON.stringify(d), saved);
  }
  assert.equal(request(d, argument, start + 2).changed, true);
  if (argument === 'принять' || argument === 'accept') {
    assert.equal(d.questBook.current.phase, 'active');
    assert.equal(d.gold, 1000 - offer.fee);
  } else {
    assert.equal(d.questBook.current, null);
    assert.equal(d.gold, 1000);
  }
}
for (const example of ['!квест принять','!квест отклонить','!quest accept','!quest decline']) {
  assert.ok(game.help.includes(example));
}

"""
flt = change(s[idx:], "'!quest','!квест','!accept','!принять','!decline','!отклонить','!elgame quest','!elgame квест'",
             "'!quest','!квест','!quest accept','!квест принять','!quest decline','!квест отклонить','!elgame quest','!elgame квест'")
flt = change(flt, "for (const message of ['Как принять квест?', 'Я написал !квест', '!квестовый', '!принятьподарок']) {",
                """for (const message of ['!принять','!отклонить','!accept','!decline','!ПРИНЯТЬ @bot','!accept trade']) {
  assert.equal(filter.isFamiliarCommandMessage(message), false);
  filter.rememberGameCommand('viewer', message, { id: message });
  assert.equal(filter.isFamiliarReply('quest_bot', 'ответ', {'reply-parent-msg-id':message}), false);
  assert.equal(filter.isFamiliarReply('trade_bot', 'обмен завершён', {'reply-parent-msg-id':message}), false);
}
for (const message of ['Как принять квест?', 'Я написал !квест принять', '!квестовый', '!принятьподарок']) {""")
p.write_text(unit + flt,encoding='utf-8')
