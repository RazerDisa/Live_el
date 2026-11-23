from pathlib import Path
import re
p=Path('familiars.html')
s=p.read_text()
pattern=re.search(r"if \(\(fromGameBot \|\| !familiarBotLogin\) && (/.+?/u)\.test\(body\)\) return true;",Path('chat.html').read_text())[1]
old='function isOwnReply(login,body){if(botName(login)!==botName(authLogin))return false;'
new="""const raidNoticePattern = PATTERN;
function isOwnReply(login,body){
  const sender = botName(login);
  // A second source or a reconnected socket can receive a notice it never sent.
  if ((!authLogin || sender === channel || sender === botName(authLogin)) && raidNoticePattern.test(body)) return true;
  if(sender!==botName(authLogin))return false;""".replace('PATTERN',pattern)
assert s.count(old)==1
p.write_text(s.replace(old,new))
