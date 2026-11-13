import * as pc from "playcanvas";
import "../style.css";

type BuildKind = "treatment" | "reception" | "gym" | "chair" | "plant" | "cabinet" | "parallel" | "bike" | "treadmill" | "wallbars" | "lamp" | "rug" | "wall" | "door" | "asset";
type Placed = { id:number; kind:BuildKind; gx:number; gz:number; rot?:0|90; assetKey?:string };
const el=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=el<HTMLCanvasElement>("#scene"), status=el<HTMLElement>("#status"), fpsLabel=el<HTMLElement>("#fps"), loading=el<HTMLElement>("#loading");
const stage=el<HTMLElement>(".stage"), moveBtn=el<HTMLButtonElement>("#move-mode"), buildBtn=el<HTMLButtonElement>("#build-mode"), sessionBtn=el<HTMLButtonElement>("#session-mode"), viewBtn=el<HTMLButtonElement>("#view-mode");
const buildPanel=el<HTMLElement>("#build-panel"), saveState=el<HTMLElement>("#save-state"), coinsLabel=el<HTMLElement>("#coins"), sessionDialog=el<HTMLDialogElement>("#session-dialog");
const app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:false,alpha:false,powerPreference:"low-power"}});
app.setCanvasFillMode(pc.FILLMODE_NONE);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,1.25);
canvas.style.width="100%";canvas.style.height="100%";canvas.style.display="block";
let lastViewportWidth=0,lastViewportHeight=0,resizeQueued=false;
const syncViewportHeight=()=>{
 const vv=window.visualViewport;
 const h=Math.max(1,Math.round(vv?.height??window.innerHeight));
 document.documentElement.style.setProperty("--app-height",h+"px");
};
const resize=()=>{
 resizeQueued=false;
 const rect=stage.getBoundingClientRect();
 const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
 if(w<2||h<2)return;
 if(w===lastViewportWidth&&h===lastViewportHeight&&canvas.width>0&&canvas.height>0)return;
 lastViewportWidth=w;lastViewportHeight=h;
 app.resizeCanvas(w,h);
 // Keep the same vertical world scale on phones; only the horizontal visible span adapts.
 const aspect=w/h;
 desiredOrthoHeight=aspect<.48?13.2:aspect<.62?12.6:aspect<.82?11.8:11.2;
 camera.camera!.orthoHeight=desiredOrthoHeight;
};
const queueResize=()=>{
 syncViewportHeight();
 if(resizeQueued)return;
 resizeQueued=true;
 requestAnimationFrame(resize);
};
syncViewportHeight();
const observer=new ResizeObserver(queueResize);
observer.observe(stage);
observer.observe(el<HTMLElement>(".clinic-app"));
window.addEventListener("resize",queueResize,{passive:true});
window.addEventListener("orientationchange",()=>window.setTimeout(queueResize,150),{passive:true});
window.visualViewport?.addEventListener("resize",queueResize,{passive:true});
window.visualViewport?.addEventListener("scroll",queueResize,{passive:true});
app.scene.ambientLight=new pc.Color(.62,.68,.76);
function material(c:pc.Color){const m=new pc.StandardMaterial();m.diffuse=c;m.update();return m;}
const M={ground:material(new pc.Color(.32,.48,.43)),tile:material(new pc.Color(.43,.59,.51)),grid:material(new pc.Color(.25,.4,.36)),room:material(new pc.Color(.78,.82,.79)),wall:material(new pc.Color(.88,.91,.86)),wallSide:material(new pc.Color(.53,.68,.69)),wood:material(new pc.Color(.48,.33,.23)),wood2:material(new pc.Color(.68,.49,.31)),teal:material(new pc.Color(.13,.48,.55)),blue:material(new pc.Color(.18,.35,.58)),pale:material(new pc.Color(.79,.9,.88)),green:material(new pc.Color(.2,.53,.36)),skin:material(new pc.Color(.7,.49,.36)),dark:material(new pc.Color(.1,.16,.21)),white:material(new pc.Color(.93,.94,.87)),yellow:material(new pc.Color(.85,.65,.27))};
function box(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){const e=new pc.Entity(name);e.addComponent("model",{type:"box"});e.setPosition(x,y,z);e.setLocalScale(sx,sy,sz);e.model!.material=m;e.model!.castShadows=true;e.model!.receiveShadows=true;parent.addChild(e);return e;}
function sphere(name:string,x:number,y:number,z:number,s:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){const e=new pc.Entity(name);e.addComponent("model",{type:"sphere"});e.setPosition(x,y,z);e.setLocalScale(s,s,s);e.model!.material=m;parent.addChild(e);return e;}
const camera=new pc.Entity("Portrait isometric camera");camera.addComponent("camera",{projection:pc.PROJECTION_ORTHOGRAPHIC,orthoHeight:10,clearColor:new pc.Color(.55,.7,.72),nearClip:.1,farClip:150});const cameraTarget=new pc.Vec3(0,0,0),cameraGoal=new pc.Vec3(0,0,0);camera.setPosition(11,15,11);camera.lookAt(cameraTarget);app.root.addChild(camera);
let desiredOrthoHeight=camera.camera!.orthoHeight;
const light=new pc.Entity("Soft daylight");light.addComponent("light",{type:"directional",intensity:1.65,castShadows:true,shadowResolution:2048,shadowType:pc.SHADOW_PCF3,shadowDistance:55,normalOffsetBias:.035});light.setEulerAngles(48,35,0);app.root.addChild(light);
const world=new pc.Entity("Clinic plot");app.root.addChild(world);
const GRID=1, W=16, D=16, HALF=W/2;
const floorBase=material(new pc.Color(.34,.52,.39));
const pathMat=material(new pc.Color(.72,.69,.59));
const pathEdge=material(new pc.Color(.52,.62,.52));
const glass=material(new pc.Color(.35,.72,.79));
box("Owned clinic lawn",0,-.22,0,W,.42,D,floorBase,world);
// A simple, readable approach path leads from the property edge to the standardized starter reception.
box("Front garden path",-2.0,.005,-4.4,1.8,.035,6.8,pathMat,world);
box("Path left edging",-2.98,.025,-4.4,.09,.06,6.8,pathEdge,world);
box("Path right edging",-1.02,.025,-4.4,.09,.06,6.8,pathEdge,world);
// Low landscaping frames the property without hiding the clinic or consuming many draw calls.
for(const [x,z] of [[-6,-5],[5,-5],[6,3],[-6,4]] as [number,number][]){
 const trunk=box("Garden tree trunk",x,.55,z,.22,1.1,.22,M.wood,world);
 const crown=sphere("Garden tree canopy",x,1.45,z,.82,M.green,world);
}
for(const [x,z] of [[-5,-2],[4,-3],[5,1],[-6,1]] as [number,number][]){
 box("Garden planter",x,.18,z,.8,.36,.8,M.wood2,world);
 sphere("Garden shrub",x,.72,z,.55,M.green,world);
}
box("THERASON clinic sign",-2.0,2.65,-1.05,2.2,.34,.12,M.teal,world);
box("Clinic sign face",-2.0,2.67,-1.13,1.8,.22,.035,M.white,world);
const roomRoot=new pc.Entity("Open clinic interior");world.addChild(roomRoot);
function makeRoom(kind:"treatment"|"reception"|"gym",gx:number,gz:number,id:number){
 const root=new pc.Entity("Room "+id);root.setPosition(gx+1,0,gz+1);world.addChild(root);
 const floor=kind==="gym"?material(new pc.Color(.45,.57,.59)):M.room;
 box("Room floor",1,.035,1,3.95,.07,3.95,floor,root);
 // Two full rear/side walls and a low front edge create readable open-top dollhouse view.
 box("Rear wall",1,1.05,3,4,2.1,.12,M.wall,root);if(id!==2)box("Left wall",-1,1.05,1,.12,2.1,4,M.wallSide,root);
 if(id===1){box("Shared wall front segment",3,1.05,-.35,.12,2.1,1.3,M.wall,root);box("Shared wall rear segment",3,1.05,2.35,.12,2.1,1.3,M.wall,root);box("Shared doorway lintel",3,2.0,1,.12,.16,1.4,M.white,root);}else box("Right wall",3,1.05,1,.12,2.1,4,M.wall,root);
 box("Front wall left",.15,.55,-1,.3,.55,.12,M.wall,root);box("Front wall right",2.35,.55,-1,1.3,.55,.12,M.wall,root);
 box("Door lintel",1.25,1.0,-1,.9,.12,.12,M.wall,root);
 box("Wall base rear",1,.17,2.91,4,.2,.15,M.teal,root);box("Wall base left",-.91,.17,1,.15,.2,4,M.teal,root);
 if(kind==="treatment"){
  box("Treatment bed base",1.95,.3,1.45,2.05,.2,.9,M.dark,root);box("Treatment mattress",1.95,.47,1.45,2,.2,.86,M.blue,root);box("Pillow",1.95,.59,1.12,.58,.1,.42,M.pale,root);
  for(const x of [1.12,2.78])for(const z of [1.12,1.78])box("Bed leg",x,.08,z,.08,.35,.08,M.dark,root);
  box("Therapy cabinet",.25,.55,2.4,.55,1.1,.55,M.wood2,root);box("Wall chart",2.3,1.65,2.91,.75,.65,.04,M.pale,root);
 }else if(kind==="reception"){
  box("Reception desk",.2,.48,2.35,1.8,.85,.65,M.wood,root);box("Desk top",.2,.94,2.35,1.9,.1,.72,M.wood2,root);box("Desk panel",.2,.45,2.01,1.4,.6,.03,M.teal,root);
  for(const z of [1.2,2.15]){box("Waiting chair",.5,.38,z,.65,.18,.62,M.teal,root);box("Chair back",.5,.75,z+.22,.65,.6,.13,M.blue,root);}
 }else{
  box("Exercise mat",1.1,.07,1.1,2.7,.08,1.25,M.blue,root);box("Parallel bar",.2,.6,2.45,.1,1.1,.1,M.wood2,root);box("Parallel bar",2,.6,2.45,.1,1.1,.1,M.wood2,root);box("Bar rail",1.1,1.08,2.45,1.9,.08,.08,M.yellow,root);
 }
 return root;
}
// The starter clinic is assembled from lightweight procedural geometry; optional GLB assets load independently.
const avatar=new pc.Entity("Student avatar");avatar.setPosition(-2.0,0,.55);world.addChild(avatar);
let avatarAnim:any=null;let playerRig:HumanoidRig|null=null;
const characterAssets:Record<string,string>={
 student:new URL("../assets/characters/Student.glb",import.meta.url).href,
 patient:new URL("../assets/characters/WardPatient.glb",import.meta.url).href,
};
type HumanoidRig={entity:pc.Entity;anim:any;clips:string[];idle:string;walk:string};
 function loadHumanoid(url:string,parent:pc.Entity,height:number,castShadow:boolean,onReady?:(rig:HumanoidRig)=>void){
 app.assets.loadFromUrl(url,"container",(err,asset)=>{
  if(err||!asset?.resource){console.error("Character asset failed",url,err);status.textContent="تعذر تحميل شخصية؛ بقية العيادة تستمر بالعمل.";return;}
  const model=asset.resource.instantiateRenderEntity({castShadows:castShadow,receiveShadows:false});
  model.name="Animated humanoid";parent.addChild(model);model.syncHierarchy();app.root.syncHierarchy();
  const meshes=model.findComponents("render").flatMap(r=>r.meshInstances);
  if(!meshes.length){console.error("Character GLB has no render meshes",url);model.destroy();return;}
  let minY=Infinity,maxY=-Infinity;
  for(const mesh of meshes){const b=mesh.aabb,c=b.center,h=b.halfExtents;minY=Math.min(minY,c.y-h.y);maxY=Math.max(maxY,c.y+h.y);}
  const measuredHeight=maxY-minY;const scale=height/Math.max(0.000001,measuredHeight);
  model.setLocalScale(scale,scale,scale);model.syncHierarchy();app.root.syncHierarchy();
  const scaled=model.findComponents("render").flatMap(r=>r.meshInstances);
  minY=Infinity;for(const mesh of scaled){const b=mesh.aabb;minY=Math.min(minY,b.center.y-b.halfExtents.y);}
  model.setLocalPosition(0,-minY,0);
  model.addComponent("anim",{activate:true,speed:1});
  const anim:any=(model as any).anim;
  const clips:any[]=asset.resource.animations??[];
  const names:string[]=[];
  if(anim){
   for(const clip of clips){
    const track:any=clip.resource;
    const clipName=String(track?.name||clip.name||"");
    if(track&&clipName){try{anim.assignAnimation(clipName,track);names.push(clipName);}catch(error){console.warn("Animation clip binding skipped",clipName,error);}}
   }
  }
  const idle=names.find(n=>/idle|stand|rest/i.test(n))??names[0]??"";
  const walk=names.find(n=>/walk|walking/i.test(n))??names.find(n=>/run|jog/i.test(n))??idle;
  const rig:HumanoidRig={entity:model,anim,clips:names,idle,walk};
   if(idle&&anim?.baseLayer){try{anim.baseLayer.play(idle);}catch(error){console.warn("Idle animation could not start",error);}}
  if(onReady)onReady(rig);
  console.info("Clinic character ready",url,{height,clips:names,idle,walk});
 });
}
function transitionHumanoid(rig:HumanoidRig|null,moving:boolean){
 if(!rig?.anim?.baseLayer)return;
 const desired=moving?rig.walk:rig.idle;
 if(!desired||rig.anim.baseLayer.activeState===desired)return;
 try{rig.anim.baseLayer.transition(desired,moving ? 0.22 : 0.3);rig.anim.speed=moving?1:1;}
 catch{try{rig.anim.baseLayer.play(desired);}catch{}}
}
loadHumanoid(characterAssets.student,avatar,1.72,true,rig=>{
 avatarAnim=rig.anim;playerRig=rig;
 status.textContent="الأخصائي جاهز. اضغط على مكان داخل العيادة ليتحرك إليه.";
});
const patientNpc=new pc.Entity("Clinic patient");patientNpc.setPosition(1.55,0,1.5);world.addChild(patientNpc);
loadHumanoid(characterAssets.patient,patientNpc,1.62,false);

