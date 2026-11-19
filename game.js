import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const $ = id => document.getElementById(id);
const loading = $('loading'), hud = $('hud');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91a9a0);
scene.fog = new THREE.Fog(0x91a9a0, 24, 95);

const camera = new THREE.PerspectiveCamera(65, innerWidth/innerHeight, .1, 180);
const renderer = new THREE.WebGLRenderer({antialias:false, powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('game').prepend(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xc9e0db, 0x35402c, 2.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe3ad, 2.1); sun.position.set(-25,35,18); scene.add(sun);

const mat = (color, roughness=1) => new THREE.MeshStandardMaterial({color, roughness});
const groundMat = mat(0x526b43), trunkMat=mat(0x594331), leafMat=mat(0x294d37), leaf2=mat(0x3c6542);
const sandMat=mat(0x9b8a62), stoneMat=mat(0x737b78), metalMat=mat(0x8da3a0,.55);
const island = new THREE.Mesh(new THREE.CylinderGeometry(52,56,3,48), groundMat);
island.position.y=-1.7; scene.add(island);
const ground = new THREE.Mesh(new THREE.CircleGeometry(52,48), groundMat);
ground.rotation.x=-Math.PI/2; ground.position.y=-.18; scene.add(ground);

// beach ring
const beach = new THREE.Mesh(new THREE.RingGeometry(47,51.5,64), sandMat);
beach.rotation.x=-Math.PI/2; beach.position.y=-.16; scene.add(beach);

// low-poly trees
const obstacles=[];
function tree(x,z,s=1){
 const g=new THREE.Group();
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22*s,.34*s,2.3*s,6),trunkMat); trunk.position.y=1.05*s; g.add(trunk);
 const crown=new THREE.Mesh(new THREE.ConeGeometry(1.25*s,3.2*s,7),leafMat); crown.position.y=3*s; g.add(crown);
 const crown2=new THREE.Mesh(new THREE.ConeGeometry(.9*s,2.3*s,7),leaf2); crown2.position.y=4*s; g.add(crown2);
 g.position.set(x,0,z); scene.add(g); obstacles.push({x,z,r:.8*s});
}
for(let i=0;i<90;i++){
 const a=Math.random()*Math.PI*2, r=9+Math.random()*38, x=Math.cos(a)*r,z=Math.sin(a)*r;
 if(Math.hypot(x,z)<11) continue;
 tree(x,z,.65+Math.random()*.7);
}
// rocks
for(let i=0;i<34;i++){
 const a=Math.random()*6.28,r=6+Math.random()*42,x=Math.cos(a)*r,z=Math.sin(a)*r;
 const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.35+Math.random()*.65,0),stoneMat);
 rock.position.set(x,.15,z); rock.scale.y=.65; scene.add(rock);
}

// distant hills
for(let i=0;i<18;i++){
 const a=i/18*Math.PI*2, r=59;
 const hill=new THREE.Mesh(new THREE.ConeGeometry(7+Math.random()*5,10+Math.random()*12,6),mat(0x46594b));
 hill.position.set(Math.cos(a)*r,3,Math.sin(a)*r); scene.add(hill);
}

// radio tower landmark
const tower=new THREE.Group();
const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,9,6),metalMat); pole.position.y=4.5;tower.add(pole);
for(let y=2;y<9;y+=2){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.08,5,8),metalMat);ring.rotation.x=Math.PI/2;ring.position.y=y;tower.add(ring);}
const beacon=new THREE.Mesh(new THREE.SphereGeometry(.35,8,6),mat(0xff4938));beacon.position.y=9.2;tower.add(beacon);
tower.position.set(0,0,-29);scene.add(tower);

// player
const player=new THREE.Group();
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.75,3,6),mat(0x344c59)); body.position.y=1.0; player.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(.31,8,6),mat(0xc89c78));head.position.y=1.72;player.add(head);
const pack=new THREE.Mesh(new THREE.BoxGeometry(.48,.55,.25),mat(0x9b7442));pack.position.set(0,1.05,.35);player.add(pack);
player.position.set(0,0,5);scene.add(player);

