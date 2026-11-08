const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }
const $ = (id) => document.getElementById(id);
const API = (window.YUPI_API || "").replace(/\/$/, "");

/* ---------- Каталог кейсов ---------- */
// c1/c2 — цвета темы, glow — подсветка, fx — плавающие эмодзи на карточке.
// drops: [название, эмодзи, тип]  тип: gift | stars
const CASES = [
  { id:"meloch",  name:"Мелочь",  price:39, img:"assets/case-meloch.png",  c1:"#2b8a5e", c2:"#7be0a8", tag:"Старт для новичка",   fx:["🪙","✨"] },
  { id:"sdacha",  name:"Сдача",   price:49, img:"assets/case-sdacha.png",  c1:"#1f6fd0", c2:"#78b7ff", tag:"Мелочь, но приятно",  fx:["💱","🪙"] },
  { id:"kopilka", name:"Копилка", price:59, img:"assets/case-kopilka.png", c1:"#d0527a", c2:"#ffa3c2", tag:"Копим на крупное",    fx:["🐷","⭐"] },
  { id:"zanachka",name:"Заначка", price:79, img:"assets/case-zanachka.png",c1:"#7a45d6", c2:"#c6a2ff", tag:"Спрятано надёжно",    fx:["💎","✨"] },
  { id:"demon",   name:"Демон кейс", price:350, c1:"#c4161c", c2:"#ff7a4d", bg:"#1a0508", tag:"Хэллоуин и тьма", fx:["🎃","😈","🕯️"], isNew:true,
    emoji:"😈",
    drops:[["Pumpkin · модель 1","🎃","gift"],["Pumpkin · модель 2","🎃","gift"],
           ["Mask · Хэллоуин","🎭","gift"],["Mask · Демон","👹","gift"],["Mask · Ночной ужас","👻","gift"],
           ["Love Potion","🧪","gift"],["Слот 100 ★","⭐","stars"],["Слот 50 ★","⭐","stars"]] },
  { id:"gerakl",  name:"Геракл кейс", price:500, c1:"#c9961a", c2:"#ffe08a", bg:"#1b1405", tag:"Сила и слава героев", fx:["🗽","🔥","🏛️"], isNew:true,
    emoji:"🗽",
    drops:[["Liberty Figure","🗽","gift"],["Torch","🔥","gift"],["Spicy Twine Anaesthesia","🌶️","gift"],
           ["Evil Eye · дешёвая модель","🧿","gift"],["Слот 50 ★","⭐","stars"]] }
];
const catalogs = {
  eggs: {eyebrow:"КОЛЛЕКЦИЯ ЯИЦ",title:"Выбери яйцо",items:[["Classic Egg","🥚","Бесплатно"],["Gold Egg","🌟","30 ★"],["Dragon Egg","🐉","75 ★"],["Crystal Egg","💎","120 ★"]]},
  slots: {eyebrow:"СЛОТЫ • ДЕМО",title:"Игровой зал",items:[["Lucky 7","🎰","Демо"],["Fruit Spin","🍒","Демо"],["Star Spin","⭐","Демо"],["Neon Spin","💜","Демо"]]}
};

/* ---------- Графика для кейсов без картинки ---------- */
function caseSVG(c){
  const id = "g" + c.id;
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="${id}bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${c.c1}" stop-opacity=".75"/><stop offset="1" stop-color="${c.bg}"/></radialGradient>
    <linearGradient id="${id}box" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.c2}"/><stop offset="1" stop-color="${c.c1}"/></linearGradient>
    <linearGradient id="${id}lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="${c.c2}"/></linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#${id}bg)"/>
  <g opacity=".5" stroke="${c.c2}" stroke-width="1.5">${Array.from({length:12},(_,i)=>`<line x1="100" y1="112" x2="${100+150*Math.cos(i*Math.PI/6)}" y2="${112+150*Math.sin(i*Math.PI/6)}" opacity=".25"/>`).join("")}</g>
  <ellipse cx="100" cy="168" rx="62" ry="9" fill="#000" opacity=".4"/>
  <rect x="48" y="104" width="104" height="62" rx="9" fill="url(#${id}box)" stroke="#fff" stroke-opacity=".35"/>
  <rect x="94" y="104" width="12" height="62" fill="#fff" opacity=".28"/>
  <g transform="rotate(-9 100 98)"><rect x="42" y="84" width="116" height="26" rx="9" fill="url(#${id}lid)" stroke="#fff" stroke-opacity=".45"/><rect x="94" y="84" width="12" height="26" fill="#fff" opacity=".35"/></g>
  <text x="100" y="64" font-size="46" text-anchor="middle" style="filter:drop-shadow(0 4px 6px #000a)">${c.emoji}</text>
  <g fill="#fff"><circle cx="30" cy="40" r="2"/><circle cx="170" cy="54" r="2.4"/><circle cx="160" cy="150" r="1.6"/><circle cx="36" cy="140" r="1.8"/></g>
