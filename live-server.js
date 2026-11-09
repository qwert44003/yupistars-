#!/usr/bin/env node
/* ============================================================================
 * YupiStars LIVE — общий сервер для Краша и PvP-джекпота (без ботов).
 *
 * Запуск:   node live-server.js            (Node 18+, зависимостей нет)
 * Порт:     PORT=8081 (по умолчанию)
 * Telegram: BOT_TOKEN=123:ABC   — включает проверку initData (настоящие ID игроков).
 *           Без токена сервер доверяет id из клиента — только для тестов!
 *
 * Mini App открывается по https, поэтому сервер надо отдать наружу по wss://
 * (nginx / Caddy / Cloudflare Tunnel с TLS), и этот адрес вписать в LIVE_URL
 * в начале скрипта yupistars.html.
 *
 * Честность: перед каждым раундом сервер публикует SHA-256 от секретного seed,
 * после раунда показывает сам seed — игрок может проверить, что результат не менялся.
 * ========================================================================== */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = +process.env.PORT || 8081;
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'live-data.json');
const MIN_BET = 50, MAX_BET = 100000;
const CRASH_EDGE = 0.06;      // комиссия краша (RTP 94%)
const JP_FEE = 0.05;          // комиссия джекпота
const GR = 0.12;              // скорость роста множителя: x = e^(GR*t)  (как в клиенте)
const CR_WAIT = 8000, CR_END = 4500;
const JP_COUNT = 25000, JP_SPIN = 7000, JP_END = 6000;

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const rid = () => crypto.randomBytes(8).toString('hex');
const u52 = seed => parseInt(seed.slice(0, 13), 16) / 2 ** 52;   // [0,1) из seed
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

/* ---------------- ожидающие выплаты (переживают перезапуск) ---------------- */
let pending = {};                                   // pid -> [{ref, amount, kind, meta}]
try { pending = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { pending = {}; }
let saveT = 0;
const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { fs.writeFileSync(DATA_FILE, JSON.stringify(pending)); } catch (e) {} }, 300); };

/* ---------------- WebSocket (RFC 6455, только то что нужно) ---------------- */
const clients = new Set();
const byPid = new Map();                            // pid -> Set(client)

function wsSend(c, obj) {
  if (c.dead) return;
  const data = Buffer.from(JSON.stringify(obj));
  let head;
  if (data.length < 126) head = Buffer.from([0x81, data.length]);
  else if (data.length < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(data.length, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(data.length), 2); }
  try { c.socket.write(Buffer.concat([head, data])); } catch (e) { drop(c); }
}
function wsRaw(c, op, payload) {
  try { c.socket.write(Buffer.concat([Buffer.from([0x80 | op, payload.length]), payload])); } catch (e) { drop(c); }
}
function drop(c) {
  if (c.dead) return; c.dead = true; clients.delete(c);
  if (c.pid && byPid.has(c.pid)) { byPid.get(c.pid).delete(c); if (!byPid.get(c.pid).size) byPid.delete(c.pid); }
  try { c.socket.destroy(); } catch (e) {}
  sendOnline();
}
function parseFrames(c) {
  for (;;) {
    const b = c.buf;
    if (b.length < 2) return;
    const op = b[0] & 0x0f, fin = !!(b[0] & 0x80), masked = !!(b[1] & 0x80);
    let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
    if (len > 8192) return drop(c);
    if (!masked) return drop(c);                    // клиент обязан маскировать
    if (b.length < off + 4 + len) return;
    const mask = b.slice(off, off + 4);
    const pl = Buffer.from(b.slice(off + 4, off + 4 + len));
    for (let i = 0; i < pl.length; i++) pl[i] ^= mask[i & 3];
    c.buf = b.slice(off + 4 + len);
    if (op === 8) { try { c.socket.end(Buffer.from([0x88, 0])); } catch (e) {} return drop(c); }
    if (op === 9) { wsRaw(c, 10, pl); continue; }
    if (op === 10) { c.alive = true; continue; }
    if (op === 1 || op === 0) {
      c.frag = op === 1 ? [pl] : (c.frag || []).concat([pl]);
      if (fin) { const txt = Buffer.concat(c.frag).toString('utf8'); c.frag = null; onMessage(c, txt); }
    }
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true, online: onlineCount() })); }
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); res.end('YupiStars live server');
});
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') return socket.destroy();
  const acc = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
  socket.setNoDelay(true);
  const c = { socket, buf: Buffer.alloc(0), pid: null, name: '', ava: '', alive: true, dead: false, hits: 0, hitT: Date.now() };
  clients.add(c);
  socket.on('data', d => { c.buf = Buffer.concat([c.buf, d]); parseFrames(c); });
  socket.on('close', () => drop(c)); socket.on('error', () => drop(c));
});
setInterval(() => { for (const c of clients) { if (!c.alive) { drop(c); continue; } c.alive = false; wsRaw(c, 9, Buffer.alloc(0)); } }, 25000);

