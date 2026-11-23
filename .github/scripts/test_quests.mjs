// Exercise the same standalone script that runs in OBS, including JSON save/reload.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync('familiars.html', 'utf8');
const script = html.match(/<script id="ranked-quests">([\s\S]+?)<\/script>/);
assert.ok(script, 'Missing ranked quest engine');
const game = runInNewContext(script[1] + '\nrankedQuests');
const start = 1700000000000;
const player = () => ({ nick: 'Viewer', gold: 1000, xp: 0 });
const deliver = (d, t) => {
  while (d.questBook.notes.length) game.delivered(d, d.questBook.notes[0], t);
};
const reload = d => JSON.parse(JSON.stringify(d));
const request = (d, argument, t, roll = 0, id = '') => game.command(d, argument, 1, t, id, () => roll);
const durations = [30,40,50,60,90,120,150,180,240];
const fees = [10,10,15,20,25,30,35,40,50];
assert.equal(game.catalogue.size, 90);
assert.equal(new Set([...game.catalogue.values()].map(q => q.title)).size, 90);
for (const [i, r] of game.ranks.entries()) {
  assert.equal(r.quests.length, 10);
  assert.equal(r.seconds, durations[i]);
  assert.equal(r.penalty, fees[i]);
  assert.equal(game.chanceFor(r.level,r), [80,77,70,70,70,70,70,70,70][i]);
  assert.ok(game.chanceFor(100,r) <= 95 && game.chanceFor(1,r) >= 5);
}
assert.equal(game.chanceFor(35,game.ranks[4]), 60);
assert.equal(game.chanceFor(100,game.ranks[8]), 80);

// Verify the full curve, including levels between the five design targets.
const targets = [
  [1,   [65,28,5,1,0.5,0.2,0.15,0.1,0.05]],
  [25,  [12,22,37,22,5,1.2,0.5,0.2,0.1]],
  [50,  [3,6,12,24,34,16,3.5,1,0.5]],
  [75,  [1,2,4,8,16,29,30,8,2]],
  [100, [0.5,0.5,1,2,4,8,24,36,24]]
];
const near = (x, y) => assert.ok(Math.abs(x - y) < 1e-9, x + ' != ' + y);
let previous;
for (let level = 1; level <= 100; level++) {
  const odds = game.ranks.map(rank=>game.rankWeight(level, rank));
  const upper = targets.findIndex(([limit])=>level <= limit);
  const [lo, from] = targets[Math.max(0,upper-1)], [hi,to] = targets[upper];
  const t = hi === lo ? 0 : (level-lo)/(hi-lo);
  for (const [i,rank] of game.ranks.entries()) {
    assert.ok(odds[i]>0);
    near(odds[i], from[i]+(to[i]-from[i])*t);
    if (i && previous) {
      // At every level the chance of this rank OR harder increases.
      const sum = list=>list.slice(i).reduce((a,b)=>a+b,0);
      assert.ok(sum(odds)>sum(previous));
    }
    const bonus = i<2 && level<=20 ? Math.ceil((21-level)/2) : 0;
    const success = Math.max(5,Math.min(95,70+2*(level-rank.level)+bonus));
    assert.equal(game.chanceFor(level,rank),success);
  }
  near(odds.reduce((a,b)=>a+b,0),100);
  previous = odds;
}
// Exercise the actual offer draw across evenly spaced random values; this detects
// changes to the selection code even if the weight function itself is correct.
for (const lv of [1, 13, 25, 37, 50, 64, 75, 88, 100]) {
  const counts = new Map(game.ranks.map(rank => [rank.code, 0]));
  const draws = 10000;
  for (let i = 0; i < draws; i++) {
    const d = player();
    game.command(d, '', lv, start, '', () => (i + 0.5) / draws);
    const code = game.catalogue.get(d.questBook.current.id).rank.code;
    counts.set(code, counts.get(code) + 1);
  }
  for (const rank of game.ranks) {
    assert.ok(Math.abs(counts.get(rank.code) - draws * game.rankWeight(lv, rank) / 100) <= 1.000001);
  }
}

