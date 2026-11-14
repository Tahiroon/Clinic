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
  ["src/assets/clinic-kit/management-sim/corridor-floor-tile.glb", [], []],
  ["src/assets/clinic-kit/hospital/hospital-signage-set.glb", [], []],
  ["src/assets/clinic-kit/hospital/hospital-gift-shop-set.glb", [], []],
  ["src/assets/clinic-kit/hospital/hospital-bed-bay.glb", [], []],
  ["src/assets/clinic-kit/hospital/hospital-lab-set.glb", [], []],
  ["src/assets/clinic-kit/hospital/x-ray-room-set.glb", [], []],
  ["src/assets/clinic-kit/hospital/pharmacy-counter.glb", [], []],
  ["src/assets/clinic-kit/hospital/baby-ward-set.glb", [], []]
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
  if (/function createLawnGrass|lawnGrassMaterial|tuftBudget|Layered landscape turf island/.test(source)) {
    throw new Error("The artificial grass-blade mesh must be removed from the outdoor world");
  }
  for (const required of [
    "Small outer landscape","Arrival road","Clinic pedestrian approach",
    "Clinic buildable foundation","Soft sculpted tree crown","Clinic identity sign",
    "const starterLayout:Placed[]=","kind:\"reception\"","kind:\"assessment\"","kind:\"treatment\"","kind:\"gym\"",
    "pt-reception-desk","pt-waiting-bench","pt-exam-table","pt-patient-chair","pt-treatment-table","pt-parallel-bars"
  ]) {
    if (!source.includes(required)) throw new Error("The compact cutaway clinic starter scene is missing " + required);
  }
  if (!/desiredOrthoHeight=aspect<\.9\?16\.5:aspect<1\.2\?15:13\.5/.test(source) ||
      !/cameraTarget\.z\+\(focus\?-6\.5:-11\.5\)/.test(source)) {
    throw new Error("Portrait camera must prioritise readable clinic rooms over the empty outdoor property");
  }
  if (/West clinic boundary|East clinic boundary|Rear clinic boundary|Main gate masonry pier/.test(source)) {
    throw new Error("The starter clinic must not be hidden behind a perimeter fence");
  }
  console.log("✓ Compact cutaway clinic, prebuilt starter rooms and a small outdoor arrival area are present");
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.z < b.z + b.d && a.z + a.d > b.z;
  const routeObstacles = [];
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
  if (/starterFurniture|const furniture/.test(source)) {
    throw new Error("Empty rooms must not retain invisible legacy furniture collision blockers");
  }
  if (!source.includes("return placed.some(p=>!isRoomKind(p.kind)&&rectanglesOverlap(a,footprintAt")) {
    throw new Error("Placement collision must use actual placed-object footprints, not assumed starter furniture");
  }
  if (/drawAssetFallback|Fallback prop ·/.test(source)) {
    throw new Error("Store equipment must never silently substitute procedural fake models for the real GLB");
  }
  if (!/if\(patientNpc\.enabled&&patientTarget&&patientStepTarget\)/.test(source) ||
      !/patientStepTarget=first\?new Vec3\(first\.x,0,first\.z\):null/.test(source) ||
      !/transitionHumanoid\(patientRig,true\)/.test(source) ||
      !/patientNpc\.setLocalPosition\(x,0,z\)/.test(source)) {
    throw new Error("Patient movement routes must be executed with animated, collision-aware waypoint movement");
  }
  console.log("✓ Real GLB-only store placement and executable patient navigation are wired");
  console.log("✓ Player physiotherapist, patient flow, optional receptionist upgrade, economy and simulation controls are wired");
  console.log("✓ Rooms support touch drag-to-draw with variable dimensions");
  if (!/addRoomWallRun\(root,"x",-halfW,width,halfD,"solid"\)/.test(source) ||
      !/Recessed wall panel shadow line/.test(source) || !/Raised wall panel face/.test(source) ||
      !/Wall protective skirting/.test(source) || !/Wall top coping/.test(source)) {
    throw new Error("Clinic rooms must use the restrained recessed-panel wall system");
  }
  if (!/Clinic glazed entrance left leaf/.test(source) ||
      !/Clinic terracotta roof left slope/.test(source) || !/THERASON sign shadow backing/.test(source)) {
    throw new Error("Starter clinic pavilion facade must include its layered entrance and roof identity");
  }
  if (!/SHADOW_PCSS_32F/.test(source) || !/shadowResolution=2048/.test(source) ||
      !/shadowSamples=12/.test(source) || !/shadowBlockerSamples=6/.test(source) ||
      !/intensity:1\.16/.test(source) || !/ambientLight=new Color\(\.62,\.66,\.69\)/.test(source) ||
      !/addContactShadow/.test(source) || !/avatarContactShadow/.test(source) ||
      !/Clinical equipment contact shadow/.test(source) || !/Placed furnishing contact shadow/.test(source) ||
      !/castShadows=highDetailDevice/.test(source) || !/receiveShadows=highDetailDevice/.test(source) ||
      !/groundY=\.052/.test(source) || !/\.25,\.006\)/.test(source)) {
    throw new Error("Adaptive real and contact shadow systems must remain enabled");
  }
  const drawPlacedSource=source.slice(source.indexOf("function drawPlaced(p:Placed)"),source.indexOf("\nfunction footprint("));
  if (/loadClinicAsset\(\{id:p\.id\*1000/.test(drawPlacedSource)) throw new Error("Rooms must be empty until the player buys and places equipment");
  const roomBuilderSource=source.slice(source.indexOf("function makeRoom"),source.indexOf("// The starter clinic"));
  if (/loadReceptionDesk\(root\)|loadWaitingSeats\(root\)|Treatment wall chart|Assessment wall chart|Exercise wall display/.test(roomBuilderSource)) throw new Error("New rooms must stay empty until the player buys equipment and decor");
  if (!/id="store-panel"/.test(html) || !/data-store-category/.test(html) || !/id="store-grid"/.test(html) || !/id="store-search"/.test(html) || (html.match(/data-store-category=/g)||[]).length < 8 || !/function renderStoreCatalog\(\)/.test(source) || storeSpecs.length < 30) {
    throw new Error("The data-driven categorized real-asset shop, search or expanded inventory is incomplete");
  }
  console.log("✓ Restrained recessed-panel rooms and warm plaster/stone/timber clinic architecture are wired");
  console.log("✓ High-end PCSS shadows and low-end contact-shadow fallback are wired");
  console.log("✓ Dedicated mobile equipment store contains categorized, priced clinical assets");
  if (!/function showStorePreview\(key:string\)/.test(source) ||
      !/getClinicContainer\(url\)\.then\(asset=>/.test(source) ||
      !/id="store-preview"/.test(html) || !/id="store-place-selected"/.test(html) ||
      !/id="store-rotate-selected"/.test(html) || !/app\.on\("postrender"/.test(source) || !/drawImage\(canvas/.test(source) || !/storeThumbnailCanvas\.toDataURL\("image\/webp",\.72\)/.test(source) ||
      !/storeThumbnailCache/.test(source) || /class="store-item-art art-/.test(html)) {
    throw new Error("The shop must preview the exact bundled GLB model before placement, not use fake product drawings");
  }
  if (!/storePreviewGeneration/.test(source) || !/clearStorePreview\(\)/.test(source) ||
      !/storePreviewRoot\.destroy\(\)/.test(source)) {
    throw new Error("Store preview lifecycle must cancel stale loads and release preview entities");
  }
  console.log("✓ Store preview uses the same verified GLB model as placement and cleans up safely");
  if (!/const gaitLaneX=4\.2,gaitLaneZ=-17\.8/.test(source) ||
      !/Outdoor physiotherapy gait lane/.test(source) || !/Gait lane walking surface/.test(source)) {
    throw new Error("The outdoor gait-training lane must be a real part of the district landscape");
  }
  if (!/Clinic entrance gate lintel/.test(source) || !/Arrival court paving/.test(source) ||
      !/West clinic boundary/.test(source) || !/East clinic boundary/.test(source) ||
      !/Rear clinic boundary/.test(source) || !/Main gate masonry pier/.test(source)) {
    throw new Error("The clinic must be enclosed by substantial masonry walls with a readable public gate");
  }
  console.log("✓ District arrival road, clinic promenade, full masonry enclosure and gate are present");
  if (!/highDetailDevice=deviceMemory>=4&&cpuCores>=6/.test(source) ||
      !/maxPixelRatio=highDetailDevice\?Math\.min\(window\.devicePixelRatio\|\|1,1\.25\):Math\.min\(window\.devicePixelRatio\|\|1,\.9\)/.test(source)) {
    throw new Error("Adaptive rendering quality is missing for high-end and low-end devices");
  }
  console.log("✓ Adaptive rendering preserves low-end performance and sharpens capable devices");
  if (!/id="camera-zoom-in"/.test(html) || !/id="camera-zoom-out"/.test(html) || !/id="camera-reset"/.test(html) ||
      !/zoomCamera\(\.82\)/.test(source) || !/zoomCamera\(1\.22\)/.test(source) ||
      !/addEventListener\("wheel"/.test(source)) {
    throw new Error("Accessible one-handed zoom, recenter and desktop wheel controls are required");
  }
  if (!/const gaitLaneX=4\.2,gaitLaneZ=-17\.8/.test(source) ||
      !/Outdoor physiotherapy gait lane/.test(source) || !/Gait lane walking surface/.test(source)) {
    throw new Error("The outdoor gait-training lane must be part of the expanded district");
  }
  if (!/Clinic entrance gate lintel/.test(source) || !/Arrival court paving/.test(source) ||
      !/West clinic boundary/.test(source) || !/East clinic boundary/.test(source) ||
      !/Rear clinic boundary/.test(source) || !/Main gate masonry pier/.test(source)) {
    throw new Error("The clinic must be enclosed by substantial masonry walls with a readable public gate");
  }
  console.log("✓ District arrival, gait-training area and complete masonry property enclosure are present");
  for (const required of ["waitingPatientVisuals", "loadHumanoid(characterAssets.physiotherapist,avatar", "loadHumanoid(characterAssets.patient,root", "loadHumanoid(characterAssets.receptionist,receptionistNpc", "receptionistNpc.enabled=management.receptionistOwned", "registerPatient(management,Number(button.dataset.registerPatient))", "recoverInterruptedSessions(management)", "completePatientSession(management,activeSessionPatientId,sessionScore)"]) {
    if (!source.includes(required)) throw new Error("Visible staff/patient simulation is missing " + required);
  }
  console.log("✓ Player physiotherapist and waiting patients have visible character instances");
  const clinicalSource=source.slice(source.indexOf("const patientBriefs:"),source.indexOf("function renderStep()"));
  for (const need of ["pain:","mobility:","post_op:","sports:"]) {
    if (!clinicalSource.includes(need)) throw new Error("The clinical encounter is missing the " + need + " patient scenario");
  }
  if (!/patientBriefs\[activePatient\.need\]/.test(source)) {
    throw new Error("The learning encounter must show a brief that matches the actual patient's case type");
  }
  if (/ألماً بعد رفع جسم ثقيل/.test(clinicalSource)) {
    throw new Error("Generic clinical prompts must not contradict the simulated patient's case");
  }
  console.log("✓ Clinical learning prompts match the patient case shown in the session");

} catch (error) {
  failed = true;
  console.error("✗ PlayCanvas scene graph regression: " + (error instanceof Error ? error.message : String(error)));
}
if (failed) process.exit(1);
console.log("All required clinic GLB assets and scene graph checks passed.");
