# Dungeon Explorer Game

A simple 2D sprite-based dungeon game built with **Phaser 3** and **React**.

## Features

- **Sprite Movement Controls**: Use Arrow Keys or WASD to navigate
- **Dungeon Layout**: Navigate through a maze-like dungeon with walls and obstacles
- **Coin Collection**: Collect all 8 coins scattered throughout the dungeon to win
- **Collision Detection**: Player cannot pass through walls
- **Visual Feedback**: Player sprite rotates based on movement direction
- **Victory Condition**: Collect all coins to see the victory message

## Controls

- **Arrow Keys** or **WASD**: Move the player sprite in 4 directions
- Diagonal movement is supported by holding two keys simultaneously

## Game Mechanics

### Player

- Green square sprite (32x32 pixels)
- Speed: 200 pixels/second
- Rotates based on movement direction
- Cannot pass through walls

### Walls

- Purple barriers that create a maze
- Includes outer boundaries and inner obstacles
- Collision detection prevents player from passing through

### Coins

- Golden circular collectibles (8 total)
- Each coin is worth 10 points
- Collecting a coin triggers a disappear animation
- Score displayed in top-left corner

### Dungeon Floor

- Checkered pattern tiles
- Two alternating shades for visual depth

## Technical Details

### Technologies Used

- **Phaser 3**: Game framework for 2D game development
- **React**: UI framework for page structure
- **Next.js**: Server-side rendering and routing
- **TypeScript**: Type-safe development

### File Structure

```
/app/learn/dungeon/
  ├── page.tsx          # Next.js page wrapper with navigation
  ├── DungeonGame.tsx   # Main Phaser game component
  └── README.md         # This file
```

### Key Classes and Methods

**DungeonScene**

- `create()`: Initializes game objects, controls, and layout
- `update()`: Game loop that handles player movement and collision detection
- `createDungeonWalls()`: Generates maze-like wall structure
- `createCoins()`: Spawns collectible coins
- `collectCoin()`: Handles coin collection logic and animation
- `showVictory()`: Displays victory message when all coins are collected

## How It Works

1. **Game Loop**: Phaser runs at ~60 FPS using `requestAnimationFrame`
2. **Input Handling**: Keyboard events tracked via Phaser's input manager
3. **Movement**: Player position updated based on velocity and delta time
4. **Collision**: Rectangle intersection checks prevent wall-passing
5. **Rendering**: Canvas-based rendering for optimal performance

## Extending the Game

Ideas for enhancements:

- Add actual sprite images instead of rectangles
- Implement sprite animations (walking, idle)
- Add enemies or NPCs
- Create multiple dungeon levels
- Add items or power-ups
- Include sound effects for movement and collection
- Add a timer or high score system
- Implement a minimap

## Integration

The game is integrated into the Learn page carousel:

- Accessible from `/learn/dungeon`
- Appears as "Dungeon Explorer" in the game selector
- Uses DuckTales Moon Theme as background music
- Includes iris transition effects matching the site theme
