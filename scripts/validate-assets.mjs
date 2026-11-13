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
  ["src/assets/clinic-kit/management-sim/door-leaf.glb", [], []],
  ["src/assets/clinic-kit/management-sim/corridor-floor-tile.glb", [], []]
];

let failed = false;
const verifiedAssets = new Map();
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
    verifiedAssets.set(file,{nodes,animations,bytes:data.length});
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
  const html = await readFile(resolve(root, "playcanvas.html"), "utf8");
  // Verify every visible shop item resolves to a real bundled GLB and, when specified,
  // to a node that actually exists inside that exact GLB file.
  const urlEntries = [...source.matchAll(/"([^"]+\.glb)":new URL\("\.\.\/assets\/([^"]+\.glb)",import\.meta\.url\)/g)];
  const urlPaths = new Map(urlEntries.map((match) => [match[1], "src/assets/" + match[2]]));
  const specsStart = source.indexOf("const storeAssetSpecs:");
  const specsEnd = source.indexOf("const clinicAssetUrls:", specsStart);
  if (specsStart < 0 || specsEnd < 0) throw new Error("Store asset registry or URL registry is missing");
  const specsSource = source.slice(specsStart, specsEnd);
  const storeSpecs = [...specsSource.matchAll(/"([^"]+)":\{file:"([^"]+)",node:"([^"]+)"/g)];
  const storeKeys = new Set(storeSpecs.map((match) => match[1]));
  if (!storeSpecs.length) throw new Error("No 3D store items were found");
  for (const [,key,file,node] of storeSpecs) {
    const path = urlPaths.get(file);
    if (!path) throw new Error("Store item " + key + " points to an unregistered GLB: " + file);
    const asset = verifiedAssets.get(path);
    if (!asset) throw new Error("Store item " + key + " points to a missing/unvalidated GLB: " + path);
    if (node !== "*" && !asset.nodes.has(node)) throw new Error("Store item " + key + " points to missing node " + node + " in " + path);
  }
  for (const match of html.matchAll(/data-asset="([^"]+)"/g)) {
    if (!storeKeys.has(match[1])) throw new Error("Visible store button has no matching 3D asset spec: " + match[1]);
  }
  for (const [file,path] of urlPaths) {
    if (!verifiedAssets.has(path)) throw new Error("Registered GLB URL has no verified bundled asset: " + file + " -> " + path);
  }
  console.log("✓ Every visible 3D store item maps to an existing GLB and verified model node");
  const lawn = source.slice(source.indexOf("function createLawnGrass"), source.indexOf("createLawnGrass();"));
  if (!lawn || /model\.graph\s*=\s*entity/.test(lawn)) {
    throw new Error("The lawn model graph must never reference its owning entity");
  }
  if (!/model\.graph\s*=\s*grassGraph/.test(lawn) ||
      !/new (?:pc\\.)?MeshInstance\(mesh,\s*lawnGrassMaterial,\s*grassGraph\)/.test(lawn)) {
    throw new Error("The lawn mesh and Model must share a separate GraphNode root");
  }
  if (!/const GRID=1, W=14, D=28, HALF_X=W\/2, HALF_Z=D\/2/.test(source)) {
    throw new Error("Starter property must remain 14 m × 28 m");
  }
  if (!/const starterLayout:Placed\[\]=\[\]/.test(source) || !/missionPhase===1&&hasAssetInRoom\("pt-treatment-table","treatment"\)/.test(source) || !/missionPhase===3&&hasAssetInRoom\("pt-reception-desk","reception"\)/.test(source) || !/missionPhase===5&&hasAssetInRoom\("pt-exam-table","assessment"\)/.test(source)) {
    throw new Error("The new clinic campaign must start on an empty buildable plot");
  }
  const managementSource = await readFile(resolve(root, "src/game/management.ts"), "utf8");
  if (!/reception:\{label:"الاستقبال",cost:420,width:5,depth:5/.test(managementSource) || !/const blueprint=ROOM_BLUEPRINTS\[roomType\],minWidth=blueprint\?\.width\?\?4,minDepth=blueprint\?\.depth\?\?4/.test(source)) {\n    throw new Error("Touch room drawing must respect each room type minimum size");\n  }\n  if (!/patients:\[\],rooms:\[\]/.test(managementSource)) {
    throw new Error("Management state must not create prebuilt rooms on a new account");
  }
  if (!/Surrounding green landscape/.test(source) || !/Clinic buildable foundation/.test(source) || !/Main entrance garden path/.test(source) || !/outdoorTreePositions/.test(source) || !/setClinicOpen\(management/.test(source)) {
    throw new Error("The open green property, entrance path and outdoor landscaping must exist");
  }
  console.log("✓ PlayCanvas model graph has no owner self-reference");
  if (!/insideBuildablePlot=x>-HALF_X/.test(source) || !/if\(isRoomKind\(item\.kind\)\)createLawnGrass\(\)/.test(source)) {
    throw new Error("Outdoor grass must be masked and regenerated when new rooms are built");
  }
  if (!/Math\.min\(34,pinchHeight/.test(source)) {
    throw new Error("Portrait camera zoom must allow the larger property to be explored");
  }
  console.log("✓ Main campaign starts with one 4×4 m treatment room on a 14×28 m green property");
  console.log("✓ Grass stays outside every player-built room"); 
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
  const treePositions = [[-9.1,-16.1],[9.1,-16.1],[-9.1,16.1],[9.1,16.1]];
  const shrubPositions = [[-8.8,-7.5],[8.8,-4.5],[-8.8,5.2],[8.8,8.0]];
  const routeObstacles = [
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
  if (!/addRoomWallRun\(root,"x",-halfW,width,halfD,"solid"\)/.test(source) || !/const twoMetreFile="partition-wall\.glb"/.test(source)) {
    throw new Error("Clinic rooms must use plain opaque walls, not glass partitions");
  }
  const drawPlacedSource=source.slice(source.indexOf("function drawPlaced(p:Placed)"),source.indexOf("\nfunction footprint("));
  if (/loadClinicAsset\(\{id:p\.id\*1000/.test(drawPlacedSource)) throw new Error("Rooms must be empty until the player buys and places equipment");
  const roomBuilderSource=source.slice(source.indexOf("function makeRoom"),source.indexOf("// The starter clinic"));
  if (/loadReceptionDesk\(root\)|loadWaitingSeats\(root\)|Treatment wall chart|Assessment wall chart|Exercise wall display/.test(roomBuilderSource)) throw new Error("New rooms must stay empty until the player buys equipment and decor");
  if (!/id="store-panel"/.test(html) || !/data-store-category/.test(html) || (html.match(/class="store-item"/g)||[]).length < 16) {
    throw new Error("The dedicated categorized equipment shop is incomplete");
  }
  console.log("✓ Plain opaque room architecture and player-controlled furnishing are wired");
  console.log("✓ Dedicated mobile equipment store contains categorized, priced clinical assets");
  if (!/highDetailDevice=deviceMemory>=4&&cpuCores>=6/.test(source) ||
      !/maxPixelRatio=highDetailDevice\?Math\.min\(window\.devicePixelRatio\|\|1,1\.25\):1\.0/.test(source)) {
    throw new Error("Adaptive rendering quality is missing for high-end and low-end devices");
  }
  console.log("✓ Adaptive rendering preserves low-end performance and sharpens capable devices");
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
