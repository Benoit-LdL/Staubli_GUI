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

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(2, 4, 3);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-2, 0, -2);
scene.add(fillLight);
scene.add(new THREE.GridHelper(2, 20, 0x333355, 0x222244));

// TX90 joint structure from URDF
// translation: xyz offset of this joint FROM its parent joint
// These are the <origin xyz="..."> values from each <joint> definition
const JOINT_DEFS = [
  { name: "base_link", translation: [0,     0,     0    ], isBase: true  },
  { name: "link_1",    translation: [0,     0,     0.478]                },
  { name: "link_2",    translation: [0.050, 0,     0    ]                },
  { name: "link_3",    translation: [0,     0.050, 0.425]                },
  { name: "link_4",    translation: [0,     0,     0    ]                },
  { name: "link_5",    translation: [0,     0,     0.425]                },
  { name: "link_6",    translation: [0,     0,     0.100]                },
];

// Rotation axes from URDF <axis xyz="..."> — one per revolute joint
// Index 0 = joint_1 (moves link_1), etc.
export const AXES = [
  new THREE.Vector3(0, 0, 1),  // joint_1 — Z
  new THREE.Vector3(0, 1, 0),  // joint_2 — Y
  new THREE.Vector3(0, 1, 0),  // joint_3 — Y
  new THREE.Vector3(0, 0, 1),  // joint_4 — Z
  new THREE.Vector3(0, 1, 0),  // joint_5 — Y
  new THREE.Vector3(0, 0, 1),  // joint_6 — Z
];

// jointGroups[i] is the group you rotate for joint i+1
// (index 0 = joint_1 which rotates link_1, etc.)
export const jointGroups = [];

// Load GLTFLoader from CDN — must match the Three.js r128 version
const loader = new THREE.GLTFLoader ? new THREE.GLTFLoader() : null;

function buildPlaceholder(color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.1, 0.05),
    new THREE.MeshPhongMaterial({ color })
  );
  mesh.position.set(0, 0.05, 0);
  return mesh;
}

async function loadGLB(name) {
  return new Promise((resolve) => {
    if (!loader) { resolve(null); return; }
    loader.load(
      `/models/${name}.glb`,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => {
        console.warn(`Could not load ${name}.glb — using placeholder`, err);
        resolve(null);
      }
    );
  });
}

// Build the chain: each group is parented to the previous one
// so rotations propagate down the chain correctly
async function buildArm() {
  let parent = scene;

  for (let i = 0; i < JOINT_DEFS.length; i++) {
    const def = JOINT_DEFS[i];

    // Each group is positioned at the joint origin relative to its parent
    const group = new THREE.Group();
    group.position.set(...def.translation);
    parent.add(group);

    // Load the mesh for this link
    const model = await loadGLB(def.name);
    if (model) {
      group.add(model);
    } else {
      // Fallback placeholder so the chain is still visible
      const colors = [0x888888, 0xe94560, 0xe94560, 0xe94560, 0x0f3460, 0x0f3460, 0x0f3460];
      group.add(buildPlaceholder(colors[i]));
    }

    // Joint pivot marker (small white sphere at the joint origin)
    const pivot = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 12, 12),
      new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x666666 })
    );
    group.add(pivot);

    // The base link doesn't get a jointGroup entry since it doesn't rotate
    if (!def.isBase) {
      jointGroups.push(group);
    }

    parent = group;
  }
}

// GLTFLoader isn't bundled in the r128 CDN build of Three.js
// Load it separately from the examples
const gltfScript = document.createElement('script');
gltfScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
gltfScript.onload = () => buildArm();
document.head.appendChild(gltfScript);

// Camera orbit controls
let isDragging = false, prevX = 0, prevY = 0;
let theta = 0.8, phi = 0.6, radius = 2.2;

renderer.domElement.addEventListener('mousedown', e => {
  isDragging = true; prevX = e.clientX; prevY = e.clientY;
});
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  theta -= (e.clientX - prevX) * 0.01;
  phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - (e.clientY - prevY) * 0.01));
  prevX = e.clientX; prevY = e.clientY;
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
  // jointGroups has 6 entries (link_1 through link_6)
  // angles has 6 values (joint_1 through joint_6)
  for (let i = 0; i < 6; i++) {
    if (jointGroups[i]) {
      jointGroups[i].setRotationFromAxisAngle(AXES[i], angles[i]);
    }
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