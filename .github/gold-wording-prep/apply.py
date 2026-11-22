from pathlib import Path


def replace(text, old, new, expected=1):
    actual = text.count(old)
    if actual != expected:
        raise ValueError(f"Expected {expected} matches, got {actual}: {old[:90]!r}")
    return text.replace(old, new)


path = Path("familiars.html")
text = path.read_text(encoding="utf-8")
text = replace(text, "const rankedQuests = (() => {", """const russianPlurals = new Intl.PluralRules('ru');
function countWithNoun(count, one, few, many) {
  switch (russianPlurals.select(count)) {
    case 'one': return count + ' ' + one;
    case 'few': return count + ' ' + few;
    default: return count + ' ' + many;
  }
}
function goldAmount(amount) {
  return countWithNoun(amount, 'золото', 'золота', 'золота');
}

const rankedQuests = (() => {""")
text = replace(text, "s.gold + ' золота и '", "goldAmount(s.gold) + ' и '", 3)
text = replace(text, """' XP · штраф ' + s.fee +
      ' золота. На ответ 30 с. '""", """' XP · штраф ' + goldAmount(s.fee) +
      '. На ответ 30 с. '""")
text = replace(text, "s.fee + ' золота из залога.", "goldAmount(s.fee) + ' из залога.")
text = replace(text, "'Для ' + name + ' нужно ' + s.fee + ' золота в залог.", "'Для квеста ' + name + ' нужно ' + goldAmount(s.fee) + ' в залог.")
text = replace(text, "s.fee + ' золота.', replyId", "goldAmount(s.fee) + '.', replyId")
text = replace(text, "' XP, штраф ' + s.fee +", "' XP, штраф ' + goldAmount(s.fee) +")
text = replace(text, """  function notify(b, text, replyId = '', offer = false) {""", r"""  function noticeText(note, current) {
    if (note.offer && current?.phase === 'offer') return offerText(current);
    // Undelivered notices from earlier versions already contain the Russian text.
    return note.text.replace(/(^|\s)(\d+) золота(?=[\s.,!?]|$)/gu,
      (_, space, amount) => space + goldAmount(Number(amount)));
  }

  function notify(b, text, replyId = '', offer = false) {""")
text = replace(text, "argumentFor, offerText, command", "argumentFor, offerText, noticeText, command")
text = replace(text, """  // Rebuild an undelivered offer from its saved terms so it uses the current commands.
  const current = d.questBook.current;
  const message = note.offer && current?.phase === 'offer' ? rankedQuests.offerText(current) : note.text;
  const text = rankedQuests.prefix + message;""", """  const text = rankedQuests.prefix + rankedQuests.noticeText(note, d.questBook.current);""")
text = replace(text, "'🪙 Передано '+amount+' золота @'", "'🪙 Передано '+goldAmount(amount)+' @'")
text = replace(text, "': начислено '+amount+' золота. Баланс: '", "': начислено '+goldAmount(amount)+'. Баланс: '")
text = replace(text, "item.cost + ' золота. ", "goldAmount(item.cost) + '. ", 2)
text = replace(text, "+n+' фамильяров.'", "+countWithNoun(n, 'фамильяр', 'фамильяра', 'фамильяров')+'.'", 2)
text = replace(text, "+boss.roster.size+' бойцов'", "+countWithNoun(boss.roster.size, 'боец', 'бойца', 'бойцов')")
path.write_text(text, encoding="utf-8")

path = Path("chat.html")
text = path.read_text(encoding="utf-8")
text = replace(text, r"(?:xp|золота)", r"(?:xp|золот[оа])")
text = replace(text, r"передано\s+\d+\s+золота", r"передано\s+\d+\s+золот[оа]")
text = replace(text, r"\d+ золота\.)", r"\d+ золот[оа]\.)")
path.write_text(text, encoding="utf-8")
