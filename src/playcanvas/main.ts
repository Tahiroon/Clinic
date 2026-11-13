import { Application, BLEND_NORMAL, CULLFACE_NONE, Color, Entity, FILLMODE_NONE, GraphNode, Mat4, Mesh, MeshInstance, Model, PROJECTION_ORTHOGRAPHIC, RESOLUTION_AUTO, SHADOW_PCSS_32F, StandardMaterial, Vec3, calculateNormals } from "playcanvas";
import "../style.css";
import { createInitialManagementState, advanceSimulation, buildRoom, setSimulationSpeed, formatGameTime, getActivePatientCount, getPatientQueue, setClinicOpen, hireReceptionist, beginPatientSession, completePatientSession, cancelPatientSession, registerPatient, recoverInterruptedSessions, ROOM_BLUEPRINTS, type ManagementState, type ClinicRoomType } from "../game/management";

type BuildKind = "treatment" | "reception" | "assessment" | "gym" | "chair" | "plant" | "cabinet" | "parallel" | "bike" | "treadmill" | "wallbars" | "lamp" | "rug" | "wall" | "door" | "asset";
type Placed = { id:number; kind:BuildKind; gx:number; gz:number; rot?:0|90; assetKey?:string; width?:number; depth?:number };
const el=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=el<HTMLCanvasElement>("#scene"), status=el<HTMLElement>("#status"), fpsLabel=el<HTMLElement>("#fps"), loading=el<HTMLElement>("#loading");
const stage=el<HTMLElement>(".stage"), moveBtn=el<HTMLButtonElement>("#move-mode"), buildBtn=el<HTMLButtonElement>("#build-mode"), storeBtn=el<HTMLButtonElement>("#store-mode"), sessionBtn=el<HTMLButtonElement>("#session-mode"), viewBtn=el<HTMLButtonElement>("#view-mode");
const buildPanel=el<HTMLElement>("#build-panel"),storePanel=el<HTMLElement>("#store-panel"), saveState=el<HTMLElement>("#save-state"), coinsLabel=el<HTMLElement>("#coins"), sessionDialog=el<HTMLDialogElement>("#session-dialog");
const managementPanel=el<HTMLElement>("#management-panel"),managementToggle=el<HTMLButtonElement>("#management-toggle");
let management:ManagementState=createInitialManagementState();
const deviceMemory=Number((navigator as any).deviceMemory??2),cpuCores=navigator.hardwareConcurrency||4;
const highDetailDevice=deviceMemory>=4&&cpuCores>=6;
const app=new Application(canvas,{graphicsDeviceOptions:{antialias:highDetailDevice,alpha:false,powerPreference:"low-power"}});
app.setCanvasFillMode(FILLMODE_NONE);
app.setCanvasResolution(RESOLUTION_AUTO);
// A 1× render scale reduces GPU fill cost and memory bandwidth on low-end phones.
app.graphicsDevice.maxPixelRatio=highDetailDevice?Math.min(window.devicePixelRatio||1,1.25):Math.min(window.devicePixelRatio||1,.9);
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
 // Portrait is a spatial advantage: frame the full 14×28 m starter property.
 // Wider screens keep a closer management view instead of stretching the mobile composition.
 const aspect=w/h;
 desiredOrthoHeight=aspect<.9?Math.max(D+3,(W+2)/aspect):aspect<1.2?22:16.5;
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
app.scene.ambientLight=new Color(.72,.75,.78);
function material(c:Color){const m=new StandardMaterial();m.diffuse=c;m.update();return m;}
const M={ground:material(new Color(.24,.52,.39)),tile:material(new Color(.34,.66,.48)),grid:material(new Color(.12,.62,.72)),room:material(new Color(.86,.91,.88)),wall:material(new Color(.92,.93,.89)),wallBase:material(new Color(.77,.82,.78)),wallGlass:material(new Color(.64,.83,.84)),wallBlue:material(new Color(.66,.80,.85)),wallFrame:material(new Color(.16,.25,.29)),wallCap:material(new Color(.72,.78,.74)),wallAccent:material(new Color(.10,.55,.60)),wallRecess:material(new Color(.53,.61,.58)),wood:material(new Color(.54,.34,.23)),wood2:material(new Color(.78,.55,.31)),teal:material(new Color(.02,.64,.70)),blue:material(new Color(.10,.34,.66)),pale:material(new Color(.82,.95,.94)),green:material(new Color(.20,.65,.39)),skin:material(new Color(.72,.49,.36)),dark:material(new Color(.08,.15,.23)),white:material(new Color(.98,.98,.92)),yellow:material(new Color(.98,.73,.23))};
type PrimitiveModelType="box"|"capsule"|"cone"|"cylinder"|"plane"|"sphere"|"torus";
function primitive(name:string,type:PrimitiveModelType,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:StandardMaterial,parent:Entity=app.root){
 const e=new Entity(name);e.addComponent("model",{type});parent.addChild(e);e.setLocalPosition(x,y,z);e.setLocalScale(sx,sy,sz);
 e.model!.material=m;
 const simpleDetail=/grass|tuft|flower bloom|gait lane marker|tap destination|recess|reveal|skirting|coping|mullion|inset|joint|plaque|handle|identity tile|paving|shadow/i.test(name);
 const architecturalCaster=/wall|tree|trunk|bench|planter|lamp|facade|canopy|pillar|door|cabinet|desk|bed|chair|equipment|room|column|counter/i.test(name);
 const surfaceReceiver=/floor|ground|landscape|path|foundation|tile|wall|plinth|paver/i.test(name);
 // Only large readable forms cast the expensive map; fine trim stays visible but does not pollute the shadow pass.
 e.model!.castShadows=highDetailDevice&&!simpleDetail&&architecturalCaster;
 e.model!.receiveShadows=highDetailDevice&&!simpleDetail&&(surfaceReceiver||architecturalCaster);
 return e;
}
function box(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:StandardMaterial,parent:Entity=app.root){return primitive(name,"box",x,y,z,sx,sy,sz,m,parent);}
function sphere(name:string,x:number,y:number,z:number,s:number,m:StandardMaterial,parent:Entity=app.root){return primitive(name,"sphere",x,y,z,s,s,s,m,parent);}
function cylinder(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:StandardMaterial,parent:Entity=app.root){return primitive(name,"cylinder",x,y,z,sx,sy,sz,m,parent);}
function cone(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:StandardMaterial,parent:Entity=app.root){return primitive(name,"cone",x,y,z,sx,sy,sz,m,parent);}
const contactShadowOuter=material(new Color(.10,.16,.17));
contactShadowOuter.opacity=.075;contactShadowOuter.blendType=BLEND_NORMAL;contactShadowOuter.depthWrite=false;contactShadowOuter.useLighting=false;contactShadowOuter.update();
const contactShadowInner=material(new Color(.08,.12,.14));
contactShadowInner.opacity=.045;contactShadowInner.blendType=BLEND_NORMAL;contactShadowInner.depthWrite=false;contactShadowInner.useLighting=false;contactShadowInner.update();
function addContactShadow(parent:Entity,name:string,x:number,z:number,width:number,depth:number,groundY=.052):Entity|null{
 if(highDetailDevice)return null;
 const root=new Entity(name+" · soft contact shadow");parent.addChild(root);root.setLocalPosition(x,groundY,z);
 const outer=sphere("Soft shadow feather",0,0,0,1,contactShadowOuter,root);outer.setLocalScale(width,.006,depth);
 const inner=sphere("Soft shadow core",0,.002,0,1,contactShadowInner,root);inner.setLocalScale(width*.68,.004,depth*.68);
 return root;
}
const camera=new Entity("Portrait isometric camera");
camera.addComponent("camera",{projection:PROJECTION_ORTHOGRAPHIC,orthoHeight:15.5,clearColor:new Color(.69,.79,.80),nearClip:.1,farClip:200});
const cameraTarget=new Vec3(0,0,0),cameraGoal=new Vec3(0,0,0);
camera.setPosition(3.5,21.5,-15);camera.lookAt(cameraTarget);app.root.addChild(camera);
let desiredOrthoHeight=15.5;
const light=new Entity("Soft daylight");
light.addComponent("light",{type:"directional",intensity:1.08,castShadows:highDetailDevice});
if(highDetailDevice){
 light.light!.shadowType=SHADOW_PCSS_32F;
 light.light!.shadowResolution=2048;
 light.light!.shadowDistance=38;
 light.light!.shadowIntensity=.56;
 light.light!.shadowBias=.025;
 light.light!.normalOffsetBias=.018;
 light.light!.penumbraSize=1.35;
 light.light!.penumbraFalloff=1.15;
 light.light!.shadowSamples=12;
 light.light!.shadowBlockerSamples=6;
}
light.setEulerAngles(48,25,0);app.root.addChild(light);
const world=new Entity("Clinic property · portrait 3/4 world");
world.setEulerAngles(0,10,0);app.root.addChild(world);world.syncHierarchy();
const worldInverse=new Mat4().invert(world.getWorldTransform() as Mat4);
const tapMarker=new Entity("Tap destination marker");
tapMarker.addComponent("model",{type:"cylinder"});
tapMarker.model!.material=M.yellow;
tapMarker.setLocalScale(.34,.035,.34);
tapMarker.enabled=false;
world.addChild(tapMarker);