let mode:"move"|"build"="move", selected:BuildKind="wall", selectedAssetKey:string|null=null, target:pc.Vec3|null=null, coins=350, xp=0, nextId=3, focus=false, wallRotation:0|90=0;
let placed:Placed[]=[];let walkPath:{x:number;z:number}[]=[];const saveKey="therason-clinic-world-v3"; 
const starterLayout:Placed[]=[{id:1,kind:"reception",gx:-4,gz:0},{id:2,kind:"treatment",gx:0,gz:0}];
const costs:Record<BuildKind,number>={treatment:0,reception:60,gym:90,chair:20,plant:15,cabinet:30,parallel:80,bike:100,treadmill:120,wallbars:70,lamp:15,rug:25,wall:8,door:22,asset:0};
const storeAssetSpecs:Record<string,{file:string;node:string;label:string;cost:number;footprint:number;targetSize:number}>={
 "pt-treatment-table":{file:"physical-therapy-room-set.glb",node:"TreatmentTable",label:"سرير علاج طبيعي",cost:90,footprint:3,targetSize:2.15},
 "pt-parallel-bars":{file:"physical-therapy-room-set.glb",node:"ParallelBars",label:"جهاز المتوازي",cost:100,footprint:3,targetSize:2.8},
 "pt-band-rack":{file:"physical-therapy-room-set.glb",node:"BandRack",label:"حامل أحزمة المقاومة",cost:35,footprint:2,targetSize:1.5},
 "pt-exercise-ball":{file:"physical-therapy-room-set.glb",node:"ExerciseBall",label:"كرة علاجية",cost:20,footprint:1,targetSize:.72},
 "pt-exercise-mat":{file:"physical-therapy-room-set.glb",node:"ExerciseMat",label:"بساط تمارين",cost:25,footprint:2,targetSize:2.2},
 "pt-hand-weights":{file:"physical-therapy-room-set.glb",node:"HandWeights",label:"أوزان علاجية",cost:30,footprint:2,targetSize:1.2},
 "pt-privacy-curtain":{file:"physical-therapy-room-set.glb",node:"PrivacyCurtain",label:"ستارة خصوصية",cost:45,footprint:3,targetSize:2.8},
 "pt-storage-cabinet":{file:"physical-therapy-room-set.glb",node:"StorageCabinet",label:"خزانة أدوات",cost:40,footprint:1,targetSize:1.1},
 "hospital-crutches":{file:"hospital-equipment-set.glb",node:"Crutches",label:"عكازات طبية",cost:18,footprint:1,targetSize:1.35},
 "hospital-first-aid":{file:"hospital-equipment-set.glb",node:"FirstAidBag",label:"حقيبة إسعافات",cost:15,footprint:1,targetSize:.65},
 "hospital-oxygen":{file:"hospital-equipment-set.glb",node:"OxygenTrolley",label:"عربة أكسجين",cost:55,footprint:1,targetSize:1.15},
 "hospital-stretcher":{file:"hospital-equipment-set.glb",node:"Stretcher",label:"نقالة طبية",cost:75,footprint:3,targetSize:2.7},
 "hospital-transport-chair":{file:"hospital-equipment-set.glb",node:"TransportChair",label:"كرسي نقل مرضى",cost:55,footprint:2,targetSize:1.25},
 "hospital-walking-frame":{file:"hospital-equipment-set.glb",node:"WalkingFrame",label:"مشاية طبية",cost:35,footprint:2,targetSize:1.15}
};
const clinicAssetUrls:Record<string,string>={
 "physical-therapy-room-set.glb":new URL("../assets/clinic-kit/hospital/physical-therapy-room-set.glb",import.meta.url).href,
 "hospital-equipment-set.glb":new URL("../assets/clinic-kit/hospital/hospital-equipment-set.glb",import.meta.url).href
};
const containerCache=new Map<string,Promise<any>>();
function getClinicContainer(url:string):Promise<any>{
 let pending=containerCache.get(url);
 if(!pending){
  pending=new Promise((resolve,reject)=>app.assets.loadFromUrl(url,"container",(err,asset)=>err||!asset?.resource?reject(err??new Error("Asset unavailable")):resolve(asset)));
  containerCache.set(url,pending);
 }
 return pending;
}
function loadClinicAsset(p:Placed){
 const spec=p.assetKey?storeAssetSpecs[p.assetKey]:undefined;
 if(!spec)return;
 const url=clinicAssetUrls[spec.file];
 getClinicContainer(url).then(asset=>{
  const container=asset.resource.instantiateRenderEntity({castShadows:false,receiveShadows:false});
  const chosen=container.children.find((child:pc.Entity)=>child.name===spec.node);
  if(!chosen){container.destroy();throw new Error("Missing model node "+spec.node);}
  container.removeChild(chosen);container.destroy();
  const size=spec.footprint,holder=new pc.Entity("3D asset · "+spec.label);
  holder.setPosition(p.gx+size/2,0,p.gz+size/2);world.addChild(holder);holder.addChild(chosen);
  chosen.setLocalPosition(0,0,0);chosen.setLocalEulerAngles(0,p.rot??0,0);
  holder.syncHierarchy();app.root.syncHierarchy();
  const getBounds=()=>{
   const meshes=chosen.findComponents("render").flatMap((r:any)=>r.meshInstances);
   let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
   for(const mesh of meshes){const b=mesh.aabb,c=b.center,h=b.halfExtents;minX=Math.min(minX,c.x-h.x);maxX=Math.max(maxX,c.x+h.x);minY=Math.min(minY,c.y-h.y);maxY=Math.max(maxY,c.y+h.y);minZ=Math.min(minZ,c.z-h.z);maxZ=Math.max(maxZ,c.z+h.z);}
   return {minX,maxX,minY,maxY,minZ,maxZ};
  };
  const before=getBounds(),scale=spec.targetSize/Math.max(before.maxX-before.minX,before.maxZ-before.minZ,.01);
  chosen.setLocalScale(scale,scale,scale);holder.syncHierarchy();app.root.syncHierarchy();
  const b=getBounds();
  chosen.setLocalPosition(holder.getPosition().x-(b.minX+b.maxX)/2,-b.minY,holder.getPosition().z-(b.minZ+b.maxZ)/2);
  holder.syncHierarchy();app.root.syncHierarchy();
 }).catch(error=>{console.error("Clinic store asset failed",spec.label,error);status.textContent="تعذر تحميل "+spec.label+"؛ تأكد من الاتصال ثم أعد المحاولة.";});
}

