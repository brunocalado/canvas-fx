/*!
 * Canvas FX
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, TEMPLATES } from "../constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// Effects available in the Builder UI, sorted alphabetically.
const EFFECTS = {
    "BlackAndWhite": [
        { name: "duration", type: "number", label: "Duration (sec)", default: 0 }
    ],
    "Blur": [
        { name: "intensity", type: "number", label: "Px Radius", default: 1 },
        { name: "duration", type: "number", label: "Duration (sec)", default: 0 }
    ],
    "Colorfy": [
        { name: "color", type: "color", label: "Color", default: "#ff0000" },
        { name: "opacity", type: "number", label: "Opacity", default: 0.3 },
        { name: "duration", type: "number", label: "Duration (sec)", default: 0 }
    ],
    "Countdown": [
        { name: "start", type: "number", label: "Start Number", default: 10 },
        { name: "end", type: "number", label: "End Number", default: 0 },
        { name: "color", type: "color", label: "Color", default: "#ffffff" },
        { name: "audio", type: "text", label: "Tick Sound", default: `modules/${MODULE_ID}/assets/audio/countdown.mp3` }
    ],
    "Curtain": [
        { name: "duration", type: "number", label: "Open Time (ms)", default: 2000 },
        { name: "image", type: "text", label: "Image URL", default: `modules/${MODULE_ID}/assets/images/curtain.webp` }
    ],
    "Flash": [
        { name: "color", type: "color", label: "Color", default: "#ffffff" },
        { name: "duration", type: "number", label: "Duration (ms)", default: 1000 },
        { name: "iterations", type: "number", label: "Iterations", default: 1 },
        { name: "interval", type: "number", label: "Interval (ms)", default: 200 },
        { name: "audio", type: "text", label: "Audio URL", default: `modules/${MODULE_ID}/assets/audio/thunder.mp3` }
    ],
    "GlassShatter": [
        { name: "count", type: "number", label: "Shards", default: 200 },
        { name: "audio", type: "text", label: "Audio URL", default: `modules/${MODULE_ID}/assets/audio/glass_shatter.mp3` }
    ],
    "Letterbox": [
        { name: "active", type: "checkbox", label: "Active", default: true },
        { name: "height", type: "text", label: "Height", default: "12vh" }
    ],
    "NightVision": [
        { name: "duration", type: "number", label: "Duration (sec)", default: 0 }
    ],
    "Pulsate": [
        { name: "intensity", type: "number", label: "Intensity (1-5)", default: 2 },
        { name: "duration", type: "number", label: "Beat Time (ms)", default: 1000 },
        { name: "iterations", type: "number", label: "Iterations", default: 5 }
    ],
    "Rain": [
        { name: "content", type: "text", label: "Emoji/Text", default: "🔥" },
        { name: "count", type: "number", label: "Count (Burst)", default: 80 },
        { name: "speed", type: "number", label: "Speed", default: 300 },
        { name: "scale", type: "number", label: "Scale", default: 1 },
        { name: "time", type: "number", label: "Duration (Emit)", default: 3 },
        { name: "direction", type: "select", label: "Direction", options: ["top-bottom", "bottom-top", "left-right", "right-left"], default: "top-bottom" }
    ],
    "RainImage": [
        { name: "content", type: "text", label: "Image Path", default: `modules/${MODULE_ID}/assets/images/cute-head.webp` },
        { name: "count", type: "number", label: "Count (Burst)", default: 80 },
        { name: "speed", type: "number", label: "Speed", default: 300 },
        { name: "scale", type: "number", label: "Scale", default: 1 },
        { name: "time", type: "number", label: "Duration (Emit)", default: 3 },
        { name: "direction", type: "select", label: "Direction", options: ["top-bottom", "bottom-top", "left-right", "right-left"], default: "top-bottom" }
    ],
    "ScreenBorder": [
        { name: "active", type: "checkbox", label: "Active", default: true },
        { name: "color", type: "color", label: "Color", default: "#ff0000" },
        { name: "thickness", type: "number", label: "Thickness", default: 20 }
    ],
    "ScreenCover": [
        { name: "content", type: "text", label: "Image/Video URL", default: `modules/${MODULE_ID}/assets/images/light-vs-dark.webp` },
        { name: "audio", type: "text", label: "Audio URL", default: `modules/${MODULE_ID}/assets/audio/light-vs-dark.mp3` },
        { name: "opacity", type: "number", label: "Opacity", default: 1.0 },
        { name: "duration", type: "number", label: "Duration (sec)", default: 5 }
    ],
    "ScreenShake": [
        { name: "intensity", type: "select", label: "Intensity", options: ["mild", "heavy", "extreme"], default: "heavy" },
        { name: "duration", type: "number", label: "Duration (ms)", default: 500 }
    ],
    "Slideshow": [
        { name: "content", type: "text", label: "Folder Path", default: `modules/${MODULE_ID}/assets/images/slideshow` },
        { name: "interval", type: "number", label: "Slide Time (sec)", default: 3 },
        { name: "fade", type: "number", label: "Crossfade (ms)", default: 1000 }
    ],
    "Spin": [
        { name: "angle", type: "number", label: "Angle", default: 360 },
        { name: "duration", type: "number", label: "Duration (ms)", default: 2000 },
        { name: "direction", type: "select", label: "Direction", options: ["clockwise", "counter-clockwise"], default: "clockwise" }
    ],
    "Text": [
        { name: "content", type: "text", label: "Message", default: "VICTORY" },
        { name: "color", type: "text", label: "Color", default: "gold" },
        { name: "backgroundColor", type: "color", label: "Background", default: "#000000" },
        { name: "fill", type: "select", label: "Fill Mode", options: ["box", "band", "full"], default: "full" },
        { name: "fontFamily", type: "text", label: "Font Family", default: "Impact, sans-serif" },
        { name: "animation", type: "select", label: "Animation", options: ["none", "pulse", "shake"], default: "none" },
        { name: "duration", type: "number", label: "Duration (sec)", default: 5 }
    ],
    "Vignette": [
        { name: "intensity", type: "number", label: "Intensity", default: 0.8 },
        { name: "color", type: "text", label: "Color", default: "black" },
        { name: "duration", type: "number", label: "Duration (sec)", default: 0 }
    ]
};

// Effects whose first parameter is the free-form "content" field rather than an options-only call.
const CONTENT_FIRST_EFFECTS = ["Rain", "RainImage", "Text", "ScreenCover", "Slideshow"];

// One-line explanation per effect, shown in the Builder's help tooltip.
const EFFECT_DESCRIPTIONS = {
    BlackAndWhite: "Desaturates the screen to black and white.",
    Blur: "Blurs the entire screen.",
    Colorfy: "Applies a colored multiply overlay to the screen.",
    Countdown: "Displays a large number counting down (or up) from a start value to an end value.",
    Curtain: "Closes and opens theater curtains over the screen.",
    Flash: "A sudden bright flash of light, optionally repeated.",
    GlassShatter: "Simulates the screen shattering into glass shards. Includes a screen shake.",
    Letterbox: "Adds cinematic black bars to the top and bottom of the screen.",
    NightVision: "Applies a green night-vision filter to the screen.",
    Pulsate: "Makes the screen zoom in and out rhythmically, like a heartbeat.",
    Rain: "Spawns emoji or text particles raining across the screen.",
    RainImage: "Spawns an image raining across the screen.",
    ScreenBorder: "Toggles a pulsing colored border around the screen (e.g. a low health alert).",
    ScreenCover: "Displays a full-screen image or video.",
    ScreenShake: "Shakes the screen to simulate an impact.",
    Slideshow: "Displays a sequence of images from a folder with crossfade transitions.",
    Spin: "Rotates the entire game view.",
    Text: "Displays a massive text message overlay.",
    Vignette: "Darkens the edges of the screen."
};

/**
 * Lets the GM tweak an effect's parameters, preview it immediately, and
 * turn the current settings into a ready-to-use script macro.
 */
