import asyncio
from dataclasses import dataclass, field
from typing import List, Set
import numpy as np

NUM_JOINTS = 6

# Exact limits from Staubli TX90 URDF (radians)
JOINT_LIMITS = [
    (-np.pi,              np.pi),            # joint 1 — base    ±180°
    (np.radians(-130),    np.radians(147.5)), # joint 2 — shoulder
    (np.radians(-145),    np.radians(145)),   # joint 3 — elbow
    (np.radians(-270),    np.radians(270)),   # joint 4 — forearm roll
    (np.radians(-115),    np.radians(140)),   # joint 5 — wrist pitch
    (np.radians(-270),    np.radians(270)),   # joint 6 — wrist roll
]

@dataclass
class RobotState:
    joint_angles: List[float] = field(
        default_factory=lambda: [0.0] * NUM_JOINTS
    )
    clients: Set = field(default_factory=set)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def clamp_angles(self, angles: List[float]) -> List[float]:
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

robot = RobotState()