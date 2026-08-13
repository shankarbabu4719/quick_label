#!/usr/bin/env python3
"""
Mask Verification Tool - JSON నుండి masks చదివి images మీద draw చేస్తుంది

Usage:
    python verify_masks.py <tracking.json> <frames_folder> <output_folder>

Example:
    python verify_masks.py demo/data/exports/my_project/tracking.json \
                          demo/data/exports/my_project/frames_1fps_original \
                          demo/data/exports/my_project/frames_verified
"""

import json
import sys
import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Same colors as frontend
COLORS = [
    (56, 128, 243),   # #3880F3
    (240, 170, 25),   # #F0AA19
    (0, 210, 190),    # #00D2BE
    (40, 210, 50),    # #28D232
    (135, 115, 255),  # #8773FF
    (0, 200, 240),    # #00C8F0
    (250, 135, 25),   # #FA8719
    (230, 25, 59),    # #E6193B
    (250, 125, 200),  # #FA7DC8
    (160, 255, 80),   # #A0FF50
]

MASK_ALPHA = 128  # Transparency for mask overlay
BORDER_WIDTH = 2


def decode_rle_mask(rle_counts, size):
    """RLE mask ని binary numpy array గా convert చేస్తుంది"""
    try:
        from pycocotools import mask as mask_utils
        if isinstance(rle_counts, str):
            rle_dict = {"counts": rle_counts.encode('utf-8'), "size": list(size)}
        else:
            rle_dict = {"counts": rle_counts, "size": list(size)}
        return mask_utils.decode(rle_dict)
    except Exception as e:
        logger.error(f"RLE decode failed: {e}")
        return None


