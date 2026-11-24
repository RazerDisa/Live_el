// Exercise the shipped Twitch dispatcher, economy and chat filter together.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext, runInNewContext } from 'node:vm';

const html = readFileSync('familiars.html', 'utf8');
const chatHtml = readFileSync('chat.html', 'utf8');
function between(text, start, end, includeStart = true) {
  const at = text.indexOf(start), stop = text.indexOf(end, at + start.length);
  assert.ok(at >= 0 && stop > at, 'Missing section ' + start);
  return text.slice(includeStart ? at : at + start.length, stop);
}
const accessories = JSON.parse(between(html, 'const accessories=', ';function inventory', false));
const types = JSON.parse(between(html, ',types=', ',pets=new Map()', false));
const aliases = JSON.parse(between(html, 'const aliases=', ',elements=', false));
const data = {}, pets = new Map(), replies = [], moves = [];
let now = 1700000000000;
function spawn(id, nick) {
  if (!pets.has(id)) {
    const d = data[id] = {nick, login:nick, type:'fire', style:'none', xp:0, gold:10000, last:now};
    pets.set(id, {d, nick, name:{textContent:nick}, cd:{}, el:{classList:{contains:()=>false}}});
  }
  return pets.get(id);
}
const noop = () => {};
const context = createContext({
  accessories, types, aliases, elements:{}, data, pets, demo:true, admin:false,
  Date:{now:()=>now}, spawn, isBot:()=>false,
  render:noop, persist:noop, fx:noop, pruneInactive:noop, syncRaid:noop,
  commandReply:(_p, line)=>replies.push(line), requestMotion:(_p,kind)=>moves.push(kind),
  startElementalHeart:()=>moves.push('heart'), massDance:()=>{moves.push('all dance');return 1;},
  massAttack:()=>{moves.push('all attack');return 1;}, boss:{end:now+1e8}
});
const source = [
  between(html,'<script id="ranked-quests">','</script>',false),
  between(html,'function level(d)','const artwork='),
  between(html,'const lunarKeeperName =','normalizeRoster(data);'),
  between(html,'function imperial(p)','// Standalone renderer'),
  between(html,'function inventory(d)','const bounds='),
  between(html,'function reward(p,x,g)','const speechOwners='),
  between(html,'const shortItemNames =','let chatSocket='),
  between(html,'function gameReply(p,arg,messageId)','function showHelp'),
  between(html,'function transferGold(','// Deadlines belong'),
  between(html,'const commandAliases =','function requestCombat')
].join('\n');
runInContext(source, context);
const dispatch = runInContext('chat', context);
function send(user, body, moderator = false, elapsed = 1600) {
  now += elapsed;
  const p = spawn(user, user);
  // Isolate command costs from the existing once-per-minute chat reward.
  p.d.last = now;
  replies.length = 0;
  dispatch(user, user, body, '', moderator, user, '');
  return replies.at(-1);
}
let savedAuth = '{"login":"game_bot"}', refreshAuth;
const filter = runInNewContext(between(chatHtml,'const familiarCommands =','const messageTimers=') +
  '\n({ isFamiliarCommandMessage, isFamiliarReply, rememberGameCommand })', {
  channel:'live_el', botName:v=>String(v || '').toLowerCase(),
  localStorage:{getItem:()=>savedAuth}, window:{addEventListener:(_event,handler)=>{refreshAuth=handler;}}
});
const aliasMap = runInContext('commandAliases', context);
const commands = new Set([...runInContext('knownCommands', context), '!elgame']);
for (const canonical of commands) {
  assert.ok([...aliasMap].some(([ru,en])=>en===canonical && /^![а-яё]+$/u.test(ru)), canonical);
}
for (const [ru,en] of aliasMap) {
  for (const cmd of [ru,en]) {
    const message = '\u200b' + cmd.toUpperCase() + ' пример';
    assert.ok(filter.isFamiliarCommandMessage(message));
    filter.rememberGameCommand('viewer',message,{id:cmd});
    assert.ok(filter.isFamiliarReply('game_bot','служебный ответ',{'reply-parent-msg-id':cmd}));
  }
}
for (const phrase of ['Хочу крылья', 'фонарик', 'Я написал !стиль аура', '!стильный', '!принять']) {
  assert.equal(filter.isFamiliarCommandMessage(phrase), false);
}
for (const reply of ['🎒 Ранее приобретённые украшения — Крылья фейри.', '🛍 Куплен и надет предмет «Корона».']) {
  assert.ok(filter.isFamiliarReply('game_bot', '@viewer, ' + reply));
  assert.equal(filter.isFamiliarReply('another_viewer', '@viewer, ' + reply), false);
}
savedAuth = null;
refreshAuth({key:null});
assert.ok(filter.isFamiliarReply('separate_bot','@viewer, 🛍 Куплен и надет предмет «Крылья фейри».'));
assert.equal(filter.isFamiliarReply('viewer','@friend, я купил крылья'),false);
for (const [ru,en] of Object.entries({питомцы:'pet',действия:'actions',украшения:'style',статистика:'stats',квесты:'quest',босс:'boss',модераторы:'mod'})) {
  const russian = send('viewer','!справка '+ru);
  assert.equal(russian,send('viewer','!elgame '+en));
  assert.equal(russian,send('viewer','!elgame '+ru));
}
const shopHelp = send('viewer','!стиль');
assert.equal(shopHelp,send('viewer','!справка украшения'));
for (const word of ['фонарик','крылья','аура']) assert.ok(shopHelp.includes(word));
for (const [id, item] of Object.entries(accessories)) {
  const user='buyer', record=spawn(user,user).d;
  const spelling = {lantern:'фонарик',wings:'крылья',aura:'аура'}[id] ?? item.name.toLowerCase();
  for (const [prefix, word] of [['!СТИЛЬ', spelling.toUpperCase()],['!style', item.name.replaceAll(' ', '   ')],['!стиль', id]]) {
    const before=record.gold;
    const reply=send(user,prefix+' '+word);
    assert.equal(record.style,id);
    assert.equal(record.gold,before-item.cost);
    assert.ok(reply.includes(item.name));
    assert.equal(record.owned.filter(k=>k===id).length,1);
  }
}
const buyer=data.buyer;
const balance=buyer.gold;
assert.match(send('buyer','!стиль инвентарь'), /Крылья фейри/);
send('buyer','!стиль снять');
assert.equal(buyer.style,'none');
assert.match(send('buyer','!стиль крылья лишнее'),/Список и цены/);
assert.equal(buyer.gold,balance);
buyer.gold=24;
assert.match(send('buyer','!стиль корона'), /25 золота/);
assert.equal(buyer.style,'none');
assert.equal(buyer.gold,24);
buyer.gold=100;
send('buyer','!стиль корона');
send('buyer','!style crown',false,30);
assert.equal(buyer.gold,75);
buyer.owned=['scarf'];buyer.style='scarf';
assert.match(send('buyer','!style owned'), /Магический фонарик/);
assert.equal(buyer.style,'lantern');