const GRID=1, W=14, D=28, HALF_X=W/2, HALF_Z=D/2;
const grassAlt=material(new Color(.38,.53,.38));
const pathMat=material(new Color(.67,.62,.49));
const pathEdge=material(new Color(.43,.48,.37));
const trim=material(new Color(.10,.39,.47));
const roofAccent=material(new Color(.16,.28,.38));
const lawnBase=material(new Color(.25,.39,.24));
const lawnPatchMaterial=material(new Color(.31,.47,.29));
const outdoorTreePositions:[number,number][]=[[-9.1,-16.1],[9.1,-16.1],[-9.1,16.1],[9.1,16.1],[-9.1,-7.2],[9.1,-7.2],[-9.1,7.2],[9.1,7.2]];
const outdoorShrubPositions:[number,number][]=[[-8.8,-12.0],[8.8,-12.0],[-8.8,-7.5],[8.8,-4.5],[-8.8,5.2],[8.8,8.0],[-8.8,12.0],[8.8,12.0]];
// The property is a continuous outdoor lawn. Only constructed rooms receive a finished interior floor.
box("Surrounding green landscape",0,-.24,0,W+10,.42,D+10,lawnBase,world);
const landscapeTurfPatches:[number,number,number,number][]=[
 [-9.6,-11.5,1.7,1.05],[9.6,-11.5,1.7,1.05],[-9.5,-3.2,1.5,.95],[9.5,-3.2,1.5,.95],
 [-9.6,5.0,1.7,1.0],[9.6,5.0,1.7,1.0],[-9.5,12.0,1.55,.95],[9.5,12.0,1.55,.95]
];
for(const [x,z,rx,rz] of landscapeTurfPatches){
 const patch=sphere("Layered landscape turf island",x,-.012,z,1,lawnPatchMaterial,world);
 patch.setLocalScale(rx,.012,rz);
}
box("Clinic buildable foundation",0,.005,0,W,.08,D,material(new Color(.66,.68,.65)),world);
box("Main entrance garden path",0,.018,-8.45,1.75,.045,11.0,pathMat,world);
box("Outdoor approach path",0,.018,-16.2,2.4,.045,4.5,pathMat,world);
box("Gait garden connecting path",1.9,.025,-16.15,1.6,.05,.72,pathMat,world);
box("Path west raised curb",-.91,.075,-8.45,.13,.15,11.0,pathEdge,world);
box("Path east raised curb",.91,.075,-8.45,.13,.15,11.0,pathEdge,world);
for(let i=0;i<10;i++){
 const z=-13.72+i*1.12;
 box("Entrance path paving joint",0,.044,z,1.62,.012,.035,pathEdge,world);
}
for(const x of [-.62,.62]){
 for(let i=0;i<6;i++){
  const z=-13.3+i*1.72;
  box("Entrance path inset paver",x,.052,z,.38,.025,.48,grassAlt,world);
 }
}
// A low stone garden edge defines the property without turning it into a fenced box.
const propertyEdges:[number,number,number,number][]=[
 [-4.35,-13.92,5.3,.18],[4.35,-13.92,5.3,.18],[0,13.92,W,.18],
 [-6.92,0,.18,D],[6.92,0,.18,D]
];
for(const [x,z,sx,sz] of propertyEdges){
 box("Property edge stone footing",x,.075,z,sx,.15,sz,M.wallFrame,world);
 box("Low property boundary",x,.19,z,sx,.20,sz,trim,world);
 box("Property edge coping",x,.305,z,sx+.10,.07,sz+.10,M.wallCap,world);
}
// The front gate aligns with the approach path; its piers are deliberately low and welcoming.
for(const x of [-1.62,1.62]){
 box("Garden entrance gate footing",x,.16,-13.92,.66,.32,.72,M.wallFrame,world);
 box("Garden entrance gate pier",x,.78,-13.92,.43,1.24,.48,M.wall,world);
 box("Garden entrance pier inset",x,.80,-14.17,.24,.78,.025,M.wallRecess,world);
 box("Garden entrance pier cap",x,1.43,-13.92,.62,.12,.66,M.wallCap,world);
 box("Garden entrance pier identity tile",x,.88,-14.19,.13,.26,.035,M.wallAccent,world);
}
// A wider paved arrival court gives the entrance a deliberate destination, not just a long strip.
box("Clinic arrival court stone border",0,.035,-4.25,4.65,.07,2.55,pathEdge,world);
box("Clinic arrival court paving",0,.075,-4.25,4.42,.035,2.34,pathMat,world);
for(const x of [-1.42,0,1.42])box("Arrival court paving joint",x,.096,-4.25,.025,.012,2.12,pathEdge,world);
for(const z of [-4.92,-4.25,-3.58])box("Arrival court cross joint",0,.096,z,4.20,.012,.022,pathEdge,world);
for(const x of [-2.05,2.05])box("Arrival court inset stone",x,.105,-4.25,.22,.025,1.42,M.wallCap,world);
addContactShadow(world,"Arrival court soft grounding",0,-4.25,2.7,1.55,.052);
for(const [x,z] of outdoorTreePositions){
 cylinder("Outdoor tree trunk",x,.78,z,.18,1.56,.18,M.wood,world);
 cylinder("Outdoor tree branch",x-.23,1.43,z,.075,.72,.075,M.wood,world).setLocalEulerAngles(0,0,-32);
 cylinder("Outdoor tree branch",x+.23,1.48,z,.07,.66,.07,M.wood,world).setLocalEulerAngles(0,0,29);
 addContactShadow(world,"Tree ground shadow",x,z,.92,.74,-.023);
 const crown=sphere("Outdoor tree crown",x,2.02,z,.72,M.green,world);crown.setLocalScale(1.05,1.12,.96);
 for(const [dx,dy,dz,r] of [[-.43,1.92,.02,.46],[.40,2.02,.08,.48],[0,2.48,.02,.48]] as [number,number,number,number][]){
  const cluster=sphere("Layered tree foliage",x+dx,dy,z+dz,r,grassAlt,world);cluster.setLocalScale(1.0,1.08,.92);
 }
}
for(const [x,z] of outdoorShrubPositions){
 addContactShadow(world,"Garden planter shadow",x,z,.55,.48,-.023);
 box("Outdoor raised planter",x,.17,z,.72,.34,.88,M.wood2,world);
 box("Planter dark inset",x,.355,z,.64,.045,.78,M.wood,world);
 for(const [dx,dz,r] of [[-.2,-.12,.28],[.16,.08,.31],[.02,-.2,.25]] as [number,number,number][]){
  const shrub=sphere("Layered garden shrub",x+dx,.62,z+dz,r,M.green,world);shrub.setLocalScale(1.18,.82,1.0);
 }
}
const outdoorBenchPositions:[number,number][]=[[-8.15,0],[8.15,0]];
const outdoorFlowerPositions:[number,number][]=[[-8.25,-9.5],[8.25,-9.5],[-8.25,9.5],[8.25,9.5]];
const outdoorLampPositions:[number,number][]=[[-8.25,-13.5],[8.25,-13.5],[-8.25,13.5],[8.25,13.5]];
// A compact outdoor gait-training lane sits beyond the property edge, never inside the buildable plot.
const gaitLaneX=3.25,gaitLaneZ=-16.15;
box("Outdoor gait training lane",gaitLaneX,.035,gaitLaneZ,1.35,.055,4.2,pathEdge,world);
box("Outdoor gait lane walking surface",gaitLaneX,.068,gaitLaneZ,1.12,.025,4.0,pathMat,world);
for(let i=0;i<5;i++){const z=gaitLaneZ-1.55+i*.78;box("Gait lane distance marker",gaitLaneX,.09,z,1.0,.018,.035,M.white,world);}
for(const x of [gaitLaneX-.72,gaitLaneX+.72]){
 cylinder("Gait lane marker post",x,.48,gaitLaneZ-1.95,.045,.85,.045,M.dark,world);
 sphere("Gait lane marker cap",x,.93,gaitLaneZ-1.95,.11,M.yellow,world);
}