/* ---------------- Telegram initData ---------------- */
function verifyInit(init) {
  if (!BOT_TOKEN) return null;
  try {
    const p = new URLSearchParams(init); const hash = p.get('hash'); if (!hash) return null; p.delete('hash');
    const data = [...p.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v]) => k + '=' + v).join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    if (crypto.createHmac('sha256', secret).update(data).digest('hex') !== hash) return null;
    if (Date.now() / 1000 - (+p.get('auth_date') || 0) > 86400 * 2) return null;
    return JSON.parse(p.get('user'));
  } catch (e) { return null; }
}

/* ---------------- рассылка ---------------- */
const bcast = obj => { for (const c of clients) if (c.pid) wsSend(c, obj); };
const onlineCount = () => byPid.size;
let onT = 0;
function sendOnline() { clearTimeout(onT); onT = setTimeout(() => bcast({ t: 'online', n: onlineCount() }), 400); }
function toPid(pid, obj) { const s = byPid.get(pid); if (s) for (const c of s) wsSend(c, obj); }

function pay(pid, amount, kind, meta) {
  amount = Math.floor(amount); if (amount <= 0) return;
  const p = { ref: rid(), amount, kind, meta: meta || {} };
  (pending[pid] = pending[pid] || []).push(p); persist();
  toPid(pid, { t: 'payout', ...p });
}

/* ---------------- КРАШ ---------------- */
const crash = { phase: 'wait', rid: 0, start: 0, hash: '', seed: '', cp: 1, bets: new Map(), hist: [], timers: [] };
const crMult = () => Math.exp(GR * (Date.now() - crash.start) / 1000);
function crSnap() {
  const list = [...crash.bets.values()];
  const shown = list.sort((a, b) => b.bet - a.bet).slice(0, 80).map(b => ({ id: b.id, name: b.name, ava: b.ava, bet: b.bet, cash: b.cash || 0, auto: b.auto || 0 }));
  const s = {
    t: 'c.state', now: Date.now(), phase: crash.phase, rid: crash.rid, start: crash.start, hash: crash.hash,
    bets: shown, n: list.length, sum: list.reduce((q, b) => q + b.bet, 0), hist: crash.hist.slice(0, 14)
  };
  if (crash.phase === 'end') { s.cp = crash.cp; s.seed = crash.seed; }
  return s;
}
let crDirty = 0;
function crPush(now) { if (now) { clearTimeout(crDirty); crDirty = 0; return bcast(crSnap()); } if (!crDirty) crDirty = setTimeout(() => { crDirty = 0; bcast(crSnap()); }, 120); }

function crNew() {
  clearInterval(crash.iv); crash.timers.forEach(clearTimeout); crash.timers = [];
  crash.rid++; crash.seed = crypto.randomBytes(16).toString('hex'); crash.hash = sha(crash.seed);
  crash.cp = Math.max(1, Math.floor(100 * (1 - CRASH_EDGE) / (1 - u52(crash.seed))) / 100);
  crash.bets.clear(); crash.phase = 'wait'; crash.start = Date.now() + CR_WAIT;
  crPush(true);
  crash.timers.push(setTimeout(crRun, CR_WAIT));
}
function crRun() {
  crash.phase = 'run'; crash.start = Date.now();
  crPush(true);
  const tEnd = Math.log(crash.cp) / GR * 1000;
  const iv = setInterval(() => {                                   // авто-вывод
    const m = crMult();
    for (const b of crash.bets.values()) if (!b.cash && b.auto && b.auto <= m && b.auto <= crash.cp) crCash(b, b.auto);
  }, 40);
  crash.iv = iv;
  crash.timers.push(setTimeout(crEnd, tEnd));
}
function crCash(b, mult) {
  if (b.cash) return;
  b.cash = Math.floor(mult * 100) / 100;
  pay(b.id, Math.floor(b.bet * b.cash), 'c.win', { mult: b.cash, bet: b.bet });
  crPush();
}
function crEnd() {
  clearInterval(crash.iv);
  crash.phase = 'end';
  crash.hist.unshift(crash.cp); crash.hist = crash.hist.slice(0, 14);
  crPush(true);
  crash.timers.push(setTimeout(crNew, CR_END));
}

