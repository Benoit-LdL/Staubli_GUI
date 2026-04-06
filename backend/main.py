import json
import asyncio
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List

from robot_state import robot, JOINT_LIMITS
from ik_solver import solve_ik, forward_kinematics

app = FastAPI(title="Robot Arm Controller")

# Serve the frontend folder at /static
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

# add this line after the existing /static mount, around line 12
app.mount("/models/", StaticFiles(directory=Path(__file__).parent.parent / "models/glb"), name="models")

# ── REST endpoints ──────────────────────────────────────────────────

@app.get("/")
async def root():
    """Serve the main HTML page."""
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/api/state")
async def get_state():
    """Return the current joint angles and limits."""
    return {
        "joints": robot.joint_angles,
        "limits": JOINT_LIMITS,
    }

class JointCommand(BaseModel):
    joints: List[float]   # 6 values in radians

@app.post("/api/joints")
async def set_joints(cmd: JointCommand):
    """Directly set joint angles (used by the slider UI)."""
    if len(cmd.joints) != 6:
        return {"error": "Need exactly 6 joint values"}

    clamped = robot.clamp_angles(cmd.joints)
    async with robot.lock:
        robot.joint_angles = clamped

    await broadcast(robot.to_dict())
    fk = forward_kinematics(clamped)
    return {"joints": clamped, "end_effector": fk["position"]}

class IKCommand(BaseModel):
    target: List[float]   # [x, y, z] in meters

@app.post("/api/ik")
async def inverse_kinematics(cmd: IKCommand):
    """Solve IK for a target position and apply the result."""
    if len(cmd.target) != 3:
        return {"error": "Target must be [x, y, z]"}

    solution = solve_ik(cmd.target, robot.joint_angles)
    if solution is None:
        return {"error": "No IK solution found for that target"}

    clamped = robot.clamp_angles(solution)
    async with robot.lock:
        robot.joint_angles = clamped

    await broadcast(robot.to_dict())
    return {"joints": clamped, "target": cmd.target}


# ── WebSocket ───────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    robot.clients.add(ws)
    # Send current state immediately on connect
    await ws.send_json(robot.to_dict())
    try:
        while True:
            # Keep the connection alive; client messages are handled via REST
            await ws.receive_text()
    except WebSocketDisconnect:
        robot.clients.discard(ws)

async def broadcast(data: dict):
    """Send a JSON message to all connected WebSocket clients."""
    if not robot.clients:
        return
    message = json.dumps(data)
    dead = set()
    for ws in robot.clients:
        try:
            await ws.send_text(message)
        except Exception:
            dead.add(ws)
    robot.clients -= dead