// Save files carry the original offer terms through an update. New odds only
// apply to newly drawn offers, including when the familiar gains a level.
for (const oldOffer of [true, false]) {
  const d = player();
  request(d, '', start);
  if (oldOffer) d.questBook.current.chance = 70;
  const saved = reload(d);
  assert.ok(game.offerText(saved.questBook.current).includes(oldOffer ? '70%' : '80%'));
  deliver(saved, start);
  request(saved, 'accept', start + 1, 0.75);
  assert.equal(saved.questBook.current.won, !oldOffer);
}

// Offers that wait in the Twitch queue retain the full acceptance window.
let d=player();
request(d,'',start);
assert.equal(game.advance(d,start+60000),false);
deliver(d,start+60000);
assert.equal(d.questBook.current.due,start+90000);
assert.equal(request(d,'',start+70000).changed,false);
assert.equal(game.advance(d,start+89999),false);
assert.equal(game.advance(d,start+90000),true);
assert.equal(game.advance(d,start+90001),false);
assert.equal(d.questBook.notes.length,1);
assert.equal(d.gold,1000);
assert.equal(d.questBook.rest,0);
assert.equal(request(d,'',start+91000).changed,false);

for (const won of [true,false]) {
  let d=player();
  request(d,'',start); deliver(d,start);
  const s=d.questBook.current;
  const accepted=start+1000, finish=accepted+s.duration, rested=finish+s.duration/2;
  request(d,'accept',accepted,won ? 0 : 0.999,'decision');
  assert.equal(d.gold,1000-s.fee);
  assert.equal(request(d,'accept',accepted+1,0,'decision').changed,false);
  assert.equal(request(d,'',accepted+2).changed,false);
  assert.equal(request(d,'decline',accepted+3).changed,false);
  deliver(d,accepted); d=reload(d);
  assert.equal(game.validBook(d.questBook),true);
  d.gold-=7; // unrelated spend while travelling
  assert.equal(game.advance(d,finish-1),false);
  assert.equal(game.advance(d,finish),true);
  assert.equal(d.gold,993+(won?s.gold:-s.fee));
  assert.equal(d.xp,won?s.xp:0);
  assert.equal(d.questBook.rest,rested);
  d=reload(d);
  assert.equal(game.advance(d,finish+1),false);
  assert.equal(d.questBook.notes.length,1);
  assert.equal(request(d,'',rested-1).changed,false);
  assert.equal(request(d,'',rested).changed,true);
}
d=player();d.gold=0;request(d,'',start);deliver(d,start);
assert.equal(request(d,'accept',start+1).changed,false);
request(d,'decline',start+2);
assert.equal(d.gold,0);
assert.equal(d.questBook.notes.length,1);
assert.match(d.questBook.notes[0].text,/отменён/);
assert.equal(d.questBook.rest,0);
const legacy={gold:30,xp:25,quest:start};
assert.equal(request(legacy,'',start+119999).changed,false);
assert.equal(request(legacy,'',start+120000).changed,true);
console.log('90 quests: level-based rank odds, independent draws, deadlines, reservations, payouts, rest, retries and old saves passed.');

// Replay the two reported quests from their offers through payment or loss.
for (const example of [
  {id:'mice', rolls:[0, 0.35], deposit:'1 золото', reward:'8 золота и 32 XP', won:false},
  {id:'vane', rolls:[0.8, 0.25], deposit:'3 золота', reward:'21 золото и 34 XP', won:true}
]) {
  const d = player();
  game.command(d, '', 1, start, '', () => example.rolls.shift());
  const offer = d.questBook.current;
  assert.equal(offer.id, example.id);
  assert.ok(d.questBook.notes[0].text.includes(example.reward + ' · штраф ' + example.deposit + '.'));
  deliver(d, start);
  assert.ok(request(d, '', start + 1).text.includes('награда ' + example.reward + ', штраф ' + example.deposit + '.'));
  d.gold = 0;
  assert.ok(request(d, 'accept', start + 1).text.includes('нужно ' + example.deposit + ' в залог.'));
  d.gold = 1000;
  request(d, 'accept', start + 2, example.won ? 0 : 0.999);
  assert.ok(d.questBook.notes[0].text.endsWith('В залоге ' + example.deposit + '.'));
  deliver(d, start + 2);
  assert.ok(game.advance(d, offer.due));
  assert.ok(d.questBook.notes[0].text.includes(example.won
    ? 'Награда — 21 золото и 34 XP. Залог возвращён.'
    : 'Штраф — 1 золото из залога. Опыт сохранён.'));
  assert.equal(d.gold, example.won ? 1021 : 999);
}

