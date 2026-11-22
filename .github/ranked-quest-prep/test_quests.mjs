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
const request = (d, cmd, t, roll = 0, id = '') => game.command(d, cmd, 1, t, id, () => roll);
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
  assert.equal(game.chanceFor(r.level,r), 70);
  assert.ok(game.chanceFor(100,r) <= 95 && game.chanceFor(1,r) >= 5);
}
assert.equal(game.chanceFor(35,game.ranks[4]), 60);
assert.equal(game.chanceFor(100,game.ranks[8]), 80);

// Every level uses a normalized distribution. Every rank can be drawn at both endpoints.
for (const lv of [1,35,50,100]) {
  let total = 0;
  for (const r of game.ranks) {
    const weight = r.low + (r.high-r.low)*(lv-1)/99;
    const seen = new Set();
    let last;
    const d = player();
    for (let i=0; i<6; i++) {
      const t=start+i*120001, rolls=[(total+weight/2)/100,0.4];
      game.command(d,'!quest',lv,t,'',()=>rolls.shift());
      const s=d.questBook.current;
      assert.equal(game.catalogue.get(s.id).rank.code,r.code);
      assert.equal(s.fee,Math.ceil(s.gold*r.penalty/100));
      if (i<5) { assert.ok(!seen.has(s.id)); seen.add(s.id); }
      else assert.notEqual(s.id,last);
      last=s.id;
      deliver(d,t); request(d,'!decline',t+1); deliver(d,t+1);
    }
    total+=weight;
  }
  assert.ok(Math.abs(total-100)<1e-9);
}

// Offers that wait in the Twitch queue retain the full acceptance window.
let d=player();
request(d,'!quest',start);
assert.equal(game.advance(d,start+60000),false);
deliver(d,start+60000);
assert.equal(d.questBook.current.due,start+90000);
assert.equal(request(d,'!quest',start+70000).changed,false);
assert.equal(game.advance(d,start+89999),false);
assert.equal(game.advance(d,start+90000),true);
assert.equal(game.advance(d,start+90001),false);
assert.equal(d.questBook.notes.length,1);
assert.equal(d.gold,1000);
assert.equal(d.questBook.rest,0);
assert.equal(request(d,'!quest',start+91000).changed,false);

for (const won of [true,false]) {
  let d=player();
  request(d,'!quest',start); deliver(d,start);
  const s=d.questBook.current;
  const accepted=start+1000, finish=accepted+s.duration, rested=finish+s.duration/2;
  request(d,'!accept',accepted,won ? 0 : 0.999,'decision');
  assert.equal(d.gold,1000-s.fee);
  assert.equal(request(d,'!accept',accepted+1,0,'decision').changed,false);
  assert.equal(request(d,'!quest',accepted+2).changed,false);
  assert.equal(request(d,'!decline',accepted+3).changed,false);
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
  assert.equal(request(d,'!quest',rested-1).changed,false);
  assert.equal(request(d,'!quest',rested).changed,true);
}
d=player();d.gold=0;request(d,'!quest',start);deliver(d,start);
assert.equal(request(d,'!accept',start+1).changed,false);
request(d,'!decline',start+2);
assert.equal(d.gold,0);
assert.equal(d.questBook.notes.length,1);
assert.match(d.questBook.notes[0].text,/отменён/);
assert.equal(d.questBook.rest,0);
const legacy={gold:30,xp:25,quest:start};
assert.equal(request(legacy,'!quest',start+119999).changed,false);
assert.equal(request(legacy,'!quest',start+120000).changed,true);
console.log('45 quests: rank odds, no repeats, deadlines, reservations, payouts, rest, retries and old saves passed.');

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
for (const cmd of ['!quest','!квест','!accept','!принять','!decline','!отклонить','!elgame quest','!elgame квест']) {
  const input = '\u200b' + cmd.toUpperCase();
  assert.equal(filter.isFamiliarCommandMessage(input), true);
  filter.rememberGameCommand('viewer', input, { id: cmd });
  assert.equal(filter.isFamiliarReply('quest_bot','ответ',{'reply-parent-msg-id':cmd}), true);
  assert.equal(filter.isFamiliarReply('another_viewer','привет',{'reply-parent-msg-id':cmd}), false);
}
for (const message of ['Как принять квест?', 'Я написал !квест', '!квестовый', '!принятьподарок']) {
  assert.equal(filter.isFamiliarCommandMessage(message), false);
}
assert.equal(filter.isFamiliarReply('quest_bot', '@viewer, 📜 Квест · Фамильяр ещё отдыхает.'), true);
assert.equal(filter.isFamiliarReply('another_viewer', '@viewer, какой квест тебе выпал?'), false);
console.log('Chat filtering passed for commands, bot replies, unattended results and normal conversation.');
