import {
  Engine, Scene, Vector3, Color3, Color4, ArcRotateCamera, HemisphericLight,
  DirectionalLight, MeshBuilder, StandardMaterial, PointerEventTypes, Camera
} from "@babylonjs/core";
import "../style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const status = document.querySelector<HTMLElement>("#status")!;
const fpsLabel = document.querySelector<HTMLElement>("#fps")!;
const buildButton = document.querySelector<HTMLButtonElement>("#build")!;
const resetButton = document.querySelector<HTMLButtonElement>("#reset")!;

const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: false,
  powerPreference: "low-power"
}, false);
engine.setHardwareScalingLevel(Math.max(1, (window.devicePixelRatio || 1) / 1.5));
const scene = new Scene(engine);
scene.clearColor = new Color4(0.72, 0.82, 0.88, 1);

const camera = new ArcRotateCamera("Isometric camera", -Math.PI / 4, Math.PI / 3.1, 14, new Vector3(0, 0, 0), scene);
camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
camera.attachControl(canvas, true);
camera.inputs.clear();
function updateCameraBounds() {
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  const halfHeight = 4.5;
  camera.orthoTop = halfHeight;
  camera.orthoBottom = -halfHeight;
  camera.orthoLeft = -halfHeight * aspect;
  camera.orthoRight = halfHeight * aspect;
}
updateCameraBounds();

const hemi = new HemisphericLight("Ambient", new Vector3(0, 1, 0), scene);
hemi.intensity = 0.9;
const sun = new DirectionalLight("Key light", new Vector3(-0.5, -1, 0.5), scene);
sun.intensity = 0.65;

function mat(name: string, color: Color3) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = color;
  return m;
}
function box(name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: Color3) {
  const mesh = MeshBuilder.CreateBox(name, { width: sx, height: sy, depth: sz }, scene);
  mesh.position.set(x, y, z);
  mesh.material = mat(name + " material", color);
  return mesh;
}

const floor = box("Clinic floor", 0, -0.16, 0, 8, 0.3, 7, new Color3(0.82, 0.86, 0.82));
floor.isPickable = true;
box("Back wall", 0, 1.15, -3.5, 8, 2.3, 0.18, new Color3(0.91, 0.93, 0.91)).isPickable = false;
box("Left wall", -4, 1.15, 0, 0.18, 2.3, 7, new Color3(0.83, 0.88, 0.91)).isPickable = false;
box("Reception desk", -2.35, 0.45, -1.7, 1.7, 0.9, 0.65, new Color3(0.36, 0.53, 0.62)).isPickable = false;
box("Treatment bed", 1.25, 0.38, 0.65, 2.1, 0.32, 0.9, new Color3(0.24, 0.48, 0.66)).isPickable = false;
box("Treatment pillow", 1.25, 0.62, 0.25, 0.65, 0.16, 0.55, new Color3(0.72, 0.86, 0.9)).isPickable = false;

const avatar = box("Avatar", -1.3, 0.48, 1.45, 0.48, 0.95, 0.42, new Color3(0.12, 0.38, 0.68));
const head = MeshBuilder.CreateSphere("Avatar head", { diameter: 0.42, segments: 12 }, scene);
head.position.set(-1.3, 1.18, 1.45);
head.material = mat("Avatar skin", new Color3(0.82, 0.65, 0.5));
avatar.isPickable = false;
head.isPickable = false;

let buildMode = false;
let target: Vector3 | null = null;
let placed = 0;
let fpsElapsed = 0;
let fpsFrames = 0;

function snap(value: number) { return Math.round(value * 2) / 2; }
scene.onPointerObservable.add((pointerInfo) => {
  if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) return;
  const pick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === floor);
  if (!pick?.hit || !pick.pickedPoint) {
    status.textContent = "Tap inside the clinic floor.";
    return;
  }
  const point = new Vector3(snap(pick.pickedPoint.x), 0, snap(pick.pickedPoint.z));
  if (Math.abs(point.x) > 3.7 || Math.abs(point.z) > 3.15) return;
  if (buildMode) {
    if (Math.abs(point.x - 1.25) < 1.25 && Math.abs(point.z - 0.65) < 0.75) {
      status.textContent = "That space is occupied. Choose an empty grid cell.";
      return;
    }
    if (Math.abs(point.x + 2.35) < 1.0 && Math.abs(point.z + 1.7) < 0.65) {
      status.textContent = "That space is occupied. Choose an empty grid cell.";
      return;
    }
    placed += 1;
    const placedMesh = box("Placed block " + placed, point.x, 0.32, point.z, 0.72, 0.64, 0.72, new Color3(0.28, 0.62, 0.67));
    placedMesh.isPickable = false;
    status.textContent = "Object placed at grid " + point.x.toFixed(1) + ", " + point.z.toFixed(1) + ".";
  } else {
    target = point;
    status.textContent = "Moving to selected floor position.";
  }
});

buildButton.addEventListener("click", () => {
  buildMode = !buildMode;
  buildButton.textContent = "Build mode: " + (buildMode ? "on" : "off");
  status.textContent = buildMode ? "Tap an empty grid cell to place a test block." : "Tap the floor to move.";
});
resetButton.addEventListener("click", () => {
  target = null;
  avatar.position.set(-1.3, 0.48, 1.45);
  head.position.set(-1.3, 1.18, 1.45);
  status.textContent = "Avatar returned to the starting point.";
});

engine.runRenderLoop(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  if (target) {
    const dx = target.x - avatar.position.x;
    const dz = target.z - avatar.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.06) target = null;
    else {
      const step = Math.min(distance, dt * 2.3);
      const x = avatar.position.x + (dx / distance) * step;
      const z = avatar.position.z + (dz / distance) * step;
      avatar.position.set(x, 0.48, z);
      head.position.set(x, 1.18, z);
    }
  }
  fpsFrames += 1;
  fpsElapsed += dt;
  if (fpsElapsed >= 1) {
    fpsLabel.textContent = Math.round(fpsFrames / fpsElapsed) + " FPS";
    fpsFrames = 0;
    fpsElapsed = 0;
  }
  scene.render();
});

window.addEventListener("resize", () => {
  updateCameraBounds();
  engine.resize();
});
window.addEventListener("pagehide", () => {
  scene.dispose();
  engine.dispose();
}, { once: true });
