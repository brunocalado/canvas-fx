# Canvas FX - Wiki

**Canvas FX** provides cinematic visual effects for Foundry VTT using a lightweight DOM-based system. All effects are synchronized between the Game Master and players via sockets.

## Tools

Before writing macros, you can use these tools to test effects:

- `CanvasFX.Builder()`: Opens a UI to configure, test, and generate macro code for effects.
- `CanvasFX.Demo()`: Opens a gallery of pre-configured examples.

---

## API Reference

The module exposes a global object `CanvasFX`. Use these commands inside any **Script Macro**.

### Common Options
These options are available for **all** effects (unless stated otherwise).

- `users` (Array of Strings): List of user names who should see the effect. If omitted, everyone sees it. Example: `users: ["Gamemaster", "Player1"]`.
- `audio` (String): Path to an audio file to play in sync with the effect.
- `volume` (Number): Audio volume (0.0 to 1.0). Default: `0.8`.

---

### 1. Rain
Spawns emojis or text raining from the screen.

**Syntax:** `CanvasFX.Rain(content, options)`

**Arguments:**
- `content` (String): The emoji or text to rain (e.g., "🔥", "Gold"). **Required**.

**Options:**
- `count` (Number): Total particles to spawn in a burst. Default: `20`.
- `speed` (Number): Fall speed in pixels per second. Default: `300`.
- `scale` (Number): Size multiplier. Default: `1`.
- `time` (Number): Duration of the emitter in seconds. If `0`, it spawns a single burst defined by `count`. Default: `0`.
- `direction` (String): "top-bottom", "bottom-top", "left-right", "right-left". Default: `"top-bottom"`.

```javascript
// Simple: Instant burst of fire
CanvasFX.Rain("🔥");
```

```javascript
// Complete: Rain for 5 seconds sideways
CanvasFX.Rain("🌧️", { 
    time: 5, 
    speed: 500, 
    direction: "left-right", 
    audio: "sounds/rain.mp3" 
});
```

### 2. RainImage
Spawns images raining from the screen.

**Syntax:** `CanvasFX.RainImage(path, options)`

**Arguments:**
- `path` (String): URL/Path to the image file. **Required**.

**Options:**
- `count` (Number): Total particles (burst). Default: `20`.
- `speed` (Number): Fall speed. Default: `300`.
- `scale` (Number): Size multiplier. Default: `1`.
- `time` (Number): Emitter duration in seconds. Default: `0`.
- `direction` (String): Direction of fall. Default: `"top-bottom"`.

```javascript
// Simple
CanvasFX.RainImage("modules/canvas-fx/assets/images/cute-head.webp");
```

```javascript
// Complete
CanvasFX.RainImage("modules/canvas-fx/assets/images/cute-head.webp", { 
    scale: 0.5, 
    count: 50, 
    direction: "bottom-top" 
});
```

### 3. ScreenShake
Shakes the interface to simulate impact.

**Syntax:** `CanvasFX.ScreenShake(options)`

**Options:**
- `intensity` (String): "mild", "heavy", "extreme". Default: `"heavy"`.
- `duration` (Number): Duration in milliseconds. Default: `500`.

```javascript
// Simple
CanvasFX.ScreenShake();
```

```javascript
// Complete
CanvasFX.ScreenShake({ intensity: "extreme", duration: 2000 });
```

### 4. GlassShatter
Simulates the screen breaking into shards. *Includes a screen shake.*

**Syntax:** `CanvasFX.GlassShatter(options)`

**Options:**
- `count` (Number): Number of shards. Default: `50`.

```javascript
// Simple
CanvasFX.GlassShatter();
```

```javascript
// Complete
CanvasFX.GlassShatter({ 
    count: 200, 
    audio: "modules/canvas-fx/assets/audio/glass_shatter.mp3" 
});
```

### 5. ScreenBorder
Toggles a pulsing colored border used for alerts (e.g., Low Health).

**Syntax:** `CanvasFX.ScreenBorder(options)`

**Options:**
- `active` (Boolean): Explicitly turn on (`true`) or off (`false`). If omitted, it toggles the current state.
- `color` (String): Border color (Hex or Name). Default: `"red"`.
- `thickness` (Number): Border width in pixels. Default: `20`.

```javascript
// Simple (Toggle)
CanvasFX.ScreenBorder();
```

```javascript
// Complete
CanvasFX.ScreenBorder({ active: true, color: "#00ff00", thickness: 50 });
```

### 6. Flash
A sudden bright flash of light (e.g., Lightning, Explosion).

**Syntax:** `CanvasFX.Flash(options)`

**Options:**
- `color` (String): Flash color. Default: `"white"`.
- `duration` (Number): Fade out time in milliseconds. Default: `1000`.
- `iterations` (Number): Number of times to flash. Default: `1`.
- `interval` (Number): Time between flashes in milliseconds. Default: `100`.

