import * as pc from "playcanvas";
import "../style.css";

type BuildKind = "treatment" | "reception" | "gym" | "chair" | "plant" | "cabinet" | "parallel" | "bike" | "treadmill" | "wallbars" | "lamp" | "rug" | "wall" | "door" | "asset";
type Placed = { id:number; kind:BuildKind; gx:number; gz:number; rot?:0|90; assetKey?:string };
const el=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=el<HTMLCanvasElement>("#scene"), status=el<HTMLElement>("#status"), fpsLabel=el<HTMLElement>("#fps"), loading=el<HTMLElement>("#loading");
const stage=el<HTMLElement>(".stage"), moveBtn=el<HTMLButtonElement>("#move-mode"), buildBtn=el<HTMLButtonElement>("#build-mode"), storeBtn=el<HTMLButtonElement>("#store-mode"), sessionBtn=el<HTMLButtonElement>("#session-mode"), viewBtn=el<HTMLButtonElement>("#view-mode");
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
 desiredOrthoHeight=aspect<.48?8.7:aspect<.62?9.2:aspect<.82?9.7:10.2;
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
app.scene.ambientLight=new pc.Color(.76,.78,.80);
function material(c:pc.Color){const m=new pc.StandardMaterial();m.diffuse=c;m.update();return m;}
const M={ground:material(new pc.Color(.32,.48,.43)),tile:material(new pc.Color(.43,.59,.51)),grid:material(new pc.Color(.25,.4,.36)),room:material(new pc.Color(.78,.82,.79)),wall:material(new pc.Color(.88,.91,.86)),wallSide:material(new pc.Color(.53,.68,.69)),wood:material(new pc.Color(.48,.33,.23)),wood2:material(new pc.Color(.68,.49,.31)),teal:material(new pc.Color(.13,.48,.55)),blue:material(new pc.Color(.18,.35,.58)),pale:material(new pc.Color(.79,.9,.88)),green:material(new pc.Color(.2,.53,.36)),skin:material(new pc.Color(.7,.49,.36)),dark:material(new pc.Color(.1,.16,.21)),white:material(new pc.Color(.93,.94,.87)),yellow:material(new pc.Color(.85,.65,.27))};
type PrimitiveModelType="box"|"capsule"|"cone"|"cylinder"|"plane"|"sphere"|"torus";
function primitive(name:string,type:PrimitiveModelType,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){
 const e=new pc.Entity(name);e.addComponent("model",{type});parent.addChild(e);e.setLocalPosition(x,y,z);e.setLocalScale(sx,sy,sz);
 e.model!.material=m;e.model!.castShadows=false;e.model!.receiveShadows=false;return e;
}
function box(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){return primitive(name,"box",x,y,z,sx,sy,sz,m,parent);}
function sphere(name:string,x:number,y:number,z:number,s:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){return primitive(name,"sphere",x,y,z,s,s,s,m,parent);}
function cylinder(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){return primitive(name,"cylinder",x,y,z,sx,sy,sz,m,parent);}
function cone(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){return primitive(name,"cone",x,y,z,sx,sy,sz,m,parent);}
const camera=new pc.Entity("Portrait isometric camera");
camera.addComponent("camera",{projection:pc.PROJECTION_ORTHOGRAPHIC,orthoHeight:12.9,clearColor:new pc.Color(.69,.79,.80),nearClip:.1,farClip:150});
const cameraTarget=new pc.Vec3(0,0,0),cameraGoal=new pc.Vec3(0,0,0);
camera.setPosition(3.5,21.5,-15);camera.lookAt(cameraTarget);app.root.addChild(camera);
let desiredOrthoHeight=8.7;
const light=new pc.Entity("Soft daylight");
light.addComponent("light",{type:"directional",intensity:1.15,castShadows:false});
light.setEulerAngles(48,25,0);app.root.addChild(light);
const world=new pc.Entity("Clinic property · portrait 3/4 world");
world.setEulerAngles(0,10,0);app.root.addChild(world);world.syncHierarchy();app.root.syncHierarchy();
const worldInverse=new pc.Mat4().invert(world.getWorldTransform() as pc.Mat4);
const tapMarker=new pc.Entity("Tap destination marker");
tapMarker.addComponent("model",{type:"cylinder"});
tapMarker.model!.material=M.yellow;
tapMarker.setLocalScale(.34,.035,.34);
tapMarker.enabled=false;
world.addChild(tapMarker);

const GRID=1, W=6.5, D=11.5, HALF_X=W/2, HALF_Z=D/2;
const floorBase=material(new pc.Color(.48,.53,.55)); // neutral paving; green is reserved for outdoor landscaping
const grassAlt=material(new pc.Color(.38,.53,.38));
const pathMat=material(new pc.Color(.72,.68,.57));
const pathEdge=material(new pc.Color(.48,.57,.47));
const glass=material(new pc.Color(.28,.67,.76));
const trim=material(new pc.Color(.10,.39,.47));
const roofAccent=material(new pc.Color(.16,.28,.38));
// A narrow, deep property is intentionally composed for a portrait isometric camera.
box("Owned landscaped property",0,-.22,0,W,.42,D,floorBase,world);
// Distinct planted beds sit above the paved plot only OUTSIDE the 4×8 m clinic footprint.
// Their continuous turf surface prevents the old "grass blades on concrete" appearance.
const lawnBase=material(new pc.Color(.27,.39,.25));
const lawnSoil=material(new pc.Color(.39,.29,.19));
box("West natural lawn bed",-2.63,.008,0,1.04,.045,9.65,lawnBase,world);
box("East natural lawn bed",2.63,.008,0,1.04,.045,9.65,lawnBase,world);
box("North natural lawn bed",0,.008,5.12,5.35,.045,.92,lawnBase,world);
box("South lawn bed west of entrance",-1.72,.008,-5.12,1.95,.045,.92,lawnBase,world);
box("South lawn bed east of entrance",1.72,.008,-5.12,1.95,.045,.92,lawnBase,world);
// Fine soil seams define planted edges without putting vegetation under the clinic walls.
for(const x of [-2.105,2.105])box("Lawn soil seam",x,.036,0,.045,.018,9.58,lawnSoil,world);
box("Entrance walk",0,.005,-5.12,1.65,.045,1.15,pathMat,world);
for(let i=0;i<5;i++)box("Entrance stepping stone",0,.055,-5.48+i*.25,1.30,.035,.23,pathEdge,world);
box("Entrance apron",0,.045,-4.12,2.8,.08,.65,pathMat,world);
// Low perimeter edging defines this starter plot while leaving the land visibly expandable.
for(const [x,z,sx,sz] of [[-2.05,-5.66,2.2,.18],[2.05,-5.66,2.2,.18],[0,5.66,6.3,.18],[-3.17,0,.18,11.3],[3.17,0,.18,11.3]] as [number,number,number,number][]){
 box("Property boundary edging",x,.17,z,sx,.34,sz,trim,world);
}
// Outdoor trees use clustered organic crowns rather than the old repeated cone silhouettes.
for(const [x,z] of [[-2.72,-5.02],[2.72,-5.02],[-2.72,5.02],[2.72,5.02]] as [number,number][]){
 cylinder("Garden tree trunk",x,.72,z,.16,1.44,.16,M.wood,world);
 const crown=sphere("Tree foliage core",x,1.78,z,.68,M.green,world);crown.setLocalScale(.82,1.08,.78);
 const crownTop=sphere("Tree foliage upper",x+.08,2.30,z+.03,.48,grassAlt,world);crownTop.setLocalScale(.82,1.05,.82);
 for(const [ox,oy,oz,scale] of [[-.38,1.78,.05,.42],[.38,1.72,-.08,.43],[.02,1.56,.38,.40]] as [number,number,number,number][]){
  const leaf=sphere("Tree foliage cluster",x+ox,oy,z+oz,scale,M.green,world);leaf.setLocalScale(1.05,1.0,.95);
 }
}
for(const [x,z] of [[-2.88,-1.8],[2.88,-.7],[-2.88,2.0],[2.88,3.8]] as [number,number][]){
 box("Outdoor planter",x,.18,z,.48,.36,.78,M.wood2,world);
 const shrub=sphere("Planter shrub",x,.63,z,.34,M.green,world);shrub.setLocalScale(1.1,.78,.9);
 const shrubTop=sphere("Planter shrub highlight",x+.08,.82,z-.04,.22,grassAlt,world);shrubTop.setLocalScale(1.2,.85,1.0);
}
 // One merged mesh gives the exterior lawn real 3D grass blades without hundreds of draw calls.
 function createLawnGrass(){
  const positions:number[]=[],indices:number[]=[],colors:number[]=[];
  let seed=7319;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const addTuft=(x:number,z:number)=>{
   const count=2+Math.floor(rand()*2);
   for(let n=0;n<count;n++){
    const angle=rand()*Math.PI,half=.018+rand()*.018,height=.12+rand()*.16;
    const lean=(rand()-.5)*.10,baseY=.034+rand()*.018;
    const dx=Math.cos(angle)*half,dz=Math.sin(angle)*half;
    const start=positions.length/3;
    positions.push(x-dx,baseY,z-dz,x+dx,baseY,z+dz,x+lean,baseY+height,z);
    const shade=rand();
    const col=shade>.72?[63,119,66,255]:shade<.2?[91,139,77,255]:[74,130,69,255];
    for(let k=0;k<3;k++)colors.push(...col);
    indices.push(start,start+1,start+2);
   }
  };
  for(let i=0;i<230;i++){
   const z=-4.7+rand()*9.4;
   addTuft(-2.72+rand()*.55,z);addTuft(2.17+rand()*.55,z);
  }
  for(let i=0;i<150;i++){
   const x=-2.85+rand()*5.7,z=rand()>.5?4.82+rand()*.72:-5.52+rand()*.72;
   if(z< -4.72&&Math.abs(x)<.95)continue;
   addTuft(x,z);
  }
  const mesh=new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(new Float32Array(positions));
  mesh.setNormals(pc.calculateNormals(positions,indices));
  mesh.setColors32(new Uint8Array(colors));
  mesh.setIndices(indices);mesh.update();
  const grassMat=material(new pc.Color(1,1,1));grassMat.diffuseVertexColor=true;grassMat.cull=pc.CULLFACE_NONE;grassMat.update();
  const entity=new pc.Entity("Exterior lawn · merged 3D grass");
  const model=new pc.Model();model.graph=entity;model.meshInstances=[new pc.MeshInstance(mesh,grassMat,entity)];
  entity.addComponent("model");entity.model!.model=model;world.addChild(entity);
 }
 createLawnGrass();