for (const [id, word] of Object.entries({fire:'огонь',water:'вода',nature:'лес',air:'воздух',thunder:'гроза',ice:'лед',cosmic:'космос',fairy:'фейри',psychic:'мистика'})) {
  send('viewer','!питомец '+word);
  assert.equal(data.viewer.type,id);
  send('viewer','!pet '+types[id][0]);
  assert.equal(data.viewer.type,id);
}
const descriptions = new Set();
for (const [type, [name]] of Object.entries(types)) {
  send('reader', '!pet ' + type);
  const { gold, xp, style } = data.reader;
  const profile = send('reader', '!мойфамильяр');
  const prefix = '🐾 Твой фамильяр — ' + name + '. ';
  assert.ok(profile.startsWith(prefix));
  const description = profile.slice(prefix.length);
  assert.ok(description.length > 20 && !description.includes('undefined'));
  descriptions.add(description);
  assert.equal(send('reader', '!MYPET'), profile);
  assert.deepEqual([data.reader.type, data.reader.gold, data.reader.xp, data.reader.style], [type, gold, xp, style]);
  assert.ok(filter.isFamiliarReply('separate_bot', '@reader, ' + profile));
}
assert.equal(descriptions.size, Object.keys(types).length);
assert.match(send('new_viewer', '!mypet'), /Твой фамильяр — Огненный/);
assert.match(send('reader', '!mypet'), /Твой фамильяр — Мистический/);
assert.match(send('reader', '!справка питомцы'), /!мойфамильяр или !mypet/);
for (const text of ['!ктоя', '!мойфамильярчик', 'Мне подсказали !mypet']) {
  assert.equal(filter.isFamiliarCommandMessage(text), false);
}
assert.equal(send('reader', '!ктоя'), undefined);
send('viewer','!питомец fox');
assert.equal(data.viewer.type,'water');
send('viewer','!прыжок');send('viewer','!сердце');
assert.deepEqual(moves,['jump','heart']);
send('viewer','!общийтанец');send('viewer','!общаяатака');
assert.equal(moves.length,2);
assert.equal(send('moder','!общийтанец',true), '🎵 Массовый танец: 1 фамильяр.');
assert.equal(send('moder','!общаяатака',true), '⚔ Массовая атака: 1 фамильяр.');
assert.deepEqual(moves.slice(-2),['all dance','all attack']);

