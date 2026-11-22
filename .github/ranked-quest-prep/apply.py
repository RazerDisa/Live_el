from pathlib import Path
import re

parts = Path(__file__).resolve().parent
def read(name):
    return (parts / name).read_text(encoding='utf-8')
def replace(source, old, new):
    if source.count(old) != 1:
        raise ValueError(f'Expected one occurrence of {old[:100]!r}')
    return source.replace(old, new, 1)
def section(source,start,end,new):
    i=source.index(start)
    return source[:i]+new+source[source.index(end,i+len(start)):]

fp=Path('familiars.html')
s=fp.read_text(encoding='utf-8')
s=replace(s, '<script>\nconst fireFrames=', '<script id="ranked-quests">\n'+read('engine.js')+'</script><script>\nconst fireFrames=')
s=replace(s, "function showSpeech(p,msg,emotes=''){", "function showSpeech(p,msg,emotes='',limit=100){")
s=replace(s, 'end=Math.min(chars.length,100)', 'end=Math.min(chars.length,limit)')
s=replace(s, 'let saveTimer=null,', 'let liveWriter = demo && !admin;\nlet saveTimer=null,')
s=replace(s, 'if(!demo&&!admin){try{localStorage.setItem(key,JSON.stringify(data))', 'if(!demo&&!admin&&liveWriter){try{localStorage.setItem(key,JSON.stringify(data))')
s=replace(s, 'if(!demo&&!admin&&saveTimer===null)', 'if(!demo&&!admin&&liveWriter&&saveTimer===null)')
s=replace(s, 'const commandAliases = new Map([', read('runtime.js')+'\nconst commandAliases = new Map([')
s=replace(s, "  ['!квест', '!quest'],", "  ['!квест', '!quest'],\n  ['!принять', '!accept'],\n  ['!отклонить', '!decline'],")
s=replace(s, "'!dance','!stats','!quest','!feed'", "'!dance','!stats','!feed'")
s=replace(s, 'cmd = commandAliases.get(cmd) ?? cmd;', """cmd = commandAliases.get(cmd) ?? cmd;
if (cmd === '!quest' || cmd === '!accept' || cmd === '!decline') {
  handleQuest(id, p, cmd, messageId, now);
  return;
}""")
s=section(s,"case '!quest':","case '!feed':",'')
s=section(s,'function flushReplies(){','function transferGold(',read('replies.js')+'\n')
s=replace(s,"const gameHelp={pet:", "const gameHelp={quest:rankedQuests.help,pet:")
s=replace(s,'!quest / !квест — 25 XP и 12 золота раз в 2 мин.', '!quest / !квест — приключение. Ранги и правила в !elgame квест.')
s=replace(s,'function gameReply(p,arg,messageId){let line=',"function gameReply(p,arg,messageId){if(arg==='квест')arg='quest';let line=")
s=replace(s,'🐾 Королевство фамильяров Live_El 👑 Команды: !elgame pet — питомцы, !elgame actions — действия и танцы, !elgame style — украшения, !elgame stats — прокачка и золото, !pay @ник сумма — передать золото без комиссии, !elgame boss — битва с боссом, !elgame mod — команды модераторов. Выбирай раздел и развивай своего фамильяра! ❤️',
          '🐾 Королевство фамильяров Live_El. !elgame pet — питомцы, !elgame actions — действия и танцы, !elgame style — украшения, !elgame stats — прокачка и золото, !elgame квест — ранги и награды, !elgame boss — битва с боссом, !elgame mod — модераторы. !pay @ник сумма — перевод без комиссии.')
s=replace(s,'!elgame pet / boss / mod / actions / style / stats — подробности раздела.', '!elgame pet / boss / mod / actions / style / stats — разделы игры. !elgame квест или !elgame quest — ранги и награды.')
s=replace(s,' · !quest / !квест · !attack', ' · !quest / !квест · !accept / !принять · !decline / !отклонить · !attack')
s=replace(s,"if(botName(login)!==botName(authLogin))return false;const now=Date.now();",
          "if(botName(login)!==botName(authLogin))return false;if(/^@[a-z0-9_]+,\\s*📜 Квест · /iu.test(body))return true;const now=Date.now();")
s=replace(s,"chatReady=!!(authLogin&&auth.token);bc.postMessage({kind:'status',connected})",
          "chatReady=!!(authLogin&&auth.token);if(liveWriter){for(const id of [...questMail])queueQuestMail(id);bc.postMessage({kind:'status',connected})}")
s=replace(s,"connected=false;bc.postMessage({kind:'status',connected});setTimeout(connect,5000)", "connected=false;if(liveWriter)bc.postMessage({kind:'status',connected});setTimeout(connect,5000)")
s=replace(s,"sessionCooldowns.clear();persist()}if(m.kind==='request'&&!demo)", "sessionCooldowns.clear();if(liveWriter){flushSave();restoreQuests()}}if(m.kind==='request'&&!demo&&liveWriter)")
s=replace(s,"&&Number.isFinite(v.gold)&&v.gold>=0))throw Error()", "&&Number.isFinite(v.gold)&&v.gold>=0&&rankedQuests.validBook(v.questBook)))throw Error()")
s=replace(s,"},2800)}else connect();wakePetFrame()}", "},2800)}else startLiveGame();wakePetFrame()}")
fp.write_text(s,encoding='utf-8')

cp=Path('chat.html')
s=cp.read_text(encoding='utf-8')
s=replace(s,"  '!quest', '!квест', '!attack',","  '!quest', '!квест', '!accept', '!принять', '!decline', '!отклонить',\n  '!attack',")
s=replace(s,"const commandMessageIds=new Map();", """const familiarAuthKey = 'dance-stream-preview-v1:' + channel + ':auth';
function readFamiliarBotLogin() {
  try { return botName(JSON.parse(localStorage.getItem(familiarAuthKey) || '{}').login); }
  catch { return ''; }
}
let familiarBotLogin = readFamiliarBotLogin();
window.addEventListener('storage', event => {
  if (event.key === familiarAuthKey || event.key === null) familiarBotLogin = readFamiliarBotLogin();
});
const commandMessageIds=new Map();""")
s=replace(s,"const cmd=String(message||'').trim().toLowerCase().split(/\\s+/)[0];\n if(familiarCommands.has(cmd))",
          "if(isFamiliarCommandMessage(message))")
s=replace(s," if(botName(login)!=='live_el')return false;\n", '')
s=replace(s,' // Highest-confidence check: Twitch reply metadata points to a known game command.', """ const sender=botName(login);
 const fromGameBot=sender===channel || sender==='live_el' || sender===familiarBotLogin;
 // A separately hosted chat overlay may not share the game bot's saved login.
 if(mention && (fromGameBot || !familiarBotLogin) && content.startsWith('📜 Квест · '))return true;
 if(!fromGameBot)return false;
 // Highest-confidence check: Twitch reply metadata points to a known game command.""")
cp.write_text(s,encoding='utf-8')

test=Path('.github/scripts/test_quests.mjs');test.write_bytes((parts/'test_quests.mjs').read_bytes())
workflow=Path('.github/workflows/update-version.yml')
w=replace(workflow.read_text(), '      - .github/scripts/update_versions.py', '      - .github/scripts/update_versions.py\n      - .github/scripts/test_quests.mjs')
w=replace(w,'            python3 .github/scripts/update_versions.py','            node .github/scripts/test_quests.mjs\n            python3 .github/scripts/update_versions.py')
workflow.write_text(w)
