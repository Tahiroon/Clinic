import * as pc from "playcanvas";
import "../style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const status = document.querySelector<HTMLElement>("#status")!;
const fpsLabel = document.querySelector<HTMLElement>("#fps")!;
const buildButton = document.querySelector<HTMLButtonElement>("#build")!;
const resetButton = document.querySelector<HTMLButtonElement>("#reset")!;

const app = new pc.Application(canvas, {
  graphicsDeviceOptions: { antialias: false, alpha: false, powerPreference: "low-power" }
});
app.setCanvasFillMode(pc.FILLMODE_NONE);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
const resizeObserver = new ResizeObserver(() => app.resizeCanvas(canvas.clientWidth, canvas.clientHeight));
resizeObserver.observe(canvas);
app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
app.scene.ambientLight = new pc.Color(0.72, 0.76, 0.82);

function material(color: pc.Color) {
  const m = new pc.StandardMaterial();
  m.diffuse = color;
  m.update();
  return m;
}
function box(name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: pc.Color) {
  const e = new pc.Entity(name);
  e.addComponent("model", { type: "box" });
  e.setPosition(x, y, z);
  e.setLocalScale(sx, sy, sz);
  e.model!.material = material(color);
  app.root.addChild(e);
  return e;
}

const cameraEntity = new pc.Entity("Isometric camera");
cameraEntity.addComponent("camera", {
  projection: pc.PROJECTION_ORTHOGRAPHIC,
  orthoHeight: 8,
  clearColor: new pc.Color(0.72, 0.82, 0.88),
  nearClip: 0.1,
  farClip: 100
});
cameraEntity.setPosition(8, 10, 8);
cameraEntity.lookAt(0, 0, 0);
app.root.addChild(cameraEntity);

const light = new pc.Entity("Directional light");
light.addComponent("light", { type: "directional", intensity: 1.15 });
light.setEulerAngles(45, 35, 0);
app.root.addChild(light);

box("Clinic floor", 0, -0.16, 0, 8, 0.3, 7, new pc.Color(0.82, 0.86, 0.82));
box("Back wall", 0, 1.15, -3.5, 8, 2.3, 0.18, new pc.Color(0.91, 0.93, 0.91));
box("Left wall", -4, 1.15, 0, 0.18, 2.3, 7, new pc.Color(0.83, 0.88, 0.91));
box("Reception desk", -2.35, 0.45, -1.7, 1.7, 0.9, 0.65, new pc.Color(0.36, 0.53, 0.62));
box("Treatment bed", 1.25, 0.38, 0.65, 2.1, 0.32, 0.9, new pc.Color(0.24, 0.48, 0.66));
box("Treatment pillow", 1.25, 0.62, 0.25, 0.65, 0.16, 0.55, new pc.Color(0.72, 0.86, 0.9));

const avatar = box("Avatar", -1.3, 0.48, 1.45, 0.48, 0.95, 0.42, new pc.Color(0.12, 0.38, 0.68));
const head = new pc.Entity("Avatar head");
head.addComponent("model", { type: "sphere" });
head.setLocalScale(0.42, 0.42, 0.42);
head.setPosition(-1.3, 1.18, 1.45);
head.model!.material = material(new pc.Color(0.82, 0.65, 0.5));
app.root.addChild(head);

let buildMode = false;
let target: pc.Vec3 | null = null;
let placed = 0;
let frameCount = 0;
let fpsElapsed = 0;

function snap(value: number) { return Math.round(value * 2) / 2; }
function floorPoint(event: PointerEvent): pc.Vec3 | null {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const near = cameraEntity.camera!.screenToWorld(x, y, 0.1);
  const far = cameraEntity.camera!.screenToWorld(x, y, 100);
  const direction = far.sub(near);
  if (Math.abs(direction.y) < 0.0001) return null;
  const t = -near.y / direction.y;
  if (t < 0) return null;
  const point = near.add(direction.mulScalar(t));
  if (Math.abs(point.x) > 3.7 || Math.abs(point.z) > 3.15) return null;
  return new pc.Vec3(snap(point.x), 0, snap(point.z));
}
canvas.addEventListener("pointerdown", (event) => {
  const point = floorPoint(event);
  if (!point) { status.textContent = "Tap inside the clinic floor."; return; }
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
    box("Placed block " + placed, point.x, 0.32, point.z, 0.72, 0.64, 0.72, new pc.Color(0.28, 0.62, 0.67));
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
  avatar.setPosition(-1.3, 0.48, 1.45);
  head.setPosition(-1.3, 1.18, 1.45);
  status.textContent = "Avatar returned to the starting point.";
});

app.on("update", (dt: number) => {
  if (target) {
    const current = avatar.getPosition();
    const dx = target.x - current.x;
    const dz = target.z - current.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.06) target = null;
    else {
      const step = Math.min(distance, dt * 2.3);
      const nextX = current.x + (dx / distance) * step;
      const nextZ = current.z + (dz / distance) * step;
      avatar.setPosition(nextX, 0.48, nextZ);
      head.setPosition(nextX, 1.18, nextZ);
    }
  }
  frameCount += 1;
  fpsElapsed += dt;
  if (fpsElapsed >= 1) {
    fpsLabel.textContent = Math.round(frameCount / fpsElapsed) + " FPS";
    frameCount = 0;
    fpsElapsed = 0;
  }
});
app.start();

window.addEventListener("pagehide", () => resizeObserver.disconnect(), { once: true });
window.addEventListener("pagehide", () => app.destroy(), { once: true });
