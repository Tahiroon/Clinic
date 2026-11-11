import * as pc from "playcanvas";
import "../style.css";

type BuildKind = "treatment" | "reception" | "gym" | "chair" | "plant" | "cabinet" | "parallel" | "bike" | "treadmill" | "wallbars" | "lamp" | "rug" | "wall" | "door";
type Placed = { id:number; kind:BuildKind; gx:number; gz:number; rot?:0|90 };
const el=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=el<HTMLCanvasElement>("#scene"), status=el<HTMLElement>("#status"), fpsLabel=el<HTMLElement>("#fps"), loading=el<HTMLElement>("#loading");
const stage=el<HTMLElement>(".stage"), moveBtn=el<HTMLButtonElement>("#move-mode"), buildBtn=el<HTMLButtonElement>("#build-mode"), sessionBtn=el<HTMLButtonElement>("#session-mode"), viewBtn=el<HTMLButtonElement>("#view-mode");
const buildPanel=el<HTMLElement>("#build-panel"), saveState=el<HTMLElement>("#save-state"), coinsLabel=el<HTMLElement>("#coins"), sessionDialog=el<HTMLDialogElement>("#session-dialog");
const app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:false,alpha:false,powerPreference:"low-power"}});
app.setCanvasFillMode(pc.FILLMODE_NONE); app.setCanvasResolution(pc.RESOLUTION_AUTO); app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,1.15);
let lastViewportWidth=0,lastViewportHeight=0;
const resize=()=>{
 const rect=stage.getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height);
 if(w<2||h<2)return;
 if(w===lastViewportWidth&&h===lastViewportHeight&&canvas.width>0)return;
 lastViewportWidth=w;lastViewportHeight=h;
 app.resizeCanvas(w,h);
 const aspect=w/h;
 camera.camera!.orthoHeight=aspect<.58?13.4:aspect<.78?13.0:12.4;
};
const observer=new ResizeObserver(()=>requestAnimationFrame(resize));observer.observe(stage);
window.addEventListener("resize",()=>requestAnimationFrame(resize),{passive:true});
window.addEventListener("orientationchange",()=>window.setTimeout(resize,120),{passive:true});
window.visualViewport?.addEventListener("resize",()=>requestAnimationFrame(resize),{passive:true});
app.scene.ambientLight=new pc.Color(.62,.68,.76);
app.scene.gammaCorrection=pc.GAMMA_SRGB;
app.scene.toneMapping=pc.TONEMAP_ACES;
function material(c:pc.Color){const m=new pc.StandardMaterial();m.diffuse=c;m.update();return m;}
const M={ground:material(new pc.Color(.32,.48,.43)),tile:material(new pc.Color(.43,.59,.51)),grid:material(new pc.Color(.25,.4,.36)),room:material(new pc.Color(.78,.82,.79)),wall:material(new pc.Color(.88,.91,.86)),wallSide:material(new pc.Color(.53,.68,.69)),wood:material(new pc.Color(.48,.33,.23)),wood2:material(new pc.Color(.68,.49,.31)),teal:material(new pc.Color(.13,.48,.55)),blue:material(new pc.Color(.18,.35,.58)),pale:material(new pc.Color(.79,.9,.88)),green:material(new pc.Color(.2,.53,.36)),skin:material(new pc.Color(.7,.49,.36)),dark:material(new pc.Color(.1,.16,.21)),white:material(new pc.Color(.93,.94,.87)),yellow:material(new pc.Color(.85,.65,.27))};
function box(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){const e=new pc.Entity(name);e.addComponent("model",{type:"box"});e.setPosition(x,y,z);e.setLocalScale(sx,sy,sz);e.model!.material=m;e.model!.castShadows=true;e.model!.receiveShadows=true;parent.addChild(e);return e;}
function sphere(name:string,x:number,y:number,z:number,s:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){const e=new pc.Entity(name);e.addComponent("model",{type:"sphere"});e.setPosition(x,y,z);e.setLocalScale(s,s,s);e.model!.material=m;parent.addChild(e);return e;}
const camera=new pc.Entity("Portrait isometric camera");camera.addComponent("camera",{projection:pc.PROJECTION_ORTHOGRAPHIC,orthoHeight:10,clearColor:new pc.Color(.55,.7,.72),nearClip:.1,farClip:150});const cameraTarget=new pc.Vec3(0,0,0);camera.setPosition(11,15,11);camera.lookAt(cameraTarget);app.root.addChild(camera);
const light=new pc.Entity("Soft daylight");light.addComponent("light",{type:"directional",intensity:1.65,castShadows:true,shadowResolution:2048,shadowType:pc.SHADOW_PCF3,shadowDistance:55,normalOffsetBias:.035,bias:.04});light.setEulerAngles(48,35,0);app.root.addChild(light);
const world=new pc.Entity("Clinic plot");app.root.addChild(world);
const GRID=1, W=32, D=32, HALF=W/2;
const floorBase=material(new pc.Color(.72,.75,.72)),floorTile=material(new pc.Color(.82,.84,.8)),floorAlt=material(new pc.Color(.76,.8,.77)),gridLine=material(new pc.Color(.57,.64,.62)),glass=material(new pc.Color(.35,.72,.79));
box("Clinic structural slab",0,-.22,0,W,.42,D,floorBase,world);
for(let x=-HALF+2;x<HALF;x+=4)for(let z=-HALF+2;z<HALF;z+=4)box("Porcelain floor tile",x,-.002,z,3.96,.025,3.96,((x+z)%8===0)?floorAlt:floorTile,world);
for(let x=-HALF;x<=HALF;x++)box("Subtle construction grid",x,.014,0,.008,.008,D,gridLine,world);
for(let z=-HALF;z<=HALF;z++)box("Subtle construction grid",0,.014,z,W,.008,.008,gridLine,world);
// Permanent outer shell: a real clinic perimeter with layered wall bands, glazing and structural columns.
const shell=new pc.Entity("Clinic architectural shell");world.addChild(shell);
for(const z of [-HALF,HALF]){
 const spans=z===-HALF?[{x:-9,w:14},{x:9,w:14}]:[{x:0,w:W}];
 for(const span of spans){
  box("Exterior wall lower",span.x,1.25,z,span.w,2.5,.28,M.wall,shell);
  box("Exterior teal dado",span.x,.28,z-.02,span.w,.18,.32,M.teal,shell);
  box("Exterior wall cap",span.x,2.55,z,span.w,.16,.42,M.white,shell);
 }
 for(let x=-12;x<=12;x+=4){if(z===-HALF&&Math.abs(x)<3)continue;box("Facade window",x,1.55,z-.16,2.35,1.05,.035,glass,shell);box("Window sill",x,1.0,z-.2,2.5,.09,.16,M.white,shell);box("Window mullion",x,1.55,z-.23,.045,1.05,.04,M.wall,shell);}
}
for(const x of [-HALF,HALF]){
 box("Exterior side wall",x,1.25,0,.28,2.5,D,M.wall,shell);
 box("Side teal dado",x-.02,.28,0,.32,.18,D,M.teal,shell);
 for(let z=-12;z<=12;z+=4){box("Side facade window",x-.16,1.55,z,.035,1.05,2.35,glass,shell);box("Side window sill",x-.2,1.0,z,.16,.09,2.5,M.white,shell);}
}
for(const x of [-15.8,15.8])for(const z of [-15.8,15.8])box("Structural corner column",x,1.5,z,.48,3,.48,M.pale,shell);
box("Entrance left pier",-2,1.35,-HALF,.35,2.7,.42,M.wall,shell);
box("Entrance right pier",2,1.35,-HALF,.35,2.7,.42,M.wall,shell);
box("Entrance canopy",0,2.8,-HALF,4.6,.22,1.1,M.teal,shell);
box("Clinic entrance sign",0,3.05,-HALF-.05,2.4,.42,.08,M.white,shell);
const roomRoot=new pc.Entity("Open clinic interior");world.addChild(roomRoot);
function makeRoom(kind:"treatment"|"reception"|"gym",gx:number,gz:number,id:number){
 const root=new pc.Entity("Room "+id);root.setPosition(gx,0,gz);world.addChild(root);
 const floor=kind==="gym"?material(new pc.Color(.45,.57,.59)):M.room;
 box("Room floor",1,.035,1,3.95,.07,3.95,floor,root);
 // Two full rear/side walls and a low front edge create readable open-top dollhouse view.
 box("Rear wall",1,1.05,3,4,.95,.12,M.wall,root);box("Left wall",-1,1.05,1,.12,.95,4,M.wallSide,root);
 box("Right wall",3,1.05,1,.12,.95,4,M.wall,root);
 box("Front wall left",.15,.55,-1,.3,.55,.12,M.wall,root);box("Front wall right",2.35,.55,-1,1.3,.55,.12,M.wall,root);
 box("Door lintel",1.25,1.0,-1,.9,.12,.12,M.wall,root);
 box("Wall base rear",1,.17,2.91,4,.2,.15,M.teal,root);box("Wall base left",-.91,.17,1,.15,.2,4,M.teal,root);
 if(kind==="treatment"){
  box("Treatment bed base",1.95,.3,1.45,2.05,.2,.9,M.dark,root);box("Treatment mattress",1.95,.47,1.45,2,.2,.86,M.blue,root);box("Pillow",1.95,.59,1.12,.58,.1,.42,M.pale,root);
  for(const x of [1.12,2.78])for(const z of [1.12,1.78])box("Bed leg",x,.08,z,.08,.35,.08,M.dark,root);
  box("Therapy cabinet",.25,.55,2.4,.55,1.1,.55,M.wood2,root);box("Wall chart",2.3,1.65,2.91,.75,.65,.04,M.pale,root);
 }else if(kind==="reception"){
  box("Reception desk",1.1,.48,.25,2.2,.85,.65,M.wood,root);box("Desk top",1.1,.94,.25,2.3,.1,.72,M.wood2,root);box("Desk panel",1.1,.45,-.09,1.6,.6,.03,M.teal,root);
  for(const x of [.25,2.65]){box("Waiting chair",x,.38,1.8,.65,.18,.62,M.teal,root);box("Chair back",x,.75,2.02,.65,.6,.13,M.blue,root);}
 }else{
  box("Exercise mat",1.1,.07,1.1,2.7,.08,1.25,M.blue,root);box("Parallel bar",.2,.6,2.45,.1,1.1,.1,M.wood2,root);box("Parallel bar",2,.6,2.45,.1,1.1,.1,M.wood2,root);box("Bar rail",1.1,1.08,2.45,1.9,.08,.08,M.yellow,root);
 }
 return root;
}
function loadClinicModel(url:string,name:string,centerX:number,centerZ:number,targetWidth:number,onReady?:()=>void){
 let fallbackRoom:pc.Entity|null=null;const fallback=()=>{if(!fallbackRoom)fallbackRoom=makeRoom("treatment",-3,-3,1);loading.classList.add("done");};
 window.setTimeout(()=>{if(!loading.classList.contains("done")){status.textContent="الاتصال بطيء؛ نعرض نسخة خفيفة مؤقتاً.";fallback();}},10000);
 app.assets.loadFromUrl(url,"container",(err,asset)=>{
  if(err||!asset?.resource){status.textContent="تعذر تحميل النموذج ثلاثي الأبعاد؛ تم تشغيل التصميم الاحتياطي.";fallback();return;}
  const model=asset.resource.instantiateRenderEntity({castShadows:false,receiveShadows:false});
  model.name=name;world.addChild(model);if(fallbackRoom){fallbackRoom.destroy();fallbackRoom=null;}model.syncHierarchy();app.root.syncHierarchy();
  const meshes=model.findComponents("render").flatMap(r=>r.meshInstances);
  if(!meshes.length){model.destroy();status.textContent="النموذج لا يحتوي مجسمات قابلة للعرض؛ تم تشغيل التصميم الاحتياطي.";fallback();return;}
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(const mesh of meshes){const b=mesh.aabb,c=b.center,h=b.halfExtents;minX=Math.min(minX,c.x-h.x);maxX=Math.max(maxX,c.x+h.x);minY=Math.min(minY,c.y-h.y);maxY=Math.max(maxY,c.y+h.y);minZ=Math.min(minZ,c.z-h.z);maxZ=Math.max(maxZ,c.z+h.z);}
  const width=maxX-minX,depth=maxZ-minZ,scale=targetWidth/Math.max(width,depth,.001);
  model.setLocalScale(scale,scale,scale);model.syncHierarchy();app.root.syncHierarchy();
  const scaledMeshes=model.findComponents("render").flatMap(r=>r.meshInstances);
  minY=Infinity;minX=Infinity;maxX=-Infinity;minZ=Infinity;maxZ=-Infinity;
  for(const mesh of scaledMeshes){const b=mesh.aabb,c=b.center,h=b.halfExtents;minX=Math.min(minX,c.x-h.x);maxX=Math.max(maxX,c.x+h.x);minY=Math.min(minY,c.y-h.y);minZ=Math.min(minZ,c.z-h.z);maxZ=Math.max(maxZ,c.z+h.z);}
  model.setPosition(centerX-(minX+maxX)/2,-minY,centerZ-(minZ+maxZ)/2);
  model.syncHierarchy();status.textContent="تم تحميل غرفة العلاج ثلاثية الأبعاد.";if(onReady)onReady();
 });
}
// The starter clinic is intentionally an open, empty architectural shell; students design their own rooms.
const avatar=new pc.Entity("Student avatar");avatar.setPosition(-1,0,1.7);world.addChild(avatar);
let avatarAnim:any=null;let avatarClipNames:string[]=[];
const characterAssets:Record<string,string>={
 student:new URL("../assets/characters/Student.glb",import.meta.url).href,
 doctor:new URL("../assets/characters/WhiteCoatDoctor.glb",import.meta.url).href,
 patient:new URL("../assets/characters/WardPatient.glb",import.meta.url).href,
 nurse:new URL("../assets/characters/WardNurse.glb",import.meta.url).href
};
function loadHumanoid(url:string,parent:pc.Entity,height:number,onReady?:(entity:pc.Entity)=>void){
 app.assets.loadFromUrl(url,"container",(err,asset)=>{
  if(err||!asset?.resource){status.textContent="تعذر تحميل إحدى الشخصيات؛ نعيد المحاولة عند توفر الاتصال.";return;}
  const model=asset.resource.instantiateRenderEntity({castShadows:true,receiveShadows:true});
  model.name="Rigged humanoid";parent.addChild(model);model.syncHierarchy();app.root.syncHierarchy();
  const meshes=model.findComponents("render").flatMap(r=>r.meshInstances);
  if(!meshes.length){model.destroy();return;}
  let minY=Infinity,maxY=-Infinity;
  for(const mesh of meshes){const b=mesh.aabb,c=b.center,h=b.halfExtents;minY=Math.min(minY,c.y-h.y);maxY=Math.max(maxY,c.y+h.y);}
  const scale=height/Math.max(.01,maxY-minY);
  model.setLocalScale(scale,scale,scale);model.syncHierarchy();app.root.syncHierarchy();
  const scaled=model.findComponents("render").flatMap(r=>r.meshInstances);
  minY=Infinity;for(const mesh of scaled){const b=mesh.aabb;minY=Math.min(minY,b.center.y-b.halfExtents.y);}
  model.setLocalPosition(0,-minY,0);
  model.addComponent("anim",{activate:true,speed:1});
  const anim:any=(model as any).anim;if(!anim){if(onReady)onReady(model);return;}
  const clips:any[]=asset.resource.animations??[];
  const names:string[]=[];
  for(const clip of clips){const track:any=clip.resource;if(track){const clipName=String(track.name||clip.name||"");if(clipName){anim.assignAnimation(clipName,track);names.push(clipName);}}}
  (model as any).__clinicClips=names;
  const idleName=names.find(n=>/idle|stand|rest/i.test(n))??names[0];
  if(idleName&&anim.baseLayer){try{anim.baseLayer.play(idleName,.18);}catch{}}
  if(onReady)onReady(model);
 });
}
loadHumanoid(characterAssets.doctor,avatar,1.72,model=>{avatarAnim=(model as any).anim??null;avatarClipNames=(model as any).__clinicClips??[];status.textContent="الأخصائي جاهز. اضغط على مكان داخل العيادة ليتحرك إليه.";});
const doctorNpc=new pc.Entity("Clinic doctor");doctorNpc.setPosition(3,0,-1);world.addChild(doctorNpc);
loadHumanoid(characterAssets.nurse,doctorNpc,1.68);
const patientNpc=new pc.Entity("Clinic patient");patientNpc.setPosition(4,0,2);world.addChild(patientNpc);
loadHumanoid(characterAssets.patient,patientNpc,1.62);

