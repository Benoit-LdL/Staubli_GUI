const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50, window.innerWidth / window.innerHeight, 0.01, 100
);
camera.position.set(1.2, 1.2, 1.6);
camera.lookAt(0, 0.6, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
const viewport = document.getElementById('viewport');
viewport.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(2, 4, 3);
scene.add(dirLight);
scene.add(new THREE.GridHelper(2, 20, 0x333355, 0x222244));

// TX90 kinematic structure from URDF
// Each entry: [translation from parent joint xyz, visual length for box]
const JOINTS = [
  { translation: [0,      0,     0.478], length: 0.478, color: 0xe94560 }, // j1 base
  { translation: [0.050,  0,     0    ], length: 0.050, color: 0x0f3460 }, // j2 shoulder offset
  { translation: [0,      0.050, 0.425], length: 0.425, color: 0xe94560 }, // j3 upper arm
  { translation: [0,      0,     0    ], length: 0.050, color: 0x0f3460 }, // j4 forearm (no translation)
  { translation: [0,      0,     0.425], length: 0.425, color: 0xe94560 }, // j5 lower arm
  { translation: [0,      0,     0.100], length: 0.100, color: 0x0f3460 }, // j6 wrist
];

// Rotation axes matching URDF axis xyz values
export const AXES = [
  new THREE.Vector3(0, 0, 1),  // j1 — Z
  new THREE.Vector3(0, 1, 0),  // j2 — Y
  new THREE.Vector3(0, 1, 0),  // j3 — Y
  new THREE.Vector3(0, 0, 1),  // j4 — Z
  new THREE.Vector3(0, 1, 0),  // j5 — Y
  new THREE.Vector3(0, 0, 1),  // j6 — Z
];

export const jointGroups = [];

let parent = scene;

for (let i = 0; i < 6; i++) {
  const { translation, length, color } = JOINTS[i];
  const group = new THREE.Group();
  group.position.set(...translation);
  parent.add(group);

  // Visual box representing this link
  // For joints with zero or tiny translation (j4), show a small sphere only
  if (length > 0.01) {
    const geo  = new THREE.BoxGeometry(0.05, length, 0.05);
    const mat  = new THREE.MeshPhongMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    // Box origin is at bottom — offset so it sits above the joint pivot
    mesh.position.set(0, length / 2, 0);
    group.add(mesh);
  }

  // Joint pivot marker
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 16, 16),
    new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x444444 })
  );
  group.add(sphere);

  jointGroups.push(group);
  parent = group;
}

scene.add(new THREE.AxesHelper(0.3));

// Camera orbit
let isDragging = false, prevX = 0, prevY = 0;
let theta = 0.8, phi = 0.6, radius = 2.2;

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
  radius = Math.max(0.5, Math.min(6, radius + e.deltaY * 0.002));
  updateCamera();
}, { passive: true });

function updateCamera() {
  camera.position.set(
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0.6, 0);
}
updateCamera();

export function applyJointAngles(angles) {
  for (let i = 0; i < 6; i++) {
    jointGroups[i].setRotationFromAxisAngle(AXES[i], angles[i]);
  }
}

function onResize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
onResize();

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();