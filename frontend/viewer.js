// viewer.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Scene Setup ---
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

// --- Lighting & Helpers ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(2, 4, 3);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-2, 0, -2);
scene.add(fillLight);

scene.add(new THREE.GridHelper(2, 20, 0x333355, 0x222244));

// --- Robot Definition ---
const JOINT_DEFS = [
  { name: "base_link", translation: [0,     0,     0    ], isBase: true  },
  { name: "link_1",    translation: [0,     0,     0.478]                },
  { name: "link_2",    translation: [0.050, 0,     0    ]                },
  { name: "link_3",    translation: [0,     0.050, 0.425]                },
  { name: "link_4",    translation: [0,     0,     0    ]                },
  { name: "link_5",    translation: [0,     0,     0.425]                },
  { name: "link_6",    translation: [0,     0,     0.100]                },
];

export const AXES = [
  new THREE.Vector3(0, 0, 1), 
  new THREE.Vector3(0, 1, 0), 
  new THREE.Vector3(0, 1, 0), 
  new THREE.Vector3(0, 0, 1), 
  new THREE.Vector3(0, 1, 0), 
  new THREE.Vector3(0, 0, 1), 
];

export const jointGroups = [];

// --- Loader Logic ---
const loader = new GLTFLoader();

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

async function buildArm() {
  let parent = scene;

  for (let i = 0; i < JOINT_DEFS.length; i++) {
    const def = JOINT_DEFS[i];
    const group = new THREE.Group();
    group.position.set(...def.translation);
    parent.add(group);

    const model = await loadGLB(def.name);
    if (model) {
      group.add(model);
    } else {
      const colors = [0x888888, 0xe94560, 0xe94560, 0xe94560, 0x0f3460, 0x0f3460, 0x0f3460];
      group.add(buildPlaceholder(colors[i]));
    }

    const pivot = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 12, 12),
      new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x666666 })
    );
    group.add(pivot);

    if (!def.isBase) {
      jointGroups.push(group);
    }
    parent = group;
  }
}

// Initial Build Call
buildArm();

// --- Controls & Interactivity ---
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