from pathlib import Path
import re
p=Path('familiars.html')
s=p.read_text()
def sub(a,b):
 global s
 assert s.count(a)==1,a
 s=s.replace(a,b)
# Each row is a level and each column runs from G to SS.
rows=[
 [65,28,5,1,0.5,0.2,0.15,0.1,0.05],
 [12,22,37,22,5,1.2,0.5,0.2,0.1],
 [3,6,12,24,34,16,3.5,1,0.5],
 [1,2,4,8,16,29,30,8,2],
 [0.5,0.5,1,2,4,8,24,36,24]]
for i,(code,col) in enumerate(zip(['G','F','E','D','C','B','A','S','SS'],zip(*rows))):
 s,n=re.subn(r"(\{ code: '"+code+r"', level: \d+, )(?:starterWeight: \d+, )?low: [\d.]+, high: [\d.]+,",r'\g<1>odds: '+str(list(col))+',',s)
 assert n==1
sub("  const ranks = [","  const oddsLevels = [1, 25, 50, 75, 100];\n  const ranks = [")
sub(s[s.index('    const progress =',s.index('  function rankWeight')):s.index('\n  }',s.index('  function rankWeight'))],"""    const level = Math.max(1, Math.min(100, lv));
    const upper = oddsLevels.findIndex(limit => level <= limit);
    if (upper === 0) return rank.odds[0];
    const lower = upper - 1;
    const fraction = (level - oddsLevels[lower]) / (oddsLevels[upper] - oddsLevels[lower]);
    return rank.odds[lower] + (rank.odds[upper] - rank.odds[lower]) * fraction;""")
sub('rank.starterWeight ?', "(rank.code === 'G' || rank.code === 'F') ?")
sub('function draw(book, lv, random)', 'function draw(lv, random)')
sub(s[s.index('    let seen = book.seen'):s.index('    return { id: q.id',s.index('    let seen = book.seen'))],"""    const q = rank.quests[Math.floor(random() * rank.quests.length)];
""")
sub('draw(b, lv, random)', 'draw(lv, random)')
sub('return d.questBook ??= { seen: {}, notes:', 'return d.questBook ??= { notes:')
sub("!b || typeof b !== 'object' || !b.seen || typeof b.seen !== 'object' || Array.isArray(b.seen) ||\n        !Object.values(b.seen).every(ids => Array.isArray(ids) && ids.every(id => typeof id === 'string')) ||", "!b || typeof b !== 'object' ||")
sub("На уровнях 1–20 задания G и F выпадают чаще и их легче пройти.", "На первом уровне шанс получить G или F — 93%. С каждым уровнем сложные ранги выпадают чаще. Задания могут повторяться подряд.")
sub(s[s.index("  const help = '📜 Квест"):s.index('  const prefix')],"""  const help = '📜 Квест · 90 заданий, по 10 на ранг G–SS. На уровне 1 шанс G или F — 93%. С уровнем растёт шанс сложных рангов. Возможны повторы. ' +
    '!квест — условия. ' + decisionHint + '. Ответ за 30 с. Отмена бесплатна. Поход автоматический, отдых вдвое короче.';
""")
p.write_text(s)
