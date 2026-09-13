"""Build browser-ready LODs for the Hunyuan orbital-lab source GLB.

Run with:
    blender --background --python scripts/optimize_station_lods.py
"""

from __future__ import annotations

import bpy
import json
from pathlib import Path


ROOT = Path("/Users/bingo/workspace/kobin-site")
SOURCE = ROOT / "src/assets/models/orbital-lab-exterior-source.glb"
OUTPUT = ROOT / "src/assets/models/optimized"

VARIANTS = (
    {"name": "orbital-lab-lod0", "ratio": 0.60, "texture": 2048, "quality": 88},
    {"name": "orbital-lab-lod1", "ratio": 0.25, "texture": 1024, "quality": 84},
    {"name": "orbital-lab-lod2", "ratio": 0.08, "texture": 1024, "quality": 80},
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


def build_variant(config: dict) -> dict:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    source_triangles = triangle_count(meshes)

    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new(name="Web LOD", type="DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = config["ratio"]
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)

    resize_images(config["texture"])
    output_path = OUTPUT / f"{config['name']}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_image_format="WEBP",
        export_image_quality=config["quality"],
        export_meshopt_compression_enable=True,
        export_yup=True,
    )

    return {
        "file": output_path.name,
        "ratio": config["ratio"],
        "triangles": triangle_count(meshes),
        "source_triangles": source_triangles,
        "texture_max_edge": config["texture"],
        "webp_quality": config["quality"],
        "size_mb": round(output_path.stat().st_size / 1024 / 1024, 2),
    }


OUTPUT.mkdir(parents=True, exist_ok=True)
report = [build_variant(config) for config in VARIANTS]
(OUTPUT / "orbital-lab-lods.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps(report, ensure_ascii=False, indent=2))