// Only the wording of a stored notice changes when it is delivered after an update.
const oldNote = {text:'Награда — 21 золота и 34 XP. В залоге 1 золота. Штраф — 11 золота.', replyId:'old', offer:false};
const oldText = oldNote.text;
assert.equal(game.noticeText(oldNote, null), 'Награда — 21 золото и 34 XP. В залоге 1 золото. Штраф — 11 золота.');
assert.equal(oldNote.text, oldText);

// Existing two-word commands keep working; extra words cannot authorize a decision.
for (const argument of ['принять', 'accept', 'отклонить', 'decline']) {
  const d = player();
  request(d, '', start);
  const offer = d.questBook.current;
  assert.ok(game.offerText(offer).includes('!беру/!qtake — принять, !пас/!qskip — отклонить'));
  deliver(d, start);
  for (const typo of ['!принять', '!отклонить', '!accept', '!decline', 'принять подарок', 'accept now']) {
    const saved = JSON.stringify(d);
    assert.equal(request(d, typo, start + 1).changed, false);
    assert.equal(JSON.stringify(d), saved);
  }
  assert.equal(request(d, argument, start + 2).changed, true);
  if (argument === 'принять' || argument === 'accept') {
    assert.equal(d.questBook.current.phase, 'active');
    assert.equal(d.gold, 1000 - offer.fee);
  } else {
    assert.equal(d.questBook.current, null);
    assert.equal(d.gold, 1000);
  }
}
for (const example of ['!беру','!пас','!qtake','!qskip','93%','G или F','Возможны повторы']) {
  assert.ok(game.help.includes(example));
}

// Test each real Twitch shortcut from routing through the economic transition.
for (const [cmd, action] of [['!беру','accept'],['!qtake','accept'],['!пас','decline'],['!qskip','decline']]) {
  const argument = game.argumentFor([cmd]);
  assert.equal(argument, action);
  assert.equal(game.argumentFor([cmd,'лишнее']), undefined);
  const d = player();
  request(d, game.argumentFor(['!квест']), start);
  deliver(d, start);
  const fee = d.questBook.current.fee;
  assert.equal(request(d, argument, start + 1).changed, true);
  assert.equal(d.gold, action === 'accept' ? 1000 - fee : 1000);
  assert.equal(d.questBook.current?.phase, action === 'accept' ? 'active' : undefined);
}
for (const cmd of ['!принять','!отклонить','!accept','!decline','!паста','пас']) {
  assert.equal(game.argumentFor([cmd]), undefined);
}
assert.equal(game.argumentFor(['!квест','принять']), 'принять');
assert.equal(game.argumentFor(['!quest','decline']), 'decline');

// Use the overlay's own command table and reply classifier for regression checks.
const chat = readFileSync('chat.html', 'utf8');
const startFilter = chat.indexOf('const familiarCommands =');
const endFilter = chat.indexOf('const messageTimers=', startFilter);
assert.ok(startFilter >= 0 && endFilter > startFilter, 'Missing chat command filter');
const filter = runInNewContext(chat.slice(startFilter, endFilter) +
  '\n({isFamiliarCommandMessage, isFamiliarReply, rememberGameCommand})', {
    channel: 'live_el', botName: value => String(value || '').trim().toLowerCase().replace(/^@/, ''),
    localStorage: { getItem: () => '{"login":"quest_bot"}' }, window: { addEventListener() {} }
  });
