const E=require('./_t.js');
console.log('cards',E.ALL.length,'pools',E.POOL.map(p=>p.length),'IF',E.IFP.map(p=>p.length),'MVP',E.MVPP.length);
for(const t of ['basic','pro','elite']){const c=[0,0,0,0,0];let sp=0,z=0,d=0;for(let i=0;i<20000;i++)for(const x of E.openPack(t)){c[x.rar]++;if(x.sp)sp++;if(x.nick==='ZywOo')z++;if(x.nick==='donk')d++}console.log(t,c.map(x=>(x/1000).toFixed(2)+'%').join(' '),'special',(sp/1000).toFixed(2)+'%','ZywOo per 1000 packs',(z/20).toFixed(2),'donk',(d/20).toFixed(2))}
// матч: случайная игра против ИИ при равных составах
const mkSq=o=>[0,1,2,3,4].map(r=>({c:E.ALL.filter(x=>x.role===r&&!x.sp).sort((a,b)=>Math.abs(a.ovr-o)-Math.abs(b.ovr-o))[0],lv:1}));
function sim(o,tro,policy,n=3000){let w=0,rounds=0;for(let i=0;i<n;i++){const sq=mkSq(o),m=new E.Match(sq,tro,E.squadInfo(sq).rating);let g=0;while(!m.over&&g++<40){m.play(policy(m))}if(m.won)w++;rounds+=m.round}return (100*w/n).toFixed(1)+'% rounds '+(rounds/n).toFixed(1)}
const none=m=>[];
const rand=m=>{const h=m.a.hand,o=[[]];for(let i=0;i<h.length;i++){o.push([h[i]]);for(let j=i+1;j<h.length;j++)o.push([h[i],h[j]])}const ok=o.filter(x=>m.canPlay(m.a,x));return ok[Math.floor(Math.random()*ok.length)]};
const greedy=m=>{const h=m.a.hand,o=[[]];for(let i=0;i<h.length;i++){o.push([h[i]]);for(let j=i+1;j<h.length;j++)o.push([h[i],h[j]])}const ok=o.filter(x=>m.canPlay(m.a,x)&&!x.includes('eco')&&!x.includes('stack'));return ok.sort((a,b)=>b.reduce((s,k)=>s+E.AC[k].cost,0)-a.reduce((s,k)=>s+E.AC[k].cost,0))[0]||[]};
// «умный»: читает стиль
const smart=m=>{const st=m.style,h=m.a.hand;let want=st==='aggro'?['stack','awp','clutch','nades','timeout']:st==='def'?['nades','fake','awp','star','timeout','clutch']:['tempo','star','awp','clutch','timeout','cross'];let pl=[];for(const k of want){if(h.includes(k)&&m.canPlay(m.a,pl.concat(k)))pl.push(k);if(pl.length===2)break}return pl};
for(const o of [66,75,85]){console.log('ovr',o,'pass',sim(o,(o-64)*40,none),'random',sim(o,(o-64)*40,rand),'greedy',sim(o,(o-64)*40,greedy),'smart',sim(o,(o-64)*40,smart))}
console.log('strong squad 80 at 0 trophies greedy',sim(80,0,greedy),' weak 66 at 800 trophies',sim(66,800,greedy));
// прогресс: 60 матчей жадной игрой, покупка базовых паков
const G=E.newGame();let opened=0;const open=t=>{for(const c of E.openPack(t))E.addCard(G,c.id);opened++};
['basic','pro','pro'].forEach(open);
for(let i=0;i<60;i++){const sq=E.squadOf(G),m=new E.Match(sq,G.tro,E.squadInfo(sq).rating);while(!m.over)m.play(greedy(m));E.applyResult(G,m.won);while(G.coins>=400){G.coins-=400;open('basic')}
 // автосостав: лучший по роли
 for(let r=0;r<5;r++){const best=Object.keys(G.cards).map(id=>E.CARDS[id]).filter(c=>c.role===r).sort((a,b)=>b.ovr-a.ovr)[0];if(best)G.squad[r]=best.id}}
console.log('after 60 matches: trophies',G.tro,'W-L',G.w+'-'+G.l,'lvl',G.lvl,'unique',Object.keys(G.cards).length,'packs opened',opened,'squad rating',E.squadInfo(E.squadOf(G)).rating.toFixed(1),'save bytes',JSON.stringify(G).length);
