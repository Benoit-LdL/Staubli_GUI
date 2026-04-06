import ikpy.chain
import ikpy.link
import numpy as np
from typing import List, Optional

def build_chain() -> ikpy.chain.Chain:
    """
    Define your robot's kinematic chain using URDF or DH parameters.
    
    The values below are PLACEHOLDERS — replace link lengths (in meters)
    and joint types to match your physical robot.
    
    ikpy requires a fixed "base" link at index 0 and an optional
    "tip" link at the end (also fixed). The 6 revolute links between
    them are your actual joints.
    """
    return ikpy.chain.Chain(name="robot_arm", links=[
        ikpy.link.OriginLink(),                              # fixed base
        ikpy.link.URDFLink(name="joint1",
            translation_vector=[0, 0, 0.1],
            orientation=[0, 0, 0],
            rotation=[0, 0, 1]),                             # rotates around Z
        ikpy.link.URDFLink(name="joint2",
            translation_vector=[0, 0, 0.2],
            orientation=[0, 0, 0],
            rotation=[0, 1, 0]),
        ikpy.link.URDFLink(name="joint3",
            translation_vector=[0, 0, 0.2],
            orientation=[0, 0, 0],
            rotation=[0, 1, 0]),
        ikpy.link.URDFLink(name="joint4",
            translation_vector=[0, 0, 0.15],
            orientation=[0, 0, 0],
            rotation=[0, 0, 1]),
        ikpy.link.URDFLink(name="joint5",
            translation_vector=[0, 0, 0.1],
            orientation=[0, 0, 0],
            rotation=[0, 1, 0]),
        ikpy.link.URDFLink(name="joint6",
            translation_vector=[0, 0, 0.08],
            orientation=[0, 0, 0],
            rotation=[0, 0, 1]),
        ikpy.link.URDFLink(name="tip",   # fixed tip — no rotation
            translation_vector=[0, 0, 0.05],
            orientation=[0, 0, 0],
            rotation=[0, 0, 0]),
    ])

# Build once at import time
_chain = build_chain()

def solve_ik(
    target_pos: List[float],          # [x, y, z] in meters
    initial_angles: List[float],       # current joint angles (6 values)
) -> Optional[List[float]]:
    """
    Given a target end-effector position, return joint angles.
    Returns None if no solution found.
    
    ikpy expects the full chain length including base+tip links,
    so we pad initial_angles with zeros for those fixed links.
    """
    # Pad: [base=0, j1..j6, tip=0]
    initial_full = [0.0] + initial_angles + [0.0]

    try:
        result = _chain.inverse_kinematics(
            target_position=target_pos,
            initial_position=initial_full,
            max_iter=200,
        )
        # Strip the fixed base and tip, return only the 6 joint values
        joint_angles = list(result[1:7])
        return joint_angles
    except Exception as e:
        print(f"IK solver error: {e}")
        return None

def forward_kinematics(angles: List[float]) -> dict:
    """
    Given 6 joint angles, return the end-effector position and
    the full transformation matrix. Useful for visualizing where
    the arm currently points.
    """
    full = [0.0] + angles + [0.0]
    transform = _chain.forward_kinematics(full)
    pos = transform[:3, 3]   # translation column
    return {
        "position": pos.tolist(),
        "transform": transform.tolist(),
    }