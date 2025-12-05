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

**Options:**
- `count` (Number): Total particles. Default: 20.
- `speed` (Number): Fall speed in pixels/sec. Default: 300.
- `scale` (Number): Size multiplier. Default: 1.
- `time` (Number): Duration in seconds. 0 = Instant.
- `audio` (String): Path to audio file.
- `volume` (Number): 0.0 to 1.0.
- `local` (Boolean): Only show for self.

```javascript
CanvasFX.RainEmote("🔥", { count: 50, speed: 300, scale: 2 });
```

### 2. RainImage (Images)
Spawns images raining down.

**Options:**
- Same options as RainEmote.

```javascript
CanvasFX.RainImage("modules/canvas-fx/assets/images/cute-head.webp", { 
    count: 20, 
    scale: 3,
    speed: 400
});
```

### 3. GlassShatter (Screen Break)
Simulates the screen shattering like glass, accompanied by a heavy random shake.

**Options:**
- `count` (Number): Number of shards. Default: 75.
- `audio` (String): Path to audio.
- `local` (Boolean): Only show for self.

```javascript
CanvasFX.GlassShatter({ 
    audio: "modules/canvas-fx/assets/audio/glass_shatter.mp3" 
});
```

### 4. Text (Giant Overlay)
Displays a massive text in the center of the screen.

**Options:**
- `content` (String): The text.
- `color` (String): Text color (Hex/Name).
- `backgroundColor` (String): Background color.
- `fill` (String): "box" (default), "band" (full width), "full" (full screen).
- `duration` (Number): Seconds to stay on screen.
- `audio` (String): Path to audio.

```javascript
CanvasFX.Text("VICTORY", { 
    color: "gold", 
    backgroundColor: "black", 
    fill: "full",
    audio: "modules/canvas-fx/assets/audio/victory.mp3" 
});
```

### 5. ScreenBorder (Visual Alert)
Toggles a pulsing colored border.

**Options:**
- `active` (Boolean): true to turn on, false to turn off.
- `color` (String): Border color.
- `thickness` (Number): Border width in pixels. Default: 20.

```javascript
CanvasFX.ScreenBorder({ 
    color: "#ffffff", 
    thickness: 20, 
    active: true 
});
```

### 6. ScreenCover (Cinematics)
Covers the entire screen with an image or video.

**Options:**
- `duration` (Number): Seconds to show.
- `opacity` (Number): 0.0 to 1.0.
- `audio` (String): Path to audio.

```javascript
CanvasFX.ScreenCover("modules/canvas-fx/assets/images/light-vs-dark.webp", { 
    duration: 5, 
    audio: "modules/canvas-fx/assets/audio/light-vs-dark.mp3" 
});
```

### 7. ScreenShake (Impact)
Shakes the interface.

**Options:**
- `duration` (Number): Time in milliseconds. Default: 500.
- `intensity` (String): "mild", "heavy", "extreme". Default: "heavy".
- `direction` (String): 
    - "horizontal" (Left/Right)
    - "vertical" (Up/Down)
    - "diagonal" (Diagonal vibration)
    - "random" (Chaotic movement in all directions)
- `audio` (String): Path to audio.

```javascript
// Random Earthquake
CanvasFX.ScreenShake({ 
    intensity: "extreme", 
    duration: 2000, 
    direction: "random",
    audio: "modules/canvas-fx/assets/audio/earthquake.mp3"
});

// Vertical Impact
CanvasFX.ScreenShake({ 
    intensity: "heavy", 
    duration: 500, 
    direction: "vertical" 
});
```

### 8. Clear
Removes all effects immediately.

```javascript
CanvasFX.Clear();
```
