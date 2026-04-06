// controls.js — UI controls, WebSocket, REST calls

import { applyJointAngles } from '/static/viewer.js';

const NUM_JOINTS = 6;
const JOINT_NAMES = ['J1 Base', 'J2 Shoulder', 'J3 Elbow', 'J4 Forearm', 'J5 Wrist', 'J6 Roll'];

// ── Build joint sliders dynamically ──────────────────────────────
const slidersContainer = document.getElementById('joint-sliders');
const sliders = [];
const valueLabels = [];

// Fetch limits from the backend so sliders match the Python config
const stateRes = await fetch('/api/state');
const state = await stateRes.json();
const limits = state.limits;   // [[min, max], ...]

for (let i = 0; i < NUM_JOINTS; i++) {
  const [lo, hi] = limits[i];
  const row = document.createElement('div');
  row.className = 'joint-row';

  const label = document.createElement('label');
  const nameSpan = document.createElement('span');
  nameSpan.textContent = JOINT_NAMES[i];
  const valSpan = document.createElement('span');
  valSpan.textContent = '0.00 rad';
  label.append(nameSpan, valSpan);
  valueLabels.push(valSpan);

  const slider = document.createElement('input');
  slider.type  = 'range';
  slider.min   = lo;
  slider.max   = hi;
  slider.step  = 0.01;
  slider.value = state.joints[i];
  sliders.push(slider);

  slider.addEventListener('input', () => {
    valSpan.textContent = parseFloat(slider.value).toFixed(2) + ' rad';
    sendJointCommand();
  });

  row.append(label, slider);
  slidersContainer.appendChild(row);
}

// Debounce slider sends — don't hammer the API on every pixel
let sendTimer = null;
function sendJointCommand() {
  clearTimeout(sendTimer);
  sendTimer = setTimeout(async () => {
    const joints = sliders.map(s => parseFloat(s.value));
    const res = await fetch('/api/joints', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ joints }),
    });
    const data = await res.json();
    if (data.end_effector) updateEEDisplay(data.end_effector);
  }, 30);  // ms debounce
}

// ── IK button ─────────────────────────────────────────────────────
document.getElementById('ik-btn').addEventListener('click', async () => {
  const target = [
    parseFloat(document.getElementById('ik-x').value),
    parseFloat(document.getElementById('ik-y').value),
    parseFloat(document.getElementById('ik-z').value),
  ];
  const res = await fetch('/api/ik', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ target }),
  });
  const data = await res.json();
  if (data.error) { alert(data.error); return; }
  // The WebSocket will push the new joint angles back to us
});

// ── Home button ───────────────────────────────────────────────────
document.getElementById('home-btn').addEventListener('click', async () => {
  const joints = new Array(NUM_JOINTS).fill(0.0);
  await fetch('/api/joints', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ joints }),
  });
});

// ── WebSocket — receive live state updates ────────────────────────
const statusEl = document.getElementById('status');
const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
let ws;

function connectWS() {
  ws = new WebSocket(`${protocol}://${location.host}/ws`);

  ws.onopen = () => {
    statusEl.className = 'connected';
    statusEl.innerHTML = '<span class="dot"></span>Connected';
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'state') {
      // Update sliders to reflect the new angles
      msg.joints.forEach((angle, i) => {
        sliders[i].value = angle;
        valueLabels[i].textContent = angle.toFixed(2) + ' rad';
      });
      // Update the 3D scene
      applyJointAngles(msg.joints);
    }
  };

  ws.onclose = () => {
    statusEl.className = '';
    statusEl.innerHTML = '<span class="dot"></span>Disconnected — retrying...';
    // Auto-reconnect after 2s
    setTimeout(connectWS, 2000);
  };
}

connectWS();

function updateEEDisplay(pos) {
  document.getElementById('ee-pos').textContent =
    `X: ${pos[0].toFixed(3)}m  Y: ${pos[1].toFixed(3)}m  Z: ${pos[2].toFixed(3)}m`;
}