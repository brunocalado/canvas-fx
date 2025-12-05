# Canvas FX - Wiki

**Canvas FX** provides cinematic visual effects for Foundry VTT using a lightweight DOM-based system. All effects are synchronized between the Game Master and players via sockets.

## API Reference

The module exposes a global object `CanvasFX`. Use these commands inside any **Script Macro**.

### 1. RainEmote (Text/Emojis)
Spawns emojis or text raining from the top of the screen.

**Suggested Emotes to Test:**
- **Weather:** 🌧️, ❄️, ⚡, 🌩️, 🍂, 🌪️
- **Combat:** ⚔️, 🛡️, 🩸, 💀, 💥, 🏹
- **Magic:** 🔥, ✨, 🔮, 👻, 🧪, 🧙‍♂️
- **Items:** 💰, 💎, 🗝️, 📜, 🍎, 🍖
- **Status:** 💤, 🤢, 🤬, 😱, ❤️, 🤡

```javascript
// Instant burst
CanvasFX.RainEmote("🔥", { count: 50, speed: 300, scale: 2 });

// Timed rain with sound
CanvasFX.RainEmote("💰", { 
    count: 200, 
    time: 5, 
    audio: "modules/canvas-fx/assets/audio/coins.mp3",
    scale: 1.5
});
```

### 2. RainImage (Images)
Spawns images raining down.

```javascript
CanvasFX.RainImage("modules/canvas-fx/assets/images/cute-head.webp", { 
    count: 20, 
    scale: 3,  // 3x size
    speed: 400
});
```

### 3. GlassShatter (Screen Break)
Simulates the screen shattering like glass, accompanied by a heavy shake.

```javascript
CanvasFX.GlassShatter({ 
    audio: "modules/canvas-fx/assets/audio/glass_shatter.mp3" 
});
```

### 4. Text (Giant Overlay)
Displays a massive text in the center of the screen. Supports 3 background modes via the `fill` option.

- `fill: "box"` (Default): Background wraps the text.
- `fill: "band"`: Background stretches from left to right (100% width).
- `fill: "full"`: Background covers the entire screen (100% width & height).

```javascript
// 1. Standard Box (Default)
CanvasFX.Text("GAME OVER", { 
    color: "red", 
    backgroundColor: "black", 
    fill: "box"
});

// 2. Cinematic Band
CanvasFX.Text("CHAPTER 1", { 
    backgroundColor: "rgba(0,0,0,0.8)", 
    fill: "band",
    duration: 4
});

// 3. Full Screen Cover
CanvasFX.Text("VICTORY", { 
    color: "gold", 
    backgroundColor: "black", 
    fill: "full",
    audio: "modules/canvas-fx/assets/audio/victory.mp3" 
});
```

### 5. ScreenBorder (Visual Alert)
Toggles a pulsing colored border.

```javascript
// Default Red Border
CanvasFX.ScreenBorder();

// Custom Thickness and Color
CanvasFX.ScreenBorder({ 
    color: "#ffffff", 
    thickness: 20,  // Thickness in pixels
    active: true 
});

// Disable
CanvasFX.ScreenBorder({ active: false });
```

### 6. ScreenCover (Cinematics)
Covers the entire screen with an image or video (mp4/webm).

```javascript
// Image Example
CanvasFX.ScreenCover("modules/canvas-fx/assets/images/light-vs-dark.webp", { 
    duration: 5, 
    audio: "modules/canvas-fx/assets/audio/light-vs-dark.mp3" 
});

// Video Example
CanvasFX.ScreenCover("modules/canvas-fx/assets/video/demo.mp4", { 
    duration: 15, 
    audio: "sounds/intro_music.mp3" 
});
```

### 7. ScreenShake (Impact)
Shakes the interface.

```javascript
CanvasFX.ScreenShake({ intensity: "heavy", duration: 500 });
```

### 8. Clear
Removes all effects immediately.

```javascript
CanvasFX.Clear();
```

---

## Common Options
Most functions accept an options object:
- `scale` (Number): Multiplier for size (default 1).
- `audio` (String): Path to audio file.
- `volume` (Number): 0.0 to 1.0.
- `local` (Boolean): If true, effect is NOT sent to other players.
- `duration` (Number): Time in seconds.