// The clinic identity is fixed to the entrance facade, not floating in the middle of the lawn.
box("THERASON entrance sign",0,2.55,-4.13,2.0,.46,.12,trim,world);
box("Entrance sign inset",0,2.56,-4.205,1.7,.27,.035,M.white,world);
box("Entrance canopy",0,2.15,-4.28,2.3,.16,.78,roofAccent,world);
const roomRoot=new pc.Entity("Starter clinic rooms");world.addChild(roomRoot);
function makeRoom(kind:"treatment"|"reception"|"gym",gx:number,gz:number,id:number){
 const root=new pc.Entity("Room "+id);
 world.addChild(root);root.setLocalPosition(gx+1,0,gz+1);
 const floor=kind==="gym"?material(new pc.Color(.40,.55,.58)):material(new pc.Color(.79,.82,.79));
 box("Room floor",1,.035,1,3.95,.07,3.95,floor,root);
 // Architectural finish: layered skirting, wall reveals and a restrained medical-grade palette.
 const skirting=material(new pc.Color(.34,.43,.46)), wallPanel=material(new pc.Color(.91,.92,.88)), doorFinish=material(new pc.Color(.72,.77,.75)),metal=material(new pc.Color(.43,.51,.54));
 box("Floor perimeter inlay",1,.078,1,3.78,.018,3.78,skirting,root);
 for(const x of [-.91,2.91])box("Wall skirting",x,.16,1,.045,.20,3.82,skirting,root);
 box("Rear wall skirting",1,.16,2.91,3.82,.20,.045,skirting,root);
 // Subtle wall panels and a continuous upper reveal make the room read as built architecture.
 for(const x of [-.55,.35,1.25,2.15])box("Interior wall panel",x,1.12,2.905,.72,1.62,.025,wallPanel,root);
 box("Rear wall upper reveal",1,2.31,2.89,3.9,.055,.055,metal,root);
 // Recessed ceiling light housings sit just above the open cutaway wall line.
 for(const x of [.25,1.75])box("Ceiling light housing",x,2.34,.15,.72,.055,.22,M.white,root);
 for(const x of [.25,1.75])box("Ceiling light diffuser",x,2.305,.15,.58,.018,.14,M.pale,root);
 // Modular 4×4 m room shell. Every wall segment has a matching navigation rectangle.
 box("Left exterior wall",-1,1.12,1,.16,2.24,4,M.wallSide,root);
 box("Right exterior wall",3,1.12,1,.16,2.24,4,M.wallSide,root);
 if(id===1){
  // Reception opens into the treatment room through the rear shared wall.
  box("Shared wall left",-.3,1.12,3,1.4,2.24,.16,M.wall,root);
  box("Shared wall right",2.3,1.12,3,1.4,2.24,.16,M.wall,root);
  box("Shared doorway lintel",1,2.18,3,1.2,.16,.18,M.white,root);
 }else{
  box("Rear exterior wall",1,1.12,3,4,2.24,.16,M.wall,root);
 }
 // Both reception and treatment have a clear 1.2 m front doorway.
 box("Front wall left",-.3,1.12,-1,1.4,2.24,.16,M.wall,root);
 box("Front wall right",2.3,1.12,-1,1.4,2.24,.16,M.wall,root);
 box("Front doorway lintel",1,2.18,-1,1.2,.16,.18,M.white,root);
 // Real door leaf, recessed frame and hardware; the leaf is left ajar so the passage stays usable.
 box("Door frame left",.34,1.10,-1.06,.075,2.20,.12,M.white,root);
 box("Door frame right",1.66,1.10,-1.06,.075,2.20,.12,M.white,root);
 box("Door leaf ajar",.48,1.04,-.88,.075,2.02,.92,doorFinish,root);
 cylinder("Door handle",.48,1.05,-.39,.035,.035,.035,metal,root);
 // Coloured plinths emphasize room edges without cluttering the walking space.
 for(const x of [-1,3]){
  box("Side wall teal plinth",x,.18,1,.18,.24,4,trim,root);
 }
 box("Front plinth left",-.3,.18,-1,1.4,.24,.2,trim,root);
 box("Front plinth right",2.3,.18,-1,1.4,.24,.2,trim,root);
 // A layered entrance portal gives the open-cutaway room a readable, built doorway.
 box("Entrance portal left pier",.20,1.10,-1.105,.12,2.20,.14,trim,root);
 box("Entrance portal right pier",1.80,1.10,-1.105,.12,2.20,.14,trim,root);
 box("Entrance portal header",1,2.22,-1.105,1.72,.12,.14,M.white,root);
 box("Door threshold",1,.075,-1.105,1.24,.07,.22,metal,root);
 if(id===1){
  box("Shared plinth left",-.3,.18,3,1.4,.24,.2,trim,root);
  box("Shared plinth right",2.3,.18,3,1.4,.24,.2,trim,root);
 }else{
  box("Rear wall teal plinth",1,.18,3,4,.24,.2,trim,root);
  box("Rear wall cap",1,2.25,3,4,.12,.22,M.white,root);
  // Daylight windows belong to the treatment room's external rear wall.
  for(const x of [.55,2.45]){
   box("Rear window glass",x,1.42,2.91,1.15,.86,.035,glass,root);
   box("Window top frame",x,1.89,2.88,1.24,.07,.09,M.white,root);
   box("Window bottom frame",x,.95,2.88,1.24,.07,.09,M.white,root);
   box("Window mullion",x,1.42,2.87,.055,.86,.09,M.white,root);
   box("Window left jamb",x-.61,1.42,2.87,.065,1.02,.10,metal,root);
   box("Window right jamb",x+.61,1.42,2.87,.065,1.02,.10,metal,root);
   box("Window centre rail",x,1.42,2.86,1.16,.045,.10,metal,root);
  }
 }
 if(kind==="treatment"){
  // Treatment equipment is loaded as individual GLB objects from the physiotherapy kit.
  box("Anatomy chart",2.45,1.6,2.91,.72,.62,.04,M.pale,root);
  box("Anatomy chart accent",2.45,1.6,2.875,.12,.42,.035,trim,root);
 }else if(kind==="reception"){
  loadReceptionDesk(root);
  loadWaitingSeats(root);
 }else{
  box("Exercise mat",1.1,.07,1.1,2.7,.08,1.25,M.blue,root);
  box("Parallel bar left",.2,.6,2.45,.1,1.1,.1,M.wood2,root);
  box("Parallel bar right",2,.6,2.45,.1,1.1,.1,M.wood2,root);
  box("Parallel bar rail",1.1,1.08,2.45,1.9,.08,.08,M.yellow,root);
 }
 return root;
}
// The starter clinic is assembled from lightweight procedural geometry; optional GLB assets load independently.
const avatar=new pc.Entity("Student avatar");world.addChild(avatar);avatar.setLocalPosition(0,0,-3.15);
let walkVelocity=0;
let avatarAnim:any=null;let playerRig:HumanoidRig|null=null;
const characterAssets:Record<string,string>={
 student:new URL("../assets/characters/Student.glb",import.meta.url).href,
 patient:new URL("../assets/characters/WardPatient.glb",import.meta.url).href,
};
type HumanoidRig={entity:pc.Entity;anim:any;clips:string[];idle:string;walk:string};
function createFallbackHumanoid(parent:pc.Entity,kind:"student"|"patient"){
 const root=new pc.Entity("Visible fallback "+kind);parent.addChild(root);
 const shirt=kind==="student"?M.white:M.pale,trousers=kind==="student"?M.blue:M.teal;
 box("Humanoid torso",0,1.02,0,.38,.62,.23,shirt,root);
 box("Humanoid neck",0,1.39,0,.105,.13,.11,M.skin,root);
 sphere("Humanoid head",0,1.56,0,.145,M.skin,root);
 sphere("Humanoid hair",0,1.675,-.025,.145,M.dark,root);
 for(const x of [-.13,.13]){
  box("Humanoid leg",x,.43,0,.145,.72,.16,trousers,root);
  box("Humanoid shoe",x,.075,.07,.18,.13,.28,M.dark,root);
 }
 for(const x of [-.29,.29]){
  box("Humanoid arm",x,1.02,0,.12,.58,.14,shirt,root);
  sphere("Humanoid hand",x,.70,.015,.085,M.skin,root);
 }
 if(kind==="student"){
  box("Physiotherapist ID badge",.12,1.18,-.132,.1,.13,.025,trim,root);
 }
 return root;
}

 function loadHumanoid(url:string,parent:pc.Entity,height:number,castShadow:boolean,onReady?:(rig:HumanoidRig)=>void){
 app.assets.loadFromUrl(url,"container",(err,asset)=>{
  if(err||!asset?.resource){console.error("Character asset failed",url,err);status.textContent="تم تشغيل شخصية بديلة خفيفة؛ تعذر تحميل النموذج الخارجي.";return;}
  const model=asset.resource.instantiateRenderEntity({castShadows:castShadow,receiveShadows:false});
  model.name="Animated humanoid";parent.addChild(model);model.syncHierarchy();app.root.syncHierarchy();
  const meshes=model.findComponents("render").flatMap((r:any)=>r.meshInstances);
  if(!meshes.length){console.error("Character GLB has no render meshes",url);model.destroy();return;}
  let minY=Infinity,maxY=-Infinity;
  for(const mesh of meshes){const b=mesh.aabb,c=b.center,h=b.halfExtents;minY=Math.min(minY,c.y-h.y);maxY=Math.max(maxY,c.y+h.y);}
  const measuredHeight=maxY-minY;
  if(!Number.isFinite(measuredHeight)||measuredHeight<.25||measuredHeight>8){console.error("Character asset has implausible dimensions",url,measuredHeight);model.destroy();return;}
  const scale=height/measuredHeight;
  model.setLocalScale(scale,scale,scale);model.syncHierarchy();app.root.syncHierarchy();
  const scaled=model.findComponents("render").flatMap((r:any)=>r.meshInstances);
  let scaledMinX=Infinity,scaledMaxX=-Infinity,scaledMinY=Infinity,scaledMinZ=Infinity,scaledMaxZ=-Infinity;
  for(const mesh of scaled){
   const b=mesh.aabb,c=b.center,h=b.halfExtents;
   scaledMinX=Math.min(scaledMinX,c.x-h.x);scaledMaxX=Math.max(scaledMaxX,c.x+h.x);
   scaledMinY=Math.min(scaledMinY,c.y-h.y);
   scaledMinZ=Math.min(scaledMinZ,c.z-h.z);scaledMaxZ=Math.max(scaledMaxZ,c.z+h.z);
  }
  // AABBs are in world space. Convert the bounds centre into the avatar's local frame
  // before setting the child model origin; never write world coordinates into localPosition.
  const parentInverse=new pc.Mat4().invert(parent.getWorldTransform() as pc.Mat4);
  const worldCenter=new pc.Vec3((scaledMinX+scaledMaxX)/2,parent.getPosition().y,(scaledMinZ+scaledMaxZ)/2);
  const localCenter=parentInverse.transformPoint(worldCenter,new pc.Vec3());
  model.setLocalPosition(-localCenter.x,-scaledMinY,-localCenter.z);
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
const studentFallback=createFallbackHumanoid(avatar,"student");
loadHumanoid(characterAssets.student,avatar,1.72,true,rig=>{
 studentFallback.destroy();
 avatarAnim=rig.anim;playerRig=rig;
 status.textContent="الأخصائي جاهز. اضغط على مكان داخل العيادة ليتحرك إليه.";
});
const patientNpc=new pc.Entity("Clinic patient");world.addChild(patientNpc);patientNpc.setLocalPosition(1.42,0,2.35);
const patientFallback=createFallbackHumanoid(patientNpc,"patient");
loadHumanoid(characterAssets.patient,patientNpc,1.62,false,()=>patientFallback.destroy());

let mode:"move"|"build"="move", selected:BuildKind="wall", selectedAssetKey:string|null=null, target:pc.Vec3|null=null, coins=350, xp=0, nextId=5, focus=false, wallRotation:0|90=0;
let placed:Placed[]=[];let walkPath:{x:number;z:number}[]=[];let destination:pc.Vec3|null=null;const saveKey="therason-clinic-world-v8";
const TRIAL_ACCOUNT_COINS=1000000; 
const starterLayout:Placed[]=[
 {id:1,kind:"reception",gx:-2,gz:-4},
 {id:2,kind:"treatment",gx:-2,gz:0},
 {id:3,kind:"asset",gx:-1,gz:1,rot:0,assetKey:"pt-treatment-table"},
 {id:4,kind:"asset",gx:-2,gz:2,rot:0,assetKey:"pt-storage-cabinet"}
];
const costs:Record<BuildKind,number>={treatment:0,reception:60,gym:90,chair:20,plant:15,cabinet:30,parallel:80,bike:100,treadmill:120,wallbars:70,lamp:15,rug:25,wall:8,door:22,asset:0};
const storeAssetSpecs:Record<string,{file:string;node:string;label:string;cost:number;footprint:number;targetSize:number}>={
 "pt-treatment-table":{file:"physical-therapy-room-set.glb",node:"TreatmentTable",label:"سرير علاج طبيعي",cost:90,footprint:2,targetSize:1.9},
 "pt-exam-table":{file:"doctors-office-set.glb",node:"ExamTable",label:"سرير فحص سريري",cost:95,footprint:2,targetSize:1.9},
 "pt-patient-chair":{file:"doctors-office-set.glb",node:"Chair_Patient",label:"كرسي المريض",cost:45,footprint:1,targetSize:0.9},
 "pt-doctor-desk":{file:"doctors-office-set.glb",node:"Desk_Doctor",label:"مكتب الأخصائي",cost:65,footprint:2,targetSize:1.35},
 "pt-privacy-screen":{file:"doctors-office-set.glb",node:"PrivacyCurtain",label:"حاجز خصوصية طبي",cost:60,footprint:2,targetSize:1.8},
 "pt-clinical-sink":{file:"doctors-office-set.glb",node:"Sink_Cabinet",label:"حوض غسل طبي",cost:50,footprint:1,targetSize:0.95},
 "pt-wall-chart":{file:"doctors-office-set.glb",node:"Wall_Chart",label:"لوحة فحص سريري",cost:25,footprint:1,targetSize:0.85},
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
 "hospital-equipment-set.glb":new URL("../assets/clinic-kit/hospital/hospital-equipment-set.glb",import.meta.url).href,
 "hospital-reception-desk.glb":new URL("../assets/clinic-kit/hospital/hospital-reception-desk.glb",import.meta.url).href,
 "hospital-patient-room.glb":new URL("../assets/clinic-kit/hospital/hospital-patient-room.glb",import.meta.url).href,
 "hospital-waiting-room.glb":new URL("../assets/clinic-kit/hospital/hospital-waiting-room.glb",import.meta.url).href,
 "doctors-office-set.glb":new URL("../assets/clinic-kit/hospital/doctors-office-set.glb",import.meta.url).href
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
function drawAssetFallback(p:Placed,spec:{label:string}){
 const root=new pc.Entity("Fallback prop · "+spec.label);
 root.setPosition(p.gx+(p.kind==="asset"&&p.assetKey==="pt-treatment-table"?1:0.5),0,p.gz+(p.kind==="asset"&&p.assetKey==="pt-treatment-table"?1:0.5));
 world.addChild(root);
 if(p.assetKey==="pt-treatment-table"){
  box("Fallback treatment bed base",0,.3,0,1.85,.2,.82,M.dark,root);
  box("Fallback treatment mattress",0,.47,0,1.8,.18,.78,M.blue,root);
  box("Fallback treatment pillow",0,.59,-.3,.48,.1,.28,M.pale,root);
  for(const x of [-.72,.72])for(const z of [-.28,.28])box("Fallback bed leg",x,.13,z,.08,.28,.08,M.dark,root);
 }else if(p.assetKey==="pt-storage-cabinet"){
  box("Fallback cabinet",0,.55,0,.62,1.1,.48,M.wood2,root);
  box("Fallback cabinet door",0,.55,.25,.54,.98,.025,M.wood,root);
 }
}
function collectDescendants(root:pc.Entity):pc.Entity[]{
 const found:pc.Entity[]=[];
 const visit=(node:pc.Entity)=>{for(const child of node.children as pc.Entity[]){found.push(child);visit(child);}};
 visit(root);return found;
}
function renderBounds(root:pc.Entity){
 const meshes=root.findComponents("render").flatMap((r:any)=>r.meshInstances);
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const mesh of meshes){const b=mesh.aabb,c=b.center,h=b.halfExtents;minX=Math.min(minX,c.x-h.x);maxX=Math.max(maxX,c.x+h.x);minY=Math.min(minY,c.y-h.y);maxY=Math.max(maxY,c.y+h.y);minZ=Math.min(minZ,c.z-h.z);maxZ=Math.max(maxZ,c.z+h.z);}
 if(!meshes.length||![minX,maxX,minY,maxY,minZ,maxZ].every(Number.isFinite))return null;
 return {minX,maxX,minY,maxY,minZ,maxZ,width:maxX-minX,height:maxY-minY,depth:maxZ-minZ};
}
function loadWaitingSeats(parent:pc.Entity){
 const url=clinicAssetUrls["hospital-waiting-room.glb"];
 getClinicContainer(url).then(asset=>{
  const source=asset.resource.instantiateRenderEntity({castShadows:false,receiveShadows:true});
  const seats=source.children.find((child:pc.Entity)=>child.name==="ChairRow_4");
  if(!seats){source.destroy();throw new Error("ChairRow_4 missing from waiting-room asset");}
  source.removeChild(seats);source.destroy();
  seats.setLocalPosition(0,0,0);seats.setLocalScale(1,1,1);
  parent.addChild(seats);seats.syncHierarchy();app.root.syncHierarchy();
  let bounds=renderBounds(seats);
  if(!bounds||bounds.width<.1||bounds.depth<.1){seats.destroy();throw new Error("Waiting seats have invalid bounds");}
  const scale=Math.min(2.2/bounds.width,.95/bounds.depth,1.05/bounds.height);
  seats.setLocalScale(scale,scale,scale);seats.syncHierarchy();app.root.syncHierarchy();
  bounds=renderBounds(seats);
  if(!bounds)throw new Error("Waiting seats have no render meshes");
  const target=parent.getWorldTransform().transformPoint(new pc.Vec3(.2,0,.7),new pc.Vec3());
  const current=seats.getPosition();
  seats.setPosition(current.x+target.x-(bounds.minX+bounds.maxX)/2,current.y-bounds.minY,current.z+target.z-(bounds.minZ+bounds.maxZ)/2);
  seats.syncHierarchy();app.root.syncHierarchy();
 }).catch(error=>{
  console.warn("Waiting-room GLB could not load; using compact seats",error);
  for(const z of [.55,1.45]){
   box("Waiting seat fallback",.35,.38,z,.65,.18,.62,M.teal,parent);
   box("Waiting seat back fallback",.35,.75,z+.22,.65,.6,.13,M.blue,parent);
  }
 });
}
function loadReceptionDesk(parent:pc.Entity){
 const url=clinicAssetUrls["hospital-reception-desk.glb"];
 getClinicContainer(url).then(asset=>{
  const model=asset.resource.instantiateRenderEntity({castShadows:true,receiveShadows:true});
  const keep=/^(Desk_|Drawer_|Keyboard_|Monitor_|Pedestal_|Screen_)/;
  // The source GLB is a complete reception scene (desk + chairs + curtains + plant + sanitizer).
  // Keep only the desk assembly; scaling the entire scene to desk size made the actual counter microscopic.
  const prune=(node:pc.Entity)=>{
   for(const child of [...node.children] as pc.Entity[]){
    if(!keep.test(child.name)){child.destroy();continue;}
    prune(child);
   }
  };
  prune(model);
  parent.addChild(model);model.syncHierarchy();app.root.syncHierarchy();
  let b=renderBounds(model);
  if(!b||b.width<.05||b.depth<.05||b.height<.05){model.destroy();throw new Error("Reception desk subset is empty or has invalid bounds");}
  const scale=Math.min(1.7/b.width,.9/b.depth,1.15/b.height);
  model.setLocalScale(scale,scale,scale);model.syncHierarchy();app.root.syncHierarchy();
  b=renderBounds(model);
  if(!b)throw new Error("Reception desk has no renderable meshes after scaling");
  const target=parent.getWorldTransform().transformPoint(new pc.Vec3(-.15,0,2.0),new pc.Vec3());
  const current=model.getPosition();
  model.setPosition(current.x+target.x-(b.minX+b.maxX)/2,current.y-b.minY,current.z+target.z-(b.minZ+b.maxZ)/2);
  model.syncHierarchy();app.root.syncHierarchy();
 }).catch(error=>{
  console.error("Reception desk GLB failed; using graceful fallback",error);
  box("Reception fallback desk",.2,.48,2.35,1.8,.85,.65,M.wood,parent);
  box("Reception fallback desk top",.2,.94,2.35,1.9,.1,.72,M.wood2,parent);
  box("Reception fallback monitor",.2,1.18,2.25,.42,.34,.05,M.dark,parent);
 });
}
function loadTreatmentRoomDecor(parent:pc.Entity){
 const url=clinicAssetUrls["hospital-patient-room.glb"];
 getClinicContainer(url).then(asset=>{
  const model=asset.resource.instantiateRenderEntity({castShadows:true,receiveShadows:true});
  const removePrefixes=["Bed_","BedRemote","IV_"];
  const removeExact=new Set(["Walls","Floor","BathroomDoor","Sign_Bathroom"]);
  for(const node of collectDescendants(model)){
   if(removeExact.has(node.name)||removePrefixes.some(prefix=>node.name.startsWith(prefix)))node.destroy();
  }
  // Reuse detailed licensed room props (cabinet, visitor chair, TV, blinds, curtain,
  // wall outlets and plant) while the clinic's own modular shell controls the doorways.
  parent.addChild(model);model.syncHierarchy();app.root.syncHierarchy();
  let b=renderBounds(model);
  if(!b||b.width<.05||b.depth<.05||b.height<.05){model.destroy();throw new Error("Treatment-room decor has invalid bounds");}
  const scale=Math.min(3.55/b.width,3.55/b.depth,2.0/b.height);
  model.setLocalScale(scale,scale,scale);model.syncHierarchy();app.root.syncHierarchy();
  b=renderBounds(model);
  if(!b)throw new Error("Treatment-room props have no renderable meshes");
  const target=parent.getWorldTransform().transformPoint(new pc.Vec3(1,0,1),new pc.Vec3());
  const current=model.getPosition();
  model.setPosition(current.x+target.x-(b.minX+b.maxX)/2,current.y-b.minY,current.z+target.z-(b.minZ+b.maxZ)/2);
  model.syncHierarchy();app.root.syncHierarchy();
 }).catch(error=>{
  console.warn("Treatment-room decorative GLB unavailable; procedural shell remains",error);
 });
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
  world.addChild(holder);holder.setLocalPosition(p.gx+size/2,0,p.gz+size/2);holder.addChild(chosen);
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
  const holderWorld=holder.getPosition(),chosenWorld=chosen.getPosition();
  chosen.setPosition(chosenWorld.x+holderWorld.x-(b.minX+b.maxX)/2,chosenWorld.y-b.minY,chosenWorld.z+holderWorld.z-(b.minZ+b.maxZ)/2);
  holder.syncHierarchy();app.root.syncHierarchy();
 }).catch(error=>{console.error("Clinic store asset failed",spec.label,error);drawAssetFallback(p,spec);status.textContent="تم استخدام نموذج احتياطي لـ "+spec.label+" بسبب تعذر تحميل الأصل.";});
}

function save(){try{localStorage.setItem(saveKey,JSON.stringify({v:4,coins,xp,placed}));saveState.textContent="تم الحفظ";}catch{saveState.textContent="حفظ مؤقت";}}
function validSavedItem(value:any):value is Placed{
 if(!value||typeof value!=="object")return false;
 const kinds:BuildKind[]=["treatment","reception","gym","chair","plant","cabinet","parallel","bike","treadmill","wallbars","lamp","rug","wall","door","asset"];
 if(!kinds.includes(value.kind)||!Number.isSafeInteger(value.id)||value.id<1)return false;
 if(!Number.isInteger(value.gx)||!Number.isInteger(value.gz)||![0,90].includes(value.rot??0))return false;
 if(value.kind==="asset"&&(!value.assetKey||!storeAssetSpecs[value.assetKey]))return false;
 if(value.kind!=="asset"&&value.assetKey!==undefined)return false;
 const bounds=footprintAt(value.gx,value.gz,value.kind,value.rot??0,value.assetKey);
 return bounds.x>=-HALF_X&&bounds.z>=-HALF_Z&&bounds.x+bounds.w<=HALF_X&&bounds.z+bounds.d<=HALF_Z;
}
function load(){
 const useStarter=()=>{coins=TRIAL_ACCOUNT_COINS;xp=0;placed=starterLayout.map(p=>({...p}));nextId=5;for(const p of placed)drawPlaced(p);};
 try{
  const raw=localStorage.getItem(saveKey);if(!raw){useStarter();return;}
  const v=JSON.parse(raw);if((v.v!==3&&v.v!==4)||!Array.isArray(v.placed)){useStarter();return;}
  coins=Math.max(TRIAL_ACCOUNT_COINS,Number.isFinite(v.coins)?Math.max(0,Math.min(10000000,v.coins)):0);
  xp=Number.isFinite(v.xp)?Math.max(0,Math.min(1000000000,v.xp)):0;
  placed=[];const ids=new Set<number>();
  for(const candidate of v.placed.slice(0,60)){
   if(!validSavedItem(candidate)||ids.has(candidate.id))continue;
   if(occupied(candidate.gx,candidate.gz,candidate.kind,candidate.rot??0,candidate.assetKey))continue;
   const item:Placed={id:candidate.id,kind:candidate.kind,gx:candidate.gx,gz:candidate.gz,rot:candidate.rot??0,assetKey:candidate.assetKey};
   placed.push(item);ids.add(item.id);
  }
  if(v.placed.length>0&&placed.length===0){useStarter();return;}
  nextId=Math.max(5,...placed.map(p=>p.id+1));
  coinsLabel.textContent=String(coins);el("#experience").textContent=xp+" XP";
  for(const p of placed)drawPlaced(p);
 }catch{useStarter();}
}
function drawPlaced(p:Placed){if(p.kind==="asset"){loadClinicAsset(p);return;}const x=p.gx+.5,z=p.gz+.5;if(p.kind==="reception"||p.kind==="gym"||p.kind==="treatment"){const r=makeRoom(p.kind,p.gx,p.gz,p.id); return;}
 const root=new pc.Entity("Placed "+p.kind);
 world.addChild(root);
 if(p.kind==="wall")root.setLocalPosition(p.rot===90?p.gx+1.5:x,0,p.rot===90?z:p.gz+1.5);
 else root.setLocalPosition(x,0,z);
 root.setLocalEulerAngles(0,p.rot??0,0);
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
 if(a.x< -HALF_X||a.z< -HALF_Z||a.x+a.w>HALF_X||a.z+a.d>HALF_Z)return true;
  const isRoom=(k:BuildKind)=>k==="treatment"||k==="reception"||k==="gym";
 return placed.some(p=>{const existingRoom=isRoom(p.kind),candidateRoom=isRoom(kind);if(existingRoom&&!candidateRoom)return false;return rectanglesOverlap(a,footprintAt(p.gx,p.gz,p.kind,p.rot,p.assetKey));});
}
function canAvatarStand(x:number,z:number){
 const radius=.28;
 if(x-radius< -HALF_X||x+radius>HALF_X||z-radius< -HALF_Z||z+radius>HALF_Z)return false;
 const player={x:x-radius,z:z-radius,w:radius*2,d:radius*2};
 // Patient is a real occupied spot; route to the nearest safe treatment-side approach, never through the body.
 if(rectanglesOverlap(player,{x:1.42-.28,z:2.35-.28,w:.56,d:.56}))return false;
 // Perimeter hedge and outdoor props are solid; the lawn is not an infinite walkable plane.
 const outdoorBarriers=[
  {x:-3.26,z:-5.65,w:.18,d:11.3},
  {x:3.08,z:-5.65,w:.18,d:11.3},
  {x:-3.15,z:-5.75,w:2.2,d:.18},
  {x:.95,z:-5.75,w:2.2,d:.18},
  {x:-3.15,z:5.57,w:6.3,d:.18}
 ];
 if(outdoorBarriers.some(w=>rectanglesOverlap(player,w)))return false;
 const gardenProps=[
  ...[[-2.72,-5.02],[2.72,-5.02],[-2.72,5.02],[2.72,5.02]].map(([gx,gz])=>({x:gx-.26,z:gz-.26,w:.52,d:.52})),
  ...[[-2.88,-1.8],[2.88,-.7],[-2.88,2.0],[2.88,3.8]].map(([gx,gz])=>({x:gx-.3,z:gz-.45,w:.6,d:.9}))
 ];
 if(gardenProps.some(w=>rectanglesOverlap(player,w)))return false;
 for(const p of placed){
  const isRoom=p.kind==="treatment"||p.kind==="reception"||p.kind==="gym";
  if(isRoom){
   const gx=p.gx,gz=p.gz;
   // Exact wall footprints match makeRoom(): two side walls, an entrance, and one shared rear doorway.
   const walls=[
    {x:gx-.08,z:gz,w:.16,d:4},
    {x:gx+3.92,z:gz,w:.16,d:4},
    {x:gx,z:gz-.08,w:1.4,d:.16},
    {x:gx+2.6,z:gz-.08,w:1.4,d:.16},
    ...(p.id===1?[
     {x:gx,z:gz+3.92,w:1.4,d:.16},
     {x:gx+2.6,z:gz+3.92,w:1.4,d:.16}
    ]:[{x:gx,z:gz+3.92,w:4,d:.16}])
   ];
   if(walls.some(w=>rectanglesOverlap(player,w)))return false;
   const furniture:{x:number;z:number;w:number;d:number}[]=p.kind==="reception"?[
    {x:gx,z:gz+2.55,w:1.7,d:.9},
    // Offset the real four-seat row to the left so the right-hand lane stays open to the internal door.
    {x:gx+.1,z:gz+1.225,w:2.2,d:.95}
   ]:p.kind==="treatment"?[]:[
    {x:gx+.15,z:gz+2.05,w:.2,d:1.1},
    {x:gx+1.95,z:gz+2.05,w:.2,d:1.1},
    {x:gx+.65,z:gz+2.4,w:1,d:.16}
   ];
   if(furniture.some(w=>rectanglesOverlap(player,w)))return false;
   continue;
  }
  if(rectanglesOverlap(player,footprintAt(p.gx,p.gz,p.kind,p.rot,p.assetKey)))return false;
 }
 return true;
}
function findWalkPath(sx:number,sz:number,tx:number,tz:number){
 const step=.25,cell=(v:number)=>Math.round(v/step),key=(x:number,z:number)=>x+","+z;
 const toWorld=(x:number,z:number)=>({x:x*step,z:z*step});
 const walkable=(x:number,z:number)=>{const p=toWorld(x,z);return canAvatarStand(p.x,p.z);};
 const startCell={x:cell(sx),z:cell(sz)},tapCell={x:cell(tx),z:cell(tz)},startKey=key(startCell.x,startCell.z);
 const candidates:{x:number;z:number;distance:number}[]=[];
 for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
  const x=tapCell.x+dx,z=tapCell.z+dz,p=toWorld(x,z),distance=Math.hypot(p.x-tx,p.z-tz);
  if(distance<=1.05&&walkable(x,z))candidates.push({x,z,distance});
 }
 candidates.sort((a,b)=>a.distance-b.distance);
 if(!candidates.length)return null;
 const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 type Node={x:number;z:number;g:number;f:number};
 const findTo=(goal:{x:number;z:number})=>{
  const heap:Node[]=[];
  const push=(node:Node)=>{
   let i=heap.length;heap.push(node);
   while(i>0){const parent=(i-1)>>1;if(heap[parent].f<=node.f)break;heap[i]=heap[parent];i=parent;}
   heap[i]=node;
  };
  const pop=()=>{
   const first=heap[0],last=heap.pop()!;
   if(heap.length){
    let i=0;
    while(true){let child=i*2+1;if(child>=heap.length)break;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;
     if(heap[child].f>=last.f)break;heap[i]=heap[child];i=child;
    }
    heap[i]=last;
   }
   return first;
  };
  const goalKey=key(goal.x,goal.z),cost=new Map<string,number>([[startKey,0]]),came=new Map<string,string>(),closed=new Set<string>();
  push({x:startCell.x,z:startCell.z,g:0,f:Math.hypot(goal.x-startCell.x,goal.z-startCell.z)});
  let iterations=0;
  while(heap.length&&iterations++<9000){
   const current=pop(),currentKey=key(current.x,current.z);
   if(closed.has(currentKey))continue;
   closed.add(currentKey);
   if(currentKey===goalKey){
    const route:{x:number;z:number}[]=[];let cursor=currentKey;
    while(cursor!==startKey){
     const [cx,cz]=cursor.split(",").map(Number);route.push(toWorld(cx,cz));
     const previous=came.get(cursor);if(!previous)break;cursor=previous;
    }
    return route.reverse();
   }
   for(const [dx,dz] of directions){
    const nx=current.x+dx,nz=current.z+dz,nextKey=key(nx,nz);
    if(closed.has(nextKey)||!walkable(nx,nz))continue;
    if(dx!==0&&dz!==0&&(!walkable(current.x+dx,current.z)||!walkable(current.x,current.z+dz)))continue;
    const nextCost=current.g+(dx!==0&&dz!==0?1.414:1);
    if(nextCost>=(cost.get(nextKey)??Infinity))continue;
    cost.set(nextKey,nextCost);came.set(nextKey,currentKey);
    push({x:nx,z:nz,g:nextCost,f:nextCost+Math.hypot(goal.x-nx,goal.z-nz)});
   }
  }
  return null;
 };
 // The closest clear point is tried first; inaccessible candidates do not trap the player on the wrong side of a wall.
 for(const candidate of candidates.slice(0,20)){
  const route=findTo(candidate);
  if(route!==null)return route;
 }
 return null;
}
function canWalkSegment(sx:number,sz:number,tx:number,tz:number){
 const distance=Math.hypot(tx-sx,tz-sz),samples=Math.max(1,Math.ceil(distance/.12));
 for(let i=1;i<=samples;i++){const t=i/samples;if(!canAvatarStand(sx+(tx-sx)*t,sz+(tz-sz)*t))return false;}
 return true;
}
function simplifyWalkRoute(route:{x:number;z:number}[],sx:number,sz:number){
 if(route.length<2)return route;
 const result:{x:number;z:number}[]=[];let fromX=sx,fromZ=sz,index=0;
 while(index<route.length){
  let farthest=index;
  for(let j=route.length-1;j>index;j--)if(canWalkSegment(fromX,fromZ,route[j].x,route[j].z)){farthest=j;break;}
  const point=route[farthest];result.push(point);fromX=point.x;fromZ=point.z;index=farthest+1;
 }
 return result;
}
function moveAvatarSafely(dx:number,dz:number){
 const p=avatar.getLocalPosition().clone(),distance=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(distance/.04));
 let x=p.x,z=p.z;
 for(let i=1;i<=steps;i++){
  const nx=p.x+dx*i/steps,nz=p.z+dz*i/steps;
  if(canAvatarStand(nx,nz)){x=nx;z=nz;continue;}
  const canX=canAvatarStand(nx,z),canZ=canAvatarStand(x,nz);
  if(canX)x=nx;if(canZ)z=nz;if(!canX&&!canZ)break;
 }
 avatar.setLocalPosition(x,0,z);
 return Math.hypot(x-p.x,z-p.z)>.001;
}
function updateMode(next:"move"|"build"){mode=next;if(next==="build"){destination=null;target=null;walkPath=[];setLocomotion(false);tapMarker.enabled=false;}moveBtn.classList.toggle("active",mode==="move");buildBtn.classList.toggle("active",mode==="build");buildPanel.hidden=mode!=="build";status.textContent=mode==="move"?"اضغط على الأرض لتحريك شخصيتك. اسحب لتحريك الكاميرا.":"اختر غرفة أو قطعة ثم المس خلية فارغة في الشبكة.";}
function screenToGround(clientX:number,clientY:number){
 const rect=canvas.getBoundingClientRect();
 const px=(clientX-rect.left)*(canvas.width/rect.width),py=(clientY-rect.top)*(canvas.height/rect.height);
 const near=camera.camera!.screenToWorld(px,py,.1),far=camera.camera!.screenToWorld(px,py,100),direction=far.sub(near);
 if(Math.abs(direction.y)<.0001)return null;
 const t=-near.y/direction.y;if(t<0)return null;
 const worldPoint=near.add(direction.mulScalar(t));
 const localPoint=worldInverse.transformPoint(worldPoint,new pc.Vec3());
 if(Math.abs(localPoint.x)>HALF_X||Math.abs(localPoint.z)>HALF_Z)return null;
 return localPoint;
}
let pointerStart:{x:number;y:number;cx:number;cz:number;tx:number;tz:number}|null=null,dragged=false;const activePointers=new Map<number,{x:number;y:number}>();let pinchDistance=0,pinchHeight=0;
canvas.addEventListener("pointerdown",e=>{activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size===2){const pts=[...activePointers.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);pinchHeight=desiredOrthoHeight;pointerStart=null;dragged=true;}else{pointerStart={x:e.clientX,y:e.clientY,cx:camera.getPosition().x,cz:camera.getPosition().z,tx:cameraGoal.x,tz:cameraGoal.z};dragged=false;}canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointermove",e=>{if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size>=2){const pts=[...activePointers.values()];const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance>0)desiredOrthoHeight=Math.max(7.2,Math.min(14,pinchHeight*pinchDistance/Math.max(1,distance)));dragged=true;return;}if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;if(Math.hypot(dx,dy)>8)dragged=true;if(dragged){const scale=camera.camera!.orthoHeight/Math.max(220,canvas.clientHeight),shiftX=-dx*scale*.7,shiftZ=dy*scale*.7;cameraGoal.set(Math.max(-2.2,Math.min(2.2,pointerStart.tx+shiftX)),0,Math.max(-5.8,Math.min(5.8,pointerStart.tz+shiftZ)));}});
canvas.addEventListener("pointerup",e=>{
 activePointers.delete(e.pointerId);if(activePointers.size<2)pinchDistance=0;
 if(!pointerStart){
  if(activePointers.size===1){const point=[...activePointers.values()][0];pointerStart={x:point.x,y:point.y,cx:camera.getPosition().x,cz:camera.getPosition().z,tx:cameraTarget.x,tz:cameraTarget.z};}
  else dragged=false;
  return;
 }
 const wasDrag=dragged;pointerStart=null;if(wasDrag)return;
 const ground=screenToGround(e.clientX,e.clientY);if(!ground)return;
 if(mode==="build"){
  const gx=Math.floor(ground.x),gz=Math.floor(ground.z);
  if(selected==="asset"&&!selectedAssetKey){status.textContent="اختر أصلاً من المتجر أولاً.";return;}
  if(occupied(gx,gz,selected,wallRotation,selectedAssetKey??undefined)){status.textContent="هذه الخلايا مشغولة. اختر مساحة فارغة بجوارها.";return;}
  const cost=selected==="asset"&&selectedAssetKey?storeAssetSpecs[selectedAssetKey].cost:costs[selected];
  if(coins<cost){status.textContent="عملاتك لا تكفي لهذه الإضافة بعد. أكمل جلساتك لاكتساب العملات.";return;}
  coins-=cost;coinsLabel.textContent=String(coins);
  const item:Placed={id:nextId++,kind:selected,gx,gz,rot:(selected==="wall"||selected==="door")?wallRotation:0,assetKey:selected==="asset"?selectedAssetKey??undefined:undefined};
  placed.push(item);drawPlaced(item);save();status.textContent="تمت الإضافة! تقدر تواصل تخطيط عيادتك.";return;
 }
 const start=avatar.getLocalPosition().clone(),tx=ground.x,tz=ground.z;
 destination=new pc.Vec3(tx,0,tz);
 tapMarker.setLocalPosition(tx,.035,tz);tapMarker.enabled=true;
 // Open-floor taps move to the exact point; the grid pathfinder is reserved for blocked lines of sight.
 if(canWalkSegment(start.x,start.z,tx,tz)){
  walkPath=[];target=destination.clone();setLocomotion(true);
  status.textContent="الأخصائي يتحرك مباشرة إلى النقطة المحددة.";
  return;
 }
 const rawRoute=findWalkPath(start.x,start.z,tx,tz);
 if(rawRoute===null){destination=null;target=null;walkPath=[];setLocomotion(false);status.textContent="لا يوجد مسار متصل إلى هذه النقطة. اختر نقطة داخل ممر متاح.";return;}
 const route=simplifyWalkRoute(rawRoute,start.x,start.z);
 if(!route.length){destination=null;target=null;setLocomotion(false);status.textContent="أنت قريب من النقطة المحددة، لكن لا يوجد ممر إضافي.";return;}
 walkPath=route;
 const last=walkPath[walkPath.length-1];
 if(canWalkSegment(last.x,last.z,tx,tz))walkPath.push({x:tx,z:tz});
 const first=walkPath.shift()!;
 target=new pc.Vec3(first.x,0,first.z);
 setLocomotion(true);
 status.textContent="الأخصائي يلتف حول العائق ويتجه إلى النقطة المحددة.";
});
canvas.addEventListener("pointercancel",e=>{activePointers.delete(e.pointerId);pointerStart=null;pinchDistance=0;dragged=false;});
function selectBuild(kind:BuildKind){selected=kind;selectedAssetKey=null;document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.classList.toggle("selected",b.dataset.build===kind));document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.classList.remove("selected"));const names:Record<BuildKind,string>={treatment:"غرفة علاج",reception:"استقبال",gym:"صالة تمارين",chair:"كرسي انتظار",plant:"نبات داخلي",cabinet:"خزانة أدوات",parallel:"متوازي",bike:"دراجة علاجية",treadmill:"سير مشي",wallbars:"سلم حائطي",lamp:"مصباح",rug:"سجادة",wall:"مقطع حائط",door:"باب",asset:"أصل ثلاثي الأبعاد"};el("#build-hint").textContent="تم اختيار "+names[kind]+". المس خلية فارغة لوضعه، ويمكنك تدوير الحائط من زر التدوير.";}
function selectAsset(key:string){const spec=storeAssetSpecs[key];if(!spec)return;selected="asset";selectedAssetKey=key;document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.classList.remove("selected"));document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.classList.toggle("selected",b.dataset.asset===key));el("#build-hint").textContent="تم اختيار "+spec.label+" من الأصول ثلاثية الأبعاد. يحتاج مساحة "+spec.footprint+"×"+spec.footprint+" خلايا.";}
moveBtn.addEventListener("click",()=>{updateMode("move");storeBtn.classList.remove("active");});
buildBtn.addEventListener("click",()=>{updateMode(mode==="build"?"move":"build");storeBtn.classList.remove("active");});
el("#cancel-build").addEventListener("click",()=>{updateMode("move");storeBtn.classList.remove("active");});
storeBtn.addEventListener("click",()=>{
 updateMode("build");
 document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(b=>b.classList.toggle("active",b.dataset.category==="furniture"));
 el("#catalog-structure").hidden=true;
 el("#catalog-rooms").hidden=true;
 el("#catalog-furniture").hidden=false;
 selectAsset("pt-treatment-table");
 storeBtn.classList.add("active");
 status.textContent="المتجر مفتوح: اختر أصلاً طبياً ثم المس مكاناً فارغاً لوضعه.";
});
document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.addEventListener("click",()=>selectBuild(b.dataset.build as BuildKind)));
document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.addEventListener("click",()=>selectAsset(b.dataset.asset??"")));
document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-category]").forEach(x=>x.classList.toggle("active",x===b));const cat=b.dataset.category;el("#catalog-structure").hidden=cat!=="structure";el("#catalog-rooms").hidden=cat!=="rooms";el("#catalog-furniture").hidden=cat!=="furniture";if(cat==="structure")selectBuild("wall");else if(cat==="rooms")selectBuild("reception");else selectAsset("pt-treatment-table");}));
el<HTMLButtonElement>("#rotate-wall").addEventListener("click",()=>{wallRotation=wallRotation===0?90:0;status.textContent="اتجاه الحائط الآن "+(wallRotation===0?"أفقي":"رأسي")+". اختر الخلية التالية.";});
viewBtn.addEventListener("click",()=>{focus=!focus;cameraGoal.set(0,0,0);desiredOrthoHeight=focus?7.2:(window.innerWidth/window.innerHeight<.48?8.7:9.2);viewBtn.classList.toggle("active",focus);el("#camera-hint").classList.toggle("hide",focus);});
let sessionStep=0,sessionScore=0;
let sessionPending=false;
const steps=[
 {title:"استقبال المريض",intro:"وصل مريض جديد إلى عيادتك. ابدأ الجلسة بخطوة آمنة ومنظمة.",question:"ما أول خطوة مناسبة؟",options:[["safe","التحقق من علامات الخطر وأخذ التاريخ المرضي",true,"اختيار ممتاز. سلامة المريض وجمع المعلومات يسبقان أي تدخل."],["exercise","بدء التمارين مباشرة",false,"لا تبدأ التدخل قبل فهم الحالة والتحقق من علامات الخطر."],["diagnosis","تحديد التشخيص النهائي فوراً",false,"المعلومات الحالية لا تكفي لتشخيص نهائي. ابدأ بالتقييم."]]},
 {title:"التاريخ المرضي",intro:"المريض يذكر ألماً بعد رفع جسم ثقيل. اسأل عن تفاصيل الأعراض وتأثيرها.",question:"أي مجموعة أسئلة تساعدك أكثر؟",options:[["history","بداية الألم ومكانه وشدته وسلوكه والأعراض المصاحبة",true,"صحيح. هذه المعلومات تبني صورة سريرية أولية وتوجه الفحص."],["onlypain","السؤال عن شدة الألم فقط",false,"شدة الألم وحدها لا تكفي لفهم المشكلة."],["skip","تجاوز الأسئلة والانتقال للعلاج",false,"التاريخ المرضي جزء أساسي من التقييم."]]},
 {title:"الفحص السريري",intro:"بعد التاريخ المرضي والتحقق من الأمان، حان وقت اختيار فحص مناسب.",question:"ما التصرف الأفضل؟",options:[["exam","اختيار فحوصات مرتبطة بالفرضيات السريرية وبموافقة المريض",true,"ممتاز. اختر فحوصات موجهة وآمنة بناءً على المعلومات."],["random","إجراء كل الاختبارات بلا ترتيب",false,"الفحص العشوائي يرهق المريض ولا يحسن القرار."],["force","إجبار المريض على حركة مؤلمة",false,"الفحص يجب أن يكون آمناً ومناسباً لتحمل المريض."]]},
 {title:"خطة العلاج",intro:"لديك الآن معلومات أولية. ضع خطة مشتركة مع المريض وقابلة للقياس.",question:"أي خطة أفضل؟",options:[["plan","أهداف وظيفية واقعية وتدخل مناسب وتثقيف المريض",true,"صحيح. الخطة تتمحور حول وظيفة المريض واحتياجاته."],["passive","اعتماد جهاز علاجي فقط دون أهداف",false,"الخطة تحتاج أهدافاً واضحة ومشاركة نشطة من المريض."],["same","تطبيق نفس الخطة على كل المرضى",false,"العلاج يجب أن يُفصّل حسب تقييم كل حالة."]]},
 {title:"إعادة التقييم",intro:"انتهت الجلسة الأولى. كيف تعرف إن كانت خطتك مفيدة؟",question:"ما الخطوة الأخيرة؟",options:[["retest","إعادة قياس المؤشرات ومراجعة الأهداف وتعديل الخطة",true,"رائع. إعادة التقييم تربط التدخل بالنتيجة وتوجه الخطوة التالية."],["finish","إنهاء الجلسة دون قياس",false,"لا يمكن معرفة الاستجابة دون إعادة تقييم."],["repeat","تكرار التدخل نفسه مهما كانت الاستجابة",false,"القرار السريري يتغير وفق استجابة المريض."]]}
];
function renderStep(){const s=steps[sessionStep];el("#session-step").textContent="الجلسة التعليمية · "+(sessionStep+1)+" من 5";el("#session-title").textContent=s.title;el("#session-intro").textContent=s.intro;el("#session-question").textContent=s.question;el("#session-feedback").textContent="اختر إجابتك لتحصل على تغذية راجعة.";el<HTMLButtonElement>("#session-next").disabled=true;el("#session-next").textContent=sessionStep===4?"إنهاء الجلسة":"التالي";el("#session-options").innerHTML=s.options.map(o=>'<button type="button" data-session-choice="'+o[0]+'">'+o[1]+"</button>").join("");document.querySelectorAll<HTMLButtonElement>("[data-session-choice]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-session-choice]").forEach(x=>{(x as HTMLButtonElement).disabled=true;});b.classList.add("chosen");const option=s.options.find(o=>o[0]===b.dataset.sessionChoice)!;if(option[2])sessionScore++;el("#session-feedback").textContent=option[3] as string;el<HTMLButtonElement>("#session-next").disabled=false;}));}
sessionBtn.addEventListener("click",()=>{sessionStep=0;sessionScore=0;focus=true;cameraGoal.set(0,0,2.0);desiredOrthoHeight=8.5;viewBtn.classList.add("active");renderStep();sessionPending=moveAvatarTo(1.35,1.7);if(!sessionPending)sessionDialog.showModal();});
sessionDialog.addEventListener("close",()=>{focus=false;cameraGoal.set(0,0,0);desiredOrthoHeight=window.innerWidth/window.innerHeight<.48?8.7:9.2;viewBtn.classList.remove("active");});
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
function moveAvatarTo(tx:number,tz:number){
 const start=avatar.getLocalPosition().clone();
 destination=new pc.Vec3(tx,0,tz);
 tapMarker.setLocalPosition(tx,.035,tz);tapMarker.enabled=true;
 if(canWalkSegment(start.x,start.z,tx,tz)){
  walkPath=[];target=destination.clone();setLocomotion(true);return true;
 }
 const raw=findWalkPath(start.x,start.z,tx,tz);
 if(raw===null)return false;
 walkPath=simplifyWalkRoute(raw,start.x,start.z);
 const last=walkPath[walkPath.length-1];
 if(last&&canWalkSegment(last.x,last.z,tx,tz))walkPath.push({x:tx,z:tz});
 const first=walkPath.shift();
 if(!first)return false;
 target=new pc.Vec3(first.x,0,first.z);setLocomotion(true);return true;
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
 camera.setPosition(cameraTarget.x+(focus?2.0:3.5),focus?16:21.5,cameraTarget.z+(focus?-8.0:-15));
 camera.lookAt(cameraTarget);
 if(!target){if(sessionPending){sessionPending=false;sessionDialog.showModal();}return;}
 const p=avatar.getLocalPosition().clone(),dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
 if(d<.10){
  if(walkPath.length){const next=walkPath.shift()!;target=new pc.Vec3(next.x,0,next.z);}
  else{target=null;destination=null;walkVelocity=0;if(playerRig?.anim)playerRig.anim.speed=1;setLocomotion(false);}
 }else{
  setLocomotion(true);
  const desiredYaw=Math.atan2(dx,dz)*180/Math.PI;
  const currentYaw=avatar.getLocalEulerAngles().y;
  let yawDelta=((desiredYaw-currentYaw+540)%360)-180;
  const maxTurn=Math.max(1,frameDt*240);
  avatar.setLocalEulerAngles(0,currentYaw+Math.max(-maxTurn,Math.min(maxTurn,yawDelta)),0);
  const desiredSpeed=Math.min(1.42,Math.max(.28,d*1.8));
   walkVelocity+=(desiredSpeed-walkVelocity)*(1-Math.exp(-frameDt*4.2));
   if(playerRig?.anim)playerRig.anim.speed=Math.max(.72,Math.min(1.12,walkVelocity/desiredSpeed));
   const step=Math.min(d,frameDt*walkVelocity),moved=moveAvatarSafely(dx/d*step,dz/d*step);
  if(!moved){
   const goal=destination;
   const retry=goal?findWalkPath(p.x,p.z,goal.x,goal.z):null;
   if(retry&&retry.length){
    walkPath=simplifyWalkRoute(retry,p.x,p.z);
    const next=walkPath.shift()!;target=new pc.Vec3(next.x,0,next.z);
   }else{
    target=null;destination=null;walkPath=[];setLocomotion(false);
    status.textContent="الممر مغلق حالياً. اختر نقطة أخرى داخل المساحة المتاحة.";
   }
  }
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
