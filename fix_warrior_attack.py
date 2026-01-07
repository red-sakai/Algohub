#!/usr/bin/env python3
"""Fix warrior attack spritesheet by padding it to the correct size"""

from PIL import Image

def pad_warrior_attack():
    input_path = "/home/carl/Programming/Algohub/public/sprite/characters/players/warrior/attack.png"
    output_path = input_path
    
    try:
        img = Image.open(input_path)
        current_width, current_height = img.size
        target_width, target_height = 1152, 768
        
        print(f"Current size: {current_width}x{current_height}")
        print(f"Target size: {target_width}x{target_height}")
        
        # Create new image with transparent background
        new_img = Image.new('RGBA', (target_width, target_height), (0, 0, 0, 0))
        
        # Calculate padding to center the image
        left = (target_width - current_width) // 2
        top = (target_height - current_height) // 2
        
        # Paste original image centered
        new_img.paste(img, (left, top))
        
        # Save
        new_img.save(output_path)
        print(f"✓ Successfully padded warrior attack.png to {target_width}x{target_height}")
        
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    pad_warrior_attack()