const pickups=[];
function pickup(x,z,type){
 const group=new THREE.Group();
 const orb=new THREE.Mesh(new THREE.OctahedronGeometry(.48),mat(type==='part'?0x75e5dc:0xe7c66f,.35));
 orb.position.y=.9;group.add(orb);
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.68,.045,6,18),mat(type==='part'?0x75e5dc:0xe7c66f));
 halo.rotation.x=Math.PI/2;halo.position.y=.35;group.add(halo);
 group.position.set(x,0,z);scene.add(group);pickups.push({group,type,got:false});
}
pickup(-13,-8,'part');pickup(17,-16,'part');pickup(24,12,'part');
pickup(-23,18,'food');pickup(9,25,'food');

// mysterious creature
const enemy=new THREE.Group();
const ebody=new THREE.Mesh(new THREE.CapsuleGeometry(.48,.9,3,6),mat(0x202b2b));
ebody.position.y=1;enemy.add(ebody);
const eyesMat=new THREE.MeshBasicMaterial({color:0xff3828});
for(const x of [-.17,.17]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.07,6,6),eyesMat);eye.position.set(x,1.55,-.36);enemy.add(eye);}
enemy.position.set(-20,0,-20);scene.add(enemy);
let enemyActive=false, enemyTimer=0;

let health=100, stamina=100, parts=0, food=0, running=false;
let joy={x:0,y:0}, moving=false, lastTime=0, elapsed=0, gameOver=false;
let nearest=null, messageTimer=0;

function say(t){$('message').textContent=t;$('message').style.opacity='1';messageTimer=2.8;}
function updateHUD(){
 $('health').textContent=Math.max(0,Math.round(health));
 $('stamina').textContent=Math.round(stamina);
 $('parts').textContent=parts+'/3';
 if(parts<3){$('mission-title').textContent='ابحث عن أجزاء جهاز الإرسال';$('mission-desc').textContent=`اجمع 3 قطع إلكترونية. المتبقي: ${3-parts}`;}
 else {$('mission-title').textContent='عد إلى برج الإرسال';$('mission-desc').textContent='اقترب من البرج في شمال الجزيرة وأصلح جهاز الاتصال.';}
}
function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function collides(x,z){
 if(Math.hypot(x,z)>47) return true;
 return obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.55);
}
function interact(){
 if(gameOver)return;
 if(nearest){
  if(nearest.type==='part'){nearest.got=true;scene.remove(nearest.group);parts++;say('وجدت قطعة إلكترونية!');}
  else {nearest.got=true;scene.remove(nearest.group);food++;health=Math.min(100,health+15);say('تناولت طعاماً واستعدت بعض الصحة.');}
  updateHUD();nearest=null;$('interact').classList.add('hidden');
  return;
 }
 if(parts===3 && distance(player.position,tower.position)<5){
  gameOver=true;$('end-title').textContent='نجحت في إرسال الإشارة!';
  $('end-text').textContent='أصلحت جهاز الإرسال. بعد أيام من العزلة، التقطت سفينة الإنقاذ إشارتك. لكن من كان يرسل الإشارات الغريبة؟';
  $('end-screen').classList.remove('hidden');
 }
}
$('interact').addEventListener('pointerdown',e=>{e.preventDefault();interact();});
$('run').addEventListener('pointerdown',e=>{e.preventDefault();running=true;});
$('run').addEventListener('pointerup',()=>running=false);
$('run').addEventListener('pointerleave',()=>running=false);
$('restart').addEventListener('click',()=>location.reload());

