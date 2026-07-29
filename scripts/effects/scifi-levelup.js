/*!
 * Canvas FX
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

/**
 * Sci-Fi Level Up — a centered holographic HUD notification built on top of
 * ThreeHudEffectBase: the shared "kit" (rings, reactor core, glass panels,
 * beam, glow, ambient particles, sparkles, fragments, shockwaves, depth
 * grids) forms the backdrop, behind a crisp DOM text stack so the 3D work
 * never blurs the typography. Once the text has fully formed, a burst of
 * particles is sampled from the glyph silhouette itself and erupts outward
 * from it.
 */

import { ThreeHudEffectBase, rand, clamp, smooth } from "./three-hud-base.js";

// Timeline phases (seconds)
const MIN_DURATION = 7;    // Hard floor regardless of what the caller requests
const DEFAULT_TOTAL = 9;   // Auto duration when none is requested
const INTRO = 1.1;         // HUD frame/rings fade & build in
const SPAWN_DELAY = 0.35;  // Extra pause after INTRO before the text starts forming
const SPAWN_AT = INTRO + SPAWN_DELAY;
const LINE_REVEAL = 0.55;  // Matches the CSS reveal transition, plus a small buffer
const BURST_AT = SPAWN_AT + LINE_REVEAL; // Text has fully appeared -> fire the particle burst
const BURST_LIFE = 1.7;    // How long the text-particle burst takes to erupt and fade
const OUTRO = 1.4;

export class SciFiLevelUpEffect extends ThreeHudEffectBase {
    /**
     * @param {HTMLElement} container            Layer element the effect mounts into.
     * @param {object} [options]
     * @param {string} [options.text="Level Up"] Text of the notification.
     * @param {string} [options.background="solid"]  "transparent" | "solid".
     * @param {string} [options.backgroundColor="#000000"] Backdrop for solid mode.
     * @param {number} [options.duration=0]      Total seconds; 0 = auto. Floored at 7s either way.
     * @param {string} [options.accent="#00e5ff"]  Primary hologram color.
     * @param {string} [options.accent2="#2979ff"] Secondary hologram color.
     */
    constructor(container, options = {}) {
        super(container);
        this.text = String(options.text ?? "").trim() || "Level Up";
        this.background = options.background === "transparent" ? "transparent" : "solid";
        this.backgroundColor = options.backgroundColor || "#000000";
        this.accent = options.accent || "#00e5ff";
        this.accent2 = options.accent2 || "#2979ff";

        const requested = Number(options.duration);
        this.total = Math.max(requested > 0 ? requested : DEFAULT_TOTAL, MIN_DURATION);

        this._spawned = false;
        this._burstFired = false;
        this._pulse = 0; // 1 on the text-burst, decays; drives every 3D "kick"
    }

    /* --- DOM (crisp text overlay) --- */

    _buildDOM() {
        this.wrap = document.createElement("div");
        this.wrap.className = "cfx-slu";
        this.wrap.style.opacity = "0";
        this.wrap.style.setProperty("--cfx-slu-accent", this.accent);
        this.wrap.style.setProperty("--cfx-slu-accent2", this.accent2);
        if (this.background === "solid") this.wrap.style.background = this.backgroundColor;

        this.hud = document.createElement("div");
        this.hud.className = "cfx-slu-hud";

        this.stackEl = document.createElement("div");
        this.stackEl.className = "cfx-slu-stack";

        this.hud.appendChild(this.stackEl);
        this.wrap.appendChild(this.hud);
        this.container.appendChild(this.wrap);
    }

    _spawnLine() {
        const line = document.createElement("div");
        line.className = "cfx-slu-line";
        const msg = document.createElement("span");
        msg.className = "cfx-slu-msg";
        msg.textContent = this.text;
        line.appendChild(msg);

        this.stackEl.appendChild(line);
        void line.offsetWidth; // Force reflow so the "in" transition plays
        line.classList.add("in");
    }

    /** Fires once the text has fully formed: a shockwave volley plus the text-shaped particle burst. */
    _burst() {
        this._burstFired = true;
        this._pulse = 1;
        if (!this._three) return;
        this._fireShockwaves(this._three.shockwaves);
        this._firePointBurst(this._three.textBurst);
    }

