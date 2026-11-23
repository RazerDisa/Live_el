from pathlib import Path
import ast,re
def replace(s,a,b):
 assert s.count(a)==1,a
 return s.replace(a,b)
p=Path('familiars.html');s=p.read_text()
stories={}
for l in (Path(__file__).parent/'stories').read_text().splitlines():
 if '|' not in l:
  rank=l;stories[rank]=[]
 else:stories[rank].append(l.split('|'))
def expand(m):
 rows=m[3]
 orig=[ast.literal_eval(l.strip().rstrip(',')) for l in rows.splitlines() if l.strip()]
 extra=stories.pop(m[2]);assert len(orig)==len(extra)==5
 for i,(key,title,story) in enumerate(extra):
  gold=orig[(i+1)%5][3]+[1,-1,0,1,-1][i]
  xp=orig[(i+3)%5][4]+[-2,2,0,-2,2][i]
  rows+=',\n      '+repr([key,title,story,gold,xp])
 return m[1]+rows
s=re.sub(r"(\{ code: '([A-Z]+)',[^\n]* quests: \[\n)([\s\S]+?)(?=\n    \]\})",expand,s)
assert not stories
s=replace(s,'По 5 заданий рангов','90 заданий, по 10 на каждый ранг:')
s=replace(s,'if ((!authLogin || sender === channel || sender === botName(authLogin)) && raidNoticePattern.test(body)) return true;',"""const fromGame = !authLogin || sender === channel || sender === botName(authLogin);
  if (fromGame && (raidNoticePattern.test(body) || /^(?:@[a-z0-9_]+\\s*[,，:]\\s*)?📜 Квест · /iu.test(body))) return true;""")
s=replace(s,r"if(/^@[a-z0-9_]+,\s*📜 Квест · /iu.test(body))return true;","")
p.write_text(s)
p=Path('chat.html');s=p.read_text()
s=replace(s,"if(mention && (fromGameBot || !familiarBotLogin) &&\n    (content.startsWith('📜 Квест · ') || shopNotice.test(content)))return true;","if ((fromGameBot || !familiarBotLogin) && content.startsWith('📜 Квест · ')) return true;\n if (mention && (fromGameBot || !familiarBotLogin) && shopNotice.test(content)) return true;")
p.write_text(s)
