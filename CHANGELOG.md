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
