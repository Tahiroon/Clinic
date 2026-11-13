export type StaffRole = "physiotherapist" | "receptionist" | "rehab_assistant" | "cleaner";
export type PatientStage = "arriving" | "reception" | "waiting" | "assessment" | "treatment" | "discharged" | "left";
export type ClinicRoomType = "reception" | "assessment" | "treatment" | "exercise" | "staff";
export interface StaffMember {
  id: number; name: string; role: StaffRole; skill: number; energy: number; morale: number;
  wagePerHour: number; assignedRoomId: number | null; status: "idle" | "working" | "break";
}
export interface ClinicPatient {
  id: number; name: string; caseLabel: string; need: "pain" | "mobility" | "post_op" | "sports";
  stage: PatientStage; patience: number; mood: number; waitMinutes: number;
  progress: number; satisfaction: number; assignedStaffId: number | null;
}
export interface ClinicRoom {
  id: number; type: ClinicRoomType; x: number; z: number; width: number; depth: number;
  prestige: number; open: boolean; capacity: number;
}
export interface ClinicEvent { id: number; minute: number; kind: "arrival" | "warning" | "income" | "treatment" | "staff"; message: string; }
export interface ManagementState {
  version: 1; day: number; minuteOfDay: number; speed: 0 | 1 | 2 | 3;
  balance: number; reputation: number; experience: number; treated: number; arrivals: number;
  staff: StaffMember[]; patients: ClinicPatient[]; rooms: ClinicRoom[]; events: ClinicEvent[];
  nextStaffId: number; nextPatientId: number; nextRoomId: number; nextEventId: number;
  arrivalAccumulator: number; payrollAccumulator: number;
}
export const ROOM_BLUEPRINTS: Record<ClinicRoomType,{label:string;cost:number;width:number;depth:number;capacity:number;description:string}> = {
  reception:{label:"الاستقبال",cost:420,width:4,depth:4,capacity:3,description:"تسجيل المرضى وتنظيم المواعيد"},
  assessment:{label:"غرفة التقييم",cost:620,width:4,depth:4,capacity:1,description:"التاريخ المرضي والفحص الوظيفي"},
  treatment:{label:"غرفة العلاج",cost:720,width:4,depth:4,capacity:1,description:"جلسات العلاج الطبيعي الفردية"},
  exercise:{label:"صالة التأهيل الحركي",cost:980,width:4,depth:4,capacity:3,description:"التدريب الوظيفي والتمارين"},
  staff:{label:"استراحة الفريق",cost:360,width:4,depth:4,capacity:4,description:"استعادة طاقة الفريق ورفع المعنويات"}
};
const STAFF_BLUEPRINTS: Record<StaffRole,{label:string;hireCost:number;wage:number;skill:number}> = {
  physiotherapist:{label:"أخصائي علاج طبيعي",hireCost:520,wage:42,skill:65},
  receptionist:{label:"موظف استقبال",hireCost:280,wage:22,skill:55},
  rehab_assistant:{label:"مساعد تأهيل",hireCost:360,wage:28,skill:50},
  cleaner:{label:"عامل نظافة",hireCost:220,wage:18,skill:50}
};
const CASES = [
  {label:"ألم أسفل الظهر",need:"pain" as const,stage:0},
  {label:"صعوبة المشي",need:"mobility" as const,stage:0},
  {label:"تأهيل بعد عملية",need:"post_op" as const,stage:0},
  {label:"إصابة رياضية",need:"sports" as const,stage:0}
];
const NAMES=["مريم","أحمد","سارة","محمد","آمنة","يوسف","هدى","عمر","سلمى","خالد","إسراء","مصطفى"];
export function createInitialManagementState():ManagementState {
  return {version:1,day:1,minuteOfDay:8*60,speed:1,balance:3200,reputation:50,experience:0,treated:0,arrivals:0,
    staff:[{id:1,name:"أنت",role:"physiotherapist",skill:70,energy:100,morale:85,wagePerHour:0,assignedRoomId:null,status:"idle"}],
    patients:[],rooms:[{id:1,type:"treatment",x:-2,z:-2,width:4,depth:4,prestige:1,open:true,capacity:1}],events:[{id:1,minute:480,kind:"staff",message:"بدأ يومك الأول. جهّز الاستقبال وغرف العلاج قبل استقبال المرضى."}],
    nextStaffId:2,nextPatientId:1,nextRoomId:2,nextEventId:2,arrivalAccumulator:0,payrollAccumulator:0};
}
function event(s:ManagementState,kind:ClinicEvent["kind"],message:string){
  s.events.unshift({id:s.nextEventId++,minute:(s.day-1)*1440+s.minuteOfDay,kind,message});s.events=s.events.slice(0,12);
}
export function hireStaff(s:ManagementState,role:StaffRole):{ok:boolean;message:string}{
  const spec=STAFF_BLUEPRINTS[role];if(!spec)return {ok:false,message:"هذه الوظيفة غير متاحة."};
  if(s.balance<spec.hireCost)return {ok:false,message:"الرصيد لا يكفي للتوظيف."};
  if(role==="physiotherapist"&&s.staff.filter(x=>x.role===role).length>=4)return {ok:false,message:"وصلت للحد الحالي للأخصائيين."};
  s.balance-=spec.hireCost;
  const names=["نور","طارق","رنا","أنس","مي","إياد","لينا","بلال"];
  const member:StaffMember={id:s.nextStaffId++,name:names[(s.nextStaffId+2)%names.length],role,skill:spec.skill+Math.round(Math.random()*12),energy:100,morale:78,wagePerHour:spec.wage,assignedRoomId:null,status:"idle"};
  s.staff.push(member);event(s,"staff","تم توظيف "+STAFF_BLUEPRINTS[role].label+" جديد: "+member.name+".");
  return {ok:true,message:"انضم "+member.name+" إلى فريق العيادة."};
}
export function buildRoom(s:ManagementState,type:ClinicRoomType,x:number,z:number,width=ROOM_BLUEPRINTS[type]?.width??4,depth=ROOM_BLUEPRINTS[type]?.depth??4):{ok:boolean;message:string;room?:ClinicRoom}{
  const b=ROOM_BLUEPRINTS[type];if(!b)return {ok:false,message:"نوع الغرفة غير معروف."};
  width=Math.max(b.width,Math.min(12,Math.floor(width)));depth=Math.max(b.depth,Math.min(12,Math.floor(depth)));
  const cost=b.cost+Math.max(0,width*depth-b.width*b.depth)*35;
  if(s.balance<cost)return {ok:false,message:"الرصيد لا يكفي لبناء "+b.label+" بهذا الحجم."};
  if(x< -7||z< -14||x+width>7||z+depth>14)return {ok:false,message:"الغرفة خارج حدود أرض العيادة."};
  const overlaps=s.rooms.some(r=>x<r.x+r.width&&x+width>r.x&&z<r.z+r.depth&&z+depth>r.z);
  if(overlaps)return {ok:false,message:"المساحة تتداخل مع غرفة أخرى."};
  s.balance-=cost;
  const room:ClinicRoom={id:s.nextRoomId++,type,x,z,width,depth,prestige:1,open:true,capacity:b.capacity};
  s.rooms.push(room);event(s,"staff","تم إنشاء "+b.label+". جهّزها بالأثاث والأجهزة المطلوبة.");
  return {ok:true,message:"تم بناء "+b.label+" بحجم "+width+"×"+depth+" م.",room};
}
export function setSimulationSpeed(s:ManagementState,speed:0|1|2|3){s.speed=speed;}
export function assignStaff(s:ManagementState,staffId:number,roomId:number|null):boolean{
  const member=s.staff.find(x=>x.id===staffId);if(!member)return false;
  if(roomId!==null&&!s.rooms.some(r=>r.id===roomId&&r.open))return false;
  member.assignedRoomId=roomId;event(s,"staff",member.name+" تم تحديث مكان عمله.");return true;
}
function addPatient(s:ManagementState){
  const c=CASES[s.arrivals%CASES.length],name=NAMES[s.arrivals%NAMES.length];
  const p:ClinicPatient={id:s.nextPatientId++,name,caseLabel:c.label,need:c.need,stage:"arriving",patience:100,mood:75,waitMinutes:0,progress:0,satisfaction:0,assignedStaffId:null};
  s.patients.push(p);s.arrivals++;event(s,"arrival","وصل "+name+" إلى العيادة: "+c.label+".");
}
function availableRoom(s:ManagementState,type:ClinicRoomType){return s.rooms.find(r=>r.open&&r.type===type);}
function availablePhysio(s:ManagementState){return s.staff.find(m=>m.role==="physiotherapist"&&m.energy>18&&m.status!=="break"&&!s.patients.some(p=>p.assignedStaffId===m.id&&["assessment","treatment"].includes(p.stage)));}
export function advanceSimulation(s:ManagementState,realSeconds:number){
  if(s.speed===0||realSeconds<=0)return;
  const gameMinutes=realSeconds*s.speed*2;
  let remaining=gameMinutes;
  while(remaining>0){
    const step=Math.min(1,remaining);remaining-=step;s.minuteOfDay+=step;
    if(s.minuteOfDay>=24*60){s.minuteOfDay=0;s.day++;event(s,"staff","بدأ يوم جديد في العيادة.");}
    s.arrivalAccumulator+=step;
    const reception=availableRoom(s,"reception"),assessment=availableRoom(s,"assessment"),treatment=availableRoom(s,"treatment"),exercise=availableRoom(s,"exercise");
    const openForPatients=s.minuteOfDay>=8*60&&s.minuteOfDay<18*60;
    if(openForPatients&&reception&&s.arrivalAccumulator>=12){
      s.arrivalAccumulator=0;
      const active=s.patients.filter(p=>!["discharged","left"].includes(p.stage)).length;
      if(active<12)addPatient(s);
    }
    for(const p of s.patients){
      if(p.stage==="discharged"||p.stage==="left")continue;
      p.waitMinutes+=step;
      if(p.stage==="arriving"){p.stage=reception?"reception":"waiting";}
      if(p.stage==="reception"){
        const receptionist=s.staff.find(m=>m.role==="receptionist"&&m.energy>5&&m.status!=="break");
        if(receptionist){p.stage="waiting";p.waitMinutes=0;receptionist.status="working";}
        else{p.patience=Math.max(0,p.patience-step*.42);if(p.patience<=0){p.stage="left";s.reputation=Math.max(0,s.reputation-1);event(s,"warning",p.name+" غادر قبل التسجيل لعدم وجود موظف استقبال.");}}
      }
      if(p.stage==="waiting"){
        p.patience=Math.max(0,p.patience-step*.32);p.mood=Math.max(0,p.mood-step*.18);
        if(assessment&&availablePhysio(s)&&p.waitMinutes>=3){p.stage="assessment";p.assignedStaffId=availablePhysio(s)!.id;event(s,"treatment",p.name+" دخل غرفة التقييم.");}
        else if(p.patience<=0){p.stage="left";s.reputation=Math.max(0,s.reputation-1.5);event(s,"warning",p.name+" غادر بسبب طول الانتظار.");}
      }else if(p.stage==="assessment"){
        const staff=s.staff.find(m=>m.id===p.assignedStaffId);
        if(!staff||!assessment){p.stage="waiting";p.assignedStaffId=null;continue;}
        staff.status="working";staff.energy=Math.max(0,staff.energy-step*.12);
        if(p.progress<25)p.progress+=step*(.8+staff.skill/100);
        if(p.progress>=25){p.stage="treatment";p.progress=0;event(s,"treatment",p.name+" أكمل التقييم وانتقل للعلاج.");}
      }else if(p.stage==="treatment"){
        const staff=s.staff.find(m=>m.id===p.assignedStaffId);
        const destination=(p.need==="mobility"||p.need==="sports")&&exercise?exercise:treatment;
        if(!destination){p.stage="waiting";p.assignedStaffId=null;continue;}
        if(!staff){p.stage="waiting";continue;}
        staff.status="working";staff.energy=Math.max(0,staff.energy-step*.18);
        if(p.progress<35)p.progress+=step*(.65+staff.skill/120);
        if(p.progress>=35){
          p.stage="discharged";p.satisfaction=Math.max(35,Math.min(100,p.patience*.55+p.mood*.45));
          const income=110+Math.round(p.satisfaction*.8);s.balance+=income;s.reputation=Math.min(100,s.reputation+(p.satisfaction>=70?.6:.1));
          s.experience+=Math.round(p.satisfaction/5);s.treated++;staff.status="idle";event(s,"income","اكتملت جلسة "+p.name+". دخل +"+income+" عملة.");
        }
      }
    }
    for(const m of s.staff){if(m.status==="working")m.status="idle";if(m.energy<18){m.status="break";}else if(m.status==="break"&&availableRoom(s,"staff")){m.energy=Math.min(100,m.energy+step*.35);if(m.energy>45){m.status="idle";event(s,"staff",m.name+" عاد من الاستراحة.");}}else{m.energy=Math.min(100,m.energy+step*.04);}}
    s.payrollAccumulator+=step;
    if(s.payrollAccumulator>=60){s.payrollAccumulator=0;const wages=s.staff.reduce((n,m)=>n+m.wagePerHour,0);s.balance-=wages;if(wages)event(s,"warning","رواتب الفريق: -"+wages+" عملة.");}
  }
  s.patients=s.patients.filter(p=>p.stage!=="discharged"||p.waitMinutes<180);
}
export function formatGameTime(s:ManagementState){const h=Math.floor(s.minuteOfDay/60),m=Math.floor(s.minuteOfDay%60);return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");}
export function getRoleLabel(role:StaffRole){return STAFF_BLUEPRINTS[role].label;}
export function getActivePatientCount(s:ManagementState){return s.patients.filter(p=>!["discharged","left"].includes(p.stage)).length;}
export function getPatientQueue(s:ManagementState){return s.patients.filter(p=>!["discharged","left"].includes(p.stage)).sort((a,b)=>a.waitMinutes-b.waitMinutes);}
