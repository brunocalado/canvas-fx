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

const SOCKET_EVENT = `module.${MODULE_ID}`;

console.log("CanvasFX | Initializing...");

class CanvasFXManager {
    constructor() {
        // DOM Layers for different effect types
        this.layer = null;          // Particles (Rain, Shatter)
        this.borderLayer = null;    // Screen Border
        this.coverLayer = null;     // Full screen images/video
        this.textLayer = null;      // Big Text
        this.filterLayer = null;    // CSS Filters (Blur, BW, etc)
        this.flashLayer = null;     // White flash overlay
        this.letterboxLayer = null; // Cinematic bars
        this.curtainLayer = null;   // Theater curtains
        
        // New Layers
        this.countdownLayer = null; // Countdown numbers
        this.slideshowLayer = null; // Slideshow container

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
    }

    /**
     * Creates and appends necessary DOM elements to the document body if they don't exist.
     */
    initialize() {
        if (document.getElementById("canvas-fx-layer")) return; 

        const createLayer = (id) => {
            let el = document.createElement("div");
            el.id = id;
            document.body.appendChild(el);
            return el;
        };

        this.layer = createLayer("canvas-fx-layer");
        this.borderLayer = createLayer("canvas-fx-border");
        this.coverLayer = createLayer("canvas-fx-cover");
        this.textLayer = createLayer("canvas-fx-text");
        this.filterLayer = createLayer("canvas-fx-filter");
        this.flashLayer = createLayer("canvas-fx-flash");
        this.letterboxLayer = createLayer("canvas-fx-letterbox");
        this.curtainLayer = createLayer("canvas-fx-curtain");
        
        this.countdownLayer = createLayer("canvas-fx-countdown");
        this.slideshowLayer = createLayer("canvas-fx-slideshow");
        
        console.log("CanvasFX | Layers Ready");
    }

    /* --- UI: BUILDER & DEMO --- */

    /**
     * Opens a window displaying available macros from the compendium.
     */
    async Demo() {
        const packName = `${MODULE_ID}.canvasfx-demo-macros`;
        const pack = game.packs.get(packName);

        if (!pack) {
            ui.notifications.warn(`CanvasFX: Compendium '${packName}' not found.`);
            return;
        }

        const documents = await pack.getDocuments();
        if (documents.length === 0) {
            ui.notifications.info("CanvasFX: No macros found in the demo pack.");
            return;
        }

        documents.sort((a, b) => a.name.localeCompare(b.name));

        new CanvasFXDemoApp(this, documents).render(true);
    }

