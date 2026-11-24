from pathlib import Path
p=Path('familiars.html')
s=p.read_text()
def rep(a,b):
 global s
 assert s.count(a)==1,a[:100]
 s=s.replace(a,b,1)
rep('for(const d of Object.values(data)){d.type=aliases[d.type]||d.type;if(!types[d.type])d.type="fire";}', '''
const lunarKeeperName = 'Лунный хранитель';
const lunarKeeperReply = '🌙 Твой фамильяр — ' + lunarKeeperName + '. В его золотой короне дремлет лунный свет. Когда хранитель ступает в темноту, под его лапами вспыхивают серебряные полумесяцы и освещают путь.';
function familiarType(record, login = record.login) {
  if (String(login || '').toLowerCase() === 'live_el') return 'royal';
  const type = Object.hasOwn(aliases, record.type) ? aliases[record.type] : record.type;
  return Object.hasOwn(types, type) ? type : 'fire';
}
function familiarName(record) {
  const type = familiarType(record);
  return type === 'royal' ? lunarKeeperName : types[type][0];
}
function normalizeRoster(records) {
  let changed = false;
  for (const record of Object.values(records)) {
    const type = familiarType(record);
    if (record.type !== type) { record.type = type; changed = true; }
  }
  return changed;
}
normalizeRoster(data);
''')
rep('for(const d of Object.values(data)){d.type=aliases[d.type]||d.type;}', 'normalizeRoster(data);')
rep('  for (const [id, p] of pets) {\n    if (p.isDemo) continue;\n    if (saved[id])', '  const migrated = normalizeRoster(saved);\n  for (const [id, p] of pets) {\n    if (p.isDemo) continue;\n    if (saved[id])')
rep('  data = saved;\n}', '  data = saved;\n  return migrated;\n}')
rep('    try { adoptSavedRoster(localStorage.getItem(key)); } catch { /* Storage unavailable. */ }\n    liveWriter = true;', '    liveWriter = true;\n    try { if (adoptSavedRoster(localStorage.getItem(key))) persist(); } catch { /* Storage unavailable. */ }')
rep('types[d.type]?.[0]||d.type||\'—\'', 'familiarName(d)')
rep('d.nick,types[d.type]?.[0],level(d)', 'd.nick,familiarName(d),level(d)')
rep('(types[v.type]||aliases[v.type])', "(types[v.type]||aliases[v.type]||(v.type==='royal'&&familiarType(v)==='royal'))")
rep('const savedLogin=String(login).toLowerCase();if(p.d.login!==savedLogin||p.d.nick!==nick){p.d.login=savedLogin;p.d.nick=nick;persist()}', '''const savedLogin=String(login).toLowerCase(), savedType=familiarType(p.d, savedLogin);
if(p.d.login!==savedLogin||p.d.nick!==nick||p.d.type!==savedType){p.d.login=savedLogin;p.d.nick=nick;p.d.type=savedType;render(p);persist()}''')
rep('  const type = p.d.type;\n  const appearance = imperial(p) ? \' У тебя императорский облик.\' : \'\';', "  if (imperial(p)) { reply(lunarKeeperReply); break; }\n  const type = p.d.type;")
rep(' + familiarDescriptions[type] + appearance',' + familiarDescriptions[type]')
rep("case '!pet': {\n  const type", "case '!pet': {\n  if (imperial(p)) { reply(lunarKeeperReply); break; }\n  const type")
rep("🐾 Твой фамильяр — )/iu.test(body)", "🐾 Твой фамильяр — |🌙 Твой фамильяр — Лунный хранитель\\.)/iu.test(body)")
rep("k=p.d.type;if(p.ornamentId", "k=visualType(p);if(p.ornamentId")
rep("function accessory(k,style,i,id)", """// The Keeper's accessory positions follow its own twelve walking poses.
bounds.royal = [[12.16, 11.33, 95.39, 85.94], [12.16, 9.61, 95.39, 87.66], [12.16, 8.18, 95.68, 89.09], [11.59, 8.18, 96.54, 89.09], [11.59, 7.32, 96.54, 89.95], [11.88, 7.61, 96.25, 89.66], [13.02, 9.04, 93.67, 88.23], [12.73, 9.33, 94.53, 87.94], [11.3, 7.9, 97.4, 89.38], [10.44, 11.33, 99.11, 85.94], [9.87, 13.05, 100.26, 84.22], [9.87, 14.2, 100.26, 83.07]];
anchors.royal = [0.73, 0.16, 0.72, 0.67, 0.41, 0.63];
fittings.royal = [0.74, 0.67, 0.60, 0.75, -23];
function accessory(k,style,i,id)""")
rep('col=colors[Object.keys(allFrames).indexOf(k)]', "col=k==='royal'?'#bcd6ff':colors[Object.keys(allFrames).indexOf(k)]")
rep("const heartThemes={fire:", "const heartThemes={royal:['Лунный свет','#f6f5ff','#827cc4','#d9deff','☾'],fire:")
rep("}else if(k==='psychic'){\n let pts", """}else if(k==='royal'){
 for(let i=0;i<5;i++){const angle=t*tau+i*tau/5;glyph(34*Math.cos(angle),-10+24*Math.sin(angle),'☾',12,a[1])}
}else if(k==='psychic'){
 let pts""")
rep("if(!heartThemes[p.d.type])return;", "const k=visualType(p);if(!heartThemes[k])return;")
rep("elementalHearts.push({p,k:p.d.type,", "elementalHearts.push({p,k,")
rep('].includes(p.d.type)?-1:1)', '].includes(visualType(p))?-1:1)')
p.write_text(s)
p=Path('chat.html');s=p.read_text();rep("|| content.startsWith('🐾 Твой фамильяр — ')", "|| content.startsWith('🐾 Твой фамильяр — ') || content.startsWith('🌙 Твой фамильяр — Лунный хранитель.')");p.write_text(s)