```javascript
// Simple
CanvasFX.Flash();
```

```javascript
// Complete (Thunderstorm)
CanvasFX.Flash({ 
    duration: 300, 
    iterations: 3, 
    interval: 150, 
    color: "#aaaaFF",
    audio: "modules/canvas-fx/assets/audio/thunder.mp3" 
});
```

### 7. Text
Displays a massive text overlay.

**Syntax:** `CanvasFX.Text(content, options)`

**Arguments:**
- `content` (String): The message to display. **Required**.

**Options:**
- `duration` (Number): How long the text stays visible in seconds. Default: `3`.
- `color` (String): Text color. Default: `"white"`.
- `backgroundColor` (String): Background color. Default: `"black"`.
- `fontFamily` (String): Font family. Default: `"Impact, sans-serif"`.
- `fill` (String): Background style. "box" (auto width), "band" (full width), "full" (entire screen). Default: `"box"`.
- `animation` (String): "none", "pulse", "shake". Default: `"none"`.

```javascript
// Simple
CanvasFX.Text("VICTORY!");
```

```javascript
// Complete
CanvasFX.Text("BOSS FIGHT", { 
    color: "red", 
    fill: "band", 
    duration: 5,
    animation: "shake"
});
```

### 8. ScreenCover
Displays a full-screen image or video.

**Syntax:** `CanvasFX.ScreenCover(path, options)`

**Arguments:**
- `path` (String): URL to image or video (.webm/.mp4). **Required**.

**Options:**
- `duration` (Number): Duration in seconds. Default: `5`.
- `opacity` (Number): Opacity (0.0 to 1.0). Default: `1.0`.

```javascript
// Simple
CanvasFX.ScreenCover("modules/canvas-fx/assets/images/light-vs-dark.webp");
```

```javascript
// Complete
CanvasFX.ScreenCover("modules/canvas-fx/assets/cinematic.webm", { 
    duration: 15, 
    opacity: 0.8 
});
```

### 9. Letterbox
Adds cinematic black bars to the top and bottom.

**Syntax:** `CanvasFX.Letterbox(options)`

**Options:**
- `active` (Boolean): Force on/off. If omitted, toggles.
- `height` (String): Height of the bars. Default: `"12vh"`.

```javascript
// Simple
CanvasFX.Letterbox();
```

```javascript
// Complete
CanvasFX.Letterbox({ active: true, height: "15vh" });
```

### 10. Curtain
Closes and opens theater curtains.

**Syntax:** `CanvasFX.Curtain(options)`

**Options:**
- `duration` (Number): Time in milliseconds for the curtain to slide open/close. Default: `2000`.
- `image` (String): Texture path for the curtain. Default: Built-in red curtain.

```javascript
// Simple
CanvasFX.Curtain();
```

```javascript
// Complete
CanvasFX.Curtain({ duration: 5000, image: "modules/canvas-fx/assets/images/curtain.webp" });
```

### 11. Spin
Rotates the entire game view.

**Syntax:** `CanvasFX.Spin(options)`

**Options:**
- `angle` (Number): Degrees to rotate. Default: `360`.
- `duration` (Number): Animation duration in milliseconds. Default: `2000`.
- `direction` (String): "clockwise" or "counter-clockwise". Default: `"clockwise"`.

```javascript
// Simple
CanvasFX.Spin();
```

```javascript
// Complete
CanvasFX.Spin({ angle: 180, duration: 5000, direction: "counter-clockwise" });
```

### 12. Pulsate
Makes the screen zoom in and out rhythmically (heartbeat effect).

**Syntax:** `CanvasFX.Pulsate(options)`

**Options:**
- `intensity` (Number): Scale multiplier strength (1-5). Default: `2`.
- `duration` (Number): Time for one beat in milliseconds. Default: `1000`.
- `iterations` (String/Number): Number of beats or "infinite". Default: `5`.

```javascript
// Simple
CanvasFX.Pulsate();
```

```javascript
// Complete
CanvasFX.Pulsate({ intensity: 3, duration: 800, iterations: "infinite" });
```

### 13. Colorfy (Filter)
Applies a multiply color blend to the screen.

**Syntax:** `CanvasFX.Colorfy(options)`

**Options:**
- `color` (String): Overlay color. Default: `"red"`.
- `opacity` (Number): Layer opacity. Default: `0.3`.
- `duration` (Number): Auto-remove after seconds. If 0, stays until cleared. Default: `0`.

```javascript
// Simple
CanvasFX.Colorfy();
```

```javascript
// Complete
CanvasFX.Colorfy({ color: "#00ff00", opacity: 0.2, duration: 5 });
```

### 14. Blur (Filter)
Blurs the screen.

**Syntax:** `CanvasFX.Blur(options)`

