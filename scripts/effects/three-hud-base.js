/*!
 * Canvas FX
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

/**
 * ThreeHudEffectBase — shared foundation for Canvas FX's Three.js HUD effects.
 * Owns the alpha-safe renderer/scene/camera lifecycle, the RAF loop, resize
 * and mouse-parallax listeners, and full GPU/DOM teardown. It also exposes a
 * combinable "kit" of the holographic building blocks these effects are made
 * of — concentric HUD rings, a gyroscopic reactor core, frame brackets, glass
 * panels, a volumetric beam, glow sprites, ambient particle clouds, drifting
 * sparkles, floating fragments, expanding shockwaves, depth grids, and a
 * generic point-burst particle system (spawn a cloud of points at a given set
 * of origins and let it explode outward and fade).
 *
 * A subclass composes whichever blocks it needs inside `_buildScene(THREE)`
 * and drives its own choreography from `_animate(t, dt)`; this base class
 * only prescribes the lifecycle, not the timeline.
 *
 * No post-processing composer is used anywhere: "bloom" comes from
 * additive-blended sprites and canvas-generated glow textures, which stays
 * compatible with a true-alpha transparent framebuffer.
 */

let threePromise = null;
function loadThree() {
    threePromise ??= import("../../lib/three.module.min.js");
    return threePromise;
}

export const rand = (a, b) => a + Math.random() * (b - a);
// Cheap approximately-normal random in [-1, 1], used to cluster particles at the center
export const randn = () => (Math.random() + Math.random() + Math.random()) / 1.5 - 1;
export const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
export const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

export class ThreeHudEffectBase {
    constructor(container) {
        this.container = container;
        this.disposed = false;
        this._three = null;
        this._resolve = null;
        this._raf = 0;
        this._mouse = { x: 0, y: 0 };
        this._tick = this._tick.bind(this);
    }

    /**
     * Runs the full animation. Resolves when it finishes or is disposed.
     * Subclasses implement `_buildDOM()`, `_buildScene(THREE)` and `_animate(t, dt)`,
     * and set `this.total` (seconds) so the loop knows when to auto-dispose.
     */
    async play() {
        this._buildDOM();
        try {
            const THREE = await loadThree();
            if (!this.disposed) this._buildScene(THREE);
        } catch (err) {
            console.error("CanvasFX | 3D scene unavailable, using fallback.", err);
        }
        if (this.disposed) return;
        return new Promise((resolve) => {
            this._resolve = resolve;
            this._t0 = performance.now();
            this._last = this._t0;
            this._raf = requestAnimationFrame(this._tick);
        });
    }

    /**
     * Stops immediately, frees all GPU/DOM resources, and resolves play().
     * Safe to call more than once.
     */
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        cancelAnimationFrame(this._raf);
        if (this._onResize) window.removeEventListener("resize", this._onResize);
        if (this._onMouse) window.removeEventListener("mousemove", this._onMouse);

        if (this._three) {
            const { renderer, scene, textures } = this._three;
            scene.traverse((obj) => {
                obj.geometry?.dispose();
                if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
                else obj.material?.dispose();
            });
            for (const tex of textures) tex.dispose();
            renderer.dispose();
            this._three = null;
        }

        this.wrap?.remove();
        this.wrap = null;