function save(){try{localStorage.setItem(saveKey,JSON.stringify({v:3,coins,xp,placed}));saveState.textContent="تم الحفظ";}catch{saveState.textContent="حفظ مؤقت";}}
function validSavedItem(value:any):value is Placed{
 if(!value||typeof value!=="object")return false;
 const kinds:BuildKind[]=["treatment","reception","gym","chair","plant","cabinet","parallel","bike","treadmill","wallbars","lamp","rug","wall","door","asset"];
 if(!kinds.includes(value.kind)||!Number.isSafeInteger(value.id)||value.id<1)return false;
 if(!Number.isInteger(value.gx)||!Number.isInteger(value.gz)||![0,90].includes(value.rot??0))return false;
 if(value.kind==="asset"&&(!value.assetKey||!storeAssetSpecs[value.assetKey]))return false;
 if(value.kind!=="asset"&&value.assetKey!==undefined)return false;
 const bounds=footprintAt(value.gx,value.gz,value.kind,value.rot??0,value.assetKey);
 return bounds.x>=-HALF&&bounds.z>=-HALF&&bounds.x+bounds.w<=HALF&&bounds.z+bounds.d<=HALF;
}
function load(){
 const useStarter=()=>{coins=350;xp=0;placed=starterLayout.map(p=>({...p}));nextId=3;for(const p of placed)drawPlaced(p);};
 try{
  const raw=localStorage.getItem(saveKey);if(!raw){useStarter();return;}
  const v=JSON.parse(raw);if(v.v!==3||!Array.isArray(v.placed)){useStarter();return;}
  coins=Number.isFinite(v.coins)?Math.max(0,Math.min(10000000,v.coins)):350;
  xp=Number.isFinite(v.xp)?Math.max(0,Math.min(1000000000,v.xp)):0;
  placed=[];const ids=new Set<number>();
  for(const candidate of v.placed.slice(0,60)){
   if(!validSavedItem(candidate)||ids.has(candidate.id))continue;
   if(occupied(candidate.gx,candidate.gz,candidate.kind,candidate.rot??0,candidate.assetKey))continue;
   const item:Placed={id:candidate.id,kind:candidate.kind,gx:candidate.gx,gz:candidate.gz,rot:candidate.rot??0,assetKey:candidate.assetKey};
   placed.push(item);ids.add(item.id);
  }
  if(v.placed.length>0&&placed.length===0){useStarter();return;}
  nextId=Math.max(3,...placed.map(p=>p.id+1));
  coinsLabel.textContent=String(coins);el("#experience").textContent=xp+" XP";
  for(const p of placed)drawPlaced(p);
 }catch{useStarter();}
}
function drawPlaced(p:Placed){if(p.kind==="asset"){loadClinicAsset(p);return;}const x=p.gx+.5,z=p.gz+.5;if(p.kind==="reception"||p.kind==="gym"||p.kind==="treatment"){const r=makeRoom(p.kind,p.gx,p.gz,p.id); return;}
 const root=new pc.Entity("Placed "+p.kind);
 if(p.kind==="wall")root.setPosition(p.rot===90?p.gx+1.5: x,0,p.rot===90?z:p.gz+1.5);
 else root.setPosition(x,0,z);
 root.setEulerAngles(0,p.rot??0,0);world.addChild(root);
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
function footprint(kind:BuildKind,assetKey?:string){if(kind==="asset")return storeAssetSpecs[assetKey??""]?.footprint??1;return kind==="treatment"||kind==="reception"||kind==="gym"?4:1;}
function footprintAt(gx:number,gz:number,kind:BuildKind,rot:0|90=0,assetKey?:string){
 const size=footprint(kind,assetKey);
 if(kind==="wall")return rot===0?{x:gx+.42,z:gz,w:.16,d:3}:{x:gx,z:gz+1.42,w:3,d:.16};
 if(kind==="door")return rot===0?{x:gx+.08,z:gz,w:.84,d:.22}:{x:gx,z:gz+.08,w:.22,d:.84};
 return {x:gx,z:gz,w:size,d:size};
}
function rectanglesOverlap(a:{x:number;z:number;w:number;d:number},b:{x:number;z:number;w:number;d:number}){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.z<b.z+b.d&&a.z+a.d>b.z;}
 function occupied(gx:number,gz:number,kind:BuildKind,rot:0|90=0,assetKey?:string){
 const a=footprintAt(gx,gz,kind,rot,assetKey);
 if(a.x< -HALF||a.z< -HALF||a.x+a.w>HALF||a.z+a.d>HALF)return true;
  const isRoom=(k:BuildKind)=>k==="treatment"||k==="reception"||k==="gym";
 return placed.some(p=>{const existingRoom=isRoom(p.kind),candidateRoom=isRoom(kind);if(existingRoom&&!candidateRoom)return false;return rectanglesOverlap(a,footprintAt(p.gx,p.gz,p.kind,p.rot,p.assetKey));});
}
function canAvatarStand(x:number,z:number){
 const r=.28;
 if(x-r< -HALF||x+r>HALF||z-r< -HALF||z+r>HALF)return false;
 const player={x:x-r,z:z-r,w:r*2,d:r*2};
 const boundary=[{x:-HALF,z:-HALF,w:W,d:.22},{x:-HALF,z:HALF-.22,w:W,d:.22},{x:-HALF,z:-HALF,w:.22,d:D},{x:HALF-.22,z:-HALF,w:.22,d:D}];
 if(boundary.some(w=>rectanglesOverlap(player,w)))return false;
 const roomBlocked=placed.some(p=>{
  if(p.kind==="treatment"||p.kind==="reception"||p.kind==="gym"){
   const x=p.gx,z=p.gz;
   // Match the collision rectangles to the actual room geometry (root is offset by +1,+1).
   const walls=[
    {x:x,z:z+3.9,w:4,d:.16},
    ...(p.id===2?[]:[{x:x,z:z,w:.16,d:4}]),
    ...(p.id===1?[
     {x:x+3.9,z:z,w:.16,d:1.3},
     {x:x+3.9,z:z+2.7,w:.16,d:1.3}
    ]:[{x:x+3.9,z:z,w:.16,d:4}]),
    {x:x+1,z:z-.05,w:.3,d:.14},
    {x:x+2.7,z:z-.05,w:1.3,d:.14}
   ];
   if(walls.some(w=>rectanglesOverlap(player,w)))return true;
   // Built-in furniture must block walking just like furniture placed by the learner.
   const furniture: {x:number;z:number;w:number;d:number}[] = p.kind==="reception"?[
    {x:x+.3,z:z+3.025,w:1.8,d:.65}, // reception counter
    {x:x+1.175,z:z+1.89,w:.65,d:.62}, // waiting seat
    {x:x+1.175,z:z+2.84,w:.65,d:.62}  // waiting seat
   ]:p.kind==="treatment"?[
    {x:x+1.925,z:z+2.0,w:2.05,d:.9}, // treatment bed
    {x:x+.975,z:z+3.125,w:.55,d:.55} // equipment cabinet
   ]:[];
   return furniture.some(w=>rectanglesOverlap(player,w));
  }
  return rectanglesOverlap(player,footprintAt(p.gx,p.gz,p.kind,p.rot,p.assetKey));
 });
 const patientBounds={x:1.55-.3,z:1.5-.3,w:.6,d:.6};
 return !roomBlocked&&!rectanglesOverlap(player,patientBounds);
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
canvas.addEventListener("pointerdown",e=>{activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size===2){const pts=[...activePointers.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);pinchHeight=desiredOrthoHeight;pointerStart=null;dragged=true;}else{pointerStart={x:e.clientX,y:e.clientY,cx:camera.getPosition().x,cz:camera.getPosition().z,tx:cameraGoal.x,tz:cameraGoal.z};dragged=false;}canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointermove",e=>{if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size>=2){const pts=[...activePointers.values()];const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance>0)desiredOrthoHeight=Math.max(9,Math.min(18,pinchHeight*pinchDistance/Math.max(1,distance)));dragged=true;return;}if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;if(Math.hypot(dx,dy)>8)dragged=true;if(dragged){const scale=camera.camera!.orthoHeight/Math.max(220,canvas.clientHeight),shiftX=-dx*scale*.7,shiftZ=dy*scale*.7;cameraGoal.set(Math.max(-5,Math.min(5,pointerStart.tx+shiftX)),0,Math.max(-5,Math.min(5,pointerStart.tz+shiftZ)));}});
canvas.addEventListener("pointerup",e=>{activePointers.delete(e.pointerId);if(activePointers.size<2)pinchDistance=0;if(!pointerStart){if(activePointers.size===1){const p=[...activePointers.values()][0];pointerStart={x:p.x,y:p.y,cx:camera.getPosition().x,cz:camera.getPosition().z,tx:cameraTarget.x,tz:cameraTarget.z};}else dragged=false;return;}const wasDrag=dragged;pointerStart=null;if(wasDrag)return;const p=screenToGround(e.clientX,e.clientY);if(!p)return;if(mode==="build"){const gx=Math.floor(p.x),gz=Math.floor(p.z);if(selected==="asset"&&!selectedAssetKey){status.textContent="اختر أصلاً من المتجر أولاً.";return;}if(occupied(gx,gz,selected,wallRotation,selectedAssetKey??undefined)){status.textContent="هذه الخلايا مشغولة. اختر مساحة فارغة بجوارها.";return;}const cost=selected==="asset"&&selectedAssetKey?storeAssetSpecs[selectedAssetKey].cost:costs[selected];if(coins<cost){status.textContent="عملاتك لا تكفي لهذه الإضافة بعد. أكمل جلساتك لاكتساب العملات.";return;}coins-=cost;coinsLabel.textContent=String(coins);const item:Placed={id:nextId++,kind:selected,gx,gz,rot:(selected==="wall"||selected==="door")?wallRotation:0,assetKey:selected==="asset"?selectedAssetKey??undefined:undefined};placed.push(item);drawPlaced(item);save();status.textContent="تمت الإضافة! تقدر تواصل تخطيط عيادتك.";return;}const tx=Math.round(p.x*2)/2,tz=Math.round(p.z*2)/2;const route=findWalkPath(avatar.getPosition().x,avatar.getPosition().z,tx,tz);if(!route||!route.length){status.textContent="لم أجد ممراً آمناً إلى هذه النقطة. اختر مكاناً أقرب أو ممراً أوسع.";return;}walkPath=route;const first=walkPath.shift()!;target=new pc.Vec3(first.x,0,first.z);status.textContent="الأخصائي يسلك أقرب ممر متاح.";});
canvas.addEventListener("pointercancel",e=>{activePointers.delete(e.pointerId);pointerStart=null;pinchDistance=0;dragged=false;});
function selectBuild(kind:BuildKind){selected=kind;selectedAssetKey=null;document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.classList.toggle("selected",b.dataset.build===kind));document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.classList.remove("selected"));const names:Record<BuildKind,string>={treatment:"غرفة علاج",reception:"استقبال",gym:"صالة تمارين",chair:"كرسي انتظار",plant:"نبات داخلي",cabinet:"خزانة أدوات",parallel:"متوازي",bike:"دراجة علاجية",treadmill:"سير مشي",wallbars:"سلم حائطي",lamp:"مصباح",rug:"سجادة",wall:"مقطع حائط",door:"باب",asset:"أصل ثلاثي الأبعاد"};el("#build-hint").textContent="تم اختيار "+names[kind]+". المس خلية فارغة لوضعه، ويمكنك تدوير الحائط من زر التدوير.";}
function selectAsset(key:string){const spec=storeAssetSpecs[key];if(!spec)return;selected="asset";selectedAssetKey=key;document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.classList.remove("selected"));document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.classList.toggle("selected",b.dataset.asset===key));el("#build-hint").textContent="تم اختيار "+spec.label+" من الأصول ثلاثية الأبعاد. يحتاج مساحة "+spec.footprint+"×"+spec.footprint+" خلايا.";}
moveBtn.addEventListener("click",()=>updateMode("move"));buildBtn.addEventListener("click",()=>updateMode(mode==="build"?"move":"build"));el("#cancel-build").addEventListener("click",()=>updateMode("move"));
document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.addEventListener("click",()=>selectBuild(b.dataset.build as BuildKind)));
document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.addEventListener("click",()=>selectAsset(b.dataset.asset??"")));
document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-category]").forEach(x=>x.classList.toggle("active",x===b));const cat=b.dataset.category;el("#catalog-structure").hidden=cat!=="structure";el("#catalog-rooms").hidden=cat!=="rooms";el("#catalog-furniture").hidden=cat!=="furniture";if(cat==="structure")selectBuild("wall");else if(cat==="rooms")selectBuild("reception");else selectAsset("pt-treatment-table");}));
el<HTMLButtonElement>("#rotate-wall").addEventListener("click",()=>{wallRotation=wallRotation===0?90:0;status.textContent="اتجاه الحائط الآن "+(wallRotation===0?"أفقي":"رأسي")+". اختر الخلية التالية.";});
viewBtn.addEventListener("click",()=>{focus=!focus;cameraGoal.set(0,0,0);desiredOrthoHeight=focus?10.2:(window.innerWidth/window.innerHeight<.48?13.2:12.6);viewBtn.classList.toggle("active",focus);el("#camera-hint").classList.toggle("hide",focus);});
let sessionStep=0,sessionScore=0;
const steps=[
 {title:"استقبال المريض",intro:"وصل مريض جديد إلى عيادتك. ابدأ الجلسة بخطوة آمنة ومنظمة.",question:"ما أول خطوة مناسبة؟",options:[["safe","التحقق من علامات الخطر وأخذ التاريخ المرضي",true,"اختيار ممتاز. سلامة المريض وجمع المعلومات يسبقان أي تدخل."],["exercise","بدء التمارين مباشرة",false,"لا تبدأ التدخل قبل فهم الحالة والتحقق من علامات الخطر."],["diagnosis","تحديد التشخيص النهائي فوراً",false,"المعلومات الحالية لا تكفي لتشخيص نهائي. ابدأ بالتقييم."]]},
 {title:"التاريخ المرضي",intro:"المريض يذكر ألماً بعد رفع جسم ثقيل. اسأل عن تفاصيل الأعراض وتأثيرها.",question:"أي مجموعة أسئلة تساعدك أكثر؟",options:[["history","بداية الألم ومكانه وشدته وسلوكه والأعراض المصاحبة",true,"صحيح. هذه المعلومات تبني صورة سريرية أولية وتوجه الفحص."],["onlypain","السؤال عن شدة الألم فقط",false,"شدة الألم وحدها لا تكفي لفهم المشكلة."],["skip","تجاوز الأسئلة والانتقال للعلاج",false,"التاريخ المرضي جزء أساسي من التقييم."]]},
 {title:"الفحص السريري",intro:"بعد التاريخ المرضي والتحقق من الأمان، حان وقت اختيار فحص مناسب.",question:"ما التصرف الأفضل؟",options:[["exam","اختيار فحوصات مرتبطة بالفرضيات السريرية وبموافقة المريض",true,"ممتاز. اختر فحوصات موجهة وآمنة بناءً على المعلومات."],["random","إجراء كل الاختبارات بلا ترتيب",false,"الفحص العشوائي يرهق المريض ولا يحسن القرار."],["force","إجبار المريض على حركة مؤلمة",false,"الفحص يجب أن يكون آمناً ومناسباً لتحمل المريض."]]},
 {title:"خطة العلاج",intro:"لديك الآن معلومات أولية. ضع خطة مشتركة مع المريض وقابلة للقياس.",question:"أي خطة أفضل؟",options:[["plan","أهداف وظيفية واقعية وتدخل مناسب وتثقيف المريض",true,"صحيح. الخطة تتمحور حول وظيفة المريض واحتياجاته."],["passive","اعتماد جهاز علاجي فقط دون أهداف",false,"الخطة تحتاج أهدافاً واضحة ومشاركة نشطة من المريض."],["same","تطبيق نفس الخطة على كل المرضى",false,"العلاج يجب أن يُفصّل حسب تقييم كل حالة."]]},
 {title:"إعادة التقييم",intro:"انتهت الجلسة الأولى. كيف تعرف إن كانت خطتك مفيدة؟",question:"ما الخطوة الأخيرة؟",options:[["retest","إعادة قياس المؤشرات ومراجعة الأهداف وتعديل الخطة",true,"رائع. إعادة التقييم تربط التدخل بالنتيجة وتوجه الخطوة التالية."],["finish","إنهاء الجلسة دون قياس",false,"لا يمكن معرفة الاستجابة دون إعادة تقييم."],["repeat","تكرار التدخل نفسه مهما كانت الاستجابة",false,"القرار السريري يتغير وفق استجابة المريض."]]}
];
function renderStep(){const s=steps[sessionStep];el("#session-step").textContent="الجلسة التعليمية · "+(sessionStep+1)+" من 5";el("#session-title").textContent=s.title;el("#session-intro").textContent=s.intro;el("#session-question").textContent=s.question;el("#session-feedback").textContent="اختر إجابتك لتحصل على تغذية راجعة.";el<HTMLButtonElement>("#session-next").disabled=true;el("#session-next").textContent=sessionStep===4?"إنهاء الجلسة":"التالي";el("#session-options").innerHTML=s.options.map(o=>'<button type="button" data-session-choice="'+o[0]+'">'+o[1]+"</button>").join("");document.querySelectorAll<HTMLButtonElement>("[data-session-choice]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-session-choice]").forEach(x=>{(x as HTMLButtonElement).disabled=true;});b.classList.add("chosen");const option=s.options.find(o=>o[0]===b.dataset.sessionChoice)!;if(option[2])sessionScore++;el("#session-feedback").textContent=option[3] as string;el<HTMLButtonElement>("#session-next").disabled=false;}));}
sessionBtn.addEventListener("click",()=>{sessionStep=0;sessionScore=0;focus=true;cameraGoal.set(2.1,0,2.0);desiredOrthoHeight=7.8;viewBtn.classList.add("active");renderStep();sessionDialog.showModal();});
sessionDialog.addEventListener("close",()=>{focus=false;cameraGoal.set(0,0,0);desiredOrthoHeight=window.innerWidth/window.innerHeight<.48?13.2:12.6;viewBtn.classList.remove("active");});
el<HTMLButtonElement>("#session-next").addEventListener("click",()=>{if(sessionStep<4){sessionStep++;renderStep();}else{const earned=sessionScore*8;xp+=sessionScore*10;coins+=earned;coinsLabel.textContent=String(coins);el("#experience").textContent=xp+" XP";el("#experience-text").textContent="أكملت جلستك بنتيجة "+sessionScore+" من 5. استمر في تطوير مهاراتك.";el("#session-title").textContent="أحسنت! انتهت الجلسة";el("#session-step").textContent="ملخص الجلسة التعليمية";el("#session-intro").textContent="هذه محاكاة تعليمية وليست تقييماً سريرياً حقيقياً.";el("#patient-brief").innerHTML="<b>نتيجتك: "+sessionScore+" / 5</b><span>عملات مكتسبة: "+earned+"</span><span>خبرة مكتسبة: "+(sessionScore*10)+" XP</span>";el("#session-question").textContent="تذكّر: سلامة المريض والتفكير المنظم وإعادة التقييم أساس الممارسة.";el("#session-options").innerHTML="";el("#session-feedback").textContent="يمكنك العودة إلى عيادتك وتطويرها.";el<HTMLButtonElement>("#session-next").disabled=false;el("#session-next").textContent="العودة إلى العيادة";el<HTMLButtonElement>("#session-next").onclick=()=>{save();sessionDialog.close();};save();}});
load();coinsLabel.textContent=String(coins);
let locomotionState="";
function setLocomotion(moving:boolean){
 if(!playerRig)return;
 const desired=moving?playerRig.walk:playerRig.idle;
 if(!desired||locomotionState===desired)return;
 transitionHumanoid(playerRig,moving);
 locomotionState=desired;
}
app.on("update",(dt:number)=>{
 if(document.hidden)return;
 // Clamp long frames after tab switches or weak-device stalls to prevent sudden character jumps.
 const frameDt=Math.min(Math.max(dt,0),.05);
 // Smooth camera follow/pan/zoom instead of snapping the camera on every touch event.
 const cameraAlpha=1-Math.exp(-frameDt*11);
 cameraTarget.x+=(cameraGoal.x-cameraTarget.x)*cameraAlpha;
 cameraTarget.z+=(cameraGoal.z-cameraTarget.z)*cameraAlpha;
 camera.camera!.orthoHeight+=(desiredOrthoHeight-camera.camera!.orthoHeight)*cameraAlpha;
 camera.setPosition(cameraTarget.x+(focus?8.5:11),focus?12:15,cameraTarget.z+(focus?8.5:11));
 camera.lookAt(cameraTarget);
 if(!target)return;
 const p=avatar.getPosition(),dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
 if(d<.07){
  if(walkPath.length){const next=walkPath.shift()!;target=new pc.Vec3(next.x,0,next.z);}
  else{target=null;setLocomotion(false);}
 }else{
  setLocomotion(true);
  const desiredYaw=Math.atan2(dx,dz)*180/Math.PI;
  const currentYaw=avatar.getEulerAngles().y;
  let yawDelta=((desiredYaw-currentYaw+540)%360)-180;
  const maxTurn=Math.max(1,frameDt*360);
  avatar.setEulerAngles(0,currentYaw+Math.max(-maxTurn,Math.min(maxTurn,yawDelta)),0);
  const walkSpeed=1.25;
  const step=Math.min(d,frameDt*walkSpeed),moved=moveAvatarSafely(dx/d*step,dz/d*step);
  if(!moved){target=null;walkPath=[];setLocomotion(false);status.textContent="تعذر إكمال المسار؛ اختر ممراً أوسع.";}
 }
});
let frames=0,elapsed=0;app.on("postupdate",(dt:number)=>{frames++;elapsed+=dt;if(elapsed>=1){fpsLabel.textContent=Math.round(frames/elapsed)+" FPS";frames=0;elapsed=0;}});
try{
 app.start();
 queueResize();
 requestAnimationFrame(()=>{queueResize();loading.classList.add("done");});
}catch(error){
 console.error("THERASON CLINIC startup failed",error);
 loading.classList.add("failed");
 loading.querySelector("b")!.textContent="تعذر تشغيل مشهد العيادة";
 loading.querySelector("small")!.textContent="أعد تحميل الصفحة؛ تم تسجيل سبب الخطأ للفحص.";
 status.textContent="حدث خطأ أثناء بدء محرك اللعبة.";
}
/* The base world is procedural and ready immediately; character assets load independently. */
window.setTimeout(()=>{if(!loading.classList.contains("done"))loading.classList.add("done");},1200);
window.setTimeout(()=>{if(!avatarAnim)status.textContent="العالم جاهز؛ ما زلنا نحاول تحميل شخصية الأخصائي.";},7000);window.setTimeout(()=>el("#camera-hint").classList.add("hide"),6500);
window.addEventListener("pagehide",()=>{observer.disconnect();app.destroy();},{once:true});
