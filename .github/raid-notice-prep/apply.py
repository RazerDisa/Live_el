from pathlib import Path
def change(s,old,new):
 assert s.count(old)==1,old[:60]
 return s.replace(old,new)
p=Path('familiars.html')
s=p.read_text()
a="function commandReply(p, message, messageId)"
s=change(s,a,"""const pendingRaidNotices = [];
function notifyRaid(message) {
  announce(message);
  if (demo || admin || !liveWriter) return;
  const auth = readAuth();
  if (!auth.login || !auth.token) return;
  pendingRaidNotices.push({ message, socket: null });
  sendPendingRaidNotices();
}
function sendPendingRaidNotices() {
  if (!liveWriter || !chatReady || chatSocket?.readyState !== 1) return;
  const socket = chatSocket;
  for (const notice of pendingRaidNotices) {
    if (notice.socket === socket) continue;
    notice.socket = socket;
    enqueueTwitchReply({ socket, deliver() {
      sendTwitchLine(socket, 'PRIVMSG #' + channel + ' :' + notice.message);
      pendingRaidNotices.shift();
    } });
  }
}
"""+a)
s=change(s,"if(liveWriter){for(const id of [...questMail])","if(liveWriter){sendPendingRaidNotices();for(const id of [...questMail])")
s=change(s,"announce('⚔ Начался рейд! Босс — «'+type.name+'».')","notifyRaid('⚔ Начался рейд! Босс — «'+type.name+'». В бой! !атака или !ульта.')")
s=change(s,"announce('✦ Победа над боссом «'+defeatedName+'»! Награда участникам: 35 золота')","notifyRaid('🏆 Рейд завершён! Босс «'+defeatedName+'» повержен! Награда участникам — 35 золота и 60 XP.')")
s=change(s,"announce('Рейд завершён. Босс «'+name+'» отступает: нет активных фамильяров.')","notifyRaid('⌛ Рейд завершён. Босс «'+name+'» не был повержен. В бою не осталось фамильяров.')")
s=change(s,"announce('Время рейда истекло. Босс «'+name+'» отступает.')","notifyRaid('⌛ Рейд завершён. Босс «'+name+'» не был повержен. Время рейда истекло.')")
p.write_text(s)
p=Path('chat.html')
s=p.read_text()
s=change(s," if(!fromGameBot)return false;", """ // Public raid notices have no recipient or Twitch reply metadata.
 if ((fromGameBot || !familiarBotLogin) && /^(?:⚔ Начался рейд! Босс — «[^»]+»\\. В бой! !атака или !ульта\\.|🏆 Рейд завершён! Босс «[^»]+» повержен! Награда участникам — 35 золота и 60 XP\\.|⌛ Рейд завершён\\. Босс «[^»]+» не был повержен\\. (?:Время рейда истекло|В бою не осталось фамильяров)\\.)$/u.test(body)) return true;
 if(!fromGameBot)return false;""")
p.write_text(s)
