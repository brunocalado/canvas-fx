/*!
 * Canvas FX
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

/**
 * Sci-Fi Level Up — a chamfered holographic HUD frame that assembles itself on
 * screen and then announces the message.
 *
 * The choreography runs in four beats: a warp-streak burst draws the frame's
 * outline out of nothing, the outline thickens into beveled glass, the
 * instrument panels and circuit traces populate it, and a center flare punches
 * the text in. Everything 3D is built from ThreeHudEffectBase's kit; the text
 * itself stays in the DOM so the typography never inherits the canvas's
 * resampling. Once the text has fully formed, a burst of particles sampled from
 * the glyph silhouette erupts out of it.
 */

import { ThreeHudEffectBase, rand, clamp, smooth } from "./three-hud-base.js";

// Timeline phases (seconds)
const MIN_DURATION = 7;    // Hard floor regardless of what the caller requests
const DEFAULT_TOTAL = 9;   // Auto duration when none is requested
const OUTLINE_AT = 0.95;   // Frame outline has finished drawing itself
const SOLID_AT = 2.0;      // Glass faces and bevels have faded up
const DETAIL_AT = 3.1;     // Instrument panels and traces have finished revealing
const SPAWN_AT = 2.7;      // Text starts forming, overlapping the tail of the detail pass
const LINE_REVEAL = 0.5;   // Matches the CSS reveal transition, plus a small buffer
const BURST_AT = SPAWN_AT + LINE_REVEAL; // Text has fully appeared -> fire the particle burst
const BURST_LIFE = 1.7;    // How long the text-particle burst takes to erupt and fade
const OUTRO = 1.4;

// Frame proportions in world units, sized against the camera's rest distance.
// `_fitScale()` shrinks the whole rig when the viewport is too narrow for these.
const FRAME_W = 30;
const FRAME_H = 15.4;
const FRAME_CUT = 3.0;
const FRAME_BAND = 1.3;
const FRAME_DEPTH = 1.0;
const INNER_W = FRAME_W - FRAME_BAND * 2;
const INNER_H = FRAME_H - FRAME_BAND * 2;