/* ---------------- ДЖЕКПОТ (PvP) ---------------- */
const jp = { phase: 'wait', rid: 0, bets: new Map(), end: 0, hash: '', seed: '', r: 0, hist: [], winner: null, prize: 0, pot: 0, spinAt: 0, timers: [] };
function jpSnap() {
  const list = [...jp.bets.values()];
  const s = {
    t: 'j.state', now: Date.now(), phase: jp.phase, rid: jp.rid, hash: jp.hash, end: jp.end,
    bets: list.map(b => ({ id: b.id, name: b.name, ava: b.ava, bet: b.bet })),
    pot: list.reduce((q, b) => q + b.bet, 0), hist: jp.hist.slice(0, 10)
  };
  if (jp.phase === 'spin' || jp.phase === 'end') { s.r = jp.r; s.seed = jp.seed; s.winner = jp.winner; s.prize = jp.prize; s.spinAt = jp.spinAt; s.fee = JP_FEE; }
  return s;
}
let jpDirty = 0;
function jpPush(now) { if (now) { clearTimeout(jpDirty); jpDirty = 0; return bcast(jpSnap()); } if (!jpDirty) jpDirty = setTimeout(() => { jpDirty = 0; bcast(jpSnap()); }, 120); }
function jpNew() {
  jp.timers.forEach(clearTimeout); jp.timers = [];
  jp.rid++; jp.seed = crypto.randomBytes(16).toString('hex'); jp.hash = sha(jp.seed); jp.r = u52(jp.seed);
  jp.bets.clear(); jp.phase = 'wait'; jp.end = 0; jp.winner = null; jp.prize = 0;
  jpPush(true);
}
function jpSpin() {
  const list = [...jp.bets.values()], pot = list.reduce((q, b) => q + b.bet, 0);
  if (list.length < 2) { jp.phase = 'wait'; jp.end = 0; jpPush(true); return; }
  let acc = 0, w = list[list.length - 1]; const target = jp.r * pot;
  for (const b of list) { acc += b.bet; if (target < acc) { w = b; break; } }
  jp.winner = { id: w.id, name: w.name, ava: w.ava, bet: w.bet };
  jp.prize = Math.floor(pot * (1 - JP_FEE)); jp.phase = 'spin'; jp.spinAt = Date.now();
  jpPush(true);
  jp.timers.push(setTimeout(() => {
    jp.phase = 'end';
    pay(w.id, jp.prize, 'j.win', { pot, bet: w.bet });
    jp.hist.unshift({ name: w.name, prize: jp.prize, pot }); jp.hist = jp.hist.slice(0, 10);
    jpPush(true);
    jp.timers.push(setTimeout(jpNew, JP_END));
  }, JP_SPIN));
}

/* ---------------- сообщения клиентов ---------------- */
const fail = (c, g, msg) => wsSend(c, { t: 'err', g, msg });
const validAmt = a => Number.isInteger(a) && a >= MIN_BET && a <= MAX_BET;

