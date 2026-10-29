/*!
 * Canvas FX
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

const DEMO_ICON = "icons/svg/explosion.svg";

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
            color: "#00ffff"
        })
    },
    {
        name: "Glass Shatter",
        img: DEMO_ICON,
        // Simulates the screen shattering like glass, accompanied by a heavy shake.
        run: () => CanvasFX.GlassShatter()
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
        name: "Rain Effects (Emote, Timed)",
        img: DEMO_ICON,
        // Timed rain instead of an instant burst
        run: () => CanvasFX.Rain("💰", {
            count: 80,
            time: 5,
            scale: 2
        })
    },
    {
        name: "Rain Effects (Text)",
        img: DEMO_ICON,
        // Instant burst
        run: () => CanvasFX.Rain("Level Up!", { count: 20, speed: 300, time: 6, scale: 2 })
    },
    {
        name: "Sci-Fi Level Up",
        img: DEMO_ICON,
        // Holographic 3D HUD (Three.js): text erupts into particles once fully formed
        run: () => CanvasFX.SciFiLevelUp({ text: "Level Up" })
    },
    {
        name: "Sci-Fi Level Up (Transparent Background)",
        img: DEMO_ICON,
        run: () => CanvasFX.SciFiLevelUp({
            text: "Level Up",
            background: "transparent"
        })
    },
    {
        name: "Shake Screen (Extreme)",
        img: DEMO_ICON,
        run: () => CanvasFX.ScreenShake({
            intensity: "extreme",
            duration: 4000
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
        name: "Old Film",
        img: DEMO_ICON,
        run: () => CanvasFX.FilmGrain({ duration: 8 })
    },
    {
        name: "Sepia",
        img: DEMO_ICON,
        run: () => CanvasFX.Sepia({ duration: 5 })
    },
    {
        name: "Text (Giant Overlay, Alt Style)",
        img: DEMO_ICON,
        run: () => CanvasFX.Text("VICTORY", {
            color: "gold",
            backgroundColor: "rgba(0,0,0,0.5)"
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
        name: "Recipe: Chapter Title",
        img: DEMO_ICON,
        run: async () => {
            CanvasFX.Letterbox({ active: true });
            // A translucent band, not fill "full": a full black box would hide the letterbox bars
            CanvasFX.Text("Chapter III", { fill: "band", backgroundColor: "rgba(0,0,0,0.6)", fontFamily: "Georgia, serif", duration: 4 });
            await CanvasFX.Delay(4.5);
            CanvasFX.Letterbox({ active: false });
        }
    },
    {
        name: "Recipe: Damage Hit",
        img: DEMO_ICON,
        run: () => {
            CanvasFX.Flash({ color: "#8b0000", duration: 350 });
            CanvasFX.ScreenShake({ intensity: "mild", duration: 250 });
            CanvasFX.Vignette({ color: "darkred", intensity: 0.9, duration: 1 });
        }
    },
    {
        name: "Recipe: Flashback",
        img: DEMO_ICON,
        run: () => {
            CanvasFX.Sepia({ duration: 8 });
            CanvasFX.Blur({ intensity: 1, duration: 8 });
            CanvasFX.FilmGrain({ duration: 8 });
            CanvasFX.Vignette({ intensity: 0.7, duration: 8 });
        }
    },
    {
        name: "Recipe: Earthquake",
        img: DEMO_ICON,
        run: () => {
            CanvasFX.ScreenShake({ intensity: "extreme", duration: 3000 });
            CanvasFX.Rain("🪨", { count: 15, speed: 600 });
        }
    },
    {
        name: "_Clear",
        img: DEMO_ICON,
        run: () => CanvasFX.Clear()
    }
];
