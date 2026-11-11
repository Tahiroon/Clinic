import * as pc from "playcanvas";
import "../style.css";

type BuildKind = "treatment" | "reception" | "gym" | "chair" | "plant" | "cabinet";
type Placed = { id:number; kind:BuildKind; gx:number; gz:number };
const el=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=el<HTMLCanvasElement>("#scene"), status=el<HTMLElement>("#status"), fpsLabel=el<HTMLElement>("#fps"), loading=el<HTMLElement>("#loading");
const stage=el<HTMLElement>(".stage"), moveBtn=el<HTMLButtonElement>("#move-mode"), buildBtn=el<HTMLButtonElement>("#build-mode"), sessionBtn=el<HTMLButtonElement>("#session-mode"), viewBtn=el<HTMLButtonElement>("#view-mode");
const buildPanel=el<HTMLElement>("#build-panel"), saveState=el<HTMLElement>("#save-state"), coinsLabel=el<HTMLElement>("#coins"), sessionDialog=el<HTMLDialogElement>("#session-dialog");
const app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:false,alpha:false,powerPreference:"low-power"}});
app.setCanvasFillMode(pc.FILLMODE_NONE); app.setCanvasResolution(pc.RESOLUTION_AUTO); app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,1.15);
const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;if(w>0&&h>0){app.resizeCanvas(w,h);camera.camera!.orthoHeight=Math.max(8.4,Math.min(10.2,9.4/(w/h)));}};
const observer=new ResizeObserver(resize);observer.observe(stage);
app.scene.ambientLight=new pc.Color(.78,.82,.86);
function material(c:pc.Color){const m=new pc.StandardMaterial();m.diffuse=c;m.update();return m;}
const M={ground:material(new pc.Color(.32,.48,.43)),tile:material(new pc.Color(.43,.59,.51)),grid:material(new pc.Color(.25,.4,.36)),room:material(new pc.Color(.78,.82,.79)),wall:material(new pc.Color(.88,.91,.86)),wallSide:material(new pc.Color(.53,.68,.69)),wood:material(new pc.Color(.48,.33,.23)),wood2:material(new pc.Color(.68,.49,.31)),teal:material(new pc.Color(.13,.48,.55)),blue:material(new pc.Color(.18,.35,.58)),pale:material(new pc.Color(.79,.9,.88)),green:material(new pc.Color(.2,.53,.36)),skin:material(new pc.Color(.7,.49,.36)),dark:material(new pc.Color(.1,.16,.21)),white:material(new pc.Color(.93,.94,.87)),yellow:material(new pc.Color(.85,.65,.27))};
function box(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){const e=new pc.Entity(name);e.addComponent("model",{type:"box"});e.setPosition(x,y,z);e.setLocalScale(sx,sy,sz);e.model!.material=m;parent.addChild(e);return e;}
function sphere(name:string,x:number,y:number,z:number,s:number,m:pc.StandardMaterial,parent:pc.Entity=app.root){const e=new pc.Entity(name);e.addComponent("model",{type:"sphere"});e.setPosition(x,y,z);e.setLocalScale(s,s,s);e.model!.material=m;parent.addChild(e);return e;}
const camera=new pc.Entity("Portrait isometric camera");camera.addComponent("camera",{projection:pc.PROJECTION_ORTHOGRAPHIC,orthoHeight:10,clearColor:new pc.Color(.55,.7,.72),nearClip:.1,farClip:150});const cameraTarget=new pc.Vec3(-1,0,-1);camera.setPosition(10,14,10);camera.lookAt(cameraTarget);app.root.addChild(camera);
const light=new pc.Entity("Soft daylight");light.addComponent("light",{type:"directional",intensity:1.15});light.setEulerAngles(48,35,0);app.root.addChild(light);
const world=new pc.Entity("Clinic plot");app.root.addChild(world);
const GRID=1, W=16, D=16, HALF=W/2;
box("Land foundation",0,-.27,0,W,.5,D,M.ground,world);
for(let x=-HALF;x<=HALF;x++)box("Build grid line",x,.012,0,.012,.012,D,M.grid,world);
for(let z=-HALF;z<=HALF;z++)box("Build grid line",0,.012,z,W,.012,.012,M.grid,world);
const roomRoot=new pc.Entity("Starter treatment room");world.addChild(roomRoot);
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
// Vite bundles this licensed model with the game instead of exposing a standalone public download.
const starterRoomAsset=new URL("../assets/clinic-kit/hospital/physical-therapy-room-set.glb",import.meta.url).href;
loadClinicModel(starterRoomAsset,"Physical therapy room",-1,-1,4.7,()=>{loading.classList.add("done");});
const avatar=new pc.Entity("Student avatar");avatar.setPosition(-1,0,2.0);world.addChild(avatar);
box("Avatar torso",0,.95,0,.42,.72,.32,M.teal,avatar);sphere("Avatar head",0,1.52,0,.34,M.skin,avatar);box("Avatar hair",0,1.69,-.02,.34,.12,.34,M.dark,avatar);
box("Avatar foot",-.12,.12,.06,.15,.18,.28,M.dark,avatar);box("Avatar foot",.12,.12,.06,.15,.18,.28,M.dark,avatar);
let mode:"move"|"build"="move", selected:BuildKind="reception", target:pc.Vec3|null=null, coins=120, xp=0, nextId=2, focus=false;
let placed:Placed[]=[];const saveKey="therason-clinic-world-v2";const entities:pc.Entity[]=[];
const costs:Record<BuildKind,number>={treatment:0,reception:60,gym:90,chair:20,plant:15,cabinet:30};
function save(){try{localStorage.setItem(saveKey,JSON.stringify({v:2,coins,xp,placed}));saveState.textContent="تم الحفظ";}catch{saveState.textContent="حفظ مؤقت";}}
function load(){try{const s=localStorage.getItem(saveKey);if(!s)return;const v=JSON.parse(s);if(v.v!==2)return;coins=Number.isFinite(v.coins)?v.coins:120;xp=Number.isFinite(v.xp)?v.xp:0;placed=Array.isArray(v.placed)?v.placed.slice(0,60):[];coinsLabel.textContent=String(coins);el("#experience").textContent=xp+" XP";for(const p of placed)drawPlaced(p);}catch{}}
function drawPlaced(p:Placed){const x=p.gx+.5,z=p.gz+.5;if(p.kind==="reception"||p.kind==="gym"||p.kind==="treatment"){const r=makeRoom(p.kind,p.gx,p.gz,p.id);entities.push(r);return;}
 const root=new pc.Entity("Placed "+p.kind);root.setPosition(x,0,z);world.addChild(root);entities.push(root);
 if(p.kind==="chair"){box("Chair seat",0,.38,0,.6,.15,.6,M.teal,root);box("Chair back",0,.75,-.22,.6,.6,.13,M.blue,root);for(const a of [-.22,.22])for(const b of [-.22,.22])box("Chair leg",a,.16,b,.06,.32,.06,M.dark,root);}
 if(p.kind==="plant"){box("Plant pot",0,.2,0,.38,.4,.38,M.wood2,root);sphere("Plant leaves",0,.72,0,.52,M.green,root);sphere("Plant leaf",.2,.88,.04,.3,M.green,root);}
 if(p.kind==="cabinet"){box("Cabinet body",0,.6,0,.7,1.2,.42,M.wood2,root);box("Cabinet door",0,.6,.22,.62,1.08,.03,M.wood,root);}
}
function footprint(kind:BuildKind){return kind==="treatment"||kind==="reception"||kind==="gym"?4:1;}
function occupied(gx:number,gz:number,kind:BuildKind){const size=footprint(kind);if(gx< -HALF||gz< -HALF||gx+size>HALF||gz+size>HALF)return true;const overlaps=(ax:number,az:number,as:number,bx:number,bz:number,bs:number)=>ax<bx+bs&&ax+as>bx&&az<bz+bs&&az+as>bz;if(overlaps(gx,gz,size,-3,-3,4))return true;return placed.some(p=>overlaps(gx,gz,size,p.gx,p.gz,footprint(p.kind)));}
function updateMode(next:"move"|"build"){mode=next;moveBtn.classList.toggle("active",mode==="move");buildBtn.classList.toggle("active",mode==="build");buildPanel.hidden=mode!=="build";status.textContent=mode==="move"?"اضغط على الأرض لتحريك شخصيتك. اسحب لتحريك الكاميرا.":"اختر غرفة أو قطعة ثم المس خلية فارغة في الشبكة.";}
function screenToGround(clientX:number,clientY:number){const r=canvas.getBoundingClientRect(),x=(clientX-r.left)*(canvas.width/r.width),y=(clientY-r.top)*(canvas.height/r.height);const a=camera.camera!.screenToWorld(x,y,.1),b=camera.camera!.screenToWorld(x,y,100),d=b.sub(a);if(Math.abs(d.y)<.0001)return null;const t=-a.y/d.y;if(t<0)return null;const p=a.add(d.mulScalar(t));if(Math.abs(p.x)>HALF||Math.abs(p.z)>HALF)return null;return p;}
let pointerStart:{x:number;y:number;cx:number;cz:number;tx:number;tz:number}|null=null,dragged=false;const activePointers=new Map<number,{x:number;y:number}>();let pinchDistance=0,pinchHeight=0;
canvas.addEventListener("pointerdown",e=>{activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size===2){const pts=[...activePointers.values()];pinchDistance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);pinchHeight=camera.camera!.orthoHeight;pointerStart=null;dragged=true;}else{pointerStart={x:e.clientX,y:e.clientY,cx:camera.getPosition().x,cz:camera.getPosition().z,tx:cameraTarget.x,tz:cameraTarget.z};dragged=false;}canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointermove",e=>{if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size>=2){const pts=[...activePointers.values()];const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance>0)camera.camera!.orthoHeight=Math.max(5.2,Math.min(17,pinchHeight*pinchDistance/Math.max(1,distance)));dragged=true;return;}if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;if(Math.hypot(dx,dy)>8)dragged=true;if(dragged){const scale=camera.camera!.orthoHeight/Math.max(220,canvas.clientHeight),shiftX=-dx*scale*.7,shiftZ=dy*scale*.7;cameraTarget.set(pointerStart.tx+shiftX,0,pointerStart.tz+shiftZ);camera.setPosition(pointerStart.cx+shiftX,14,pointerStart.cz+shiftZ);camera.lookAt(cameraTarget);}});
canvas.addEventListener("pointerup",e=>{activePointers.delete(e.pointerId);if(activePointers.size<2)pinchDistance=0;if(!pointerStart){if(activePointers.size===1){const p=[...activePointers.values()][0];pointerStart={x:p.x,y:p.y,cx:camera.getPosition().x,cz:camera.getPosition().z,tx:cameraTarget.x,tz:cameraTarget.z};}else dragged=false;return;}const wasDrag=dragged;pointerStart=null;if(wasDrag)return;const p=screenToGround(e.clientX,e.clientY);if(!p)return;if(mode==="build"){const gx=Math.floor(p.x),gz=Math.floor(p.z);if(occupied(gx,gz,selected)){status.textContent="هذه الخلية مشغولة. اختر مساحة فارغة بجوارها.";return;}const cost=costs[selected];if(coins<cost){status.textContent="عملاتك لا تكفي لهذه الإضافة بعد. أكمل جلساتك لاكتساب العملات.";return;}coins-=cost;coinsLabel.textContent=String(coins);const item={id:nextId++,kind:selected,gx,gz};placed.push(item);drawPlaced(item);save();status.textContent="تمت الإضافة! تقدر تواصل تخطيط عيادتك.";return;}target=new pc.Vec3(Math.round(p.x*2)/2,0,Math.round(p.z*2)/2);status.textContent="شخصيتك تتحرك إلى الموقع المحدد.";});
canvas.addEventListener("pointercancel",e=>{activePointers.delete(e.pointerId);pointerStart=null;pinchDistance=0;dragged=false;});
function selectBuild(kind:BuildKind){selected=kind;document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.classList.toggle("selected",b.dataset.build===kind));const names:Record<BuildKind,string>={treatment:"غرفة علاج",reception:"استقبال",gym:"صالة تمارين",chair:"كرسي انتظار",plant:"نبات داخلي",cabinet:"خزانة أدوات"};el("#build-hint").textContent="تم اختيار "+names[kind]+". المس خلية فارغة في الشبكة لوضعها.";}
moveBtn.addEventListener("click",()=>updateMode("move"));buildBtn.addEventListener("click",()=>updateMode(mode==="build"?"move":"build"));el("#cancel-build").addEventListener("click",()=>updateMode("move"));
document.querySelectorAll<HTMLButtonElement>("[data-build]").forEach(b=>b.addEventListener("click",()=>selectBuild(b.dataset.build as BuildKind)));
document.querySelectorAll<HTMLButtonElement>("[data-category]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-category]").forEach(x=>x.classList.toggle("active",x===b));const rooms=b.dataset.category==="rooms";el("#catalog-rooms").hidden=!rooms;el("#catalog-furniture").hidden=rooms;selectBuild(rooms?"reception":"chair");}));
viewBtn.addEventListener("click",()=>{focus=!focus;cameraTarget.set(-1,0,-1);camera.setPosition(focus?7:10,focus?11:14,focus?7:10);camera.lookAt(cameraTarget);viewBtn.classList.toggle("active",focus);el("#camera-hint").classList.toggle("hide",focus);});
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
load();
app.on("update",(dt:number)=>{if(target){const p=avatar.getPosition(),dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.07)target=null;else{const step=Math.min(d,dt*2.4);avatar.setPosition(p.x+dx/d*step,0,p.z+dz/d*step);avatar.setEulerAngles(0,Math.atan2(dx,dz)*180/Math.PI,0);}}});
let frames=0,elapsed=0;app.on("postupdate",(dt:number)=>{frames++;elapsed+=dt;if(elapsed>=1){fpsLabel.textContent=Math.round(frames/elapsed)+" FPS";frames=0;elapsed=0;}});
app.start();resize();requestAnimationFrame(resize);window.setTimeout(()=>{if(loading.classList.contains("done"))return;status.textContent="نحمّل أصول العيادة...";},4500);window.setTimeout(()=>el("#camera-hint").classList.add("hide"),6500);
window.addEventListener("pagehide",()=>{observer.disconnect();app.destroy();},{once:true});