for(const [x,z] of outdoorBenchPositions){
 addContactShadow(world,"Garden bench shadow",x,z,.95,.48,-.023);
 box("Garden bench seat",x,.38,z,1.55,.16,.52,M.wood2,world);
 box("Garden bench back",x,.78,z+.2,1.55,.62,.12,M.wood,world);
 for(const dx of [-.58,.58])box("Garden bench support",x+dx,.19,z,.09,.38,.42,M.dark,world);
}
for(const [x,z] of outdoorFlowerPositions){
 addContactShadow(world,"Flower bed ground shadow",x,z,.62,.42,-.023);
 box("Outdoor flower bed",x,.16,z,1.15,.3,.72,M.wood2,world);
 for(const [dx,dz] of [[-.34,-.12],[0,.08],[.34,-.1]] as [number,number][]){
  cylinder("Garden flower stem",x+dx,.42,z+dz,.025,.28,.025,M.green,world);
  sphere("Garden flower bloom",x+dx,.57,z+dz,.13,dx<0?M.yellow:M.pale,world);
 }
}
for(const [x,z] of outdoorLampPositions){
 addContactShadow(world,"Garden lamp shadow",x,z,.32,.30,-.023);
 cylinder("Garden lamp base",x,.12,z,.22,.24,.22,M.dark,world);
 cylinder("Garden lamp post",x,.92,z,.07,1.6,.07,M.dark,world);
 sphere("Garden lamp globe",x,1.82,z,.2,M.yellow,world);
}
const lawnGrassMaterial=material(new Color(1,1,1));
lawnGrassMaterial.diffuseVertexColor=true;lawnGrassMaterial.cull=CULLFACE_NONE;lawnGrassMaterial.update();
let lawnGrassOwner:Entity|null=null;
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
 const tuftBudget=highDetailDevice?4200:2400;
 for(let i=0;i<tuftBudget;i++){
  const x=-HALF_X-4.7+rand()*(W+9.4),z=-HALF_Z-4.7+rand()*(D+9.4);
  const insideBuildablePlot=x>-HALF_X-.08&&x<HALF_X+.08&&z>-HALF_Z-.08&&z<HALF_Z+.08;
  if(insideBuildablePlot)continue;
  const insideAnyRoom=placed.some(p=>isRoomKind(p.kind)&&x>p.gx-.14&&x<p.gx+(p.width??4)+.14&&z>p.gz-.14&&z<p.gz+(p.depth??4)+.14);
  const onEntrancePath=Math.abs(x)<1.12&&z< -2.1;
  const nearTree=outdoorTreePositions.some(([tx,tz])=>Math.hypot(x-tx,z-tz)<1.05);
  const nearShrub=outdoorShrubPositions.some(([sx,sz])=>Math.abs(x-sx)<.52&&Math.abs(z-sz)<.72);
  const nearBench=outdoorBenchPositions.some(([bx,bz])=>Math.abs(x-bx)<1.0&&Math.abs(z-bz)<.55);
  const nearFlower=outdoorFlowerPositions.some(([fx,fz])=>Math.abs(x-fx)<.72&&Math.abs(z-fz)<.5);
  const nearLamp=outdoorLampPositions.some(([lx,lz])=>Math.hypot(x-lx,z-lz)<.32);
  const nearGaitLane=Math.abs(x-gaitLaneX)<.82&&Math.abs(z-gaitLaneZ)<2.2;
  if(insideAnyRoom||onEntrancePath||nearTree||nearShrub||nearBench||nearFlower||nearLamp||nearGaitLane)continue;
  addTuft(x,z);
 }
 const mesh=new Mesh(app.graphicsDevice);
 mesh.setPositions(new Float32Array(positions));
 mesh.setNormals(calculateNormals(positions,indices));
 mesh.setColors32(new Uint8Array(colors));
 mesh.setIndices(indices);mesh.update();
 lawnGrassOwner=new Entity("Outdoor grass mesh owner");
 const grassGraph=new GraphNode("Outdoor grass mesh graph");
 const model=new Model();model.graph=grassGraph;
 model.meshInstances=[new MeshInstance(mesh,lawnGrassMaterial,grassGraph)];
 lawnGrassOwner.addComponent("model");lawnGrassOwner.model!.model=model;world.addChild(lawnGrassOwner);
}
const arrivalMetal=material(new Color(.20,.31,.38));
const warmGlass=material(new Color(.96,.76,.40));
for(const x of [-1.12,1.12]){
 addContactShadow(world,"Entrance light shadow",x,-3.75,.28,.26);
 cylinder("Entrance path light base",x,.12,-3.75,.18,.22,.18,arrivalMetal,world);
 cylinder("Entrance path light stem",x,.52,-3.75,.065,.78,.065,arrivalMetal,world);
 sphere("Entrance path light diffuser",x,.98,-3.75,.14,warmGlass,world);
}
// Compact starter-clinic pavilion: a calm, recognisable building rather than a floating sign.
box("Starter clinic stone plinth",0,.13,-2.38,6.0,.26,1.42,M.wallFrame,world);
box("Starter clinic warm facade left wing",-2.12,1.42,-2.22,1.72,2.58,.28,M.wallBase,world);
box("Starter clinic warm facade right wing",2.12,1.42,-2.22,1.72,2.58,.28,M.wallBase,world);
for(const x of [-2.12,2.12]){
 box("Starter clinic recessed window reveal",x,1.66,-2.385,1.30,1.52,.035,M.wallRecess,world);
 box("Starter clinic front window glass",x,1.66,-2.415,1.18,1.39,.035,M.wallBlue,world);
 box("Starter clinic window sill",x,.86,-2.46,1.42,.10,.16,M.wallCap,world);
 box("Starter clinic window lintel",x,2.45,-2.46,1.42,.10,.16,M.wallCap,world);
 box("Starter clinic window mullion",x,1.66,-2.46,.055,1.48,.10,arrivalMetal,world);
}
for(const x of [-1.18,1.18]){
 box("Starter clinic entrance portal pier",x,1.42,-2.42,.22,2.72,.46,M.wall,world);
 box("Starter clinic portal shadow reveal",x,1.42,-2.67,.045,2.55,.045,M.wallRecess,world);
}
box("Starter clinic glazed entrance left leaf",-.47,1.18,-2.37,.78,2.20,.075,M.wallBlue,world);
box("Starter clinic glazed entrance right leaf",.47,1.18,-2.37,.78,2.20,.075,M.wallBlue,world);
box("Starter clinic entrance centre mullion",0,1.18,-2.43,.055,2.22,.11,arrivalMetal,world);
box("Starter clinic entrance handle left",-.10,1.10,-2.50,.035,.34,.035,M.wallFrame,world);
box("Starter clinic entrance handle right",.10,1.10,-2.50,.035,.34,.035,M.wallFrame,world);
box("Starter clinic facade lintel",0,2.82,-2.36,2.62,.24,.48,M.wall,world);
box("Starter clinic roof fascia",0,3.02,-2.26,6.12,.22,1.52,arrivalMetal,world);
box("Starter clinic roof top",0,3.15,-2.26,6.20,.10,1.58,M.wall,world);
box("THERASON sign shadow backing",0,2.88,-3.045,2.68,.48,.16,M.wallFrame,world);
box("THERASON entrance sign",0,2.88,-3.14,2.42,.34,.055,trim,world);
box("THERASON sign inset",0,2.88,-3.18,2.16,.22,.025,M.white,world);
box("THERASON sign identity mark",-.88,2.88,-3.20,.08,.18,.035,M.wallAccent,world);
box("Entrance canopy",0,2.30,-2.86,3.45,.16,1.10,roofAccent,world);
box("Entrance canopy underside",0,2.205,-2.86,3.12,.035,.88,M.wallCap,world);
for(const x of [-1.48,1.48])box("Entrance canopy bracket",x,2.06,-2.66,.10,.34,.32,M.wallFrame,world);
addContactShadow(world,"Starter clinic pavilion shadow",0,-3.45,2.9,.72,.052);
const roomRoot=new Entity("Player-built clinic rooms");world.addChild(roomRoot);
const buildGrid=new Entity("Expandable property construction grid");world.addChild(buildGrid);
const gridMaterial=material(new Color(.20,.57,.65));
for(let i=0;i<=W;i++){
 const x=-HALF_X+i*GRID;
 box("Property grid vertical",x,.035,0,.012,.012,D,gridMaterial,buildGrid);
}
for(let i=0;i<=D;i++){
 const z=-HALF_Z+i*GRID;
 box("Property grid horizontal",0,.035,z,W,.012,.012,gridMaterial,buildGrid);
}
buildGrid.enabled=false;
const ROOM_SURFACES={
 reception:material(new Color(.80,.91,.89)),
 assessment:material(new Color(.83,.91,.96)),
 treatment:material(new Color(.86,.94,.91)),
 exercise:material(new Color(.83,.90,.96))
};
function makeRoom(kind:"treatment"|"reception"|"assessment"|"exercise",gx:number,gz:number,id:number,width=4,depth=4){
 const root=new Entity("Room "+id+" · "+kind);
 world.addChild(root);root.setLocalPosition(gx+width/2,0,gz+depth/2);
 const halfW=width/2,halfD=depth/2;
 box("Room floor base",0,.025,0,width,.05,depth,ROOM_SURFACES[kind],root);
 for(let x=0;x<width;x+=2)for(let z=0;z<depth;z+=2){
  const tileWidth=Math.min(2,width-x),tileDepth=Math.min(2,depth-z);
  loadRoomModule(root,"corridor-floor-tile.glb",-halfW+x+tileWidth/2,.05,-halfD+z+tileDepth/2,0,tileWidth/2,tileDepth/2,"floor");
 }
 // Modular two-metre partitions, glazed rear wall and a real hinged door reproduce the readable cutaway-room language of a management sim.
 addRoomWallRun(root,"z",-halfD,depth,-halfW,"glazed");
 addRoomWallRun(root,"z",-halfD,depth,halfW,"solid");
 addRoomWallRun(root,"x",-halfW,width,halfD,"solid");
 const doorWidth=Math.min(1.2,width*.34),sideSegment=(width-doorWidth)/2;
 addRoomWallRun(root,"x",-halfW,sideSegment,-halfD,"solid",.62);
 addRoomWallRun(root,"x",doorWidth/2,sideSegment,-halfD,"solid",.62);
 loadRoomDoor(root,0,-halfD);
 // Recessed panel geometry creates depth without busy decorative trim.
 box("Simple room entrance plaque",-halfW+.12,1.95,0,.05,.32,.62,M.wall,root);
 for(const x of [-Math.min(1,width*.25),Math.min(1,width*.25)]){
  box("Ceiling light housing",x,2.55,0,.68,.055,.20,M.white,root);
  box("Ceiling light diffuser",x,2.515,0,.54,.018,.13,M.pale,root);
 }
 // Rooms stay empty after construction; equipment and optional decor are purchased separately.

 return root;
}
// The starter clinic is assembled from lightweight procedural geometry; optional GLB assets load independently.
const avatar=new Entity("Player physiotherapist");world.addChild(avatar);avatar.setLocalPosition(0,0,-4.55);
const avatarContactShadow=addContactShadow(world,"Player physiotherapist shadow",0,-4.55,.42,.25,.006);
let walkVelocity=0;
let avatarAnim:any=null;let playerRig:HumanoidRig|null=null;
const characterAssets:Record<string,string>={
 physiotherapist:new URL("../assets/characters/Physiotherapist.glb",import.meta.url).href,
 patient:new URL("../assets/characters/WardPatient.glb",import.meta.url).href,
 receptionist:new URL("../assets/characters/Receptionist.glb",import.meta.url).href,
};
type HumanoidRig={entity:Entity;anim:any;clips:string[];idle:string;walk:string};
type FallbackRig={entity:Entity;update:(dt:number,moving:boolean)=>void};
function createFallbackHumanoid(parent:Entity,kind:"physiotherapist"|"patient"|"receptionist"):FallbackRig{
 const root=new Entity("Fallback character rig · "+kind);parent.addChild(root);
 const shirt=kind==="physiotherapist"?M.white:kind==="receptionist"?M.teal:M.pale,trousers=kind==="physiotherapist"?M.blue:kind==="receptionist"?M.dark:M.teal;
 box("Humanoid torso",0,1.02,0,.42,.62,.27,shirt,root);
 box("Humanoid neck",0,1.38,0,.11,.14,.12,M.skin,root);
 sphere("Humanoid head",0,1.57,0,.155,M.skin,root);
 sphere("Humanoid hair",0,1.69,-.025,.15,M.dark,root);
 const legPivots:Entity[]=[];
 for(const x of [-.14,.14]){
  const pivot=new Entity("Leg swing pivot");root.addChild(pivot);pivot.setLocalPosition(x,.78,0);
  box("Humanoid thigh and lower leg",0,-.34,0,.15,.68,.17,trousers,pivot);
  box("Humanoid shoe",0,-.69,.075,.19,.13,.29,M.dark,pivot);
  legPivots.push(pivot);
 }
 const armPivots:Entity[]=[];
 for(const x of [-.27,.27]){
  const pivot=new Entity("Arm swing pivot");root.addChild(pivot);pivot.setLocalPosition(x,1.27,0);
  box("Humanoid arm",0,-.29,0,.13,.58,.15,shirt,pivot);
  sphere("Humanoid hand",0,-.61,.015,.085,M.skin,pivot);
  armPivots.push(pivot);
 }
 if(kind==="physiotherapist")box("Physiotherapist ID badge",.12,1.18,-.15,.1,.13,.025,trim,root);
 if(kind==="receptionist")box("Receptionist name badge",.12,1.18,-.15,.1,.13,.025,M.yellow,root);
 let phase=0;
 return {entity:root,update:(dt,moving)=>{
  if(moving)phase+=dt*7.2;
  const swing=moving?Math.sin(phase)*27:0;
  legPivots[0].setLocalEulerAngles(swing,0,0);legPivots[1].setLocalEulerAngles(-swing,0,0);
  armPivots[0].setLocalEulerAngles(-swing*.72,0,0);armPivots[1].setLocalEulerAngles(swing*.72,0,0);
 }};
}

 const humanoidAssetCache=new Map<string,Promise<any>>();
 function loadHumanoid(url:string,parent:Entity,height:number,castShadow:boolean,onReady?:(rig:HumanoidRig)=>void){
  let pending=humanoidAssetCache.get(url);
  if(!pending){pending=new Promise((resolve,reject)=>app.assets.loadFromUrl(url,"container",(err,asset)=>err||!asset?.resource?reject(err??new Error("Character asset unavailable")):resolve(asset)));humanoidAssetCache.set(url,pending);}
  pending.then(asset=>{
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
  const parentInverse=new Mat4().invert(parent.getWorldTransform() as Mat4);
  const worldCenter=new Vec3((scaledMinX+scaledMaxX)/2,parent.getPosition().y,(scaledMinZ+scaledMaxZ)/2);
  const localCenter=parentInverse.transformPoint(worldCenter,new Vec3());
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
  }).catch(error=>{console.error("Character asset failed",url,error);status.textContent="تم تشغيل شخصية بديلة خفيفة؛ تعذر تحميل النموذج الخارجي.";});
}
function transitionHumanoid(rig:HumanoidRig|null,moving:boolean){
 if(!rig?.anim?.baseLayer)return;
 const desired=moving?rig.walk:rig.idle;
 if(!desired||rig.anim.baseLayer.activeState===desired)return;
 try{rig.anim.baseLayer.transition(desired,moving ? 0.22 : 0.3);rig.anim.speed=moving?1:1;}
 catch{try{rig.anim.baseLayer.play(desired);}catch{}}
}
const physiotherapistFallback=createFallbackHumanoid(avatar,"physiotherapist");
let playerFallbackRig:FallbackRig|null=physiotherapistFallback;
loadHumanoid(characterAssets.physiotherapist,avatar,1.72,true,rig=>{
 physiotherapistFallback.entity.destroy();playerFallbackRig=null;
 avatarAnim=rig.anim;playerRig=rig;
 status.textContent="الأخصائي جاهز. اضغط على مكان داخل العيادة ليتحرك إليه.";
});
const patientNpc=new Entity("Patient visitor");world.addChild(patientNpc);patientNpc.setLocalPosition(1.0,0,-4.55);patientNpc.enabled=false;
const patientFallback=createFallbackHumanoid(patientNpc,"patient");
const receptionistNpc=new Entity("Optional receptionist");world.addChild(receptionistNpc);receptionistNpc.enabled=false;
let receptionistFallbackRig:FallbackRig|null=null,receptionistRig:HumanoidRig|null=null,receptionistLoadStarted=false;
function ensureReceptionistModel(){
 if(receptionistLoadStarted)return;
 receptionistLoadStarted=true;
 const fallback=createFallbackHumanoid(receptionistNpc,"receptionist");receptionistFallbackRig=fallback;
 loadHumanoid(characterAssets.receptionist,receptionistNpc,1.62,false,rig=>{fallback.entity.destroy();receptionistFallbackRig=null;receptionistRig=rig;});
}
let patientFallbackRig:FallbackRig|null=patientFallback,patientRig:HumanoidRig|null=null;
let patientVisualId=0,patientVisualStage="",patientTarget:Vec3|null=null,patientWalkPath:{x:number;z:number}[]=[];
loadHumanoid(characterAssets.patient,patientNpc,1.62,false,rig=>{patientFallback.entity.destroy();patientFallbackRig=null;patientRig=rig;});

type WaitingPatientVisual={root:Entity;fallback:FallbackRig|null;rig:HumanoidRig|null};
const waitingPatientVisuals:WaitingPatientVisual[]=[];
for(let i=0;i<2;i++){
 const root=new Entity("Waiting patient "+(i+2));world.addChild(root);root.enabled=false;
 const fallback=createFallbackHumanoid(root,"patient");
 const visual:WaitingPatientVisual={root,fallback,rig:null};waitingPatientVisuals.push(visual);
 loadHumanoid(characterAssets.patient,root,1.62,false,rig=>{visual.fallback?.entity.destroy();visual.fallback=null;visual.rig=rig;});
}


let mode:"move"|"build"="move", selected:BuildKind="wall", selectedAssetKey:string|null=null, target:Vec3|null=null, coins=3200, xp=0, nextId=1, focus=false, wallRotation:0|90=0;
let missionPhase=(()=>{try{const saved=Number(localStorage.getItem("therason-clinic-mission-v4")||0);return Math.max(0,Math.min(7,saved));}catch{return 0;}})();