        const resolve = this._resolve;
        this._resolve = null;
        resolve?.();
    }

    _tick(now) {
        if (this.disposed) return;
        const t = (now - this._t0) / 1000;
        const dt = Math.min((now - this._last) / 1000, 0.1);
        this._last = now;

        this._animate(t, dt);

        if (this.total != null && t >= this.total) {
            this.dispose();
            return;
        }
        this._raf = requestAnimationFrame(this._tick);
    }

    /* --- Renderer / scene scaffold, shared by every Three.js HUD effect --- */

    /**
     * Builds the renderer, scene (+fog), camera and master group, and wires
     * resize/mouse listeners. Inserts the canvas as the wrap's first child so
     * any DOM chrome a subclass appends afterwards paints on top of it.
     * @returns {object} the new `this._three` state, for the subclass to extend.
     */
    _initScene(THREE, { cameraZ = 32, fov = 42, near = 0.1, far = 120, fogDensity = 0.03, canvasClassName = "cfx-hud-canvas" } = {}) {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // alpha + zero clear alpha keeps the framebuffer truly transparent so the
        // game canvas stays visible; solid mode is a CSS backdrop on the wrapper,
        // which lets one renderer config serve both modes.
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        renderer.domElement.className = canvasClassName;
        this.wrap.insertBefore(renderer.domElement, this.wrap.firstChild);

        const scene = new THREE.Scene();
        // Black fog + additive blending fades distant linework to nothing, which
        // also works over a transparent framebuffer (black adds zero light).
        scene.fog = new THREE.FogExp2(0x000000, fogDensity);

        const camera = new THREE.PerspectiveCamera(fov, w / h, near, far);
        camera.position.set(0, 0, cameraZ);

        const master = new THREE.Group();
        scene.add(master);

        const textures = [];
        const glowTex = this._glowTexture(THREE);
        const beamTex = this._beamTexture(THREE);
        textures.push(glowTex, beamTex);

        this._three = { THREE, renderer, scene, camera, master, textures, glowTex, beamTex };

        this._onResize = () => {
            if (!this._three) return;
            const nw = window.innerWidth, nh = window.innerHeight;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        };
        this._onMouse = (event) => {
            this._mouse.x = (event.clientX / window.innerWidth - 0.5) * 2;
            this._mouse.y = (event.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener("resize", this._onResize);
        window.addEventListener("mousemove", this._onMouse);

        return this._three;
    }

    /** Eases the camera toward a sway/parallax position plus an optional dolly target on Z. */
    _updateCamera(t, dt, targetZ = 32) {
        const camera = this._three.camera;
        const ease = Math.min(dt * 2.5, 1);
        const targetX = this._mouse.x * 1.4 + Math.sin(t * 0.31) * 0.7;
        const targetY = -this._mouse.y * 1.0 + Math.cos(t * 0.23) * 0.45;
        camera.position.x += (targetX - camera.position.x) * ease;
        camera.position.y += (targetY - camera.position.y) * ease;
        camera.position.z += (targetZ - camera.position.z) * ease;
        camera.lookAt(0, 0, 0);
    }

    /* --- Material / geometry / texture factories --- */

    _lineMat(THREE, color, opacity) {
        return new THREE.LineBasicMaterial({
            color, transparent: true, opacity,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
    }

    _glassMat(THREE, color, opacity) {
        return new THREE.MeshBasicMaterial({
            color, transparent: true, opacity, side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
    }

    _circleGeo(THREE, radius, segments) {
        const pts = [];
        for (let i = 0; i < segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            pts.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        return geo;
    }

    /** Circle broken into `arcs` arcs, each covering `fill` of its slot — HUD dial linework. */
    _arcGeo(THREE, radius, arcs, fill) {
        const pts = [];
        const stepCount = 24;
        for (let a = 0; a < arcs; a++) {
            const start = (a / arcs) * Math.PI * 2;
            const end = start + (Math.PI * 2 / arcs) * fill;
            for (let s = 0; s < stepCount; s++) {
                const t1 = start + (end - start) * (s / stepCount);
                const t2 = start + (end - start) * ((s + 1) / stepCount);
                pts.push(Math.cos(t1) * radius, Math.sin(t1) * radius, 0);
                pts.push(Math.cos(t2) * radius, Math.sin(t2) * radius, 0);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        return geo;
    }

    /** Four corner L-brackets of a square frame, as one LineSegments geometry. */
    _bracketGeo(THREE, half, arm) {
        const pts = [];
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            pts.push(sx * half, sy * (half - arm), 0, sx * half, sy * half, 0);
            pts.push(sx * half, sy * half, 0, sx * (half - arm), sy * half, 0);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        return geo;
    }

    /** The 12 edges of a cube, as one LineSegments geometry — used for the reactor core. */
    _boxGeo(THREE, half) {
        const c = [
            [-half, -half, -half], [half, -half, -half], [half, half, -half], [-half, half, -half],
            [-half, -half, half], [half, -half, half], [half, half, half], [-half, half, half]
        ];
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7]
        ];
        const pts = [];
        for (const [a, b] of edges) pts.push(...c[a], ...c[b]);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        return geo;
    }

    _glowTexture(THREE) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext("2d");
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.25, "rgba(255,255,255,0.5)");
        g.addColorStop(0.6, "rgba(255,255,255,0.12)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(canvas);
    }

    /** White gradient shaft, bright at the horizontal center, fading at both vertical ends. */
    _beamTexture(THREE) {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        const gx = ctx.createLinearGradient(0, 0, 128, 0);
        gx.addColorStop(0, "rgba(255,255,255,0)");
        gx.addColorStop(0.5, "rgba(255,255,255,0.9)");
        gx.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gx;
        ctx.fillRect(0, 0, 128, 256);
        const gy = ctx.createLinearGradient(0, 0, 0, 256);
        gy.addColorStop(0, "rgba(0,0,0,0)");
        gy.addColorStop(0.5, "rgba(0,0,0,1)");
        gy.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = gy;
        ctx.fillRect(0, 0, 128, 256);
        return new THREE.CanvasTexture(canvas);
    }

    /* --- Combinable HUD building blocks --- */

    /** Concentric facing rings + dial arcs + a distant slow outer ring + two tilted gyroscope rings. */
    _addHudRings(THREE, master, accent, accent2) {
        const ringA = new THREE.LineLoop(this._circleGeo(THREE, 4.2, 128), this._lineMat(THREE, accent, 0.55));
        const ringB = new THREE.LineSegments(this._arcGeo(THREE, 4.8, 4, 0.55), this._lineMat(THREE, accent, 0.85));
        const ringC = new THREE.LineSegments(this._arcGeo(THREE, 3.3, 3, 0.4), this._lineMat(THREE, accent2, 0.6));
        const hex = new THREE.LineLoop(this._circleGeo(THREE, 6.8, 6), this._lineMat(THREE, accent2, 0.3));
        const outerRing = new THREE.LineLoop(this._circleGeo(THREE, 9.6, 128), this._lineMat(THREE, accent2, 0.12));
        const gyroA = new THREE.LineLoop(this._circleGeo(THREE, 5.6, 128), this._lineMat(THREE, accent2, 0.35));
        gyroA.rotation.x = 1.25;
        const gyroB = new THREE.LineLoop(this._circleGeo(THREE, 6.1, 128), this._lineMat(THREE, accent, 0.25));
        gyroB.rotation.x = -1.35;
        gyroB.rotation.y = 0.4;
        master.add(ringA, ringB, ringC, hex, outerRing, gyroA, gyroB);
        return { ringA, ringB, ringC, hex, outerRing, gyroA, gyroB };
    }

    /** Two nested wireframe cubes tumbling independently behind the focal point — a "reactor core". */
    _addReactorCore(THREE, master, accent, accent2, { z = -1.8 } = {}) {
        const reactorMat1 = this._lineMat(THREE, accent, 0.5);
        const reactorMat2 = this._lineMat(THREE, accent2, 0.35);
        const reactorA = new THREE.LineSegments(this._boxGeo(THREE, 1.3), reactorMat1);
        reactorA.rotation.set(0.6, 0.9, 0);
        reactorA.position.z = z;
        const reactorB = new THREE.LineSegments(this._boxGeo(THREE, 1.9), reactorMat2);
        reactorB.rotation.set(-0.4, 0.3, 0.7);
        reactorB.position.z = z;
        master.add(reactorA, reactorB);
        return { reactorA, reactorB, reactorMat1, reactorMat2 };
    }

    _addFrameBrackets(THREE, master, accent, half = 7.6, arm = 1.5) {
        const brackets = new THREE.LineSegments(this._bracketGeo(THREE, half, arm), this._lineMat(THREE, accent, 0.7));
        master.add(brackets);
        return brackets;
    }

    /** `panelCfg` entries are `[width, height, z, opacity, rotationY]`. */
    _addGlassPanels(THREE, master, accent, accent2, panelCfg) {
        const panels = [];
        for (const [pw, ph, pz, op, ry] of panelCfg) {
            const group = new THREE.Group();
            const geo = new THREE.PlaneGeometry(pw, ph);
            group.add(new THREE.Mesh(geo, this._glassMat(THREE, accent2, op)));
            group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), this._lineMat(THREE, accent, 0.22)));
            group.position.z = pz;
            group.rotation.y = ry;
            master.add(group);
            panels.push({ group, baseRotY: ry, phase: rand(0, Math.PI * 2) });
        }
        return panels;
    }

    _updateGlassPanels(panels, t) {
        for (const p of panels) {
            p.group.rotation.y = p.baseRotY + Math.sin(t * 0.6 + p.phase) * 0.04;
            p.group.position.y = Math.sin(t * 0.5 + p.phase) * 0.15;
        }
    }

    /** Volumetric light beam through the center: two crossed additive planes. */
    _addVolumetricBeam(THREE, master, beamTex, accent, { width = 3.2, height = 17, z = -0.5 } = {}) {
        const beamGroup = new THREE.Group();
        const beamMats = [];
        for (const ry of [0, Math.PI / 2]) {
            const mat = new THREE.MeshBasicMaterial({
                map: beamTex, color: accent, transparent: true, opacity: 0.4,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
            });
            const beam = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
            beam.rotation.y = ry;
            beamGroup.add(beam);
            beamMats.push(mat);
        }
        beamGroup.position.z = z;
        master.add(beamGroup);
        return { beamGroup, beamMats };
    }

    /** Soft additive sprite glow — fake bloom, alpha-safe. */
    _addGlow(THREE, master, glowTex, color, { scale = 7, opacity = 0.35, z = -1 } = {}) {
        const mat = new THREE.SpriteMaterial({
            map: glowTex, color, transparent: true, opacity,
            blending: THREE.AdditiveBlending, depthWrite: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(scale, scale, 1);
        sprite.position.z = z;
        master.add(sprite);
        return { sprite, mat };
    }

    /** `cloudCfg` entries are `[count, size, color, opacity]`. Particles orbit and drift upward, wrapping. */
    _addParticleCloud(THREE, master, glowTex, cloudCfg) {
        const clouds = [];
        for (const [count, size, color, opacity] of cloudCfg) {
            const pos = new Float32Array(count * 3);
            const data = {
                radius: new Float32Array(count), angle0: new Float32Array(count),
                angVel: new Float32Array(count), y0: new Float32Array(count), yVel: new Float32Array(count)
            };
            for (let i = 0; i < count; i++) {
                data.radius[i] = clamp(Math.abs(randn()) * 2.4 + 0.3, 0.3, 8);
                data.angle0[i] = rand(0, Math.PI * 2);
                data.angVel[i] = rand(0.05, 0.3) * (Math.random() < 0.5 ? -1 : 1);
                data.y0[i] = rand(-7, 7);
                data.yVel[i] = rand(0.12, 0.5);
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
            const mat = new THREE.PointsMaterial({
                map: glowTex, color, size, transparent: true, opacity,
                blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
            });
            const points = new THREE.Points(geo, mat);
            master.add(points);
            clouds.push({ geo, mat, data, count, baseOpacity: opacity });
        }
        return clouds;
    }

    _updateParticleCloud(clouds, t, kick) {
        for (const cloud of clouds) {
            const pos = cloud.geo.attributes.position;
            const d = cloud.data;
            for (let i = 0; i < cloud.count; i++) {
                const ang = d.angle0[i] + t * d.angVel[i];
                const y = ((d.y0[i] + t * d.yVel[i]) % 14 + 14) % 14 - 7;
                pos.array[i * 3] = Math.cos(ang) * d.radius[i];
                pos.array[i * 3 + 1] = y;
                pos.array[i * 3 + 2] = Math.sin(ang) * d.radius[i];
            }
            pos.needsUpdate = true;
            cloud.mat.opacity = clamp(cloud.baseOpacity * (0.85 + kick * 0.5), 0, 1);
        }
    }

    /**
     * Drifting sparkle motes scattered through a large volume — a slower, non-orbiting
     * particle layer (independent of `_addParticleCloud`) for extra ambient depth.
     */
    _addSparkles(THREE, master, glowTex, { count = 260, color = 0xffffff, size = 0.05, spread = 10, opacity = 0.55 } = {}) {
        const pos = new Float32Array(count * 3);
        const data = {
            base: new Float32Array(count * 3),
            phase: new Float32Array(count),
            speed: new Float32Array(count),
            rise: new Float32Array(count)
        };
        for (let i = 0; i < count; i++) {
            data.base[i * 3] = rand(-spread, spread);
            data.base[i * 3 + 1] = rand(-spread * 0.7, spread * 0.7);
            data.base[i * 3 + 2] = rand(-6, 4);
            data.phase[i] = rand(0, Math.PI * 2);
            data.speed[i] = rand(0.6, 2.2);
            data.rise[i] = rand(0.04, 0.18);
        }
        pos.set(data.base);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            map: glowTex, color, size, transparent: true, opacity,
            blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
        });
        const points = new THREE.Points(geo, mat);
        master.add(points);
        return { geo, mat, data, count, baseOpacity: opacity };
    }

    _updateSparkles(sparkles, t, kick) {
        const pos = sparkles.geo.attributes.position;
        const d = sparkles.data;
        for (let i = 0; i < sparkles.count; i++) {
            const wobble = Math.sin(t * d.speed[i] + d.phase[i]);
            pos.array[i * 3] = d.base[i * 3] + wobble * 0.25;
            pos.array[i * 3 + 1] = d.base[i * 3 + 1] + d.rise[i] * t + wobble * 0.15;
            pos.array[i * 3 + 2] = d.base[i * 3 + 2] + Math.cos(t * d.speed[i] * 0.7 + d.phase[i]) * 0.2;
        }
        pos.needsUpdate = true;
        sparkles.mat.opacity = clamp(sparkles.baseOpacity * (0.6 + 0.4 * Math.sin(t * 1.7)) + kick * 0.25, 0, 0.9);
    }

    /** Small translucent HUD fragments (edged planes, stray lines, glass chips) orbiting the core. */
    _addFragments(THREE, master, accent, accent2, count = 20) {
        const fragGroup = new THREE.Group();
        master.add(fragGroup);
        const fragments = [];
        for (let i = 0; i < count; i++) {
            const type = i % 3;
            const opacity = rand(0.2, 0.55);
            let obj;
            if (type === 0) {
                const geo = new THREE.PlaneGeometry(rand(0.5, 1.4), rand(0.25, 0.8));
                obj = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this._lineMat(THREE, accent, opacity));
                geo.dispose();
            } else if (type === 1) {
                const geo = new THREE.BufferGeometry();
                geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, rand(0.4, 1.2), 0, 0], 3));
                obj = new THREE.LineSegments(geo, this._lineMat(THREE, accent2, opacity));
            } else {
                obj = new THREE.Mesh(new THREE.PlaneGeometry(rand(0.3, 0.7), rand(0.2, 0.5)), this._glassMat(THREE, accent, 0.08));
            }
            const ang = rand(0, Math.PI * 2);
            const radius = rand(4.5, 7.5);
            obj.position.set(Math.cos(ang) * radius, rand(-3, 3), rand(-3, 1.5));
            obj.position.z += Math.sin(ang) * 0.5;
            fragGroup.add(obj);
            fragments.push({
                obj, mat: obj.material, baseY: obj.position.y, baseOpacity: opacity,
                phase: rand(0, Math.PI * 2), bobSpeed: rand(0.4, 1.1), flickerSpeed: rand(1.5, 4)
            });
        }
        return { fragGroup, fragments };
    }

    _updateFragments(fragGroup, fragments, t, dt, kick) {
        fragGroup.rotation.y += dt * 0.06;
        for (const f of fragments) {
            f.obj.position.y = f.baseY + Math.sin(t * f.bobSpeed + f.phase) * 0.25;
            let opacity = f.baseOpacity * (0.55 + 0.45 * Math.sin(t * f.flickerSpeed + f.phase));
            if (Math.sin(t * f.flickerSpeed * 3.7 + f.phase) > 0.985) opacity *= 0.15;
            f.mat.opacity = clamp(opacity + kick * 0.2, 0, 1);
        }
    }

    /** Pooled expanding shockwave rings, fired together for a single volley. */
    _addShockwaves(THREE, master, accent, poolSize = 4) {
        const shockwaves = [];
        for (let i = 0; i < poolSize; i++) {
            const mat = this._lineMat(THREE, accent, 0);
            const line = new THREE.LineLoop(this._circleGeo(THREE, 1, 96), mat);
            line.visible = false;
            master.add(line);
            shockwaves.push({ line, mat, active: false });
        }
        return shockwaves;
    }

    _fireShockwaves(shockwaves, { stagger = 0.35, baseOpacity = 0.9, fade = 0.12 } = {}) {
        shockwaves.forEach((sw, i) => {
            sw.active = true;
            sw.line.visible = true;
            sw.line.scale.setScalar(0.5 + i * stagger);
            sw.mat.opacity = baseOpacity - i * fade;
        });
    }

    _updateShockwaves(shockwaves, dt) {
        for (const sw of shockwaves) {
            if (!sw.active) continue;
            sw.line.scale.setScalar(sw.line.scale.x + dt * 9);
            sw.mat.opacity -= dt * 1.1;
            if (sw.mat.opacity <= 0) {
                sw.active = false;
                sw.line.visible = false;
            }
        }
    }

    /** A faint perspective grid below and a mirrored one above, for depth. */
    _addDepthGrids(THREE, scene, accent, accent2, { size = 46, divisions = 46, floorY = -6.2, ceilY = 6.4, z = -2 } = {}) {
        const grid = new THREE.GridHelper(size, divisions, accent, accent2);
        grid.material.transparent = true;
        grid.material.opacity = 0.1;
        grid.material.blending = THREE.AdditiveBlending;
        grid.material.depthWrite = false;
        grid.position.set(0, floorY, z);
        scene.add(grid);

        const gridTop = new THREE.GridHelper(size, divisions, accent2, accent);
        gridTop.material.transparent = true;
        gridTop.material.opacity = 0.07;
        gridTop.material.blending = THREE.AdditiveBlending;
        gridTop.material.depthWrite = false;
        gridTop.position.set(0, ceilY, z);
        scene.add(gridTop);

        return { grid, gridTop };
    }

    _updateDepthGrids({ grid, gridTop }, t, kick) {
        grid.material.opacity = clamp(0.08 + 0.03 * Math.sin(t * 1.3) + kick * 0.06, 0, 1);
        gridTop.material.opacity = clamp(0.06 + 0.02 * Math.sin(t * 1.1 + 2) + kick * 0.05, 0, 1);
    }

    /* --- Generic point-burst particle system --- */

    /**
     * Creates a dormant point cloud pinned to `originPoints` (array of `[x, y, z]`
     * triples, in the same world space as `master`). Call `_firePointBurst()` to
     * make it erupt outward and `_updatePointBurst()` every frame while active.
     */
    _createPointBurst(THREE, master, glowTex, originPoints, { color = 0xffffff, size = 0.17 } = {}) {
        const count = Math.max(originPoints.length, 1);
        const origin = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const [x, y, z] = originPoints[i] ?? [0, 0, 0];
            origin[i * 3] = x;
            origin[i * 3 + 1] = y;
            origin[i * 3 + 2] = z;
        }
        const pos = new Float32Array(origin);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
            map: glowTex, color, size, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
        });
        const points = new THREE.Points(geo, mat);
        points.visible = false;
        master.add(points);
        return { geo, mat, points, origin, vel: new Float32Array(count * 3), count, elapsed: 0, active: false };
    }

    /** Resets a burst to its origins and launches each point outward from its own local center. */
    _firePointBurst(burst, { speedMin = 1.6, speedMax = 4.4, spread = 0.5, upBiasMin = 0.7, upBiasMax = 2.0 } = {}) {
        const pos = burst.geo.attributes.position;
        for (let i = 0; i < burst.count; i++) {
            const ox = burst.origin[i * 3];
            const oy = burst.origin[i * 3 + 1];
            const oz = burst.origin[i * 3 + 2];
            pos.array[i * 3] = ox;
            pos.array[i * 3 + 1] = oy;
            pos.array[i * 3 + 2] = oz;

            const ang = Math.atan2(oy, ox) + rand(-spread, spread);
            const speed = rand(speedMin, speedMax);
            burst.vel[i * 3] = Math.cos(ang) * speed + rand(-0.3, 0.3);
            burst.vel[i * 3 + 1] = Math.sin(ang) * speed * 0.6 + rand(upBiasMin, upBiasMax);
            burst.vel[i * 3 + 2] = rand(-1.4, 2.0);
        }
        pos.needsUpdate = true;
        burst.mat.opacity = 0;
        burst.elapsed = 0;
        burst.active = true;
        burst.points.visible = true;
    }

    /** Advances an active burst: drag-decayed outward motion, a gentle ember-like rise, and a fade envelope. */
    _updatePointBurst(burst, dt, life = 1.7) {
        if (!burst.active) return;
        burst.elapsed += dt;
        const age = clamp(burst.elapsed / life, 0, 1);
        if (age >= 1) {
            burst.active = false;
            burst.points.visible = false;
            return;
        }
        const pos = burst.geo.attributes.position;
        const drag = Math.exp(-dt * 1.1);
        for (let i = 0; i < burst.count; i++) {
            burst.vel[i * 3] *= drag;
            burst.vel[i * 3 + 1] = burst.vel[i * 3 + 1] * drag + dt * 0.4;
            burst.vel[i * 3 + 2] *= drag;
            pos.array[i * 3] += burst.vel[i * 3] * dt;
            pos.array[i * 3 + 1] += burst.vel[i * 3 + 1] * dt;
            pos.array[i * 3 + 2] += burst.vel[i * 3 + 2] * dt;
        }
        pos.needsUpdate = true;
        burst.mat.opacity = smooth(age / 0.06) * smooth((1 - age) / 0.45);
    }
}
