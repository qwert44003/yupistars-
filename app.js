const tg=window.Telegram?.WebApp;
if(tg){tg.ready();tg.expand();tg.setHeaderColor?.('#0b0a16');tg.setBackgroundColor?.('#0b0a16');}
const API=window.YUPISTARS_API||'';
let category='cases',mode='demo',catalog={},balance=0;
const $=id=>document.getElementById(id);
const headers=()=>({'Content-Type':'application/json','X-Telegram-Init-Data':tg?.initData||''});
const demoCatalog={
 cases:[{id:'starter',name:'Стартовый',price:15,items:[['✨','Искра',4,55],['🍓','Ягодный сюрприз',10,30],['🌙','Лунный свет',25,12],['💎','Легендарный подарок',70,3]]},{id:'neon',name:'Неоновый',price:50,items:[['🟣','Неоновый чип',12,55],['⭐','Звёздный знак',35,30],['👑','Корона',90,12],['💠','Редкий подарок',220,3]]}],
 eggs:[{id:'golden',name:'Золотое яйцо',price:25,items:[['🟡','Золотая точка',7,60],['🐰','Золотой кролик',18,28],['🐉','Дракончик',55,10],['🥚','Королевское яйцо',125,2]]}],
 slots:[{id:'classic',name:'Классические слоты',price:10,items:[['✨','Три искры',3,50],['7️⃣','Счастливая семёрка',9,32],['🏆','Золотой джекпот',28,15],['💎','Мега джекпот',100,3]]}]
};
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2300)}
function localize(){catalog=demoCatalog;render()}
async function request(path,body){const r=await fetch(API+path,{method:body?'POST':'GET',headers:headers(),body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw Error(j.error||'Ошибка');return j}
async function sync(){if(!tg?.initData){$('balance').textContent='—';return}try{const x=await request('/api/me');balance=x.balance;$('balance').textContent=balance}catch(e){$('balance').textContent='—';toast('Открой приложение через Telegram')}}
function render(){
 $('catalog').innerHTML=(catalog[category]||[]).map(box=>`<article class="item"><div class="art"><span class="rarity">LIMITED DROP</span>${category==='cases'?'🎁':category==='eggs'?'🥚':'🎰'}</div><h3>${box.name}</h3><p>${box.items.length} возможных наград • шансы внутри</p><div class="item-foot"><div class="price">${box.price} ⭐ <small>/ прокрутка</small></div><button class="open" data-box="${box.id}">${mode==='demo'?'ДЕМО':'ОТКРЫТЬ'}</button></div><details class="odds"><summary>Призы и вероятности</summary><ul>${box.items.map(x=>`<li>${x[0]} ${x[1]} — ${x[3]}% (оценка ${x[2]} ⭐)</li>`).join('')}</ul></details></article>`).join('');
 document.querySelectorAll('[data-box]').forEach(b=>b.addEventListener('click',()=>roll(b.dataset.box)));
}
function chooseDemo(box){let n=Math.random()*box.items.reduce((a,x)=>a+x[3],0);for(const x of box.items){n-=x[3];if(n<=0)return x}return box.items[0]}
async function roll(id){
 const box=catalog[category].find(x=>x.id===id);if(!box)return;
 if(mode==='demo'){
  const item=chooseDemo(box);showResult(item[0],item[1],true);return;
 }
 if(!tg?.initData){toast('Платное открытие доступно только внутри Telegram');return}
 try{
  const data=await request('/api/roll',{category,boxId:id,mode:'paid'});
  balance=data.balance;$('balance').textContent=balance;showResult(data.item.emoji,data.item.name,false);
 }catch(e){toast(e.message)}
}
function showResult(emoji,name,isDemo){
 $('modalContent').innerHTML=`<div class="eyebrow">${isDemo?'БЕСПЛАТНАЯ ДЕМО-ПРОКРУТКА':'РЕЗУЛЬТАТ ОТКРЫТИЯ'}</div><div class="result-emoji">${emoji}</div><h2>${name}</h2><p>${isDemo?'Это виртуальный результат. Он не является NFT и не добавляется в коллекцию.':'Результат записан в историю. Для получения настоящего подарка подайте заявку администратору, если этот приз доступен к выдаче.'}</p><button class="action" id="resultOk">ПОНЯТНО</button>`;
 $('modal').classList.remove('hidden');$('resultOk').onclick=()=> $('modal').classList.add('hidden');
}
$('close').onclick=()=>$('modal').classList.add('hidden');
$('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;category=b.dataset.tab;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===b));render()});
$('demoMode').onclick=()=>setMode('demo');$('paidMode').onclick=()=>setMode('paid');
function setMode(m){mode=m;$('demoMode').classList.toggle('selected',m==='demo');$('paidMode').classList.toggle('selected',m==='paid');render()}
$('topup').onclick=async()=>{
 $('modalContent').innerHTML=`<div class="eyebrow">ПОПОЛНЕНИЕ БАЛАНСА</div><h2>Игровые звёзды</h2><p>Оплата проводится официальным счётом Telegram Stars. После подтверждения платежа игровые звёзды зачисляются автоматически.</p><div class="price-grid">${[50,100,250,500,1000].map(n=>`<button class="action" data-pack="${n}">${n} ⭐</button>`).join('')}</div>`;
 $('modal').classList.remove('hidden');
 document.querySelectorAll('[data-pack]').forEach(b=>b.onclick=async()=>{try{const r=await request('/api/invoice',{amount:Number(b.dataset.pack)});tg.openInvoice(r.url)}catch(e){toast(e.message)}});
};
$('withdraw').onclick=()=>{
 $('modalContent').innerHTML=`<div class="eyebrow">РУЧНАЯ ВЫДАЧА</div><h2>Заявка на подарок</h2><p>Укажи название приза, который выиграл в платном режиме. Администратор проверит историю и свяжется с тобой.</p><input id="prizeName" placeholder="Название подарка"><button class="action" id="sendWithdraw">ОТПРАВИТЬ ЗАЯВКУ</button>`;
 $('modal').classList.remove('hidden');
 $('sendWithdraw').onclick=async()=>{try{await request('/api/withdrawals',{prizeName:$('prizeName').value});$('modal').classList.add('hidden');toast('Заявка отправлена')}catch(e){toast(e.message)}};
};
localize();sync();
