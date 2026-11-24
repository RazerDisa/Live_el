from pathlib import Path
import base64
parts=Path(__file__).resolve().parent
p=Path('familiars.html')
s=p.read_text()
def rep(old,new):
 global s
 assert s.count(old)==1,old[:100]
 s=s.replace(old,new,1)
rep('p.sprite.innerHTML=svg(visualType(p),p.d.style);','p.mysticWalk=null;p.sprite.innerHTML=svg(visualType(p),p.d.style);')
atlas=base64.b64encode((parts/'walk.webp').read_bytes()).decode()
rep('let prev=performance.now(),petRAF=0',"""// Walk-only atlas: 24 transparent 110px poses, six columns; one cycle lasts 780ms at 1x.
const mysticWalkAtlas = 'data:image/webp;base64,"""+atlas+"""';
function setMysticWalkFrame(p, image, frame) {
  let rig = p.mysticWalk;
  if (!rig) {
    if (frame < 0) return;
    const ns = image.namespaceURI;
    const viewport = document.createElementNS(ns, 'svg');
    // Match the square content area of the regular 110 x 101 image.
    for (const [name, value] of Object.entries({x:9.5, y:2, width:101, height:101, overflow:'hidden'})) {
      viewport.setAttribute(name, value);
    }
    viewport.classList.add('mysticWalk');
    const sheet = document.createElementNS(ns, 'image');
    sheet.setAttribute('href', sharedAsset(mysticWalkAtlas));
    sheet.setAttribute('width', 660);
    sheet.setAttribute('height', 440);
    viewport.append(sheet);
    image.after(viewport);
    rig = p.mysticWalk = {viewport, ornaments:image.parentNode.querySelectorAll('.ornamentBehind,.ornamentFront'), frame:-1};
  }
  if (frame === rig.frame) return;
  rig.frame = frame;
  if (frame < 0) {
    rig.viewport.setAttribute('display', 'none');
    image.removeAttribute('display');
    for (const group of rig.ornaments) group.removeAttribute('transform');
    return;
  }
  attr(image, 'display', 'none');
  rig.viewport.removeAttribute('display');
  attr(rig.viewport, 'viewBox', (frame % 6)*110 + ' ' + Math.floor(frame/6)*110 + ' 110 110');
  const bob = 0.95 * (1 - Math.cos(frame * Math.PI / 6)) * 101 / 110;
  for (const group of rig.ornaments) attr(group, 'transform', 'translate(0 ' + bob.toFixed(2) + ')');
}

let prev=performance.now(),petRAF=0""")
rep('let idx=moving?Math.floor(t/65*fireSpeed)%list.length:0;let dir=',"""let idx=moving?Math.floor(t/65*fireSpeed)%list.length:0;
if (list === allFrames.psychic) {
  const walking = moving && p.v !== 0 && now >= (p.fireUntil || 0);
  setMysticWalkFrame(p, image, walking ? Math.floor(t * fireSpeed / 32.5) % 24 : -1);
  if (moving) idx = 0;
}
let dir=""")
p.write_text(s)