// joystick touch + mouse
const joyEl=$('joystick'), stick=$('stick');
function setJoy(e){
 const r=joyEl.getBoundingClientRect(), cx=r.left+r.width/2,cy=r.top+r.height/2;
 let dx=e.clientX-cx,dy=e.clientY-cy, max=34, len=Math.hypot(dx,dy);
 if(len>max){dx=dx/len*max;dy=dy/len*max;}
 joy.x=dx/max;joy.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`;moving=true;
}
function resetJoy(){joy.x=0;joy.y=0;stick.style.transform='translate(0,0)';moving=false;}
joyEl.addEventListener('pointerdown',e=>{joyEl.setPointerCapture(e.pointerId);setJoy(e);});
joyEl.addEventListener('pointermove',e=>{if(e.buttons||e.pressure>0)setJoy(e);});
joyEl.addEventListener('pointerup',resetJoy);joyEl.addEventListener('pointercancel',resetJoy);

function animate(now){
 requestAnimationFrame(animate);
 const dt=Math.min((now-lastTime)/1000||0,.05);lastTime=now;
 if(!gameOver){
  elapsed+=dt;
  // player movement relative to camera
  const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();
  const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  const dir=new THREE.Vector3().addScaledVector(right,joy.x).addScaledVector(forward,-joy.y);
  if(dir.length()>1)dir.normalize();
  const speed=running&&stamina>1?7.2:4.1;
  if(running&&dir.length()>0){stamina=Math.max(0,stamina-25*dt);}else{stamina=Math.min(100,stamina+12*dt);}
  const nx=player.position.x+dir.x*speed*dt,nz=player.position.z+dir.z*speed*dt;
  if(!collides(nx,player.position.z))player.position.x=nx;
  if(!collides(player.position.x,nz))player.position.z=nz;
  if(dir.length()>.05)player.rotation.y=Math.atan2(dir.x,dir.z);
  body.position.y=1+Math.sin(elapsed*10)*.035*dir.length();

  // camera follows player
  const desired=new THREE.Vector3(player.position.x,player.position.y+5.2,player.position.z+8.5);
  camera.position.lerp(desired,.09);
  camera.lookAt(player.position.x,1.1,player.position.z-1.5);

  // pickup proximity
  nearest=null;let best=2.8;
  for(const p of pickups){if(p.got)continue;p.group.rotation.y+=dt*1.2;p.group.position.y=.12+Math.sin(elapsed*2+p.group.position.x)*.12;
   const d=distance(player.position,p.group.position);if(d<best){best=d;nearest=p;}}
  if(parts===3 && distance(player.position,tower.position)<5.5){$('interact').classList.remove('hidden');$('interact').textContent='إرسال';$('interact-hint').classList.remove('hidden');}
  else if(nearest){$('interact').classList.remove('hidden');$('interact').textContent='جمع';$('interact-hint').classList.remove('hidden');}
  else{$('interact').classList.add('hidden');$('interact-hint').classList.add('hidden');}

  // creature activates after first pickup and slowly hunts
  if(parts>=1){enemyActive=true;}
  if(enemyActive){
   const dx=player.position.x-enemy.position.x,dz=player.position.z-enemy.position.z,d=Math.hypot(dx,dz);
   if(d>1.5){enemy.position.x+=dx/d*1.25*dt;enemy.position.z+=dz/d*1.25*dt;enemy.rotation.y=Math.atan2(dx,dz);}
   if(d<1.7){enemyTimer+=dt;if(enemyTimer>1.1){health-=7;enemyTimer=0;say('الخطر يقترب! ابتعد عن المخلوق.');updateHUD();}}
   if(health<=0){gameOver=true;$('end-title').textContent='انتهت الرحلة';$('end-text').textContent='لم تتمكن من النجاة في الجزيرة. حاول مرة أخرى واجمع الموارد بحذر.';$('end-screen').classList.remove('hidden');}
  }
  if(messageTimer>0){messageTimer-=dt;if(messageTimer<=0)$('message').style.opacity='0';}
  updateHUD();
 }
 renderer.render(scene,camera);
}
requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));});
loading.classList.add('hidden');hud.classList.remove('hidden');
say('استكشف الجزيرة. اجمع القطع الثلاث وتجنب المخلوق.');
updateHUD();
