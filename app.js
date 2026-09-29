/* x is the normalized equilibrium position (0..1), never a traveling phase. */
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('wave'), ctx = canvas.getContext('2d');
const state = {kind:'string', harmonic:1, playing:true, speed:1, markers:true, formulas:true, time:0};
const pipeViews = {open:'particles', closed:'particles'};
const configurations = {
  string:{title:'양 끝이 고정된 줄',boundary:'양 끝 = 마디',note:'줄의 각 지점은 위아래로 진동합니다. 마디의 위치는 변하지 않습니다.',question:'배의 개수가 늘어나면 파장과 진동수는 어떻게 달라질까요?',hint:'길이가 같은 줄에서 진동 모드를 바꾸어 보세요. 마디 사이의 거리는 반파장(λ/2)입니다.'},
  open:{title:'양쪽 끝이 열린 관',boundary:'양 끝 = 변위의 배',note:'현재 그림은 공기 입자의 변위를 나타냅니다.',question:'열린 끝의 공기 입자는 얼마나 크게 움직일까요?',hint:'금색 입자의 좌우 움직임을 관찰하세요. 마디·배는 입자의 평형 위치를 기준으로 표시하며, 열린 끝의 입자는 관 밖으로도 움직일 수 있습니다.'},
  closed:{title:'한쪽 끝이 닫힌 관',boundary:'닫힌 끝 = 마디 · 열린 끝 = 배',note:'현재 그림은 공기 입자의 변위를 나타냅니다.',question:'한쪽 끝이 닫힌 관에서는 왜 홀수배 진동만 나타날까요?',hint:'왼쪽은 움직이지 않는 마디, 오른쪽은 가장 크게 움직이는 배여야 합니다. 두 조건을 함께 만족하는 길이를 ¼파장 단위로 생각해 보세요.'}
};
function shape(kind,n,x){return kind==='open'?Math.cos(n*Math.PI*x):Math.sin(n*Math.PI*x/(kind==='closed'?2:1));}
function positions(kind,n){
  if(kind==='string')return {nodes:Array.from({length:n+1},(_,i)=>i/n),antinodes:Array.from({length:n},(_,i)=>(i+.5)/n)};
  if(kind==='open')return {nodes:Array.from({length:n},(_,i)=>(i+.5)/n),antinodes:Array.from({length:n+1},(_,i)=>i/n)};
  return {nodes:Array.from({length:(n+1)/2},(_,i)=>2*i/n),antinodes:Array.from({length:(n+1)/2},(_,i)=>(2*i+1)/n)};
}
// Both pipe views use this single standing-wave displacement (unit amplitude).
// x is a FIXED equilibrium coordinate, not the particle's displaced coordinate.
function pipeDisplacement(kind,n,x,time){
  const spatial=shape(kind,n,x);
  // Remove floating-point residue at analytical nodes: these particles stay still.
  return (Math.abs(spatial)<1e-14?0:spatial)*Math.cos(2*Math.PI*.32*n*time);
}
function pipeSamples(kind,n,count){
  const p=positions(kind,n),exact=[...p.nodes,...p.antinodes];
  // Keep analytical nodes/antinodes exactly, rather than replacing them by nearby grid points.
  return [...exact,...Array.from({length:count+1},(_,i)=>i/count).filter(x=>!exact.some(a=>Math.abs(a-x)<.002))].sort((a,b)=>a-b);
}
function verifyPipeStandingWaves(){
  const check=(ok,message)=>{if(!ok)throw new Error('Standing-wave validation: '+message);};
  const near=(a,b)=>Math.abs(a-b)<1e-11;
  for(const kind of ['open','closed'])for(const n of kind==='open'?[1,2,3,4]:[1,3,5,7]){
    const p=positions(kind,n),period=1/(.32*n),k=n*Math.PI/(kind==='closed'?2:1);
    const ordered=[...p.nodes.map(x=>({x,node:true})),...p.antinodes.map(x=>({x,node:false}))].sort((a,b)=>a.x-b.x);
    const intervals=kind==='open'?2*n:n;
    check(ordered.length===intervals+1,'node/antinode count');
    ordered.forEach((point,i)=>{
      check(near(point.x,i/intervals),'exact node/antinode position');
      check(point.node===(kind==='closed'?i%2===0:i%2===1),'alternating node/antinode order');
    });
    check(near(Math.abs(shape(kind,n,1)),1),'right end antinode');
    check(near(Math.abs(shape(kind,n,0)),kind==='open'?1:0),'left boundary');
    for(const count of [44,600])for(const x of [...p.nodes,...p.antinodes])check(pipeSamples(kind,n,count).includes(x),'exact equilibrium sample');
    for(let step=0;step<=32;step++){
      const t=period*step/32,phase=2*Math.PI*.32*n*t;
      for(const x of p.nodes)check(pipeDisplacement(kind,n,x,t)===0,'stationary node');
      for(const x of p.antinodes)check(near(Math.abs(pipeDisplacement(kind,n,x,t)),Math.abs(Math.cos(phase))),'fixed antinode amplitude');
      for(let i=0;i<=100;i++){
        const x=i/100,d=pipeDisplacement(kind,n,x,t);
        check(near(d,shape(kind,n,x)*Math.cos(phase)),'space times time');
        // Independent identity: two equal waves traveling in opposite directions.
        // This sum is used only for validation, never to animate either view.
        const trig=kind==='open'?Math.cos:Math.sin;
        check(near(d,(trig(k*x-phase)+trig(k*x+phase))/2),'counterpropagating superposition');
        check(Math.abs(d)<=Math.abs(shape(kind,n,x))+1e-11,'local amplitude bound');
      }
    }
  }
  return true;
}
verifyPipeStandingWaves();
function update(){
  const c=configurations[state.kind],n=state.harmonic;
  $('experiment-title').textContent=c.title;$('boundary').textContent=c.boundary;$('model-note').textContent=c.note;
  $('question').textContent=c.question;$('hint').textContent=c.hint;
  $('experiment').setAttribute('aria-labelledby','tab-'+state.kind);
  const waveform=state.kind!=='string'&&pipeViews[state.kind]==='waveform';
  $('pipe-views').hidden=state.kind==='string';
  $('waveform-note').hidden=!waveform;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===pipeViews[state.kind]));
  canvas.setAttribute('aria-label',`${c.title}, ${n===1?'기본':n+'배'} 진동. ${c.boundary}. ${state.kind==='string'?'각 지점은 위아래로 진동합니다.':'공기 입자는 평형 위치를 중심으로 좌우로 진동합니다.'}`);
  if(waveform)canvas.setAttribute('aria-label',`${c.title}, ${n===1?'기본':n+'배'} 진동. ${c.boundary}. 위치에 따른 공기 입자의 변위를 곡선의 높이로 나타냅니다.`);
  document.querySelectorAll('[role=tab]').forEach(b=>{const active=b.dataset.kind===state.kind;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;});
  document.querySelector('.modes').replaceChildren(...(state.kind==='closed'?[1,3,5,7]:[1,2,3,4]).map(value=>{
    const b=document.createElement('button');b.textContent=value===1?'기본 진동':value+'배 진동';b.setAttribute('aria-pressed',value===n);b.onclick=()=>{state.harmonic=value;state.time=0;update();};return b;
  }));
  $('play').textContent=state.playing?'Ⅱ 일시정지':'▶ 재생';$('speed').value=String(state.speed);
  for(const id of ['markers','formulas']){$(id).setAttribute('aria-pressed',state[id]);$(id).querySelector('b').textContent=state[id]?'ON':'OFF';}
  $('formula-panel').hidden=!state.formulas;$('envelope-legend').hidden=state.kind!=='string';
  $('length-formula').textContent=state.kind==='closed'?(n===1?'L = λ/4':`L = ${n}λ/4`):(n===1?'L = λ/2':`L = ${n}(λ/2)`);
  $('wavelength').textContent=state.kind==='closed'?`λ = ${n===1?'4L':`4L/${n}`}`:`λ = ${n===1?'2L':`2L/${n}`}`;
  $('frequency').textContent=n===1?'f = f₁':`f = ${n}f₁`;
  $('frequency-rule').textContent=state.kind==='closed'?'f = mf₁ · m = 1, 3, 5, 7, …':'fₙ = nf₁ · n = 1, 2, 3, …';
  $('equation').textContent=state.kind==='string'?'y(x,t) = A sin(nπx/L) cos(nω₁t)':state.kind==='open'?'ξ(x,t) = A cos(nπx/L) cos(nω₁t)':'ξ(x,t) = A sin(mπx/2L) cos(mω₁t)';
  draw();
}
function line(x1,y1,x2,y2,color,width=1,dash=[]){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);}
function dot(x,y,r,color){ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,r,0,2*Math.PI);ctx.fill();}
function label(text,x,y,color='#67766f',size=12){ctx.fillStyle=color;ctx.font=`${size}px "Malgun Gothic", sans-serif`;ctx.textAlign='center';ctx.fillText(text,x,y);}
function draw(){
  const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
  const ratio=window.devicePixelRatio||1;if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
  const left=w<500?32:65,right=w-left,L=right-left,mid=h*.49,n=state.harmonic,p=positions(state.kind,n);
  const temporal=Math.cos(2*Math.PI*.32*n*state.time);
  const X=x=>left+x*L;
  line(left,mid,right,mid,'#dbe3dc',1,[4,5]);
  if(state.kind==='string'){
    const A=68;
    for(const sign of [1,-1]){ctx.beginPath();ctx.strokeStyle='#d5e2d4';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);for(let i=0;i<=500;i++){const x=i/500,y=mid+sign*A*shape('string',n,x);i?ctx.lineTo(X(x),y):ctx.moveTo(X(x),y);}ctx.stroke();ctx.setLineDash([]);}
    for(const x of [left,right]){ctx.fillStyle='#dfe7de';ctx.fillRect(x-5,mid-23,10,46);line(x,mid-23,x,mid+23,'#7e9486',2);}
    ctx.beginPath();ctx.strokeStyle='#216759';ctx.lineWidth=3;for(let i=0;i<=600;i++){const x=i/600,y=mid-A*shape('string',n,x)*temporal;i?ctx.lineTo(X(x),y):ctx.moveTo(X(x),y);}ctx.stroke();
    for(const x of [left,right])dot(x,mid,4,'#216759');
    label('고정',left,mid+99);label('고정',right,mid+99);
  }else{
    const top=mid-48,bottom=mid+48,A=Math.min(18,L*.018);
    ctx.fillStyle='#eff5f080';ctx.fillRect(left,top,L,96);
    line(left,top,right,top,'#a3b9ac',3);line(left,bottom,right,bottom,'#a3b9ac',3);
    if(state.kind==='closed'){ctx.fillStyle='#b4c6b9';ctx.fillRect(left-6,top,6,96);}
    if(pipeViews[state.kind]==='waveform'){
      // The same displacement as the particles, with vertical display magnification.
      // x and temporal are shared, so switching views preserves nodes and phase.
      const samples=pipeSamples(state.kind,n,600);
      // Two opposite-phase snapshots of the COMBINED standing wave: +A*S, -A*S.
      // Preserve the sign across nodes; neither curve is an incident/reflected wave.
      for(const sign of [-1,1]){
        ctx.beginPath();ctx.strokeStyle='#d99595';ctx.lineWidth=1.5;
        for(let i=0;i<samples.length;i++){
          const x=samples[i],extreme=pipeDisplacement(state.kind,n,x,0);
          const y=mid+sign*40*extreme;
          i?ctx.lineTo(X(x),y):ctx.moveTo(X(x),y);
        }
        ctx.stroke();
      }
      ctx.beginPath();ctx.strokeStyle='#216759';ctx.lineWidth=3;
      for(let i=0;i<samples.length;i++){
        const x=samples[i],y=mid-40*pipeDisplacement(state.kind,n,x,state.time);
        i?ctx.lineTo(X(x),y):ctx.moveTo(X(x),y);
      }
      ctx.stroke();
    }else{
    // Include exact nodes and antinodes among particle equilibrium columns.
    const xs=pipeSamples(state.kind,n,44);
    for(let row=-2;row<=2;row++)for(const x of xs){const displacement=A*pipeDisplacement(state.kind,n,x,state.time);const highlight=row===0&&p.antinodes.some(a=>Math.abs(a-x)<.002);dot(X(x)+displacement,mid+row*16,highlight?3.4:2,highlight?'#bd8235':'#659583');}
    }
    label(state.kind==='closed'?'닫힌 끝':'열린 끝',left,mid+99);label('열린 끝',right,mid+99);
    if(state.markers)for(const x of [...p.nodes,...p.antinodes])line(X(x),top-5,X(x),bottom+5,'#c6d4c7',1,[2,4]);
  }
  if(state.markers){
    for(const x of p.nodes){dot(X(x),mid,4,'#216759');label('마디',X(x),mid-87,'#216759',w<500?10:12);}
    for(const x of p.antinodes){label('배',X(x),mid-87,'#a66c22',w<500?10:12);line(X(x),mid-79,X(x),mid-73,'#bd8235');}
  }
  const ruler=h-30;line(left,ruler,right,ruler,'#a9b9ad');for(const x of [left,right])line(x,ruler-4,x,ruler+4,'#a9b9ad');ctx.fillStyle='#fff';ctx.fillRect(w/2-34,ruler-10,68,20);label('길이 L',w/2,ruler+4,'#62766a',11);
}
document.querySelectorAll('[role=tab]').forEach(b=>{b.onclick=()=>{state.kind=b.dataset.kind;state.harmonic=1;state.time=0;update();};b.onkeydown=e=>{const tabs=[...document.querySelectorAll('[role=tab]')];let i=tabs.indexOf(b);if(e.key==='ArrowRight')i=(i+1)%3;else if(e.key==='ArrowLeft')i=(i+2)%3;else if(e.key==='Home')i=0;else if(e.key==='End')i=2;else return;e.preventDefault();tabs[i].click();tabs[i].focus();};});
$('play').onclick=()=>{state.playing=!state.playing;update();};
$('speed').onchange=e=>{state.speed=Number(e.target.value);};
document.querySelectorAll('[data-view]').forEach(b=>{b.onclick=()=>{pipeViews[state.kind]=b.dataset.view;update();};});
for(const id of ['markers','formulas'])$(id).onclick=()=>{state[id]=!state[id];update();};
$('reset').onclick=()=>{Object.assign(state,{kind:'string',harmonic:1,playing:true,speed:1,markers:true,formulas:true,time:0});pipeViews.open=pipeViews.closed='particles';update();};
new ResizeObserver(draw).observe(canvas);
let last;
function animate(now){if(last!==undefined&&state.playing&&!document.hidden)state.time+=Math.min((now-last)/1000,.05)*state.speed;last=now;draw();requestAnimationFrame(animate);}
document.addEventListener('visibilitychange',()=>{last=undefined;});
update();requestAnimationFrame(animate);