let placed:Placed[]=[];let walkPath:{x:number;z:number}[]=[];let destination:Vec3|null=null;const saveKey="therason-clinic-world-v13";
const managementSaveKey="therason-clinic-management-v5";
const TRIAL_ACCOUNT_COINS=3200; 
const starterLayout:Placed[]=[];
const costs:Record<BuildKind,number>={treatment:720,reception:420,assessment:620,gym:980,chair:20,plant:15,cabinet:30,parallel:80,bike:100,treadmill:120,wallbars:70,lamp:15,rug:25,wall:8,door:22,asset:0};
const storeAssetSpecs:Record<string,{file:string;node:string;label:string;cost:number;footprint:number;targetSize:number}>={
 "pt-treatment-table":{file:"examination-couch.glb",node:"*",label:"سرير علاج طبيعي",cost:90,footprint:2,targetSize:2.3},
 "pt-exam-table":{file:"examination-couch.glb",node:"*",label:"سرير فحص سريري",cost:95,footprint:2,targetSize:2.3},
 "pt-patient-chair":{file:"doctors-office-set.glb",node:"Chair_Patient",label:"كرسي المريض",cost:45,footprint:1,targetSize:0.9},
 "pt-doctor-desk":{file:"doctors-office-set.glb",node:"Desk_Doctor",label:"مكتب الأخصائي",cost:65,footprint:2,targetSize:1.35},
 "pt-privacy-screen":{file:"privacy-screen.glb",node:"*",label:"حاجز خصوصية طبي",cost:60,footprint:2,targetSize:1.8},
 "pt-clinical-sink":{file:"doctors-office-set.glb",node:"Sink_Cabinet",label:"حوض غسل طبي",cost:50,footprint:1,targetSize:0.95},
 "pt-wall-chart":{file:"doctors-office-set.glb",node:"Wall_Chart",label:"لوحة فحص سريري",cost:25,footprint:1,targetSize:0.85},
 "pt-parallel-bars":{file:"physical-therapy-room-set.glb",node:"ParallelBars",label:"جهاز المتوازي",cost:100,footprint:3,targetSize:2.8},
 "pt-band-rack":{file:"physical-therapy-room-set.glb",node:"BandRack",label:"حامل أحزمة المقاومة",cost:35,footprint:2,targetSize:1.5},
 "pt-exercise-ball":{file:"physical-therapy-room-set.glb",node:"ExerciseBall",label:"كرة علاجية",cost:20,footprint:1,targetSize:.72},
 "pt-exercise-mat":{file:"physical-therapy-room-set.glb",node:"ExerciseMat",label:"بساط تمارين",cost:25,footprint:2,targetSize:2.2},
 "pt-hand-weights":{file:"physical-therapy-room-set.glb",node:"HandWeights",label:"أوزان علاجية",cost:30,footprint:2,targetSize:1.2},
 "pt-privacy-curtain":{file:"physical-therapy-room-set.glb",node:"PrivacyCurtain",label:"ستارة خصوصية",cost:45,footprint:3,targetSize:2.8},
 "pt-storage-cabinet":{file:"bedside-cabinet.glb",node:"*",label:"خزانة أدوات",cost:40,footprint:1,targetSize:.85},
 "pt-reception-desk":{file:"reception-desk.glb",node:"*",label:"مكتب استقبال",cost:160,footprint:3,targetSize:2.2},
 "pt-waiting-bench":{file:"waiting-bench-two-seat.glb",node:"*",label:"مقعد انتظار مزدوج",cost:65,footprint:2,targetSize:1.5},
 "pt-wheelchair":{file:"wheelchair.glb",node:"*",label:"كرسي متحرك",cost:75,footprint:2,targetSize:1.1},
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
 "doctors-office-set.glb":new URL("../assets/clinic-kit/hospital/doctors-office-set.glb",import.meta.url).href,
 "examination-couch.glb":new URL("../assets/clinic-kit/management-sim/examination-couch.glb",import.meta.url).href,
 "reception-desk.glb":new URL("../assets/clinic-kit/management-sim/reception-desk.glb",import.meta.url).href,
 "waiting-bench-two-seat.glb":new URL("../assets/clinic-kit/management-sim/waiting-bench-two-seat.glb",import.meta.url).href,
 "privacy-screen.glb":new URL("../assets/clinic-kit/management-sim/privacy-screen.glb",import.meta.url).href,
 "wheelchair.glb":new URL("../assets/clinic-kit/management-sim/wheelchair.glb",import.meta.url).href,
 "bedside-cabinet.glb":new URL("../assets/clinic-kit/management-sim/bedside-cabinet.glb",import.meta.url).href,
 "partition-wall.glb":new URL("../assets/clinic-kit/management-sim/partition-wall.glb",import.meta.url).href,
 "partition-wall-1m.glb":new URL("../assets/clinic-kit/management-sim/partition-wall-1m.glb",import.meta.url).href,
 "door-leaf.glb":new URL("../assets/clinic-kit/management-sim/door-leaf.glb",import.meta.url).href,
 "corridor-floor-tile.glb":new URL("../assets/clinic-kit/management-sim/corridor-floor-tile.glb",import.meta.url).href
};
const containerCache=new Map<string,Promise<any>>();
function loadRoomModule(parent:Entity,file:string,x:number,y:number,z:number,rotation:number,scaleX=1,scaleZ=1,fallback:"floor"|"wall"="wall",scaleY=1){
 const url=clinicAssetUrls[file];if(!url)return;
 getClinicContainer(url).then(asset=>{
  const model=asset.resource.instantiateRenderEntity({castShadows:highDetailDevice,receiveShadows:highDetailDevice});
  parent.addChild(model);model.setLocalPosition(x,y,z);model.setLocalEulerAngles(0,rotation,0);model.setLocalScale(scaleX,scaleY,scaleZ);model.syncHierarchy();
 }).catch(error=>{
  console.warn("Room module fallback:",file,error);
  if(fallback==="floor")box("Fallback floor tile",x,y+.012,z,scaleX*2,.018,scaleZ*2,(Math.round(x+z)%2)?M.pale:M.room,parent);
  else{const fallbackWall=box("Fallback wall module",x,y+1.35*scaleY,z,scaleX*2,2.7*scaleY,scaleZ*.15,M.wallBase,parent);fallbackWall.setLocalEulerAngles(0,rotation,0);}
 });
}
function addRoomWallRun(parent:Entity,axis:"x"|"z",start:number,length:number,fixed:number,kind:"solid"|"glazed",heightScale=1){
 // Quiet architectural depth: a real wall body, shallow recessed panels,
 // slim shadow reveals, a restrained baseboard and a continuous top edge.
 const wallHeight=2.7*heightScale,thickness=.22,baseHeight=.20*heightScale;
 const place=(name:string,center:number,span:number,y:number,height:number,depth:number,offset:number,mat:StandardMaterial)=>{
  const x=axis==="x"?center:fixed+offset,z=axis==="x"?fixed+offset:center;
  box(name,x,y,z,axis==="x"?span:depth,height,axis==="z"?span:depth,mat,parent);
 };
 let cursor=0;
 while(cursor<length-.02){
  const span=Math.min(2,length-cursor),center=start+cursor+span/2;
  place("Solid warm plaster wall",center,span,wallHeight/2,wallHeight,thickness,0,M.wallBase);
  for(const side of [-1,1]){
   const face=side*(thickness/2+.012);
   place("Recessed wall panel shadow line",center,Math.max(.22,span-.18),baseHeight+(wallHeight-baseHeight)*.52,wallHeight-baseHeight-.34,.026,face,M.wallRecess);
   place("Raised wall panel face",center,Math.max(.16,span-.28),baseHeight+(wallHeight-baseHeight)*.52,wallHeight-baseHeight-.44,.028,face+side*.018,M.wall);
   place("Wall vertical reveal",center-span/2+.055,.035,wallHeight/2,wallHeight-.08,.045,face+side*.025,M.wallCap);
   place("Wall vertical reveal",center+span/2-.055,.035,wallHeight/2,wallHeight-.08,.045,face+side*.025,M.wallCap);
   place("Wall protective skirting",center,span,.105*heightScale,.17*heightScale,.045,face+side*.025,M.wallFrame);
   place("Wall top coping",center,span,wallHeight-.055*heightScale,.11*heightScale,.045,face+side*.03,M.wallCap);
  }
  if(kind==="glazed"&&heightScale===1)place("Quiet clinic glass clerestory",center,Math.max(.25,span-.38),wallHeight-.34,.22,.055,thickness/2+.04,M.wallBlue);
  cursor+=span;
 }
}
function loadRoomDoor(parent:Entity,x:number,z:number){
 const url=clinicAssetUrls["door-leaf.glb"];
 getClinicContainer(url).then(asset=>{
  const model=asset.resource.instantiateRenderEntity({castShadows:highDetailDevice,receiveShadows:highDetailDevice});
  parent.addChild(model);model.setLocalPosition(x,0,z);model.syncHierarchy();
  const leaf=findEntityByName(model,"door");if(leaf)leaf.setLocalEulerAngles(0,68,0);
  model.syncHierarchy();
 }).catch(error=>{
  console.warn("Door model fallback",error);
  box("Door frame left",x-.6,1.35,z,.07,2.7,.16,M.white,parent);
  box("Door frame right",x+.6,1.35,z,.07,2.7,.16,M.white,parent);
  box("Door leaf ajar",x-.32,1.02,z+.13,.07,2.02,.82,M.wood2,parent);
 });
}
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
 const root=new Entity("Fallback prop · "+spec.label);
 root.setPosition(p.gx+size/2,0,p.gz+size/2);world.addChild(root);
 addContactShadow(root,"Fallback equipment shadow",0,0,size*.62,size*.44,.052);
 const bed=(name:string)=>{box(name+" base",0,.3,0,1.8,.2,.82,M.dark,root);box(name+" mattress",0,.47,0,1.76,.18,.78,M.blue,root);box(name+" pillow",0,.59,-.3,.46,.1,.28,M.pale,root);for(const x of [-.72,.72])for(const z of [-.28,.28])box(name+" leg",x,.13,z,.08,.28,.08,M.dark,root);};
 const chair=(name:string)=>{box(name+" seat",0,.48,0,.62,.15,.62,M.teal,root);box(name+" back",0,.82,-.23,.62,.62,.13,M.blue,root);for(const x of [-.23,.23])for(const z of [-.23,.23])box(name+" leg",x,.22,z,.06,.44,.06,M.dark,root);};
 if(key==="pt-treatment-table"||key==="pt-exam-table")bed("Fallback "+spec.label);
 else if(key==="pt-storage-cabinet"||key==="pt-clinical-sink"){
  box("Fallback cabinet body",0,.55,0,.72,1.1,.52,M.wood2,root);box("Fallback cabinet front",0,.55,.27,.64,.98,.025,M.wood,root);
  if(key==="pt-clinical-sink"){box("Fallback sink basin",0,1.13,.02,.5,.08,.34,M.pale,root);cylinder("Fallback faucet",0,1.25,-.1,.035,.2,.035,M.dark,root);}
 }else if(key==="pt-patient-chair"||key==="hospital-transport-chair"||key==="pt-wheelchair")chair("Fallback "+spec.label);
 else if(key==="pt-doctor-desk"){
  box("Fallback desk top",0,.88,0,1.55,.12,.82,M.wood2,root);for(const x of [-.65,.65])box("Fallback desk leg",x,.43,0,.09,.82,.72,M.dark,root);box("Fallback monitor",0,1.18,-.2,.48,.38,.06,M.dark,root);
 }else if(key==="pt-reception-desk"){
  box("Fallback reception counter",0,.55,0,2.05,1.05,.72,M.wood2,root);box("Fallback reception top",0,1.1,0,2.12,.12,.78,M.wood,root);box("Fallback reception screen",.45,1.35,-.18,.46,.34,.05,M.dark,root);
 }else if(key==="pt-waiting-bench"){
  box("Fallback waiting bench seat",0,.42,0,1.55,.18,.55,M.teal,root);box("Fallback waiting bench back",0,.78,-.2,1.55,.58,.12,M.blue,root);for(const x of [-.65,.65])box("Fallback bench leg",x,.2,0,.08,.4,.42,M.dark,root);
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
let storePreviewRoot:Entity|null=null;
let storePreviewGeneration=0;
function clearStorePreview(){
 storePreviewGeneration++;
 if(storePreviewRoot){storePreviewRoot.destroy();storePreviewRoot=null;}
}
function showStorePreview(key:string){
 const spec=storeAssetSpecs[key];if(!spec)return;
 clearStorePreview();
 const generation=storePreviewGeneration;
 const root=new Entity("THERASON real 3D store preview");
 world.addChild(root);root.setLocalPosition(0,0,17.1);storePreviewRoot=root;
 cylinder("Preview display plinth",0,.12,0,1.18,.22,1.18,M.dark,root);
 primitive("Preview display accent ring","torus",0,.245,0,1.13,.035,1.13,M.teal,root);
 const url=clinicAssetUrls[spec.file];
 if(!url){el("#store-preview-detail").textContent="لا يتوفر ملف النموذج لهذا العنصر حالياً.";return;}
 getClinicContainer(url).then(asset=>{
  if(generation!==storePreviewGeneration||storePreviewRoot!==root)return;
  const instance=asset.resource.instantiateRenderEntity({castShadows:false,receiveShadows:false});
  let model:Entity=instance;
  if(spec.node!=="*"){
   const chosen=findEntityByName(instance,spec.node);
   if(!chosen)throw new Error("Missing preview model node "+spec.node);
   const parent=chosen.parent as Entity|null;if(parent)parent.removeChild(chosen);
   instance.destroy();model=chosen;
  }
  root.addChild(model);model.setLocalEulerAngles(0,32,0);root.syncHierarchy();
  let bounds=renderBounds(model);
  if(!bounds||bounds.width<.01||bounds.depth<.01||bounds.height<.01){model.destroy();throw new Error("Invalid 3D preview bounds");}
  const scale=spec.targetSize/Math.max(bounds.width,bounds.depth,.05);
  model.setLocalScale(scale,scale,scale);root.syncHierarchy();
  bounds=renderBounds(model);if(!bounds)throw new Error("3D preview has no visible meshes");
  const current=model.getPosition(),origin=root.getPosition();
  model.setPosition(current.x+origin.x-(bounds.minX+bounds.maxX)/2,current.y-bounds.minY+.245,current.z+origin.z-(bounds.minZ+bounds.maxZ)/2);
  root.syncHierarchy();
  el("#store-preview-detail").textContent="النموذج ثلاثي الأبعاد الحقيقي نفسه الذي سيظهر داخل عيادتك بعد وضعه.";
  el<HTMLButtonElement>("#store-place-selected").disabled=false;
 }).catch(error=>{
  if(generation!==storePreviewGeneration)return;
  console.error("Real store preview failed",key,error);
  el("#store-preview-detail").textContent="تعذر تحميل النموذج الحقيقي الآن. لن نعرض رسماً بديلاً على أنه صورة الجهاز.";
  el<HTMLButtonElement>("#store-place-selected").disabled=true;
 });
 focus=true;cameraGoal.set(0,0,15.2);desiredOrthoHeight=8.7;viewBtn.classList.add("active");
}
function collectDescendants(root:Entity):Entity[]{
 // Imported GLB hierarchies can be unusually deep. Traverse iteratively so a
 // vendor model can never exhaust the browser's JavaScript call stack.
 const found:Entity[]=[];
 const stack=[...(root.children as Entity[])];
 const seen=new Set<Entity>();
 while(stack.length){
  const node=stack.pop()!;
  if(seen.has(node))continue;
  seen.add(node);found.push(node);
  for(const child of node.children as Entity[])stack.push(child);
 }
 return found;
}
function collectRenderMeshes(root:Entity):any[]{
 const meshes:any[]=[];const stack=[root];const seen=new Set<Entity>();
 while(stack.length){const node=stack.pop()!;if(seen.has(node))continue;seen.add(node);
  const component=(node as any).render;if(component?.meshInstances?.length)for(const mesh of component.meshInstances)meshes.push(mesh);
  for(const child of node.children as Entity[])stack.push(child);
 }return meshes;
}
function findEntityByName(root:Entity,name:string):Entity|null{
 const stack=[root],seen=new Set<Entity>();while(stack.length){const node=stack.pop()!;if(seen.has(node))continue;seen.add(node);if(node.name===name)return node;for(const child of node.children as Entity[])stack.push(child);}return null;
}
function renderBounds(root:Entity){
 const meshes=collectRenderMeshes(root);
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const mesh of meshes){const b=mesh.aabb,c=b.center,h=b.halfExtents;minX=Math.min(minX,c.x-h.x);maxX=Math.max(maxX,c.x+h.x);minY=Math.min(minY,c.y-h.y);maxY=Math.max(maxY,c.y+h.y);minZ=Math.min(minZ,c.z-h.z);maxZ=Math.max(maxZ,c.z+h.z);}
 if(!meshes.length||![minX,maxX,minY,maxY,minZ,maxZ].every(Number.isFinite))return null;
 return {minX,maxX,minY,maxY,minZ,maxZ,width:maxX-minX,height:maxY-minY,depth:maxZ-minZ};
}
function loadWaitingSeats(parent:Entity){
 const url=clinicAssetUrls["waiting-bench-two-seat.glb"];
 getClinicContainer(url).then(asset=>{
  for(let i=0;i<2;i++){
   const seat=asset.resource.instantiateRenderEntity({castShadows:highDetailDevice,receiveShadows:highDetailDevice});
   parent.addChild(seat);seat.setLocalScale(.94,.94,.94);seat.setLocalEulerAngles(0,90,0);
   seat.setLocalPosition(1.35,0,-.35+i*1.22);seat.syncHierarchy();
  }
 }).catch(error=>{
  console.warn("Matching waiting bench GLB unavailable; using compact seats",error);
  for(const z of [-.35,.85]){
   box("Waiting seat fallback",1.35,.38,z,.65,.18,.62,M.teal,parent);
   box("Waiting seat back fallback",1.35,.75,z+.22,.65,.6,.13,M.blue,parent);
  }
 });
}
function loadReceptionDesk(parent:Entity){
 const url=clinicAssetUrls["reception-desk.glb"];
 getClinicContainer(url).then(asset=>{
  const model=asset.resource.instantiateRenderEntity({castShadows:highDetailDevice,receiveShadows:highDetailDevice});
  parent.addChild(model);model.syncHierarchy();
  let bounds=renderBounds(model);
  if(!bounds||bounds.width<.05||bounds.depth<.05||bounds.height<.05){model.destroy();throw new Error("Reception counter asset has invalid bounds");}
  const scale=Math.min(2.1/bounds.width,.88/bounds.depth,1.08/bounds.height);
  model.setLocalScale(scale,scale,scale);model.syncHierarchy();
  bounds=renderBounds(model);if(!bounds)throw new Error("Reception counter has no render meshes");
  const target=parent.getWorldTransform().transformPoint(new Vec3(-.35,0,1.0),new Vec3());
  const current=model.getPosition();
  model.setPosition(current.x+target.x-(bounds.minX+bounds.maxX)/2,current.y-bounds.minY,current.z+target.z-(bounds.minZ+bounds.maxZ)/2);
  model.syncHierarchy();
 }).catch(error=>{
  console.error("Reception desk GLB failed; using graceful fallback",error);
  box("Reception fallback desk",.2,.48,2.35,1.8,.85,.65,M.wood,parent);
  box("Reception fallback desk top",.2,.94,2.35,1.9,.1,.72,M.wood2,parent);
  box("Reception fallback monitor",.2,1.18,2.25,.42,.34,.05,M.dark,parent);
 });
}
function loadTreatmentRoomDecor(parent:Entity){
 const url=clinicAssetUrls["hospital-patient-room.glb"];
 getClinicContainer(url).then(asset=>{
  const model=asset.resource.instantiateRenderEntity({castShadows:highDetailDevice,receiveShadows:highDetailDevice});
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
  const target=parent.getWorldTransform().transformPoint(new Vec3(1,0,1),new Vec3());
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
  const container=asset.resource.instantiateRenderEntity({castShadows:highDetailDevice,receiveShadows:highDetailDevice});
  const chosen=spec.node==="*"?container:findEntityByName(container,spec.node);
  if(!chosen){container.destroy();throw new Error("Missing model node "+spec.node);}
  if(spec.node!=="*"){const sourceParent=chosen.parent as Entity|null;if(sourceParent)sourceParent.removeChild(chosen);container.destroy();}
  const size=spec.footprint,holder=new Entity("3D asset · "+spec.label);
  world.addChild(holder);holder.setLocalPosition(p.gx+size/2,0,p.gz+size/2);
  addContactShadow(holder,"Clinical equipment contact shadow",0,0,size*.62,size*.44,.052);
  holder.addChild(chosen);
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

function save(){try{management.balance=coins;management.experience=xp;el("#store-coins").textContent=String(coins);localStorage.setItem(saveKey,JSON.stringify({v:13,coins,xp,placed}));localStorage.setItem(managementSaveKey,JSON.stringify(management));saveState.textContent="تم الحفظ";}catch{saveState.textContent="حفظ مؤقت";}}
function validSavedItem(value:any):value is Placed{
 if(!value||typeof value!=="object")return false;
 const kinds:BuildKind[]=["treatment","reception","assessment","gym","chair","plant","cabinet","parallel","bike","treadmill","wallbars","lamp","rug","wall","door","asset"];
 if(!kinds.includes(value.kind)||!Number.isSafeInteger(value.id)||value.id<1)return false;
 if(!Number.isInteger(value.gx)||!Number.isInteger(value.gz)||![0,90].includes(value.rot??0))return false;
 if(value.kind==="asset"&&(!value.assetKey||!storeAssetSpecs[value.assetKey]))return false;
 if(value.kind!=="asset"&&value.assetKey!==undefined)return false;
 if(isRoomKind(value.kind)&&((value.width!==undefined&&(!Number.isInteger(value.width)||value.width<4||value.width>12))||(value.depth!==undefined&&(!Number.isInteger(value.depth)||value.depth<4||value.depth>12))))return false;
 const bounds=footprintAt(value.gx,value.gz,value.kind,value.rot??0,value.assetKey,value.width,value.depth);
 return bounds.x>=-HALF_X&&bounds.z>=-HALF_Z&&bounds.x+bounds.w<=HALF_X&&bounds.z+bounds.d<=HALF_Z;
}
function load(){
 const useStarter=()=>{management=createInitialManagementState();coins=management.balance;xp=0;placed=starterLayout.map(p=>({...p}));nextId=1;for(const p of placed)drawPlaced(p);};
 try{
  const raw=localStorage.getItem(saveKey);if(!raw){useStarter();return;}
  const v=JSON.parse(raw);if(v.v!==13||!Array.isArray(v.placed)){useStarter();return;}
  try{const savedManagement=JSON.parse(localStorage.getItem(managementSaveKey)||"null");if(savedManagement?.version===3&&Array.isArray(savedManagement.patients)&&Array.isArray(savedManagement.rooms))management=savedManagement;else management=createInitialManagementState();recoverInterruptedSessions(management);}catch{management=createInitialManagementState();}
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
function drawPlaced(p:Placed){if(p.kind==="asset"){loadClinicAsset(p);return;}const x=p.gx+.5,z=p.gz+.5;if(isRoomKind(p.kind)){const roomType=p.kind==="gym"?"exercise":p.kind;makeRoom(roomType as "treatment"|"reception"|"assessment"|"exercise",p.gx,p.gz,p.id,p.width??4,p.depth??4);return;}
 const root=new Entity("Placed "+p.kind);
 world.addChild(root);
 if(p.kind==="wall")root.setLocalPosition(p.rot===90?p.gx+1.5:x,0,p.rot===90?z:p.gz+1.5);
 else root.setLocalPosition(x,0,z);
 if(p.kind!=="wall")addContactShadow(root,"Placed furnishing contact shadow",0,0,.42,.34,.052);
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
function footprint(kind:BuildKind,assetKey?:string){if(kind==="asset")return storeAssetSpecs[assetKey??""]?.footprint??1;return kind==="treatment"||kind==="reception"||kind==="assessment"||kind==="gym"?4:1;}
function isRoomKind(kind:BuildKind){return kind==="treatment"||kind==="reception"||kind==="assessment"||kind==="gym";}
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
  const starterFurniture=[{x:-.55,z:-1.15,w:1.1,d:2.3},{x:1.07,z:1.07,w:.86,d:.86}];
  if(placed.some(p=>p.kind==="treatment"&&p.id===1)&&starterFurniture.some(obstacle=>rectanglesOverlap(a,obstacle)))return true;
 }
 // Furniture may share a room's floor, but never another prop's physical footprint.
 return placed.some(p=>!isRoomKind(p.kind)&&rectanglesOverlap(a,footprintAt(p.gx,p.gz,p.kind,p.rot,p.assetKey,p.width,p.depth)));
}

// Reusable placement ghost: one lightweight mesh, updated in place (never spawned per pointer event).
const placementPreviewMaterial=material(new Color(.12,.82,.48));
placementPreviewMaterial.opacity=.42;
placementPreviewMaterial.blendType=BLEND_NORMAL;
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
  placementPreviewMaterial.diffuse=valid?new Color(.12,.88,.48):new Color(.96,.22,.20);
  placementPreviewMaterial.emissive=valid?new Color(.025,.16,.07):new Color(.16,.018,.015);
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
   ]:p.kind==="treatment"&&p.id===1?[
    {x:gx+.45,z:gz+.85,w:1.1,d:2.3},
    {x:gx+2.07,z:gz+2.07,w:.86,d:.86}
   ]:p.kind==="assessment"?[]:[
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
function hasAssetInRoom(assetKey:string,roomType:ClinicRoomType){
 const room=management.rooms.find(r=>r.type===roomType);
 return !!room&&placed.some(p=>p.kind==="asset"&&p.assetKey===assetKey&&(()=>{
  const b=footprintAt(p.gx,p.gz,p.kind,p.rot,p.assetKey);
  return b.x>=room.x+.08&&b.z>=room.z+.08&&b.x+b.w<=room.x+room.width-.08&&b.z+b.d<=room.z+room.depth-.08;
 })());
}
function updateMissionEquipment(){
 if(missionPhase===1&&hasAssetInRoom("pt-treatment-table","treatment"))setMissionPhase(2);
 else if(missionPhase===3&&hasAssetInRoom("pt-reception-desk","reception")&&hasAssetInRoom("pt-waiting-bench","reception"))setMissionPhase(4);
 else if(missionPhase===5&&hasAssetInRoom("pt-exam-table","assessment")&&hasAssetInRoom("pt-patient-chair","assessment"))setMissionPhase(6);
}
function renderMission(){
 const card=el<HTMLElement>("#mission-card"),title=el<HTMLElement>("#mission-title"),detail=el<HTMLElement>("#mission-detail"),button=el<HTMLButtonElement>("#start-tour");
 card.classList.toggle("mission-done",missionPhase>=7);button.disabled=missionPhase>=7;
 if(missionPhase===0){title.textContent="ابنِ غرفة العلاج الأولى";detail.textContent="ابدأ من أرض فارغة. اسحب لتحديد مساحة غرفة العلاج الطبيعي ثم أكّد البناء.";button.textContent="ابدأ البناء";}
 else if(missionPhase===1){title.textContent="جهّز غرفة العلاج";detail.textContent="افتح المتجر واشترِ سرير علاج طبيعي، ثم ضعه داخل الغرفة.";button.textContent="افتح متجر الأجهزة";}
 else if(missionPhase===2){title.textContent="ابنِ منطقة الاستقبال";detail.textContent="أنشئ غرفة استقبال متصلة بمساحة العيادة وممرات الحركة.";button.textContent="ابنِ الاستقبال";}
 else if(missionPhase===3){title.textContent="جهّز الاستقبال";detail.textContent="اشترِ مكتب الاستقبال ومقاعد الانتظار وضعها بنفسك.";button.textContent="افتح متجر الأثاث";}
 else if(missionPhase===4){title.textContent="أنشئ غرفة التقييم";detail.textContent="ابنِ غرفة مستقلة لأخذ التاريخ المرضي والفحص الوظيفي.";button.textContent="ابنِ غرفة التقييم";}
 else if(missionPhase===5){title.textContent="جهّز غرفة التقييم";detail.textContent="اشترِ سرير الفحص وكرسي المريض وضعهما داخل الغرفة.";button.textContent="افتح متجر التقييم";}
 else if(missionPhase===6){title.textContent="افتح أبواب العيادة";detail.textContent="تأكد من جاهزية الغرف والمعدات، ثم افتح العيادة لاستقبال أول حالة.";button.textContent="لوحة الإدارة";}
 else{title.textContent="عيادتك بدأت تنمو";detail.textContent="عالج المرضى، طوّر المساحات، واشترِ أجهزة جديدة من المتجر.";button.textContent="متابعة اللعب";}
}
function setMissionPhase(next:number){
 missionPhase=next;
 try{localStorage.setItem("therason-clinic-mission-v4",String(next));}catch{}
 renderMission();
}

function patientGoalFor(room:{x:number;z:number;width:number;depth:number},stage:string){
 const centerX=room.x+room.width/2,centerZ=room.z+room.depth/2;
 if(stage==="departing")return new Vec3(0,0,-4.55);
 if(stage==="reception")return new Vec3(centerX-.35,0,centerZ+.22);
 if(stage==="waiting")return new Vec3(centerX+.75,0,centerZ+.4);
 return new Vec3(centerX+Math.min(.95,room.width*.24),0,centerZ+.2);
}
function renderManagement(){
 el<HTMLElement>("#game-clock").textContent="اليوم "+management.day+" · "+formatGameTime(management);
 el<HTMLElement>("#patient-count").textContent=getActivePatientCount(management)+" مرضى";
 el<HTMLElement>("#reputation").textContent="سمعة "+Math.round(management.reputation);
 el("#mg-balance").textContent=String(Math.round(management.balance));
 el("#mg-treated").textContent=String(management.treated);
 el("#mg-reputation").textContent=Math.round(management.reputation)+"%";
 el("#mg-room-count").textContent=String(management.rooms.length);
 const roomNames:Record<string,string>={treatment:"علاج طبيعي",reception:"استقبال",assessment:"تقييم",exercise:"تأهيل حركي"};
 el("#room-list").innerHTML=management.rooms.map(room=>'<div class="room-summary-item"><strong>'+(roomNames[room.type]??room.type)+'</strong><small>'+room.width+' × '+room.depth+' م</small></div>').join("");
 const clinicToggle=el<HTMLButtonElement>("#clinic-open-toggle");
 clinicToggle.textContent=management.clinicOpen?"إغلاق العيادة":"فتح العيادة";
 clinicToggle.classList.toggle("closed",!management.clinicOpen);
 el("#management-date").textContent="اليوم "+management.day+" · "+formatGameTime(management)+" · "+(management.speed===0?"متوقفة":management.speed+"×");
 const receptionistButton=el<HTMLButtonElement>("#buy-receptionist");
 const receptionistDescription=el<HTMLElement>("#receptionist-description");
 receptionistButton.hidden=management.receptionistOwned||management.treated<3;
 receptionistButton.disabled=management.receptionistOwned||management.balance<280;
 receptionistDescription.textContent=management.receptionistOwned?"موظف الاستقبال يعمل الآن على تنظيم وصول المرضى.":management.treated<3?"عالج "+(3-management.treated)+" حالات إضافية لفتح شراء موظف الاستقبال.":"متاح الآن: اشترِ موظف استقبال مقابل 280 عملة لتسريع التسجيل وتقليل الانتظار.";
 const receptionistRoom=management.rooms.find(r=>r.type==="reception");
 if(management.receptionistOwned&&receptionistRoom)ensureReceptionistModel();
 receptionistNpc.enabled=management.receptionistOwned&&!!receptionistRoom;
 if(receptionistNpc.enabled&&receptionistRoom){
  receptionistNpc.setLocalPosition(receptionistRoom.x+receptionistRoom.width/2-.35,0,receptionistRoom.z+receptionistRoom.depth/2+1.62);
  receptionistNpc.setLocalEulerAngles(0,180,0);transitionHumanoid(receptionistRig,false);
 }
 const stageLabels:Record<string,string>={arriving:"وصل الآن",reception:"بانتظار التسجيل",waiting:"ينتظر الأخصائي",assessment:"جلسة التقييم",treatment:"جلسة العلاج",departing:"يغادر العيادة"};
 const queue=getPatientQueue(management),visiblePatient=queue[0],receptionRoom=management.rooms.find(r=>r.type==="reception");
 for(let i=0;i<waitingPatientVisuals.length;i++){
  const visual=waitingPatientVisuals[i],queued=queue[i+1],show=!!queued&&!!receptionRoom&&(queued.stage==="reception"||queued.stage==="waiting");
  visual.root.enabled=show;
  if(show&&receptionRoom){const centerX=receptionRoom.x+receptionRoom.width/2,centerZ=receptionRoom.z+receptionRoom.depth/2;visual.root.setLocalPosition(centerX+.75,0,centerZ-.35+i*1.22);visual.root.setLocalEulerAngles(0,180,0);visual.fallback?.update(0,false);transitionHumanoid(visual.rig,false);}
 }
 if(!visiblePatient){patientNpc.enabled=false;patientVisualId=0;patientVisualStage="";patientTarget=null;patientWalkPath=[];}
 else{
  patientNpc.enabled=true;
  if(patientVisualId!==visiblePatient.id||patientVisualStage!==visiblePatient.stage){
   patientVisualId=visiblePatient.id;patientVisualStage=visiblePatient.stage;
   const roomType=visiblePatient.stage==="reception"||visiblePatient.stage==="waiting"?"reception":visiblePatient.stage==="assessment"?"assessment":(visiblePatient.need==="mobility"||visiblePatient.need==="sports")&&management.rooms.some(r=>r.type==="exercise")?"exercise":"treatment";
   const room=management.rooms.find(r=>r.type===roomType)??management.rooms.find(r=>r.type==="treatment");
   const goal=room?patientGoalFor(room,visiblePatient.stage):new Vec3(0,0,-4.55);
   const current=patientNpc.getLocalPosition();patientNpc.enabled=false;
   if(canWalkSegment(current.x,current.z,goal.x,goal.z)){patientWalkPath=[];patientTarget=goal;}
   else{const route=findWalkPath(current.x,current.z,goal.x,goal.z);patientWalkPath=route?simplifyWalkRoute(route,current.x,current.z):[];patientTarget=goal;}
   patientNpc.enabled=true;
  }
 }
 el("#patient-queue").innerHTML=queue.length?queue.map(patient=>'<div class="management-row"><div><strong>'+patient.name+' · '+patient.caseLabel+'</strong><small>'+stageLabels[patient.stage]+' · انتظار '+Math.round(patient.waitMinutes)+' دقيقة</small></div><div><small>الصبر '+Math.round(patient.patience)+'%</small><div class="meter"><i style="width:'+Math.round(patient.patience)+'%"></i></div>'+(patient.stage==="reception"&&!management.receptionistOwned?'<button class="register-patient-button" type="button" data-register-patient="'+patient.id+'">تسجيل المريض</button>':"")+'</div></div>').join(""):'<p class="empty-management">لا توجد حالات نشطة حالياً. افتح العيادة وانتظر وصول المرضى.</p>';
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
 const localPoint=worldInverse.transformPoint(worldPoint,new Vec3());
 if(Math.abs(localPoint.x)>HALF_X||Math.abs(localPoint.z)>HALF_Z)return null;
 return localPoint;
}
let pointerStart:{x:number;y:number;cx:number;cz:number;tx:number;tz:number}|null=null,dragged=false;const activePointers=new Map<number,{x:number;y:number}>();let pinchDistance=0,pinchHeight=0;
let roomDrawing=false,roomDrawStart:{x:number;z:number}|null=null,roomDrawEnd:{x:number;z:number}|null=null;
function roomDrawBounds(){
 if(!roomDrawStart||!roomDrawEnd)return null;
 const x=Math.min(roomDrawStart.x,roomDrawEnd.x),z=Math.min(roomDrawStart.z,roomDrawEnd.z);
 const roomType=selected==="gym"?"exercise":selected as ClinicRoomType;
 const blueprint=ROOM_BLUEPRINTS[roomType],minWidth=blueprint?.width??4,minDepth=blueprint?.depth??4;
 const w=Math.max(minWidth,Math.min(12,Math.abs(roomDrawEnd.x-roomDrawStart.x)+1));
 const d=Math.max(minDepth,Math.min(12,Math.abs(roomDrawEnd.z-roomDrawStart.z)+1));
 return {x,z,w,d};
}
function updateRoomDrawPreview(){
 const b=roomDrawBounds();if(!b)return;
 const roomType=selected==="gym"?"exercise":selected as ClinicRoomType,base=ROOM_BLUEPRINTS[roomType];
 const cost=base.cost+Math.max(0,b.w*b.d-base.width*base.depth)*35;
 const valid=!occupied(b.x,b.z,selected,wallRotation,undefined,true,b.w,b.d)&&coins>=cost;
 placementPreview.setLocalPosition(b.x+b.w/2,.12,b.z+b.d/2);placementPreview.setLocalScale(b.w,.035,b.d);
 if(previewValidity!==valid){placementPreviewMaterial.diffuse=valid?new Color(.12,.88,.48):new Color(.96,.22,.20);placementPreviewMaterial.emissive=valid?new Color(.025,.16,.07):new Color(.16,.018,.015);placementPreviewMaterial.update();previewValidity=valid;}
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
canvas.addEventListener("pointermove",e=>{if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(roomDrawing&&activePointers.size===1){const point=screenToGround(e.clientX,e.clientY);if(point){roomDrawEnd={x:Math.floor(point.x),z:Math.floor(point.z)};updateRoomDrawPreview();}return;}if(mode==="build"&&activePointers.size<2)updatePlacementPreview(e.clientX,e.clientY);if(activePointers.size>=2){const pts=[...activePointers.values()];const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance>0)desiredOrthoHeight=Math.max(8,Math.min(42,pinchHeight*pinchDistance/Math.max(1,distance)));dragged=true;return;}if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;if(Math.hypot(dx,dy)>8)dragged=true;if(dragged){const scale=camera.camera!.orthoHeight/Math.max(220,canvas.clientHeight),shiftX=-dx*scale*.7,shiftZ=dy*scale*.7;const halfHeight=desiredOrthoHeight*.5,halfWidth=halfHeight*(canvas.clientWidth/Math.max(1,canvas.clientHeight));const maxPanX=Math.max(0,HALF_X+4-halfWidth*.62),maxPanZ=Math.max(0,HALF_Z+4-halfHeight*.62);cameraGoal.set(Math.max(-maxPanX,Math.min(maxPanX,pointerStart.tx+shiftX)),0,Math.max(-maxPanZ,Math.min(maxPanZ,pointerStart.tz+shiftZ)));}});
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
   placed.push(item);drawPlaced(item);createLawnGrass();if(missionPhase===0&&selected==="treatment")setMissionPhase(1);else if(missionPhase===2&&selected==="reception")setMissionPhase(3);else if(missionPhase===4&&selected==="assessment")setMissionPhase(5);save();status.textContent=result.message+" يمكنك إضافة الأجهزة والأثاث من المتجر.";return;
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
  placed.push(item);drawPlaced(item);if(isRoomKind(item.kind))createLawnGrass();else if(item.kind==="asset")updateMissionEquipment();save();updatePlacementPreview(e.clientX,e.clientY);status.textContent=isRoomKind(item.kind)?"تم بناء الغرفة. أضف الأجهزة والأثاث المناسبين.":"تمت إضافة العنصر إلى العيادة.";return;
 }
 const start=avatar.getLocalPosition().clone(),tx=ground.x,tz=ground.z;
 destination=new Vec3(tx,0,tz);
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
 target=new Vec3(first.x,0,first.z);
 setLocomotion(true);
 status.textContent="الأخصائي يلتف حول العائق ويتجه إلى النقطة المحددة.";
});
canvas.addEventListener("pointercancel",e=>{activePointers.delete(e.pointerId);pointerStart=null;pinchDistance=0;dragged=false;roomDrawing=false;roomDrawStart=null;roomDrawEnd=null;placementPreview.enabled=false;});

managementToggle.addEventListener("click",()=>{
 managementPanel.hidden=!managementPanel.hidden;
 if(!managementPanel.hidden){buildPanel.hidden=true;updateMode("move");renderManagement();}
});
el<HTMLButtonElement>("#management-close").addEventListener("click",()=>{managementPanel.hidden=true;});
el("#patient-queue").addEventListener("click",event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>("[data-register-patient]");
 if(!button)return;
 const result=registerPatient(management,Number(button.dataset.registerPatient));
 status.textContent=result.message;renderManagement();save();
});
document.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach(button=>button.addEventListener("click",()=>{
 const speed=Number(button.dataset.speed) as 0|1|2|3;setSimulationSpeed(management,speed);renderManagement();save();
}));
el<HTMLButtonElement>("#buy-receptionist").addEventListener("click",()=>{
 const result=hireReceptionist(management);coins=management.balance;coinsLabel.textContent=String(coins);status.textContent=result.message;renderManagement();save();
});
el<HTMLButtonElement>("#clinic-open-toggle").addEventListener("click",()=>{
 if(!management.clinicOpen){
  const missing:string[]=[];if(!hasAssetInRoom("pt-treatment-table","treatment"))missing.push("سرير العلاج");if(!hasAssetInRoom("pt-exam-table","assessment"))missing.push("سرير الفحص");
  if(missing.length){status.textContent="لا يمكن فتح العيادة بعد. جهّز: "+missing.join("، ")+" داخل الغرف المناسبة.";return;}
 }
 const result=setClinicOpen(management,!management.clinicOpen);
 status.textContent=result.message;
 if(result.ok&&management.clinicOpen&&missionPhase===6)setMissionPhase(7);
 renderManagement();save();
});
function selectBuild(kind:BuildKind){selected=kind;selectedAssetKey=null;previewValidity=null;document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.classList.toggle("selected",b.dataset.build===kind));document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.classList.remove("selected"));const names:Record<BuildKind,string>={treatment:"غرفة علاج",reception:"استقبال",assessment:"غرفة تقييم",gym:"صالة تأهيل",chair:"كرسي انتظار",plant:"نبات داخلي",cabinet:"خزانة أدوات",parallel:"متوازي",bike:"دراجة علاجية",treadmill:"سير مشي",wallbars:"سلم حائطي",lamp:"مصباح",rug:"سجادة",wall:"مقطع حائط",door:"باب",asset:"أصل ثلاثي الأبعاد"};el("#build-hint").textContent=isRoomKind(kind)?"تم اختيار "+names[kind]+". اسحب بإصبعك على الأرض لرسم مساحة الغرفة بالحجم الذي تريده.":"تم اختيار "+names[kind]+". المس خلية فارغة لوضع العنصر، ويمكنك تدوير الحائط من زر التدوير.";}
function selectAsset(key:string){
 const spec=storeAssetSpecs[key];if(!spec)return;
 selected="asset";selectedAssetKey=key;previewValidity=null;
 document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.classList.remove("selected"));
 document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.classList.toggle("selected",b.dataset.asset===key));
 document.querySelectorAll<HTMLButtonElement>("[data-store-cat]").forEach(b=>b.classList.toggle("selected",b.dataset.asset===key));
 el("#store-preview").hidden=false;
 el("#store-preview-name").textContent=spec.label;
 el("#store-preview-detail").textContent="نحمّل النموذج الحقيقي للمعاينة ثلاثية الأبعاد…";
 el<HTMLButtonElement>("#store-place-selected").disabled=true;
 document.body.classList.add("store-previewing");
 showStorePreview(key);
 status.textContent="معاينة "+spec.label+" من النموذج ثلاثي الأبعاد الأصلي قبل الشراء.";
}
function beginPlacingSelectedAsset(){
 if(!selectedAssetKey)return;
 const spec=storeAssetSpecs[selectedAssetKey];
 storePanel.hidden=true;buildPanel.hidden=true;
 clearStorePreview();document.body.classList.remove("store-previewing");
 focus=false;cameraGoal.set(0,0,0);desiredOrthoHeight=15.5;viewBtn.classList.remove("active");
 storeBtn.classList.add("active");
 status.textContent="تم اختيار "+spec.label+". حرّك المؤشر إلى داخل الغرفة ثم المس لتأكيد الشراء ووضع الجهاز.";
}
moveBtn.addEventListener("click",()=>{storePanel.hidden=true;updateMode("move");storeBtn.classList.remove("active");});
buildBtn.addEventListener("click",()=>{storePanel.hidden=true;updateMode(mode==="build"?"move":"build");storeBtn.classList.remove("active");});
el("#cancel-build").addEventListener("click",()=>{storePanel.hidden=true;updateMode("move");storeBtn.classList.remove("active");});
storeBtn.addEventListener("click",()=>{
 clearStorePreview();document.body.classList.remove("store-previewing");el("#store-preview").hidden=true;
 focus=false;cameraGoal.set(0,0,0);desiredOrthoHeight=15.5;viewBtn.classList.remove("active");
 updateMode("build");buildPanel.hidden=true;storePanel.hidden=false;
 el("#store-coins").textContent=String(coins);
 document.querySelectorAll<HTMLButtonElement>("[data-store-category]").forEach(b=>b.classList.toggle("active",b.dataset.storeCategory==="therapy"));
 document.querySelectorAll<HTMLButtonElement>("[data-store-cat]").forEach(b=>(b as HTMLButtonElement).hidden=b.dataset.storeCat!=="therapy");
 storeBtn.classList.add("active");
 status.textContent="متجر العيادة: اختر الجهاز المناسب، ثم ضعه داخل غرفة مبنية.";
});
el<HTMLButtonElement>("#store-close").addEventListener("click",()=>{storePanel.hidden=true;clearStorePreview();document.body.classList.remove("store-previewing");focus=false;cameraGoal.set(0,0,0);desiredOrthoHeight=15.5;viewBtn.classList.remove("active");updateMode("move");storeBtn.classList.remove("active");});
el<HTMLButtonElement>("#store-place-selected").addEventListener("click",beginPlacingSelectedAsset);
document.querySelectorAll<HTMLButtonElement>("[data-store-category]").forEach(b=>b.addEventListener("click",()=>{
 document.querySelectorAll<HTMLButtonElement>("[data-store-category]").forEach(x=>x.classList.toggle("active",x===b));
 document.querySelectorAll<HTMLButtonElement>("[data-store-cat]").forEach(x=>x.hidden=x.dataset.storeCat!==b.dataset.storeCategory);
}));
document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.addEventListener("click",()=>selectBuild(b.dataset.build as BuildKind)));
document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.addEventListener("click",()=>selectAsset(b.dataset.asset??"")));
document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-category]").forEach(x=>x.classList.toggle("active",x===b));const cat=b.dataset.category;el("#catalog-structure").hidden=cat!=="structure";el("#catalog-rooms").hidden=cat!=="rooms";if(cat==="structure")selectBuild("wall");else selectBuild("treatment");}));
el<HTMLButtonElement>("#rotate-wall").addEventListener("click",()=>{wallRotation=wallRotation===0?90:0;previewValidity=null;status.textContent="اتجاه العنصر الآن "+(wallRotation===0?"0°":"90°")+". سيتم تطبيقه على القطعة التالية.";});
viewBtn.addEventListener("click",()=>{focus=!focus;cameraGoal.set(0,0,0);desiredOrthoHeight=focus?7.2:(canvas.clientWidth/Math.max(1,canvas.clientHeight)<.48?15.5:14.8);viewBtn.classList.toggle("active",focus);el("#camera-hint").classList.toggle("hide",focus);});
const zoomCamera=(factor:number)=>{desiredOrthoHeight=Math.max(8,Math.min(42,desiredOrthoHeight*factor));focus=false;viewBtn.classList.remove("active");};
el<HTMLButtonElement>("#camera-zoom-in").addEventListener("click",()=>zoomCamera(.82));
el<HTMLButtonElement>("#camera-zoom-out").addEventListener("click",()=>zoomCamera(1.22));
el<HTMLButtonElement>("#camera-reset").addEventListener("click",()=>{
 focus=false;cameraGoal.set(0,0,0);
 const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
 desiredOrthoHeight=aspect<.9?Math.max(D+3,(W+2)/aspect):aspect<1.2?22:16.5;
 viewBtn.classList.remove("active");el("#camera-hint").classList.remove("hide");
});
canvas.addEventListener("wheel",event=>{event.preventDefault();zoomCamera(event.deltaY<0?.9:1.11);},{passive:false});

