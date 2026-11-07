const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }
const $ = (id) => document.getElementById(id);
const catalogs = {
  cases: {eyebrow:"КОЛЛЕКЦИЯ КЕЙСОВ",title:"Популярные кейсы",items:[
    ["Starter Case","🎁","Бесплатно"],["Star Case","🌟","25 ★"],["Ocean Case","🐬","50 ★"],["Royal Case","👑","100 ★"],["Mystery Case","🪄","150 ★"],["Galaxy Case","🌌","250 ★"]
  ]},
  eggs: {eyebrow:"КОЛЛЕКЦИЯ ЯИЦ",title:"Выбери яйцо",items:[
    ["Classic Egg","🥚","Бесплатно"],["Gold Egg","🌟","30 ★"],["Dragon Egg","🐉","75 ★"],["Crystal Egg","💎","120 ★"]
  ]},
  slots: {eyebrow:"СЛОТЫ • ДЕМО",title:"Игровой зал",items:[
    ["Lucky 7","🎰","Демо"],["Fruit Spin","🍒","Демо"],["Star Spin","⭐","Демо"],["Neon Spin","💜","Демо"]
  ]}
};
function showModal(icon,title,text){$("modalIcon").textContent=icon;$("modalTitle").textContent=title;$("modalText").textContent=text;$("modal").classList.add("show")}
function render(tab="cases"){
  const data=catalogs[tab]; if(!data)return;
  $("panelEyebrow").textContent=data.eyebrow;$("panelTitle").textContent=data.title;
  $("itemGrid").innerHTML=data.items.map(([name,art,price])=>`<button class="item-card" data-item="${name}"><div class="item-art">${art}</div><div class="item-name">${name}</div><div class="item-meta"><small>Посмотреть</small><span>${price}</span></div></button>`).join("");
  document.querySelectorAll(".item-card").forEach(card=>card.addEventListener("click",()=>showModal("✨",card.dataset.item,"Это демонстрационный экран. Реальные открытия, списание Stars и выдача призов пока не подключены.")));
}
function setTab(tab){
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  if(tab==="home"){render("cases");$("panelTitle").textContent="Популярные кейсы";window.scrollTo({top:0,behavior:"smooth"});return}
  render(tab);$("contentPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
$("enterBtn").addEventListener("click",()=>{$("welcome").style.display="none";try{localStorage.setItem("yupi_seen","1")}catch{}});
try{if(localStorage.getItem("yupi_seen")==="1")$("welcome").style.display="none"}catch{}
$("modalClose").addEventListener("click",()=>$("modal").classList.remove("show"));
$("modalOk").addEventListener("click",()=>$("modal").classList.remove("show"));
$("topupBtn").addEventListener("click",()=>showModal("⭐","Пополнение Stars","Здесь будет подключена оплата Telegram Stars. Сейчас это только макет — реальные платежи не принимаются."));
$("profileBtn").addEventListener("click",()=>showModal("👤","Профиль","Профиль и история операций будут подключены после настройки серверной части."));
$("withdrawBtn").addEventListener("click",()=>{
  const message="Здравствуйте! Хочу обсудить заявку на вывод из Yupistars.";
  const url="https://t.me/sexhashuro?text="+encodeURIComponent(message);
  if(tg?.openTelegramLink)tg.openTelegramLink(url);else window.open(url,"_blank","noopener");
});
render("cases");