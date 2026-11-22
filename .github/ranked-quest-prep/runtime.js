// Deadlines belong to persistent viewer records, not transient on-screen pets.
const questTimers = new Map();
const questMail = new Set();
const queuedQuestMail = new Map();

function armQuestTimer(id) {
  clearTimeout(questTimers.get(id));
  questTimers.delete(id);
  const due = data[id]?.questBook?.current?.due;
  if (!liveWriter || !due) return;
  const delay = Math.max(0, Math.min(2147483647, due - Date.now()));
  questTimers.set(id, setTimeout(() => {
    questTimers.delete(id);
    if (liveWriter && !settleQuest(id, Date.now())) armQuestTimer(id);
  }, delay));
}

function questMutation(id, oldLevel) {
  // Store the balance, the quest transition and its notification together.
  if (!demo) flushSave();
  const p = pets.get(id);
  if (p && p.d === data[id]) {
    render(p);
    if (level(p.d) > oldLevel) fx(p, '✦ Новый уровень!');
  }
  armQuestTimer(id);
  queueQuestMail(id);
}

function settleQuest(id, now) {
  const d = data[id];
  if (!d?.questBook?.current) return false;
  const before = level(d);
  if (!rankedQuests.advance(d, now)) return false;
  questMutation(id, before);
  return true;
}

function handleQuest(id, p, cmd, messageId, now) {
  if (!liveWriter) return;
  if (settleQuest(id, now) && cmd !== '!quest') return;
  const d = p.d, before = level(d);
  const result = rankedQuests.command(d, cmd, before, now, messageId);
  if (result.changed) questMutation(id, before);
  else if (result.text) {
    const text = rankedQuests.prefix + result.text;
    if (!demo && !authLogin && !readAuth().login) showSpeech(p, text, '', text.length);
    else commandReply(p, text, messageId);
  }
}

function queueQuestMail(id) {
  const d = data[id], note = d?.questBook?.notes[0];
  if (!note) { questMail.delete(id); queuedQuestMail.delete(id); return; }
  questMail.add(id);
  if (!liveWriter) return;
  const login = String(d.login || d.nick || 'viewer').replace(/[^a-z0-9_]/gi, '') || 'viewer';
  const text = rankedQuests.prefix + note.text;
  function acknowledge() {
    rankedQuests.delivered(d, note, Date.now());
    if (!demo) flushSave();
    if (note.offer) armQuestTimer(id);
    queueQuestMail(id);
  }
  const auth = readAuth();
  if (demo || !auth?.login || !auth.token) {
    // Read-only Twitch connections can still play via the on-screen familiar.
    if (demo) showHelp(['@' + login + ', ' + text]);
    else if (pets.has(id)) showSpeech(pets.get(id), text, '', text.length);
    else announce('@' + login + ', ' + text);
    acknowledge();
    return;
  }
  if (!chatReady || chatSocket?.readyState !== 1) return;
  const socket = chatSocket;
  const queued = queuedQuestMail.get(id);
  if (queued?.note === note && queued.socket === socket) return;
  queuedQuestMail.set(id, { note, socket });
  enqueueTwitchReply({ socket, deliver() {
    // Imports, reconnects or losing the writer lock can invalidate queued work.
    if (data[id] !== d || d.questBook?.notes[0] !== note) return;
    sendTwitchLine(socket, makeReplyLine(login, text, note.replyId));
    queuedQuestMail.delete(id);
    acknowledge();
  }});
}

function stopQuestTimers() {
  for (const timer of questTimers.values()) clearTimeout(timer);
  questTimers.clear();
  questMail.clear();
  queuedQuestMail.clear();
}

function restoreQuests() {
  stopQuestTimers();
  if (!liveWriter) return;
  const now = Date.now();
  for (const [id, d] of Object.entries(data)) {
    if (!d?.questBook) continue;
    if (!settleQuest(id, now)) { armQuestTimer(id); queueQuestMail(id); }
  }
}

function adoptSavedRoster(raw) {
  if (!raw) return;
  let saved;
  try { saved = JSON.parse(raw); } catch { return; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
  for (const [id, p] of pets) {
    if (p.isDemo) continue;
    if (saved[id]) { p.d = saved[id]; render(p); }
    else saved[id] = p.d;
  }
  data = saved;
}

function startLiveGame() {
  // OBS can have several live browser sources for one channel. All render chat,
  // but only one writes the shared economy or sends bot replies and quest results.
  let started = false, controller;
  const connectOnce = () => { if (!started) { started = true; connect(); } };
  function startWriter() {
    try { adoptSavedRoster(localStorage.getItem(key)); } catch { /* Storage unavailable. */ }
    liveWriter = true;
    restoreQuests();
    connectOnce();
  }
  async function elect() {
    controller = new AbortController();
    const signal = controller.signal;
    if (!navigator.locks?.request) { startWriter(); return; }
    const name = key + ':game-writer';
    async function own() {
      startWriter();
      await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
    }
    try {
      await navigator.locks.request(name, { ifAvailable: true }, lock => {
        if (signal.aborted) return;
        if (lock) return own();
        connectOnce();
      });
      if (!signal.aborted) await navigator.locks.request(name, { signal }, own);
    } catch (error) {
      if (!signal.aborted && error.name === 'SecurityError') startWriter();
      else if (!signal.aborted) console.error('OBS writer lock failed', error);
    }
  }
  window.addEventListener('storage', event => {
    if (!liveWriter && event.key === key) adoptSavedRoster(event.newValue);
  });
  window.addEventListener('pagehide', () => {
    if (liveWriter && saveTimer !== null) flushSave();
    liveWriter = false;
    stopQuestTimers();
    controller?.abort();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) elect(); });
  elect();
}