export class CanvasFXBuilderApp extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(manager, options = {}) {
        super(options);
        this.manager = manager;
    }

    static DEFAULT_OPTIONS = {
        id: "canvas-fx-builder",
        classes: [MODULE_ID, "canvas-fx-builder"],
        window: { title: "Canvas FX - Builder" },
        position: { width: 480, height: "auto" },
        actions: {
            play: this.prototype.playEffect,
            createMacro: this.prototype.createMacro,
            reset: this.prototype.resetEffect,
            clear: this.prototype.clearEffects
        }
    };

    static PARTS = {
        content: { template: TEMPLATES.BUILDER }
    };

    async _prepareContext(options) {
        return { effects: EFFECTS };
    }

    _onRender(context, options) {
        const select = this.element.querySelector("#cfx-builder-select");
        const helpIcon = this.element.querySelector("#cfx-builder-help");
        const groups = this.element.querySelectorAll(".cfx-effect-group");

        const showGroup = (effectName) => {
            for (const group of groups) group.style.display = group.dataset.effect === effectName ? "" : "none";
            helpIcon.dataset.tooltip = EFFECT_DESCRIPTIONS[effectName] ?? "";
        };

        showGroup(select.value);

        select.addEventListener("change", (event) => {
            showGroup(event.target.value);
            this.setPosition({ height: "auto" });
        });

        helpIcon.addEventListener("click", () => game.tooltip.activate(helpIcon, { locked: true }));
    }

    /**
     * Reads the current form values for one effect group.
     */
    getParams(effectName) {
        const inputs = this.element.querySelectorAll(
            `.cfx-effect-group[data-effect="${effectName}"] input, .cfx-effect-group[data-effect="${effectName}"] select`
        );
        const params = {};
        let mainContent = null;

        for (const input of inputs) {
            let value = input.type === "checkbox" ? input.checked : input.value;
            if (input.type === "number" || input.dataset.type === "number") value = parseFloat(value);

            if (input.name === "content") mainContent = value;
            else params[input.name] = value;
        }

        return { mainContent, params };
    }

    get selectedEffect() {
        return this.element.querySelector("#cfx-builder-select").value;
    }

    playEffect() {
        const effect = this.selectedEffect;
        const { mainContent, params } = this.getParams(effect);

        if (effect === "Countdown") this.manager.Countdown(params);
        else if (CONTENT_FIRST_EFFECTS.includes(effect)) this.manager[effect](mainContent, params);
        else if (this.manager[effect]) this.manager[effect](params);
    }

    async createMacro() {
        const effect = this.selectedEffect;
        const { mainContent, params } = this.getParams(effect);

        let command = `// Canvas FX - ${effect}\n`;
        const paramsStr = JSON.stringify(params, null, 2);
        if (CONTENT_FIRST_EFFECTS.includes(effect)) command += `CanvasFX.${effect}("${mainContent}", ${paramsStr});`;
        else command += `CanvasFX.${effect}(${paramsStr});`;

        const folderName = "CanvasFX Builder";
        let folder = game.folders.find(f => f.name === folderName && f.type === "Macro");
        if (!folder) folder = await foundry.documents.Folder.create({ name: folderName, type: "Macro" });

        await foundry.documents.Macro.create({
            name: `CFX: ${effect}`,
            type: "script",
            command,
            folder: folder.id,
            img: "icons/svg/d20.svg"
        });

        ui.notifications.info(`CanvasFX: Macro "CFX: ${effect}" created!`);
    }

    /**
     * Restores the currently selected effect's fields to their default values.
     */
    resetEffect() {
        const effect = this.selectedEffect;
        const group = this.element.querySelector(`.cfx-effect-group[data-effect="${effect}"]`);

        for (const field of EFFECTS[effect]) {
            const input = group.querySelector(`[name="${field.name}"]`);
            if (!input) continue;
            if (field.type === "checkbox") input.checked = !!field.default;
            else input.value = field.default;
        }
    }

    clearEffects() {
        this.manager.Clear();
    }
}
