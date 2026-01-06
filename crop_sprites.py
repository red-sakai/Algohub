#!/usr/bin/env python3
"""
Crop spritesheets to match gladiator dimensions
- idle: 2 frames x 4 directions (129x256) -> 64x64 frames
- run: 8 frames x 4 directions (512x256) -> 64x64 frames  
- jump: 5 frames x 4 directions (323x256) -> 64x64 frames
- attack: 6 frames x 4 directions (1152x768) -> 192x192 frames (oversize attack)
- hurt: 6 frames x 1 row (384x64) -> 64x64 frames
"""

from PIL import Image
import os

# Target dimensions (width x height in frames, frame_size)
TARGET_SPECS = {
    'idle': {'frames': (2, 4), 'frame_size': 64},
    'run': {'frames': (8, 4), 'frame_size': 64},
    'jump': {'frames': (5, 4), 'frame_size': 64},
    'attack': {'frames': (6, 4), 'frame_size': 192},
    'hurt': {'frames': (6, 1), 'frame_size': 64},
}

def crop_spritesheet(input_path, output_path, spec):
    """Crop a spritesheet to the target dimensions"""
    try:
        img = Image.open(input_path)
        frames_w, frames_h = spec['frames']
        frame_size = spec['frame_size']
        
        target_width = frames_w * frame_size
        target_height = frames_h * frame_size
        
        # Get current dimensions
        current_width, current_height = img.size
        
        print(f"  Current: {current_width}x{current_height}, Target: {target_width}x{target_height}")
        
        # If already correct size, skip
        if current_width == target_width and current_height == target_height:
            print(f"  ✓ Already correct size, skipping")
            return True
            
        # Crop from center if larger
        if current_width >= target_width and current_height >= target_height:
            left = (current_width - target_width) // 2
            top = (current_height - target_height) // 2
            right = left + target_width
            bottom = top + target_height
            
            cropped = img.crop((left, top, right, bottom))
            cropped.save(output_path)
            print(f"  ✓ Cropped successfully")
            return True
        else:
            print(f"  ✗ Source image too small to crop")
            return False
            
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def process_character(base_path, character_type, character_name):
    """Process all spritesheets for a character"""
    print(f"\nProcessing {character_type}/{character_name}:")
    
    char_path = os.path.join(base_path, character_type, character_name)
    
    if not os.path.exists(char_path):
        print(f"  ✗ Path doesn't exist: {char_path}")
        return
    
    for sprite_type, spec in TARGET_SPECS.items():
        sprite_file = f"{sprite_type}.png"
        input_path = os.path.join(char_path, sprite_file)
        
        if not os.path.exists(input_path):
            print(f"  - Skipping {sprite_type}.png (not found)")
            continue
            
        print(f"  Processing {sprite_type}.png:")
        crop_spritesheet(input_path, input_path, spec)

def main():
    base_path = "/home/carl/Programming/Algohub/public/sprite/characters"
    
    # Process new players
    print("=" * 60)
    print("CROPPING PLAYER SPRITESHEETS")
    print("=" * 60)
    
    for player in ['crusader', 'warrior']:
        process_character(base_path, 'players', player)
    
    # Process enemies
    print("\n" + "=" * 60)
    print("CROPPING ENEMY SPRITESHEETS")
    print("=" * 60)
    
    for enemy in ['boar', 'orc', 'wartator', 'zombie']:
        process_character(base_path, 'enemies', enemy)
    
    print("\n" + "=" * 60)
    print("CROPPING COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    main()