for (const cmd of ['!беру','!пас','!qtake','!qskip','!quest','!квест','!quest accept','!квест принять','!quest decline','!квест отклонить','!elgame quest','!elgame квест']) {
  const input = '\u200b' + cmd.toUpperCase();
  assert.equal(filter.isFamiliarCommandMessage(input), true);
  filter.rememberGameCommand('viewer', input, { id: cmd });
  assert.equal(filter.isFamiliarReply('quest_bot','ответ',{'reply-parent-msg-id':cmd}), true);
  assert.equal(filter.isFamiliarReply('another_viewer','привет',{'reply-parent-msg-id':cmd}), false);
}
for (const message of ['!принять','!отклонить','!accept','!decline','!ПРИНЯТЬ @bot','!accept trade']) {
  assert.equal(filter.isFamiliarCommandMessage(message), false);
  filter.rememberGameCommand('viewer', message, { id: message });
  assert.equal(filter.isFamiliarReply('quest_bot', 'ответ', {'reply-parent-msg-id':message}), false);
  assert.equal(filter.isFamiliarReply('trade_bot', 'обмен завершён', {'reply-parent-msg-id':message}), false);
}
for (const message of ['Как принять квест?', 'Я написал !беру', '!беру кота', '!пас на сегодня', '!qskip today', '!берусь', '!паста', '!квестовый', '!принятьподарок']) {
  assert.equal(filter.isFamiliarCommandMessage(message), false);
}
assert.equal(filter.isFamiliarReply('quest_bot', '@viewer, 📜 Квест · Фамильяр ещё отдыхает.'), true);
assert.equal(filter.isFamiliarReply('another_viewer', '@viewer, какой квест тебе выпал?'), false);
console.log('Chat filtering passed for commands, bot replies, unattended results and normal conversation.');

assert.match(game.help, /90 заданий, по 10/);
const speechStart = html.indexOf('const raidNoticePattern');
const speechEnd = html.indexOf('function makeReplyLine', speechStart);
assert.ok(speechStart >= 0 && speechEnd > speechStart);
const suppressSpeech = runInNewContext(html.slice(speechStart, speechEnd) + '\nisOwnReply', {
  channel:'live_el', authLogin:'quest_bot', botName:s=>s.toLowerCase(), ownReplies:[]
});
let lower = 0;
for (const rank of game.ranks) {
  const weight = game.rankWeight(1, rank);
  // Previous-version saves can list every quest as seen. It must not affect any draw.
  const d = player();
  d.questBook = {seen:{[rank.code]:rank.quests.map(q=>q.id)}, notes:[], recent:[], nextOffer:0, rest:0, current:null};
  assert.ok(game.validBook(d.questBook));
  let time = start;
  for (const [index,q] of rank.quests.entries()) {
    for (let repeat=0; repeat<2; repeat++) {
      const rolls = [(lower+weight/2)/100, (index+0.5)/rank.quests.length];
      game.command(d, '', 1, time, '', ()=>rolls.shift());
      assert.equal(d.questBook.current.id,q.id);
      assert.equal(d.questBook.current.fee,Math.ceil(q.gold*rank.penalty/100));
      deliver(d,time); request(d,'decline',time+1); deliver(d,time+1);
      time+=120001;
    }
  }
  for (const q of rank.quests) {
    const terms = {id:q.id, gold:q.gold, xp:q.xp, duration:rank.seconds*1000,
      chance:game.chanceFor(1,rank), fee:Math.ceil(q.gold*rank.penalty/100)};
    const text = game.prefix + game.offerText(terms);
    for (const message of [text, '@viewer, '+text]) {
      assert.ok(filter.isFamiliarReply('quest_bot',message));
      assert.ok(suppressSpeech('quest_bot',message));
    }
    const discussion = 'Как тебе квест «'+q.title+'»?';
    assert.equal(filter.isFamiliarReply('viewer',discussion), false);
    assert.equal(suppressSpeech('viewer',discussion), false);
    assert.equal(filter.isFamiliarCommandMessage(q.title), false);
  }
  lower += weight;
}
console.log('All 90 quest offers pass both filters. Every quest can recur immediately, including with old saved histories.');
