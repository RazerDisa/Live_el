from pathlib import Path
p=Path('familiars.html')
s=p.read_text()
def rep(a,b):
 global s
 assert s.count(a)==1, a[:120]
 s=s.replace(a,b,1)
assets=Path(__file__).with_name('assets.json').read_text()
rep('function accessory(k,style,i,id){','const sleepPoses = '+assets+';\nconst sleepBounds = {"fire":[22.5,34.0,81.0,59.0],"water":[18.0,47.0,90.0,45.0],"nature":[20.5,46.0,83.0,47.0],"air":[20.5,56.0,84.0,41.0],"thunder":[21.5,60.5,84.0,34.5],"ice":[24.5,55.5,78.0,36.5],"cosmic":[18.5,40.0,86.0,56.0],"fairy":[25.0,58.0,77.0,40.0],"psychic":[19.5,53.5,80.0,45.0],"royal":[12.5,49.0,95.5,48.5]};\nfunction accessory(k,style,i,id,sleeping=false){')
rep("const frameBounds = style === 'aura'", "const frameBounds = sleeping ? sleepBounds[k] : style === 'aura'")
rep("let cache=k+':'+st+':'+(Object.hasOwn(accessories,st)?i:0);","let cache=k+':'+st+':'+(p.sleep?'sleep':(Object.hasOwn(accessories,st)?i:0));")
rep('accessory(k,st,i,p.ornamentId)', 'accessory(k,st,i,p.ornamentId,!!p.sleep)')
rep("let p={d,el,nick,name:", "let p={id,d,el,nick,name:")
rep("jump:0,sleep:0,dance:0","jump:0,sleep:false,dance:0")
rep('let sleeping=now<p.sleep,','let sleeping=p.sleep,')
rep("if(p){clearSpeech(p);for(const l of attackLayers.values())for(const j of l.jobs)if(j.p===p){j.dead=true;j.next=null}p.royalCast=null;p.el.remove();", "if(p){clearSpeech(p);cancelPetAttack(p);p.el.remove();")
rep('function removePet(k)', '''function cancelPetAttack(p){
  for(const layer of attackLayers.values()) for(const job of layer.jobs) {
    if(job.p===p){job.dead=true;job.next=null}
  }
  p.royalCast=null;
  p.fireUntil=0;
  p.pendingCombat=null;
}
function removePet(k)''')
a=s.index('function requestMotion(');b=s.index('function runPending(',a)
rep(s[a:b],'''function requestMotion(p,kind,now){
  if(kind==='sleep'){
    if(p.sleep)return;
    cancelPetAttack(p);
    p.pendingMotion=null;
    p.jump=p.dance=0;
    p.jumpWas=false;
    p.sleep=true;
    if(boss)boss.ids.delete(p.id);
    rosterDirty=true;
    syncRaid();
    return;
  }
  if(now<(p.fireUntil||0)){p.pendingMotion=kind;return}
  if(p.sleep){p.sleep=false;p.last=now;rosterDirty=true}
  if(kind==='jump')startJump(p,now);
  else if(kind==='dance'&&p.dance<=now){startDance(p,now);fx(p,'♫ ♪ ♫')}
}
''')
rep('if(!boss||now>=boss.end)return;if(now<(p.fireUntil||0))','if(p.sleep||!boss||now>=boss.end)return;if(now<(p.fireUntil||0))')
rep('if(!activePet(p,now)||now<(p.fireUntil||0)', 'if(p.sleep||!activePet(p,now)||now<(p.fireUntil||0)')
rep('if(!activePet(p,now)||p.dance>now)continue;', 'if(p.sleep||!activePet(p,now)||p.dance>now)continue;')
rep('function castUlta(p,id,now=Date.now(),reply=null){if(!boss', 'function castUlta(p,id,now=Date.now(),reply=null){if(p.sleep)return;if(!boss')
rep('function applyRaidHit(p,id,hit){if(!boss', 'function applyRaidHit(p,id,hit){if(p.sleep||!boss')
rep("!p.isDemo&&now-p.last<ACTIVE_MS", "!p.isDemo&&(p.sleep||now-p.last<ACTIVE_MS)")
rep('.filter(([k,p])=>activePet(p,now))', '.filter(([k,p])=>!p.sleep&&activePet(p,now))')
rep('for(let p of pets.values()){if(imperial(p))royalStrike(p,raid,()=>{},true);', 'for(let p of pets.values()){if(p.sleep)continue;if(imperial(p))royalStrike(p,raid,()=>{},true);')
rep('p.sleep=p.dance=p.jump=0;const start=performance.now(),layer=attackLayer','p.dance=p.jump=0;const start=performance.now(),layer=attackLayer')
s=s.replace('p.sleep=p.dance=p.jump=0;', 'p.dance=p.jump=0;').replace('p.sleep=p.dance=0;p.jump=now+JUMP_MS;', 'p.dance=0;p.jump=now+JUMP_MS;').replace('warmDance(visualType(p));p.sleep=0;', 'warmDance(visualType(p));')
rep('let cast=p.royalCast,raw=list[idx];','let cast=p.royalCast,raw=sleeping?sleepPoses[visualType(p)]:list[idx];')
rep('sleeping?65:(p.jump>now?0:dance)', 'p.jump>now?0:dance')
rep('sleeping?8:(p.jump>now||dancing?0:Math.sin(t/150)*3)', 'sleeping||p.jump>now||dancing?0:Math.sin(t/150)*3')
rep('jp?jp.angle:sleeping?65:dance','jp?jp.angle:dance')
rep('.sleep .sprite{opacity:.8}', '.sleep .sprite{opacity:1}')
rep('!спать/!sleep — спать 12 с', '!спать/!sleep — уснуть. Спящий остаётся на экране и пропускает рейд. Разбуди его командой !прыжок или !танец')
rep('!спать / !sleep · !сердце', '!спать / !sleep — уснуть до !прыжок или !танец. Во сне фамильяр пропускает рейд и остаётся на экране при неактивности. !сердце')
p.write_text(s)
