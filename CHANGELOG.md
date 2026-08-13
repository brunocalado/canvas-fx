# 1.0.9

### Removed
- All bundled assets (`assets/` — 7 audio files, 9 images including the module logo and the
  slideshow set, and 1 demo video) have been removed from the module. Effects and the Builder
  that used them as defaults now start blank/silent instead of pointing at a bundled file.
- The README's "Images and audio assets are public domain (CC0)" line, since the module no longer
  bundles any image or audio assets.

### Changed
- **Demo gallery** (`CanvasFX.Demo()`): the icon on every entry changed from the module's logo to
  Foundry's core `icons/svg/explosion.svg`. Entries that existed only to showcase bundled sample
  media — "Full Screen Cover (Image)", "Full Screen Cover (Video)", "Rain Effects (Image)" — were
  removed; `ScreenCover` and `RainImage` themselves are unaffected and still available through
  `CanvasFX.Builder()` for your own files.
- **Sci-Fi Level Up**: no longer ships a built-in default sound. Silent by default now unless you
  pass your own path in `audio`.
- Builder (`CanvasFX.Builder()`): the audio/image/folder fields for Countdown, Curtain, Flash,
  GlassShatter, RainImage, ScreenCover, and Slideshow now default to blank instead of a bundled
  sample path — pick your own file via the file picker.

# 1.0.8

### Added
- **Sci-Fi Level Up**: now plays a sound by default (`assets/audio/victory.mp3`). Pass your own path in `audio`, or an empty string to run the effect silently. It is the only effect that ships a built-in default sound; the others stay silent unless given one.
- Builder (`CanvasFX.Builder()`): fields that take a file path now use Foundry's file picker — a text box plus a browse button — instead of a bare text input. Covers every audio field (Countdown, Flash, GlassShatter, ScreenCover, Sci-Fi Level Up) as well as the image, image/video, and folder fields (RainImage, Curtain, ScreenCover, Slideshow).

### Changed
- **Sci-Fi Level Up**: rebuilt visually. A burst of warp streaks now draws a chamfered HUD frame out of nothing; the outline thickens into beveled glass, instrument readouts and circuit traces populate it, and a flare at the center punches the text in. This replaces the previous concentric rings, glass panels, and gyroscopic reactor core.
- **Sci-Fi Level Up**: long messages are measured once laid out and scaled down to fit inside the frame, instead of overflowing past its inner edge.
- The Builder's styles moved from `styles/styles.css` into their own `styles/builder.css`, keeping one stylesheet per application.

### Fixed
- **Sci-Fi Level Up**: the 3D canvas was given a class (`cfx-hud-canvas`) that no CSS rule matched, so it was never absolutely positioned and only happened to land in the right place through normal document flow.

# 1.0.7

### Added
- **Sci-Fi Level Up** (`CanvasFX.SciFiLevelUp(options)`): a centered 3D holographic HUD (Three.js) announcing a level-up. Particles sampled from the text's own glyph shape erupt outward once it fully forms. Supports custom text, a solid or transparent background (solid black by default), custom accent colors, and a configurable duration with a 7-second minimum. Available in `CanvasFX.Builder()` and `CanvasFX.Demo()`.

# 1.0.6

### Added
- Builder (`CanvasFX.Builder()`): a "?" button next to the effect selector shows a tooltip describing what the selected effect does.
- Builder: a "Reset" button restores the selected effect's fields to their default values.

### Changed
- Builder: redesigned with a single consistent dark theme instead of mixed light/dark surfaces, and added spacing between the effect selector and its options.
- Builder: action buttons now stretch to fill the full width of the window instead of leaving dead space, and the window is wider so button labels no longer wrap.

# 1.0.5

### Changed
- The demo macros shown in `CanvasFX.Demo()` are no longer stored in a compendium pack. They now live in `scripts/demo-macros.js` as plain data, so the module no longer ships a `packs/` LevelDB folder.

### Fixed
- Demo dialog: long macro names could word-wrap and get vertically clipped inside the button. Names are now single-line with an ellipsis when they don't fit, and the full name is available as a tooltip.

# 1.0.4

### Fixed
- Demo dialog (`CanvasFX.Demo()`): macro icons were rendering oversized and overlapping the button labels. Buttons now use a horizontal layout with a fixed 24x24px icon on the left and the macro name on the right.
