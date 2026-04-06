// viewer.js — Three.js scene, camera, robot arm visualization

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50, window.innerWidth / window.innerHeight, 0.01, 100
);
camera.position.set(0.8, 0.8, 1.2);
camera.lookAt(0, 0.3, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
const viewport = document.getElementById('viewport');
viewport.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(2, 4, 3);
scene.add(dirLight);

// Grid helper
scene.add(new THREE.GridHelper(2, 20, 0x333355, 0x222244));

// ── Simple placeholder arm built from boxes ──────────────────────
// Each link is a box whose length represents the arm segment.
// The pivot (joint) is at the BOTTOM of each box.
// Replace these with your actual GLTF models later.

const LINK_LENGTHS = [0.1, 0.2, 0.2, 0.15, 0.1, 0.08]; // meters, matches ik_solver.py
const LINK_COLORS  = [0xe94560, 0x0f3460, 0x16213e, 0xe94560, 0x0f3460, 0x16213e];

// jointGroups[i] is the THREE.Group you rotate to move joint i.
// Each group's origin is at the joint pivot.
export const jointGroups = [];

let parent = scene;
let cumulativeHeight = 0;

for (let i = 0; i < 6; i++) {
  const len = LINK_LENGTHS[i];
  const group = new THREE.Group();
  group.position.set(0, cumulativeHeight, 0);
  parent.add(group);

  // The visual box: sits above the pivot, centered at len/2
  const geo  = new THREE.BoxGeometry(0.04, len, 0.04);
  const mat  = new THREE.MeshPhongMaterial({ color: LINK_COLORS[i] });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0, len / 2, 0);
  group.add(mesh);

  // Small sphere at the joint pivot to show the rotation point
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 16, 16),
    new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x444444 })
  );
  group.add(sphere);

  jointGroups.push(group);
  parent = group;                  // next link parents to this one
  cumulativeHeight = len;          // next group starts at the top of this link
}

// Coordinate axes helper at world origin
scene.add(new THREE.AxesHelper(0.3));

// ── Camera orbit (simple mouse drag) ────────────────────────────
let isDragging = false, prevX = 0, prevY = 0;
let theta = 0.8, phi = 0.6, radius = 1.8;

renderer.domElement.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
window.addEventListener('mouseup',   () => { isDragging = false; });
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  theta -= (e.clientX - prevX) * 0.01;
  phi    = Math.max(0.1, Math.min(Math.PI - 0.1, phi - (e.clientY - prevY) * 0.01));
  prevX  = e.clientX; prevY = e.clientY;
  updateCamera();
});
renderer.domElement.addEventListener('wheel', e => {
  radius = Math.max(0.5, Math.min(5, radius + e.deltaY * 0.002));
  updateCamera();
}, { passive: true });

function updateCamera() {
  camera.position.set(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0.3, 0);
}
updateCamera();

// ── Apply joint angles to the visualization ──────────────────────
// axis[i] is the rotation axis for joint i (matches ik_solver.py)
const AXES = [
  new THREE.Vector3(0, 1, 0),  // j1 — yaw
  new THREE.Vector3(1, 0, 0),  // j2 — pitch
  new THREE.Vector3(1, 0, 0),  // j3 — pitch
  new THREE.Vector3(0, 1, 0),  // j4 — yaw
  new THREE.Vector3(1, 0, 0),  // j5 — pitch
  new THREE.Vector3(0, 1, 0),  // j6 — yaw
];

export function applyJointAngles(angles) {
  for (let i = 0; i < 6; i++) {
    jointGroups[i].setRotationFromAxisAngle(AXES[i], angles[i]);
  }
}

// ── Resize handler ────────────────────────────────────────────────
function onResize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
onResize();

// ── Render loop ───────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();