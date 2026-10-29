/*!
 * Canvas FX
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID } from "./constants.js";
import { CanvasFXDemoApp } from "./apps/demo.js";
import { CanvasFXBuilderApp } from "./apps/builder.js";
import { DEMO_MACROS } from "./demo-macros.js";
import { SciFiLevelUpEffect } from "./effects/scifi-levelup.js";

const SOCKET_EVENT = `module.${MODULE_ID}`;

// Every full-screen layer the manager owns: field name → element id. Fields keep
// their names, so handlers address them as before.
const LAYERS = {
    layer: "canvas-fx-layer",            // particles (Rain, Shatter)
    borderLayer: "canvas-fx-border",
    coverLayer: "canvas-fx-cover",
    textLayer: "canvas-fx-text",
    flashLayer: "canvas-fx-flash",
    letterboxLayer: "canvas-fx-letterbox",
    curtainLayer: "canvas-fx-curtain",
    countdownLayer: "canvas-fx-countdown",
    slideshowLayer: "canvas-fx-slideshow",
    levelupLayer: "canvas-fx-levelup"
};

// Each filter kind is its own <body> child, painted by this z-index. Inside one shared fixed
// container a kind's mix-blend-mode would blend only with the other kinds, not with the page.
// One element with a combined backdrop-filter list would not do either: Colorfy, Night Vision
// and Vignette are painted overlays, not filter functions.
// Backdrop filters sit lowest so the painted overlays above them are not blurred or greyed;
// the vignette frames the colour kinds. Grain is on the lens, above ScreenCover and weather.
const FILTER_Z = { blur: 120001, bw: 120002, sepia: 120003, colorfy: 120004, night: 120005, vignette: 120006, grain: 165000 };

class CanvasFXManager {
    // Auto-hide timers keyed by layer. Restarting an effect on a layer replaces its
    // pending timer, and Clear() cancels all of them, so a stale timeout can never
    // hide an effect that started after it.
    #timers = new Map();
    // Bumped by every Flash and by Clear(); a running Flash loop stops when its token is stale.
    #flashRun = 0;
    // Stop functions of animated filter kinds, called before their element is removed.
    #filterStops = new Map();

    constructor() {
        // DOM layers, one field per LAYERS entry
        for (const key of Object.keys(LAYERS)) this[key] = null;

        // Animation State
        this.shakeInterval = null; 
        this.particles = [];
        this.emitters = [];
        this.running = false;
        this.lastTime = 0;
        this.globalRotation = 0; 
        
        // Interval Handles
        this.slideshowInterval = null;
        this.countdownInterval = null;
        this.countdownTimeout = null;

        // Active Sci-Fi Level Up instance (owns its own RAF loop and WebGL context)
        this.levelUpEffect = null;
    }

    #schedule(key, fn, ms) {
        clearTimeout(this.#timers.get(key));
        this.#timers.set(key, setTimeout(() => { this.#timers.delete(key); fn(); }, ms));
    }

    #cancel(key) {
        clearTimeout(this.#timers.get(key));
        this.#timers.delete(key);
    }

    /**
     * Creates and appends necessary DOM elements to the document body if they don't exist.
     */
    initialize() {
        if (document.getElementById("canvas-fx-layer")) return; 

        for (const [key, id] of Object.entries(LAYERS)) {
            const el = document.createElement("div");
            el.id = id;
            document.body.appendChild(el);
            this[key] = el;
        }
    }

    /* --- UI: BUILDER & DEMO --- */

    /**
     * Opens a window displaying the bundled demo macros.
     */
    Demo() {
        // Reuse the open window instead of orphaning it under a second instance
        let app = foundry.applications.instances.get("canvas-fx-demo");
        if (!app) {
            const macros = [...DEMO_MACROS].sort((a, b) => a.name.localeCompare(b.name));
            app = new CanvasFXDemoApp(this, macros);
        }
        app.render(true);
    }

    /**
     * Opens the Effect Builder interface.
     */
    Builder() {
        // Reuse the open window, so a second call keeps what was typed in it
        const app = foundry.applications.instances.get("canvas-fx-builder") ?? new CanvasFXBuilderApp(this);
        app.render(true);
    }

    /* --- PUBLIC SHORTCUTS --- */
    Rain(content, options = {}) { this.emit("spawn", { type: "text", content, ...options }); }
    RainImage(path, options = {}) { this.emit("spawn", { type: "image", content: path, ...options }); }
    
    ScreenShake(options = {}) { this.emit("shake", options); }
    GlassShatter(options = {}) { this.emit("shatter", options); }
    
    ScreenBorder(options = {}) { this.emit("border", options); }
    ScreenCover(path, options = {}) { this.emit("cover", { content: path, ...options }); }
    Text(content, options = {}) { this.emit("text", { content, ...options }); }
    Letterbox(options = {}) { this.emit("letterbox", options); }
    Flash(options = {}) { this.emit("flash", options); }
    Curtain(options = {}) { this.emit("curtain", options); }
    
    Spin(options = {}) { this.emit("spin", options); }
    Pulsate(options = {}) { this.emit("pulsate", options); }
    
    Colorfy(options = {}) { this.emit("filter_color", options); }
    NightVision(options = {}) { this.emit("filter_night", options); }
    BlackAndWhite(options = {}) { this.emit("filter_bw", options); }
    Vignette(options = {}) { this.emit("filter_vignette", options); }
    Blur(options = {}) { this.emit("filter_blur", options); }
    Sepia(options = {}) { this.emit("filter_sepia", options); }
    FilmGrain(options = {}) { this.emit("filter_grain", options); }
    
    Countdown(options = {}) { 
        // Validation
        const start = Math.min(Math.max(options.start ?? 10, 0), 1000);
        const end = Math.min(Math.max(options.end ?? 0, 0), 1000);
        
        // The clamped values have to come last or the raw options overwrite them
        this.emit("countdown", { ...options, start, end });
    }

    SciFiLevelUp(options = {}) { this.emit("scifi_levelup", options); }

    async Slideshow(path, options = {}) {
        // Resolve images on the initiator client (usually GM)
        // Browsed in the User Data source, where world and module files live;
        // core's public icons/ folder is not reachable from here.
        try {
            const FilePickerClass = foundry.applications.apps.FilePicker.implementation
                ?? foundry.applications.apps.FilePicker;
            const result = await FilePickerClass.browse("data", path);
            // Core's list, so it follows whatever image types Foundry supports
            const images = result.files.filter(f => foundry.helpers.media.ImageHelper.hasImageExtension(f));
            
            if (images.length === 0) {
                ui.notifications.warn("CanvasFX: No images found in " + path);
                return;
            }
            
            // Send the list of images to everyone
            this.emit("slideshow", { images, ...options });
        } catch (err) {
            console.error("CanvasFX | Slideshow Error:", err);
            ui.notifications.error("CanvasFX: Could not access folder " + path + ". Check console for details.");
        }
    }

    /**
     * Helper to wait for N seconds.
     * usage: await CanvasFX.Delay(2);
     */
    async Delay(seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    Clear() { this.emit("clear", {}); }

    /* --- SOCKET HANDLING --- */
    
    /**
     * Broadcasts the effect to other clients and executes locally.
     */
    emit(action, payload) {
        if (game.socket) {
            game.socket.emit(SOCKET_EVENT, { action, payload: { ...payload, sender: game.user.name } });
        }
        this.executeLocal(action, payload);
    }

    /**
     * Executes the requested effect locally.
     */
    executeLocal(action, data) {
        // Filter out users if specific targets are defined
        if (data.users && Array.isArray(data.users) && data.users.length > 0) {
            if (!data.users.includes(game.user.name)) return;
        }

        this.initialize();
        
        // Handle audio playback (excluding border effect, countdown)
        // Countdown handles its own audio per tick
        if (data.audio && action !== "border" && action !== "countdown") {
            this.playSound(data.audio, { volume: data.volume });
        }

        try {
            switch (action) {
                case "spawn": this.handleSpawn(data); break;
                case "shake": this.handleShake(data); break;
                case "shatter": this.handleShatter(data); break; 
                case "border": this.handleBorder(data); break;
                case "cover": this.handleCover(data); break;
                case "text": this.handleText(data); break;
                case "letterbox": this.handleLetterbox(data); break;
                case "flash": this.handleFlash(data); break;
                case "curtain": this.handleCurtain(data); break;
                case "spin": this.handleSpin(data); break;
                case "pulsate": this.handlePulsate(data); break;
                case "filter_color": this.handleColorfy(data); break; 
                case "filter_night": this.handleNightVision(data); break;
                case "filter_bw": this.handleBlackAndWhite(data); break;
                case "filter_vignette": this.handleVignette(data); break;
                case "filter_blur": this.handleBlur(data); break;
                case "filter_sepia": this.handleSepia(data); break;
                case "filter_grain": this.handleFilmGrain(data); break;
                case "countdown": this.handleCountdown(data); break;
                case "slideshow": this.handleSlideshow(data); break;
                case "scifi_levelup": this.handleSciFiLevelUp(data); break;
                case "clear": this.handleClear(); break;
            }
        } catch (e) {
            console.error(`CanvasFX | Error executing ${action}:`, e);
        }
    }

    playSound(src, options = {}) {
        foundry.audio.AudioHelper.play({ src: src, volume: options.volume || 0.8, autoplay: true }, false);
    }

    colorToRGB(color) {
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.fillStyle = color;
        let hex = ctx.fillStyle; 
        if (hex.startsWith("#")) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `${r}, ${g}, ${b}`;
        }
        return "255, 0, 0"; 
    }

    /* --- EFFECTS IMPLEMENTATION --- */

    /**
     * Resets all effects, layers, animations, and filters.
     */
    handleClear() {
        this.running = false;
        
        if (this.shakeInterval) clearInterval(this.shakeInterval);
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        if (this.countdownTimeout) {
            clearTimeout(this.countdownTimeout);
            this.countdownTimeout = null;
        }
        for (const id of this.#timers.values()) clearTimeout(id);
        this.#timers.clear();
        this.#flashRun++;

        this.particles = [];
        this.emitters = [];

        // Stop the Sci-Fi Level Up effect (frees its WebGL context)
        if (this.levelUpEffect) {
            this.levelUpEffect.dispose();
            this.levelUpEffect = null;
        }

        // Empty and hide every layer. The particle layer is emptied but never hidden,
        // since nothing shows it again.
        for (const key of Object.keys(LAYERS)) {
            const el = this[key];
            if (!el) continue;
            el.innerHTML = "";
            if (key !== "layer") el.style.display = "none";
        }
        if (this.borderLayer) {
            this.borderLayer.classList.remove("active");
            this.borderLayer.style.borderWidth = "";
        }
        if (this.coverLayer) this.coverLayer.style.opacity = 0;
        if (this.flashLayer) this.flashLayer.style.transition = "";

        for (const kind of Object.keys(FILTER_Z)) this.#removeFilter(kind);

        document.body.style.transform = "";
        document.body.style.transition = "";
        document.body.style.animation = "";
        this.globalRotation = 0;
    }
    
    // --- SLIDESHOW ---
    handleSlideshow(data) {
        if (!this.slideshowLayer) return;
        const images = data.images;
        if (!images || images.length === 0) return;
        if (this.slideshowInterval) clearInterval(this.slideshowInterval);

        const interval = (data.interval || 3) * 1000;
        const fadeTime = data.fade || 1000;
        
        this.slideshowLayer.innerHTML = "";
        this.slideshowLayer.style.display = "block";
        
        // Create two buffers for crossfading
        const img1 = document.createElement("img");
        const img2 = document.createElement("img");
        
        img1.className = "cfx-slide active";
        img2.className = "cfx-slide next";
        
        // Setup CSS transition
        const transitionCSS = `opacity ${fadeTime}ms ease-in-out`;
        img1.style.transition = transitionCSS;
        img2.style.transition = transitionCSS;
        
        this.slideshowLayer.appendChild(img1);
        this.slideshowLayer.appendChild(img2);
        
        let currentIndex = 0;
        let activeBuffer = 1; // 1 or 2
        
        img1.src = images[0];
        
        if (images.length === 1) {
             // A single image stays for one interval, then the slideshow ends.
             this.slideshowInterval = setTimeout(() => {
                 this.#endSlideshow();
             }, interval);
             return; 
        }
        
        const nextSlide = () => {
            if (currentIndex >= images.length - 1) {
                // We just finished showing the last slide.
                // Wait one more interval so the last slide can be seen, then clear.
                clearInterval(this.slideshowInterval);
                this.slideshowInterval = setTimeout(() => {
                    this.#endSlideshow();
                }, interval);
                return;
            }

            currentIndex++;
            const nextImage = images[currentIndex];
            
            if (activeBuffer === 1) {
                img2.src = nextImage;
                img2.classList.add("active");
                img2.classList.remove("next");
                img1.classList.remove("active");
                img1.classList.add("next");
                activeBuffer = 2;
            } else {
                img1.src = nextImage;
                img1.classList.add("active");
                img1.classList.remove("next");
                img2.classList.remove("active");
                img2.classList.add("next");
                activeBuffer = 1;
            }
        };

        this.slideshowInterval = setInterval(nextSlide, interval);
    }

    /** Stops the slideshow's timers and hides its layer, leaving every other effect running. */
    #endSlideshow() {
        clearInterval(this.slideshowInterval); // also clears a setTimeout handle: one id pool per window
        this.slideshowInterval = null;
        this.slideshowLayer.innerHTML = "";
        this.slideshowLayer.style.display = "none";
    }

    // --- SCI-FI LEVEL UP ---
    async handleSciFiLevelUp(data) {
        if (!this.levelupLayer) return;

        // Replace any run already in progress
        if (this.levelUpEffect) {
            this.levelUpEffect.dispose();
            this.levelUpEffect = null;
        }
        this.levelupLayer.innerHTML = "";
        this.levelupLayer.style.display = "block";

        const effect = new SciFiLevelUpEffect(this.levelupLayer, data);
        this.levelUpEffect = effect;
        try {
            await effect.play();
        } catch (err) {
            console.error("CanvasFX | Sci-Fi Level Up failed:", err);
        } finally {
            // A newer run or Clear() may already own the layer by the time we finish
            if (this.levelUpEffect === effect) {
                this.levelUpEffect = null;
                this.levelupLayer.style.display = "none";
                this.levelupLayer.innerHTML = "";
            }
        }
    }

    // --- COUNTDOWN ---
    handleCountdown(data) {
        if (!this.countdownLayer) return;
        
        let startVal = parseInt(data.start);
        let endVal = parseInt(data.end);
        if (isNaN(startVal)) startVal = 10;
        if (isNaN(endVal)) endVal = 0;

        const color = data.color || "white";
        const audioPath = data.audio;
        
        this.countdownLayer.innerHTML = "";
        this.countdownLayer.style.display = "flex";
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        if (this.countdownTimeout) {
            clearTimeout(this.countdownTimeout);
            this.countdownTimeout = null;
        }
        
        const span = document.createElement("span");
        span.style.color = color;
        span.innerText = startVal;
        
        span.classList.add("cfx-pulse-tick");
        
        this.countdownLayer.appendChild(span);
        
        let currentVal = startVal;
        const direction = startVal > endVal ? -1 : 1;
        
        if (audioPath) this.playSound(audioPath, { volume: 0.8 });
        
        // If already at end, just show for 1s then hide
        if (startVal === endVal) {
             this.countdownTimeout = setTimeout(() => {
                this.countdownLayer.style.display = "none";
             }, 1000);
             return;
        }

        // Advance 1 step every 1 second
        this.countdownInterval = setInterval(() => {
            currentVal += direction;
            span.innerText = currentVal;
            
            span.classList.remove("cfx-pulse-tick");
            void span.offsetWidth; // Force a reflow so the pulse animation restarts
            span.classList.add("cfx-pulse-tick");
            
            if (audioPath) this.playSound(audioPath, { volume: 0.8 });

            if (currentVal === endVal) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                
                // Wait 1 second showing the final number, then remove
                this.countdownTimeout = setTimeout(() => {
                     this.countdownLayer.style.display = "none";
                     this.countdownLayer.innerHTML = "";
                }, 1000);
            }
        }, 1000);
    }

    handleShatter(options) {
        const count = options.count || 50;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        for (let i = 0; i < count; i++) {
            const el = document.createElement("div");
            el.classList.add("cfx-shard-realistic");
            
            const p1 = `${Math.random()*100}% ${Math.random()*100}%`;
            const p2 = `${Math.random()*100}% ${Math.random()*100}%`;
            const p3 = `${Math.random()*100}% ${Math.random()*100}%`;
            el.style.clipPath = `polygon(${p1}, ${p2}, ${p3})`;
            
            const size = 20 + Math.random() * 80;
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;

            const startX = Math.random() * screenW;
            const startY = Math.random() * screenH;

            const angle = Math.random() * Math.PI * 2;
            const force = 200 + Math.random() * 600;
            const vx = Math.cos(angle) * force;
            const vy = Math.sin(angle) * force;

            const particle = {
                element: el,
                x: startX,
                y: startY,
                vx: vx,
                vy: vy,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 720,
                gravity: 1000 
            };

            el.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;
            this.layer.appendChild(el);
            this.particles.push(particle);
        }
        
        // Trigger shake alongside shatter
        this.handleShake({ intensity: "heavy", duration: 400 });
        this.startLoop();
    }

    handleCurtain(data) {
        if (!this.curtainLayer) return;
        this.curtainLayer.innerHTML = "";
        this.curtainLayer.style.display = "block";
        const duration = (data.duration || 2000);
        const left = document.createElement("div");
        left.className = "cfx-curtain-panel left";
        const right = document.createElement("div");
        right.className = "cfx-curtain-panel right";
        if (data.image) {
            left.style.backgroundImage = `url(${data.image})`;
            right.style.backgroundImage = `url(${data.image})`;
        }
        this.curtainLayer.appendChild(left);
        this.curtainLayer.appendChild(right);
        void this.curtainLayer.offsetWidth;
        const t = `transform ${duration}ms cubic-bezier(0.7, 0, 0.84, 0)`;
        left.style.transition = t;
        right.style.transition = t;
        setTimeout(() => {
            left.classList.add("open");
            right.classList.add("open");
        }, 100);
        this.#schedule("curtain", () => { this.curtainLayer.style.display = "none"; }, duration + 200);
    }

    handleLetterbox(data) {
        if (!this.letterboxLayer) return;
        const isCurrentlyActive = this.letterboxLayer.style.display === "block";
        const target = data.active !== undefined ? data.active : !isCurrentlyActive;
        if (target) {
            this.letterboxLayer.innerHTML = "";
            this.letterboxLayer.style.display = "block";
            const height = data.height || "12vh";
            const top = document.createElement("div");
            top.className = "cfx-bar top";
            const bottom = document.createElement("div");
            bottom.className = "cfx-bar bottom";
            this.letterboxLayer.appendChild(top);
            this.letterboxLayer.appendChild(bottom);
            setTimeout(() => {
                top.style.height = height;
                bottom.style.height = height;
            }, 50);
        } else {
            this.letterboxLayer.innerHTML = "";
            this.letterboxLayer.style.display = "none";
        }
    }

    handleText(data) {
        if (!this.textLayer) return;
        // Cancel first, so a persistent Text also stops an older one's hide
        this.#cancel("text");
        const content = data.content;
        const duration = (data.duration ?? 3) * 1000;
        const color = data.color || "white";
        const bg = data.backgroundColor || "black";
        const fontFamily = data.fontFamily || "Impact, sans-serif";
        const fill = data.fill || "box";
        this.textLayer.innerHTML = "";
        this.textLayer.style.display = "flex";
        this.textLayer.style.opacity = "0";
        const textBox = document.createElement("div");
        textBox.className = "cfx-text-box";
        textBox.innerText = content;
        textBox.style.color = color;
        textBox.style.backgroundColor = bg;
        textBox.style.fontFamily = fontFamily;
        if (fill === "band") {
            textBox.style.width = "100%";
            textBox.style.borderRadius = "0";
            textBox.style.left = "0";
        } else if (fill === "full") {
            textBox.style.width = "100vw";
            textBox.style.height = "100vh";
            textBox.style.borderRadius = "0";
            textBox.style.left = "0";
            textBox.style.top = "0";
            textBox.style.display = "flex";
            textBox.style.justifyContent = "center";
            textBox.style.alignItems = "center";
        }

        const anim = data.animation || "none";
        if (anim === "pulse") textBox.classList.add("cfx-anim-pulse");
        else if (anim === "shake") textBox.classList.add("cfx-anim-shake");

        this.textLayer.appendChild(textBox);
        requestAnimationFrame(() => { this.textLayer.style.opacity = "1"; });
        if (duration > 0) this.#schedule("text", () => {
            this.textLayer.style.opacity = "0";
            this.#schedule("text", () => {
                this.textLayer.style.display = "none";
                this.textLayer.innerHTML = "";
            }, 500);
        }, duration);
    }

    handleCover(data) {
        if (!this.coverLayer) return;
        this.#cancel("cover");
        const path = data.content;
        const duration = (data.duration ?? 5) * 1000;
        const opacity = data.opacity !== undefined ? data.opacity : 1.0;
        const isVideo = path.endsWith(".webm") || path.endsWith(".mp4");
        this.coverLayer.innerHTML = "";
        this.coverLayer.style.opacity = "0";
        this.coverLayer.style.display = "flex";
        let el;
        if (isVideo) {
            el = document.createElement("video");
            el.src = path;
            el.autoplay = true;
            el.loop = true;
            el.muted = true;
        } else {
            el = document.createElement("img");
            el.src = path;
        }
        el.style.opacity = opacity;
        this.coverLayer.appendChild(el);
        requestAnimationFrame(() => { this.coverLayer.style.opacity = "1"; });
        if (duration > 0) this.#schedule("cover", () => {
            this.coverLayer.style.opacity = "0";
            this.#schedule("cover", () => {
                this.coverLayer.innerHTML = "";
                this.coverLayer.style.display = "none";
            }, 1000);
        }, duration);
    }

    handleBorder(options) {
        if (!this.borderLayer) return;
        const isActive = this.borderLayer.classList.contains("active"); 
        const shouldBeActive = options.active !== undefined ? options.active : !isActive; 
        const thickness = options.thickness || 20;
        
        if (shouldBeActive) { 
            this.borderLayer.classList.add("active"); 
            this.borderLayer.style.display = "block";
            this.borderLayer.style.borderWidth = `${thickness}px`; 
            const color = options.color || "red"; 
            const rgb = this.colorToRGB(color); // Returns "r,g,b" string
            this.borderLayer.style.setProperty('--cfx-border-rgb', rgb); 
        } else { 
            this.borderLayer.classList.remove("active"); 
            this.borderLayer.style.display = "none"; 
            this.borderLayer.style.borderWidth = ""; 
            this.borderLayer.style.removeProperty('--cfx-border-rgb'); 
        }
    }

    async handleFlash(data) {
        if (!this.flashLayer) return;
        const duration = data.duration || 1000;
        const color = data.color || "white";
        const iterations = data.iterations || 1;
        const interval = data.interval || 100;
        const run = ++this.#flashRun;

        const performFlash = async () => {
            this.flashLayer.style.display = "block"; 
            this.flashLayer.style.backgroundColor = color;
            this.flashLayer.style.opacity = "1";
            // Trigger reflow to restart CSS transition
            void this.flashLayer.offsetWidth;
            
            // Start fade out
            this.flashLayer.style.transition = `opacity ${duration}ms ease-out`; 
            this.flashLayer.style.opacity = "0";

            return new Promise(resolve => setTimeout(() => {
                if (run === this.#flashRun) {
                    this.flashLayer.style.display = "none";
                    this.flashLayer.style.transition = "";
                }
                resolve();
            }, duration));
        };

        for (let i = 0; i < iterations; i++) {
            if (run !== this.#flashRun) return;
            await performFlash();
            if (i < iterations - 1) {
                if (run !== this.#flashRun) return;
                await new Promise(r => setTimeout(r, interval));
            }
        }
    }

    handleBlur(d) { this.#setFilter("blur", d, el => { el.style.backdropFilter = `blur(${d.intensity || 5}px)`; }); }
    handleBlackAndWhite(d) { this.#setFilter("bw", d, el => el.classList.add("cfx-bw")); }
    handleSepia(d) { this.#setFilter("sepia", d, el => { el.style.backdropFilter = `sepia(${d.intensity ?? 1})`; }); }
    handleNightVision(d) { this.#setFilter("night", d, el => el.classList.add("cfx-night-vision")); }
    handleColorfy(d) {
        this.#setFilter("colorfy", d, el => {
            el.style.backgroundColor = d.color || "red";
            el.style.opacity = d.opacity || 0.3;
            el.style.mixBlendMode = "multiply";
        });
    }
    handleVignette(d) {
        this.#setFilter("vignette", d, el => {
            const rgb = this.colorToRGB(d.color || "black");
            el.style.background = `radial-gradient(circle, transparent 50%, rgba(${rgb}, ${d.intensity || 0.8}) 100%)`;
        });
    }
    handleFilmGrain(d) {
        this.#setFilter("grain", d, el => this.#startGrain(el, {
            intensity: d.intensity ?? 0.35, scratches: d.scratches ?? true, flicker: d.flicker ?? true
        }));
    }

    /**
     * Applies one filter kind, replacing only that kind, and schedules only its own expiry.
     * `apply` may return a stop function for an animated kind; it runs when the kind is removed.
     */
    #setFilter(kind, data, apply) {
        this.#removeFilter(kind);
        if (data.active === false) return;
        const el = document.createElement("div");
        el.id = `canvas-fx-filter-${kind}`;
        el.className = "cfx-filter";
        el.style.zIndex = FILTER_Z[kind];
        const stop = apply(el);
        if (stop) this.#filterStops.set(kind, stop);
        document.body.appendChild(el);
        if (data.duration > 0) this.#schedule(`filter:${kind}`, () => this.#removeFilter(kind), data.duration * 1000);
    }

    #removeFilter(kind) {
        this.#cancel(`filter:${kind}`);
        this.#filterStops.get(kind)?.();
        this.#filterStops.delete(kind);
        document.getElementById(`canvas-fx-filter-${kind}`)?.remove();
    }

    /**
     * Animates film grain, scratches and flicker inside `el` at 24 fps, film cadence.
     * The noise is four tiles generated once and swapped with a random offset each tick, so no
     * pixel work happens per frame; full-screen ImageData noise every frame would cost about half
     * a million random pixels at 1080p for the same look, and animating an SVG feTurbulence seed
     * re-rasterises the whole screen each frame.
     * @returns {Function} stops the loop and frees the tiles
     */
    #startGrain(el, { intensity, scratches, flicker }) {
        el.classList.add("cfx-grain");
        const urls = [];
        let stopped = false;
        let timer = null;
        const alpha = Math.round(Math.min(Math.max(intensity, 0), 1) * 255);
        for (let t = 0; t < 4; t++) {
            const tile = document.createElement("canvas");
            tile.width = tile.height = 256;
            const tileCtx = tile.getContext("2d");
            const img = tileCtx.createImageData(256, 256);
            for (let i = 0; i < img.data.length; i += 4) {
                const v = Math.random() * 255;
                img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
                img.data[i + 3] = alpha;
            }
            tileCtx.putImageData(img, 0, 0);
            tile.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                if (stopped) URL.revokeObjectURL(url);
                else urls.push(url);
            });
        }

        let ctx = null;
        const lines = [];
        if (scratches) {
            const canvas = document.createElement("canvas");
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            el.appendChild(canvas);
            ctx = canvas.getContext("2d");
        }

        const tick = () => {
            if (urls.length) {
                el.style.backgroundImage = `url(${urls[Math.floor(Math.random() * urls.length)]})`;
                el.style.backgroundPosition = `${Math.floor(Math.random() * 256)}px ${Math.floor(Math.random() * 256)}px`;
            }
            if (flicker) el.style.opacity = 0.92 + (Math.random() - 0.5) * 0.16;
            if (ctx) {
                const { width: w, height: h } = ctx.canvas;
                ctx.clearRect(0, 0, w, h);
                if (lines.length < 2 && Math.random() < 0.08) {
                    lines.push({ x: Math.random() * w, life: 3 + Math.floor(Math.random() * 8), alpha: 0.25 + Math.random() * 0.35 });
                }
                for (const line of lines) {
                    line.x += (Math.random() - 0.5) * 3;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${line.alpha})`;
                    ctx.lineWidth = 1 + Math.random();
                    ctx.beginPath();
                    ctx.moveTo(line.x, 0);
                    ctx.lineTo(line.x + (Math.random() - 0.5) * 6, h);
                    ctx.stroke();
                    line.life--;
                }
                for (let i = lines.length - 1; i >= 0; i--) if (lines[i].life <= 0) lines.splice(i, 1);
                const specks = Math.floor(Math.random() * 5);
                for (let i = 0; i < specks; i++) {
                    ctx.fillStyle = Math.random() < 0.5 ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.5)";
                    ctx.beginPath();
                    ctx.arc(Math.random() * w, Math.random() * h, 0.5 + Math.random() * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            timer = setTimeout(tick, 42);
        };
        tick();

        return () => {
            stopped = true;
            clearTimeout(timer);
            for (const url of urls) URL.revokeObjectURL(url);
            urls.length = 0;
        };
    }

    handleSpin(d) {
        const angle = d.angle || 360;
        const dir = d.direction || "clockwise";
        if (dir === "clockwise") this.globalRotation += angle;
        else this.globalRotation -= angle;
        const ms = d.duration || 2000;
        document.body.style.transition = `transform ${ms}ms cubic-bezier(0.25, 1, 0.5, 1)`;
        document.body.style.transform = `rotate(${this.globalRotation}deg)`;
        // The transition is only for this rotation; left on the body it smooths every
        // later ScreenShake frame into a near-still drift.
        this.#schedule("spin", () => { document.body.style.transition = ""; }, ms);
    }
    handlePulsate(d) {
        document.body.style.animation = 'none';
        void document.body.offsetHeight;
        document.body.style.setProperty('--cfx-pulse-scale', 1 + (0.02 * (d.intensity || 2)));
        document.body.style.animation = `cfx-pulse-anim ${d.duration || 1000}ms ease-in-out ${d.iterations || 5}`;
    }
    handleShake(d) {
        if (this.shakeInterval) clearInterval(this.shakeInterval);
        const mag = d.intensity === "extreme" ? 20 : d.intensity === "mild" ? 3 : 10;
        const start = Date.now();
        const dur = d.duration || 500;
        const dir = d.direction || "both";
        this.shakeInterval = setInterval(() => {
            if (Date.now() - start >= dur) {
                clearInterval(this.shakeInterval);
                document.body.style.transform = `rotate(${this.globalRotation}deg)`;
                return;
            }
            const x = dir === "vertical" ? 0 : (Math.random() - 0.5) * mag * 2;
            const y = dir === "horizontal" ? 0 : (Math.random() - 0.5) * mag * 2;
            document.body.style.transform = `translate(${x}px, ${y}px) rotate(${this.globalRotation}deg)`;
        }, 16);
    }

    // --- PARTICLE LOOP HANDLING ---

    handleSpawn(d) {
        // An omitted count still has to spawn something; 20 is the documented default.
        const count = d.count ?? 20;
        if (d.time > 0) {
            this.emitters.push({ data: d, totalParticles: count, duration: d.time, elapsed: 0, spawned: 0 });
        } else {
            this.spawnBatch(d, count);
        }
        this.startLoop();
    }
    
    spawnBatch(d, n) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const baseSize = d.type === "image" ? 64 : 32;
        const scale = d.scale || 1;
        const size = baseSize * scale;

        for(let i=0; i<n; i++) {
            const el = document.createElement("div");
            el.classList.add("cfx-particle");
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
            el.style.fontSize = `${size}px`;
            if (d.type === "image") {
                const img = document.createElement("img");
                img.src = d.content;
                el.appendChild(img);
            } else {
                el.innerText = d.content;
            }

            let x, y, vx, vy;
            const s = (d.speed || 300) * (1 + Math.random() * 0.5);
            const dir = d.direction || "top-bottom";
            
            // Determine start position and velocity based on direction
            if (dir === "bottom-top") {
                x = Math.random() * w;
                y = h + 100;
                vx = 0;
                vy = -s;
            } else if (dir === "left-right") {
                x = -100;
                y = Math.random() * h;
                vx = s;
                vy = 0;
            } else if (dir === "right-left") {
                x = w + 100;
                y = Math.random() * h;
                vx = -s;
                vy = 0;
            } else {
                x = Math.random() * w;
                y = -100;
                vx = 0;
                vy = s;
            }

            this.layer.appendChild(el);
            this.particles.push({
                element: el, x, y, vx, vy,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 100
            });
        }
    }

    startLoop() { 
        if (!this.running) { 
            this.running = true; 
            this.lastTime = performance.now(); 
            requestAnimationFrame(this.#animate); 
        } 
    }

    // An arrow field, so the animation callback is bound once rather than on every frame
    #animate = (t) => {
        if (!this.running) return;
        const dt = (t - this.lastTime) / 1000;
        this.lastTime = t;
        const h = window.innerHeight;
        const w = window.innerWidth;
        
        this.emitters = this.emitters.filter(e => {
            e.elapsed += dt;
            const prog = Math.min(e.elapsed / e.duration, 1);
            const target = Math.floor(prog * e.totalParticles);
            if (target > e.spawned) {
                this.spawnBatch(e.data, target - e.spawned);
                e.spawned = target;
            }
            return e.elapsed < e.duration;
        });

        this.particles = this.particles.filter(p => {
            if (p.gravity) p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rotation += p.rotationSpeed * dt;
            p.element.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg)`;
            
            // Check bounds to remove particle
            const outside = (p.y > h + 150 || p.y < -150 || p.x > w + 150 || p.x < -150);
            if (outside) p.element.remove();
            return !outside;
        });

        if (this.particles.length > 0 || this.emitters.length > 0) requestAnimationFrame(this.#animate);
        else this.running = false;
    };
}

const canvasFX = new CanvasFXManager();
Hooks.once('init', () => {
    window.CanvasFX = canvasFX;
    console.log("CanvasFX | Initialized");
});
Hooks.once('ready', () => {
    canvasFX.initialize();
    if (game.socket) game.socket.on(SOCKET_EVENT, (p) => canvasFX.executeLocal(p.action, p.payload));
});