const CAM_START = 54;      // Dollies in from here so the frame sweeps toward the viewer
const CAM_REST = 34;

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
        // The frame's opening is a fixed size in world units while the text is
        // sized in viewport units, so long messages have to be scaled down here
        // or they run past the inner edge.
        const vw = clamp(54 / Math.max(this.text.length, 7), 3.0, 7.8);
        this.wrap.style.setProperty("--cfx-slu-fs", `clamp(28px, ${vw.toFixed(2)}vw, 104px)`);
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
        this._fitTextToOpening(msg);
        void line.offsetWidth; // Force reflow so the "in" transition plays
        line.classList.add("in");
    }

    /**
     * Shrinks the message until it fits the frame's opening. The length-based
     * size set in `_buildDOM()` is only an estimate — glyph widths vary per font
     * and per string — so this measures the laid-out text and is what actually
     * guarantees the words never cross the frame's inner lip.
     */
    _fitTextToOpening(msg) {
        if (!this._three) return;
        const { camera } = this._three;
        const visH = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * CAM_REST;
        const visW = visH * camera.aspect;
        // Opening width projected into CSS pixels, less a margin so the glow
        // around the glyphs stops short of the lip.
        const allowed = (INNER_W * this._fitScale() / visW) * window.innerWidth * 0.88;
        // offsetWidth is the untransformed layout width, so it stays valid while
        // the line still carries its pre-reveal scale.
        const width = msg.offsetWidth;
        if (width > allowed && width > 0) {
            const current = parseFloat(getComputedStyle(msg).fontSize);
            msg.style.fontSize = `${(current * allowed / width).toFixed(1)}px`;
        }
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

    /* --- THREE.JS SCENE --- */

    _buildScene(THREE) {
        // Light fog only: enough to sink the far streaks and dial rings into the
        // background, but not enough to grey down the frame the way a denser
        // falloff would at this camera distance.
        const T = this._initScene(THREE, { cameraZ: CAM_START, fogDensity: 0.011 });

        const accent = new THREE.Color(this.accent);
        const accent2 = new THREE.Color(this.accent2);
        const white = new THREE.Color(0xffffff);
        const { master, glowTex } = T;

        // --- Far background: warp streaks and dial rings ---
        T.streaks = this._addRadialStreaks(THREE, master, accent, 160, { rMin: 0.4, rMax: 34, z: -9 });
        T.tickRings = [
            this._addTickRing(THREE, master, accent2, { radius: 17.5, ticks: 72, tickLen: 0.8, opacity: 0.28, z: -12 }),
            this._addTickRing(THREE, master, accent, { radius: 22.5, ticks: 96, tickLen: 1.1, major: 6, opacity: 0.2, z: -15 }),
            this._addTickRing(THREE, master, accent2, { radius: 27.5, ticks: 120, tickLen: 1.4, major: 8, opacity: 0.13, z: -18, ring: false })
        ];

        // --- Reticle behind the opening: concentric dial arcs ---
        T.reticle = new THREE.Group();
        T.reticle.position.z = -2.2;
        T.reticleMats = [];
        const addArc = (obj, mat) => { T.reticle.add(obj); T.reticleMats.push({ mat, base: mat.opacity }); };
        for (const [radius, arcs, fill, color, opacity] of [
            [4.2, 1, 1, accent, 0.30],
            [5.3, 4, 0.6, accent, 0.55],
            [6.1, 1, 1, accent2, 0.22],
            [6.9, 3, 0.42, accent, 0.40],
            [7.8, 6, 0.28, accent2, 0.30]
        ]) {
            const mat = this._lineMat(THREE, color, opacity);
            const geo = arcs === 1
                ? this._circleGeo(THREE, radius, 128)
                : this._arcGeo(THREE, radius, arcs, fill);
            addArc(arcs === 1 ? new THREE.LineLoop(geo, mat) : new THREE.LineSegments(geo, mat), mat);
        }
        master.add(T.reticle);

        // --- Interior: faint glass backplate with a fine grid ---
        T.plateMat = this._glassMat(THREE, accent2, 0.055);
        T.plate = new THREE.Mesh(new THREE.PlaneGeometry(INNER_W, INNER_H), T.plateMat);
        T.plate.position.z = -1.4;
        master.add(T.plate);

        T.gridMat = this._lineMat(THREE, accent, 0.10);
        T.grid = new THREE.LineSegments(this._gridGeo(THREE, INNER_W, INNER_H, 18, 9), T.gridMat);
        T.grid.position.z = -1.3;
        master.add(T.grid);

        // --- The frame itself ---
        // The lip of the opening is pushed toward white so the frame reads as lit
        // hardware rather than a flat cyan outline
        T.frame = this._addHudFrame(THREE, master, accent, accent2, {
            w: FRAME_W, h: FRAME_H, cut: FRAME_CUT, band: FRAME_BAND, depth: FRAME_DEPTH,
            rim: accent.clone().lerp(white, 0.35)
        });
        T.greebleMats = this._addFrameGreebles(THREE, T.frame.group, T.frame.outer, accent, [
            [0.143, 6.4, 0.95, -0.06],   // bottom center
            [0.643, 6.4, 0.95, -0.06],   // top center
            [0.055, 3.0, 0.55, -0.05],
            [0.232, 3.0, 0.55, -0.05],
            [0.555, 3.0, 0.55, -0.05],
            [0.731, 3.0, 0.55, -0.05],
            [0.393, 3.8, 0.70, -0.05],   // right edge
            [0.894, 3.8, 0.70, -0.05]    // left edge
        ]);

        // Corner brackets sitting outside the frame. `_bracketGeo` is square, so
        // the group is stretched on X to match the frame's aspect.
        T.brackets = this._addFrameBrackets(THREE, master, accent, FRAME_H / 2 + 1.9, 2.4);
        T.brackets.scale.x = (FRAME_W / 2 + 2.4) / (FRAME_H / 2 + 1.9);

        // --- Instruments inside the opening, clear of the centered text ---
        T.panels = this._addTelemetryPanels(THREE, master, accent, [
            [-10.4, 2.9, 5.4, 4.1, 3, 0.60],
            [-10.4, -3.0, 5.4, 4.3, 7, 0.52],
            [10.4, 2.9, 5.4, 4.1, 11, 0.60],
            [10.4, -3.0, 5.4, 4.3, 17, 0.52]
        ]);

        // Traces run from the text outward to the instruments, so they read as
        // wiring feeding the readout rather than debris floating past the frame
        // The hub clears the text's own bounds so traces never run across the
        // letters, only around them
        T.traces = this._addCircuitTraces(THREE, master, accent, 12, {
            hubW: 8.4, hubH: 3.1, reach: 4.2, z: -0.6
        });

        // --- Light: flare, core glows, ambient motes ---
        T.flare = this._addCenterFlare(THREE, master, glowTex, white);
        ({ sprite: T.glow, mat: T.glowMat } = this._addGlow(THREE, master, glowTex, accent, { scale: 16, opacity: 0.22, z: -1.8 }));
        ({ sprite: T.glow2, mat: T.glow2Mat } = this._addGlow(THREE, master, glowTex, accent2, { scale: 8, opacity: 0.18, z: -1.2 }));
        T.sparkles = this._addSparkles(THREE, master, glowTex, { count: 180, color: 0xffffff, size: 0.05, spread: 17, opacity: 0.4 });
        T.shockwaves = this._addShockwaves(THREE, master, accent, 4);

        // Text-shaped particle burst: sampled from the glyph silhouette itself
        const { points: textPoints, aspect: textAspect } = this._sampleTextPoints();
        const worldW = clamp(this.text.length * 1.15 + 3, 9, INNER_W * 0.82);
        const worldH = worldW / textAspect;
        const origins = textPoints.map(([nx, ny]) => [nx * worldW, ny * worldH, rand(-0.3, 0.3)]);
        T.textBurst = this._createPointBurst(THREE, master, glowTex, origins, { color: white, size: 0.19 });
    }

    /**
     * Uniform scale that keeps the frame inside the viewport. The rig is sized
     * for a wide window, so a narrow or short one has to shrink it rather than
     * let the frame run off the edges.
     */
    _fitScale() {
        const { camera } = this._three;
        const visH = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * CAM_REST;
        const visW = visH * camera.aspect;
        return Math.min(visW / (FRAME_W + 13.5), visH / (FRAME_H + 11.0), 1);
    }

    /* --- ANIMATION LOOP --- */

    _animate(t, dt) {
        // Global fade in/out on the wrapper covers both the canvas and the text
        this.wrap.style.opacity = (smooth(t / 0.45) * smooth((this.total - t) / OUTRO)).toFixed(3);

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

        // Phase envelopes. Each stage overlaps the next so the build never stalls.
        const outline = smooth(t / OUTLINE_AT);
        const solid = smooth((t - OUTLINE_AT * 0.7) / (SOLID_AT - OUTLINE_AT * 0.7));
        const detail = smooth((t - SOLID_AT * 0.75) / (DETAIL_AT - SOLID_AT * 0.75));
        const settled = smooth((t - DETAIL_AT) / 1.2);

        this._updateCamera(t, dt, CAM_REST);

        // The rig snaps from slightly oversized down to rest as the frame solidifies
        T.master.scale.setScalar(this._fitScale() * (1.06 - 0.06 * solid) * (1 + kick * 0.05));

        // --- Warp streaks: a burst that hands over to the frame, then a whisper ---
        // The floor stays very low: past the intro these cross the opening, and
        // anything brighter reads as scratches over the text.
        const streakIntensity = clamp(1.15 - solid * 1.1, 0.04, 1.15) + kick * 0.35;
        this._updateRadialStreaks(T.streaks, t, streakIntensity);

        // --- Background dial rings ---
        T.tickRings.forEach((r, i) => {
            const dir = i % 2 === 0 ? 1 : -1;
            r.group.rotation.z += dt * dir * (0.05 + i * 0.02 + kick * 0.35);
            r.mat.opacity = clamp(r.baseOpacity * (0.6 + 0.4 * solid) + kick * 0.12, 0, 1);
        });

        // --- Frame outline draws itself on, then the surfaces fill in ---
        for (const o of T.frame.outlines) {
            o.line.geometry.setDrawRange(0, Math.max(2, Math.floor(o.total * outline)));
            o.mat.opacity = clamp(o.baseOpacity * (0.75 + 0.25 * Math.sin(t * 1.6)) + kick * 0.3, 0, 1);
        }
        T.frame.surfaces.forEach((mat, i) => {
            mat.opacity = clamp(T.frame.surfaceBase[i] * solid * (1 + kick * 0.8), 0, 1);
        });
        for (const mat of T.greebleMats) {
            mat.opacity = clamp(0.85 * solid + kick * 0.25, 0, 1);
        }
        // A shallow tilt that eases out gives the frame volume without ever
        // reading as a spinning object
        T.frame.group.rotation.y = (1 - solid) * -0.42 + Math.sin(t * 0.35) * 0.02;
        T.frame.group.rotation.x = Math.sin(t * 0.27) * 0.012;

        T.brackets.material.opacity = clamp((0.5 + 0.2 * Math.sin(t * 1.9)) * outline + kick * 0.3, 0, 1);
        T.brackets.scale.y = 1.18 - 0.18 * solid;

        // --- Interior ---
        T.plateMat.opacity = clamp(0.055 * solid * (1 + kick * 1.2), 0, 1);
        T.gridMat.opacity = clamp((0.05 + 0.05 * Math.sin(t * 0.9)) * detail + kick * 0.08, 0, 1);
        T.grid.position.x = Math.sin(t * 0.22) * 0.35; // Slow drift keeps the grid alive

        T.reticle.rotation.z += dt * (0.08 + kick * 0.5);
        T.reticleMats.forEach(({ mat, base }, i) => {
            const spin = i % 2 === 0 ? 1 : -1;
            mat.opacity = clamp(base * detail * (0.7 + 0.3 * Math.sin(t * (1.1 + i * 0.3) * spin)) + kick * 0.25, 0, 1);
        });
        T.reticle.children.forEach((child, i) => {
            child.rotation.z += dt * (i % 2 === 0 ? 0.12 : -0.2) * (1 + kick * 3);
        });

        // --- Instruments ---
        this._updateTelemetryPanels(T.panels, t, detail, kick);
        this._updateCircuitTraces(T.traces, t, detail, kick);

        // --- Light ---
        this._updateCenterFlare(T.flare, kick);

        const glowScale = 16 * (1 + 0.03 * Math.sin(t * 2.2)) * (1 + kick * 0.35);
        T.glow.scale.set(glowScale, glowScale * 0.55, 1);
        T.glowMat.opacity = clamp((0.10 + 0.05 * Math.sin(t * 1.8)) * solid + kick * 0.35, 0, 1);

        // The inner glow does double duty: a tight, bright core during the warp
        // (the point every streak converges on) that opens out into the softer
        // pool behind the text once the frame has settled.
        const warpCore = clamp(1 - solid, 0, 1) * smooth(t / 0.2);
        const glow2Scale = 8 * (1 + 0.05 * Math.sin(t * 3.1 + 1)) * (1 + kick * 0.6) * (0.55 + 0.45 * solid);
        T.glow2.scale.set(glow2Scale, glow2Scale * (0.7 + 0.3 * warpCore), 1);
        T.glow2Mat.opacity = clamp((0.10 + 0.05 * Math.sin(t * 2.4)) * settled + 0.42 * warpCore + kick * 0.3, 0, 1);

        this._updateSparkles(T.sparkles, t, kick);
        this._updateShockwaves(T.shockwaves, dt);
        this._updatePointBurst(T.textBurst, dt, BURST_LIFE);

        T.renderer.render(T.scene, T.camera);
    }
}
