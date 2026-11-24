from pathlib import Path
p = Path('familiars.html')
s = p.read_text()
old = '.sprite svg{width:100%;height:100%;overflow:visible}'
new = '.sprite > svg{width:100%;height:100%;overflow:visible}'
assert s.count(old) == 1
p.write_text(s.replace(old, new))