let sessionStep=0,sessionScore=0,activeSessionPatientId=0,sessionCompleted=false;
let sessionPending=false;
const patientBriefs:Record<"pain"|"mobility"|"post_op"|"sports",string>={
 pain:"يشكو من ألم يؤثر في نشاطه اليومي. استكشف بداية المشكلة ومكانها وسلوكها والأعراض المصاحبة.",
 mobility:"يواجه صعوبة في المشي والتنقل. افهم متى تظهر الصعوبة وما الأنشطة التي أصبحت محدودة.",
 post_op:"في مرحلة إعادة التأهيل بعد تدخل جراحي. راجع نوع الإجراء والقيود والاحتياطات الموثقة قبل الفحص.",
 sports:"يعاني من إصابة مرتبطة بالنشاط الرياضي. استكشف آلية الإصابة والأعراض والقدرة الوظيفية قبل اختيار الفحص."
};
const steps=[
 {title:"استقبال المريض",intro:"ابدأ كل لقاء بفهم احتياجات المريض والتحقق من السلامة قبل اختيار أي فحص أو تدخل.",question:"ما أول خطوة مناسبة؟",options:[["safe","التحقق من علامات الخطر وأخذ التاريخ المرضي",true,"اختيار ممتاز. سلامة المريض وجمع المعلومات يسبقان أي تدخل."],["exercise","بدء التمارين مباشرة",false,"لا تبدأ التدخل قبل فهم الحالة والتحقق من علامات الخطر."],["diagnosis","تحديد التشخيص النهائي فوراً",false,"المعلومات الحالية لا تكفي لتشخيص نهائي. ابدأ بالتقييم."]]},
 {title:"التاريخ المرضي",intro:"اجمع تفاصيل المشكلة الحالية وتأثيرها على الحركة والأنشطة اليومية، بما يناسب حالة المريض.",question:"أي مجموعة أسئلة تساعدك أكثر؟",options:[["history","بداية المشكلة وطبيعتها وسلوكها والأعراض المصاحبة وتأثيرها الوظيفي",true,"صحيح. التاريخ المرضي يوضح المشكلة وسياقها ويساعد على توجيه الفحص."],["onlypain","التركيز على عرض واحد دون بقية القصة",false,"معلومة واحدة لا تكفي لفهم المشكلة أو تأثيرها الوظيفي."],["skip","تجاوز الأسئلة والانتقال للعلاج",false,"التاريخ المرضي جزء أساسي من التقييم."]]},
 {title:"الفحص السريري",intro:"بعد فهم القصة والتحقق من الأمان، اختر فحوصات تناسب المشكلة والقيود الفردية للمريض.",question:"ما التصرف الأفضل؟",options:[["exam","اختيار فحوصات مرتبطة بالفرضيات السريرية وبموافقة المريض",true,"ممتاز. اختر فحوصات موجهة وآمنة بناءً على المعلومات."],["random","إجراء كل الاختبارات بلا ترتيب",false,"الفحص العشوائي يرهق المريض ولا يحسن القرار."],["force","إجبار المريض على حركة مؤلمة",false,"الفحص يجب أن يكون آمناً ومناسباً لتحمل المريض."]]},
 {title:"خطة العلاج",intro:"لديك الآن معلومات أولية. ضع خطة مشتركة مع المريض وقابلة للقياس.",question:"أي خطة أفضل؟",options:[["plan","أهداف وظيفية واقعية وتدخل مناسب وتثقيف المريض",true,"صحيح. الخطة تتمحور حول وظيفة المريض واحتياجاته."],["passive","اعتماد جهاز علاجي فقط دون أهداف",false,"الخطة تحتاج أهدافاً واضحة ومشاركة نشطة من المريض."],["same","تطبيق نفس الخطة على كل المرضى",false,"العلاج يجب أن يُفصّل حسب تقييم كل حالة."]]},
 {title:"إعادة التقييم",intro:"انتهت الجلسة الأولى. كيف تعرف إن كانت خطتك مفيدة؟",question:"ما الخطوة الأخيرة؟",options:[["retest","إعادة قياس المؤشرات ومراجعة الأهداف وتعديل الخطة",true,"رائع. إعادة التقييم تربط التدخل بالنتيجة وتوجه الخطوة التالية."],["finish","إنهاء الجلسة دون قياس",false,"لا يمكن معرفة الاستجابة دون إعادة تقييم."],["repeat","تكرار التدخل نفسه مهما كانت الاستجابة",false,"القرار السريري يتغير وفق استجابة المريض."]]}
];
function renderStep(){const s=steps[sessionStep];el("#session-step").textContent="الجلسة التعليمية · "+(sessionStep+1)+" من 5";el("#session-title").textContent=s.title;el("#session-intro").textContent=s.intro;el("#session-question").textContent=s.question;el("#session-feedback").textContent="اختر إجابتك لتحصل على تغذية راجعة.";el<HTMLButtonElement>("#session-next").disabled=true;el("#session-next").textContent=sessionStep===4?"إنهاء الجلسة":"التالي";el("#session-options").innerHTML=s.options.map(o=>'<button type="button" data-session-choice="'+o[0]+'">'+o[1]+"</button>").join("");document.querySelectorAll<HTMLButtonElement>("[data-session-choice]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-session-choice]").forEach(x=>{(x as HTMLButtonElement).disabled=true;});b.classList.add("chosen");const option=s.options.find(o=>o[0]===b.dataset.sessionChoice)!;if(option[2])sessionScore++;el("#session-feedback").textContent=option[3] as string;el<HTMLButtonElement>("#session-next").disabled=false;}));}
sessionBtn.addEventListener("click",()=>{
 if(!management.clinicOpen){status.textContent="أكمل بناء الاستقبال وغرفة التقييم والعلاج وتجهيز المعدات، ثم افتح العيادة.";return;}
 const started=beginPatientSession(management);
 if(!started.ok){status.textContent=started.message;return;}
 const activePatient=started.patient!;activeSessionPatientId=activePatient.id;sessionCompleted=false;el("#patient-brief").innerHTML="<b>"+activePatient.name+" · "+activePatient.caseLabel+"</b><span>"+patientBriefs[activePatient.need]+"</span>";renderManagement();save();
 sessionStep=0;sessionScore=0;focus=true;cameraGoal.set(0,0,2.0);desiredOrthoHeight=8.5;viewBtn.classList.add("active");renderStep();
 const assessmentRoom=management.rooms.find(r=>r.type==="assessment")!;const patientGoal=patientGoalFor(assessmentRoom,"assessment");sessionPending=moveAvatarTo(patientGoal.x+.65,patientGoal.z-.1);
 if(sessionPending){status.textContent="الأخصائي يتجه إلى المريض. ستبدأ الجلسة بعد الوصول إلى موضع آمن بجانبه.";}
 else{cancelPatientSession(management,activeSessionPatientId);renderManagement();focus=false;cameraGoal.set(0,0,0);viewBtn.classList.remove("active");status.textContent="لا يوجد مسار آمن إلى المريض. أعد ترتيب الأثاث وحاول مجدداً.";}
});
sessionDialog.addEventListener("close",()=>{if(!sessionCompleted&&activeSessionPatientId)cancelPatientSession(management,activeSessionPatientId);sessionCompleted=false;renderManagement();save();focus=false;cameraGoal.set(0,0,0);desiredOrthoHeight=15.5;viewBtn.classList.remove("active");});
el<HTMLButtonElement>("#session-next").addEventListener("click",()=>{if(sessionCompleted){sessionDialog.close();return;}if(sessionStep<4){sessionStep++;renderStep();}else{const earned=completePatientSession(management,activeSessionPatientId,sessionScore);sessionCompleted=true;xp=management.experience;coins=management.balance;coinsLabel.textContent=String(coins);el("#experience").textContent=xp+" XP";el("#experience-text").textContent="أكملت جلستك بنتيجة "+sessionScore+" من 5. استمر في تطوير مهاراتك.";el("#session-title").textContent="أحسنت! انتهت الجلسة";el("#session-step").textContent="ملخص الجلسة التعليمية";el("#session-intro").textContent="هذه محاكاة تعليمية وليست تقييماً سريرياً حقيقياً.";el("#patient-brief").innerHTML="<b>نتيجتك: "+sessionScore+" / 5</b><span>عملات مكتسبة: "+earned+"</span><span>خبرة مكتسبة: "+(sessionScore*10)+" XP</span>";el("#session-question").textContent="تذكّر: سلامة المريض والتفكير المنظم وإعادة التقييم أساس الممارسة.";el("#session-options").innerHTML="";el("#session-feedback").textContent="يمكنك العودة إلى عيادتك وتطويرها.";el<HTMLButtonElement>("#session-next").disabled=false;el("#session-next").textContent="العودة إلى العيادة";renderManagement();renderMission();save();}});
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
 destination=new Vec3(tx,0,tz);
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
 target=new Vec3(first.x,0,first.z);setLocomotion(true);return true;
}
el<HTMLButtonElement>("#start-tour").addEventListener("click",()=>{
 if(missionPhase===0||missionPhase===2||missionPhase===4){
  storePanel.hidden=true;managementPanel.hidden=true;buildPanel.hidden=false;updateMode("build");
  selectBuild(missionPhase===0?"treatment":missionPhase===2?"reception":"assessment");
  status.textContent="اسحب بإصبعك على أرض العيادة لرسم الغرفة، ثم ارفع إصبعك لتأكيد البناء.";
 }else if(missionPhase===1||missionPhase===3||missionPhase===5){
  storeBtn.click();
  if(missionPhase===3)el<HTMLButtonElement>('[data-store-category="furnishing"]').click();
  else if(missionPhase===5)el<HTMLButtonElement>('[data-store-category="assessment"]').click();
  status.textContent="اختر الجهاز المناسب، ثم المس موضعه داخل الغرفة لإتمام الشراء.";
 }else if(missionPhase===6||missionPhase===7){
  managementPanel.hidden=false;storePanel.hidden=true;buildPanel.hidden=true;updateMode("move");renderManagement();
  status.textContent=missionPhase===6?"راجع متطلبات التشغيل ثم افتح العيادة.":"تابع المرضى ووسّع عيادتك.";
 }
});
el<HTMLButtonElement>("#skip-tour").addEventListener("click",()=>setMissionPhase(7));
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
 receptionistFallbackRig?.update(frameDt,false);
 // Smooth camera follow/pan/zoom instead of snapping the camera on every touch event.
 const cameraAlpha=1-Math.exp(-frameDt*11);
 cameraTarget.x+=(cameraGoal.x-cameraTarget.x)*cameraAlpha;
 cameraTarget.z+=(cameraGoal.z-cameraTarget.z)*cameraAlpha;
 camera.camera!.orthoHeight+=(desiredOrthoHeight-camera.camera!.orthoHeight)*cameraAlpha;
 camera.setPosition(cameraTarget.x+(focus?2.0:3.5),focus?16:21.5,cameraTarget.z+(focus?-8.0:-15));
 camera.lookAt(cameraTarget);
 const standingPosition=avatar.getLocalPosition();
 if(avatarContactShadow)avatarContactShadow.setLocalPosition(standingPosition.x,.052,standingPosition.z);
 if(!target){if(sessionPending){sessionPending=false;sessionDialog.showModal();}return;}
 const p=avatar.getLocalPosition().clone(),dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
 if(d<.10){
  if(walkPath.length){const next=walkPath.shift()!;target=new Vec3(next.x,0,next.z);}
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
    const next=walkPath.shift()!;target=new Vec3(next.x,0,next.z);
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