function onMessage(c, txt) {
  const now = Date.now();
  if (now - c.hitT > 1000) { c.hitT = now; c.hits = 0; }
  if (++c.hits > 20) return;                                       // анти-флуд
  let m; try { m = JSON.parse(txt); } catch (e) { return; }
  if (!m || typeof m.t !== 'string') return;

  if (m.t === 'hello') {
    if (c.pid) return;
    let id = '', name = '', ava = '';
    if (BOT_TOKEN) {
      const u = verifyInit(String(m.init || ''));
      if (!u) return wsSend(c, { t: 'err', g: '', msg: 'Не удалось подтвердить Telegram-аккаунт' });
      id = String(u.id); name = clean([u.first_name, u.last_name].filter(Boolean).join(' ') || u.username, 24); ava = u.photo_url || '';
    } else { id = clean(m.id, 24).replace(/[^\w-]/g, ''); name = clean(m.name, 24); ava = String(m.ava || ''); }
    if (!id) return;
    if (!/^https:\/\/[\w.\-\/%?=&]{4,300}$/.test(ava)) ava = '';
    c.pid = id; c.name = name || 'Игрок ' + id.slice(-4); c.ava = ava;
    if (!byPid.has(id)) byPid.set(id, new Set()); byPid.get(id).add(c);
    wsSend(c, { t: 'welcome', now: Date.now(), online: onlineCount() });
    wsSend(c, crSnap()); wsSend(c, jpSnap());
    for (const p of pending[id] || []) wsSend(c, { t: 'payout', ...p });
    sendOnline();
    return;
  }
  if (!c.pid) return;

  if (m.t === 'ack') { const L = pending[c.pid]; if (L) { pending[c.pid] = L.filter(p => p.ref !== m.ref); if (!pending[c.pid].length) delete pending[c.pid]; persist(); } return; }

  /* --- краш --- */
  if (m.t === 'c.bet') {
    const a = Math.floor(+m.amount);
    if (crash.phase !== 'wait') return fail(c, 'c', 'Ставки принимаются между раундами');
    if (!validAmt(a)) return fail(c, 'c', 'Ставка от ' + MIN_BET + ' до ' + MAX_BET + ' ★');
    if (crash.bets.has(c.pid)) return fail(c, 'c', 'Ставка уже сделана');
    let auto = +m.auto || 0; if (!(auto >= 1.01 && auto <= 1000)) auto = 0; auto = Math.floor(auto * 100) / 100;
    crash.bets.set(c.pid, { id: c.pid, name: c.name, ava: c.ava, bet: a, cash: 0, auto });
    wsSend(c, { t: 'c.ok', amount: a }); crPush(); return;
  }
  if (m.t === 'c.cancel') {
    const b = crash.bets.get(c.pid);
    if (crash.phase !== 'wait' || !b) return;
    crash.bets.delete(c.pid); pay(c.pid, b.bet, 'refund', { g: 'c' }); crPush(); return;
  }
  if (m.t === 'c.cash') {
    const b = crash.bets.get(c.pid);
    if (crash.phase !== 'run' || !b || b.cash) return;
    const x = crMult();
    if (x >= crash.cp) return;                                     // уже взорвалось
    crCash(b, x); return;
  }

  /* --- джекпот --- */
  if (m.t === 'j.bet') {
    const a = Math.floor(+m.amount);
    if (jp.phase !== 'wait' && jp.phase !== 'count') return fail(c, 'j', 'Ставки закрыты, дождись нового раунда');
    if (!validAmt(a)) return fail(c, 'j', 'Ставка от ' + MIN_BET + ' до ' + MAX_BET + ' ★');
    const cur = jp.bets.get(c.pid);
    if (cur && cur.bet + a > MAX_BET) return fail(c, 'j', 'Максимум в раунде — ' + MAX_BET + ' ★');
    if (cur) cur.bet += a; else jp.bets.set(c.pid, { id: c.pid, name: c.name, ava: c.ava, bet: a });
    if (jp.phase === 'wait' && jp.bets.size >= 2) {
      jp.phase = 'count'; jp.end = Date.now() + JP_COUNT;
      jp.timers.push(setTimeout(jpSpin, JP_COUNT));
      wsSend(c, { t: 'j.ok', amount: a }); return jpPush(true);
    }
    wsSend(c, { t: 'j.ok', amount: a }); jpPush(); return;
  }
  if (m.t === 'j.cancel') {
    const b = jp.bets.get(c.pid);
    if (jp.phase !== 'wait' || !b) return fail(c, 'j', 'Отменить можно, пока нет соперников');
    jp.bets.delete(c.pid); pay(c.pid, b.bet, 'refund', { g: 'j' }); jpPush(); return;
  }
}

crNew(); jpNew();
server.listen(PORT, () => console.log('YupiStars live-сервер запущен на порту ' + PORT + (BOT_TOKEN ? ' (проверка Telegram включена)' : ' (ТЕСТОВЫЙ режим, без проверки Telegram)')));
