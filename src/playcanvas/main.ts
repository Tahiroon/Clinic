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
 desiredOrthoHeight=aspect<.9?16.5:aspect<1.2?15:13.5;
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
// A restrained ambient fill preserves form and lets the soft directional shadows read clearly.
app.scene.ambientLight=new Color(.62,.66,.69);
function material(c:Color){const m=new StandardMaterial();m.diffuse=c;m.shininess=8;m.metalness=0;m.update();return m;}
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
camera.setPosition(2.4,17.0,-11.5);camera.lookAt(cameraTarget);app.root.addChild(camera);
let desiredOrthoHeight=14.5;
const light=new Entity("Soft daylight");
light.addComponent("light",{type:"directional",intensity:1.16,castShadows:highDetailDevice});
if(highDetailDevice){
 light.light!.shadowType=SHADOW_PCSS_32F;
 light.light!.shadowResolution=2048;
 light.light!.shadowDistance=38;
 light.light!.shadowIntensity=.60;
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
const pathMat=material(new Color(.68,.62,.50));
const pathEdge=material(new Color(.39,.43,.40));
const trim=material(new Color(.12,.36,.39));
const roofAccent=material(new Color(.47,.24,.17));
const lawnBase=material(new Color(.29,.43,.31));
const lawnPatchMaterial=material(new Color(.34,.48,.33));
const worldStone=material(new Color(.63,.59,.50));
const worldPlaster=material(new Color(.78,.70,.57));
const worldRoof=material(new Color(.48,.27,.20));
const worldRoad=material(new Color(.24,.28,.29));
const worldRoadLine=material(new Color(.86,.78,.57));
const worldWindow=material(new Color(.30,.48,.50));
const worldTreeA=material(new Color(.23,.43,.29));
const worldTreeB=material(new Color(.31,.50,.32));
const worldTreeC=material(new Color(.40,.54,.34));
const worldWarmGlass=material(new Color(.96,.76,.40));
// Compact surroundings: a small arrival court frames the clinic without a huge empty lawn or perimeter fence.
const district=new Entity("Small clinic surroundings");world.addChild(district);district.setLocalScale(.36,1,.36);district.setLocalPosition(0,0,-8);
box("Small outer landscape",0,-.34,0,34,.48,42,lawnBase,district);
box("Arrival road",0,-.035,-17,34,.10,4.8,worldRoad,district);
box("Arrival road curb north",0,.025,-14.45,34,.12,.28,worldStone,district);
box("Arrival road curb south",0,.025,-19.55,34,.12,.28,worldStone,district);
for(let x=-15;x<=15;x+=5)box("Road dash",x,.025,-17,2.0,.018,.09,worldRoadLine,district);
box("Clinic pedestrian approach",0,.025,-12.8,4.2,.10,4.4,pathMat,district);
box("Approach path border left",-2.18,.09,-12.8,.14,.18,4.4,worldStone,district);
box("Approach path border right",2.18,.09,-12.8,.14,.18,4.4,worldStone,district);
const outerTreeTrunk=material(new Color(.35,.23,.16));
for(const [x,z,s] of [[-14,-12,1.0],[14,-12,.92],[-16,5,.85],[16,8,.9]] as [number,number,number][]){
 cylinder("Neighbourhood tree trunk",x,.62*s,z,.15*s,1.24*s,.15*s,outerTreeTrunk,district);
 const crown=sphere("Soft sculpted tree crown",x,1.75*s,z,.78*s,worldTreeB,district);crown.setLocalScale(1.12,.96,1.05);
 const crown2=sphere("Tree crown highlight",x+.30*s,1.95*s,z-.12*s,.48*s,worldTreeC,district);crown2.setLocalScale(1.08,.9,1);
}
for(const [x,z] of [[-10,-8],[10,-7]] as [number,number][]){
 const bed=box("Small planted island",x,.02,z,2.5,.10,1.4,worldStone,district);
 bed.setLocalEulerAngles(0,x>0?8:-8,0);
 for(let i=0;i<3;i++){const shrub=sphere("Rounded shrub cluster",x+(i-1)*.55,.32,z,.34, i===1?worldTreeC:worldTreeA,district);shrub.setLocalScale(1.15,.78,1);}
}
const clinicTimber=material(new Color(.34,.23,.16));\nconst gaitLaneX=4.2,gaitLaneZ=-17.8;
box("Clinic identity sign post",-3.1,.95,-11.6,.14,1.9,.14,clinicTimber,district);
box("Clinic identity sign", -3.1,1.82,-11.6,1.25,.72,.10,trim,district);
box("Clinic identity sign inset",-3.1,1.82,-11.67,1.05,.48,.025,M.white,district);
const clinicSignAccent=box("Clinic identity accent",-3.1,1.82,-11.70,.12,.28,.025,M.teal,district);
box("Clinic buildable foundation",0,-.015,0,W,.08,D,lawnBase,world);
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
 const root=new Entity("Clay human fallback · "+kind);parent.addChild(root);
 const skinTone=material(kind==="patient"?new Color(.58,.36,.25):new Color(.70,.49,.36));
 const hairTone=material(new Color(.16,.12,.10));
 const shirt=kind==="physiotherapist"?material(new Color(.91,.89,.79)):kind==="receptionist"?material(new Color(.08,.43,.46)):material(new Color(.76,.78,.69));
 const trousers=kind==="physiotherapist"?material(new Color(.16,.27,.43)):kind==="receptionist"?material(new Color(.13,.17,.22)):material(new Color(.25,.38,.37));
 const shoeMat=material(new Color(.12,.13,.14)),eyeMat=material(new Color(.10,.075,.06)),whiteMat=material(new Color(.94,.91,.83));
 const torso=new Entity("Soft torso pivot");root.addChild(torso);torso.setLocalPosition(0,1.02,0);
 primitive("Rounded human torso","capsule",0,0,0,.235,.34,.17,shirt,torso);
 primitive("Human pelvis","capsule",0,-.34,0,.19,.16,.15,trousers,torso);
 primitive("Neck","capsule",0,.37,0,.075,.11,.075,skinTone,torso);
 const head=new Entity("Human head and face");torso.addChild(head);head.setLocalPosition(0,.57,.015);
 const face=sphere("Natural head shape",0,0,0,.145,skinTone,head);face.setLocalScale(.90,1.12,.94);
 const hair=sphere("Rounded hair cap",0,.075,-.035,.145,hairTone,head);hair.setLocalScale(1.02,.66,1.02);
 for(const x of [-.055,.055]){sphere("Eye white",x,.018,.124,.024,whiteMat,head).setLocalScale(1,.72,.45);sphere("Eye pupil",x,.018,.137,.011,eyeMat,head);sphere("Ear",x*2.25,-.012,0,.032,skinTone,head).setLocalScale(.55,1,.72);}
 primitive("Small nose","capsule",0,-.018,.139,.018,.035,.018,skinTone,head);
 box("Subtle mouth",0,-.062,.129,.045,.009,.012,eyeMat,head);
 const legPivots:Entity[]=[];
 for(const x of [-.105,.105]){
  const hip=new Entity("Hip joint");torso.addChild(hip);hip.setLocalPosition(x,-.40,0);
  primitive("Rounded upper leg","capsule",0,-.18,0,.095,.22,.10,trousers,hip);
  const knee=new Entity("Knee joint");hip.addChild(knee);knee.setLocalPosition(0,-.34,0);
  sphere("Knee form",0,0,0,.075,trousers,knee);
  primitive("Rounded lower leg","capsule",0,-.16,0,.075,.20,.08,trousers,knee);
  primitive("Human shoe","capsule",0,-.30,.075,.085,.055,.15,shoeMat,knee);
  legPivots.push(hip);
 }
 const armPivots:Entity[]=[];
 for(const x of [-.245,.245]){
  const shoulder=new Entity("Shoulder joint");torso.addChild(shoulder);shoulder.setLocalPosition(x,.22,0);
  sphere("Rounded shoulder",0,0,0,.105,shirt,shoulder);
  primitive("Upper arm","capsule",0,-.16,0,.075,.19,.075,shirt,shoulder);
  const elbow=new Entity("Elbow joint");shoulder.addChild(elbow);elbow.setLocalPosition(0,-.31,.005);
  sphere("Elbow form",0,0,0,.068,shirt,elbow);
  primitive("Forearm","capsule",0,-.13,.005,.062,.16,.062,shirt,elbow);
  sphere("Human hand",0,-.29,.025,.067,skinTone,elbow);
  armPivots.push(shoulder);
 }
 if(kind==="physiotherapist"){box("Soft ID badge",.13,.12,.151,.075,.105,.018,trim,torso);box("Badge detail",.13,.14,.163,.036,.012,.009,M.white,torso);}
 else if(kind==="receptionist")box("Name badge",.13,.12,.151,.075,.105,.018,M.yellow,torso);
 let phase=0;
 return {entity:root,update:(dt,moving)=>{
  phase+=dt*(moving?7.0:1.5);
  const swing=moving?Math.sin(phase)*24:0;
  legPivots[0].setLocalEulerAngles(swing,0,0);legPivots[1].setLocalEulerAngles(-swing,0,0);
  armPivots[0].setLocalEulerAngles(-swing*.62,0,0);armPivots[1].setLocalEulerAngles(swing*.62,0,0);
  torso.setLocalPosition(0,1.02+(moving?Math.abs(Math.sin(phase*2))*.018:Math.sin(phase)*.008),0);
  torso.setLocalEulerAngles(moving?2.5:Math.sin(phase)*.7,0,0);
  head.setLocalEulerAngles(0,Math.sin(phase*.55)*2,0);
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
let patientVisualId=0,patientVisualStage="",patientTarget:Vec3|null=null,patientStepTarget:Vec3|null=null,patientWalkPath:{x:number;z:number}[]=[],patientWalkVelocity=0;
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
let missionPhase=(()=>{try{const saved=Number(localStorage.getItem("therason-clinic-mission-v5")??6);return Math.max(0,Math.min(7,saved));}catch{return 6;}})();

let placed:Placed[]=[];let walkPath:{x:number;z:number}[]=[];let destination:Vec3|null=null;const saveKey="therason-clinic-world-v14";
const managementSaveKey="therason-clinic-management-v6";
const TRIAL_ACCOUNT_COINS=3200; 
const starterLayout:Placed[]=[\n {id:1,kind:"reception",gx:-6,gz:-7,width:5,depth:5},{id:2,kind:"assessment",gx:1,gz:-7,width:4,depth:5},\n {id:3,kind:"treatment",gx:-6,gz:1,width:5,depth:5},{id:4,kind:"gym",gx:1,gz:1,width:5,depth:5},\n {id:5,kind:"asset",gx:-5,gz:-6,assetKey:"pt-reception-desk"},{id:6,kind:"asset",gx:-5,gz:-4,assetKey:"pt-waiting-bench"},\n {id:7,kind:"asset",gx:1,gz:-6,assetKey:"pt-exam-table"},{id:8,kind:"asset",gx:3,gz:-4,assetKey:"pt-patient-chair"},\n {id:9,kind:"asset",gx:-5,gz:2,assetKey:"pt-treatment-table"},{id:10,kind:"asset",gx:1,gz:2,assetKey:"pt-parallel-bars"}\n];
const costs:Record<BuildKind,number>={treatment:720,reception:420,assessment:620,gym:980,chair:20,plant:15,cabinet:30,parallel:80,bike:100,treadmill:120,wallbars:70,lamp:15,rug:25,wall:8,door:22,asset:0};
type StoreCategory="therapy"|"assessment"|"mobility"|"furnishing"|"safety"|"decor"|"specialty"|"kits";
type StoreAssetSpec={file:string;node:string;label:string;cost:number;footprint:number;targetSize:number;category:StoreCategory;description:string;room:string};
const storeAssetSpecs:Record<string,StoreAssetSpec>={
 "pt-treatment-table":{file:"examination-couch.glb",node:"*",label:"سرير علاج طبيعي",cost:90,footprint:2,targetSize:2.3,category:"therapy",description:"سرير جلسات فردية مع مساحة وصول من الجانبين.",room:"غرفة العلاج"},
 "pt-exam-table":{file:"examination-couch.glb",node:"*",label:"سرير فحص سريري",cost:95,footprint:2,targetSize:2.3,category:"assessment",description:"لفحص المدى الحركي والقوة والوظيفة.",room:"غرفة التقييم"},
 "pt-patient-chair":{file:"doctors-office-set.glb",node:"Chair_Patient",label:"كرسي المريض",cost:45,footprint:1,targetSize:.9,category:"assessment",description:"مقعد للمقابلة وأخذ التاريخ المرضي.",room:"غرفة التقييم"},
 "pt-doctor-desk":{file:"doctors-office-set.glb",node:"Desk_Doctor",label:"مكتب الأخصائي",cost:65,footprint:2,targetSize:1.35,category:"furnishing",description:"مساحة عمل لتوثيق الجلسات وتنظيم الملفات.",room:"غرفة التقييم أو الإدارة"},
 "pt-privacy-screen":{file:"privacy-screen.glb",node:"*",label:"حاجز خصوصية طبي",cost:60,footprint:2,targetSize:1.8,category:"furnishing",description:"فاصل بصري متحرك بين مساحات الفحص والعلاج.",room:"غرفة العلاج أو التقييم"},
 "pt-clinical-sink":{file:"doctors-office-set.glb",node:"Sink_Cabinet",label:"حوض غسل طبي",cost:50,footprint:1,targetSize:.95,category:"safety",description:"نقطة غسل يدين ونظافة سريرية.",room:"غرفة العلاج أو التقييم"},
 "pt-wall-chart":{file:"doctors-office-set.glb",node:"Wall_Chart",label:"لوحة فحص سريري",cost:25,footprint:1,targetSize:.85,category:"assessment",description:"لوحة مرجعية للفحص والتثقيف.",room:"غرفة التقييم"},
 "pt-parallel-bars":{file:"physical-therapy-room-set.glb",node:"ParallelBars",label:"جهاز المتوازي",cost:100,footprint:3,targetSize:2.8,category:"therapy",description:"تدريب الاتزان وتحميل الوزن وإعادة تعليم المشي.",room:"صالة التأهيل"},
 "pt-band-rack":{file:"physical-therapy-room-set.glb",node:"BandRack",label:"حامل أحزمة المقاومة",cost:35,footprint:2,targetSize:1.5,category:"therapy",description:"تنظيم أحزمة المقاومة بمستوياتها المختلفة.",room:"صالة التأهيل"},
 "pt-exercise-ball":{file:"physical-therapy-room-set.glb",node:"ExerciseBall",label:"كرة علاجية",cost:20,footprint:1,targetSize:.72,category:"therapy",description:"تمارين الثبات والتحكم بالجذع.",room:"صالة التأهيل"},
 "pt-exercise-mat":{file:"physical-therapy-room-set.glb",node:"ExerciseMat",label:"بساط تمارين",cost:25,footprint:2,targetSize:2.2,category:"therapy",description:"تمارين أرضية وإطالة وتدريب وظيفي.",room:"صالة التأهيل"},
 "pt-hand-weights":{file:"physical-therapy-room-set.glb",node:"HandWeights",label:"أوزان علاجية",cost:30,footprint:2,targetSize:1.2,category:"therapy",description:"تدريب المقاومة وتقوية الأطراف.",room:"صالة التأهيل"},
 "pt-privacy-curtain":{file:"physical-therapy-room-set.glb",node:"PrivacyCurtain",label:"ستارة خصوصية",cost:45,footprint:3,targetSize:2.8,category:"furnishing",description:"ستارة لتقسيم المساحة العلاجية مع الحفاظ على الخصوصية.",room:"غرفة العلاج"},
 "pt-storage-cabinet":{file:"bedside-cabinet.glb",node:"*",label:"خزانة أدوات",cost:40,footprint:1,targetSize:.85,category:"furnishing",description:"تخزين الأدوات والمستهلكات الصغيرة.",room:"أي غرفة"},
 "pt-reception-desk":{file:"reception-desk.glb",node:"*",label:"مكتب استقبال",cost:160,footprint:3,targetSize:2.2,category:"furnishing",description:"كاونتر تسجيل وتنظيم دخول المراجعين.",room:"الاستقبال"},
 "pt-waiting-bench":{file:"waiting-bench-two-seat.glb",node:"*",label:"مقعد انتظار مزدوج",cost:65,footprint:2,targetSize:1.5,category:"furnishing",description:"مقعدين للمرضى والمرافقين في منطقة الانتظار.",room:"الاستقبال"},
 "pt-wheelchair":{file:"wheelchair.glb",node:"*",label:"كرسي متحرك",cost:75,footprint:2,targetSize:1.1,category:"mobility",description:"مساعدة التنقل للمرضى ذوي صعوبة المشي.",room:"الاستقبال أو الممر"},
 "hospital-crutches":{file:"hospital-equipment-set.glb",node:"Crutches",label:"عكازات طبية",cost:18,footprint:1,targetSize:1.35,category:"mobility",description:"تدريب المشي وتخفيف التحميل حسب الحالة.",room:"صالة التأهيل"},
 "hospital-first-aid":{file:"hospital-equipment-set.glb",node:"FirstAidBag",label:"حقيبة إسعافات أولية",cost:15,footprint:1,targetSize:.65,category:"safety",description:"حقيبة تجهيزات السلامة والإسعاف الأولي.",room:"الاستقبال أو غرفة العلاج"},
 "hospital-oxygen":{file:"hospital-equipment-set.glb",node:"OxygenTrolley",label:"عربة أكسجين",cost:55,footprint:1,targetSize:1.15,category:"safety",description:"معدات دعم تنفسي للحالات التي تتطلبها.",room:"غرفة العلاج"},
 "hospital-stretcher":{file:"hospital-equipment-set.glb",node:"Stretcher",label:"نقالة طبية",cost:75,footprint:3,targetSize:2.7,category:"mobility",description:"نقل الحالات غير القادرة على الانتقال بأمان.",room:"الممر أو مساحة النقل"},
 "hospital-transport-chair":{file:"hospital-equipment-set.glb",node:"TransportChair",label:"كرسي نقل مرضى",cost:55,footprint:2,targetSize:1.25,category:"mobility",description:"كرسي مخصص لنقل المرضى داخل المنشأة.",room:"الاستقبال أو الممر"},
 "hospital-walking-frame":{file:"hospital-equipment-set.glb",node:"WalkingFrame",label:"مشاية طبية",cost:35,footprint:2,targetSize:1.15,category:"mobility",description:"تدريب المشي ودعم الاتزان.",room:"صالة التأهيل"},
 "clinic-partition-wall":{file:"partition-wall.glb",node:"*",label:"حاجز تقسيم داخلي",cost:55,footprint:2,targetSize:1.85,category:"furnishing",description:"وحدة تقسيم معمارية لتحديد مناطق العمل.",room:"داخل الغرف"},
 "clinic-short-partition":{file:"partition-wall-1m.glb",node:"*",label:"حاجز تقسيم قصير",cost:30,footprint:1,targetSize:.9,category:"furnishing",description:"فاصل قصير للمساحات الصغيرة.",room:"داخل الغرف"},
 "clinic-door-leaf":{file:"door-leaf.glb",node:"*",label:"ضلفة باب داخلية",cost:35,footprint:1,targetSize:.9,category:"furnishing",description:"باب داخلي لتجهيز الغرف ومسارات الحركة.",room:"داخل الغرف"},
 "clinic-floor-tile":{file:"corridor-floor-tile.glb",node:"*",label:"بلاطة أرضية طبية",cost:12,footprint:1,targetSize:.9,category:"decor",description:"وحدة تشطيب أرضيات للممرات والمساحات الداخلية.",room:"الممرات والغرف"},
 "clinic-signage-pack":{file:"hospital-signage-set.glb",node:"*",label:"حزمة لافتات وإرشاد",cost:85,footprint:3,targetSize:2.25,category:"decor",description:"مجموعة لافتات تساعد على تعريف الغرف وتوجيه المرضى.",room:"الاستقبال والممرات"},
 "clinic-amenities-corner":{file:"hospital-gift-shop-set.glb",node:"*",label:"ركن خدمات ومستلزمات",cost:180,footprint:4,targetSize:3.1,category:"decor",description:"ركن خدمات إضافي يمكن تخصيصه للضيافة والمستلزمات.",room:"منطقة الخدمات"},
 "clinic-therapy-suite":{file:"physical-therapy-room-set.glb",node:"*",label:"طقم صالة علاج متكامل",cost:340,footprint:4,targetSize:3.55,category:"kits",description:"مجموعة تجهيزات علاج طبيعي من حزمة المجسمات نفسها.",room:"صالة تأهيل واسعة"},
 "clinic-waiting-suite":{file:"hospital-waiting-room.glb",node:"*",label:"طقم منطقة انتظار",cost:260,footprint:4,targetSize:3.45,category:"kits",description:"مجموعة أثاث انتظار جاهزة من نموذج الغرفة الأصلي.",room:"الاستقبال"},
 "clinic-reception-suite":{file:"hospital-reception-desk.glb",node:"*",label:"طقم استقبال متكامل",cost:240,footprint:4,targetSize:3.2,category:"kits",description:"وحدة استقبال كاملة من مجموعة المستشفى.",room:"الاستقبال"},
 "clinic-patient-room-suite":{file:"hospital-patient-room.glb",node:"*",label:"طقم غرفة مريض",cost:290,footprint:4,targetSize:3.35,category:"kits",description:"تجهيز غرفة رعاية ومتابعة للحالات التي تحتاج مساحة سريرية.",room:"غرفة مخصصة"},
 "clinic-bed-bay":{file:"hospital-bed-bay.glb",node:"*",label:"وحدة سرير رعاية",cost:220,footprint:4,targetSize:3.2,category:"specialty",description:"تجهيز سرير ومحيطه للاستخدامات السريرية المتخصصة.",room:"غرفة مخصصة"},
 "clinic-lab-suite":{file:"hospital-lab-set.glb",node:"*",label:"وحدة مختبر سريري",cost:420,footprint:4,targetSize:3.4,category:"specialty",description:"تجهيز مختبر توسعي للمنشآت متعددة التخصصات.",room:"غرفة مخصصة"},
 "clinic-imaging-suite":{file:"x-ray-room-set.glb",node:"*",label:"وحدة تصوير طبي",cost:520,footprint:4,targetSize:3.4,category:"specialty",description:"تجهيز تصوير طبي كتوسعة مستقبلية لمركز تأهيل متكامل.",room:"غرفة مخصصة"},
 "clinic-pharmacy-counter":{file:"pharmacy-counter.glb",node:"*",label:"كاونتر مستلزمات طبية",cost:190,footprint:3,targetSize:2.35,category:"specialty",description:"كاونتر لخدمات ومستلزمات المركز الطبية.",room:"منطقة الخدمات"},
 "clinic-pediatric-suite":{file:"baby-ward-set.glb",node:"*",label:"طقم توسعة تأهيل أطفال",cost:320,footprint:4,targetSize:3.3,category:"specialty",description:"تجهيز توسعة مخصصة لخدمات الأطفال داخل مركز تأهيل متعدد التخصصات.",room:"غرفة أطفال"}
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
 "corridor-floor-tile.glb":new URL("../assets/clinic-kit/management-sim/corridor-floor-tile.glb",import.meta.url).href,
 "hospital-signage-set.glb":new URL("../assets/clinic-kit/hospital/hospital-signage-set.glb",import.meta.url).href,
 "hospital-gift-shop-set.glb":new URL("../assets/clinic-kit/hospital/hospital-gift-shop-set.glb",import.meta.url).href,
 "hospital-bed-bay.glb":new URL("../assets/clinic-kit/hospital/hospital-bed-bay.glb",import.meta.url).href,
 "hospital-lab-set.glb":new URL("../assets/clinic-kit/hospital/hospital-lab-set.glb",import.meta.url).href,
 "x-ray-room-set.glb":new URL("../assets/clinic-kit/hospital/x-ray-room-set.glb",import.meta.url).href,
 "pharmacy-counter.glb":new URL("../assets/clinic-kit/hospital/pharmacy-counter.glb",import.meta.url).href,
 "baby-ward-set.glb":new URL("../assets/clinic-kit/hospital/baby-ward-set.glb",import.meta.url).href
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
let storePreviewRoot:Entity|null=null;
let storePreviewModel:Entity|null=null;
let storePreviewGeneration=0;
const storeThumbnailCache=new Map<string,string>();
let pendingStoreThumbnail:{key:string;generation:number;readyAt:number}|null=null;
const storeThumbnailCanvas=document.createElement("canvas");
storeThumbnailCanvas.width=240;storeThumbnailCanvas.height=180;
const storeThumbnailContext=storeThumbnailCanvas.getContext("2d");
app.on("postrender",()=>{
 const pending=pendingStoreThumbnail;
 if(!pending||Date.now()<pending.readyAt||pending.generation!==storePreviewGeneration||!storeThumbnailContext)return;
 pendingStoreThumbnail=null;
 try{
  const width=canvas.width,height=canvas.height;
  if(width<2||height<2)return;
  // Crop the centered product stage from the live WebGL frame, then downsample once.
  storeThumbnailContext.clearRect(0,0,240,180);
  storeThumbnailContext.drawImage(canvas,width*.12,height*.18,width*.76,height*.62,0,0,240,180);
  const image=storeThumbnailCanvas.toDataURL("image/webp",.72);
  if(image.length<1200)return;
  storeThumbnailCache.set(pending.key,image);
  const card=document.querySelector<HTMLButtonElement>('[data-asset="'+pending.key+'"]');
  const thumb=card?.querySelector<HTMLImageElement>(".store-item-thumb");
  const hint=card?.querySelector<HTMLElement>(".store-item-type");
  if(thumb){thumb.src=image;thumb.hidden=false;}if(hint)hint.hidden=true;
 }catch(error){console.warn("Store thumbnail capture unavailable",pending.key,error);}
});
function clearStorePreview(){
 storePreviewGeneration++;pendingStoreThumbnail=null;
 if(storePreviewRoot){storePreviewRoot.destroy();storePreviewRoot=null;}storePreviewModel=null;
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
  root.addChild(model);model.setLocalEulerAngles(0,32+wallRotation,0);storePreviewModel=model;root.syncHierarchy();
  let bounds=renderBounds(model);
  if(!bounds||bounds.width<.01||bounds.depth<.01||bounds.height<.01){model.destroy();throw new Error("Invalid 3D preview bounds");}
  const scale=spec.targetSize/Math.max(bounds.width,bounds.depth,.05);
  model.setLocalScale(scale,scale,scale);root.syncHierarchy();
  bounds=renderBounds(model);if(!bounds)throw new Error("3D preview has no visible meshes");
  const current=model.getPosition(),origin=root.getPosition();
  model.setPosition(current.x+origin.x-(bounds.minX+bounds.maxX)/2,current.y-bounds.minY+.245,current.z+origin.z-(bounds.minZ+bounds.maxZ)/2);
  root.syncHierarchy();
  el("#store-preview-detail").textContent=spec.description+" المكان المقترح: "+spec.room+". مساحة الحجز: "+spec.footprint+" م² تقريباً. السعر: "+spec.cost+" عملة.";
  el<HTMLButtonElement>("#store-place-selected").disabled=false;
  // Wait for the focused model to render, then capture one downsampled real frame.
  pendingStoreThumbnail={key,generation,readyAt:Date.now()+1050};
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
 if(!url){status.textContent="الأصل الحقيقي غير متاح: "+spec.label+". لم يتم وضع بديل وهمي.";return;}
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
  console.error("Clinic store asset failed",spec.label,error);
  status.textContent="تعذر تحميل الجهاز الحقيقي: "+spec.label+". لم نعرض مجسماً بديلاً مضللاً؛ تحقق من الاتصال ثم حاول مجدداً.";
 });
}

function save(){try{management.balance=coins;management.experience=xp;el("#store-coins").textContent=String(coins);localStorage.setItem(saveKey,JSON.stringify({v:14,coins,xp,placed}));localStorage.setItem(managementSaveKey,JSON.stringify(management));saveState.textContent="تم الحفظ";}catch{saveState.textContent="حفظ مؤقت";}}
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
 const useStarter=()=>{management=createInitialManagementState();coins=management.balance;xp=0;placed=starterLayout.map(p=>({...p}));nextId=1;for(const p of placed){drawPlaced(p);nextId=Math.max(nextId,p.id+1);}missionPhase=6;try{localStorage.setItem("therason-clinic-mission-v5","6");}catch{}};
 try{
  const raw=localStorage.getItem(saveKey);if(!raw){useStarter();return;}
  const v=JSON.parse(raw);if(v.v!==14||!Array.isArray(v.placed)){useStarter();return;}
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
   {x:-1.25,z:-HALF_Z,w:2.5,d:11.0}
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
  {x:-7.34,z:-HALF_Z,w:.42,d:D},
  {x:6.92,z:-HALF_Z,w:.42,d:D},
  {x:-HALF_X,z:13.91,w:W,d:.42},
  {x:-7.2,z:-14.33,w:4.95,d:.42},
  {x:2.25,z:-14.33,w:4.95,d:.42},
  {x:-2.52,z:-14.48,w:.60,d:.72},
  {x:1.92,z:-14.48,w:.60,d:.72}
 ];
 if(outdoorBarriers.some(w=>rectanglesOverlap(player,w)))return false;
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
   // Rooms begin empty. Real purchased props are checked below from the placed-item registry.\n   continue;
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
 try{localStorage.setItem("therason-clinic-mission-v5",String(next));}catch{}
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
 if(!visiblePatient){patientNpc.enabled=false;patientVisualId=0;patientVisualStage="";patientTarget=null;patientStepTarget=null;patientWalkPath=[];patientWalkVelocity=0;}
 else{
  patientNpc.enabled=true;
  if(patientVisualId!==visiblePatient.id||patientVisualStage!==visiblePatient.stage){
   patientVisualId=visiblePatient.id;patientVisualStage=visiblePatient.stage;
   const roomType=visiblePatient.stage==="reception"||visiblePatient.stage==="waiting"?"reception":visiblePatient.stage==="assessment"?"assessment":(visiblePatient.need==="mobility"||visiblePatient.need==="sports")&&management.rooms.some(r=>r.type==="exercise")?"exercise":"treatment";
   const room=management.rooms.find(r=>r.type===roomType)??management.rooms.find(r=>r.type==="treatment");
   const goal=room?patientGoalFor(room,visiblePatient.stage):new Vec3(0,0,-4.55);
   const current=patientNpc.getLocalPosition();patientNpc.enabled=false;
   if(canWalkSegment(current.x,current.z,goal.x,goal.z)){patientWalkPath=[];patientTarget=goal;patientStepTarget=goal.clone();}
   else{const route=findWalkPath(current.x,current.z,goal.x,goal.z);patientWalkPath=route?simplifyWalkRoute(route,current.x,current.z):[];patientTarget=goal;const first=patientWalkPath.shift();patientStepTarget=first?new Vec3(first.x,0,first.z):null;}
   patientWalkVelocity=0;patientNpc.enabled=true;
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
canvas.addEventListener("pointermove",e=>{if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(roomDrawing&&activePointers.size===1){const point=screenToGround(e.clientX,e.clientY);if(point){roomDrawEnd={x:Math.floor(point.x),z:Math.floor(point.z)};updateRoomDrawPreview();}return;}if(mode==="build"&&activePointers.size<2)updatePlacementPreview(e.clientX,e.clientY);if(activePointers.size>=2){const pts=[...activePointers.values()];const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance>0)desiredOrthoHeight=Math.max(8,Math.min(42,pinchHeight*pinchDistance/Math.max(1,distance)));dragged=true;return;}if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;if(Math.hypot(dx,dy)>8)dragged=true;if(dragged){const scale=camera.camera!.orthoHeight/Math.max(220,canvas.clientHeight),shiftX=-dx*scale*.7,shiftZ=dy*scale*.7;const halfHeight=desiredOrthoHeight*.5,halfWidth=halfHeight*(canvas.clientWidth/Math.max(1,canvas.clientHeight));const maxPanX=Math.max(0,HALF_X+10-halfWidth*.62),maxPanZ=Math.max(0,HALF_Z+14-halfHeight*.62);cameraGoal.set(Math.max(-maxPanX,Math.min(maxPanX,pointerStart.tx+shiftX)),0,Math.max(-maxPanZ,Math.min(maxPanZ,pointerStart.tz+shiftZ)));}});
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
   placed.push(item);drawPlaced(item);if(missionPhase===0&&selected==="treatment")setMissionPhase(1);else if(missionPhase===2&&selected==="reception")setMissionPhase(3);else if(missionPhase===4&&selected==="assessment")setMissionPhase(5);save();status.textContent=result.message+" يمكنك إضافة الأجهزة والأثاث من المتجر.";return;
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
  placed.push(item);drawPlaced(item);if(item.kind==="asset")updateMissionEquipment();save();updatePlacementPreview(e.clientX,e.clientY);status.textContent=isRoomKind(item.kind)?"تم بناء الغرفة. أضف الأجهزة والأثاث المناسبين.":"تمت إضافة العنصر إلى العيادة.";return;
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
let activeStoreCategory:StoreCategory="therapy",storeSearchQuery="";
function renderStoreCatalog(){
 const grid=el<HTMLDivElement>("#store-grid");grid.replaceChildren();
 const query=storeSearchQuery.trim().toLocaleLowerCase();
 const products=Object.entries(storeAssetSpecs).filter(([,spec])=>spec.category===activeStoreCategory&&(!query||[spec.label,spec.description,spec.room,spec.file].join(" ").toLocaleLowerCase().includes(query)));
 for(const [key,spec] of products){
  const card=document.createElement("button");card.type="button";card.className="store-item";card.dataset.asset=key;card.dataset.storeCat=spec.category;
  const art=document.createElement("span");art.className="store-item-art";
  const thumb=document.createElement("img");thumb.className="store-item-thumb";thumb.alt="";thumb.hidden=true;
  const hint=document.createElement("span");hint.className="store-item-type";hint.textContent="عاين 3D";
  art.append(thumb,hint);
  const copy=document.createElement("span");copy.className="store-item-copy";
  const title=document.createElement("b");title.textContent=spec.label;
  const desc=document.createElement("small");desc.textContent=spec.description;
  const meta=document.createElement("span");meta.className="store-item-meta";meta.textContent=spec.room+" · "+spec.footprint+" م²";
  const price=document.createElement("strong");price.textContent="◈ "+spec.cost+" عملة";
  copy.append(title,desc,meta,price);card.append(art,copy);
  if(key===selectedAssetKey)card.classList.add("selected");
  const cached=storeThumbnailCache.get(key);if(cached){thumb.src=cached;thumb.hidden=false;hint.hidden=true;}
  card.addEventListener("click",()=>selectAsset(key));grid.append(card);
 }
 el("#store-count").textContent=products.length+" منتج";
 if(!products.length){const empty=document.createElement("div");empty.className="store-empty";empty.textContent=query?"لا توجد نتائج مطابقة في هذا القسم.":"لا توجد منتجات في هذا القسم حالياً.";grid.append(empty);}
}
function beginPlacingSelectedAsset(){
 if(!selectedAssetKey)return;
 const spec=storeAssetSpecs[selectedAssetKey];
 storePanel.hidden=true;buildPanel.hidden=true;
 clearStorePreview();document.body.classList.remove("store-previewing");
 focus=false;cameraGoal.set(0,0,0);desiredOrthoHeight=14.5;viewBtn.classList.remove("active");
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
 activeStoreCategory="therapy";storeSearchQuery="";wallRotation=0;
 el<HTMLInputElement>("#store-search").value="";
 document.querySelectorAll<HTMLButtonElement>("[data-store-category]").forEach(b=>b.classList.toggle("active",b.dataset.storeCategory==="therapy"));
 renderStoreCatalog();
 storeBtn.classList.add("active");
 status.textContent="متجر العيادة: اختر الجهاز المناسب، ثم ضعه داخل غرفة مبنية.";
});
el<HTMLButtonElement>("#store-close").addEventListener("click",()=>{storePanel.hidden=true;clearStorePreview();document.body.classList.remove("store-previewing");focus=false;cameraGoal.set(0,0,0);desiredOrthoHeight=15.5;viewBtn.classList.remove("active");updateMode("move");storeBtn.classList.remove("active");});
el<HTMLButtonElement>("#store-place-selected").addEventListener("click",beginPlacingSelectedAsset);
el<HTMLButtonElement>("#store-rotate-selected").addEventListener("click",()=>{
 wallRotation=wallRotation===0?90:0;
 if(storePreviewModel)storePreviewModel.setLocalEulerAngles(0,32+wallRotation,0);
 status.textContent="اتجاه وضع الجهاز: "+wallRotation+" درجة.";
});
el<HTMLInputElement>("#store-search").addEventListener("input",event=>{
 storeSearchQuery=(event.currentTarget as HTMLInputElement).value;
 renderStoreCatalog();
});
document.querySelectorAll<HTMLButtonElement>("[data-store-category]").forEach(b=>b.addEventListener("click",()=>{
 activeStoreCategory=b.dataset.storeCategory as StoreCategory;
 document.querySelectorAll<HTMLButtonElement>("[data-store-category]").forEach(x=>x.classList.toggle("active",x===b));
 renderStoreCatalog();
}));
document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.addEventListener("click",()=>selectBuild(b.dataset.build as BuildKind)));
document.querySelectorAll<HTMLButtonElement>("[data-asset]").forEach(b=>b.addEventListener("click",()=>selectAsset(b.dataset.asset??"")));
document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-category]").forEach(x=>x.classList.toggle("active",x===b));const cat=b.dataset.category;el("#catalog-structure").hidden=cat!=="structure";el("#catalog-rooms").hidden=cat!=="rooms";if(cat==="structure")selectBuild("wall");else selectBuild("treatment");}));
el<HTMLButtonElement>("#rotate-wall").addEventListener("click",()=>{wallRotation=wallRotation===0?90:0;previewValidity=null;status.textContent="اتجاه العنصر الآن "+(wallRotation===0?"0°":"90°")+". سيتم تطبيقه على القطعة التالية.";});
viewBtn.addEventListener("click",()=>{focus=!focus;cameraGoal.set(0,0,0);desiredOrthoHeight=focus?7.2:(canvas.clientWidth/Math.max(1,canvas.clientHeight)<.48?16.5:14.5);viewBtn.classList.toggle("active",focus);el("#camera-hint").classList.toggle("hide",focus);});
const zoomCamera=(factor:number)=>{desiredOrthoHeight=Math.max(7,Math.min(30,desiredOrthoHeight*factor));focus=false;viewBtn.classList.remove("active");};
el<HTMLButtonElement>("#camera-zoom-in").addEventListener("click",()=>zoomCamera(.82));
el<HTMLButtonElement>("#camera-zoom-out").addEventListener("click",()=>zoomCamera(1.22));
el<HTMLButtonElement>("#camera-reset").addEventListener("click",()=>{
 focus=false;cameraGoal.set(0,0,0);
 const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
 desiredOrthoHeight=aspect<.9?16.5:aspect<1.2?15:13.5;
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
load();coinsLabel.textContent=String(coins);renderManagement();
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
 patientFallbackRig?.update(frameDt,!!patientStepTarget);
 receptionistFallbackRig?.update(frameDt,false);
 // Execute patient routes with the same collision grid used by the physiotherapist.
 // Temporarily disable the moving patient during its own collision queries.
 if(patientNpc.enabled&&patientTarget&&patientStepTarget){
  const current=patientNpc.getLocalPosition().clone(),dx=patientStepTarget.x-current.x,dz=patientStepTarget.z-current.z,distance=Math.hypot(dx,dz);
  if(distance<.055){
   if(patientWalkPath.length){const next=patientWalkPath.shift()!;patientStepTarget=new Vec3(next.x,0,next.z);}
   else{patientNpc.setLocalPosition(patientTarget.x,0,patientTarget.z);patientStepTarget=null;patientWalkVelocity=0;transitionHumanoid(patientRig,false);}
  }else{
   transitionHumanoid(patientRig,true);
   const desiredYaw=Math.atan2(dx,dz)*180/Math.PI,currentYaw=patientNpc.getLocalEulerAngles().y;
   let yawDelta=((desiredYaw-currentYaw+540)%360)-180;const maxTurn=Math.max(1,frameDt*220);
   patientNpc.setLocalEulerAngles(0,currentYaw+Math.max(-maxTurn,Math.min(maxTurn,yawDelta)),0);
   const desiredSpeed=Math.min(.98,Math.max(.10,Math.sqrt(distance)*.82));
   patientWalkVelocity+=(desiredSpeed-patientWalkVelocity)*(1-Math.exp(-frameDt*4.8));
   const step=Math.min(distance,frameDt*patientWalkVelocity),steps=Math.max(1,Math.ceil(step/.04));
   let x=current.x,z=current.z,moved=false;patientNpc.enabled=false;
   const avatarPosition=avatar.getLocalPosition();
   for(let i=1;i<=steps;i++){
    const nx=current.x+dx/distance*step*i/steps,nz=current.z+dz/distance*step*i/steps;
    if(Math.hypot(nx-avatarPosition.x,nz-avatarPosition.z)<.60)break;
    if(canAvatarStand(nx,nz)){x=nx;z=nz;moved=true;continue;}
    const canX=canAvatarStand(nx,z),canZ=canAvatarStand(x,nz);
    if(canX){x=nx;moved=true;}if(canZ){z=nz;moved=true;}if(!canX&&!canZ)break;
   }
   patientNpc.setLocalPosition(x,0,z);patientNpc.enabled=true;
   if(!moved){
    const retry=findWalkPath(x,z,patientTarget.x,patientTarget.z);
    patientWalkPath=retry?simplifyWalkRoute(retry,x,z):[];const next=patientWalkPath.shift();
    patientStepTarget=next?new Vec3(next.x,0,next.z):null;
    if(!patientStepTarget){patientTarget=null;patientWalkVelocity=0;transitionHumanoid(patientRig,false);}
   }
  }
 }
 // Smooth camera follow/pan/zoom instead of snapping the camera on every touch event.
 const cameraAlpha=1-Math.exp(-frameDt*11);
 cameraTarget.x+=(cameraGoal.x-cameraTarget.x)*cameraAlpha;
 cameraTarget.z+=(cameraGoal.z-cameraTarget.z)*cameraAlpha;
 camera.camera!.orthoHeight+=(desiredOrthoHeight-camera.camera!.orthoHeight)*cameraAlpha;
 camera.setPosition(cameraTarget.x+(focus?1.6:2.4),focus?13.5:17.0,cameraTarget.z+(focus?-6.5:-11.5));
 camera.lookAt(cameraTarget);
 const standingPosition=avatar.getLocalPosition();
 if(avatarContactShadow)avatarContactShadow.setLocalPosition(standingPosition.x,.052,standingPosition.z);
 if(!target){if(sessionPending){sessionPending=false;sessionDialog.showModal();}return;}
 const p=avatar.getLocalPosition().clone(),dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
 if(d<.055){
  if(walkPath.length){const next=walkPath.shift()!;target=new Vec3(next.x,0,next.z);}
  else{target=null;destination=null;walkVelocity=0;if(playerRig?.anim)playerRig.anim.speed=1;setLocomotion(false);}
 }else{
  setLocomotion(true);
  const desiredYaw=Math.atan2(dx,dz)*180/Math.PI;
  const currentYaw=avatar.getLocalEulerAngles().y;
  let yawDelta=((desiredYaw-currentYaw+540)%360)-180;
  const maxTurn=Math.max(1,frameDt*240);
  avatar.setLocalEulerAngles(0,currentYaw+Math.max(-maxTurn,Math.min(maxTurn,yawDelta)),0);
  const desiredSpeed=Math.min(1.28,Math.max(.12,Math.sqrt(d)*1.05));
   walkVelocity+=(desiredSpeed-walkVelocity)*(1-Math.exp(-frameDt*5.0));
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
