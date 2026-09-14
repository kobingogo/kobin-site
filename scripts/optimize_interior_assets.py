"""Build browser-ready GLBs for the airlock, guide robot and holographic display.

Run with:
    blender --background --python scripts/optimize_interior_assets.py
"""

from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "src/assets/models"
OUTPUT_DIR = ROOT / "public/assets/interior"

ASSETS = (
    {
        "id": "docking-airlock",
        "source": "docking-airlock-source.glb",
        "ratio": 0.18,
        "texture": 1024,
        "quality": 84,
    },
    {
        "id": "guide-robot",
        "source": "guide-robot-source.glb",
        "ratio": 0.16,
        "texture": 1024,
        "quality": 84,
    },
    {
        "id": "holographic-display",
        "source": "holographic-display-source.glb",
        "ratio": 0.15,
        "texture": 1024,
        "quality": 84,
    },
)


def triangle_count(objects: list[bpy.types.Object]) -> int:
    return sum(len(poly.vertices) - 2 for obj in objects for poly in obj.data.polygons)


def resize_images(max_edge: int) -> None:
    for image in bpy.data.images:
        width, height = image.size
        if not width or not height or max(width, height) <= max_edge:
            continue
        scale = max_edge / max(width, height)
        image.scale(max(1, round(width * scale)), max(1, round(height * scale)))


def build_asset(config: dict[str, object]) -> dict[str, object]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source_path = SOURCE_DIR / str(config["source"])
    bpy.ops.import_scene.gltf(filepath=str(source_path))

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    source_triangles = triangle_count(meshes)
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new(name="Interior Web LOD", type="DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = float(config["ratio"])
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)

    resize_images(int(config["texture"]))
    output_path = OUTPUT_DIR / f"{config['id']}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_image_format="WEBP",
        export_image_quality=int(config["quality"]),
        export_meshopt_compression_enable=True,
        export_yup=True,
    )

    return {
        "id": config["id"],
        "file": output_path.name,
        "source": config["source"],
        "ratio": config["ratio"],
        "source_triangles": source_triangles,
        "triangles": triangle_count(meshes),
        "texture_max_edge": config["texture"],
        "size_mb": round(output_path.stat().st_size / 1024 / 1024, 2),
    }


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
report = [build_asset(asset) for asset in ASSETS]
(OUTPUT_DIR / "assets.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps(report, ensure_ascii=False, indent=2))