def draw_masks_on_image(image_path, masks_data, object_labels, output_path):
    """
    Image మీద masks draw చేస్తుంది
    
    Args:
        image_path: Input image file path
        masks_data: List of mask entries with object_id and RLE mask
        object_labels: Dict mapping object_id to label name
        output_path: Output image file path
    """
    try:
        # Load image
        img = Image.open(image_path).convert("RGB")
        img_width, img_height = img.size
        
        # Create overlay for transparent masks
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        mask_count = 0
        
        for mask_entry in masks_data:
            obj_id = mask_entry.get("object_id", 0)
            rle = mask_entry.get("mask", {})
            
            if not rle:
                continue
            
            # Get color and label
            color = COLORS[obj_id % len(COLORS)]
            label = object_labels.get(obj_id, f"object_{obj_id}")
            
            # Decode RLE to binary mask
            mask = decode_rle_mask(rle.get("counts", ""), rle.get("size", []))
            
            if mask is None or mask.size == 0:
                logger.warning(f"Failed to decode mask for object {obj_id}")
                continue
            
            # Resize mask if dimensions don't match
            if mask.shape[0] != img_height or mask.shape[1] != img_width:
                logger.info(f"Resizing mask from {mask.shape} to {img_height}x{img_width}")
                try:
                    from scipy.ndimage import zoom
                    scale_h = img_height / mask.shape[0]
                    scale_w = img_width / mask.shape[1]
                    mask = zoom(mask, (scale_h, scale_w), order=0)
                except ImportError:
                    # Fallback: PIL resize
                    mask_img = Image.fromarray((mask * 255).astype(np.uint8))
                    mask_img = mask_img.resize((img_width, img_height), Image.NEAREST)
                    mask = np.array(mask_img) > 0
            
            # Create colored mask overlay
            colored_mask = np.zeros((img_height, img_width, 4), dtype=np.uint8)
            colored_mask[mask > 0] = (*color, MASK_ALPHA)
            
            # Convert to PIL and composite
            mask_overlay = Image.fromarray(colored_mask, mode='RGBA')
            overlay = Image.alpha_composite(overlay, mask_overlay)
            
            # Draw border around mask
            try:
                from scipy.ndimage import binary_erosion
                eroded = binary_erosion(mask, iterations=BORDER_WIDTH)
                contour = mask & ~eroded
                contour_coords = np.column_stack(np.where(contour))
                for y, x in contour_coords[::3]:  # Every 3rd pixel for speed
                    draw.point((x, y), fill=(*color, 255))
            except ImportError:
                pass  # Skip border if scipy not available
            
            # Find bounding box for label placement
            ys, xs = np.where(mask > 0)
            if len(xs) > 0 and len(ys) > 0:
                x0, y0 = int(xs.min()), int(ys.min())
                
                # Draw label chip
                font_size = max(14, img_height // 30)
                try:
                    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
                except Exception:
                    font = ImageFont.load_default()
                
                tb = font.getbbox(label) if hasattr(font, 'getbbox') else (0, 0, len(label) * 8, font_size)
                tw = tb[2] - tb[0] + 8
                th = tb[3] - tb[1] + 6
                lx0 = max(0, x0)
                ly0 = max(0, y0 - th)
                
                draw.rectangle([lx0, ly0, lx0 + tw, ly0 + th], fill=(*color, 220))
                draw.text((lx0 + 4, ly0 + 3), label, fill=(255, 255, 255, 255), font=font)
            
            mask_count += 1
        
        # Composite overlay onto image
        result = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
        
        # Save result
        result.save(output_path, "JPEG", quality=95)
        logger.info(f"✓ Drew {mask_count} masks on {Path(output_path).name}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to process {image_path}: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_masks(tracking_json_path, frames_folder, output_folder):
    """
    Main verification function
    
    Args:
        tracking_json_path: Path to tracking.json file
        frames_folder: Folder containing frame images
        output_folder: Output folder for visualized frames
    """
    # Load tracking.json
    logger.info(f"Loading {tracking_json_path}")
    with open(tracking_json_path, 'r') as f:
        tracking_data = json.load(f)
    
    # Get object labels
    objects_list = tracking_data.get("objects", [])
    object_labels = {obj["object_id"]: obj.get("label", f"object_{obj['object_id']}") 
                    for obj in objects_list}
    
    logger.info(f"Found {len(objects_list)} objects: {list(object_labels.values())}")
    
    # Build frame_index -> masks mapping
    frames_dict = {}
    for frame in tracking_data.get("frames", []):
        frame_idx = frame.get("frame_index")
        frames_dict[frame_idx] = frame.get("masks", [])
    
    logger.info(f"Found {len(frames_dict)} frames with masks")
    
    # Create output folder
    os.makedirs(output_folder, exist_ok=True)
    
    # Get all image files from frames folder
    frames_folder_path = Path(frames_folder)
    image_files = sorted(frames_folder_path.glob("*.jpg")) + sorted(frames_folder_path.glob("*.png"))
    
    if not image_files:
        logger.error(f"No images found in {frames_folder}")
        return
    
    logger.info(f"Processing {len(image_files)} images...")
    
    # Process each frame
    success_count = 0
    for img_path in image_files:
        # Try to extract frame index from filename (e.g., frame_000001.jpg -> 0)
        # Assuming sequential order if we can't parse
        try:
            # Try multiple patterns
            fname = img_path.stem
            if "frame_" in fname:
                frame_idx = int(fname.split("_")[-1])
            else:
                frame_idx = image_files.index(img_path)
        except:
            frame_idx = image_files.index(img_path)
        
        # Get masks for this frame
        masks_data = frames_dict.get(frame_idx, [])
        
        if not masks_data:
            logger.warning(f"No masks found for frame {frame_idx} ({img_path.name})")
            continue
        
        # Draw masks
        output_path = Path(output_folder) / img_path.name
        if draw_masks_on_image(img_path, masks_data, object_labels, output_path):
            success_count += 1
    
    logger.info(f"\n✅ Successfully processed {success_count}/{len(image_files)} frames")
    logger.info(f"✅ Output saved to: {output_folder}")


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        print("\nExample:")
        print("  python verify_masks.py \\")
        print("    demo/data/exports/my_video/tracking.json \\")
        print("    demo/data/exports/my_video/frames_1fps_original \\")
        print("    demo/data/exports/my_video/frames_verified")
        sys.exit(1)
    
    tracking_json = sys.argv[1]
    frames_folder = sys.argv[2]
    output_folder = sys.argv[3]
    
    # Check if files exist
    if not os.path.exists(tracking_json):
        logger.error(f"Tracking JSON not found: {tracking_json}")
        sys.exit(1)
    
    if not os.path.exists(frames_folder):
        logger.error(f"Frames folder not found: {frames_folder}")
        sys.exit(1)
    
    verify_masks(tracking_json, frames_folder, output_folder)


if __name__ == "__main__":
    main()
