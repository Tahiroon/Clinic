import * as pc from "playcanvas";
import "../style.css";
import { createInitialManagementState, advanceSimulation, hireStaff, buildRoom, setSimulationSpeed, formatGameTime, getActivePatientCount, getPatientQueue, getRoleLabel, setClinicOpen, ROOM_BLUEPRINTS, type ManagementState, type StaffRole, type ClinicRoomType } from "../game/management";

type BuildKind = "treatment" | "reception" | "assessment" | "gym" | "staff" | "chair" | "plant" | "cabinet" | "parallel" | "bike" | "treadmill" | "wallbars" | "lamp" | "rug" | "wall" | "door" | "asset";
type Placed = { id:number; kind:BuildKind; gx:number; gz:number; rot?:0|90; assetKey?:string; width?:number; depth?:number };
const el=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=el<HTMLCanvasElement>("#scene"), status=el<HTMLElement>("#status"), fpsLabel=el<HTMLElement>("#fps"), loading=el<HTMLElement>("#loading");
const stage=el<HTMLElement>(".stage"), moveBtn=el<HTMLButtonElement>("#move-mode"), buildBtn=el<HTMLButtonElement>("#build-mode"), storeBtn=el<HTMLButtonElement>("#store-mode"), sessionBtn=el<HTMLButtonElement>("#session-mode"), viewBtn=el<HTMLButtonElement>("#view-mode");
const buildPanel=el<HTMLElement>("#build-panel"), saveState=el<HTMLElement>("#save-state"), coinsLabel=el<HTMLElement>("#coins"), sessionDialog=el<HTMLDialogElement>("#session-dialog");
const managementPanel=el<HTMLElement>("#management-panel"),managementToggle=el<HTMLButtonElement>("#management-toggle");
let management:ManagementState=createInitialManagementState();
const app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:false,alpha:false,powerPreference:"low-power"}});
app.setCanvasFillMode(pc.FILLMODE_NONE);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
// A 1× render scale reduces GPU fill cost and memory bandwidth on low-end phones.
app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,1.0);
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
 desiredOrthoHeight=aspect<.48?15.5:aspect<.62?14.8:aspect<.82?14.2:13.8;
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
camera.addComponent("camera",{projection:pc.PROJECTION_ORTHOGRAPHIC,orthoHeight:15.5,clearColor:new pc.Color(.69,.79,.80),nearClip:.1,farClip:200});
const cameraTarget=new pc.Vec3(0,0,0),cameraGoal=new pc.Vec3(0,0,0);
camera.setPosition(3.5,21.5,-15);camera.lookAt(cameraTarget);app.root.addChild(camera);
let desiredOrthoHeight=15.5;
const light=new pc.Entity("Soft daylight");
light.addComponent("light",{type:"directional",intensity:1.15,castShadows:false});
light.setEulerAngles(48,25,0);app.root.addChild(light);
const world=new pc.Entity("Clinic property · portrait 3/4 world");
world.setEulerAngles(0,10,0);app.root.addChild(world);world.syncHierarchy();
const worldInverse=new pc.Mat4().invert(world.getWorldTransform() as pc.Mat4);
const tapMarker=new pc.Entity("Tap destination marker");
tapMarker.addComponent("model",{type:"cylinder"});
tapMarker.model!.material=M.yellow;
tapMarker.setLocalScale(.34,.035,.34);
tapMarker.enabled=false;
world.addChild(tapMarker);

