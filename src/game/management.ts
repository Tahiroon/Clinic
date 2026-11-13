export type PatientStage = "arriving" | "reception" | "waiting" | "assessment" | "treatment" | "discharged" | "left";
export type ClinicRoomType = "reception" | "assessment" | "treatment" | "exercise";
export interface ClinicPatient {
  id:number; name:string; caseLabel:string; need:"pain"|"mobility"|"post_op"|"sports";
  stage:PatientStage; patience:number; mood:number; waitMinutes:number; satisfaction:number;
}
export interface ClinicRoom {
  id:number; type:ClinicRoomType; x:number; z:number; width:number; depth:number;
  prestige:number; open:boolean; capacity:number;
}
export interface ClinicEvent {id:number;minute:number;kind:"arrival"|"warning"|"income"|"treatment"|"milestone";message:string;}
export interface ManagementState {
  version:2;day:number;minuteOfDay:number;speed:0|1|2|3;clinicOpen:boolean;
  balance:number;reputation:number;experience:number;treated:number;arrivals:number;
  receptionistOwned:boolean;patients:ClinicPatient[];rooms:ClinicRoom[];events:ClinicEvent[];
  nextPatientId:number;nextRoomId:number;nextEventId:number;arrivalAccumulator:number;
}
export const ROOM_BLUEPRINTS:Record<ClinicRoomType,{label:string;cost:number;width:number;depth:number;capacity:number;description:string}> = {
 reception:{label:"الاستقبال",cost:420,width:4,depth:4,capacity:3,description:"تسجيل المرضى وتنظيم الوصول"},
 assessment:{label:"غرفة التقييم",cost:620,width:4,depth:4,capacity:1,description:"التاريخ المرضي والفحص الوظيفي"},
 treatment:{label:"غرفة العلاج",cost:720,width:4,depth:4,capacity:1,description:"جلسات العلاج الطبيعي الفردية"},
 exercise:{label:"صالة التأهيل الحركي",cost:980,width:5,depth:5,capacity:3,description:"التدريب الوظيفي والتمارين"}
};
const CASES=[
 {label:"ألم أسفل الظهر",need:"pain" as const},
 {label:"صعوبة المشي",need:"mobility" as const},
 {label:"تأهيل بعد عملية",need:"post_op" as const},
 {label:"إصابة رياضية",need:"sports" as const}
];
const NAMES=["مريم","أحمد","سارة","محمد","آمنة","يوسف","هدى","عمر","سلمى","خالد","إسراء","مصطفى"];
export function createInitialManagementState():ManagementState{
 return {version:2,day:1,minuteOfDay:8*60,speed:1,clinicOpen:false,balance:3200,reputation:50,experience:0,treated:0,arrivals:0,receptionistOwned:false,
 patients:[],rooms:[],events:[{id:1,minute:480,kind:"milestone",message:"أرضك جاهزة. ابنِ غرفتك الأولى وابدأ تأسيس عيادتك."}],
 nextPatientId:1,nextRoomId:1,nextEventId:2,arrivalAccumulator:0};
}
function event(s:ManagementState,kind:ClinicEvent["kind"],message:string){
 s.events.unshift({id:s.nextEventId++,minute:(s.day-1)*1440+s.minuteOfDay,kind,message});s.events=s.events.slice(0,14);
}
export function buildRoom(s:ManagementState,type:ClinicRoomType,x:number,z:number,width=ROOM_BLUEPRINTS[type]?.width??4,depth=ROOM_BLUEPRINTS[type]?.depth??4):{ok:boolean;message:string;room?:ClinicRoom}{
 const b=ROOM_BLUEPRINTS[type];if(!b)return {ok:false,message:"نوع الغرفة غير معروف."};
 width=Math.max(b.width,Math.min(12,Math.floor(width)));depth=Math.max(b.depth,Math.min(12,Math.floor(depth)));
 const cost=b.cost+Math.max(0,width*depth-b.width*b.depth)*35;
 if(s.balance<cost)return {ok:false,message:"الرصيد لا يكفي لبناء "+b.label+" بهذا الحجم."};
 if(x< -7||z< -14||x+width>7||z+depth>14)return {ok:false,message:"الغرفة خارج حدود أرض العيادة."};
 if(s.rooms.some(r=>x<r.x+r.width&&x+width>r.x&&z<r.z+r.depth&&z+depth>r.z))return {ok:false,message:"المساحة تتداخل مع غرفة أخرى."};
 s.balance-=cost;
 const room:ClinicRoom={id:s.nextRoomId++,type,x,z,width,depth,prestige:1,open:true,capacity:b.capacity};
 s.rooms.push(room);event(s,"milestone","تم بناء "+b.label+". أضف الأجهزة والديكور لرفع جودة الغرفة.");
 return {ok:true,message:"تم بناء "+b.label+" بحجم "+width+"×"+depth+" م.",room};
}
export function setSimulationSpeed(s:ManagementState,speed:0|1|2|3){s.speed=speed;}
function hasRoom(s:ManagementState,type:ClinicRoomType){return s.rooms.some(r=>r.open&&r.type===type);}
export function setClinicOpen(s:ManagementState,open:boolean):{ok:boolean;message:string}{
 if(open){
  const missing:string[]=[];
  if(!hasRoom(s,"reception"))missing.push("الاستقبال");
  if(!hasRoom(s,"assessment"))missing.push("غرفة التقييم");
  if(!hasRoom(s,"treatment"))missing.push("غرفة العلاج");
  if(missing.length)return {ok:false,message:"جهّز أولاً: "+missing.join("، ")+ "."};
  s.clinicOpen=true;event(s,"milestone","افتتحت العيادة! الأخصائي جاهز لاستقبال أول حالة.");
  return {ok:true,message:"العيادة مفتوحة. بدأت الحالات بالوصول."};
 }
 s.clinicOpen=false;event(s,"milestone","أغلقت العيادة مؤقتاً.");return {ok:true,message:"تم إغلاق العيادة مؤقتاً."};
}
export function hireReceptionist(s:ManagementState):{ok:boolean;message:string}{
 if(s.receptionistOwned)return {ok:false,message:"موظف الاستقبال موجود بالفعل."};
 if(s.treated<3)return {ok:false,message:"يتاح شراء موظف الاستقبال بعد علاج 3 حالات."};
 const cost=280;if(s.balance<cost)return {ok:false,message:"الرصيد لا يكفي لشراء موظف الاستقبال."};
 s.balance-=cost;s.receptionistOwned=true;
 event(s,"milestone","انضم موظف الاستقبال إلى العيادة. أصبح تسجيل المرضى أسرع.");
 return {ok:true,message:"تم شراء موظف الاستقبال. سيساعد في تنظيم وصول المرضى."};
}
function addPatient(s:ManagementState){
 const c=CASES[s.arrivals%CASES.length],name=NAMES[s.arrivals%NAMES.length];
 s.patients.push({id:s.nextPatientId++,name,caseLabel:c.label,need:c.need,stage:s.receptionistOwned?"reception":"waiting",patience:100,mood:78,waitMinutes:0,satisfaction:0});
 s.arrivals++;event(s,"arrival","وصل "+name+" إلى العيادة: "+c.label+".");
}
export function advanceSimulation(s:ManagementState,realSeconds:number){
 if(s.speed===0||realSeconds<=0||!s.clinicOpen)return;
 let remaining=realSeconds*s.speed*2;
 while(remaining>0){
  const step=Math.min(1,remaining);remaining-=step;s.minuteOfDay+=step;
  if(s.minuteOfDay>=1440){s.minuteOfDay=0;s.day++;event(s,"milestone","بدأ يوم جديد في العيادة.");}
  if(s.minuteOfDay>=8*60&&s.minuteOfDay<18*60){
   s.arrivalAccumulator+=step;
   if(s.arrivalAccumulator>=14){s.arrivalAccumulator=0;if(getActivePatientCount(s)<12)addPatient(s);}
  }
  for(const p of s.patients){
   if(p.stage==="discharged"||p.stage==="left")continue;
   p.waitMinutes+=step;
   if(p.stage==="reception"){
    if(p.waitMinutes>=(s.receptionistOwned?1:2)){p.stage="waiting";p.waitMinutes=0;}
   }else if(p.stage==="waiting"){
    p.patience=Math.max(0,p.patience-step*(s.receptionistOwned?.16:.28));
    p.mood=Math.max(0,p.mood-step*.08);
    if(p.patience<=0){p.stage="left";s.reputation=Math.max(0,s.reputation-1.2);event(s,"warning",p.name+" غادر بعد انتظار طويل.");}
   }
  }
 }
}
export function beginPatientSession(s:ManagementState):{ok:boolean;message:string;patient?:ClinicPatient}{
 const patient=getPatientQueue(s).find(p=>p.stage==="waiting");
 if(!patient)return {ok:false,message:"لا توجد حالة جاهزة الآن. انتظر وصول مريض أو راجع قائمة المرضى."};
 if(!hasRoom(s,"assessment")||!hasRoom(s,"treatment"))return {ok:false,message:"تحتاج إلى غرفة تقييم وغرفة علاج قبل بدء الجلسة."};
 patient.stage="assessment";patient.waitMinutes=0;event(s,"treatment","بدأ الأخصائي جلسة تقييم "+patient.name+".");
 return {ok:true,message:"بدأت جلسة "+patient.name+".",patient};
}
export function cancelPatientSession(s:ManagementState,patientId:number){const p=s.patients.find(x=>x.id===patientId&&x.stage==="assessment");if(p){p.stage="waiting";p.waitMinutes=0;event(s,"warning","تم تأجيل جلسة "+p.name+" وإعادته إلى قائمة الانتظار.");}}\nexport function completePatientSession(s:ManagementState,patientId:number,score:number):number{
 const p=s.patients.find(x=>x.id===patientId&&x.stage==="assessment");if(!p)return 0;
 const quality=Math.max(0,Math.min(100,score*20));
 p.stage="discharged";p.satisfaction=Math.max(45,Math.min(100,quality*.65+p.patience*.35));
 s.treated++;s.experience+=score*10;
 const income=90+Math.round(p.satisfaction*.9);s.balance+=income;
 s.reputation=Math.min(100,s.reputation+(p.satisfaction>=70?.8:.2));
 event(s,"income","اكتملت جلسة "+p.name+". دخل +"+income+" عملة.");
 if(s.treated===3&&!s.receptionistOwned)event(s,"milestone","إنجاز جديد: أصبح بإمكانك شراء موظف استقبال.");
 return income;
}
export function formatGameTime(s:ManagementState){
 const h=Math.floor(s.minuteOfDay/60),m=Math.floor(s.minuteOfDay%60);
 return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}
export function getActivePatientCount(s:ManagementState){return s.patients.filter(p=>!["discharged","left"].includes(p.stage)).length;}
export function getPatientQueue(s:ManagementState){return s.patients.filter(p=>!["discharged","left"].includes(p.stage)).sort((a,b)=>a.waitMinutes-b.waitMinutes);}
