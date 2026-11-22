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
const weights = [32,25,18,12,7,4,1.3,0.6,0.1];
const highest = [3,4,6,8,12,19,23,17,8];
const durations = [30,40,50,60,90,120,150,180,240];
const fees = [10,10,15,20,25,30,35,40,50];
assert.equal(game.catalogue.size, 45);
assert.equal(new Set([...game.catalogue.values()].map(q => q.title)).size, 45);
for (const [i, r] of game.ranks.entries()) {
  assert.equal(r.quests.length, 5);
  assert.equal(r.low, weights[i]);
  assert.equal(r.high, highest[i]);
  assert.equal(r.seconds, durations[i]);
  assert.equal(r.penalty, fees[i]);
  assert.equal(game.chanceFor(r.level,r), [80,77,70,70,70,70,70,70,70][i]);
  assert.ok(game.chanceFor(100,r) <= 95 && game.chanceFor(1,r) >= 5);
}
assert.equal(game.chanceFor(35,game.ranks[4]), 60);
assert.equal(game.chanceFor(100,game.ranks[8]), 80);

// Every level uses a normalized distribution. Every rank can be drawn at both endpoints.
for (const lv of [1,35,50,100]) {
  let total = 0;
  for (const r of game.ranks) {
    const weight = game.rankWeight(lv, r);
    const seen = new Set();
    let last;
    const d = player();
    for (let i=0; i<6; i++) {
      const t=start+i*120001, rolls=[(total+weight/2)/100,0.4];
      game.command(d,'',lv,t,'',()=>rolls.shift());
      const s=d.questBook.current;
      assert.equal(game.catalogue.get(s.id).rank.code,r.code);
      assert.equal(s.fee,Math.ceil(s.gold*r.penalty/100));
      if (i<5) { assert.ok(!seen.has(s.id)); seen.add(s.id); }
      else assert.notEqual(s.id,last);
      last=s.id;
      deliver(d,t); request(d,'decline',t+1); deliver(d,t+1);
    }
    total+=weight;
  }
  assert.ok(Math.abs(total-100)<1e-9);
}

// Compare all 100 levels to the pre-beginner balance. XP per minute includes the
// automatic journey and its rest, assuming immediate acceptance and enough gold.
const baseWeight = (lv, r) => r.low + (r.high - r.low) * (lv - 1) / 99;
const baseChance = (lv, r) => Math.max(5, Math.min(95, 70 + 2 * (lv - r.level)));
const near = (x, y) => assert.ok(Math.abs(x - y) < 1e-9, x + ' != ' + y);
function expectedRate(lv, weight, chance) {
  let xp = 0, seconds = 0;
  for (const rank of game.ranks) {
    const share = weight(lv, rank) / 100;
    const averageXp = rank.quests.reduce((sum, q) => sum + q.xp, 0) / rank.quests.length;
    xp += share * (chance(lv, rank) / 100) * averageXp;
    seconds += share * rank.seconds * 1.5;
  }
  return xp * 60 / seconds;
}
const [g, f] = game.ranks;
near(game.rankWeight(1, g) + game.rankWeight(1, f), 65.6);
assert.equal(game.chanceFor(1, g), 80);
assert.equal(game.chanceFor(1, f), 66);
for (let lv = 1; lv <= 100; lv++) {
  let total = 0;
  for (const rank of game.ranks) {
    const weight = game.rankWeight(lv, rank), chance = game.chanceFor(lv, rank);
    assert.ok(weight > 0 && chance >= 5 && chance <= 95);
    total += weight;
    if (lv <= 20 && (rank === g || rank === f)) {
      assert.ok(weight > baseWeight(lv, rank));
      assert.equal(chance, Math.min(95, baseChance(lv, rank) + Math.ceil((21 - lv) / 2)));
    } else {
      assert.equal(chance, baseChance(lv, rank));
    }
    if (lv >= 21) near(weight, baseWeight(lv, rank));
  }
  near(total, 100);
  const improvement = expectedRate(lv, game.rankWeight, game.chanceFor) / expectedRate(lv, baseWeight, baseChance);
  if (lv <= 20) assert.ok(improvement > 1 && improvement < 1.22, 'XP rate at level ' + lv);
  else near(improvement, 1);
}

// Exercise the actual offer draw across evenly spaced random values; this detects
// changes to the selection code even if the weight function itself is correct.
for (const lv of [1, 10, 20, 21, 100]) {
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
console.log('45 quests: rank odds, no repeats, deadlines, reservations, payouts, rest, retries and old saves passed.');

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
for (const example of ['!беру','!пас','!qtake','!qskip','1–20','G и F']) {
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