let mode:"move"|"build"="move", selected:BuildKind="wall", target:pc.Vec3|null=null, coins=100000, xp=0, nextId=2, focus=false, wallRotation:0|90=0;
let placed:Placed[]=[];let walkPath:{x:number;z:number}[]=[];const saveKey="therason-clinic-world-v2";const entities:pc.Entity[]=[];
const costs:Record<BuildKind,number>={treatment:0,reception:60,gym:90,chair:20,plant:15,cabinet:30,parallel:80,bike:100,treadmill:120,wallbars:70,lamp:15,rug:25,wall:8,door:22};
function save(){try{localStorage.setItem(saveKey,JSON.stringify({v:2,coins,xp,placed}));saveState.textContent="تم الحفظ";}catch{saveState.textContent="حفظ مؤقت";}}
function load(){try{const s=localStorage.getItem(saveKey);if(!s)return;const v=JSON.parse(s);if(v.v!==2)return;coins=100000;xp=Number.isFinite(v.xp)?v.xp:0;placed=Array.isArray(v.placed)?v.placed.slice(0,60):[];coinsLabel.textContent=String(coins);el("#experience").textContent=xp+" XP";for(const p of placed)drawPlaced(p);}catch{}}
function drawPlaced(p:Placed){const x=p.gx+.5,z=p.gz+.5;if(p.kind==="reception"||p.kind==="gym"||p.kind==="treatment"){const r=makeRoom(p.kind,p.gx,p.gz,p.id);entities.push(r);return;}
 const root=new pc.Entity("Placed "+p.kind);root.setPosition(x,0,z);root.setEulerAngles(0,p.rot??0,0);world.addChild(root);entities.push(root);
 if(p.kind==="chair"){box("Chair seat",0,.38,0,.6,.15,.6,M.teal,root);box("Chair back",0,.75,-.22,.6,.6,.13,M.blue,root);for(const a of [-.22,.22])for(const b of [-.22,.22])box("Chair leg",a,.16,b,.06,.32,.06,M.dark,root);}
 if(p.kind==="plant"){box("Plant pot",0,.2,0,.38,.4,.38,M.wood2,root);sphere("Plant leaves",0,.72,0,.52,M.green,root);sphere("Plant leaf",.2,.88,.04,.3,M.green,root);}
 if(p.kind==="cabinet"){box("Cabinet body",0,.6,0,.7,1.2,.42,M.wood2,root);box("Cabinet door",0,.6,.22,.62,1.08,.03,M.wood,root);}
 if(p.kind==="parallel"){for(const x of [-.28,.28]){box("Parallel support",x,.48,0,.07,.9,.07,M.wood2,root);box("Parallel rail",x,.94,0,.07,.07,.95,M.yellow,root);}}
 if(p.kind==="bike"){box("Bike frame",0,.48,0,.08,.75,.08,M.dark,root);sphere("Bike wheel",-.28,.35,0,.34,M.dark,root);sphere("Bike wheel",.28,.35,0,.34,M.dark,root);box("Bike seat",0,.85,-.12,.42,.1,.3,M.blue,root);box("Bike handle",0,.95,.3,.55,.07,.07,M.teal,root);}
 if(p.kind==="treadmill"){box("Treadmill deck",0,.22,0,.85,.12,1.15,M.dark,root);box("Treadmill belt",0,.3,0,.72,.025,1.02,M.blue,root);for(const x of [-.35,.35])box("Treadmill post",x,.82,-.42,.07,1,.07,M.teal,root);box("Treadmill bar",0,1.28,-.42,.8,.08,.08,M.dark,root);}
 if(p.kind==="wallbars"){for(let i=0;i<6;i++)box("Wall bar",0,.35+i*.2,0,.85,.045,.05,M.wood2,root);for(const x of [-.42,.42])box("Wall frame",x,.85,0,.06,1.2,.07,M.wood,root);}
 if(p.kind==="lamp"){box("Lamp base",0,.06,0,.35,.1,.35,M.dark,root);box("Lamp stem",0,.62,0,.07,1.1,.07,M.wood2,root);sphere("Lamp shade",0,1.2,0,.25,M.yellow,root);}
 if(p.kind==="rug"){box("Exercise rug",0,.035,0,.95,.06,.95,M.blue,root);}
 if(p.kind==="wall"){box("Interior partition",0,1.3,0,1,.12,2.6,M.wall,root);box("Wall teal trim",0,.22,.07,1,.12,.08,M.teal,root);box("Wall cap",0,2.62,0,1.05,.12,.18,M.white,root);}
 if(p.kind==="door"){box("Door left jamb",-.43,1.25,0,.12,2.5,.18,M.white,root);box("Door right jamb",.43,1.25,0,.12,2.5,.18,M.white,root);box("Door lintel",0,2.48,0,1,.16,.18,M.white,root);box("Door leaf",-.22,1.08,.09,.42,2.12,.055,M.wood2,root);}
}
function footprint(kind:BuildKind){return kind==="treatment"||kind==="reception"||kind==="gym"?4:1;}
function footprintAt(gx:number,gz:number,kind:BuildKind,rot:0|90=0){
 const size=footprint(kind);
 if(kind==="wall")return rot===0?{x:gx+.42,z:gz,w:.16,d:3}:{x:gx,z:gz+1.42,w:3,d:.16};
 if(kind==="door")return rot===0?{x:gx+.08,z:gz,w:.84,d:.22}:{x:gx,z:gz+.08,w:.22,d:.84};
 return {x:gx,z:gz,w:size,d:size};
}
function rectanglesOverlap(a:{x:number;z:number;w:number;d:number},b:{x:number;z:number;w:number;d:number}){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.z<b.z+b.d&&a.z+a.d>b.z;}
const starterFootprint={x:99,z:99,w:0,d:0};
function occupied(gx:number,gz:number,kind:BuildKind){
 const a=footprintAt(gx,gz,kind);
 if(a.x< -HALF||a.z< -HALF||a.x+a.w>HALF||a.z+a.d>HALF)return true;
 if(rectanglesOverlap(a,starterFootprint))return true;
 return placed.some(p=>rectanglesOverlap(a,footprintAt(p.gx,p.gz,p.kind,p.rot)));
}
function canAvatarStand(x:number,z:number){
 const r=.28;
 if(x-r< -HALF||x+r>HALF||z-r< -HALF||z+r>HALF)return false;
 const player={x:x-r,z:z-r,w:r*2,d:r*2};
 const boundary=[{x:-HALF,z:-HALF,w:W,d:.22},{x:-HALF,z:HALF-.22,w:W,d:.22},{x:-HALF,z:-HALF,w:.22,d:D},{x:HALF-.22,z:-HALF,w:.22,d:D}];
 if(boundary.some(w=>rectanglesOverlap(player,w)))return false;
 return !placed.some(p=>{
  if(p.kind==="treatment"||p.kind==="reception"||p.kind==="gym"){
   const x=p.gx,z=p.gz;
   const walls=[{x:x,z:z+2.9,w:4,d:.16},{x:x,z:z,w:.16,d:4},{x:x+3.9,z:z,w:.16,d:4},{x:x+.0,z:z-.05,w:.55,d:.14},{x:x+2.05,z:z-.05,w:1.95,d:.14}];
   return walls.some(w=>rectanglesOverlap(player,w));
  }
  return rectanglesOverlap(player,footprintAt(p.gx,p.gz,p.kind,p.rot));
 });
}
function findWalkPath(sx:number,sz:number,tx:number,tz:number){
 const step=.5,cell=(v:number)=>Math.round(v/step),key=(x:number,z:number)=>x+","+z;
 const start={x:cell(sx),z:cell(sz)},goal={x:cell(tx),z:cell(tz)};
 const worldPoint=(x:number,z:number)=>({x:x*step,z:z*step});
 const walkable=(x:number,z:number)=>{const p=worldPoint(x,z);return canAvatarStand(p.x,p.z);};
 // If the tapped point is blocked, find the nearest reachable free cell around it.
 let end=goal;
 if(!walkable(end.x,end.z)){
  let found:{x:number;z:number}|null=null;
  for(let radius=1;radius<=5&&!found;radius++)for(let dx=-radius;dx<=radius&&!found;dx++)for(let dz=-radius;dz<=radius&&!found;dz++){
   if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;
   const q={x:goal.x+dx,z:goal.z+dz};if(walkable(q.x,q.z))found=q;
  }
  if(!found)return null;end=found;
 }
 const open=[{...start,g:0,f:Math.hypot(end.x-start.x,end.z-start.z)}],came=new Map<string,string>(),cost=new Map<string,number>([[key(start.x,start.z),0]]),closed=new Set<string>();
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 let iterations=0;
 while(open.length&&iterations++<5000){
  open.sort((a,b)=>a.f-b.f);const cur=open.shift()!,ck=key(cur.x,cur.z);
  if(ck===key(end.x,end.z)){
   const path:{x:number;z:number}[]=[];let k=ck;
   while(k!==key(start.x,start.z)){const [x,z]=k.split(",").map(Number);path.push(worldPoint(x,z));const prev=came.get(k);if(!prev)break;k=prev;}
   return path.reverse();
  }
  if(closed.has(ck))continue;closed.add(ck);
  for(const [dx,dz] of dirs){const nx=cur.x+dx,nz=cur.z+dz,nk=key(nx,nz);if(closed.has(nk)||!walkable(nx,nz))continue;
   if(dx!==0&&dz!==0&&(!walkable(cur.x+dx,cur.z)||!walkable(cur.x,cur.z+dz)))continue;
   const ng=cur.g+(dx&&dz?1.414:1);if(ng>=(cost.get(nk)??Infinity))continue;
   cost.set(nk,ng);came.set(nk,ck);open.push({x:nx,z:nz,g:ng,f:ng+Math.hypot(end.x-nx,end.z-nz)});
  }
 }
 return null;
}
function moveAvatarSafely(dx:number,dz:number){
 const p=avatar.getPosition(),distance=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(distance/.1));let x=p.x,z=p.z;
 for(let i=1;i<=steps;i++){const nx=p.x+dx*i/steps,nz=p.z+dz*i/steps;if(canAvatarStand(nx,nz)){x=nx;z=nz;}else break;}
 avatar.setPosition(x,0,z);return Math.hypot(x-p.x,z-p.z)>.001;
}
function updateMode(next:"move"|"build"){mode=next;moveBtn.classList.toggle("active",mode==="move");buildBtn.classList.toggle("active",mode==="build");buildPanel.hidden=mode!=="build";status.textContent=mode==="move"?"اضغط على الأرض لتحريك شخصيتك. اسحب لتحريك الكاميرا.":"اختر غرفة أو قطعة ثم المس خلية فارغة في الشبكة.";}
function screenToGround(clientX:number,clientY:number){const r=canvas.getBoundingClientRect(),x=(clientX-r.left)*(canvas.width/r.width),y=(clientY-r.top)*(canvas.height/r.height);const a=camera.camera!.screenToWorld(x,y,.1),b=camera.camera!.screenToWorld(x,y,100),d=b.sub(a);if(Math.abs(d.y)<.0001)return null;const t=-a.y/d.y;if(t<0)return null;const p=a.add(d.mulScalar(t));if(Math.abs(p.x)>HALF||Math.abs(p.z)>HALF)return null;return p;}
let pointerStart:{x:number;y:number;cx:number;cz:number;tx:number;tz:number}|null=null,dragged=false;const activePointers=new Map<number,{x:number;y:number}>();let pinchDistance=0,pinchHeight=0;
canvas.addEventListener("pointerdown",e=>{activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size===2){const pts=[...activePointers.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);pinchHeight=camera.camera!.orthoHeight;pointerStart=null;dragged=true;}else{pointerStart={x:e.clientX,y:e.clientY,cx:camera.getPosition().x,cz:camera.getPosition().z,tx:cameraTarget.x,tz:cameraTarget.z};dragged=false;}canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointermove",e=>{if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size>=2){const pts=[...activePointers.values()];const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance>0)camera.camera!.orthoHeight=Math.max(9,Math.min(16,pinchHeight*pinchDistance/Math.max(1,distance)));dragged=true;return;}if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;if(Math.hypot(dx,dy)>8)dragged=true;if(dragged){const scale=camera.camera!.orthoHeight/Math.max(220,canvas.clientHeight),shiftX=-dx*scale*.7,shiftZ=dy*scale*.7;cameraTarget.set(Math.max(-5,Math.min(5,pointerStart.tx+shiftX)),0,Math.max(-5,Math.min(5,pointerStart.tz+shiftZ)));camera.setPosition(cameraTarget.x+11,15,cameraTarget.z+11);camera.lookAt(cameraTarget);}});
canvas.addEventListener("pointerup",e=>{activePointers.delete(e.pointerId);if(activePointers.size<2)pinchDistance=0;if(!pointerStart){if(activePointers.size===1){const p=[...activePointers.values()][0];pointerStart={x:p.x,y:p.y,cx:camera.getPosition().x,cz:camera.getPosition().z,tx:cameraTarget.x,tz:cameraTarget.z};}else dragged=false;return;}const wasDrag=dragged;pointerStart=null;if(wasDrag)return;const p=screenToGround(e.clientX,e.clientY);if(!p)return;if(mode==="build"){const gx=Math.floor(p.x),gz=Math.floor(p.z);if(occupied(gx,gz,selected)){status.textContent="هذه الخلية مشغولة. اختر مساحة فارغة بجوارها.";return;}const cost=costs[selected];if(coins<cost){status.textContent="عملاتك لا تكفي لهذه الإضافة بعد. أكمل جلساتك لاكتساب العملات.";return;}coins-=cost;coinsLabel.textContent=String(coins);const item={id:nextId++,kind:selected,gx,gz,rot:(selected==="wall"||selected==="door")?wallRotation:0 as 0|90};placed.push(item);drawPlaced(item);save();status.textContent="تمت الإضافة! تقدر تواصل تخطيط عيادتك.";return;}const tx=Math.round(p.x*2)/2,tz=Math.round(p.z*2)/2;if(!canAvatarStand(tx,tz)){status.textContent="المكان محجوز بجدار أو جهاز. اختر ممراً خالياً.";return;}target=new pc.Vec3(tx,0,tz);status.textContent="شخصيتك تتحرك إلى الموقع المحدد.";});
canvas.addEventListener("pointercancel",e=>{activePointers.delete(e.pointerId);pointerStart=null;pinchDistance=0;dragged=false;});
function selectBuild(kind:BuildKind){selected=kind;document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.classList.toggle("selected",b.dataset.build===kind));const names:Record<BuildKind,string>={treatment:"غرفة علاج",reception:"استقبال",gym:"صالة تمارين",chair:"كرسي انتظار",plant:"نبات داخلي",cabinet:"خزانة أدوات",parallel:"متوازي",bike:"دراجة علاجية",treadmill:"سير مشي",wallbars:"سلم حائطي",lamp:"مصباح",rug:"سجادة",wall:"مقطع حائط",door:"باب"};el("#build-hint").textContent="تم اختيار "+names[kind]+". المس خلية فارغة لوضعه، ويمكنك تدوير الحائط من زر التدوير.";}
moveBtn.addEventListener("click",()=>updateMode("move"));buildBtn.addEventListener("click",()=>updateMode(mode==="build"?"move":"build"));el("#cancel-build").addEventListener("click",()=>updateMode("move"));
document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.addEventListener("click",()=>selectBuild(b.dataset.build as BuildKind)));
document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-category]").forEach(x=>x.classList.toggle("active",x===b));const cat=b.dataset.category;el("#catalog-structure").hidden=cat!=="structure";el("#catalog-rooms").hidden=cat!=="rooms";el("#catalog-furniture").hidden=cat!=="furniture";selectBuild(cat==="structure"?"wall":cat==="rooms"?"reception":"chair");}));
el<HTMLButtonElement>("#rotate-wall").addEventListener("click",()=>{wallRotation=wallRotation===0?90:0;status.textContent="اتجاه الحائط الآن "+(wallRotation===0?"أفقي":"رأسي")+". اختر الخلية التالية.";});
viewBtn.addEventListener("click",()=>{focus=!focus;cameraTarget.set(0,0,0);camera.setPosition(cameraTarget.x+(focus?8.5:11),focus?12:15,cameraTarget.z+(focus?8.5:11));camera.lookAt(cameraTarget);viewBtn.classList.toggle("active",focus);el("#camera-hint").classList.toggle("hide",focus);});
let sessionStep=0,sessionScore=0;
const steps=[
 {title:"استقبال المريض",intro:"وصل مريض جديد إلى عيادتك. ابدأ الجلسة بخطوة آمنة ومنظمة.",question:"ما أول خطوة مناسبة؟",options:[["safe","التحقق من علامات الخطر وأخذ التاريخ المرضي",true,"اختيار ممتاز. سلامة المريض وجمع المعلومات يسبقان أي تدخل."],["exercise","بدء التمارين مباشرة",false,"لا تبدأ التدخل قبل فهم الحالة والتحقق من علامات الخطر."],["diagnosis","تحديد التشخيص النهائي فوراً",false,"المعلومات الحالية لا تكفي لتشخيص نهائي. ابدأ بالتقييم."]]},
 {title:"التاريخ المرضي",intro:"المريض يذكر ألماً بعد رفع جسم ثقيل. اسأل عن تفاصيل الأعراض وتأثيرها.",question:"أي مجموعة أسئلة تساعدك أكثر؟",options:[["history","بداية الألم ومكانه وشدته وسلوكه والأعراض المصاحبة",true,"صحيح. هذه المعلومات تبني صورة سريرية أولية وتوجه الفحص."],["onlypain","السؤال عن شدة الألم فقط",false,"شدة الألم وحدها لا تكفي لفهم المشكلة."],["skip","تجاوز الأسئلة والانتقال للعلاج",false,"التاريخ المرضي جزء أساسي من التقييم."]]},
 {title:"الفحص السريري",intro:"بعد التاريخ المرضي والتحقق من الأمان، حان وقت اختيار فحص مناسب.",question:"ما التصرف الأفضل؟",options:[["exam","اختيار فحوصات مرتبطة بالفرضيات السريرية وبموافقة المريض",true,"ممتاز. اختر فحوصات موجهة وآمنة بناءً على المعلومات."],["random","إجراء كل الاختبارات بلا ترتيب",false,"الفحص العشوائي يرهق المريض ولا يحسن القرار."],["force","إجبار المريض على حركة مؤلمة",false,"الفحص يجب أن يكون آمناً ومناسباً لتحمل المريض."]]},
 {title:"خطة العلاج",intro:"لديك الآن معلومات أولية. ضع خطة مشتركة مع المريض وقابلة للقياس.",question:"أي خطة أفضل؟",options:[["plan","أهداف وظيفية واقعية وتدخل مناسب وتثقيف المريض",true,"صحيح. الخطة تتمحور حول وظيفة المريض واحتياجاته."],["passive","اعتماد جهاز علاجي فقط دون أهداف",false,"الخطة تحتاج أهدافاً واضحة ومشاركة نشطة من المريض."],["same","تطبيق نفس الخطة على كل المرضى",false,"العلاج يجب أن يُفصّل حسب تقييم كل حالة."]]},
 {title:"إعادة التقييم",intro:"انتهت الجلسة الأولى. كيف تعرف إن كانت خطتك مفيدة؟",question:"ما الخطوة الأخيرة؟",options:[["retest","إعادة قياس المؤشرات ومراجعة الأهداف وتعديل الخطة",true,"رائع. إعادة التقييم تربط التدخل بالنتيجة وتوجه الخطوة التالية."],["finish","إنهاء الجلسة دون قياس",false,"لا يمكن معرفة الاستجابة دون إعادة تقييم."],["repeat","تكرار التدخل نفسه مهما كانت الاستجابة",false,"القرار السريري يتغير وفق استجابة المريض."]]}
];
function renderStep(){const s=steps[sessionStep];el("#session-step").textContent="الجلسة التعليمية · "+(sessionStep+1)+" من 5";el("#session-title").textContent=s.title;el("#session-intro").textContent=s.intro;el("#session-question").textContent=s.question;el("#session-feedback").textContent="اختر إجابتك لتحصل على تغذية راجعة.";el<HTMLButtonElement>("#session-next").disabled=true;el("#session-next").textContent=sessionStep===4?"إنهاء الجلسة":"التالي";el("#session-options").innerHTML=s.options.map(o=>'<button type="button" data-session-choice="'+o[0]+'">'+o[1]+"</button>").join("");document.querySelectorAll<HTMLButtonElement>("[data-session-choice]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-session-choice]").forEach(x=>{(x as HTMLButtonElement).disabled=true;});b.classList.add("chosen");const option=s.options.find(o=>o[0]===b.dataset.sessionChoice)!;if(option[2])sessionScore++;el("#session-feedback").textContent=option[3] as string;el<HTMLButtonElement>("#session-next").disabled=false;}));}
sessionBtn.addEventListener("click",()=>{sessionStep=0;sessionScore=0;renderStep();sessionDialog.showModal();});
el<HTMLButtonElement>("#session-next").addEventListener("click",()=>{if(sessionStep<4){sessionStep++;renderStep();}else{const earned=sessionScore*8;xp+=sessionScore*10;coins+=earned;coinsLabel.textContent=String(coins);el("#experience").textContent=xp+" XP";el("#experience-text").textContent="أكملت جلستك بنتيجة "+sessionScore+" من 5. استمر في تطوير مهاراتك.";el("#session-title").textContent="أحسنت! انتهت الجلسة";el("#session-step").textContent="ملخص الجلسة التعليمية";el("#session-intro").textContent="هذه محاكاة تعليمية وليست تقييماً سريرياً حقيقياً.";el("#patient-brief").innerHTML="<b>نتيجتك: "+sessionScore+" / 5</b><span>عملات مكتسبة: "+earned+"</span><span>خبرة مكتسبة: "+(sessionScore*10)+" XP</span>";el("#session-question").textContent="تذكّر: سلامة المريض والتفكير المنظم وإعادة التقييم أساس الممارسة.";el("#session-options").innerHTML="";el("#session-feedback").textContent="يمكنك العودة إلى عيادتك وتطويرها.";el<HTMLButtonElement>("#session-next").disabled=false;el("#session-next").textContent="العودة إلى العيادة";el<HTMLButtonElement>("#session-next").onclick=()=>{save();sessionDialog.close();};save();}});
load();coins=100000;coinsLabel.textContent=String(coins);
let locomotionState="";
function setLocomotion(moving:boolean){
 if(!avatarAnim||!avatarClipNames.length)return;
 const desired=moving?(avatarClipNames.find(n=>/walk|walking|run/i.test(n))??avatarClipNames[0]):(avatarClipNames.find(n=>/idle|stand|rest/i.test(n))??avatarClipNames[0]);
 if(!desired||locomotionState===desired)return;
 try{avatarAnim.baseLayer?.play(desired,.2);locomotionState=desired;}catch{}
}
app.on("update",(dt:number)=>{
 if(!target)return;
 const p=avatar.getPosition(),dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
 if(d<.09){
  if(walkPath.length){const next=walkPath.shift()!;target=new pc.Vec3(next.x,0,next.z);}
  else{target=null;setLocomotion(false);}
 }else{
  setLocomotion(true);const step=Math.min(d,dt*1.45),moved=moveAvatarSafely(dx/d*step,dz/d*step);
  if(moved)avatar.setEulerAngles(0,Math.atan2(dx,dz)*180/Math.PI,0);
  else{target=null;walkPath=[];setLocomotion(false);status.textContent="تعذر إكمال المسار؛ اختر نقطة أخرى."; }
 }
});
let frames=0,elapsed=0;app.on("postupdate",(dt:number)=>{frames++;elapsed+=dt;if(elapsed>=1){fpsLabel.textContent=Math.round(frames/elapsed)+" FPS";frames=0;elapsed=0;}});
app.start();resize();requestAnimationFrame(resize);window.setTimeout(()=>{if(loading.classList.contains("done"))return;status.textContent="نحمّل أصول العيادة...";},4500);window.setTimeout(()=>el("#camera-hint").classList.add("hide"),6500);
window.addEventListener("pagehide",()=>{observer.disconnect();app.destroy();},{once:true});
