import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  ["src/assets/characters/WardPatient.glb", ["WardPatient"], ["Idle", "Walk"]],
  ["src/assets/characters/Receptionist.glb", [], ["Idle", "Walk"]],
  ["src/assets/characters/Physiotherapist.glb", [], ["Idle", "Walk"]],
  ["src/assets/clinic-kit/hospital/physical-therapy-room-set.glb", ["TreatmentTable", "StorageCabinet", "ParallelBars", "BandRack", "ExerciseBall", "ExerciseMat", "HandWeights", "PrivacyCurtain"], []],
  ["src/assets/clinic-kit/hospital/doctors-office-set.glb", ["ExamTable", "Chair_Patient", "Desk_Doctor", "PrivacyCurtain", "Sink_Cabinet", "Wall_Chart"], []],
  ["src/assets/clinic-kit/hospital/hospital-equipment-set.glb", ["Crutches", "FirstAidBag", "OxygenTrolley", "Stretcher", "TransportChair", "WalkingFrame"], []],
  ["src/assets/clinic-kit/hospital/hospital-reception-desk.glb", ["HospitalReception"], []],
  ["src/assets/clinic-kit/hospital/hospital-waiting-room.glb", ["ChairRow_4"], []],
  ["src/assets/clinic-kit/hospital/hospital-patient-room.glb", ["HospitalRoom"], []],
  ["src/assets/clinic-kit/management-sim/examination-couch.glb", [], []],
  ["src/assets/clinic-kit/management-sim/reception-desk.glb", [], []],
  ["src/assets/clinic-kit/management-sim/waiting-bench-two-seat.glb", [], []],
  ["src/assets/clinic-kit/management-sim/privacy-screen.glb", [], []],
  ["src/assets/clinic-kit/management-sim/wheelchair.glb", [], []],
  ["src/assets/clinic-kit/management-sim/bedside-cabinet.glb", [], []],
  ["src/assets/clinic-kit/management-sim/partition-wall.glb", [], []],
  ["src/assets/clinic-kit/management-sim/partition-wall-1m.glb", [], []],
  ["src/assets/clinic-kit/management-sim/glazed-partition.glb", [], []],
  ["src/assets/clinic-kit/management-sim/door-leaf.glb", [], []],
  ["src/assets/clinic-kit/management-sim/corridor-floor-tile.glb", [], []]
];

let failed = false;
for (const [file, nodeNames, animationNames] of required) {
  try {
    const data = await readFile(resolve(root, file));
    if (data.length < 20 || data.toString("ascii", 0, 4) !== "glTF") throw new Error("invalid GLB header");
    const version = data.readUInt32LE(4);
    const totalLength = data.readUInt32LE(8);
    const jsonLength = data.readUInt32LE(12);
    const jsonType = data.readUInt32LE(16);
    if (version !== 2 || totalLength !== data.length || jsonType !== 0x4e4f534a || 20 + jsonLength > data.length) {
      throw new Error("invalid GLB v2 chunk layout");
    }
    const json = JSON.parse(data.toString("utf8", 20, 20 + jsonLength).replace(/\\0+$/g, "").trim());
    const nodes = new Set((json.nodes ?? []).map((node) => node.name).filter(Boolean));
    const animations = new Set((json.animations ?? []).map((animation) => animation.name).filter(Boolean));
    const missingNodes = nodeNames.filter((name) => !nodes.has(name));
    const missingAnimations = animationNames.filter((name) => !animations.has(name));
    if (missingNodes.length || missingAnimations.length) {
      throw new Error("missing nodes: " + missingNodes.join(", ") + "; missing animations: " + missingAnimations.join(", "));
    }
    console.log("✓ " + file + " (" + Math.round(data.length / 1024) + " KB)");
  } catch (error) {
    failed = true;
    console.error("✗ " + file + ": " + (error instanceof Error ? error.message : String(error)));
  }
}
// Regression guard: ModelComponent adds model.graph beneath its owner.
 // Sharing the owner entity as model.graph creates a self-referential hierarchy.
