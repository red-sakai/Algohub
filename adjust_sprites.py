#!/usr/bin/env python3
"""Adjust idle and jump sprites to match gladiator's exact dimensions"""

from PIL import Image

def adjust_spritesheet(path, target_width, target_height):
    """Adjust spritesheet to exact dimensions"""
    try:
        img = Image.open(path)
        current_width, current_height = img.size
        
        if current_width == target_width and current_height == target_height:
            print(f"  ✓ Already correct: {current_width}x{current_height}")
            return True
        
        # Create new image with transparent background
        new_img = Image.new('RGBA', (target_width, target_height), (0, 0, 0, 0))
        
        # If current is smaller, pad it; if larger, crop it
        if current_width < target_width:
            left = (target_width - current_width) // 2
            new_img.paste(img, (left, 0))
        else:
            left = (current_width - target_width) // 2
            cropped = img.crop((left, 0, left + target_width, current_height))
            new_img.paste(cropped, (0, 0))
        
        new_img.save(path)
        print(f"  ✓ Adjusted from {current_width}x{current_height} to {target_width}x{target_height}")
        return True
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def main():
    base_path = "/home/carl/Programming/Algohub/public/sprite/characters"
    
    # Exact gladiator dimensions
    specs = [
        ('crusader', 'idle.png', 129, 256),
        ('crusader', 'jump.png', 323, 256),
        ('warrior', 'idle.png', 129, 256),
        ('warrior', 'jump.png', 323, 256),
        ('boar', 'idle.png', 129, 256),
        ('orc', 'idle.png', 129, 256),
        ('wartator', 'idle.png', 129, 256),
        ('zombie', 'idle.png', 129, 256),
    ]
    
    print("Adjusting sprites to match gladiator exact dimensions...")
    print("=" * 60)
    
    for char_name, sprite_file, target_w, target_h in specs:
        # Determine if player or enemy
        if char_name in ['crusader', 'warrior']:
            char_type = 'players'
        else:
            char_type = 'enemies'
        
        path = f"{base_path}/{char_type}/{char_name}/{sprite_file}"
        print(f"{char_type}/{char_name}/{sprite_file}:")
        adjust_spritesheet(path, target_w, target_h)
    
    print("=" * 60)
    print("Adjustment complete!")

if __name__ == "__main__":
    main()
