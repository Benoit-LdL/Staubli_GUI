import asyncio
from dataclasses import dataclass, field
from typing import List, Set
import numpy as np

NUM_JOINTS = 6

# Per-joint soft limits in radians — adjust to your arm's physical limits
JOINT_LIMITS = [
    (-np.pi,     np.pi),      # joint 1 — base rotation
    (-np.pi/2,   np.pi/2),    # joint 2
    (-np.pi/2,   np.pi/2),    # joint 3
    (-np.pi,     np.pi),      # joint 4
    (-np.pi/2,   np.pi/2),    # joint 5
    (-np.pi,     np.pi),      # joint 6 — end effector rotation
]

@dataclass
class RobotState:
    # Current joint angles in radians
    joint_angles: List[float] = field(
        default_factory=lambda: [0.0] * NUM_JOINTS
    )
    # Connected WebSocket clients — we broadcast to all of them
    clients: Set = field(default_factory=set)
    # Lock so concurrent WS messages don't corrupt the state
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def clamp_angles(self, angles: List[float]) -> List[float]:
        """Clamp each joint angle to its soft limit."""
        clamped = []
        for i, a in enumerate(angles):
            lo, hi = JOINT_LIMITS[i]
            clamped.append(float(np.clip(a, lo, hi)))
        return clamped

    def to_dict(self) -> dict:
        return {
            "type": "state",
            "joints": self.joint_angles,
        }

# Module-level singleton — import this everywhere
robot = RobotState()