</svg>`;
}
const caseArt = (c) => c.img ? `<img src="${c.img}" alt="${c.name}">` : caseSVG(c);

/* ---------- Рендер ---------- */
function themeStyle(c){ return `--c1:${c.c1};--c2:${c.c2}`; }
function renderCases(){
  $("panelEyebrow").textContent = "КОЛЛЕКЦИЯ КЕЙСОВ";
  $("panelTitle").textContent = "Популярные кейсы";
  $("itemGrid").innerHTML = CASES.map(c => `
    <button class="case-card" data-case="${c.id}" style="${themeStyle(c)}">
      ${c.isNew ? '<span class="badge-new">NEW</span>' : ""}
      <span class="fx fx1">${c.fx[0]}</span><span class="fx fx2">${c.fx[1]}</span>
      <div class="case-art">${caseArt(c)}</div>
      <div class="case-name">${c.name}</div>
      <div class="case-tag">${c.tag}</div>
      <div class="case-price"><span>Открыть</span><b>${c.price} ★</b></div>
    </button>`).join("");
  document.querySelectorAll(".case-card").forEach(el => el.addEventListener("click", () => openCase(el.dataset.case)));
}
function renderSimple(tab){
  const data = catalogs[tab];
  $("panelEyebrow").textContent = data.eyebrow; $("panelTitle").textContent = data.title;
  $("itemGrid").innerHTML = data.items.map(([n,a,p]) => `<button class="item-card" data-item="${n}"><div class="item-art">${a}</div><div class="item-name">${n}</div><div class="item-meta"><small>Посмотреть</small><span>${p}</span></div></button>`).join("");
  document.querySelectorAll(".item-card").forEach(card => card.addEventListener("click", () => showModal("✨", card.dataset.item, "Это демонстрационный экран. Реальные открытия и выдача призов пока не подключены.")));
}
function render(tab="cases"){ tab === "cases" ? renderCases() : renderSimple(tab); }

/* ---------- Экран кейса ---------- */
let current = null, spinning = false;
function openCase(id){
  const c = CASES.find(x => x.id === id); current = c;
  const sheet = $("sheet");
  sheet.style.cssText = themeStyle(c);
  $("sheetArt").innerHTML = caseArt(c);
  $("sheetTitle").textContent = c.name;
  $("sheetTag").textContent = c.tag;
  $("reel").hidden = true; $("reelTrack").innerHTML = ""; $("result").textContent = "";
  $("openBtn").textContent = c.drops ? `Открыть за ${c.price} ★ (демо)` : `Открыть за ${c.price} ★`;
  $("openBtn").disabled = !c.drops;
  const box = $("dropsBox");
  if (c.drops){
    box.hidden = false;
    $("drops").innerHTML = c.drops.map(([n,e,t]) => `<div class="drop ${t}"><span class="drop-e">${e}</span><span class="drop-n">${n}</span></div>`).join("");
    $("sheetNote").textContent = "Демо-режим: анимация не списывает Stars и ничего не выдаёт.";
  } else {
    box.hidden = true;
    $("sheetNote").textContent = "Состав кейса появится после подключения сервера.";
  }
  $("sheetOverlay").classList.add("show");
}
function closeSheet(){ if(!spinning) $("sheetOverlay").classList.remove("show"); }
function demoSpin(){
  if (!current?.drops || spinning) return;
  spinning = true; $("openBtn").disabled = true; $("result").textContent = "";
  const d = current.drops, N = 48, win = 39;
  // Демо: результат выбирается до анимации, зелёная рамка показывает выигрышную зону.
  const prizeIndex = Math.floor(Math.random() * d.length);
  const seq = Array.from({length:N}, () => d[Math.floor(Math.random()*d.length)]);
  seq[win] = d[prizeIndex];
  $("reelTrack").innerHTML = seq.map(([n,e,t],i) => `<div class="reel-item ${t}" data-reel-index="${i}"><span>${e}</span><small>${n}</small></div>`).join("");
  $("reel").hidden = false;
  const track = $("reelTrack"); track.style.transition = "none"; track.style.transform = "translateX(0)";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const item = track.children[win], center = $("reel").clientWidth / 2;
    const target = item.offsetLeft + item.offsetWidth / 2 - center;
    track.style.transition = "transform 5.2s cubic-bezier(.08,.72,.08,1)";
    track.style.transform = `translateX(${-target}px)`;
  }));
  setTimeout(() => {
    const prize = d[prizeIndex], winningItem = track.children[win];
    if (winningItem) winningItem.classList.add("winner");
    $("result").innerHTML = `Выпало в зелёной зоне: <b>${prize[1]} ${prize[0]}</b>`;
    spinning = false; $("openBtn").disabled = false;
    tg?.HapticFeedback?.notificationOccurred?.("success");
  }, 5400);
}

/* ---------- Модалки ---------- */
function showModal(icon,title,text){$("modalIcon").textContent=icon;$("modalTitle").textContent=title;$("modalText").textContent=text;$("modal").classList.add("show")}

/* ---------- Пополнение ---------- */
let topTab = "stars", starsAmt = 100, rubAmt = 500;
const STARS_PRESETS = [50,100,250,500,1000], RUB_PRESETS = [200,500,1000,3000];
function renderTopup(){
  document.querySelectorAll(".tt").forEach(b => b.classList.toggle("active", b.dataset.t === topTab));
  const b = $("topupBody"); $("topupMsg").textContent = "";
  if (topTab === "stars"){
    b.innerHTML = `<p class="hint">Оплата Telegram Stars прямо в приложении.</p>
      <div class="chips">${STARS_PRESETS.map(v => `<button class="chip ${v===starsAmt?"on":""}" data-v="${v}">${v} ★</button>`).join("")}</div>
      <button class="primary-btn wide" id="payGo">Пополнить на ${starsAmt} ★</button>`;
  } else if (topTab === "gifts"){
    b.innerHTML = `<p class="hint">Отправьте подарок боту в личные сообщения — после проверки сервер зачислит его стоимость на баланс.</p>
      <button class="primary-btn wide" id="payGo">Открыть чат с ботом</button>`;
  } else {
    b.innerHTML = `<p class="hint">Оплата в рублях по СБП: откроется страница банка/платёжного сервиса.</p>
      <div class="chips">${RUB_PRESETS.map(v => `<button class="chip ${v===rubAmt?"on":""}" data-v="${v}">${v} ₽</button>`).join("")}</div>
      <label class="field"><span>Своя сумма, ₽</span><input id="rubInput" type="number" inputmode="numeric" min="100" max="50000" value="${rubAmt}"></label>
      <button class="primary-btn wide" id="payGo">Оплатить ${rubAmt} ₽ через СБП</button>`;
    $("rubInput").addEventListener("input", e => { rubAmt = Math.floor(+e.target.value) || 0; $("payGo").textContent = `Оплатить ${rubAmt} ₽ через СБП`; document.querySelectorAll(".chip").forEach(x => x.classList.remove("on")); });
  }
  b.querySelectorAll(".chip").forEach(ch => ch.addEventListener("click", () => { topTab === "stars" ? starsAmt = +ch.dataset.v : rubAmt = +ch.dataset.v; renderTopup(); }));
  $("payGo").addEventListener("click", pay);
}
async function api(path, body){
  const r = await fetch(API + path, {method:"POST", headers:{"Content-Type":"application/json","X-Telegram-Init-Data": tg?.initData || ""}, body: JSON.stringify(body)});
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
async function pay(){
  const msg = $("topupMsg");
  if (topTab === "gifts"){
    const url = "https://t.me/Yupistars_bot";
    tg?.openTelegramLink ? tg.openTelegramLink(url) : window.open(url, "_blank", "noopener"); return;
  }
  if (!API){ msg.textContent = "Платежи ещё не подключены: не задан адрес сервера (YUPI_API)."; return; }
  const amount = topTab === "stars" ? starsAmt : rubAmt;
  if (topTab === "rub" && (amount < 100 || amount > 50000)){ msg.textContent = "Сумма от 100 до 50 000 ₽."; return; }
  $("payGo").disabled = true; msg.textContent = "Создаём счёт…";
  try{
    if (topTab === "stars"){
      const { invoice_link } = await api("/api/topup/stars", { amount });
      tg.openInvoice(invoice_link, st => { msg.textContent = st === "paid" ? "Оплачено. Баланс обновится после подтверждения." : "Оплата не завершена."; });
    } else {
      const { pay_url } = await api("/api/topup/sbp", { amount_rub: amount });
      tg?.openLink ? tg.openLink(pay_url) : window.open(pay_url, "_blank", "noopener");
      msg.textContent = "Завершите оплату в банке — баланс обновится автоматически.";
    }
  } catch { msg.textContent = "Не удалось создать счёт. Попробуйте позже."; }
  finally { $("payGo").disabled = false; }
}

/* ---------- Навигация ---------- */
function setTab(tab){
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  if (tab === "home"){ render("cases"); window.scrollTo({top:0,behavior:"smooth"}); return; }
  render(tab); $("contentPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
$("enterBtn").addEventListener("click", () => { $("welcome").style.display = "none"; try{localStorage.setItem("yupi_seen","1")}catch{} });
try{ if (localStorage.getItem("yupi_seen") === "1") $("welcome").style.display = "none"; }catch{}
$("modalClose").addEventListener("click", () => $("modal").classList.remove("show"));
$("modalOk").addEventListener("click", () => $("modal").classList.remove("show"));
$("sheetClose").addEventListener("click", closeSheet);
$("sheetOverlay").addEventListener("click", e => { if (e.target === $("sheetOverlay")) closeSheet(); });
$("openBtn").addEventListener("click", demoSpin);
$("topupBtn").addEventListener("click", () => { renderTopup(); $("topupOverlay").classList.add("show"); });
$("topupClose").addEventListener("click", () => $("topupOverlay").classList.remove("show"));
$("topupOverlay").addEventListener("click", e => { if (e.target === $("topupOverlay")) $("topupOverlay").classList.remove("show"); });
document.querySelectorAll(".tt").forEach(b => b.addEventListener("click", () => { topTab = b.dataset.t; renderTopup(); }));
function openProfile(){
  const u = tg?.initDataUnsafe?.user || {};
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Гость Yupistars";
  const username = u.username ? "@"+u.username : "не указан";
  showModal("👤","Профиль",`${fullName}\n${username}\nTelegram ID: ${u.id || "доступен после запуска в Telegram"}\n\nБаланс и история операций появятся после подключения защищённого сервера.`);
}
$("profileBtn").addEventListener("click", openProfile);
$("withdrawBtn").addEventListener("click", () => {
  const u = tg?.initDataUnsafe?.user || {};
  $("withdrawUsername").value = u.username ? "@"+u.username : "";
  $("withdrawGift").value = ""; $("withdrawComment").value = "";
  $("withdrawOverlay").classList.add("show");
});
$("withdrawClose").addEventListener("click", () => $("withdrawOverlay").classList.remove("show"));
$("withdrawOverlay").addEventListener("click", e => { if(e.target === $("withdrawOverlay")) $("withdrawOverlay").classList.remove("show"); });
$("sendWithdraw").addEventListener("click", () => {
  const username = $("withdrawUsername").value.trim(), gift = $("withdrawGift").value.trim(), comment = $("withdrawComment").value.trim();
  if (!gift) { $("withdrawGift").focus(); $("withdrawGift").reportValidity(); return; }
  const user = tg?.initDataUnsafe?.user || {};
  const message = ["Здравствуйте! Хочу подать заявку на вывод из Yupistars.", `Telegram: ${username || "не указан"}`, `Telegram ID: ${user.id || "не указан"}`, `Подарок / сумма: ${gift}`, comment ? `Комментарий: ${comment}` : ""].filter(Boolean).join("\n");
  const url = "https://t.me/yupirelayer?text=" + encodeURIComponent(message);
  tg?.openTelegramLink ? tg.openTelegramLink(url) : window.open(url, "_blank", "noopener");
});
render("cases");
