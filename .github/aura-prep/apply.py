from pathlib import Path
p = Path('familiars.html')
s = p.read_text()
def replace(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)

start = s.index("if(style==='aura'){pos=")
end = s.index('\nreturn defs+', start)
replace(s[start:end], """if (style === 'aura') {
  pos = [x + w / 2, y + h / 2];
  const rx = w * 0.61 / scale, ry = h * 0.55 / scale;
  const orbit = `rx="${rx}" ry="${ry}"`;
  defs += `<defs><radialGradient id="auraLight${id}">
    <stop offset=".55" stop-color="#f8c86d" stop-opacity="0"/>
    <stop offset=".77" stop-color="#ffd36e" stop-opacity=".36"/>
    <stop offset=".86" stop-color="#ffe6a1" stop-opacity=".72"/>
    <stop offset="1" stop-color="#cf88ff" stop-opacity="0"/>
  </radialGradient></defs>`;
  const sparks = Array.from({length: 6}, (_, j) => {
    const angle = j * Math.PI / 3;
    const size = j % 3 === 0 ? 1.15 : 0.83;
    return `<g transform="translate(${rx * Math.cos(angle)} ${ry * Math.sin(angle)}) scale(${size})">
      <path d="M0 -7 Q1.4 -1.7 5.2 0 Q1.4 1.7 0 7 Q-1.4 1.7 -5.2 0 Q-1.4 -1.7 0 -7Z" fill="#ffdc7d" stroke="#693b67" stroke-width="1.5"/>
      <path d="M0 -3.8 L1.65 0 0 3.8 -1.65 0Z" fill="#fffbee"/>
    </g>`;
  }).join('');
  art = `<ellipse class="auraLight" rx="${rx * 1.18}" ry="${ry * 1.18}" fill="url(#auraLight${id})"/>
    <g fill="none">
      <ellipse ${orbit} stroke="#5e355e" stroke-width="4.4"/>
      <ellipse ${orbit} stroke="#ffd474" stroke-width="2.65"/>
      <ellipse rx="${rx * 0.90}" ry="${ry * 0.90}" stroke="#fff2b3" stroke-width="1.35" stroke-dasharray="9 4"/>
    </g>${sparks}`;
}""")
replace('.sprite > svg{width:100%;height:100%;overflow:visible}', '''.sprite > svg{width:100%;height:100%;overflow:visible}
.auraLight{animation:auraGleam 3.6s ease-in-out infinite alternate}
@keyframes auraGleam{from{opacity:.66}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.auraLight{animation:none}}
''')
replace("k=visualType(p);if(p.ornamentId", """k=visualType(p);
  // The aura surrounds the whole familiar and uses one stable pose across movement and dance.
  if (st === 'aura') i = 0;
  if(p.ornamentId""")
replace("if(p.ornamentCache!==null){p.ornamentCache=null;p.sprite.querySelector('.ornamentBehind').innerHTML='';","if(p.d.style==='aura'){updateOrnament(p,0)}else if(p.ornamentCache!==null){p.ornamentCache=null;p.sprite.querySelector('.ornamentBehind').innerHTML='';")
replace('function accessory(k,style,i,id){let [x,y,w,h]=bounds[k][i],', "function accessory(k,style,i,id){\n  // The Mystic's current body fills more of the frame than its legacy accessory anchors.\n  const frameBounds = style === 'aura' && k === 'psychic' ? [19.6, 12.1, 79.88, 86.31] : bounds[k][i];\n  let [x,y,w,h]=frameBounds,")
p.write_text(s)
