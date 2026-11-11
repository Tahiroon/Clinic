import * as pc from "playcanvas";
import "../style.css";

type ItemKind = "chair" | "plant" | "cabinet";
type PlacedItem = { id: number; kind: ItemKind; x: number; z: number };
const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const status = document.querySelector<HTMLElement>("#status")!;
const fpsLabel = document.querySelector<HTMLElement>("#fps")!;
const loading = document.querySelector<HTMLElement>("#loading")!;
const moveButton = document.querySelector<HTMLButtonElement>("#move-mode")!;
const buildButton = document.querySelector<HTMLButtonElement>("#build-mode")!;
const caseButton = document.querySelector<HTMLButtonElement>("#case-mode")!;
const resetButton = document.querySelector<HTMLButtonElement>("#reset-avatar")!;
const buildPanel = document.querySelector<HTMLElement>("#build-panel")!;
const saveState = document.querySelector<HTMLElement>("#save-state")!;
const caseDialog = document.querySelector<HTMLDialogElement>("#case-dialog")!;
const caseFeedback = document.querySelector<HTMLElement>("#case-feedback")!;

const app = new pc.Application(canvas, {
  graphicsDeviceOptions: { antialias: false, alpha: false, powerPreference: "low-power" }
});
app.setCanvasFillMode(pc.FILLMODE_NONE);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
const resizeObserver = new ResizeObserver(() => app.resizeCanvas(canvas.clientWidth, canvas.clientHeight));
resizeObserver.observe(canvas);
app.scene.ambientLight = new pc.Color(0.76, 0.8, 0.84);

function mat(color: pc.Color) {
  const m = new pc.StandardMaterial();
  m.diffuse = color;
  m.update();
  return m;
}
const mats = {
  floor: mat(new pc.Color(0.78, 0.84, 0.82)),
  wall: mat(new pc.Color(0.91, 0.94, 0.91)),
  side: mat(new pc.Color(0.77, 0.85, 0.88)),
  wood: mat(new pc.Color(0.43, 0.31, 0.23)),
  woodLight: mat(new pc.Color(0.66, 0.49, 0.34)),
  teal: mat(new pc.Color(0.17, 0.49, 0.58)),
  blue: mat(new pc.Color(0.18, 0.38, 0.62)),
  pale: mat(new pc.Color(0.78, 0.89, 0.9)),
  green: mat(new pc.Color(0.19, 0.49, 0.34)),
  skin: mat(new pc.Color(0.72, 0.53, 0.4)),
  dark: mat(new pc.Color(0.12, 0.19, 0.25)),
  white: mat(new pc.Color(0.94, 0.95, 0.9))
};
function box(name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, material: pc.StandardMaterial, parent: pc.Entity = app.root) {
  const e = new pc.Entity(name);
  e.addComponent("model", { type: "box" });
  e.setPosition(x, y, z);
  e.setLocalScale(sx, sy, sz);
  e.model!.material = material;
  parent.addChild(e);
  return e;
}
function sphere(name: string, x: number, y: number, z: number, scale: number, material: pc.StandardMaterial) {
  const e = new pc.Entity(name);
  e.addComponent("model", { type: "sphere" });
  e.setPosition(x, y, z);
  e.setLocalScale(scale, scale, scale);
  e.model!.material = material;
  app.root.addChild(e);
  return e;
}

const camera = new pc.Entity("Isometric camera");
camera.addComponent("camera", {
  projection: pc.PROJECTION_ORTHOGRAPHIC,
  orthoHeight: 9.2,
  clearColor: new pc.Color(0.72, 0.83, 0.87),
  nearClip: 0.1,
  farClip: 100
});
camera.setPosition(8.5, 10.5, 8.5);
camera.lookAt(0, 0.35, 0);
app.root.addChild(camera);
const light = new pc.Entity("Soft key light");
light.addComponent("light", { type: "directional", intensity: 1.05 });
light.setEulerAngles(48, 35, 0);
app.root.addChild(light);

box("Clinic floor", 0, -0.16, 0, 8, 0.32, 7, mats.floor);
box("Back wall", 0, 1.25, -3.48, 8, 2.5, 0.16, mats.wall);
box("Left wall", -3.98, 1.25, 0, 0.16, 7, 2.5, mats.side);
// Reception counter and details
box("Reception base", -2.45, 0.46, -1.85, 1.65, 0.9, 0.68, mats.wood);
box("Reception top", -2.45, 0.94, -1.85, 1.78, 0.1, 0.76, mats.woodLight);
box("Reception front", -2.45, 0.47, -1.5, 1.2, 0.62, 0.025, mats.teal);
// Treatment bed, legs, mattress, pillow
box("Bed frame", 1.35, 0.3, 0.62, 2.15, 0.2, 0.92, mats.dark);
box("Bed mattress", 1.35, 0.48, 0.62, 2.1, 0.22, 0.88, mats.blue);
box("Bed pillow", 1.35, 0.62, 0.23, 0.62, 0.12, 0.48, mats.pale);
for (const x of [0.48, 2.22]) for (const z of [0.28, 0.96]) box("Bed leg", x, 0.08, z, 0.09, 0.42, 0.09, mats.dark);
// Wall art and window-like detail
box("Wall panel", 0.1, 1.8, -3.37, 1.5, 0.9, 0.035, mats.pale);
box("Wall panel inner", 0.1, 1.8, -3.33, 1.28, 0.68, 0.025, mats.teal);
box("Window", -1.35, 1.75, -3.36, 1.15, 0.85, 0.04, mats.blue);
box("Window cross", -1.35, 1.75, -3.32, 0.045, 0.82, 0.025, mats.white);

