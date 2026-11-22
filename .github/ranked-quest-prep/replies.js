function makeReplyLine(login, message, messageId) {
  const tag = /^[a-zA-Z0-9-]+$/.test(messageId || '') ? '@reply-parent-msg-id=' + messageId + ' ' : '';
  const body = 'PRIVMSG #' + channel + ' :@' + login + ', ' + message.replace(/[\r\n\0]+/g, ' ');
  return tag + body;
}
function sendTwitchLine(socket, line) {
  socket.send(line);
  rememberOwnReply(line);
}
function enqueueTwitchReply(item) {
  replyQueue.push(item);
  if (replyTimer === null) replyTimer = setTimeout(flushReplies, 0);
}
function flushReplies() {
  const item = replyQueue.shift();
  if (item && liveWriter && item.socket === chatSocket && chatReady && item.socket.readyState === 1) {
    try {
      if (item.deliver) item.deliver();
      else sendTwitchLine(item.socket, item.line);
    } catch { item.socket.close(); }
  }
  replyTimer = replyQueue.length ? setTimeout(flushReplies, 1600) : null;
}
function commandReply(p, message, messageId) {
  const login = String(p.login || p.nick || 'viewer').replace(/[^a-zA-Z0-9_]/g, '') || 'viewer';
  if (demo) { showHelp(['@' + login + ', ' + message]); return; }
  if (!liveWriter || !chatReady || !authLogin || chatSocket?.readyState !== 1) return;
  enqueueTwitchReply({ socket: chatSocket, line: makeReplyLine(login, message, messageId) });
}