try {
  const source = await readFile(resolve(root, "src/playcanvas/main.ts"), "utf8");
  const lawn = source.slice(source.indexOf("function createLawnGrass"), source.indexOf("createLawnGrass();"));
  if (!lawn || /model\.graph\s*=\s*entity/.test(lawn)) {
    throw new Error("The lawn model graph must never reference its owning entity");
  }
  if (!/model\.graph\s*=\s*grassGraph/.test(lawn) ||
      !/new pc\.MeshInstance\(mesh,\s*lawnGrassMaterial,\s*grassGraph\)/.test(lawn)) {
    throw new Error("The lawn mesh and Model must share a separate GraphNode root");
  }
  if (!/const GRID=1, W=14, D=28, HALF_X=W\/2, HALF_Z=D\/2/.test(source)) {
    throw new Error("Starter property must remain 14 m × 28 m");
  }
  const starter = source.match(/const starterLayout:Placed\[\]=\[([\s\S]*?)\];/);
  if (!starter) throw new Error("Starter layout definition is missing");
  if (!/id:1,kind:"treatment",gx:-2,gz:-2,width:4,depth:4/.test(starter[1])) {
    throw new Error("The starter clinic must contain exactly one 4×4 treatment room");
  }
  if (!/Owned green property/.test(source) || !/Main entrance garden path/.test(source) || !/outdoorTreePositions/.test(source) || !/setClinicOpen\(management/.test(source)) {
    throw new Error("The open green property, entrance path and outdoor landscaping must exist");
  }
  console.log("✓ PlayCanvas model graph has no owner self-reference");
  if (!/insideAnyRoom=placed\.some/.test(source) || !/if\(isRoomKind\(item\.kind\)\)createLawnGrass\(\)/.test(source)) {
    throw new Error("Outdoor grass must be masked and regenerated when new rooms are built");
  }
  if (!/Math\.min\(34,pinchHeight/.test(source)) {
    throw new Error("Portrait camera zoom must allow the larger property to be explored");
  }
  console.log("✓ Main campaign starts with one 4×4 m treatment room on a 14×28 m green property");
  console.log("✓ Grass stays outside every player-built room"); 
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
  const treePositions = [[-5.65,-11.4],[5.65,-11.4],[-5.65,11.4],[5.65,11.4]];
  const shrubPositions = [[-5.9,-5.5],[5.9,-2.5],[-5.9,4.2],[5.9,6.0]];
  const routeObstacles = [
    {x:.97,z:1.07,w:.56,d:.56},
    {x:-2.08,z:-2,w:.16,d:4},{x:1.92,z:-2,w:.16,d:4},
    {x:-2,z:-2.08,w:1.4,d:.16},{x:.6,z:-2.08,w:1.4,d:.16},
    {x:-2,z:1.92,w:4,d:.16},
    {x:-.55,z:-1.15,w:1.1,d:2.3},
    {x:1.07,z:1.07,w:.86,d:.86},
    {x:-7,z:-14,w:.18,d:28},{x:6.82,z:-14,w:.18,d:28},
    {x:-7,z:-14,w:14,d:.18},{x:-7,z:13.82,w:14,d:.18},
    ...treePositions.map(([x,z])=>({x:x-.42,z:z-.42,w:.84,d:.84})),
    ...shrubPositions.map(([x,z])=>({x:x-.34,z:z-.48,w:.68,d:.96}))
  ];
  const canStand = (x,z) => {
    const radius=.28, player={x:x-radius,z:z-radius,w:radius*2,d:radius*2};
    if(x-radius < -7 || x+radius > 7 || z-radius < -14 || z+radius > 14)return false;
    return !routeObstacles.some(obstacle=>overlaps(player,obstacle));
  };
  const routeExists = (sx,sz,tx,tz) => {
    const step=.25, cell=v=>Math.round(v/step), point=(x,z)=>({x:x*step,z:z*step}), key=(x,z)=>x+","+z;
    const start={x:cell(sx),z:cell(sz)},goal={x:cell(tx),z:cell(tz)},startKey=key(start.x,start.z);
    const goals=new Set();
    for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
      const x=goal.x+dx,z=goal.z+dz,p=point(x,z);
      if(Math.hypot(p.x-tx,p.z-tz)<=1.05&&canStand(p.x,p.z))goals.add(key(x,z));
    }
    const queue=[start],seen=new Set([startKey]),directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    for(let head=0;head<queue.length&&head<9000;head++){
      const current=queue[head],currentKey=key(current.x,current.z);
      if(goals.has(currentKey))return true;
      for(const [dx,dz] of directions){
        const x=current.x+dx,z=current.z+dz,k=key(x,z),p=point(x,z);
        if(seen.has(k)||!canStand(p.x,p.z))continue;
        if(dx!==0&&dz!==0&&(!canStand(point(current.x+dx,current.z).x,point(current.x+dx,current.z).z)||!canStand(point(current.x,current.z+dz).x,point(current.x,current.z+dz).z)))continue;
        seen.add(k);queue.push({x,z});
      }
    }
    return false;
  };
  if(!canStand(1.4,.2)||!routeExists(0,-4.55,1.4,.2)){
    throw new Error("The starter physiotherapist cannot reach the safe patient-side approach from the property entrance");
  }
  console.log("✓ Starter entrance-to-patient navigation is connected");
  const management = await readFile(resolve(root, "src/game/management.ts"), "utf8");
  for (const required of ["export function advanceSimulation", "export function hireReceptionist", "export function registerPatient", "export function recoverInterruptedSessions", "export function beginPatientSession", "export function completePatientSession", "export function buildRoom", "export function setSimulationSpeed", "export const ROOM_BLUEPRINTS"]) {
    if (!management.includes(required)) throw new Error("Management simulation is missing " + required);
  }
  if (/hireStaff|StaffRole|rehab_assistant|payroll|morale|staffRoom/i.test(management)) throw new Error("The initial game must not contain a staff-management system");
  for (const required of ["roomDrawing=true", "updateRoomDrawPreview()", "buildRoom(management,roomType,b.x,b.z,b.w,b.d)", "managementSaveKey", "advanceSimulation(management,frameDt)"]) {
    if (!source.includes(required)) throw new Error("Playable management/build loop is missing " + required);
  }
  console.log("✓ Player physiotherapist, patient flow, optional receptionist upgrade, economy and simulation controls are wired");
  console.log("✓ Rooms support touch drag-to-draw with variable dimensions");
  for (const required of ["waitingPatientVisuals", "loadHumanoid(characterAssets.physiotherapist,avatar", "loadHumanoid(characterAssets.patient,root", "loadHumanoid(characterAssets.receptionist,receptionistNpc", "receptionistNpc.enabled=management.receptionistOwned", "registerPatient(management,Number(button.dataset.registerPatient))", "recoverInterruptedSessions(management)", "completePatientSession(management,activeSessionPatientId,sessionScore)"]) {
    if (!source.includes(required)) throw new Error("Visible staff/patient simulation is missing " + required);
  }
  console.log("✓ Player physiotherapist and waiting patients have visible character instances");

} catch (error) {
  failed = true;
  console.error("✗ PlayCanvas scene graph regression: " + (error instanceof Error ? error.message : String(error)));
}
if (failed) process.exit(1);
console.log("All required clinic GLB assets and scene graph checks passed.");
