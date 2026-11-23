from pathlib import Path
p=Path('familiars.html')
text=p.read_bytes()
old=b'function notifyRaid(message) {\n  announce(message);\n'
assert text.count(old)==1
p.write_bytes(text.replace(old,b'function notifyRaid(message) {\n'))