    /**
     * Rasterizes `this.text` offscreen and returns normalized [-0.5, 0.5] sample
     * points wherever the glyphs are opaque, so particles can spawn in the exact
     * shape of the rendered word instead of a generic radius.
     */
    _sampleTextPoints() {
        const scale = 4; // Supersampled so a sparse point stride still traces clean glyph edges
        const fontSize = 90 * scale;
        const canvas = document.createElement("canvas");
        const measureCtx = canvas.getContext("2d");
        measureCtx.font = `700 ${fontSize}px "Rajdhani","Orbitron","Michroma","Eurostile","Segoe UI",sans-serif`;
        const label = this.text.toUpperCase();
        const textWidth = Math.max(measureCtx.measureText(label).width, fontSize);

        canvas.width = Math.ceil(textWidth) + fontSize;
        canvas.height = Math.ceil(fontSize * 1.5);
        const ctx = canvas.getContext("2d"); // Resizing the canvas resets its state
        ctx.font = `700 ${fontSize}px "Rajdhani","Orbitron","Michroma","Eurostile","Segoe UI",sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, canvas.width / 2, canvas.height / 2);

        const { width, height } = canvas;
        const data = ctx.getImageData(0, 0, width, height).data;
        const stride = Math.max(2, Math.round(scale * 1.15));
        const pts = [];
        for (let y = 0; y < height; y += stride) {
            for (let x = 0; x < width; x += stride) {
                if (data[(y * width + x) * 4 + 3] > 120) {
                    pts.push([x / width - 0.5, -(y / height - 0.5)]);
                }
            }
        }

        const MAX_POINTS = 480;
        if (pts.length <= MAX_POINTS) return { points: pts, aspect: width / height };
        const sampled = [];
        const step = pts.length / MAX_POINTS;
        for (let i = 0; i < MAX_POINTS; i++) sampled.push(pts[Math.floor(i * step)]);
        return { points: sampled, aspect: width / height };
    }

    /* --- THREE.JS SCENE: compose the shared kit, plus the text-burst origins --- */

    _buildScene(THREE) {
        const T = this._initScene(THREE, { cameraZ: 38 }); // Dollies in to 32 during the intro

        const accent = new THREE.Color(this.accent);
        const accent2 = new THREE.Color(this.accent2);
        const white = new THREE.Color(0xffffff);
        const { master, glowTex } = T;

        Object.assign(T, this._addHudRings(THREE, master, accent, accent2));
        Object.assign(T, this._addReactorCore(THREE, master, accent, accent2));
        T.brackets = this._addFrameBrackets(THREE, master, accent);
        T.panels = this._addGlassPanels(THREE, master, accent, accent2, [
            [10.5, 5.6, -1.6, 0.050, 0.09],
            [8.6, 4.6, -2.8, 0.045, -0.12],
            [13.0, 7.0, -4.5, 0.030, 0.05],
            [15.5, 8.2, -6.0, 0.022, -0.08]
        ]);
        Object.assign(T, this._addVolumetricBeam(THREE, master, T.beamTex, accent));
        ({ sprite: T.glow, mat: T.glowMat } = this._addGlow(THREE, master, glowTex, accent, { scale: 7, opacity: 0.35, z: -1 }));
        ({ sprite: T.glow2, mat: T.glow2Mat } = this._addGlow(THREE, master, glowTex, accent2, { scale: 4.5, opacity: 0.25, z: -0.6 }));
        T.particles = this._addParticleCloud(THREE, master, glowTex, [
            [380, 0.13, accent, 0.75],
            [70, 0.28, white, 0.5],
            [40, 0.09, accent2, 0.6]
        ]);
        T.sparkles = this._addSparkles(THREE, master, glowTex, { count: 220, color: 0xffffff, size: 0.045, spread: 11, opacity: 0.5 });
        Object.assign(T, this._addFragments(THREE, master, accent, accent2, 20));
        T.shockwaves = this._addShockwaves(THREE, master, accent, 4);
        Object.assign(T, this._addDepthGrids(THREE, T.scene, accent, accent2));

        // Text-shaped particle burst: sampled from the glyph silhouette itself
        const { points: textPoints, aspect: textAspect } = this._sampleTextPoints();
        const worldW = clamp(this.text.length * 0.85 + 2, 7, 17);
        const worldH = worldW / textAspect;
        const origins = textPoints.map(([nx, ny]) => [nx * worldW, ny * worldH, rand(-0.3, 0.3)]);
        T.textBurst = this._createPointBurst(THREE, master, glowTex, origins, { color: white, size: 0.17 });
    }

    /* --- ANIMATION LOOP --- */

    _animate(t, dt) {
        // Global fade in/out on the wrapper covers both the canvas and the text
        this.wrap.style.opacity = (smooth(t / INTRO) * smooth((this.total - t) / OUTRO)).toFixed(3);

        if (!this._spawned && t >= SPAWN_AT) {
            this._spawned = true;
            this._spawnLine();
        }
        if (!this._burstFired && t >= BURST_AT) {
            this._burst();
        }

        this._pulse *= Math.exp(-dt * 2.6);
        if (this._three) this._update3D(t, dt);
    }

    _update3D(t, dt) {
        const T = this._three;
        const kick = this._pulse;
        const intro = smooth(t / INTRO);

        this._updateCamera(t, dt, 32);

        T.master.scale.setScalar((0.9 + 0.1 * intro) * (1 + kick * 0.07));

        T.ringA.rotation.z += dt * (0.3 + kick * 1.5);
        T.ringB.rotation.z -= dt * (0.5 + kick * 2.0);
        T.ringC.rotation.z += dt * (0.75 + kick * 2.4);
        T.hex.rotation.z -= dt * 0.08;
        T.outerRing.rotation.z -= dt * 0.05;
        T.outerRing.material.opacity = clamp(0.12 + 0.05 * Math.sin(t * 0.7) + kick * 0.15, 0, 0.4);
        T.gyroA.rotation.y = t * 0.5;
        T.gyroA.rotation.x = 1.25 + Math.sin(t * 0.4) * 0.1;
        T.gyroB.rotation.y = 0.4 - t * 0.35;

        T.reactorA.rotation.x += dt * (0.3 + kick * 0.8);
        T.reactorA.rotation.y += dt * (0.22 + kick * 0.6);
        T.reactorB.rotation.x -= dt * (0.18 + kick * 0.5);
        T.reactorB.rotation.y -= dt * (0.35 + kick * 0.9);
        const reactorScale = (0.9 + 0.1 * intro) * (1 + kick * 0.12);
        T.reactorA.scale.setScalar(reactorScale);
        T.reactorB.scale.setScalar(reactorScale * 1.05);
        T.reactorMat1.opacity = clamp(0.45 + 0.1 * Math.sin(t * 1.4) + kick * 0.35, 0, 1);
        T.reactorMat2.opacity = clamp(0.3 + 0.08 * Math.sin(t * 1.1 + 1) + kick * 0.3, 0, 1);

        T.brackets.scale.setScalar((1.25 - 0.25 * intro) * (1 + kick * 0.05));
        T.brackets.material.opacity = clamp(0.6 + 0.15 * Math.sin(t * 1.7) + kick * 0.3, 0, 1);

        this._updateGlassPanels(T.panels, t);

        T.beamGroup.rotation.y += dt * 0.4;
        const beamOpacity = clamp(0.3 + 0.15 * Math.sin(t * 2.2) + kick * 0.5, 0, 0.9);
        for (const mat of T.beamMats) mat.opacity = beamOpacity;
        T.beamGroup.scale.x = 1 + kick * 0.8;
        T.beamGroup.scale.z = 1 + kick * 0.8;

        const glowScale = 7 * (1 + 0.04 * Math.sin(t * 3)) * (1 + kick * 1.1);
        T.glow.scale.set(glowScale, glowScale, 1);
        T.glowMat.opacity = clamp(0.3 + 0.1 * Math.sin(t * 2.6) + kick * 0.55, 0, 1);

        const glow2Scale = 4.5 * (1 + 0.05 * Math.sin(t * 3.6 + 1)) * (1 + kick * 0.8);
        T.glow2.scale.set(glow2Scale, glow2Scale, 1);
        T.glow2Mat.opacity = clamp(0.2 + 0.08 * Math.sin(t * 2.1) + kick * 0.4, 0, 1);

        this._updateParticleCloud(T.particles, t, kick);
        this._updateSparkles(T.sparkles, t, kick);
        this._updateFragments(T.fragGroup, T.fragments, t, dt, kick);
        this._updateShockwaves(T.shockwaves, dt);
        this._updatePointBurst(T.textBurst, dt, BURST_LIFE);
        this._updateDepthGrids(T, t, kick);

        T.renderer.render(T.scene, T.camera);
    }
}
