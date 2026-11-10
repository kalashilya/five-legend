const fs=require('fs');
const hsh=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const AWP='torzsi ZywOo molodoy woxic sh1ro m0NESY w0nderful 910 device Jame s1mple hallzerk saffee nicoodoz phzy ArtFr0st nqz CeRq faveN headtr1ck hypex luchov slaxz- JamYoung Starry aliStair Rainwaker story JW cmtry'.split(' ');
const IGL='karrigan mezii FalleN kyxsan magixx Boombl4 Aleksib siuhy bLitz huNter- nafany JT tabseN VINI nitr0 INS biguzera stanislaw Stewie2K MUTiRiS sjuush s1n arT npl max exit Magisk'.split(' ');
const STAR={ZywOo:11,donk:12,m0NESY:8,s1mple:10,NiKo:6,ropz:6,sh1ro:6,molodoy:6,XANTARES:5,KSCERATO:5,Spinx:5,flameZ:5,frozen:6,kyousuke:5,'910':5,Senzu:6,Twistzz:6,device:6,stavn:5,blameF:6,torzsi:4,b1t:4,w0nderful:4,xertioN:4,Jimpphat:4,mzinho:5,NAF:4,EliGE:4,Staehr:4,REZ:5,zweih:4,HeavyGod:4,malbsMd:5,Ax1Le:4,yuurih:4,jL:4,iM:3,YEKINDAR:3,rain:4,jabbi:3,Brollan:3,MATYS:3,Jame:3,zont1x:3,Wicadia:3,woxic:3,xKacpersky:3,insani:3,Techno:3,tN1R:3,zorte:3,Magnojez:3,dem0n:3,'KaiR0N-':3,saffee:4,hallzerk:4,jks:5,autimatic:5,Brehze:5,CeRq:5,Grim:4,try:3,dumau:3,S1ren:2,dziugss:2,Krabeni:2,makazze:2,'huNter-':2,NertZ:2,HObbit:2,xiELO:2,FL1T:2,biguzera:3,Magisk:4,JW:5,KRIMZ:5,Sonic:2,tabseN:3,faveN:2,JDC:2,VINI:2,latto:2,lux:2,mezii:2,sjuush:1,bLitz:1,Stewie2K:4,nitr0:3,karrigan:1,FalleN:2,Aleksib:1};
const FIX={ropz:3,jL:2,flameZ:1,YEKINDAR:1,KSCERATO:3,yuurih:2,donk:1,zont1x:3,tN1R:2,NiKo:1,kyousuke:3,TeSeS:2,XANTARES:1,Wicadia:3,Jimpphat:2,Spinx:3,xelex:1,PR:2,b1t:3,iM:1,makazze:2,frozen:3,Twistzz:2,rain:1,NAF:3,EliGE:1,stavn:3,jabbi:1,Staehr:2,Brollan:1,REZ:1,blameF:3,Senzu:1,mzinho:3,Techno:2,Ax1Le:1,zweih:1,HeavyGod:3,MATYS:1,malbsMd:1};
const rows=fs.readFileSync('teams.txt','utf8').trim().split('\n').map(l=>l.split('|'));
const TM=[],PL=[],seen=new Set();const pmax=+rows[0][1],pmin=+rows[rows.length-1][1];
rows.forEach(([rk,pts,name,ros],ti)=>{
  TM.push(name.trim());
  const tb=62+24*Math.pow((pts-pmin)/(pmax-pmin),.75);
  const ps=ros.split(',').map(s=>s.trim()).filter(n=>n&&!seen.has(n.toLowerCase()));
  const role={};for(const n of ps)if(n in FIX)role[n]=FIX[n];let awp=ps.find(n=>AWP.includes(n)),igl=ps.find(n=>IGL.includes(n)&&n!==awp);
  const rest=()=>ps.filter(n=>!(n in role)).sort((a,b)=>hsh(a+'r')-hsh(b+'r'));
  if(!awp)awp=rest()[0]; if(awp)role[awp]=0;
  if(!igl)igl=rest()[0]; if(igl)role[igl]=4;
  {const have=new Set(Object.values(role));const need=[1,2,3].filter(r=>!have.has(r)).concat([1,2,3]);rest().forEach((n,i)=>role[n]=need[i]);}
  for(const n of ps){seen.add(n.toLowerCase());
    let o=tb+((hsh(n)%400)/100-2)+(STAR[n]||0)-(role[n]===4&&!(n in STAR)?2.5:0);
    PL.push([n,ti,role[n],Math.round(Math.max(58,Math.min(96,o)))]);}
});
PL.sort((a,b)=>b[3]-a[3]||a[1]-b[1]);
fs.writeFileSync('data.js','/* Составы: рейтинг Valve Regional Standings от 2 ноября 2026. Показатели карточек рассчитаны игрой, это не статистика HLTV. */\nconst TM='+JSON.stringify(TM)+';\nconst PL='+JSON.stringify(PL)+';\n');
console.log(PL.length,'players',TM.length,'teams',fs.statSync('data.js').size,'bytes');
console.log(PL.slice(0,36).map(p=>p[0]+' '+p[3]).join(', '));
const R=['awp','ent','sup','lrk','igl'];console.log(PL.filter(p=>p[1]<3).map(p=>p[0]+':'+R[p[2]]).join(' '));
