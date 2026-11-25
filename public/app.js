(function(){
'use strict';
var TEAMS = {
  D:[{name:'팀시온',members:['이병주','신대섭','최시온']},{name:'팀지수',members:['김진혁','서인원','신지수']},{name:'팀경일',members:['이후탁','현강환','김경일']},{name:'팀문석',members:['오지훈','정동헌','최문석']},{name:'팀태형',members:['한상욱','김선민','김태형']}],
  P:[{name:'팀가영',members:['이명운','안경주','김가영']},{name:'팀대훈',members:['문성록','염준호','이대훈']},{name:'팀선우',members:['김소연','이석주','이선우']},{name:'팀근규',members:['송이정','강승두','박근규']},{name:'팀재호',members:['윤동철','박  민','김재호']}]
};
var LG = {D:'D리그',P:'P리그',WC:'와카전',SF:'4강전',F:'결승전'};
var TAG = {D:'D',P:'P',WC:'와카',SF:'4강',F:'결승'};
var TBD = '미정';
var COURSES = ['스릭슨브레이브(스릭슨/젝시오)','포도cc(포도/자두)','스카이뷰cc','장수cc','하이원cc','세종에머슨cc(레이크/밸리)','소피아그린(세종/여강)','골프존카운티 안성H'];
var WHEEL_LABEL = ['스릭슨브레이브','포도cc','스카이뷰cc','장수cc','하이원cc','세종에머슨cc','소피아그린','안성H'];
function lastSpin(){try{return JSON.parse(localStorage.getItem('dpga-spin')||'null');}catch(_){return null;}}
/* Each team excludes up to 2 courses, or picks 'none' (코스제외없음). null = not chosen yet. */
var NONE = 'none';
var ex = [null, null];
(function(){var l=lastSpin();if(l&&Array.isArray(l.ex)&&l.ex.length===2)ex=l.ex;})();
function pool(){var out=[];for(var i=0;i<COURSES.length;i++){if(!exList(0).concat(exList(1)).some(function(x){return x===i;}))out.push(i);}return out;}
function exList(t){return Array.isArray(ex[t])?ex[t]:[];}
function restRot(){var l=lastSpin(),pl=pool(),seg=360/pl.length,k=l?pl.indexOf(COURSES.indexOf(l.course)):-1;return k<0?-seg/2:-(k*seg+seg/2);}
var wheelRot = restRot(), spinning = false;
function saveSpin(v){try{localStorage.setItem('dpga-spin',JSON.stringify(v));}catch(_){}}
function isPO(lg){return lg==='WC'||lg==='SF'||lg==='F';}
function kls(lg){return isPO(lg)?'K':lg;}
function teamInfo(n){var all=TEAMS.D.concat(TEAMS.P);return all.filter(function(t){return t.name===n;})[0];}
function teamOpts(lg,sel){
  function o(n){return '<option'+(n===sel?' selected':'')+'>'+esc(n)+'</option>';}
  if(!isPO(lg))return TEAMS[lg].map(function(t){return o(t.name);}).join('');
  return o(TBD)+'<optgroup label="D리그">'+TEAMS.D.map(function(t){return o(t.name);}).join('')+'</optgroup><optgroup label="P리그">'+TEAMS.P.map(function(t){return o(t.name);}).join('')+'</optgroup>';
}
var S = {matches:[]}, loaded=false, loadErr='', month=null, openId=null, armDel=false, busy=false;
var app = document.getElementById('app');

function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function short(n){return n.replace(/^팀/,'');}
function pad(n){return (n<10?'0':'')+n;}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function sorted(){return S.matches.slice().sort(function(x,y){return (x.date+x.time).localeCompare(y.date+y.time);});}
function wd(ds){var d=new Date(ds+'T00:00:00');return '일월화수목금토'[d.getDay()];}
function mmdd(ds){return ds.slice(5,7)+'-'+ds.slice(8,10);}
function korTime(t){var h=+t.slice(0,2),m=+t.slice(3,5);return h+'시'+(m?m+'분':'');}
function winner(m){return m.r==='A'?m.a:m.r==='B'?m.b:null;}
function byId(id){return S.matches.filter(function(x){return x.id===id;})[0];}

/* PIN: kept only in this browser for convenience */
function getPin(){try{return localStorage.getItem('dpga-pin')||'';}catch(_){return '';}}
function setPin(p){try{if(p)localStorage.setItem('dpga-pin',p);else localStorage.removeItem('dpga-pin');}catch(_){}}

function standings(lg){
  var rows=TEAMS[lg].map(function(t,i){return {name:t.name,members:t.members,w:0,d:0,l:0,i:i};});
  var by={}; rows.forEach(function(r){by[r.name]=r;});
  S.matches.forEach(function(m){
    if(m.lg!==lg||!m.r||!by[m.a]||!by[m.b])return;
    if(m.r==='D'){by[m.a].d++;by[m.b].d++;}
    else {var w=m.r==='A'?m.a:m.b,l=m.r==='A'?m.b:m.a;by[w].w++;by[l].l++;}
  });
  rows.forEach(function(r){r.pt=r.w*3+r.d;});
  function cmp(x,y){return (y.pt-x.pt)||(y.w-x.w)||(x.l-y.l);}
  rows.sort(function(x,y){return cmp(x,y)||(x.i-y.i);});
  rows.forEach(function(r){r.rank=1+rows.filter(function(o){return cmp(o,r)<0;}).length;});
  return rows;
}

function noticeText(){
  var out=[];
  ['D','P'].forEach(function(lg){
    out.push('-'+(lg==='D'?'디':'피')+'리그(순위.팀명/팀원/승/무/패-승점)-');
    standings(lg).forEach(function(r){out.push(r.rank+'.'+r.name+'   '+r.members.join('   ')+' ('+r.w+'/'+r.d+'/'+r.l+'-'+r.pt+'점)');});
    out.push('');
  });
  out.push('*경기일정&결과 (리그/팀1vs팀2/일자/시간/결과)');
  sorted().forEach(function(m){
    var res=m.r==='D'?'(무승부)':m.r?'('+winner(m)+' 승)':'';
    out.push('-'+LG[m.lg]+'/'+m.a+'vs'+m.b+'/'+mmdd(m.date)+'/'+korTime(m.time)+res);
  });
  return out.join('\n');
}

function vsHtml(m){
  var w=winner(m);
  function nm(n){var c=!m.r||m.r==='D'?'':(n===w?'wn':'ls');return '<span class="'+c+'">'+esc(n)+'</span>';}
  return nm(m.a)+'<span class="x">vs</span>'+nm(m.b);
}
function resultPill(m){
  if(m.r==='D')return '<span class="pill draw">무승부</span>';
  if(m.r)return '<span class="pill done">'+esc(short(winner(m)))+' 승</span>';
  if(m.a===TBD||m.b===TBD)return '<span class="pill wait">팀 미정</span>';
  return '<span class="pill go">결과 입력</span>';
}
function monthsAvail(){
  var set={'2026-11':1,'2026-12':1}; S.matches.forEach(function(m){set[m.date.slice(0,7)]=1;});
  return Object.keys(set).sort();
}

function calendarHtml(){
  var ms=monthsAvail(); if(ms.indexOf(month)<0)month=ms[0];
  var y=+month.slice(0,4),mo=+month.slice(5,7);
  var first=new Date(y,mo-1,1),start=new Date(y,mo-1,1-first.getDay());
  var last=new Date(y,mo,0),cells=Math.ceil((first.getDay()+last.getDate())/7)*7;
  var byDate={}; sorted().forEach(function(m){(byDate[m.date]=byDate[m.date]||[]).push(m);});
  var t=todayStr(),h='';
  ['일','월','화','수','목','금','토'].forEach(function(d,i){h+='<div class="dow'+(i===0?' sun':i===6?' sat':'')+'">'+d+'</div>';});
  for(var i=0;i<cells;i++){
    var d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
    var ds=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
    h+='<div class="day'+(d.getMonth()!==mo-1?' out':'')+(ds===t?' today':'')+'"><span class="n">'+d.getDate()+'</span>';
    (byDate[ds]||[]).forEach(function(m){
      var w=winner(m),inner;
      var N=function(n,c){return '<span class="nm'+(c?' '+c:'')+'">'+esc(short(n))+'</span>';};
      if(m.r==='D')inner=N(m.a)+'·<wbr>'+N(m.b)+' <span class="dw nm">무</span>';
      else if(m.r)inner='<span class="wn nm">'+esc(short(w))+' 승</span> '+N(w===m.a?m.b:m.a,'ls');
      else inner=N(m.a)+'·<wbr>'+N(m.b);
      h+='<button class="chip '+kls(m.lg)+'" data-id="'+esc(m.id)+'" aria-label="'+esc(LG[m.lg]+' '+m.a+' 대 '+m.b)+'"><span class="t">'+TAG[m.lg]+' '+m.time+'</span>'+inner+'</button>';
    });
    h+='</div>';
  }
  var idx=ms.indexOf(month);
  return '<div class="cal"><div class="cal-top"><button class="navb" data-nav="-1" aria-label="이전 달"'+(idx<=0?' disabled':'')+'>‹</button><strong>'+y+'년 '+mo+'월</strong><button class="navb" data-nav="1" aria-label="다음 달"'+(idx>=ms.length-1?' disabled':'')+'>›</button></div><div class="grid">'+h+'</div></div>';
}

function tableHtml(lg){
  var rows=standings(lg).map(function(r){
    return '<tr class="'+(r.rank===1?'top':'')+'"><td class="rk">'+r.rank+'</td><td class="tm"><b>'+esc(r.name)+'</b><small>'+esc(r.members.join(' · '))+'</small></td><td class="w">'+r.w+'</td><td class="dr">'+r.d+'</td><td class="l">'+r.l+'</td><td class="pt">'+r.pt+'</td></tr>';
  }).join('');
  return '<div class="tbl"><div class="tbl-h '+lg+'"><span class="tag '+lg+'">'+lg+'</span>'+LG[lg]+'</div><table><thead><tr><th>순위</th><th style="text-align:left;padding-left:6px">팀</th><th>승</th><th>무</th><th>패</th><th>승점</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

function listHtml(){
  var t=todayStr(),groups={},order=[];
  sorted().forEach(function(m){if(!groups[m.date]){groups[m.date]=[];order.push(m.date);}groups[m.date].push(m);});
  if(!order.length)return '<p class="empty">'+(loaded?'등록된 경기가 없습니다.':'경기 일정을 불러오는 중…')+'</p>';
  return order.map(function(ds){
    return '<div class="dgroup"><div class="date-h"><b>'+(+ds.slice(5,7))+'/'+(+ds.slice(8,10))+'</b><span>('+wd(ds)+')</span>'+(ds===t?'<span class="td">오늘</span>':'')+'</div><div class="rows">'+
      groups[ds].map(function(m){return '<button class="row" data-id="'+esc(m.id)+'"><span class="tm">'+m.time+'</span><span class="tag '+kls(m.lg)+'">'+TAG[m.lg]+'</span><span class="vs">'+vsHtml(m)+'</span>'+resultPill(m)+'</button>';}).join('')+
    '</div></div>';
  }).join('');
}

function addHtml(){
  return '<section><div class="sec-h"><h2>경기 추가</h2><span class="sub">리그 경기와 와카전·4강전·결승전을 넣을 수 있어요. 대진이 아직 안 정해졌으면 팀을 미정으로 두세요</span></div>'+
  '<form class="add" id="addf"><label>리그<select id="add-lg"><option value="D">D리그</option><option value="P">P리그</option><option value="WC">와카전</option><option value="SF">4강전</option><option value="F">결승전</option></select></label><label>날짜<input id="add-date" type="date" value="2026-12-01" required></label>'+
  '<label>팀1<select id="add-a">'+teamOpts('D')+'</select></label><label>팀2<select id="add-b">'+teamOpts('D')+'</select></label>'+
  '<label class="full">시간<input id="add-time" type="time" value="20:00" step="1800" required></label>'+
  '<button class="btn main full" type="submit">경기 추가</button></form></section>';
}

/* ---- course roulette: runs only in this browser, nothing is saved to the server ---- */
function exChipsHtml(t){
  var sel=ex[t],h='';
  COURSES.forEach(function(c,i){var on=Array.isArray(sel)&&sel.indexOf(i)>=0;h+='<button class="exchip'+(on?' on':'')+'" data-ex="'+t+'" data-i="'+i+'" aria-pressed="'+on+'">'+esc(WHEEL_LABEL[i])+'</button>';});
  h+='<button class="exchip none'+(sel===NONE?' on':'')+'" data-ex="'+t+'" data-i="none" aria-pressed="'+(sel===NONE)+'">코스제외없음</button>';
  return h;
}
function exSummary(t){var s=ex[t];if(s===NONE)return '제외 없음';if(!s||!s.length)return '아직 안 고름';return s.map(function(i){return WHEEL_LABEL[i];}).join(', ')+' 제외';}
function ready(){return ex.every(function(s){return s===NONE||(Array.isArray(s)&&s.length>0);});}
function spinResultHtml(){
  var l=lastSpin();
  if(l&&l.ex&&JSON.stringify(l.ex)===JSON.stringify(ex))return '결과: <b>'+esc(l.course)+'</b><small>'+esc(l.at)+'</small>';
  return ready()?'남은 코스 '+pool().length+'개로 돌릴 준비가 됐어요':'두 팀 모두 제외할 코스를 골라 주세요 (팀마다 최대 2개)';
}
function rouletteHtml(){
  return '<section id="roulette"><div class="sec-h"><h2>코스 룰렛</h2><span class="sub">팀마다 코스를 최대 2개 빼고 돌려요</span></div>'+
   '<div class="roul">'+
   [0,1].map(function(t){return '<div class="exbox"><div class="exhead"><b>'+(t+1)+'팀 제외 코스</b><span id="exsum'+t+'">'+esc(exSummary(t))+'</span></div><div class="exchips">'+exChipsHtml(t)+'</div></div>';}).join('')+
   '<div class="wheelbox"><div class="pointer" aria-hidden="true"></div><canvas id="wheel" width="560" height="560" role="img" aria-label="코스 룰렛"></canvas></div>'+
   '<p class="spinres" id="spin-result" aria-live="polite">'+spinResultHtml()+'</p>'+
   '<div class="btns"><button class="btn main" id="spin" style="flex:1"'+(spinning||!ready()?' disabled':'')+'>룰렛 돌리기</button><button class="btn ghost" id="exreset">다시 고르기</button></div>'+
   '</div></section>';
}
function refreshRoulette(){
  var sec=document.getElementById('roulette'); if(!sec)return;
  var tmp=document.createElement('div');tmp.innerHTML=rouletteHtml();sec.replaceWith(tmp.firstChild);drawWheel();
}
function toggleEx(t,v){
  if(spinning)return;
  var cur=ex[t];
  if(v===NONE){ex[t]=(cur===NONE)?null:NONE;}
  else{
    var i=+v,arr=Array.isArray(cur)?cur.slice():[];
    var at=arr.indexOf(i);
    if(at>=0)arr.splice(at,1);
    else{if(arr.length>=2){toast('팀마다 최대 2개까지 뺄 수 있어요');return;}arr.push(i);arr.sort(function(a,b){return a-b;});}
    ex[t]=arr.length?arr:null;
  }
  wheelRot=restRot();refreshRoulette();
}
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function drawWheel(){
  var c=document.getElementById('wheel'); if(!c)return;
  var pl=pool(),n=pl.length,g=c.getContext('2d'),R=c.width/2,seg=2*Math.PI/n;
  var fills=[cssVar('--turf'),cssVar('--d'),cssVar('--p'),cssVar('--k')];
  g.clearRect(0,0,c.width,c.height);
  for(var k=0;k<n;k++){
    var a0=-Math.PI/2+k*seg, col=k%4;
    if(k===n-1&&col===0)col=2; /* keep the last slice from matching the first */
    g.beginPath();g.moveTo(R,R);g.arc(R,R,R-6,a0,a0+seg);g.closePath();
    g.fillStyle=fills[col];g.fill();g.lineWidth=3;g.strokeStyle=cssVar('--surface');g.stroke();
    var mid=a0+seg/2,left=Math.cos(mid+wheelRot*Math.PI/180)<-0.01; /* flip labels that sit on the left at rest so they read upright */
    g.save();g.translate(R,R);g.rotate(left?mid+Math.PI:mid);g.textBaseline='middle';
    g.fillStyle='#ffffff';g.font='700 26px "IBM Plex Sans KR", sans-serif';
    if(left){g.textAlign='left';g.fillText(WHEEL_LABEL[pl[k]],-(R-26),0);}else{g.textAlign='right';g.fillText(WHEEL_LABEL[pl[k]],R-26,0);}
    g.restore();
  }
  g.beginPath();g.arc(R,R,34,0,2*Math.PI);g.fillStyle=cssVar('--surface');g.fill();
  c.style.transition='none';c.style.transform='rotate('+wheelRot+'deg)';
}
function doSpin(){
  if(spinning)return;
  if(!ready()){toast('두 팀 모두 제외할 코스를 골라 주세요');return;}
  var pl=pool(),n=pl.length,seg=360/n,k;
  try{var u=new Uint32Array(1);crypto.getRandomValues(u);k=u[0]%n;}catch(_){k=Math.floor(Math.random()*n);}
  var course=COURSES[pl[k]];
  var target=-(k*seg+seg/2)+(Math.random()-.5)*seg*0.6;
  var final=wheelRot+5*360+(((target-wheelRot)%360)+360)%360;
  var c=document.getElementById('wheel'),btn=document.getElementById('spin');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var d=new Date();
  var done=function(){
    wheelRot=final%360;spinning=false;
    saveSpin({course:course,ex:ex,at:(d.getMonth()+1)+'/'+d.getDate()+' '+pad(d.getHours())+':'+pad(d.getMinutes())+'에 돌림 · 1팀 '+exSummary(0)+' · 2팀 '+exSummary(1)});
    refreshRoulette();toast(course+' 당첨!');
  };
  spinning=true;if(btn)btn.disabled=true;
  document.querySelectorAll('.exchip').forEach(function(b){b.disabled=true;});
  var r0=document.getElementById('spin-result');if(r0)r0.textContent='돌아가는 중…';
  if(!c||reduce){done();return;}
  c.style.transition='transform 4.2s cubic-bezier(.12,.72,.12,1)';c.style.transform='rotate('+final+'deg)';
  setTimeout(done,4300);
}

function render(){
  var y=window.scrollY;
  var done=S.matches.filter(function(m){return m.r;}).length;
  app.innerHTML='<div class="wrap">'+
   '<div class="head"><div><h1>D-PGA 스크린대회 경기현황</h1><p class="sub">2026년 11~12월 · D리그·P리그 각 5팀 · 승 3점, 무 1점, 패 0점</p></div>'+
   '<span class="mode">경기를 누르고 승·무·패를 고르면 바로 저장돼요 (입력 PIN 필요)</span>'+
   (loadErr?'<p class="err">'+esc(loadErr)+'</p>':'')+'</div>'+
   '<section><div class="sec-h"><h2>순위표</h2><span class="sub">입력된 결과로 자동 계산</span></div><div class="tables">'+tableHtml('D')+tableHtml('P')+'</div></section>'+
   '<section><div class="sec-h"><h2>경기 달력</h2><div class="legend"><span><i style="background:var(--d)"></i>D리그</span><span><i style="background:var(--p)"></i>P리그</span><span><i style="background:var(--k)"></i>와카·4강·결승</span><span><i style="background:var(--today)"></i>오늘</span></div></div>'+calendarHtml()+'</section>'+
   '<section><div class="sec-h"><h2>경기 일정·결과</h2><span class="sub">'+done+' / '+S.matches.length+'경기 종료</span></div><div class="list">'+listHtml()+'</div></section>'+
   '<section><div class="sec-h"><h2>공지용 텍스트</h2></div><div class="notice"><p class="sub" style="margin:0">단체방에 그대로 붙여넣을 수 있는 형식입니다. 결과를 입력하면 순위와 결과가 자동으로 바뀝니다.</p><button class="btn main" id="copy">공지 텍스트 복사</button><textarea id="ntext" readonly aria-label="공지 텍스트">'+esc(noticeText())+'</textarea></div></section>'+
   addHtml()+
   (getPin()?'<p class="sub" style="text-align:center">이 기기에 입력 PIN이 저장돼 있어요 · <button class="linkb" id="forget">PIN 지우기</button></p>':'')+
  rouletteHtml()+
  '</div>';
  window.scrollTo(0,y);
  drawWheel();
  if(openId)sheet(openId);
}

function sheet(id){
  openId=id; armDel=false;
  var m=byId(id), old=document.querySelector('.scrim'); if(old)old.remove();
  if(!m){openId=null;return;}
  var ta=teamInfo(m.a),tb=teamInfo(m.b),tbd=(m.a===TBD||m.b===TBD);
  var d=new Date(m.date+'T00:00:00');
  var h='<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="경기 결과">'+
    '<div class="meta"><span class="tag '+kls(m.lg)+'">'+LG[m.lg]+'</span>'+(d.getMonth()+1)+'월 '+d.getDate()+'일 ('+wd(m.date)+') '+korTime(m.time)+'</div>'+
    '<div class="big">'+esc(m.a)+'<span class="x">vs</span>'+esc(m.b)+'</div>'+
    '<div class="members"><div>'+esc(ta?ta.members.join(', '):'')+'</div><div style="text-align:right">'+esc(tb?tb.members.join(', '):'')+'</div></div>'+
    (tbd?'<p class="sub" style="margin:0">대진이 정해지면 아래에서 팀을 고르고 팀 저장을 누르세요. 그다음 결과를 입력할 수 있어요.</p>':
    '<div class="choice"><button data-r="A" class="'+(m.r==='A'?'on':'')+'">'+esc(m.a)+'<small>승</small></button><button data-r="D" class="mid '+(m.r==='D'?'on':'')+'">무<small>무승부</small></button><button data-r="B" class="'+(m.r==='B'?'on':'')+'">'+esc(m.b)+'<small>승</small></button></div>')+
    (isPO(m.lg)?'<div class="teamedit"><select id="ed-a" aria-label="팀1">'+teamOpts(m.lg,m.a)+'</select><select id="ed-b" aria-label="팀2">'+teamOpts(m.lg,m.b)+'</select><button class="btn ghost" id="saveteams">팀 저장</button></div>':'')+
    (getPin()?'':'<label class="pinl">입력 PIN<input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="숫자 4자리"></label>')+
    '<div class="btns"><button class="btn ghost" data-close style="flex:1">닫기</button>'+(m.r?'<button class="btn danger" data-r="">결과 지우기</button>':'')+'<button class="btn danger" id="delm">경기 삭제</button></div>'+
    '</div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
  var f=document.getElementById('pin')||document.querySelector('.sheet button'); if(f)f.focus();
}
function closeSheet(){openId=null;var s=document.querySelector('.scrim');if(s)s.remove();}

var tEl=null,tTimer=null;
function toast(msg){if(tEl)tEl.remove();tEl=document.createElement('div');tEl.className='toast';tEl.setAttribute('role','status');tEl.textContent=msg;document.body.appendChild(tEl);clearTimeout(tTimer);tTimer=setTimeout(function(){if(tEl){tEl.remove();tEl=null;}},2800);}

function load(){
  return fetch('/api/state',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error();return r.json();})
  .then(function(j){S.matches=j.matches||[];loaded=true;loadErr='';if(!busy&&!spinning)render();})
  .catch(function(){loadErr='결과를 불러오지 못했어요. 잠시 후 새로고침해 주세요.';render();});
}

function pinFromSheet(){
  var p=getPin(); if(p)return p;
  var el=document.getElementById('pin'); p=el?el.value.trim():'';
  if(!/^\d{4,8}$/.test(p)){toast('입력 PIN(숫자 4자리)을 넣어 주세요');if(el)el.focus();return null;}
  return p;
}

function send(body,okMsg){
  if(busy)return Promise.resolve(false);
  busy=true; toast('저장 중…');
  return fetch('/api/update',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
  .then(function(r){return r.json().catch(function(){return {};}).then(function(j){return {s:r.status,j:j};});})
  .then(function(x){
    busy=false;
    if(x.s===200){setPin(body.pin);S.matches=x.j.matches||S.matches;closeSheet();render();toast(okMsg);return true;}
    if(x.s===401){setPin('');toast('PIN이 맞지 않아요. 다시 입력해 주세요');if(openId)sheet(openId);return false;}
    if(x.s===429){toast('PIN을 여러 번 틀려서 10분 동안 입력이 잠겼어요');return false;}
    toast(x.j.error||'저장하지 못했어요. 잠시 후 다시 눌러 주세요');return false;
  }).catch(function(){busy=false;toast('인터넷 연결을 확인해 주세요');return false;});
}

document.addEventListener('click',function(e){
  var t=e.target;
  var nav=t.closest('[data-nav]'); if(nav){var ms=monthsAvail();month=ms[Math.max(0,Math.min(ms.length-1,ms.indexOf(month)+(+nav.dataset.nav)))];render();return;}
  var row=t.closest('.chip,.row'); if(row){sheet(row.dataset.id);return;}
  if(t.id==='scrim'||t.closest('[data-close]')){closeSheet();return;}
  if(t.id==='forget'){setPin('');render();toast('이 기기의 PIN을 지웠어요');return;}
  var rb=t.closest('[data-r]');
  if(rb&&openId){
    var m=byId(openId),v=rb.dataset.r||null,pin=pinFromSheet(); if(!pin)return;
    var msg=v===null?'결과를 지웠어요':v==='D'?'무승부로 저장했어요':(v==='A'?m.a:m.b)+' 승으로 저장했어요';
    send({pin:pin,op:'result',id:m.id,r:v},msg);return;
  }
  if(t.id==='spin'){doSpin();return;}
  var xc=t.closest('[data-ex]'); if(xc){toggleEx(+xc.dataset.ex,xc.dataset.i);return;}
  if(t.id==='exreset'){if(spinning)return;ex=[null,null];wheelRot=restRot();refreshRoulette();return;}
  if(t.id==='saveteams'&&openId){
    var ea=document.getElementById('ed-a').value,eb=document.getElementById('ed-b').value,pin3=pinFromSheet(); if(!pin3)return;
    if(ea===eb&&ea!==TBD){toast('서로 다른 두 팀을 골라 주세요');return;}
    send({pin:pin3,op:'teams',id:openId,a:ea,b:eb},'대진을 저장했어요');return;
  }
  if(t.id==='delm'&&openId){
    var pin2=pinFromSheet(); if(!pin2)return;
    if(!armDel){armDel=true;t.textContent='한 번 더 누르면 삭제';return;}
    send({pin:pin2,op:'delete',id:openId},'경기를 삭제했어요');return;
  }
  if(t.id==='copy'){
    var txt=noticeText(),ta=document.getElementById('ntext');
    var fallback=function(){ta.focus();ta.select();toast('텍스트를 선택했어요 · 복사해서 붙여넣으세요');};
    try{navigator.clipboard.writeText(txt).then(function(){toast('복사했어요 · 단체방에 붙여넣으세요');},fallback);}catch(_){fallback();}
  }
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeSheet();});
document.addEventListener('change',function(e){
  if(e.target.id==='add-lg'){
    var o=teamOpts(e.target.value);
    document.getElementById('add-a').innerHTML=o;document.getElementById('add-b').innerHTML=o;
  }
});
document.addEventListener('submit',function(e){
  if(e.target.id!=='addf')return; e.preventDefault();
  var lg=document.getElementById('add-lg').value,a=document.getElementById('add-a').value,b=document.getElementById('add-b').value,
      ds=document.getElementById('add-date').value,tm=document.getElementById('add-time').value;
  if(a===b&&a!==TBD){toast('서로 다른 두 팀을 골라 주세요');return;}
  if(!ds||!tm){toast('날짜와 시간을 넣어 주세요');return;}
  var pin=getPin();
  if(!pin){
    var box=document.getElementById('add-pin');
    if(!box){e.target.insertAdjacentHTML('beforeend','<label class="full pinl" id="add-pinl">입력 PIN<input id="add-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="숫자 4자리"></label>');document.getElementById('add-pin').focus();toast('입력 PIN을 넣고 다시 눌러 주세요');return;}
    pin=box.value.trim(); if(!/^\d{4,8}$/.test(pin)){toast('입력 PIN(숫자 4자리)을 넣어 주세요');box.focus();return;}
  }
  send({pin:pin,op:'add',lg:lg,a:a,b:b,date:ds,time:tm},'경기를 추가했어요').then(function(ok){if(ok)month=ds.slice(0,7),render();});
});

var t0=todayStr().slice(0,7); month=monthsAvail().indexOf(t0)>=0?t0:'2026-11';
render(); load();
setInterval(function(){if(!document.hidden&&!openId&&!busy&&!spinning)load();},20000);
document.addEventListener('visibilitychange',function(){if(!document.hidden&&!openId)load();});
})();
