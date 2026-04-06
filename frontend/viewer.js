// viewer.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- LERPING ---
let targetAngles = [0, 0, 0, 0, 0, 0];
let currentDisplayAngles = [0, 0, 0, 0, 0, 0];
const LERP_FACTOR = 0.05;

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(
  50, window.innerWidth / window.innerHeight, 0.01, 100
);
camera.position.set(1.2, 1.2, 1.6);
camera.lookAt(0, 0.6, 0);

const canvas = document.createElement('canvas');
const context = canvas.getContext('webgl2');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, context: context, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
const viewport = document.getElementById('viewport');
viewport.appendChild(renderer.domElement);

// --- Lighting & Helpers (RECONFIGURED FOR DEPTH) ---
// 1. Reduce Ambient Light: This prevents the "blob" look by allowing shadows to exist.
scene.add(new THREE.AmbientLight(0xffffff, 0.3)); 

// 2. Main Key Light: Provides the primary illumination and creates highlights.
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// 3. Fill Light: Softens the dark side of the robot.
const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
fillLight.position.set(-5, 2, -5);
scene.add(fillLight);

scene.add(new THREE.GridHelper(2, 20, 0x333355, 0x222244));
const axesHelper = new THREE.AxesHelper(0.5);
scene.add(axesHelper);

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
const loader = new GLTFLoader();

async function loadGLB(name) {
  return new Promise((resolve) => {
    loader.load(
      `/models/glb/${name}.glb`,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            // SWITCHED TO PHONG: Adds specular highlights for depth.
            child.material = new THREE.MeshPhongMaterial({
              color: 0xFFCC00,    // Stäubli Yellow
              specular: 0x444444, // Highlights to show mesh edges
              shininess: 40       // Polished industrial look
            });
          }
        });
        resolve(model);
      },
      undefined,
      (err) => { resolve(null); }
    );
  });
}

// ... (Rest of buildArm, applyJointAngles, and Controls logic remains the same) ...
async function buildArm() {
  let parent = scene;
  for (let i = 0; i < JOINT_DEFS.length; i++) {
    const def = JOINT_DEFS[i];
    const group = new THREE.Group();
    group.position.set(...def.translation);
    parent.add(group);
    const model = await loadGLB(def.name);
    if (model) group.add(model);
    if (!def.isBase) jointGroups.push(group);
    if (def.isBase) {
      group.rotation.x = -Math.PI / 2;
      group.rotation.z = -Math.PI / 2;
    }
    parent = group;
  }
}
buildArm();

function animate() {
  requestAnimationFrame(animate);
  for (let i = 0; i < 6; i++) {
    if (jointGroups[i]) {
      const diff = targetAngles[i] - currentDisplayAngles[i];
      currentDisplayAngles[i] += diff * LERP_FACTOR;
      jointGroups[i].setRotationFromAxisAngle(AXES[i], currentDisplayAngles[i]);
    }
  }
  renderer.render(scene, camera);
}
animate();

export function applyJointAngles(angles) {
  for (let i = 0; i < 6; i++) { targetAngles[i] = angles[i]; }
}

function onResize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
onResize();