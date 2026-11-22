from pathlib import Path
parts = Path(__file__).resolve().parent
def part(name):
    return (parts/name).read_text(encoding='utf-8').rstrip('\n')
def rep(s, old, new):
    if s.count(old)!=1: raise ValueError(f'Expected a single occurrence of {old[:90]!r}')
    return s.replace(old,new,1)
def section(s, start, end, value):
    i=s.index(start);j=s.index(end,i+len(start))
    return s[:i]+value+s[j:]

p=Path('familiars.html')
s=p.read_text(encoding='utf-8')
s=section(s,'<h2>Команды</h2>','</section>',part('admin.html'))
s=section(s,'const gameHelp=', 'let chatSocket=', '\n'+part('locale.js')+'\n')
s=section(s,'function gameReply(p,arg,messageId){','if(!demo&&(!chatReady||!authLogin||!chatSocket||chatSocket.readyState!==1))',
    """function gameReply(p,arg,messageId){
  const section = helpSections.get(arg) ?? arg;
  const line = Object.hasOwn(gameHelp, section) ? gameHelp[section] : helpMenu;
  """)
s=rep(s,"const commandAliases = new Map([\n", """const commandAliases = new Map([
  ['!справка', '!elgame'],
  ['!питомец', '!pet'],
  ['!прыжок', '!jump'],
  ['!сердце', '!heart'],
  ['!стиль', '!style'],
  ['!статистика', '!stats'],
  ['!перевести', '!pay'],
  ['!общийтанец', '!danceall'],
  ['!общаяатака', '!attackall'],
  ['!задатьуровень', '!setlevel'],
  ['!выдатьзолото', '!addgold'],
""")
s=rep(s,"case '!pet':arg=aliases[arg]||arg;if(types[arg]){p.d.type=arg;render(p);fx(p,elements[arg]);persist()}break;",
"""case '!pet': {
  const type = petArguments.get(arg) ?? (Object.hasOwn(aliases, arg) ? aliases[arg] : arg);
  if (Object.hasOwn(types, type)) {
    p.d.type = type;
    render(p);
    fx(p, elements[type]);
    persist();
  } else reply(gameHelp.pet);
  break;
}
""")
s=section(s, "case '!style':","case '!ulta':", part('style.js')+'\n')
for name, args in [('addFamiliarGold','login'),('setFamiliarLevel','login'),('transferGold','p,id')]:
    s=rep(s,name+'('+args+r",msg.trim().toLowerCase().split(/\s+/),reply)",name+'('+args+',words,reply)')
s=rep(s,r"case '!stats':{const parts=msg.trim().split(/\s+/);", "case '!stats':{const parts=words;")
s=rep(s,"reply('🐾 Формат: !stats или !stats @ник.')", "reply('🐾 Используй ' + parts[0] + ' или ' + parts[0] + ' @ник.')")
s=rep(s,"reply('🐾 Формат: !stats @ник.')", "reply('🐾 Используй ' + parts[0] + ' @ник.')")
for en in ['pay','addgold','setlevel']:
    s=rep(s, 'Формат: !'+en+' @ник', "Используй ' + parts[0] + ' @ник")
p.write_text(s,encoding='utf-8')

p=Path('chat.html')
s=p.read_text(encoding='utf-8')
s=rep(s,"const familiarCommands = new Set([\n", """const familiarCommands = new Set([
  '!справка', '!питомец', '!прыжок', '!сердце', '!стиль', '!статистика', '!перевести',
  '!общийтанец', '!общаяатака', '!задатьуровень', '!выдатьзолото',
""")
s=rep(s,'const gameText=/^(?:🐾|🎭|', 'const gameText=/^(?:🐾|🎭|🎒|🛍|🎵|')
s=rep(s,"if(mention && (fromGameBot || !familiarBotLogin) && content.startsWith('📜 Квест · '))return true;","if(mention && (fromGameBot || !familiarBotLogin) &&\n    (content.startsWith('📜 Квест · ') || shopNotice.test(content)))return true;")
s=rep(s,'function isFamiliarReply(login,message,tags={}){','// Shop notices can arrive without the parent message or the bot login on this source.\nconst shopNotice=/^(?:🛍 Куплен и надет предмет «|✨ (?:Повторно надет предмет «|Аксессуар снят\\.$)|🎒 Ранее приобретённые украшения —|👑 (?:!стиль фонарик или !style lantern|Такого украшения нет\\.)|🪙 Для «[^»]+» нужно \\d+ золота\\.)/u;\nfunction isFamiliarReply(login,message,tags={}){')
p.write_text(s,encoding='utf-8')

test=Path('.github/scripts/test_familiar_commands.mjs')
test.write_bytes((parts/test.name).read_bytes())
p=Path('.github/workflows/update-version.yml')
s=p.read_text()
s=rep(s,'      - .github/scripts/test_quests.mjs\n','      - .github/scripts/test_quests.mjs\n      - .github/scripts/test_familiar_commands.mjs\n')
s=rep(s,'            node .github/scripts/test_quests.mjs\n','            node .github/scripts/test_quests.mjs\n            node .github/scripts/test_familiar_commands.mjs\n')
p.write_text(s)