    /**
     * Opens the Effect Builder interface.
     */
    Builder() {
        new CanvasFXBuilderApp(this).render(true);
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
    
    // New Functions
    Countdown(options = {}) { 
        // Validation
        let start = options.start !== undefined ? options.start : 10;
        let end = options.end !== undefined ? options.end : 0;
        if (start < 0) start = 0; if (start > 1000) start = 1000;
        if (end < 0) end = 0; if (end > 1000) end = 1000;
        
        this.emit("countdown", { start, end, ...options }); 
    }

    async Slideshow(path, options = {}) {
        // Resolve images on the initiator client (usually GM)
        // Fixed: Use "data" source for User Data (where modules typically live)
        try {
            const FilePickerClass = foundry.applications.apps.FilePicker.implementation
                ?? foundry.applications.apps.FilePicker;
            const result = await FilePickerClass.browse("data", path);
            const images = result.files.filter(f => f.match(/.(png|jpg|jpeg|webp|gif|webm)$/i));
            
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

    Clear() { this.emit("clear", {}, false); }

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
                case "countdown": this.handleCountdown(data); break;
                case "slideshow": this.handleSlideshow(data); break;
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
        // Stop active loops
        this.running = false;
        
        // Clear intervals/timeouts
        if (this.shakeInterval) clearInterval(this.shakeInterval);
        if (this.slideshowInterval) { clearInterval(this.slideshowInterval); this.slideshowInterval = null; }
        if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
        if (this.countdownTimeout) { clearTimeout(this.countdownTimeout); this.countdownTimeout = null; }

        this.particles = [];
        this.emitters = [];

        // Clear and hide all layers
        if (this.layer) this.layer.innerHTML = "";
        if (this.borderLayer) { this.borderLayer.classList.remove("active"); this.borderLayer.style.display = "none"; this.borderLayer.style.borderWidth = ""; }
        if (this.coverLayer) { this.coverLayer.innerHTML = ""; this.coverLayer.style.display = "none"; this.coverLayer.style.opacity = 0; }
        if (this.textLayer) { this.textLayer.innerHTML = ""; this.textLayer.style.display = "none"; }
        if (this.flashLayer) { this.flashLayer.style.display = "none"; this.flashLayer.style.transition = ""; }
        if (this.letterboxLayer) { this.letterboxLayer.innerHTML = ""; this.letterboxLayer.style.display = "none"; }
        if (this.curtainLayer) { this.curtainLayer.innerHTML = ""; this.curtainLayer.style.display = "none"; }
        if (this.countdownLayer) { this.countdownLayer.innerHTML = ""; this.countdownLayer.style.display = "none"; }
        if (this.slideshowLayer) { this.slideshowLayer.innerHTML = ""; this.slideshowLayer.style.display = "none"; }
        
        // Remove filters
        this._resetFilters();

        // Reset transforms
        document.body.style.transform = "";
        document.body.style.animation = "";
        this.globalRotation = 0;

        console.log("CanvasFX | Cleared all effects.");
    }
    
    // --- SLIDESHOW ---
    handleSlideshow(data) {
        if (!this.slideshowLayer) return;
        const images = data.images;
        if (!images || images.length === 0) return;
        
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
        
        // Initial image
        img1.src = images[0];
        
        if (images.length === 1) {
             // Just one image, allow it to stay for interval then clear?
             // Or just show it. Let's show it, then clear after interval.
             this.slideshowInterval = setTimeout(() => {
                 this.handleClear();
             }, interval);
             return; 
        }
        
        // Start loop
        const nextSlide = () => {
            // Check if we reached the end
            if (currentIndex >= images.length - 1) {
                // We just finished showing the last slide.
                // Wait one more interval so the last slide can be seen, then clear.
                clearInterval(this.slideshowInterval);
                this.slideshowInterval = setTimeout(() => {
                    this.handleClear();
                }, interval);
                return;
            }

            currentIndex++;
            const nextImage = images[currentIndex];
            
            if (activeBuffer === 1) {
                img2.src = nextImage;
                img2.classList.add("active"); img2.classList.remove("next");
                img1.classList.remove("active"); img1.classList.add("next");
                activeBuffer = 2;
            } else {
                img1.src = nextImage;
                img1.classList.add("active"); img1.classList.remove("next");
                img2.classList.remove("active"); img2.classList.add("next");
                activeBuffer = 1;
            }
        };
        
        if (this.slideshowInterval) clearInterval(this.slideshowInterval);
        this.slideshowInterval = setInterval(nextSlide, interval);
    }

    // --- COUNTDOWN ---
    handleCountdown(data) {
        if (!this.countdownLayer) return;
        
        // Ensure integers
        let startVal = parseInt(data.start);
        let endVal = parseInt(data.end);
        if (isNaN(startVal)) startVal = 10;
        if (isNaN(endVal)) endVal = 0;

        const color = data.color || "white";
        const audioPath = data.audio;
        
        // Reset layer
        this.countdownLayer.innerHTML = "";
        this.countdownLayer.style.display = "flex";
        
        // Clear old intervals
        if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
        if (this.countdownTimeout) { clearTimeout(this.countdownTimeout); this.countdownTimeout = null; }
        
        const span = document.createElement("span");
        span.style.color = color;
        span.innerText = startVal;
        
        // Apply initial pulse
        span.classList.add("cfx-pulse-tick");
        
        this.countdownLayer.appendChild(span);
        
        let currentVal = startVal;
        const direction = startVal > endVal ? -1 : 1;
        
        // Trigger sound for first number
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
            // Update value
            currentVal += direction;
            span.innerText = currentVal;
            
            // Pulse Animation Trigger
            span.classList.remove("cfx-pulse-tick");
            void span.offsetWidth; // Force Reflow
            span.classList.add("cfx-pulse-tick");
            
            // Play Sound
            if (audioPath) this.playSound(audioPath, { volume: 0.8 });

            // Check if finished
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
            
            // Create random polygon shape
            const p1 = `${Math.random()*100}% ${Math.random()*100}%`;
            const p2 = `${Math.random()*100}% ${Math.random()*100}%`;
            const p3 = `${Math.random()*100}% ${Math.random()*100}%`;
            el.style.clipPath = `polygon(${p1}, ${p2}, ${p3})`;
            
            const size = 20 + Math.random() * 80;
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;

            // Random spawn position
            const startX = Math.random() * screenW;
            const startY = Math.random() * screenH;

            // Explosion vector calculation
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
        this.curtainLayer.innerHTML = ""; this.curtainLayer.style.display = "block";
        const image = data.image || `modules/${MODULE_ID}/assets/images/curtain.webp`;
        const duration = (data.duration || 2000); 
        const left = document.createElement("div"); left.className = "cfx-curtain-panel left";
        const right = document.createElement("div"); right.className = "cfx-curtain-panel right";
        if (data.image) { left.style.backgroundImage = `url(${data.image})`; right.style.backgroundImage = `url(${data.image})`; }
        this.curtainLayer.appendChild(left); this.curtainLayer.appendChild(right);
        void this.curtainLayer.offsetWidth;
        const t = `transform ${duration}ms cubic-bezier(0.7, 0, 0.84, 0)`;
        left.style.transition = t; right.style.transition = t;
        setTimeout(() => { left.classList.add("open"); right.classList.add("open"); }, 100);
        setTimeout(() => { this.curtainLayer.style.display = "none"; }, duration + 200);
    }

    handleLetterbox(data) {
        if (!this.letterboxLayer) return;
        const isCurrentlyActive = this.letterboxLayer.style.display === "block";
        const target = data.active !== undefined ? data.active : !isCurrentlyActive;
        if (target) {
            this.letterboxLayer.innerHTML = ""; this.letterboxLayer.style.display = "block";
            const height = data.height || "12vh";
            const top = document.createElement("div"); top.className = "cfx-bar top";
            const bottom = document.createElement("div"); bottom.className = "cfx-bar bottom";
            this.letterboxLayer.appendChild(top); this.letterboxLayer.appendChild(bottom);
            setTimeout(() => { top.style.height = height; bottom.style.height = height; }, 50);
        } else {
            this.letterboxLayer.innerHTML = ""; this.letterboxLayer.style.display = "none";
        }
    }

    handleText(data) {
        if (!this.textLayer) return;
        const content = data.content; const duration = (data.duration || 3) * 1000; const color = data.color || "white"; const bg = data.backgroundColor || "black"; const fontFamily = data.fontFamily || "Impact, sans-serif"; const fill = data.fill || "box"; 
        this.textLayer.innerHTML = ""; this.textLayer.style.display = "flex"; this.textLayer.style.opacity = "0";
        const textBox = document.createElement("div"); textBox.className = "cfx-text-box"; textBox.innerText = content; textBox.style.color = color; textBox.style.backgroundColor = bg; textBox.style.fontFamily = fontFamily;
        if (fill === "band") { textBox.style.width = "100%"; textBox.style.borderRadius = "0"; textBox.style.left = "0"; } else if (fill === "full") { textBox.style.width = "100vw"; textBox.style.height = "100vh"; textBox.style.borderRadius = "0"; textBox.style.left = "0"; textBox.style.top = "0"; textBox.style.display = "flex"; textBox.style.justifyContent = "center"; textBox.style.alignItems = "center"; }
        
        // Animations
        const anim = data.animation || "none";
        if (anim === "pulse") textBox.classList.add("cfx-anim-pulse");
        else if (anim === "shake") textBox.classList.add("cfx-anim-shake");

        this.textLayer.appendChild(textBox);
        requestAnimationFrame(() => { this.textLayer.style.opacity = "1"; });
        if (duration > 0) { setTimeout(() => { this.textLayer.style.opacity = "0"; setTimeout(() => { this.textLayer.style.display = "none"; this.textLayer.innerHTML = ""; }, 500); }, duration); }
    }

    handleCover(data) {
        if (!this.coverLayer) return;
        const path = data.content; const duration = (data.duration || 5) * 1000; const opacity = data.opacity !== undefined ? data.opacity : 1.0; const isVideo = path.endsWith(".webm") || path.endsWith(".mp4");
        this.coverLayer.innerHTML = ""; this.coverLayer.style.opacity = "0"; this.coverLayer.style.display = "flex";
        let el; if (isVideo) { el = document.createElement("video"); el.src = path; el.autoplay = true; el.loop = true; el.muted = true; } else { el = document.createElement("img"); el.src = path; }
        el.style.opacity = opacity; this.coverLayer.appendChild(el);
        requestAnimationFrame(() => { this.coverLayer.style.opacity = "1"; });
        if (duration > 0) { setTimeout(() => { this.coverLayer.style.opacity = "0"; setTimeout(() => { this.coverLayer.innerHTML = ""; this.coverLayer.style.display = "none"; }, 1000); }, duration); }
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
                this.flashLayer.style.display = "none";
                this.flashLayer.style.transition = "";
                resolve();
            }, duration));
        };

        for (let i = 0; i < iterations; i++) {
            await performFlash();
            if (i < iterations - 1) {
                await new Promise(r => setTimeout(r, interval));
            }
        }
    }

    handleBlur(d) { this.applyFilter("blur", `blur(${d.intensity||5}px)`, d.duration); }
    handleColorfy(d) { 
        this._resetFilters();
        if(!this.filterLayer) return;
        this.filterLayer.style.display = "block";
        this.filterLayer.style.backgroundColor = d.color || "red";
        this.filterLayer.style.opacity = d.opacity || 0.3;
        this.filterLayer.style.mixBlendMode = "multiply";
        if(d.duration > 0) setTimeout(() => this._resetFilters(), d.duration * 1000);
    }
    handleNightVision(d) { this.applyClassFilter("cfx-night-vision", d.duration); }
    handleBlackAndWhite(d) { this.applyClassFilter("cfx-bw", d.duration); }
    handleVignette(d) {
        this._resetFilters();
        this.filterLayer.style.display = "block";
        this.filterLayer.style.background = `radial-gradient(circle, transparent 50%, rgba(0,0,0,${d.intensity||0.8}) 100%)`;
        if(d.duration > 0) setTimeout(() => this._resetFilters(), d.duration * 1000);
    }

    applyFilter(prop, val, dur) {
        this._resetFilters();
        this.filterLayer.style.display = "block";
        this.filterLayer.style.backdropFilter = val;
        this.filterLayer.style.webkitBackdropFilter = val;
        // Automatically remove filter after duration if specified
        const ms = dur > 0 ? dur * 1000 : 0;
        if(ms > 0) setTimeout(() => this._resetFilters(), ms);
    }
    applyClassFilter(cls, dur) {
        this._resetFilters();
        this.filterLayer.style.display = "block";
        this.filterLayer.classList.add(cls);
        const ms = dur > 0 ? dur * 1000 : 0;
        if(ms > 0) setTimeout(() => this._resetFilters(), ms);
    }
    _resetFilters() {
        if(!this.filterLayer) return;
        this.filterLayer.style.display = "none"; this.filterLayer.className = ""; this.filterLayer.style.background = "";
        this.filterLayer.style.backgroundColor = ""; this.filterLayer.style.opacity = ""; this.filterLayer.style.mixBlendMode = "";
        this.filterLayer.style.backdropFilter = ""; this.filterLayer.style.webkitBackdropFilter = "";
    }

    handleSpin(d) {
        const angle = d.angle || 360; const dir = d.direction || "clockwise";
        if (dir === "clockwise") this.globalRotation += angle; else this.globalRotation -= angle;
        document.body.style.transition = `transform ${d.duration || 2000}ms cubic-bezier(0.25, 1, 0.5, 1)`;
        document.body.style.transform = `rotate(${this.globalRotation}deg)`;
    }
    handlePulsate(d) {
        document.body.style.animation = 'none'; void document.body.offsetHeight;
        document.body.style.setProperty('--cfx-pulse-scale', 1 + (0.02 * (d.intensity || 2)));
        document.body.style.animation = `cfx-pulse-anim ${d.duration || 1000}ms ease-in-out ${d.iterations || "infinite"}`;
    }
    handleShake(d) {
        if (this.shakeInterval) clearInterval(this.shakeInterval);
        const mag = d.intensity === "extreme" ? 20 : d.intensity === "mild" ? 3 : 10;
        const start = Date.now();
        const dur = d.duration || 500;
        this.shakeInterval = setInterval(() => {
            if (Date.now() - start >= dur) { clearInterval(this.shakeInterval); document.body.style.transform = `rotate(${this.globalRotation}deg)`; return; }
            const x = (Math.random() - 0.5) * mag * 2;
            const y = (Math.random() - 0.5) * mag * 2;
            document.body.style.transform = `translate(${x}px, ${y}px) rotate(${this.globalRotation}deg)`;
        }, 16);
    }

    // --- PARTICLE LOOP HANDLING ---

    handleSpawn(d) {
        if (d.time > 0) { 
            // Emitter mode
            this.emitters.push({ data: d, totalParticles: d.count, duration: d.time, elapsed: 0, spawned: 0 }); 
            this.startLoop(); 
        } else { 
            // Burst mode
            this.spawnBatch(d, d.count); 
            this.startLoop(); 
        }
    }
    
    spawnBatch(d, n) {
        const w = window.innerWidth; const h = window.innerHeight;
        // Calculate particle size
        const baseSize = d.type === "image" ? 64 : 32;
        const scale = d.scale || 1;
        const size = baseSize * scale;

        for(let i=0; i<n; i++) {
            const el = document.createElement("div"); el.classList.add("cfx-particle");
            el.style.width = `${size}px`; el.style.height = `${size}px`; el.style.fontSize = `${size}px`;
            if (d.type === "image") { const img = document.createElement("img"); img.src = d.content; el.appendChild(img); } else el.innerText = d.content;
            
            let x, y, vx, vy;
            const s = (d.speed || 300) * (1 + Math.random() * 0.5);
            const dir = d.direction || "top-bottom";
            
            // Determine start position and velocity based on direction
            if (dir === "bottom-top") { x = Math.random() * w; y = h + 100; vx = 0; vy = -s; }
            else if (dir === "left-right") { x = -100; y = Math.random() * h; vx = s; vy = 0; }
            else if (dir === "right-left") { x = w + 100; y = Math.random() * h; vx = -s; vy = 0; }
            else { x = Math.random() * w; y = -100; vx = 0; vy = s; } 

            this.layer.appendChild(el);
            this.particles.push({ element: el, x, y, vx, vy, rotation: Math.random()*360, rotationSpeed: (Math.random()-0.5)*100 });
        }
    }

    startLoop() { 
        if (!this.running) { 
            this.running = true; 
            this.lastTime = performance.now(); 
            requestAnimationFrame(this._animate.bind(this)); 
        } 
    }

    _animate(t) {
        if (!this.running) return;
        const dt = (t - this.lastTime) / 1000; this.lastTime = t;
        const h = window.innerHeight; const w = window.innerWidth;
        
        // Update emitters
        this.emitters = this.emitters.filter(e => {
            e.elapsed += dt;
            const prog = Math.min(e.elapsed / e.duration, 1);
            const target = Math.floor(prog * e.totalParticles);
            if (target > e.spawned) { this.spawnBatch(e.data, target - e.spawned); e.spawned = target; }
            return e.elapsed < e.duration;
        });

        // Update particles
        this.particles = this.particles.filter(p => {
            if (p.gravity) p.vy += p.gravity * dt;
            p.x += p.vx * dt; p.y += p.vy * dt; p.rotation += p.rotationSpeed * dt;
            p.element.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg)`;
            
            // Check bounds to remove particle
            const outside = (p.y > h + 150 || p.y < -150 || p.x > w + 150 || p.x < -150);
            if (outside) p.element.remove();
            return !outside;
        });

        if (this.particles.length > 0 || this.emitters.length > 0) requestAnimationFrame(this._animate.bind(this));
        else this.running = false;
    }
}

const canvasFX = new CanvasFXManager();
Hooks.once('init', () => { window.CanvasFX = canvasFX; console.log("CanvasFX | Initialized"); });
Hooks.once('ready', () => { canvasFX.initialize(); if (game.socket) game.socket.on(SOCKET_EVENT, (p) => canvasFX.executeLocal(p.action, p.payload)); });
