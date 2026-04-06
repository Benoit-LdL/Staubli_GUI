import ikpy.chain
import ikpy.link
import numpy as np
from typing import List, Optional

def build_chain() -> ikpy.chain.Chain:
    """
    Staubli TX90 kinematic chain.
    Translation vectors and rotation axes extracted directly from
    staubli_tx90_support/urdf/tx90_macro.xacro.
    All values in meters.
    """
    return ikpy.chain.Chain(name="tx90", links=[
        # Fixed base — world origin
        ikpy.link.OriginLink(),

        # Joint 1 — base rotation, Z axis
        # origin xyz="0 0 0.478" axis="0 0 1"
        ikpy.link.URDFLink(
            name="joint_1",
            translation_vector=[0, 0, 0.478],
            orientation=[0, 0, 0],
            rotation=[0, 0, 1],
        ),

        # Joint 2 — shoulder pitch, Y axis
        # origin xyz="0.050 0 0" axis="0 1 0"
        ikpy.link.URDFLink(
            name="joint_2",
            translation_vector=[0.050, 0, 0],
            orientation=[0, 0, 0],
            rotation=[0, 1, 0],
        ),

        # Joint 3 — elbow pitch, Y axis
        # origin xyz="0 0.050 0.425" axis="0 1 0"
        ikpy.link.URDFLink(
            name="joint_3",
            translation_vector=[0, 0.050, 0.425],
            orientation=[0, 0, 0],
            rotation=[0, 1, 0],
        ),

        # Joint 4 — forearm roll, Z axis
        # origin xyz="0 0 0" axis="0 0 1"
        ikpy.link.URDFLink(
            name="joint_4",
            translation_vector=[0, 0, 0],
            orientation=[0, 0, 0],
            rotation=[0, 0, 1],
        ),

        # Joint 5 — wrist pitch, Y axis
        # origin xyz="0 0 0.425" axis="0 1 0"
        ikpy.link.URDFLink(
            name="joint_5",
            translation_vector=[0, 0, 0.425],
            orientation=[0, 0, 0],
            rotation=[0, 1, 0],
        ),

        # Joint 6 — wrist roll, Z axis
        # origin xyz="0 0 0.100" axis="0 0 1"
        ikpy.link.URDFLink(
            name="joint_6",
            translation_vector=[0, 0, 0.100],
            orientation=[0, 0, 0],
            rotation=[0, 0, 1],
        ),

        # Fixed tip — end effector reference point
        # matches the TX90 flange offset
        ikpy.link.URDFLink(
            name="tip",
            translation_vector=[0, 0, 0],
            orientation=[0, 0, 0],
            rotation=[0, 0, 0],
        ),
    ])

_chain = build_chain()

def solve_ik(
    target_pos: List[float],
    initial_angles: List[float],
) -> Optional[List[float]]:
    initial_full = [0.0] + initial_angles + [0.0]
    try:
        result = _chain.inverse_kinematics(
            target_position=target_pos,
            initial_position=initial_full,
            max_iter=200,
        )
        return list(result[1:7])
    except Exception as e:
        print(f"IK solver error: {e}")
        return None

def forward_kinematics(angles: List[float]) -> dict:
    full = [0.0] + angles + [0.0]
    transform = _chain.forward_kinematics(full)
    pos = transform[:3, 3]
    return {
        "position": pos.tolist(),
        "transform": transform.tolist(),
    }