// Avatar: stylized body, head, hair, and feet
const avatar = new pc.Entity("Student avatar");
avatar.setPosition(-0.95, 0, 1.65);
app.root.addChild(avatar);
box("Avatar torso", 0, 1.0, 0, 0.48, 0.78, 0.34, mats.teal, avatar);
const avatarHead = new pc.Entity("Avatar head");
avatarHead.addComponent("model", { type: "sphere" });
avatarHead.setLocalScale(0.38, 0.4, 0.38);
avatarHead.setPosition(0, 1.62, 0);
avatarHead.model!.material = mats.skin;
avatar.addChild(avatarHead);
box("Avatar hair", 0, 1.81, -0.015, 0.36, 0.13, 0.36, mats.dark, avatar);
box("Avatar left foot", -0.14, 0.13, 0.07, 0.17, 0.2, 0.34, mats.dark, avatar);
box("Avatar right foot", 0.14, 0.13, 0.07, 0.17, 0.2, 0.34, mats.dark, avatar);

let mode: "move" | "build" = "move";
let target: pc.Vec3 | null = null;
let selected: ItemKind = "chair";
let nextId = 1;
let fpsFrames = 0, fpsElapsed = 0;
const placedEntities = new Map<number, pc.Entity>();
let placedItems: PlacedItem[] = [];
const saveKey = "therason-clinic-layout-v1";
const footprints: Record<ItemKind, { x: number; z: number; cost: number }> = {
  chair: { x: 0.62, z: 0.62, cost: 20 },
  plant: { x: 0.55, z: 0.55, cost: 15 },
  cabinet: { x: 0.85, z: 0.48, cost: 30 }
};
function makeFurniture(item: PlacedItem) {
  const group = new pc.Entity("Furniture " + item.id);
  group.setPosition(item.x, 0, item.z);
  app.root.addChild(group);
  if (item.kind === "chair") {
    box("Chair seat", 0, 0.42, 0, 0.62, 0.16, 0.62, mats.teal, group);
    box("Chair back", 0, 0.83, -0.23, 0.62, 0.7, 0.14, mats.blue, group);
    for (const x of [-0.23, 0.23]) for (const z of [-0.22, 0.22]) box("Chair leg", x, 0.19, z, 0.07, 0.38, 0.07, mats.dark, group);
  } else if (item.kind === "plant") {
    box("Plant pot", 0, 0.2, 0, 0.45, 0.4, 0.45, mats.woodLight, group);
    sphere("Plant leaves", 0, 0.75, 0, 0.58, mats.green);
    sphere("Plant leaf", 0.23, 0.92, 0.05, 0.34, mats.green);
  } else {
    box("Cabinet body", 0, 0.65, 0, 0.78, 1.3, 0.45, mats.woodLight, group);
    box("Cabinet door", 0, 0.65, 0.235, 0.68, 1.16, 0.025, mats.wood, group);
    sphere("Cabinet handle", 0.22, 0.66, 0.27, 0.07, mats.white);
  }
  placedEntities.set(item.id, group);
}
function saveLayout() {
  try {
    localStorage.setItem(saveKey, JSON.stringify({ version: 1, items: placedItems }));
    saveState.textContent = "تم الحفظ على الجهاز";
  } catch {
    saveState.textContent = "تعذر الحفظ";
  }
}
function loadLayout() {
  try {
    const raw = localStorage.getItem(saveKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { version?: number; items?: PlacedItem[] };
    if (parsed.version !== 1 || !Array.isArray(parsed.items)) return;
    placedItems = parsed.items.filter(i => i && Number.isFinite(i.x) && Number.isFinite(i.z) && i.kind in footprints).slice(0, 30);
    for (const item of placedItems) { makeFurniture(item); nextId = Math.max(nextId, item.id + 1); }
  } catch { saveState.textContent = "تعذر تحميل الحفظ"; }
}
function snap(v: number) { return Math.round(v * 2) / 2; }
function blocked(x: number, z: number, kind: ItemKind) {
  const f = footprints[kind];
  const fixed = [
    { x: 1.35, z: 0.62, sx: 2.2, sz: 1.05 },
    { x: -2.45, z: -1.85, sx: 1.9, sz: 0.9 },
    { x: -0.95, z: 1.65, sx: 0.75, sz: 0.75 }
  ];
  const overlaps = (a: number, b: number, c: number, d: number) => Math.abs(a-c) < (b+d)/2 + 0.08;
  if (Math.abs(x) > 3.45 - f.x/2 || Math.abs(z) > 2.9 - f.z/2) return true;
  if (fixed.some(o => overlaps(x,f.x,o.x,o.sx) && overlaps(z,f.z,o.z,o.sz))) return true;
  return placedItems.some(o => {
    const of = footprints[o.kind];
    return overlaps(x,f.x,o.x,of.x) && overlaps(z,f.z,o.z,of.z);
  });
}
function setMode(next: "move" | "build") {
  mode = next;
  moveButton.classList.toggle("active", mode === "move");
  buildButton.classList.toggle("active", mode === "build");
  buildPanel.hidden = mode !== "build";
  status.textContent = mode === "move" ? "اضغط على أرضية العيادة لتحريك شخصيتك." : "اختر قطعة ثم اضغط على مساحة فارغة لوضعها.";
}
function floorPoint(event: PointerEvent): pc.Vec3 | null {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  const near = camera.camera!.screenToWorld(x, y, 0.1);
  const far = camera.camera!.screenToWorld(x, y, 100);
  const direction = far.sub(near);
  if (Math.abs(direction.y) < 0.0001) return null;
  const t = -near.y / direction.y;
  if (t < 0) return null;
  const p = near.add(direction.mulScalar(t));
  if (Math.abs(p.x) > 3.8 || Math.abs(p.z) > 3.3) return null;
  return new pc.Vec3(snap(p.x), 0, snap(p.z));
}
canvas.addEventListener("pointerdown", event => {
  const p = floorPoint(event);
  if (!p) return;
  if (mode === "build") {
    if (blocked(p.x,p.z,selected)) { status.textContent = "المساحة دي مشغولة أو خارج حدود العيادة. جرّب مكاناً آخر."; return; }
    const item: PlacedItem = { id: nextId++, kind: selected, x: p.x, z: p.z };
    placedItems.push(item); makeFurniture(item); saveLayout();
    status.textContent = "تم وضع القطعة. تقدر تختار قطعة تانية أو ترجع للحركة.";
  } else {
    target = p;
    status.textContent = "الشخصية في طريقها للمكان المحدد.";
  }
});
moveButton.addEventListener("click", () => setMode("move"));
buildButton.addEventListener("click", () => setMode(mode === "build" ? "move" : "build"));
document.querySelectorAll<HTMLButtonElement>(".catalog-item").forEach(button => {
  button.addEventListener("click", () => {
    selected = button.dataset.item as ItemKind;
    document.querySelectorAll(".catalog-item").forEach(el => el.classList.toggle("selected", el === button));
    status.textContent = "تم اختيار القطعة. اضغط على مكان فارغ في العيادة.";
  });
});
resetButton.addEventListener("click", () => {
  target = null; avatar.setPosition(-0.95,0,1.65); avatar.setEulerAngles(0,0,0);
  status.textContent = "رجعنا شخصيتك لنقطة البداية.";
});
caseButton.addEventListener("click", () => {
  caseFeedback.textContent = "اختر إجابة لترى التغذية الراجعة التعليمية.";
  caseDialog.showModal();
});
document.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach(button => {
  button.addEventListener("click", () => {
    const answer = button.dataset.answer;
    if (answer === "history") {
      caseFeedback.textContent = "إجابة مناسبة. ابدأ بجمع التاريخ المرضي والتحقق من علامات الخطر قبل اختيار الفحوصات أو التدخل. هذه الحالة تدريبية وليست بديلاً عن التقييم السريري.";
    } else {
      caseFeedback.textContent = "ليس الخيار الأول الآمن. قبل التشخيص أو التمرين، اجمع المعلومات وتحقق من علامات الخطر وموانع التدخل.";
    }
  });
});
loadLayout();

app.on("update", (dt: number) => {
  if (target) {
    const pos = avatar.getPosition();
    const dx = target.x - pos.x, dz = target.z - pos.z;
    const distance = Math.hypot(dx,dz);
    if (distance < 0.07) target = null;
    else {
      const step = Math.min(distance,dt*2.5);
      avatar.setPosition(pos.x + dx/distance*step,0,pos.z + dz/distance*step);
      avatar.setEulerAngles(0,Math.atan2(dx,dz)*180/Math.PI,0);
    }
  }
  fpsFrames++; fpsElapsed += dt;
  if (fpsElapsed >= 1) {
    fpsLabel.textContent = Math.round(fpsFrames/fpsElapsed) + " FPS";
    fpsFrames = 0; fpsElapsed = 0;
  }
});
app.start();
window.setTimeout(() => loading.classList.add("done"), 350);
window.addEventListener("pagehide", () => { resizeObserver.disconnect(); app.destroy(); }, { once: true });