**Options:**
- `intensity` (Number): Blur radius in pixels. Default: `5`.
- `duration` (Number): Auto-remove after seconds. Default: `0`.

```javascript
// Simple
CanvasFX.Blur();
```

```javascript
// Complete
CanvasFX.Blur({ intensity: 10, duration: 2 });
```

### 15. Vignette (Filter)
Darkens the edges of the screen.

**Syntax:** `CanvasFX.Vignette(options)`

**Options:**
- `intensity` (Number): Darkness strength (0.0 to 1.0). Default: `0.8`.
- `color` (String): Color of the vignette. Default: `"black"`.
- `duration` (Number): Auto-remove after seconds. Default: `0`.

```javascript
// Simple
CanvasFX.Vignette();
```

```javascript
// Complete
CanvasFX.Vignette({ intensity: 0.9, duration: 10, color: "darkred" });
```

### 16. Night Vision / Black & White (Filter)
Preset filters.

**Syntax:**
- `CanvasFX.NightVision(options)`
- `CanvasFX.BlackAndWhite(options)`

**Options:**
- `duration` (Number): Auto-remove after seconds. Default: `0`.

```javascript
CanvasFX.NightVision({ duration: 10 });
```

### 17. Countdown
Displays a large number that counts from a start value to an end value.

**Syntax:** `CanvasFX.Countdown(options)`

**Options:**
- `start` (Number): Number to start at. Default: `10`.
- `end` (Number): Number to end at. Default: `0`.
- `color` (String): Color of the text. Default: `"white"`.
- `audio` (String): Path to a tick sound effect played on every change. Default: Built-in click.

```javascript
// Simple
CanvasFX.Countdown();
```

```javascript
// Complete
CanvasFX.Countdown({ start: 60, end: 0, color: "red" });
```

### 18. Slideshow
Displays a sequence of images from a folder with crossfade transitions. Stops automatically after the last image.

**Syntax:** `CanvasFX.Slideshow(path, options)`

**Arguments:**
- `path` (String): Folder path containing images. **Required**.

**Options:**
- `interval` (Number): Seconds to display each slide. Default: `3`.
- `fade` (Number): Crossfade duration in milliseconds. Default: `1000`.

```javascript
// Simple
CanvasFX.Slideshow("modules/canvas-fx/assets/images/slideshow");
```

```javascript
// Complete
CanvasFX.Slideshow("modules/canvas-fx/assets/images/slideshow", { interval: 5, fade: 2000 });
```

### 19. Sci-Fi Level Up
Displays a centered 3D holographic HUD (Three.js) announcing a level-up. A burst of warp streaks draws a chamfered HUD frame out of nothing; the outline thickens into beveled glass, instrument readouts and circuit traces populate it, and a flare at the center punches the text in. Once the text has fully formed, particles sampled from its own glyph shape erupt outward from it. Long messages are scaled down automatically so they always fit inside the frame.

**Syntax:** `CanvasFX.SciFiLevelUp(options)`

**Options:**
- `text` (String): The message shown. Default: `"Level Up"`.
- `background` (String): `"solid"` or `"transparent"`. Default: `"solid"`.
- `backgroundColor` (String): Backdrop color for solid mode. Default: `"#000000"`.
- `duration` (Number): Total seconds. `0` = auto (~9s). Always floored at a minimum of `7` seconds regardless of what's passed. Default: `0`.
- `accent` (String): Primary hologram color. Default: `"#00e5ff"`.
- `accent2` (String): Secondary hologram color. Default: `"#2979ff"`.
- `audio` (String): Sound played with the effect. Unlike the other effects, this one ships a built-in default: `modules/canvas-fx/assets/audio/victory.mp3` (~6s, so it finishes shortly before the visuals do). Pass an empty string or `null` to run it silently.
- `volume` (Number): Audio volume (0.0 to 1.0). Default: `0.8`.

```javascript
// Simple (plays the built-in victory sting)
CanvasFX.SciFiLevelUp();
```

```javascript
// Silent, or with your own sound
CanvasFX.SciFiLevelUp({ audio: "" });
CanvasFX.SciFiLevelUp({ audio: "sounds/fanfare.ogg", volume: 0.5 });
```

```javascript
// Complete: transparent over the game canvas, custom text and colors
CanvasFX.SciFiLevelUp({
    text: "Rank Up",
    background: "transparent",
    duration: 10,
    accent: "#ff5500",
    accent2: "#ffaa00"
});
```

### Utility: Delay
Pauses the macro execution for a set amount of time. Useful for chaining effects.

**Syntax:** `await CanvasFX.Delay(seconds)`

```javascript
CanvasFX.Rain("🌧️", { time: 3 });
await CanvasFX.Delay(3);
CanvasFX.Flash();
```

### Clear
Immediately stops and removes all active effects, filters, and animations.

```javascript
CanvasFX.Clear();
```