const lunarProfile = send('live_el', '!мойфамильяр');
assert.match(lunarProfile, /^🌙 Твой фамильяр — Лунный хранитель\. В его золотой короне дремлет лунный свет\./u);
assert.equal(data.live_el.type, 'royal');
for (const cmd of ['!mypet', '!pet ice', '!питомец огонь']) {
  assert.equal(send('live_el', cmd), lunarProfile);
  assert.equal(data.live_el.type, 'royal');
}
assert.ok(filter.isFamiliarReply('separate_bot', '@live_el, ' + lunarProfile));
assert.equal(filter.isFamiliarReply('viewer', 'Мне нравится Лунный хранитель.'), false);
const normalize = runInContext('normalizeRoster', context);
const roster = {1:{login:'Live_EL', type:'ice', gold:21}, 2:{login:'viewer', nick:'Live_El', type:'water'}};
assert.equal(normalize(roster), true);
assert.deepEqual(roster[1], {login:'Live_EL', type:'royal', gold:21});
assert.equal(roster[2].type, 'water');
assert.equal(normalize(roster), false);
send('reader', '!питомец royal');
assert.equal(data.reader.type, 'psychic');

const initial=data.viewer.gold, other=data.buyer.gold;
send('viewer','!перевести @buyer 10');
assert.equal(data.viewer.gold,initial-10);
assert.equal(data.buyer.gold,other+10);
assert.match(send('viewer','!перевести @buyer -5'),/!перевести/);
send('moder','!выдатьзолото @viewer 50',true);send('moder','!задатьуровень @viewer 9',true);
assert.equal(data.viewer.gold,initial-10);assert.equal(data.viewer.xp,0);
send('live_el','!выдатьзолото @viewer 50');send('kr4v3r','!задатьуровень @viewer 9');
assert.equal(data.viewer.gold,initial+40);assert.equal(data.viewer.xp,50*8**2);
assert.match(send('viewer','!статистика @viewer'), /уровень 9/);
assert.match(send('viewer','!статистика @viewer extra'), /!статистика/);

