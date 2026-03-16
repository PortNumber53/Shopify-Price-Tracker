from PIL import Image
import os

def crop_image(input_path, output_path):
    print(f"Loading image: {input_path}")
    img = Image.open(input_path)
    
def is_meaningful(r, g, b, a):
    # Ignore transparent or near-transparent
    if a < 10:
        return False
    
    # Calculate saturation-like metric: max difference between channels
    # Gray colors have low diff. Vibrant colors have high diff.
    diff = max(r, g, b) - min(r, g, b)
    
    # Meaningful if:
    # 1. It has color (saturation > 20)
    # 2. It is dark (any channel < 150) - black is meaningful
    if diff > 20 or r < 150 or g < 150 or b < 150:
        return True
    
    return False

def crop_image(input_path, output_path):
    print(f"Loading image: {input_path}")
    img = Image.open(input_path).convert('RGBA')
    width, height = img.size
    
    left, top, right, bottom = width, height, 0, 0
    data = img.load()
    
    print("Scanning for meaningful content...")
    found = False
    for y in range(height):
        # Optimization: if we already found boundaries, we can tighten the loops
        # but for a 2048x2048 image, a full scan is fast enough.
        for x in range(width):
            r, g, b, a = data[x, y]
            if is_meaningful(r, g, b, a):
                if x < left: left = x
                if x > right: right = x
                if y < top: top = y
                if y > bottom: bottom = y
                found = True
    
    if found:
        # Add 10px padding for safety
        left = max(0, left - 10)
        top = max(0, top - 10)
        right = min(width, right + 10)
        bottom = min(height, bottom + 10)
        
        bbox = (left, top, right, bottom)
        print(f"Original size: {img.size}")
        print(f"Calculated bounding box: {bbox}")
        cropped = img.crop(bbox)
        print(f"New size: {cropped.size}")
        cropped.save(output_path)
        print(f"Saved cropped image to: {output_path}")
    else:
        print("No meaningful content detected to crop.")

if __name__ == "__main__":
    asset_path = "/Users/mauricio/work/Shopify-Price-Tracker/assets/Gemini_Generated_Image_vmq9vtvmq9vtvmq9.png"
    crop_image(asset_path, asset_path)
