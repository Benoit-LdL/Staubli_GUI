import trimesh
import numpy as np
from pathlib import Path

# Map STL filenames to output GLB names
# Adjust INPUT_DIR to wherever your ROS package STL files are
INPUT_DIR  = Path("stl_visual") # put your STLs here
OUTPUT_DIR = Path("glb")        # GLBs will be saved here
OUTPUT_DIR.mkdir(exist_ok=True)
    
LINKS = [
    "base_link",
    "link_1",
    "link_2",
    "link_3",
    "link_4",
    "link_5",
    "link_6",
]

for link in LINKS:
    stl_path = INPUT_DIR / f"{link}.stl"
    glb_path = OUTPUT_DIR / f"{link}.glb"

    if not stl_path.exists():
        print(f"SKIP {stl_path} — not found")
        continue

    print(f"Converting {link}.stl → {link}.glb ...")
    mesh = trimesh.load(stl_path)

    # STL from ROS/CAD is in meters already for this package
    # If your model looks gigantic in the browser, change to 0.001
    # mesh.apply_scale(0.001)

    mesh.export(str(glb_path))
    print(f"  OK — {mesh.vertices.shape[0]} vertices")

print("\nDone. Copy the models/ folder contents to your repo.")