const goldAmount = runInContext('goldAmount', context);
for (const [noun, amounts] of [
  ['золото', [1, 21, 31, 101, 121]],
  ['золота', [2, 3, 4, 5, 10, 11, 12, 13, 14, 20, 22, 25, 111, 112, 114]]
]) {
  for (const amount of amounts) {
    const phrase = amount + ' ' + noun;
    assert.equal(goldAmount(amount), phrase);
    assert.ok(send('viewer', '!перевести @buyer ' + amount).includes('Передано ' + phrase + ' @buyer.'));
    assert.ok(send('live_el', '!выдатьзолото @viewer ' + amount).includes('начислено ' + phrase + '.'));
    assert.ok(filter.isFamiliarReply('separate_bot', '@viewer, 🪙 Для «Корона» нужно ' + phrase + '. У тебя 0.'));
    assert.equal(filter.isFamiliarReply('viewer', '@friend, у меня ' + phrase), false);
  }
}
assert.equal(goldAmount(0), '0 золота');
assert.equal(goldAmount(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER + ' золото');

// Exercise the actual raid label alongside both group commands.
const raidLabel = {textContent:''};
context.document = {
  body:{classList:{add:noop}},
  getElementById:id => id === 'raidHP' ? raidLabel : {classList:{add:noop}, style:{}}
};
const renderBoss = runInContext(between(html,'function bossText()','function raidDamage') + '\nbossText', context);
for (const [count, familiar, fighter] of [
  [0, 'фамильяров', 'бойцов'], [1, 'фамильяр', 'боец'], [2, 'фамильяра', 'бойца'],
  [5, 'фамильяров', 'бойцов'], [11, 'фамильяров', 'бойцов'], [14, 'фамильяров', 'бойцов'],
  [21, 'фамильяр', 'боец'], [22, 'фамильяра', 'бойца']
]) {
  context.massDance = context.massAttack = () => count;
  assert.equal(send('moder', '!общийтанец', true), '🎵 Массовый танец: ' + count + ' ' + familiar + '.');
  assert.equal(send('moder', '!общаяатака', true), '⚔ Массовая атака: ' + count + ' ' + familiar + '.');
  Object.assign(context.boss, {hp:100, max:100, roster:{size:count}});
  renderBoss();
  assert.equal(raidLabel.textContent, '100 / 100 HP · ' + count + ' ' + fighter);
}
console.log('Russian commands, shop prices and saves, privileges, bilingual help and chat filtering passed.');

// A sleeping familiar can remain on screen past the AFK timeout without scaling a raid.
const sleepPoses = JSON.parse(between(html, 'const sleepPoses = ', ';\nconst sleepBounds', false));
assert.deepEqual(Object.keys(sleepPoses).sort(), [...Object.keys(types), 'royal'].sort());
assert.equal(new Set(Object.values(sleepPoses)).size, 10);
for (const src of Object.values(sleepPoses)) assert.ok(src.startsWith('data:image/webp;base64,UklGR'));
const sleepPets = new Map();
const sleepTest = {
  pets:sleepPets, demo:false, isBot:()=>false, raidDamage:()=>7, sessionCooldowns:new Map(),
  removePet:id=>sleepPets.delete(id), syncRaid:noop, cancelPetAttack:noop,
  startJump:noop, startDance:noop, fx:noop, boss:{ids:new Set(['sleeper'])}
};
const sleepGame = runInNewContext(
  between(html, 'const ACTIVE_MS=', 'const RAID_HP_MULTIPLIER=') +
  between(html, 'function requestMotion(', 'function runPending(') +
  '\n({requestMotion, raidRoster, pruneInactive})', sleepTest
);
const sleeper={id:'sleeper',last:Date.now(),d:{},el:{isConnected:true}};
sleepPets.set('sleeper',sleeper);
sleepPets.set('inactive',{...sleeper,id:'inactive'});
sleepGame.requestMotion(sleeper,'sleep',Date.now());
sleepGame.pruneInactive(Date.now()+125000);
assert.ok(sleepPets.has('sleeper'));
assert.ok(!sleepPets.has('inactive'));
assert.ok(!sleepTest.boss.ids.has('sleeper'));
assert.equal(sleepGame.raidRoster().size,0);
sleepGame.requestMotion(sleeper,'jump',Date.now());
assert.equal(sleepGame.raidRoster().get('sleeper'),7);
console.log('Sleep artwork, inactivity protection, raid exclusion and waking passed.');
