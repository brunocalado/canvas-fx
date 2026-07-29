/*!
 * Canvas FX
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID } from "./constants.js";

const DEMO_ICON = `modules/${MODULE_ID}/assets/logos/logo.webp`;

/**
 * Entries shown in the CanvasFX.Demo() dialog. These used to be Macro
 * documents in a compendium pack; they are now bundled directly as data so
 * the module ships without a LevelDB pack to maintain.
 */
export const DEMO_MACROS = [
    {
        name: "Blur",
        img: DEMO_ICON,
        run: () => CanvasFX.Blur({ intensity: 10, duration: 3 })
    },
    {
        name: "Black and White",
        img: DEMO_ICON,
        run: () => CanvasFX.BlackAndWhite({ duration: 5 })
    },
    {
        name: "Colorfy",
        img: DEMO_ICON,
        run: () => CanvasFX.Colorfy({
            color: "#ff0000",
            opacity: 0.3,
            duration: 5 // Omit to persist until Clear() is called
        })
    },
    {
        name: "Flash",
        img: DEMO_ICON,
        run: () => CanvasFX.Flash({
            duration: 2000,
            color: "#00ffff",
            audio: `modules/${MODULE_ID}/assets/audio/thunder.mp3` // Optional
        })
    },
    {
        name: "Full Screen Cover (Image)",
        img: DEMO_ICON,
        run: () => CanvasFX.ScreenCover(`modules/${MODULE_ID}/assets/images/light-vs-dark.webp`, {
            duration: 4,
            audio: `modules/${MODULE_ID}/assets/audio/light-vs-dark.mp3`
        })
    },
    {
        name: "Full Screen Cover (Video)",
        img: DEMO_ICON,
        run: () => CanvasFX.ScreenCover(`modules/${MODULE_ID}/assets/video/demo.mp4`)
    },
    {
        name: "Glass Shatter",
        img: DEMO_ICON,
        // Simulates the screen shattering like glass, accompanied by a heavy shake.
        run: () => CanvasFX.GlassShatter({ audio: `modules/${MODULE_ID}/assets/audio/glass_shatter.mp3` })
    },
    {
        name: "Letterbox",
        img: DEMO_ICON,
        run: () => CanvasFX.Letterbox()
    },
    {
        name: "Night Vision",
        img: DEMO_ICON,
        run: () => CanvasFX.NightVision({ duration: 10 })
    },
    {
        name: "Pulsate",
        img: DEMO_ICON,
        run: () => CanvasFX.Pulsate({ intensity: 3, duration: 500, iterations: 5 })
    },
    {
        name: "Rain Effects (Emote)",
        img: DEMO_ICON,
        // Instant burst
        run: () => CanvasFX.Rain("🔥", { count: 50, speed: 300, time: 6, scale: 3 })
    },
    {
        name: "Rain Effects (Emote with Sound)",
        img: DEMO_ICON,
        // Timed rain with sound
        run: () => CanvasFX.Rain("💰", {
            count: 80,
            time: 5,
            audio: `modules/${MODULE_ID}/assets/audio/coins.mp3`,
            scale: 2
        })
    },
    {
        name: "Rain Effects (Image)",
        img: DEMO_ICON,
        // Spawns images raining down
        run: () => CanvasFX.RainImage(`modules/${MODULE_ID}/assets/images/cute-head.webp`, {
            count: 20,
            scale: 1.5,
            speed: 200,
            time: 6
        })
    },
    {
        name: "Rain Effects (Text)",
        img: DEMO_ICON,
        // Instant burst
        run: () => CanvasFX.Rain("Level Up!", { count: 20, speed: 300, time: 6, scale: 2 })
    },
    {
        name: "Shake Screen (Extreme)",
        img: DEMO_ICON,
        run: () => CanvasFX.ScreenShake({
            intensity: "extreme",
            duration: 4000,
            direction: "random",
            audio: `modules/${MODULE_ID}/assets/audio/earthquake.mp3`
        })
    },
    {
        name: "Shake Screen (Vertical / Heavy)",
        img: DEMO_ICON,
        run: () => CanvasFX.ScreenShake({ intensity: "heavy", duration: 500, direction: "vertical" })
    },
    {
        name: "Spin",
        img: DEMO_ICON,
        run: () => CanvasFX.Spin({ angle: 360, duration: 2000, direction: "clockwise" })
    },
    {
        name: "Text (Giant Overlay)",
        img: DEMO_ICON,
        // Classic "Game Over" style
        run: () => CanvasFX.Text("GAME OVER", {
            color: "red",
            backgroundColor: "black",
            duration: 5,
            fill: "band"
        })
    },
    {
        name: "Text (Giant Overlay + Sound)",
        img: DEMO_ICON,
        run: () => CanvasFX.Text("VICTORY", {
            color: "gold",
            backgroundColor: "rgba(0,0,0,0.5)",
            audio: `modules/${MODULE_ID}/assets/audio/victory.mp3`
        })
    },
    {
        name: "Vignette",
        img: DEMO_ICON,
        run: () => CanvasFX.Vignette({
            intensity: 0.5, // 0.0 to 1.0
            color: "black",
            duration: 0 // 0 = permanent until Clear() is called
        })
    },
    {
        name: "Visual Alert (Border)",
        img: DEMO_ICON,
        run: () => CanvasFX.ScreenBorder()
    },
    {
        name: "Visual Alert (Custom Border)",
        img: DEMO_ICON,
        // Custom thickness and color
        run: () => CanvasFX.ScreenBorder({ color: "#ffff00", thickness: 13 })
    },
    {
        name: "_Clear",
        img: DEMO_ICON,
        run: () => CanvasFX.Clear()
    }
];
