# Canvas FX - API

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
- `audio` (String): Path to an audio file to play in sync with the effect. Not played by ScreenBorder; Countdown plays it on every tick instead.
- `volume` (Number): Audio volume (0.0 to 1.0). Default: `0.8`. `0` is treated as unset and also plays at `0.8`. Countdown's ticks always play at `0.8`.

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
CanvasFX.RainImage("path/to/your-image.webp");
```

```javascript
// Complete
CanvasFX.RainImage("path/to/your-image.webp", { 
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
- `direction` (String): "both", "horizontal" or "vertical". Default: `"both"`.

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
    audio: "path/to/your-audio.mp3" 
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
    audio: "path/to/your-audio.mp3" 
});
```

### 7. Text
Displays a massive text overlay.

**Syntax:** `CanvasFX.Text(content, options)`

**Arguments:**
- `content` (String): The message to display, shown in upper case. **Required**.

**Options:**
- `duration` (Number): How long the text stays visible in seconds. Default: `3`. `0` keeps it on screen until `CanvasFX.Clear()`.
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
- `path` (String): URL to an image or video. **Required**. It is played as a video only when the path ends in lowercase `.webm` or `.mp4`; anything else is shown as an image.

**Options:**
- `duration` (Number): Duration in seconds. Default: `5`. `0` keeps it on screen until `CanvasFX.Clear()`.
- `opacity` (Number): Opacity (0.0 to 1.0). Default: `1.0`.

```javascript
// Simple
CanvasFX.ScreenCover("path/to/your-image.webp");
```

```javascript
// Complete
CanvasFX.ScreenCover("path/to/your-video.webm", { 
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
- `image` (String): Texture path for the curtain. Default: solid black panel.

```javascript
// Simple
CanvasFX.Curtain();
```

```javascript
// Complete
CanvasFX.Curtain({ duration: 5000, image: "path/to/your-image.webp" });
```

### 11. Spin
Rotates the entire game view.

**Syntax:** `CanvasFX.Spin(options)`

**Options:**
- `angle` (Number): Degrees to rotate. Default: `360`.
- `duration` (Number): Animation duration in milliseconds. Default: `2000`.
- `direction` (String): "clockwise" or "counter-clockwise". Default: `"clockwise"`.

Rotations add up: each Spin turns from where the previous one left the view, until `CanvasFX.Clear()` resets it.

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

### Filters stack
Colorfy, Blur, Vignette, Night Vision, Black & White, Sepia and Film Grain can be on at the same time. Calling the
same filter again replaces it; a different filter is added on top. They always paint in a fixed
order, whatever order they were called in: Blur, Black & White, Sepia, Colorfy, Night Vision, Vignette
(the vignette frames everything under it), then Film Grain on top of them all. A `duration` removes only its own filter.
Every filter takes `active` (Boolean): pass `false` to remove that one filter and leave the
others; `CanvasFX.Clear()` removes all of them.

```javascript
// A drowsy, faded look: three filters at once
CanvasFX.Blur({ intensity: 2 });
CanvasFX.BlackAndWhite();
CanvasFX.Vignette({ intensity: 0.9 });

// Later, wake up: remove only the blur
CanvasFX.Blur({ active: false });
```

### 13. Colorfy (Filter)
Applies a multiply color blend to the screen.

**Syntax:** `CanvasFX.Colorfy(options)`

**Options:**
- `color` (String): Overlay color. Default: `"red"`.
- `opacity` (Number): Layer opacity. Default: `0.3`. `0` is treated as unset and also gives `0.3`.
- `duration` (Number): Auto-remove after seconds. If 0, stays until cleared. Default: `0`.
- `active` (Boolean): `false` removes this filter. Default: `true`.

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
- `active` (Boolean): `false` removes this filter. Default: `true`.

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
- `active` (Boolean): `false` removes this filter. Default: `true`.

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
- `active` (Boolean): `false` removes this filter. Default: `true`.

```javascript
CanvasFX.NightVision({ duration: 10 });
```

### 17. Sepia (Filter)
Tints the screen in old-photo sepia.

**Syntax:** `CanvasFX.Sepia(options)`

**Options:**
- `intensity` (Number): Sepia strength (0.0 to 1.0). Default: `1`.
- `duration` (Number): Auto-remove after seconds. Default: `0`.
- `active` (Boolean): `false` removes this filter. Default: `true`.

```javascript
// Simple
CanvasFX.Sepia();
```

```javascript
// Complete
CanvasFX.Sepia({ intensity: 0.7, duration: 5 });
```

### 18. Film Grain (Filter)
An old-film overlay: moving grain, light scratches and dust, and a slight flicker. It sits above
ScreenCover, so a cover image gets grain too, and it stacks with the other filters (for example
with Sepia or Black & White for a flashback).

**Syntax:** `CanvasFX.FilmGrain(options)`

**Options:**
- `intensity` (Number): Grain strength (0.0 to 1.0). Default: `0.35`.
- `scratches` (Boolean): Draw scratches and dust. Default: `true`.
- `flicker` (Boolean): Make the overlay flicker. Default: `true`.
- `duration` (Number): Auto-remove after seconds. Default: `0`.
- `active` (Boolean): `false` removes this filter. Default: `true`.

```javascript
// Simple
CanvasFX.FilmGrain();
```

```javascript
// Complete
CanvasFX.FilmGrain({ intensity: 0.5, scratches: true, flicker: false, duration: 8 });
```

### 19. Countdown
Displays a large number that counts from a start value to an end value.

**Syntax:** `CanvasFX.Countdown(options)`

**Options:**
- `start` (Number): Number to start at. Default: `10`. Clamped to 0–1000.
- `end` (Number): Number to end at. Default: `0`. Clamped to 0–1000.
- `color` (String): Color of the text. Default: `"white"`.
- `audio` (String): Path to a tick sound effect played on every change. Default: none (silent).

It counts down when `start` is higher than `end`, and up when `start` is lower; one step per second.

```javascript
// Simple
CanvasFX.Countdown();
```

```javascript
// Complete
CanvasFX.Countdown({ start: 60, end: 0, color: "red" });
```

### 20. Slideshow
Displays a sequence of images from a folder with crossfade transitions. Stops automatically after the last image.

**Syntax:** `CanvasFX.Slideshow(path, options)`

**Arguments:**
- `path` (String): Folder path containing images. **Required**.
  Only image files are shown (any format Foundry recognizes as an image); video files in the folder are skipped.

**Options:**
- `interval` (Number): Seconds to display each slide. Default: `3`.
- `fade` (Number): Crossfade duration in milliseconds. Default: `1000`.

```javascript
// Simple
CanvasFX.Slideshow("path/to/your-folder");
```

```javascript
// Complete
CanvasFX.Slideshow("path/to/your-folder", { interval: 5, fade: 2000 });
```

### 21. Sci-Fi Level Up
Displays a centered 3D holographic HUD (Three.js) announcing a level-up. A burst of warp streaks draws a chamfered HUD frame out of nothing; the outline thickens into beveled glass, instrument readouts and circuit traces populate it, and a flare at the center punches the text in. Once the text has fully formed, particles sampled from its own glyph shape erupt outward from it. Long messages are scaled down automatically so they always fit inside the frame.

**Syntax:** `CanvasFX.SciFiLevelUp(options)`

**Options:**
- `text` (String): The message shown. Default: `"Level Up"`.
- `background` (String): `"solid"` or `"transparent"`. Default: `"solid"`.
- `backgroundColor` (String): Backdrop color for solid mode. Default: `"#000000"`.
- `duration` (Number): Total seconds. `0` = auto (~9s). Always floored at a minimum of `7` seconds regardless of what's passed. Default: `0`.
- `accent` (String): Primary hologram color. Default: `"#00e5ff"`.
- `accent2` (String): Secondary hologram color. Default: `"#2979ff"`.
- `audio` (String): Sound played with the effect. Default: none (silent). Pass your own audio path to play a sting alongside it.
- `volume` (Number): Audio volume (0.0 to 1.0). Default: `0.8`.

```javascript
// Simple (silent by default)
CanvasFX.SciFiLevelUp();
```

```javascript
// With your own sound
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

### Recipes
Effects combine: call several at once, and screen filters stack instead of replacing each other.
Use `await CanvasFX.Delay(seconds)` to sequence steps. Each recipe below is also in the Demo
(`CanvasFX.Demo()`), under the same name with a `Recipe:` prefix.

#### Chapter Title
Opens a scene or a new chapter like a film title card. Text shows a single upper-case line, so short titles work best.

```javascript
CanvasFX.Letterbox({ active: true });
// A translucent band, not fill "full": a full black box would hide the letterbox bars
CanvasFX.Text("Chapter III", { fill: "band", backgroundColor: "rgba(0,0,0,0.6)", fontFamily: "Georgia, serif", duration: 4 });
await CanvasFX.Delay(4.5);
CanvasFX.Letterbox({ active: false });
```

#### Damage Hit
A character takes a heavy blow.

```javascript
CanvasFX.Flash({ color: "#8b0000", duration: 350 });
CanvasFX.ScreenShake({ intensity: "mild", duration: 250 });
CanvasFX.Vignette({ color: "darkred", intensity: 0.9, duration: 1 });
```

#### Flashback
A memory or a scene from the past. Four filters on at once.

```javascript
CanvasFX.Sepia({ duration: 8 });
CanvasFX.Blur({ intensity: 1, duration: 8 });
CanvasFX.FilmGrain({ duration: 8 });
CanvasFX.Vignette({ intensity: 0.7, duration: 8 });
```

#### Earthquake
The ground shakes and rocks fall.

```javascript
CanvasFX.ScreenShake({ intensity: "extreme", duration: 3000 });
CanvasFX.Rain("🪨", { count: 15, speed: 600 });
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
