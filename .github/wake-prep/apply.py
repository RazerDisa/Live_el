from pathlib import Path
def apply(path, replacements):
    p = Path(path)
    s = p.read_text()
    for old,new in replacements:
        assert s.count(old) == 1, old
        s = s.replace(old,new)
    p.write_text(s)

apply('familiars.html', [
    ("  ['!спать', '!sleep'],", "  ['!спать', '!sleep'],\n  ['!проснуться', '!wake'],"),
    ("'!jump','!sleep','!heart'", "'!jump','!sleep','!wake','!heart'"),
    ("!спать / !sleep — уснуть до !прыжок или !танец.", "!спать / !sleep — уснуть. !проснуться / !wake — разбудить фамильяра. !прыжок и !танец тоже его будят."),
    ("🎭 !прыжок/!jump — прыгнуть по дуге, !танец/!dance — танцевать 10 с, !спать/!sleep — уснуть. Спящий остаётся на экране и пропускает рейд. Разбуди его командой !прыжок или !танец, !сердце/!heart — показать стихийное сердце на 3,5 с. Квест — !квест, затем !беру или !пас.", "🎭 !спать/!sleep — уснуть, !проснуться/!wake — встать. Спящий виден и пропускает рейд. Прыжок по дуге (!прыжок/!jump) и танец на 10 с (!танец/!dance) тоже будят. !сердце/!heart — стихийное сердце на 3,5 с. !квест → !беру или !пас."),
    ("requestMotion(p,'sleep',now);break;case '!heart'", """requestMotion(p,'sleep',now);break;
case '!wake':
  reply(wakePet(p,now) ? '🐾 Твой фамильяр проснулся.' : '🐾 Твой фамильяр уже бодрствует.');
  break;
case '!heart'"""),
    ("  if(p.sleep){p.sleep=false;p.last=now;rosterDirty=true}", "  wakePet(p,now);"),
    ("function runPending(p,now)", """function wakePet(p,now){
  if(!p.sleep)return false;
  p.sleep=false;
  p.last=now;
  rosterDirty=true;
  syncRaid();
  return true;
}
function runPending(p,now)"""),
    ("  if (fromGame && (raidNoticePattern", """  if (fromGame && /^@[a-z0-9_]+\\s*[,，:]\\s*🐾 Твой фамильяр (?:проснулся|уже бодрствует)\\.$/iu.test(body)) return true;
  if (fromGame && (raidNoticePattern"""),
])
apply('chat.html', [
    ("'!sleep', '!спать', '!heart'", "'!sleep', '!спать', '!wake', '!проснуться', '!heart'"),
    ("(shopNotice.test(content) ||", "(shopNotice.test(content) || /^🐾 Твой фамильяр (?:проснулся|уже бодрствует)\\.$/u.test(content) ||"),
])