const GRID=1, W=14, D=28, HALF_X=W/2, HALF_Z=D/2;
const grassAlt=material(new pc.Color(.38,.53,.38));
const pathMat=material(new pc.Color(.67,.62,.49));
const pathEdge=material(new pc.Color(.43,.48,.37));
const glass=material(new pc.Color(.28,.67,.76));
const trim=material(new pc.Color(.10,.39,.47));
const roofAccent=material(new pc.Color(.16,.28,.38));
const lawnBase=material(new pc.Color(.25,.39,.24));
const outdoorTreePositions:[number,number][]=[[-5.65,-11.4],[5.65,-11.4],[-5.65,11.4],[5.65,11.4]];
const outdoorShrubPositions:[number,number][]=[[-5.9,-5.5],[5.9,-2.5],[-5.9,4.2],[5.9,6.0]];
// The property is a continuous outdoor lawn. Only constructed rooms receive a finished interior floor.
box("Owned green property · expandable land",0,-.22,0,W,.42,D,lawnBase,world);
box("Main entrance garden path",0,.018,-8.45,1.75,.045,11.0,pathMat,world);
box("Path west edging",-.91,.045,-8.45,.055,.06,11.0,pathEdge,world);
box("Path east edging",.91,.045,-8.45,.055,.06,11.0,pathEdge,world);
for(const [x,z,sx,sz] of [[0,-13.92,W,.16],[0,13.92,W,.16],[-6.92,0,.16,D],[6.92,0,.16,D]] as [number,number,number,number][]){
 box("Low property boundary",x,.16,z,sx,.32,sz,trim,world);
}
for(const [x,z] of outdoorTreePositions){
 cylinder("Outdoor tree trunk",x,.78,z,.18,1.56,.18,M.wood,world);
 const crown=sphere("Outdoor tree crown",x,1.95,z,.76,M.green,world);crown.setLocalScale(.9,1.15,.86);
 const crownTop=sphere("Outdoor tree crown highlight",x+.08,2.48,z+.04,.52,grassAlt,world);crownTop.setLocalScale(.9,1.05,.88);
}
for(const [x,z] of outdoorShrubPositions){
 box("Outdoor planter",x,.17,z,.56,.34,.78,M.wood2,world);
 const shrub=sphere("Outdoor shrub",x,.62,z,.37,M.green,world);shrub.setLocalScale(1.12,.8,.95);
}
const lawnGrassMaterial=material(new pc.Color(1,1,1));
lawnGrassMaterial.diffuseVertexColor=true;lawnGrassMaterial.cull=pc.CULLFACE_NONE;lawnGrassMaterial.update();
let lawnGrassOwner:pc.Entity|null=null;
function createLawnGrass(){
 if(lawnGrassOwner){lawnGrassOwner.destroy();lawnGrassOwner=null;}
 const positions:number[]=[],indices:number[]=[],colors:number[]=[];
 let seed=7319;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const addTuft=(x:number,z:number)=>{
  const count=2+Math.floor(rand()*2);
  for(let n=0;n<count;n++){
   const angle=rand()*Math.PI,half=.018+rand()*.018,height=.10+rand()*.13;
   const lean=(rand()-.5)*.08,baseY=.026+rand()*.012,dx=Math.cos(angle)*half,dz=Math.sin(angle)*half;
   const first=positions.length/3;
   positions.push(x-dx,baseY,z-dz,x+dx,baseY,z+dz,x+lean,baseY+height,z);
   const shade=rand(),col=shade>.72?[63,119,66,255]:shade<.2?[91,139,77,255]:[74,130,69,255];
   for(let k=0;k<3;k++)colors.push(...col);
   indices.push(first,first+1,first+2);
  }
 };
 for(let i=0;i<1900;i++){
  const x=-HALF_X+.28+rand()*(W-.56),z=-HALF_Z+.28+rand()*(D-.56);
  const insideAnyRoom=placed.some(p=>isRoomKind(p.kind)&&x>p.gx-.14&&x<p.gx+(p.width??4)+.14&&z>p.gz-.14&&z<p.gz+(p.depth??4)+.14);
  const onEntrancePath=Math.abs(x)<1.12&&z< -2.1;
  const nearTree=outdoorTreePositions.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<1.05);
  const nearShrub=outdoorShrubPositions.some(([sx,sz])=>Math.abs(x-sx)<.52&&Math.abs(z-sz)<.72);
  if(insideAnyRoom||onEntrancePath||nearTree||nearShrub)continue;
  addTuft(x,z);
 }
 const mesh=new pc.Mesh(app.graphicsDevice);
 mesh.setPositions(new Float32Array(positions));
 mesh.setNormals(pc.calculateNormals(positions,indices));
 mesh.setColors32(new Uint8Array(colors));
 mesh.setIndices(indices);mesh.update();
 lawnGrassOwner=new pc.Entity("Outdoor grass mesh owner");
 const grassGraph=new pc.GraphNode("Outdoor grass mesh graph");
 const model=new pc.Model();model.graph=grassGraph;
 model.meshInstances=[new pc.MeshInstance(mesh,lawnGrassMaterial,grassGraph)];
 lawnGrassOwner.addComponent("model");lawnGrassOwner.model!.model=model;world.addChild(lawnGrassOwner);
}
const arrivalMetal=material(new pc.Color(.20,.31,.38));
const warmGlass=material(new pc.Color(.96,.76,.40));
for(const x of [-1.12,1.12]){
 cylinder("Entrance path light base",x,.12,-3.75,.18,.22,.18,arrivalMetal,world);
 cylinder("Entrance path light stem",x,.52,-3.75,.065,.78,.065,arrivalMetal,world);
 sphere("Entrance path light diffuser",x,.98,-3.75,.14,warmGlass,world);
}
box("Clinic facade lower accent",0,.28,-2.08,3.85,.12,.10,trim,world);
box("Clinic facade upper accent",0,2.82,-2.08,4.15,.10,.12,arrivalMetal,world);
box("THERASON entrance sign",0,2.55,-2.13,2.0,.46,.12,trim,world);
box("Entrance sign inset",0,2.56,-2.205,1.7,.27,.035,M.white,world);
box("Entrance canopy",0,2.15,-2.28,2.3,.16,.78,roofAccent,world);
const roomRoot=new pc.Entity("Player-built clinic rooms");world.addChild(roomRoot);
const buildGrid=new pc.Entity("Expandable property construction grid");world.addChild(buildGrid);
const gridMaterial=material(new pc.Color(.20,.57,.65));
for(let i=0;i<=W;i++){
 const x=-HALF_X+i*GRID;
 box("Property grid vertical",x,.035,0,.012,.012,D,gridMaterial,buildGrid);
}
for(let i=0;i<=D;i++){
 const z=-HALF_Z+i*GRID;
 box("Property grid horizontal",0,.035,z,W,.012,.012,gridMaterial,buildGrid);
}
buildGrid.enabled=false;
function makeRoom(kind:"treatment"|"reception"|"assessment"|"gym"|"staff",gx:number,gz:number,id:number,width=4,depth=4){
 const root=new pc.Entity("Room "+id+" · "+kind);
 world.addChild(root);root.setLocalPosition(gx+width/2,0,gz+depth/2);
 const floor=material(new pc.Color(.72,.75,.71));
 box("Room floor",0,.035,0,width-.06,.07,depth-.06,floor,root);
 const wallThickness=.16,wallHeight=2.25,halfW=width/2,halfD=depth/2;
 const wallMat=material(new pc.Color(.88,.91,.87)),sideMat=material(new pc.Color(.58,.70,.70));
 const trimMat=material(new pc.Color(.12,.42,.48)),frameMat=material(new pc.Color(.94,.95,.91));
 // Continuous cutaway shell with a centered entrance opening; the floor is only inside this room.
 box("Left wall",-halfW,wallHeight/2,0,wallThickness,wallHeight,depth,sideMat,root);
 box("Right wall",halfW,wallHeight/2,0,wallThickness,wallHeight,depth,sideMat,root);
 box("Rear wall",0,wallHeight/2,halfD,width,wallHeight,wallThickness,wallMat,root);
 const doorWidth=Math.min(1.2,width*.42),sideSegment=(width-doorWidth)/2;
 box("Front wall left",-(doorWidth/2+sideSegment/2),wallHeight/2,-halfD,sideSegment,wallHeight,wallThickness,wallMat,root);
 box("Front wall right",doorWidth/2+sideSegment/2,wallHeight/2,-halfD,sideSegment,wallHeight,wallThickness,wallMat,root);
 box("Door lintel",0,wallHeight-.08,-halfD,doorWidth,.16,wallThickness,frameMat,root);
 box("Door frame left",-doorWidth/2,1.08,-halfD-.035,.07,2.16,.12,frameMat,root);
 box("Door frame right",doorWidth/2,1.08,-halfD-.035,.07,2.16,.12,frameMat,root);
 box("Door leaf ajar",-doorWidth*.32,1.02,-halfD+.13,.07,2.02,Math.min(.82,depth*.22),material(new pc.Color(.68,.73,.71)),root);
 cylinder("Door handle",-doorWidth*.32,1.03,-halfD+.48,.035,.035,.035,M.yellow,root);
 // Low plinth and top cap give every room a consistent management-game silhouette.
 for(const x of [-halfW,halfW])box("Wall teal plinth",x,.17,0,wallThickness,.22,depth,trimMat,root);
 box("Rear wall cap",0,wallHeight+.04,halfD,width,.1,.22,frameMat,root);
 box("Room name panel",0,1.85,halfD-wallThickness-.02,Math.min(1.8,width*.55),.42,.04,trimMat,root);
 // Rear glazing gives the room a readable architectural edge without a roof blocking the isometric view.
 const windowWidth=Math.min(1.05,(width-.5)/2);
 for(const x of [-width*.25,width*.25]){
  box("Rear window glass",x,1.35,halfD-wallThickness-.025,windowWidth,.82,.035,glass,root);
  box("Rear window frame top",x,1.79,halfD-wallThickness-.055,windowWidth+.08,.06,.07,frameMat,root);
  box("Rear window frame bottom",x,.91,halfD-wallThickness-.055,windowWidth+.08,.06,.07,frameMat,root);
 }
 for(const x of [-width*.22,width*.22]){
  box("Ceiling light housing",x,2.30,0,.68,.055,.20,M.white,root);
  box("Ceiling light diffuser",x,2.265,0,.54,.018,.13,M.pale,root);
 }
 if(kind==="treatment"||kind==="assessment"){
  box(kind==="assessment"?"Assessment wall chart":"Treatment wall chart",halfW-.55,1.55,halfD-wallThickness-.08,.68,.82,.045,M.pale,root);
  box("Chart teal stripe",halfW-.55,1.55,halfD-wallThickness-.11,.10,.58,.025,trimMat,root);
 }else if(kind==="reception"){
  loadReceptionDesk(root);loadWaitingSeats(root);
 }else if(kind==="staff"){
  box("Staff rest sofa seat",0,.38,depth*.18,Math.min(2.1,width*.62),.34,.82,M.teal,root);
  box("Staff rest sofa back",0,.82,depth*.18+.34,Math.min(2.1,width*.62),.62,.18,M.blue,root);
  box("Staff table",0,.38,-depth*.20,.95,.12,.65,M.wood2,root);
 }else{
  box("Exercise mat",0,.07,0,Math.min(width*.68,2.7),.08,Math.min(depth*.42,1.25),M.blue,root);
  for(const x of [-Math.min(width*.25,.9),Math.min(width*.25,.9)]){
   box("Parallel bar support",x,.6,depth*.24,.1,1.1,.1,M.wood2,root);
   box("Parallel bar rail",x,1.08,depth*.24,.08,.08,Math.min(2.2,depth*.5),M.yellow,root);
  }
 }
 return root;
}
// The starter clinic is assembled from lightweight procedural geometry; optional GLB assets load independently.
const avatar=new pc.Entity("Player physiotherapist");world.addChild(avatar);avatar.setLocalPosition(0,0,-4.55);
let walkVelocity=0;
let avatarAnim:any=null;let playerRig:HumanoidRig|null=null;
const characterAssets:Record<string,string>={
 student:new URL("../assets/characters/Student.glb",import.meta.url).href,
 patient:new URL("../assets/characters/WardPatient.glb",import.meta.url).href,
};
type HumanoidRig={entity:pc.Entity;anim:any;clips:string[];idle:string;walk:string};
type FallbackRig={entity:pc.Entity;update:(dt:number,moving:boolean)=>void};
function createFallbackHumanoid(parent:pc.Entity,kind:"student"|"patient"):FallbackRig{
 const root=new pc.Entity("Fallback character rig · "+kind);parent.addChild(root);
 const shirt=kind==="student"?M.white:M.pale,trousers=kind==="student"?M.blue:M.teal;
 box("Humanoid torso",0,1.02,0,.42,.62,.27,shirt,root);
 box("Humanoid neck",0,1.38,0,.11,.14,.12,M.skin,root);
 sphere("Humanoid head",0,1.57,0,.155,M.skin,root);
 sphere("Humanoid hair",0,1.69,-.025,.15,M.dark,root);
 const legPivots:pc.Entity[]=[];
 for(const x of [-.14,.14]){
  const pivot=new pc.Entity("Leg swing pivot");root.addChild(pivot);pivot.setLocalPosition(x,.78,0);
  box("Humanoid thigh and lower leg",0,-.34,0,.15,.68,.17,trousers,pivot);
  box("Humanoid shoe",0,-.69,.075,.19,.13,.29,M.dark,pivot);
  legPivots.push(pivot);
 }
 const armPivots:pc.Entity[]=[];
 for(const x of [-.27,.27]){
  const pivot=new pc.Entity("Arm swing pivot");root.addChild(pivot);pivot.setLocalPosition(x,1.27,0);
  box("Humanoid arm",0,-.29,0,.13,.58,.15,shirt,pivot);
  sphere("Humanoid hand",0,-.61,.015,.085,M.skin,pivot);
  armPivots.push(pivot);
 }
 if(kind==="student")box("Physiotherapist ID badge",.12,1.18,-.15,.1,.13,.025,trim,root);
 let phase=0;
 return {entity:root,update:(dt,moving)=>{
  if(moving)phase+=dt*7.2;
  const swing=moving?Math.sin(phase)*27:0;
  legPivots[0].setLocalEulerAngles(swing,0,0);legPivots[1].setLocalEulerAngles(-swing,0,0);
  armPivots[0].setLocalEulerAngles(-swing*.72,0,0);armPivots[1].setLocalEulerAngles(swing*.72,0,0);
 }};
}

 function loadHumanoid(url:string,parent:pc.Entity,height:number,castShadow:boolean,onReady?:(rig:HumanoidRig)=>void){
 app.assets.loadFromUrl(url,"container",(err,asset)=>{
  if(err||!asset?.resource){console.error("Character asset failed",url,err);status.textContent="تم تشغيل شخصية بديلة خفيفة؛ تعذر تحميل النموذج الخارجي.";return;}
  const model=asset.resource.instantiateRenderEntity({castShadows:castShadow,receiveShadows:false});
  model.name="Animated humanoid";parent.addChild(model);model.syncHierarchy();
  const meshes=collectRenderMeshes(model);
  if(!meshes.length){console.error("Character GLB has no render meshes",url);model.destroy();return;}
  let minY=Infinity,maxY=-Infinity;
  for(const mesh of meshes){const b=mesh.aabb,c=b.center,h=b.halfExtents;minY=Math.min(minY,c.y-h.y);maxY=Math.max(maxY,c.y+h.y);}
  const measuredHeight=maxY-minY;
  if(!Number.isFinite(measuredHeight)||measuredHeight<.25||measuredHeight>8){console.error("Character asset has implausible dimensions",url,measuredHeight);model.destroy();return;}
  const scale=height/measuredHeight;
  model.setLocalScale(scale,scale,scale);model.syncHierarchy();
  const scaled=collectRenderMeshes(model);
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
  model.addComponent("anim",{activate:false,speed:1});
  const anim:any=(model as any).anim;
  const clips:any[]=asset.resource.animations??[];
  const names:string[]=[];
  if(anim){
   for(const clip of clips){
    const track:any=clip.resource;
    const clipName=String(track?.name||clip.name||"");
    if(track&&clipName&&/^(idle|walk|walking|run|jog)$/i.test(clipName)){
     try{anim.assignAnimation(clipName,track,undefined,1,true);names.push(clipName);}
     catch(error){console.warn("Character locomotion clip binding failed",clipName,error);}
    }
   }
   anim.activate=true;
  }
  const idle=names.find(n=>/idle|stand|rest/i.test(n))??"";
  const walk=names.find(n=>/walk|walking/i.test(n))??names.find(n=>/run|jog/i.test(n))??"";
  if(!idle||!walk||!anim?.baseLayer){
   console.error("Character has no usable idle/walk state graph; keep the animated fallback visible",url,{clips:names});
   model.destroy();return;
  }
  try{anim.baseLayer.play(idle);anim.speed=1;}
  catch(error){
   console.error("Character idle state failed; keep the animated fallback visible",url,error);
   model.destroy();return;
  }
  const rig:HumanoidRig={entity:model,anim,clips:names,idle,walk};
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
let playerFallbackRig:FallbackRig|null=studentFallback;
loadHumanoid(characterAssets.student,avatar,1.72,true,rig=>{
 studentFallback.entity.destroy();playerFallbackRig=null;
 avatarAnim=rig.anim;playerRig=rig;
 status.textContent="الأخصائي جاهز. اضغط على مكان داخل العيادة ليتحرك إليه.";
});
const patientNpc=new pc.Entity("Patient visitor");world.addChild(patientNpc);patientNpc.setLocalPosition(1.25,0,1.35);patientNpc.enabled=false;
const patientFallback=createFallbackHumanoid(patientNpc,"patient");
let patientFallbackRig:FallbackRig|null=patientFallback,patientRig:HumanoidRig|null=null;
let patientVisualId=0,patientVisualStage="",patientTarget:pc.Vec3|null=null,patientWalkPath:{x:number;z:number}[]=[];
loadHumanoid(characterAssets.patient,patientNpc,1.62,false,rig=>{patientFallback.entity.destroy();patientFallbackRig=null;patientRig=rig;});

let mode:"move"|"build"="move", selected:BuildKind="wall", selectedAssetKey:string|null=null, target:pc.Vec3|null=null, coins=3200, xp=0, nextId=1, focus=false, wallRotation:0|90=0;
let missionPhase=(()=>{try{const saved=Number(localStorage.getItem("therason-clinic-mission-v3")||0);return Math.max(0,Math.min(5,saved));}catch{return 0;}})();

let placed:Placed[]=[];let walkPath:{x:number;z:number}[]=[];let destination:pc.Vec3|null=null;const saveKey="therason-clinic-world-v11";
const managementSaveKey="therason-clinic-management-v2";
const TRIAL_ACCOUNT_COINS=3200; 
const starterLayout:Placed[]=[];
const costs:Record<BuildKind,number>={treatment:720,reception:420,assessment:620,gym:980,staff:360,chair:20,plant:15,cabinet:30,parallel:80,bike:100,treadmill:120,wallbars:70,lamp:15,rug:25,wall:8,door:22,asset:0};
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
 const key=p.assetKey??"";
 const size=storeAssetSpecs[key]?.footprint??1;
 const root=new pc.Entity("Fallback prop · "+spec.label);
 root.setPosition(p.gx+size/2,0,p.gz+size/2);world.addChild(root);
 const bed=(name:string)=>{box(name+" base",0,.3,0,1.8,.2,.82,M.dark,root);box(name+" mattress",0,.47,0,1.76,.18,.78,M.blue,root);box(name+" pillow",0,.59,-.3,.46,.1,.28,M.pale,root);for(const x of [-.72,.72])for(const z of [-.28,.28])box(name+" leg",x,.13,z,.08,.28,.08,M.dark,root);};
 const chair=(name:string)=>{box(name+" seat",0,.48,0,.62,.15,.62,M.teal,root);box(name+" back",0,.82,-.23,.62,.62,.13,M.blue,root);for(const x of [-.23,.23])for(const z of [-.23,.23])box(name+" leg",x,.22,z,.06,.44,.06,M.dark,root);};
 if(key==="pt-treatment-table"||key==="pt-exam-table")bed("Fallback "+spec.label);
 else if(key==="pt-storage-cabinet"||key==="pt-clinical-sink"){
  box("Fallback cabinet body",0,.55,0,.72,1.1,.52,M.wood2,root);box("Fallback cabinet front",0,.55,.27,.64,.98,.025,M.wood,root);
  if(key==="pt-clinical-sink"){box("Fallback sink basin",0,1.13,.02,.5,.08,.34,M.pale,root);cylinder("Fallback faucet",0,1.25,-.1,.035,.2,.035,M.dark,root);}
 }else if(key==="pt-patient-chair"||key==="hospital-transport-chair")chair("Fallback "+spec.label);
 else if(key==="pt-doctor-desk"){
  box("Fallback desk top",0,.88,0,1.55,.12,.82,M.wood2,root);for(const x of [-.65,.65])box("Fallback desk leg",x,.43,0,.09,.82,.72,M.dark,root);box("Fallback monitor",0,1.18,-.2,.48,.38,.06,M.dark,root);
 }else if(key==="pt-privacy-screen"||key==="pt-privacy-curtain"){
  for(const x of [-.72,.72])cylinder("Fallback screen post",x,1.05,0,.045,2.1,.045,M.dark,root);
  box("Fallback privacy curtain",0,1.25,0,1.42,1.55,.055,M.pale,root);box("Fallback curtain rail",0,2.2,0,1.58,.06,.08,M.dark,root);
 }else if(key==="pt-wall-chart"){
  box("Fallback wall chart",0,1.15,0,.9,1.15,.06,M.pale,root);box("Fallback chart detail",0,1.15,.04,.62,.72,.02,M.teal,root);
 }else if(key==="pt-parallel-bars"){
  for(const x of [-.7,.7]){for(const z of [-.9,.9])box("Fallback parallel support",x,.55,z,.08,1.1,.08,M.dark,root);box("Fallback parallel rail",x,1.12,0,.08,.08,2.0,M.wood2,root);}
 }else if(key==="pt-band-rack"){
  box("Fallback band rack base",0,.08,0,.72,.12,.5,M.dark,root);for(const x of [-.3,.3])box("Fallback rack upright",x,.8,0,.06,1.5,.06,M.dark,root);for(let i=0;i<4;i++)box("Fallback resistance band",0,.38+i*.27,.08,.62,.035,.08,i%2?M.teal:M.yellow,root);
 }else if(key==="pt-exercise-ball")sphere("Fallback exercise ball",0,.42,0,.78,M.teal,root);
 else if(key==="pt-exercise-mat")box("Fallback exercise mat",0,.045,0,1.35,.08,1.9,M.blue,root);
 else if(key==="pt-hand-weights"){for(const x of [-.25,.25]){cylinder("Fallback dumbbell handle",x,.2,0,.035,.4,.035,M.dark,root);for(const z of [-.12,.12])box("Fallback dumbbell weight",x,.2,z,.16,.16,.1,M.dark,root);}}
 else if(key==="hospital-crutches"){for(const x of [-.2,.2]){box("Fallback crutch shaft",x,.72,0,.055,1.4,.055,M.wood2,root);box("Fallback crutch top",x,1.4,0,.36,.08,.08,M.pale,root);}}
 else if(key==="hospital-first-aid"){box("Fallback first aid bag",0,.35,0,.62,.62,.35,M.pale,root);box("Fallback medical cross",0,.36,.19,.13,.36,.035,M.teal,root);}
 else if(key==="hospital-oxygen"){cylinder("Fallback oxygen tank",0,.72,0,.34,1.35,.34,M.pale,root);for(const x of [-.3,.3])box("Fallback trolley handle",x,.65,-.2,.05,1.2,.05,M.dark,root);box("Fallback trolley base",0,.08,0,.75,.1,.48,M.dark,root);}
 else if(key==="hospital-stretcher"){bed("Fallback stretcher");for(const x of [-.7,.7])for(const z of [-.3,.3])sphere("Fallback stretcher wheel",x,.08,z,.12,M.dark,root);}
 else if(key==="hospital-walking-frame"){for(const x of [-.3,.3]){box("Fallback walking frame side",x,.58,0,.055,1.15,.055,M.dark,root);box("Fallback walking frame handle",x,1.18,-.12,.08,.07,.35,M.teal,root);}box("Fallback walking frame crossbar",0,.62,0,.62,.055,.055,M.dark,root);}
}
function collectDescendants(root:pc.Entity):pc.Entity[]{
 // Imported GLB hierarchies can be unusually deep. Traverse iteratively so a
 // vendor model can never exhaust the browser's JavaScript call stack.
 const found:pc.Entity[]=[];
 const stack=[...(root.children as pc.Entity[])];
 const seen=new Set<pc.Entity>();
 while(stack.length){
  const node=stack.pop()!;
  if(seen.has(node))continue;
  seen.add(node);found.push(node);
  for(const child of node.children as pc.Entity[])stack.push(child);
 }
 return found;
}
function collectRenderMeshes(root:pc.Entity):any[]{
 const meshes:any[]=[];const stack=[root];const seen=new Set<pc.Entity>();
 while(stack.length){const node=stack.pop()!;if(seen.has(node))continue;seen.add(node);
  const component=(node as any).render;if(component?.meshInstances?.length)for(const mesh of component.meshInstances)meshes.push(mesh);
  for(const child of node.children as pc.Entity[])stack.push(child);
 }return meshes;
}
function findEntityByName(root:pc.Entity,name:string):pc.Entity|null{
 const stack=[root],seen=new Set<pc.Entity>();while(stack.length){const node=stack.pop()!;if(seen.has(node))continue;seen.add(node);if(node.name===name)return node;for(const child of node.children as pc.Entity[])stack.push(child);}return null;
}
function renderBounds(root:pc.Entity){
 const meshes=collectRenderMeshes(root);
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
  // Rotate the four-seat row along the reception's right wall, preserving a clear central lane to the treatment doorway.
  seats.setLocalEulerAngles(0,90,0);
  parent.addChild(seats);seats.syncHierarchy();
  let bounds=renderBounds(seats);
  if(!bounds||bounds.width<.1||bounds.depth<.1){seats.destroy();throw new Error("Waiting seats have invalid bounds");}
  const scale=Math.min(.95/bounds.width,2.2/bounds.depth,1.05/bounds.height);
  seats.setLocalScale(scale,scale,scale);seats.syncHierarchy();
  bounds=renderBounds(seats);
  if(!bounds)throw new Error("Waiting seats have no render meshes");
  const target=parent.getWorldTransform().transformPoint(new pc.Vec3(1.45,0,.45),new pc.Vec3());
  const current=seats.getPosition();
  seats.setPosition(current.x+target.x-(bounds.minX+bounds.maxX)/2,current.y-bounds.minY,current.z+target.z-(bounds.minZ+bounds.maxZ)/2);
  seats.syncHierarchy();
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
  const keep=/^(HospitalReception|Desk_|Drawer_|Keyboard_|Monitor_|Pedestal_|Screen_)/;
  // The source GLB is a complete reception scene (desk + chairs + curtains + plant + sanitizer).
  // Keep only the desk assembly; scaling the entire scene to desk size made the actual counter microscopic.
  // Avoid recursive descent: some downloaded GLB scene graphs contain
  // thousands of nested nodes and can overflow the JS call stack.
  const stack=[...(model.children as pc.Entity[])];
  const visited=new Set<pc.Entity>();
  while(stack.length){
   const node=stack.pop()!;
   if(visited.has(node))continue;
   visited.add(node);
   if(!keep.test(node.name)){node.destroy();continue;}
   for(const child of node.children as pc.Entity[])stack.push(child);
  }
  parent.addChild(model);model.syncHierarchy();
  let b=renderBounds(model);
  if(!b||b.width<.05||b.depth<.05||b.height<.05){model.destroy();throw new Error("Reception desk subset is empty or has invalid bounds");}
  const scale=Math.min(1.7/b.width,.9/b.depth,1.15/b.height);
  model.setLocalScale(scale,scale,scale);model.syncHierarchy();
  b=renderBounds(model);
  if(!b)throw new Error("Reception desk has no renderable meshes after scaling");
  const target=parent.getWorldTransform().transformPoint(new pc.Vec3(-.15,0,1.0),new pc.Vec3());
  const current=model.getPosition();
  model.setPosition(current.x+target.x-(b.minX+b.maxX)/2,current.y-b.minY,current.z+target.z-(b.minZ+b.maxZ)/2);
  model.syncHierarchy();
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
  parent.addChild(model);model.syncHierarchy();
  let b=renderBounds(model);
  if(!b||b.width<.05||b.depth<.05||b.height<.05){model.destroy();throw new Error("Treatment-room decor has invalid bounds");}
  const scale=Math.min(3.55/b.width,3.55/b.depth,2.0/b.height);
  model.setLocalScale(scale,scale,scale);model.syncHierarchy();
  b=renderBounds(model);
  if(!b)throw new Error("Treatment-room props have no renderable meshes");
  const target=parent.getWorldTransform().transformPoint(new pc.Vec3(1,0,1),new pc.Vec3());
  const current=model.getPosition();
  model.setPosition(current.x+target.x-(b.minX+b.maxX)/2,current.y-b.minY,current.z+target.z-(b.minZ+b.maxZ)/2);
  model.syncHierarchy();
 }).catch(error=>{
  console.warn("Treatment-room decorative GLB unavailable; procedural shell remains",error);
 });
}
function loadClinicAsset(p:Placed){
 const spec=p.assetKey?storeAssetSpecs[p.assetKey]:undefined;
 if(!spec)return;
 const url=clinicAssetUrls[spec.file];
 if(!url){drawAssetFallback(p,spec);return;}
 getClinicContainer(url).then(asset=>{
  const container=asset.resource.instantiateRenderEntity({castShadows:false,receiveShadows:false});
  const chosen=findEntityByName(container,spec.node);
  if(!chosen){container.destroy();throw new Error("Missing model node "+spec.node);}
  const sourceParent=chosen.parent as pc.Entity|null;if(sourceParent)sourceParent.removeChild(chosen);
  container.destroy();
  const size=spec.footprint,holder=new pc.Entity("3D asset · "+spec.label);
  world.addChild(holder);holder.setLocalPosition(p.gx+size/2,0,p.gz+size/2);holder.addChild(chosen);
  chosen.setLocalPosition(0,0,0);chosen.setLocalEulerAngles(0,p.rot??0,0);holder.syncHierarchy();
  const before=renderBounds(chosen);
  if(!before||before.width<.01||before.depth<.01||before.height<.01)throw new Error("Invalid model bounds for "+spec.node);
  const scale=spec.targetSize/Math.max(before.width,before.depth,.01);
  chosen.setLocalScale(scale,scale,scale);holder.syncHierarchy();
  const bounds=renderBounds(chosen);if(!bounds)throw new Error("No render meshes in "+spec.node);
  const holderWorld=holder.getPosition(),chosenWorld=chosen.getPosition();
  chosen.setPosition(chosenWorld.x+holderWorld.x-(bounds.minX+bounds.maxX)/2,chosenWorld.y-bounds.minY,chosenWorld.z+holderWorld.z-(bounds.minZ+bounds.maxZ)/2);
  holder.syncHierarchy();
 }).catch(error=>{
  console.error("Clinic store asset failed",spec.label,error);drawAssetFallback(p,spec);
  status.textContent="تعذر تحميل الأصل الحقيقي لـ "+spec.label+"؛ تم استخدام نموذج احتياطي.";
 });
}

