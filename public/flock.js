/* Murmuration: an ASCII starling flock drawn as a live network. Original code. */
(()=>{const c=document.querySelector('canvas.ocean');if(!c)return;const x=c.getContext('2d');
const RM=matchMedia('(prefers-reduced-motion: reduce)');let W,H,D,C,birds=[],raf=0,t=0;
const P={x:0,y:0,on:0};const G='-\\|/-\\|/';
function size(){D=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;c.width=W*D;c.height=H*D;x.setTransform(D,0,0,D,0,0);
C=W<700?12:14;const n=W<700?55:140;while(birds.length<n)birds.push({x:Math.random()*W,y:Math.random()*H,vx:Math.random()-.5,vy:Math.random()-.5,a:0,k:0});birds.length=n}
function target(){return P.on?P:{x:W*(.5+.32*Math.cos(t*.004)),y:H*(.4+.22*Math.sin(t*.007))}}
function step(){t++;const T=target(),R=70,R2=R*R;
for(const b of birds){let sx=0,sy=0,ax=0,ay=0,cx=0,cy=0,k=0,al=0;
 for(const o of birds){if(o===b)continue;const dx=o.x-b.x,dy=o.y-b.y,d=dx*dx+dy*dy;if(d<R2){k++;ax+=o.vx;ay+=o.vy;cx+=dx;cy+=dy;al=Math.max(al,o.a);if(d<520){sx-=dx/d;sy-=dy/d}}}
 b.k=k;b.na=al*.9;
 if(k){b.vx+=(ax/k-b.vx)*.05+cx/k*.001;b.vy+=(ay/k-b.vy)*.05+cy/k*.001}
 b.vx+=sx*9;b.vy+=sy*9;
 const dx=T.x-b.x,dy=T.y-b.y,d=Math.hypot(dx,dy)||1,s=d<40?-.05:.09;
 b.vx+=dx/d*s-dy/d*.025;b.vy+=dy/d*s+dx/d*.025;
 if(b.a>.3){b.vx-=dx/d*.4*b.a;b.vy-=dy/d*.4*b.a}
 const v=Math.hypot(b.vx,b.vy),m=4.2+b.a*2;if(v>m){b.vx*=m/v;b.vy*=m/v}}
for(const b of birds){b.a=Math.max(b.a*.94,b.na);b.x+=b.vx;b.y+=b.vy;
 if(b.x<-20)b.x=W+20;if(b.x>W+20)b.x=-20;if(b.y<-20)b.y=H+20;if(b.y>H+20)b.y=-20}}
function draw(){x.clearRect(0,0,W,H);x.font=`600 ${C*.8|0}px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;x.textAlign='center';x.textBaseline='middle';
const R2=48*48;x.fillStyle='rgba(120,140,170,.28)';
for(let i=0;i<birds.length;i++)for(let j=i+1;j<birds.length;j++){const a=birds[i],b=birds[j],dx=b.x-a.x,dy=b.y-a.y;if(dx*dx+dy*dy<R2){const n=Math.hypot(dx,dy)/C|0;for(let s=1;s<n;s++){const q=s/n;x.fillText('.',Math.round((a.x+dx*q)/C)*C,Math.round((a.y+dy*q)/C)*C)}}}
for(const b of birds){const h=Math.min(b.k/16,1),al=b.a;
 x.fillStyle=al>.15?`rgba(232,135,95,${.5+al*.5})`:`hsla(${210-h*180},${25+h*45}%,${55+h*15}%,${.55+h*.35})`;
 const g=G[((Math.atan2(b.vy,b.vx)+Math.PI)/(Math.PI/4)+.5|0)%8];x.fillText(b.k>14?'*':g,Math.round(b.x/C)*C,Math.round(b.y/C)*C)}}
function loop(){step();draw();raf=requestAnimationFrame(loop)}
function go(){cancelAnimationFrame(raf);raf=0;if(RM.matches){for(let i=0;i<240;i++)step();draw()}else if(!document.hidden)loop()}
function mv(e){P.x=e.clientX;P.y=e.clientY;P.on=1}
function hit(e){mv(e);for(const b of birds)if(Math.hypot(b.x-P.x,b.y-P.y)<60)b.a=1}
addEventListener('pointermove',mv,{passive:true});addEventListener('pointerdown',hit,{passive:true});
addEventListener('touchmove',e=>{const p=e.touches[0];p&&mv(p)},{passive:true});
document.addEventListener('pointerleave',()=>P.on=0);
document.addEventListener('visibilitychange',()=>document.hidden?(cancelAnimationFrame(raf),raf=0):go());
RM.addEventListener?.('change',go);addEventListener('resize',()=>{size();go()});
size();go()})();
