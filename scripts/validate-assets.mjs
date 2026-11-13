import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  ["src/assets/characters/Student.glb", ["Student"], ["Idle", "Walk"]],
  ["src/assets/characters/WardPatient.glb", ["WardPatient"], ["Idle", "Walk"]],
  ["src/assets/clinic-kit/hospital/physical-therapy-room-set.glb", ["TreatmentTable", "StorageCabinet", "ParallelBars", "BandRack", "ExerciseBall", "ExerciseMat", "HandWeights", "PrivacyCurtain"], []],
  ["src/assets/clinic-kit/hospital/doctors-office-set.glb", ["ExamTable", "Chair_Patient", "Desk_Doctor", "PrivacyCurtain", "Sink_Cabinet", "Wall_Chart"], []],
  ["src/assets/clinic-kit/hospital/hospital-equipment-set.glb", ["Crutches", "FirstAidBag", "OxygenTrolley", "Stretcher", "TransportChair", "WalkingFrame"], []],
  ["src/assets/clinic-kit/hospital/hospital-reception-desk.glb", ["HospitalReception"], []],
  ["src/assets/clinic-kit/hospital/hospital-waiting-room.glb", ["ChairRow_4"], []],
  ["src/assets/clinic-kit/hospital/hospital-patient-room.glb", ["HospitalRoom"], []]
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
if (failed) process.exit(1);
console.log("All required clinic GLB assets and model names validated.");