function save(){try{management.balance=coins;management.experience=xp;localStorage.setItem(saveKey,JSON.stringify({v:11,coins,xp,placed}));localStorage.setItem(managementSaveKey,JSON.stringify(management));saveState.textContent="تم الحفظ";}catch{saveState.textContent="حفظ مؤقت";}}
function validSavedItem(value:any):value is Placed{
 if(!value||typeof value!=="object")return false;
 const kinds:BuildKind[]=["treatment","reception","assessment","gym","staff","chair","plant","cabinet","parallel","bike","treadmill","wallbars","lamp","rug","wall","door","asset"];
 if(!kinds.includes(value.kind)||!Number.isSafeInteger(value.id)||value.id<1)return false;
 if(!Number.isInteger(value.gx)||!Number.isInteger(value.gz)||![0,90].includes(value.rot??0))return false;
 if(value.kind==="asset"&&(!value.assetKey||!storeAssetSpecs[value.assetKey]))return false;
 if(value.kind!=="asset"&&value.assetKey!==undefined)return false;
 if(isRoomKind(value.kind)&&((value.width!==undefined&&(!Number.isInteger(value.width)||value.width<4||value.width>12))||(value.depth!==undefined&&(!Number.isInteger(value.depth)||value.depth<4||value.depth>12))))return false;
 const bounds=footprintAt(value.gx,value.gz,value.kind,value.rot??0,value.assetKey,value.width,value.depth);
 return bounds.x>=-HALF_X&&bounds.z>=-HALF_Z&&bounds.x+bounds.w<=HALF_X&&bounds.z+bounds.d<=HALF_Z;
}
function load(){
 const useStarter=()=>{management=createInitialManagementState();coins=management.balance;xp=0;placed=[];nextId=1;};
 try{
  const raw=localStorage.getItem(saveKey);if(!raw){useStarter();return;}
  const v=JSON.parse(raw);if(v.v!==11||!Array.isArray(v.placed)){useStarter();return;}
  try{const savedManagement=JSON.parse(localStorage.getItem(managementSaveKey)||"null");if(savedManagement?.version===1&&Array.isArray(savedManagement.staff)&&Array.isArray(savedManagement.patients)&&Array.isArray(savedManagement.rooms))management=savedManagement;else management=createInitialManagementState();}catch{management=createInitialManagementState();}
  coins=Math.max(0,Number.isFinite(management.balance)?Math.min(10000000,management.balance):TRIAL_ACCOUNT_COINS);management.balance=coins;
  xp=Number.isFinite(management.experience)?Math.max(0,Math.min(1000000000,management.experience)):0;
  placed=[];const ids=new Set<number>();
  for(const candidate of v.placed.slice(0,60)){
   if(!validSavedItem(candidate)||ids.has(candidate.id))continue;
   if(occupied(candidate.gx,candidate.gz,candidate.kind,candidate.rot??0,candidate.assetKey,false))continue;
   const item:Placed={id:candidate.id,kind:candidate.kind,gx:candidate.gx,gz:candidate.gz,rot:candidate.rot??0,assetKey:candidate.assetKey};
   placed.push(item);ids.add(item.id);
  }
  if(v.placed.length>0&&placed.length===0){useStarter();return;}
  nextId=Math.max(1,...placed.map(p=>p.id+1));
  coinsLabel.textContent=String(coins);el("#experience").textContent=xp+" XP";
  for(const p of placed)drawPlaced(p);
 }catch{useStarter();}
}
function drawPlaced(p:Placed){if(p.kind==="asset"){loadClinicAsset(p);return;}const x=p.gx+.5,z=p.gz+.5;if(isRoomKind(p.kind)){const roomType=p.kind==="gym"?"gym":p.kind==="staff"?"staff":p.kind;makeRoom(roomType as "treatment"|"reception"|"assessment"|"gym"|"staff",p.gx,p.gz,p.id,p.width??4,p.depth??4); return;}
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
function footprint(kind:BuildKind,assetKey?:string){if(kind==="asset")return storeAssetSpecs[assetKey??""]?.footprint??1;return kind==="treatment"||kind==="reception"||kind==="assessment"||kind==="gym"||kind==="staff"?4:1;}
function isRoomKind(kind:BuildKind){return kind==="treatment"||kind==="reception"||kind==="assessment"||kind==="gym"||kind==="staff";}
function footprintAt(gx:number,gz:number,kind:BuildKind,rot:0|90=0,assetKey?:string,width?:number,depth?:number){
 const size=footprint(kind,assetKey);
 // Reserve a full snapped cell block, but leave a small physical clearance around props.
 if(kind==="wall")return rot===0?{x:gx,z:gz+.2,w:1,d:2.6}:{x:gx+.2,z:gz,w:2.6,d:1};
 if(kind==="door")return rot===0?{x:gx,z:gz+.41,w:1,d:.18}:{x:gx+.41,z:gz,w:.18,d:1};
 if(isRoomKind(kind))return {x:gx,z:gz,w:width??size,d:depth??size};
 // Asset bounds follow their measured design size, with a conservative cell reservation for one-cell props.
 const spec=kind==="asset"?storeAssetSpecs[assetKey??""]:undefined;
 const actual=spec
  ?Math.min(size === 1 ? 0.84 : size - 0.12,spec.targetSize)
  :size*.8;
 return {x:gx+(size-actual)/2,z:gz+(size-actual)/2,w:actual,d:actual};
}
function rectanglesOverlap(a:{x:number;z:number;w:number;d:number},b:{x:number;z:number;w:number;d:number}){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.z<b.z+b.d&&a.z+a.d>b.z;}
function occupied(gx:number,gz:number,kind:BuildKind,rot:0|90=0,assetKey?:string,requireRoom=true,width?:number,depth?:number){
 const a=footprintAt(gx,gz,kind,rot,assetKey,width,depth);
 if(a.x< -HALF_X+.24||a.z< -HALF_Z+.24||a.x+a.w>HALF_X-.24||a.z+a.d>HALF_Z-.24)return true;
 const candidateRoom=isRoomKind(kind);
 if(candidateRoom){
  // Preserve the entrance route, property edging and landscaping as the clinic expands.
  const fixedOutdoor=[
   {x:-HALF_X,z:-HALF_Z,w:W,d:.18},{x:-HALF_X,z:HALF_Z-.18,w:W,d:.18},
   {x:-HALF_X,z:-HALF_Z,w:.18,d:D},{x:HALF_X-.18,z:-HALF_Z,w:.18,d:D},
   {x:-.875,z:-HALF_Z,w:1.75,d:11.0},
   ...outdoorTreePositions.map(([x,z])=>({x:x-.42,z:z-.42,w:.84,d:.84})),
   ...outdoorShrubPositions.map(([x,z])=>({x:x-.34,z:z-.48,w:.68,d:.96}))
  ];
  if(fixedOutdoor.some(obstacle=>rectanglesOverlap(a,obstacle)))return true;
  return placed.some(p=>rectanglesOverlap(a,footprintAt(p.gx,p.gz,p.kind,p.rot,p.assetKey,p.width,p.depth)));
 }
 // New furnishings and partitions must belong to a room's usable interior.
 // Loading legacy saves skips this new rule so existing user layouts are preserved.
 if(requireRoom){
  const insideRoom=placed.some(p=>{
   if(!isRoomKind(p.kind))return false;
   const left=p.gx+.08,right=p.gx+(p.width??4)-.08,front=p.gz+.08,back=p.gz+(p.depth??4)-.08;
   return a.x>=left&&a.z>=front&&a.x+a.w<=right&&a.z+a.d<=back;
  });
  if(!insideRoom)return true;
 }
 // Furniture may share a room's floor, but never another prop's physical footprint.
 return placed.some(p=>!isRoomKind(p.kind)&&rectanglesOverlap(a,footprintAt(p.gx,p.gz,p.kind,p.rot,p.assetKey,p.width,p.depth)));
}

// Reusable placement ghost: one lightweight mesh, updated in place (never spawned per pointer event).
const placementPreviewMaterial=material(new pc.Color(.12,.82,.48));
placementPreviewMaterial.opacity=.42;
placementPreviewMaterial.blendType=pc.BLEND_NORMAL;
placementPreviewMaterial.depthWrite=false;
placementPreviewMaterial.update();
const placementPreview=box("Placement preview · validity ghost",0,.12,0,1,.035,1,placementPreviewMaterial,world);
placementPreview.enabled=false;
let previewValidity:boolean|null=null;
function updatePlacementPreview(clientX:number,clientY:number){
 if(mode!=="build"){placementPreview.enabled=false;return;}
 const point=screenToGround(clientX,clientY);
 if(!point){placementPreview.enabled=false;previewValidity=null;return;}
 if(selected==="asset"&&!selectedAssetKey){placementPreview.enabled=false;return;}
 const gx=Math.floor(point.x),gz=Math.floor(point.z);
 const bounds=footprintAt(gx,gz,selected,wallRotation,selectedAssetKey??undefined);
 const cost=selected==="asset"&&selectedAssetKey?storeAssetSpecs[selectedAssetKey].cost:costs[selected];
 const valid=!occupied(gx,gz,selected,wallRotation,selectedAssetKey??undefined)&&coins>=cost;
 placementPreview.setLocalPosition(bounds.x+bounds.w/2,.12,bounds.z+bounds.d/2);
 placementPreview.setLocalScale(Math.max(.08,bounds.w),.035,Math.max(.08,bounds.d));
 if(previewValidity!==valid){
  placementPreviewMaterial.diffuse=valid?new pc.Color(.12,.88,.48):new pc.Color(.96,.22,.20);
  placementPreviewMaterial.emissive=valid?new pc.Color(.025,.16,.07):new pc.Color(.16,.018,.015);
  placementPreviewMaterial.update();
  previewValidity=valid;
 }
 placementPreview.enabled=true;
}

function canAvatarStand(x:number,z:number){
 const radius=.28;
 if(x-radius< -HALF_X||x+radius>HALF_X||z-radius< -HALF_Z||z+radius>HALF_Z)return false;
 const player={x:x-radius,z:z-radius,w:radius*2,d:radius*2};
 // Patient is a real occupied spot; route to the nearest safe treatment-side approach, never through the body.
 if(patientNpc.enabled){const patientPosition=patientNpc.getLocalPosition();if(rectanglesOverlap(player,{x:patientPosition.x-.28,z:patientPosition.z-.28,w:.56,d:.56}))return false;}
 // Perimeter hedge and outdoor props are solid; the lawn is not an infinite walkable plane.
 const outdoorBarriers=[
  {x:-HALF_X,z:-HALF_Z,w:.18,d:D},
  {x:HALF_X-.18,z:-HALF_Z,w:.18,d:D},
  {x:-HALF_X,z:-HALF_Z,w:W,d:.18},
  {x:-HALF_X,z:HALF_Z-.18,w:W,d:.18}
 ];
 if(outdoorBarriers.some(w=>rectanglesOverlap(player,w)))return false;
 const gardenProps=[...outdoorTreePositions.map(([gx,gz])=>({x:gx-.42,z:gz-.42,w:.84,d:.84})),...outdoorShrubPositions.map(([gx,gz])=>({x:gx-.34,z:gz-.48,w:.68,d:.96}))];
 if(gardenProps.some(w=>rectanglesOverlap(player,w)))return false;
 for(const p of placed){
  const isRoom=isRoomKind(p.kind);
  if(isRoom){
   const gx=p.gx,gz=p.gz,rw=p.width??4,rd=p.depth??4,doorW=Math.min(1.2,rw*.42),segment=(rw-doorW)/2;
   // Navigation rectangles mirror the variable-size room shell and its centered doorway.
   const walls=[
    {x:gx-.08,z:gz,w:.16,d:rd},
    {x:gx+rw-.08,z:gz,w:.16,d:rd},
    {x:gx,z:gz-.08,w:segment,d:.16},
    {x:gx+(rw+doorW)/2,z:gz-.08,w:segment,d:.16},
    {x:gx,z:gz+rd-.08,w:rw,d:.16}
   ];
   if(walls.some(w=>rectanglesOverlap(player,w)))return false;
   const furniture:{x:number;z:number;w:number;d:number}[]=p.kind==="reception"?[
    {x:gx+rw*.12,z:gz+rd*.60,w:Math.min(1.7,rw*.45),d:.9},
    {x:gx+rw-.95,z:gz+rd*.12,w:.95,d:Math.min(2.2,rd*.55)}
   ]:p.kind==="treatment"||p.kind==="assessment"?[]:p.kind==="staff"?[
    {x:gx+rw*.25,z:gz+rd*.55,w:Math.min(2.1,rw*.55),d:.82}
   ]:[
    {x:gx+.15,z:gz+2.05,w:.2,d:1.1},
    {x:gx+1.95,z:gz+2.05,w:.2,d:1.1},
    {x:gx+.65,z:gz+2.4,w:1,d:.16}
   ];
   if(furniture.some(w=>rectanglesOverlap(player,w)))return false;
   continue;
  }
  if(rectanglesOverlap(player,footprintAt(p.gx,p.gz,p.kind,p.rot,p.assetKey,p.width,p.depth)))return false;
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
function updateMode(next:"move"|"build"){mode=next;buildGrid.enabled=mode==="build";placementPreview.enabled=mode==="build";previewValidity=null;if(next==="build"){destination=null;target=null;walkPath=[];setLocomotion(false);tapMarker.enabled=false;}moveBtn.classList.toggle("active",mode==="move");buildBtn.classList.toggle("active",mode==="build");buildPanel.hidden=mode!=="build";status.textContent=mode==="move"?"اضغط على الأرض لتحريك شخصيتك. اسحب لتحريك الكاميرا.":"الشبكة ظاهرة الآن: المعاينة الخضراء صالحة، والحمراء غير صالحة. المس لتأكيد المكان.";}
function renderMission(){
 const card=el<HTMLElement>("#mission-card"),title=el<HTMLElement>("#mission-title"),detail=el<HTMLElement>("#mission-detail"),button=el<HTMLButtonElement>("#start-tour");
 card.classList.toggle("mission-done",missionPhase>=5);
 button.disabled=missionPhase>=5;
 if(missionPhase===0){title.textContent="ابنِ الاستقبال";detail.textContent="اسحب على الأرض لرسم غرفة الاستقبال. اختر الحجم المناسب لمساحتك.";button.textContent="ابدأ البناء";}
 else if(missionPhase===1){title.textContent="كوّن فريقك الأول";detail.textContent="وظّف موظف استقبال حتى يتمكن المرضى من التسجيل عند وصولهم.";button.textContent="فتح الإدارة";}
 else if(missionPhase===2){title.textContent="أنشئ غرفة التقييم";detail.textContent="ارسم غرفة للتاريخ المرضي والفحص الوظيفي قبل العلاج.";button.textContent="ابنِ غرفة التقييم";}
 else if(missionPhase===3){title.textContent="أنشئ غرفة العلاج";detail.textContent="جهّز غرفة العلاج الطبيعي لاستقبال الحالات بعد التقييم.";button.textContent="ابنِ غرفة العلاج";}
 else if(missionPhase===4){title.textContent="افتح أبواب العيادة";detail.textContent="تأكد من اكتمال الغرف والفريق، ثم افتح العيادة لاستقبال أول المرضى.";button.textContent="فتح لوحة الإدارة";}
}
function setMissionPhase(next:number){
 missionPhase=next;
 try{localStorage.setItem("therason-clinic-mission-v3",String(next));}catch{}
 renderMission();
}

function renderManagement(){
 el<HTMLElement>("#game-clock").textContent="اليوم "+management.day+" · "+formatGameTime(management);
 el<HTMLElement>("#patient-count").textContent=getActivePatientCount(management)+" مرضى";
 el<HTMLElement>("#reputation").textContent="سمعة "+Math.round(management.reputation);
 el("#mg-balance").textContent=String(Math.round(management.balance));
 el("#mg-treated").textContent=String(management.treated);
 el("#mg-reputation").textContent=Math.round(management.reputation)+"%";
 el("#mg-staff-count").textContent=String(management.staff.length);
 const clinicToggle=el<HTMLButtonElement>("#clinic-open-toggle");clinicToggle.textContent=management.clinicOpen?"إغلاق العيادة":"فتح العيادة";clinicToggle.classList.toggle("closed",!management.clinicOpen);
 el("#management-date").textContent="اليوم "+management.day+" · "+formatGameTime(management)+" · "+(management.speed===0?"متوقفة":management.speed+"×");
 const staffStatus:Record<string,string>={idle:"متاح",working:"يعالج مريضاً",break:"في استراحة"};
 el("#staff-list").innerHTML=management.staff.map(member=>'<div class="management-row"><div><strong>'+member.name+' · '+getRoleLabel(member.role)+'</strong><small>'+staffStatus[member.status]+' · مهارة '+member.skill+' · معنويات '+Math.round(member.morale)+'</small></div><div><small>طاقة '+Math.round(member.energy)+'%</small><div class="meter"><i style="width:'+Math.round(member.energy)+'%"></i></div></div></div>').join("");
 const stageLabels:Record<string,string>={arriving:"وصل الآن",reception:"التسجيل",waiting:"ينتظر",assessment:"التقييم",treatment:"جلسة علاج"};
 const queue=getPatientQueue(management);
 const visiblePatient=queue[0];
 if(!visiblePatient){patientNpc.enabled=false;patientVisualId=0;patientVisualStage="";patientTarget=null;patientWalkPath=[];}
 else{
  patientNpc.enabled=true;
  if(patientVisualId!==visiblePatient.id||patientVisualStage!==visiblePatient.stage){
   patientVisualId=visiblePatient.id;patientVisualStage=visiblePatient.stage;
   const roomType=visiblePatient.stage==="reception"||visiblePatient.stage==="waiting"?"reception":visiblePatient.stage==="assessment"?"assessment":"treatment";
   const room=management.rooms.find(r=>r.type===roomType)??management.rooms.find(r=>r.type==="treatment");
   const goal=room?new pc.Vec3(room.x+Math.min(1.35,room.width*.34),0,room.z+Math.min(1.45,room.depth*.36)):new pc.Vec3(0,0,-4.55);
   const current=patientNpc.getLocalPosition();patientNpc.enabled=false;
   if(canWalkSegment(current.x,current.z,goal.x,goal.z)){patientWalkPath=[];patientTarget=goal;}
   else{const route=findWalkPath(current.x,current.z,goal.x,goal.z);patientWalkPath=route?simplifyWalkRoute(route,current.x,current.z):[];patientTarget=goal;}
   patientNpc.enabled=true;
  }
 }
 el("#patient-queue").innerHTML=queue.length?queue.map(patient=>'<div class="management-row"><div><strong>'+patient.name+' · '+patient.caseLabel+'</strong><small>'+stageLabels[patient.stage]+' · انتظار '+Math.round(patient.waitMinutes)+' دقيقة</small></div><div><small>الصبر '+Math.round(patient.patience)+'%</small><div class="meter"><i style="width:'+Math.round(patient.patience)+'%"></i></div></div></div>').join(""):'<p class="empty-management">لا توجد حالات نشطة حالياً. ابنِ الاستقبال ووظّف موظف استقبال وغرفة تقييم وعلاج.</p>';
 el("#clinic-events").innerHTML=management.events.slice(0,6).map(item=>'<div class="management-event">'+item.message+'</div>').join("");
 document.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach(button=>button.classList.toggle("selected",Number(button.dataset.speed)===management.speed));
}

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
let roomDrawing=false,roomDrawStart:{x:number;z:number}|null=null,roomDrawEnd:{x:number;z:number}|null=null;
function roomDrawBounds(){
 if(!roomDrawStart||!roomDrawEnd)return null;
 const x=Math.min(roomDrawStart.x,roomDrawEnd.x),z=Math.min(roomDrawStart.z,roomDrawEnd.z);
 const w=Math.max(4,Math.min(12,Math.abs(roomDrawEnd.x-roomDrawStart.x)+1));
 const d=Math.max(4,Math.min(12,Math.abs(roomDrawEnd.z-roomDrawStart.z)+1));
 return {x,z,w,d};
}
function updateRoomDrawPreview(){
 const b=roomDrawBounds();if(!b)return;
 const roomType=selected==="gym"?"exercise":selected as ClinicRoomType,base=ROOM_BLUEPRINTS[roomType];
 const cost=base.cost+Math.max(0,b.w*b.d-base.width*base.depth)*35;
 const valid=!occupied(b.x,b.z,selected,wallRotation,undefined,true,b.w,b.d)&&coins>=cost;
 placementPreview.setLocalPosition(b.x+b.w/2,.12,b.z+b.d/2);placementPreview.setLocalScale(b.w,.035,b.d);
 if(previewValidity!==valid){placementPreviewMaterial.diffuse=valid?new pc.Color(.12,.88,.48):new pc.Color(.96,.22,.20);placementPreviewMaterial.emissive=valid?new pc.Color(.025,.16,.07):new pc.Color(.16,.018,.015);placementPreviewMaterial.update();previewValidity=valid;}
 placementPreview.enabled=true;
}
canvas.addEventListener("pointerdown",e=>{
 activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(mode==="build"&&isRoomKind(selected)&&activePointers.size===1){
  const point=screenToGround(e.clientX,e.clientY);
  if(point){roomDrawing=true;roomDrawStart={x:Math.floor(point.x),z:Math.floor(point.z)};roomDrawEnd={...roomDrawStart};pointerStart=null;dragged=true;updateRoomDrawPreview();}
 }else if(mode==="build"&&activePointers.size===1)updatePlacementPreview(e.clientX,e.clientY);
 if(activePointers.size===2){roomDrawing=false;roomDrawStart=null;roomDrawEnd=null;placementPreview.enabled=false;const pts=[...activePointers.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);pinchHeight=desiredOrthoHeight;pointerStart=null;dragged=true;}
 else if(!roomDrawing){pointerStart={x:e.clientX,y:e.clientY,cx:camera.getPosition().x,cz:camera.getPosition().z,tx:cameraGoal.x,tz:cameraGoal.z};dragged=false;}
 canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(roomDrawing&&activePointers.size===1){const point=screenToGround(e.clientX,e.clientY);if(point){roomDrawEnd={x:Math.floor(point.x),z:Math.floor(point.z)};updateRoomDrawPreview();}return;}if(mode==="build"&&activePointers.size<2)updatePlacementPreview(e.clientX,e.clientY);if(activePointers.size>=2){const pts=[...activePointers.values()];const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance>0)desiredOrthoHeight=Math.max(8,Math.min(34,pinchHeight*pinchDistance/Math.max(1,distance)));dragged=true;return;}if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;if(Math.hypot(dx,dy)>8)dragged=true;if(dragged){const scale=camera.camera!.orthoHeight/Math.max(220,canvas.clientHeight),shiftX=-dx*scale*.7,shiftZ=dy*scale*.7;const halfHeight=desiredOrthoHeight*.5,halfWidth=halfHeight*(canvas.clientWidth/Math.max(1,canvas.clientHeight));const maxPanX=Math.max(0,HALF_X-halfWidth*.7),maxPanZ=Math.max(0,HALF_Z-halfHeight*.7);cameraGoal.set(Math.max(-maxPanX,Math.min(maxPanX,pointerStart.tx+shiftX)),0,Math.max(-maxPanZ,Math.min(maxPanZ,pointerStart.tz+shiftZ)));}});
canvas.addEventListener("pointerup",e=>{
 activePointers.delete(e.pointerId);if(activePointers.size<2)pinchDistance=0;
 if(roomDrawing){
  roomDrawing=false;pointerStart=null;const b=roomDrawBounds();roomDrawStart=null;roomDrawEnd=null;placementPreview.enabled=false;
  if(b){
   const roomType=selected==="gym"?"exercise":selected as ClinicRoomType;
   const result=buildRoom(management,roomType,b.x,b.z,b.w,b.d);
   if(!result.ok){status.textContent=result.message;return;}
   coins=management.balance;coinsLabel.textContent=String(coins);
   const item:Placed={id:nextId++,kind:selected,gx:b.x,gz:b.z,width:b.w,depth:b.d,rot:wallRotation};
   placed.push(item);drawPlaced(item);createLawnGrass();if(missionPhase===0&&selected==="reception")setMissionPhase(1);else if(missionPhase===2&&selected==="assessment")setMissionPhase(3);else if(missionPhase===3&&selected==="treatment")setMissionPhase(4);save();status.textContent=result.message+" يمكنك إضافة الأجهزة والأثاث من المتجر.";return;
  }
 }
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
  if(occupied(gx,gz,selected,wallRotation,selectedAssetKey??undefined)){status.textContent="المكان غير متاح: ضع الأثاث داخل غرفة، واترك مسافة حول الأجهزة والجدران.";return;}
  if(isRoomKind(selected)){
   const roomType:ClinicRoomType=selected==="gym"?"exercise":selected as ClinicRoomType;
   const result=buildRoom(management,roomType,gx,gz);
   if(!result.ok){status.textContent=result.message;return;}
   coins=management.balance;
  }else{
   const cost=selected==="asset"&&selectedAssetKey?storeAssetSpecs[selectedAssetKey].cost:costs[selected];
   if(coins<cost){status.textContent="عملاتك لا تكفي لهذه الإضافة بعد.";return;}
   coins-=cost;management.balance=coins;
  }
  coinsLabel.textContent=String(coins);
  const item:Placed={id:nextId++,kind:selected,gx,gz,rot:wallRotation,assetKey:selected==="asset"?selectedAssetKey??undefined:undefined};
  placed.push(item);drawPlaced(item);if(isRoomKind(item.kind))createLawnGrass();save();updatePlacementPreview(e.clientX,e.clientY);status.textContent=isRoomKind(item.kind)?"تم بناء الغرفة. جهّزها بالمعدات والموظفين المناسبين.":"تمت إضافة العنصر إلى العيادة.";return;
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
canvas.addEventListener("pointercancel",e=>{activePointers.delete(e.pointerId);pointerStart=null;pinchDistance=0;dragged=false;roomDrawing=false;roomDrawStart=null;roomDrawEnd=null;placementPreview.enabled=false;});

managementToggle.addEventListener("click",()=>{
 managementPanel.hidden=!managementPanel.hidden;
 if(!managementPanel.hidden){buildPanel.hidden=true;updateMode("move");renderManagement();}
});
el<HTMLButtonElement>("#management-close").addEventListener("click",()=>{managementPanel.hidden=true;});
document.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach(button=>button.addEventListener("click",()=>{
 const speed=Number(button.dataset.speed) as 0|1|2|3;setSimulationSpeed(management,speed);renderManagement();save();
}));
document.querySelectorAll<HTMLButtonElement>("[data-hire]").forEach(button=>button.addEventListener("click",()=>{
 const role=button.dataset.hire as StaffRole,result=hireStaff(management,role);
 coins=management.balance;coinsLabel.textContent=String(coins);status.textContent=result.message;
 if(result.ok&&role==="receptionist"&&missionPhase===1)setMissionPhase(2);
 save();renderManagement();
}));
el<HTMLButtonElement>("#clinic-open-toggle").addEventListener("click",()=>{
 const result=setClinicOpen(management,!management.clinicOpen);
 status.textContent=result.message;
 if(result.ok&&management.clinicOpen&&missionPhase===4)setMissionPhase(5);
 renderManagement();save();
});
function selectBuild(kind:BuildKind){selected=kind;selectedAssetKey=null;previewValidity=null;document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.classList.toggle("selected",b.dataset.build===kind));document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.classList.remove("selected"));const names:Record<BuildKind,string>={treatment:"غرفة علاج",reception:"استقبال",assessment:"غرفة تقييم",gym:"صالة تأهيل",staff:"استراحة الفريق",chair:"كرسي انتظار",plant:"نبات داخلي",cabinet:"خزانة أدوات",parallel:"متوازي",bike:"دراجة علاجية",treadmill:"سير مشي",wallbars:"سلم حائطي",lamp:"مصباح",rug:"سجادة",wall:"مقطع حائط",door:"باب",asset:"أصل ثلاثي الأبعاد"};el("#build-hint").textContent=isRoomKind(kind)?"تم اختيار "+names[kind]+". اسحب بإصبعك على الأرض لرسم مساحة الغرفة بالحجم الذي تريده.":"تم اختيار "+names[kind]+". المس خلية فارغة لوضع العنصر، ويمكنك تدوير الحائط من زر التدوير.";}
function selectAsset(key:string){const spec=storeAssetSpecs[key];if(!spec)return;selected="asset";selectedAssetKey=key;previewValidity=null;document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.classList.remove("selected"));document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.classList.toggle("selected",b.dataset.asset===key));el("#build-hint").textContent="تم اختيار "+spec.label+" من الأصول ثلاثية الأبعاد. يحتاج مساحة "+spec.footprint+"×"+spec.footprint+" خلايا.";}
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
el<HTMLButtonElement>("#rotate-wall").addEventListener("click",()=>{wallRotation=wallRotation===0?90:0;previewValidity=null;status.textContent="اتجاه العنصر الآن "+(wallRotation===0?"0°":"90°")+". سيتم تطبيقه على القطعة التالية.";});
viewBtn.addEventListener("click",()=>{focus=!focus;cameraGoal.set(0,0,0);desiredOrthoHeight=focus?7.2:15.5;viewBtn.classList.toggle("active",focus);el("#camera-hint").classList.toggle("hide",focus);});
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
sessionBtn.addEventListener("click",()=>{
 sessionStep=0;sessionScore=0;focus=true;cameraGoal.set(0,0,2.0);desiredOrthoHeight=8.5;viewBtn.classList.add("active");renderStep();
 sessionPending=moveAvatarTo(1.4,.2);
 if(sessionPending){status.textContent="الأخصائي يتجه إلى المريض. ستبدأ الجلسة بعد الوصول إلى موضع آمن بجانبه.";}
 else{focus=false;cameraGoal.set(0,0,0);viewBtn.classList.remove("active");status.textContent="لا يوجد مسار آمن إلى المريض. افتح الممر أو أعد ترتيب الأثاث قبل بدء الجلسة.";}
});
sessionDialog.addEventListener("close",()=>{focus=false;cameraGoal.set(0,0,0);desiredOrthoHeight=15.5;viewBtn.classList.remove("active");});
el<HTMLButtonElement>("#session-next").addEventListener("click",()=>{if(sessionStep<4){sessionStep++;renderStep();}else{if(missionPhase===2)setMissionPhase(3);const earned=sessionScore*8;xp+=sessionScore*10;coins+=earned;management.balance=coins;management.experience=xp;coinsLabel.textContent=String(coins);el("#experience").textContent=xp+" XP";el("#experience-text").textContent="أكملت جلستك بنتيجة "+sessionScore+" من 5. استمر في تطوير مهاراتك.";el("#session-title").textContent="أحسنت! انتهت الجلسة";el("#session-step").textContent="ملخص الجلسة التعليمية";el("#session-intro").textContent="هذه محاكاة تعليمية وليست تقييماً سريرياً حقيقياً.";el("#patient-brief").innerHTML="<b>نتيجتك: "+sessionScore+" / 5</b><span>عملات مكتسبة: "+earned+"</span><span>خبرة مكتسبة: "+(sessionScore*10)+" XP</span>";el("#session-question").textContent="تذكّر: سلامة المريض والتفكير المنظم وإعادة التقييم أساس الممارسة.";el("#session-options").innerHTML="";el("#session-feedback").textContent="يمكنك العودة إلى عيادتك وتطويرها.";el<HTMLButtonElement>("#session-next").disabled=false;el("#session-next").textContent="العودة إلى العيادة";el<HTMLButtonElement>("#session-next").onclick=()=>{save();sessionDialog.close();};save();}});
load();createLawnGrass();coinsLabel.textContent=String(coins);renderManagement();
let locomotionState="",managementUiTimer=0,managementSaveTimer=0;
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
 if(raw===null){destination=null;tapMarker.enabled=false;walkPath=[];setLocomotion(false);return false;}
 walkPath=simplifyWalkRoute(raw,start.x,start.z);
 const last=walkPath[walkPath.length-1];
 if(last&&canWalkSegment(last.x,last.z,tx,tz))walkPath.push({x:tx,z:tz});
 const first=walkPath.shift();
 if(!first){destination=null;tapMarker.enabled=false;walkPath=[];setLocomotion(false);return false;}
 target=new pc.Vec3(first.x,0,first.z);setLocomotion(true);return true;
}
el<HTMLButtonElement>("#start-tour").addEventListener("click",()=>{
 if(missionPhase===0||missionPhase===2||missionPhase===3){
  managementPanel.hidden=true;buildPanel.hidden=false;updateMode("build");
  selectBuild(missionPhase===0?"reception":missionPhase===2?"assessment":"treatment");
  status.textContent="اسحب بإصبعك على الأرض لرسم مساحة الغرفة، ثم ارفع إصبعك لتأكيد البناء.";
 }else if(missionPhase===1||missionPhase===4){
  managementPanel.hidden=false;buildPanel.hidden=true;updateMode("move");renderManagement();
  status.textContent=missionPhase===1?"وظّف موظف استقبال من لوحة الإدارة.":"تحقق من المتطلبات واضغط فتح العيادة.";
 }
});
el<HTMLButtonElement>("#skip-tour").addEventListener("click",()=>setMissionPhase(5));
renderMission();
app.on("update",(dt:number)=>{
 if(document.hidden)return;
 // Clamp long frames after tab switches or weak-device stalls to prevent sudden character jumps.
 const frameDt=Math.min(Math.max(dt,0),.05);
 advanceSimulation(management,frameDt);coins=management.balance;coinsLabel.textContent=String(Math.round(coins));
 managementUiTimer+=frameDt;managementSaveTimer+=frameDt;
 if(managementUiTimer>=.45){managementUiTimer=0;renderManagement();}
 if(managementSaveTimer>=8){managementSaveTimer=0;save();}
 playerFallbackRig?.update(frameDt,!!target);
 patientFallbackRig?.update(frameDt,!!patientTarget||patientWalkPath.length>0);
 if(patientNpc.enabled&&patientTarget){
  const p=patientNpc.getLocalPosition(),waypoint=patientWalkPath.length?patientWalkPath[0]:{x:patientTarget.x,z:patientTarget.z};
  const dx=waypoint.x-p.x,dz=waypoint.z-p.z,distance=Math.hypot(dx,dz);
  if(distance<.12){
   if(patientWalkPath.length)patientWalkPath.shift();
   else{patientTarget=null;transitionHumanoid(patientRig,false);}
  }else{
   const yaw=Math.atan2(dx,dz)*180/Math.PI,currentYaw=patientNpc.getLocalEulerAngles().y;
   const yawDelta=((yaw-currentYaw+540)%360)-180;
   patientNpc.setLocalEulerAngles(0,currentYaw+Math.max(-frameDt*220,Math.min(frameDt*220,yawDelta)),0);
   const step=Math.min(distance,frameDt*.88);
   const wasEnabled=patientNpc.enabled;patientNpc.enabled=false;
   const moveDistance=Math.hypot(dx, dz),parts=Math.max(1,Math.ceil(step/.05));let px=p.x,pz=p.z;
   for(let i=1;i<=parts;i++){const nx=p.x+dx/moveDistance*step*i/parts,nz=p.z+dz/moveDistance*step*i/parts;if(canAvatarStand(nx,nz)){px=nx;pz=nz;}else break;}
   patientNpc.setLocalPosition(px,0,pz);patientNpc.enabled=wasEnabled;
   transitionHumanoid(patientRig,true);
  }
 }
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
  else{target=null;destination=null;walkVelocity=0;if(playerRig?.anim)playerRig.anim.speed=1;setLocomotion(false);if(missionPhase===1){setMissionPhase(2);status.textContent="وصل الأخصائي إلى غرفة العلاج. ابدأ جلستك التعليمية الأولى.";}}
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
