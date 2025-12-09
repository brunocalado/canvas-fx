/**
 * Canvas FX
 * Author: Mestre Digital
 * Screen-space visual effects manager for Foundry VTT.
 */

const SOCKET_NAME = "module.canvas-fx";

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
        
        // Animation State
        this.shakeInterval = null; 
        this.particles = [];
        this.emitters = [];
        this.running = false;
        this.lastTime = 0;
        this.globalRotation = 0; 
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
        
        console.log("CanvasFX | Layers Ready");
    }

    /* --- UI: BUILDER & DEMO --- */

    /**
     * Opens a dialog displaying available macros from the compendium.
     */
    async Demo() {
        const packName = "canvas-fx.canvasfx-demo-macros";
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

        let content = `<div class="cfx-demo-container"><div class="cfx-grid">`;
        documents.forEach(doc => {
            const icon = doc.img || "icons/svg/d20.svg";
            content += `
            <button class="cfx-demo-btn" data-macro-id="${doc.id}">
                <img src="${icon}" width="24" height="24"/>
                <span>${doc.name}</span>
            </button>`;
        });
        content += `</div><div class="cfx-footer"><button class="cfx-clear-btn"><i class="fas fa-trash"></i> Clear All FX</button></div></div>`;

        new Dialog({
            title: "Canvas FX - Demo",
            content: content,
            buttons: {},
            render: (html) => {
                html.find(".cfx-demo-btn").click(async (ev) => {
                    const macroId = ev.currentTarget.dataset.macroId;
                    const macro = documents.find(d => d.id === macroId);
                    if (macro) macro.execute();
                });
                html.find(".cfx-clear-btn").click(() => this.Clear());
            }
        }, { width: 500, height: "auto", classes: ["canvas-fx-dialog"] }).render(true);
    }

    /**
     * Opens the Effect Builder interface.
     */
    async Builder() {
        const templatePath = "modules/canvas-fx/templates/builder.html";
        
        // Configuration for available effects in the UI
        const effects = {
            "Rain": [
                { name: "content", type: "text", label: "Emoji/Text", default: "🔥" },
                { name: "count", type: "number", label: "Count (Burst)", default: 80 },
                { name: "speed", type: "number", label: "Speed", default: 300 },
                { name: "scale", type: "number", label: "Scale", default: 1 },
                { name: "time", type: "number", label: "Duration (Emit)", default: 3 },
                { name: "direction", type: "select", label: "Direction", options: ["top-bottom", "bottom-top", "left-right", "right-left"], default: "top-bottom" }
            ],
            "RainImage": [
                { name: "content", type: "text", label: "Image Path", default: "modules/canvas-fx/assets/images/cute-head.webp" },
                { name: "count", type: "number", label: "Count (Burst)", default: 80 },
                { name: "speed", type: "number", label: "Speed", default: 300 },
                { name: "scale", type: "number", label: "Scale", default: 1 },
                { name: "time", type: "number", label: "Duration (Emit)", default: 3 }
            ],
            "ScreenShake": [
                { name: "intensity", type: "select", label: "Intensity", options: ["mild", "heavy", "extreme"], default: "heavy" },
                { name: "duration", type: "number", label: "Duration (ms)", default: 500 }
            ],
            "GlassShatter": [
                { name: "count", type: "number", label: "Shards", default: 200 },
                { name: "audio", type: "text", label: "Audio URL", default: "modules/canvas-fx/assets/audio/glass_shatter.mp3" }
            ],
            "ScreenBorder": [
                { name: "active", type: "checkbox", label: "Active", default: true },
                { name: "color", type: "color", label: "Color", default: "#ff0000" },
                { name: "thickness", type: "number", label: "Thickness", default: 20 }
            ],
            "Flash": [
                { name: "color", type: "color", label: "Color", default: "#ffffff" },
                { name: "duration", type: "number", label: "Duration (ms)", default: 1000 },
                { name: "iterations", type: "number", label: "Iterations", default: 1 },
                { name: "interval", type: "number", label: "Interval (ms)", default: 200 },
                { name: "audio", type: "text", label: "Audio URL", default: "modules/canvas-fx/assets/audio/thunder.mp3" }
            ],
            "Letterbox": [
                { name: "active", type: "checkbox", label: "Active", default: true },
                { name: "height", type: "text", label: "Height", default: "12vh" }
            ],
            "Curtain": [
                { name: "duration", type: "number", label: "Open Time (ms)", default: 2000 },
                { name: "image", type: "text", label: "Image URL", default: "modules/canvas-fx/assets/images/curtain.webp" }
            ],
            "Text": [
                { name: "content", type: "text", label: "Message", default: "VICTORY" },
                { name: "color", type: "text", label: "Color", default: "gold" },
                { name: "backgroundColor", type: "color", label: "Background", default: "#000000" },
                { name: "fill", type: "select", label: "Fill Mode", options: ["box", "band", "full"], default: "full" },
                { name: "fontFamily", type: "text", label: "Font Family", default: "Impact, sans-serif" },
                { name: "duration", type: "number", label: "Duration (sec)", default: 5 }
            ],
            "ScreenCover": [
                { name: "content", type: "text", label: "Image/Video URL", default: "modules/canvas-fx/assets/images/light-vs-dark.webp" },
                { name: "audio", type: "text", label: "Audio URL", default: "modules/canvas-fx/assets/audio/light-vs-dark.mp3" },
                { name: "opacity", type: "number", label: "Opacity", default: 1.0 },
                { name: "duration", type: "number", label: "Duration (sec)", default: 5 }
            ],
            "Spin": [
                { name: "angle", type: "number", label: "Angle", default: 360 },
                { name: "duration", type: "number", label: "Duration (ms)", default: 2000 },
                { name: "direction", type: "select", label: "Direction", options: ["clockwise", "counter-clockwise"], default: "clockwise" }
            ],
            "Pulsate": [
                { name: "intensity", type: "number", label: "Intensity (1-5)", default: 2 },
                { name: "duration", type: "number", label: "Beat Time (ms)", default: 1000 },
                { name: "iterations", type: "number", label: "Iterations", default: 5 }
            ],
            "Colorfy": [
                { name: "color", type: "color", label: "Color", default: "#ff0000" },
                { name: "opacity", type: "number", label: "Opacity", default: 0.3 },
                { name: "duration", type: "number", label: "Duration (sec)", default: 0 }
            ],
            "Vignette": [
                { name: "intensity", type: "number", label: "Intensity", default: 0.8 },
                { name: "color", type: "text", label: "Color", default: "black" },
                { name: "duration", type: "number", label: "Duration (sec)", default: 0 }
            ],
            "Blur": [
                { name: "intensity", type: "number", label: "Px Radius", default: 1 },
                { name: "duration", type: "number", label: "Duration (sec)", default: 0 }
            ],
            "NightVision": [
                { name: "duration", type: "number", label: "Duration (sec)", default: 0 }
            ],
            "BlackAndWhite": [
                { name: "duration", type: "number", label: "Duration (sec)", default: 0 }
            ]
        };

        const content = await renderTemplate(templatePath, { effects: effects });

        const d = new Dialog({
            title: "Canvas FX - Builder",
            content: content,
            buttons: { close: { label: "Close" } },
            render: (html) => {
                const effectSelect = html.find("#cfx-builder-select");
                
                // Show initial effect fields
                html.find(`.cfx-effect-group`).hide();
                html.find(`.cfx-effect-group[data-effect="Rain"]`).show();

                // Handle effect selection change
                effectSelect.change((ev) => {
                    const selected = ev.target.value;
                    html.find(".cfx-effect-group").hide();
                    html.find(`.cfx-effect-group[data-effect="${selected}"]`).show();
                    d.setPosition({ height: "auto" }); 
                });

                // Handle Play button click
                html.find("#cfx-builder-play").click(() => {
                    const effect = effectSelect.val();
                    const inputs = html.find(`.cfx-effect-group[data-effect="${effect}"] input, .cfx-effect-group[data-effect="${effect}"] select`);
                    const options = {};
                    let mainContent = null;

                    inputs.each((_, input) => {
                        const name = input.name;
                        let value = input.type === "checkbox" ? input.checked : input.value;
                        
                        // Convert numeric inputs
                        if (input.type === "number" || input.dataset.type === "number") {
                            value = parseFloat(value);
                        }

                        if (name === "content") mainContent = value;
                        else options[name] = value;
                    });

                    // Trigger the selected effect
                    if (effect === "Rain") this.Rain(mainContent, options);
                    else if (effect === "RainImage" || effect === "ScreenCover" || effect === "Text") this[effect](mainContent, options);
                    else if (this[effect]) this[effect](options);
                });
                
                // Handle Clear button click
                html.find("#cfx-builder-clear").click(() => {
                    this.Clear();
                });
            }
        }, { width: 400, height: "auto", classes: ["canvas-fx-builder-window"] });
        
        d.render(true);
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
    
    Clear() { this.emit("clear", {}, false); }

    /* --- SOCKET HANDLING --- */
    
    /**
     * Broadcasts the effect to other clients and executes locally.
     */
    emit(action, payload) {
        if (game.socket) {
            game.socket.emit(SOCKET_NAME, { action, payload: { ...payload, sender: game.user.name } });
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
        
        // Handle audio playback (excluding border effect)
        if (data.audio && action !== "border") this.playSound(data.audio, { volume: data.volume });

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
                case "clear": this.handleClear(); break;
            }
        } catch (e) {
            console.error(`CanvasFX | Error executing ${action}:`, e);
        }
    }

    playSound(src, options = {}) {
        if (typeof AudioHelper !== "undefined") AudioHelper.play({ src: src, volume: options.volume || 0.8, autoplay: true }, false);
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
        if (this.shakeInterval) clearInterval(this.shakeInterval);
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
        
        // Remove filters
        this._resetFilters();

        // Reset transforms
        document.body.style.transform = "";
        document.body.style.animation = "";
        this.globalRotation = 0;

        console.log("CanvasFX | Cleared all effects.");
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
        const image = data.image || "modules/canvas-fx/assets/images/curtain.webp"; 
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
Hooks.once('ready', () => { canvasFX.initialize(); if (game.socket) game.socket.on(SOCKET_NAME, (p) => canvasFX.executeLocal(p.action, p.payload)); });
