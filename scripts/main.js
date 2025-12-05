/**
 * Canvas FX v1.0.0 - Official Release
 * Author: Mestre Digital
 */

const SOCKET_NAME = "module.canvas-fx";

class CanvasFXManager {
    constructor() {
        this.layer = null;       // Particles
        this.borderLayer = null; // Red Border
        this.coverLayer = null;  // Fullscreen Image/Video
        this.textLayer = null;   // Giant Text
        this.shakeInterval = null; // Timer for random shake
        this.particles = [];
        this.emitters = [];
        this.running = false;
        this.lastTime = 0;
    }

    /* --- INITIALIZATION --- */
    initialize() {
        if (!document.getElementById("canvas-fx-layer")) {
            this.layer = document.createElement("div");
            this.layer.id = "canvas-fx-layer";
            document.body.appendChild(this.layer);
        } else {
            this.layer = document.getElementById("canvas-fx-layer");
        }

        if (!document.getElementById("canvas-fx-border")) {
            this.borderLayer = document.createElement("div");
            this.borderLayer.id = "canvas-fx-border";
            document.body.appendChild(this.borderLayer);
        } else {
            this.borderLayer = document.getElementById("canvas-fx-border");
        }

        if (!document.getElementById("canvas-fx-cover")) {
            this.coverLayer = document.createElement("div");
            this.coverLayer.id = "canvas-fx-cover";
            document.body.appendChild(this.coverLayer);
        } else {
            this.coverLayer = document.getElementById("canvas-fx-cover");
        }

        if (!document.getElementById("canvas-fx-text")) {
            this.textLayer = document.createElement("div");
            this.textLayer.id = "canvas-fx-text";
            document.body.appendChild(this.textLayer);
        } else {
            this.textLayer = document.getElementById("canvas-fx-text");
        }
    }

    /* --- PUBLIC API --- */

    RainEmote(content, options = {}) {
        this.emit("spawn", { type: "text", content, ...options }, options.local);
    }

    RainImage(path, options = {}) {
        this.emit("spawn", { type: "image", content: path, ...options }, options.local);
    }

    ScreenShake(options = {}) {
        this.emit("shake", options, options.local);
    }

    GlassShatter(options = {}) {
        this.emit("shatter", options, options.local);
    }

    ScreenBorder(options = {}) {
        this.emit("border", options, options.local);
    }

    ScreenCover(path, options = {}) {
        this.emit("cover", { content: path, ...options }, options.local);
    }

    Text(content, options = {}) {
        this.emit("text", { content, ...options }, options.local);
    }

    Clear() {
        this.emit("clear", {}, false);
    }

    /* --- SOCKET HANDLING --- */

    emit(action, payload, isLocal = false) {
        this.executeLocal(action, payload);

        if (!isLocal && game.socket) {
            const packet = {
                action: action,
                payload: { ...payload, sender: game.user.name }
            };
            game.socket.emit(SOCKET_NAME, packet);
        }
    }

    executeLocal(action, data) {
        this.initialize();

        if (data.audio && action !== "border") {
            this.playSound(data.audio, { volume: data.volume, loop: data.loop });
        }

        switch (action) {
            case "spawn":
                this.handleSpawn(data);
                break;
            case "shake":
                this.handleShake(data);
                break;
            case "shatter":
                this.handleShatter(data);
                break;
            case "border":
                this.handleBorder(data);
                break;
            case "cover":
                this.handleCover(data);
                break;
            case "text":
                this.handleText(data);
                break;
            case "clear":
                this.handleClear();
                break;
        }
    }

    /* --- HELPER: AUDIO --- */
    playSound(src, options = {}) {
        if (typeof AudioHelper !== "undefined") {
            AudioHelper.play({
                src: src,
                volume: options.volume || 0.8,
                autoplay: true,
                loop: options.loop || false
            }, false);
        }
    }

    /* --- HELPER: COLORS --- */
    colorToRGB(color) {
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.fillStyle = color;
        const computed = ctx.fillStyle;
        if (computed.startsWith("#")) {
            const r = parseInt(computed.slice(1, 3), 16);
            const g = parseInt(computed.slice(3, 5), 16);
            const b = parseInt(computed.slice(5, 7), 16);
            return `${r}, ${g}, ${b}`;
        }
        return "255, 0, 0";
    }

    /* --- EFFECT LOGIC --- */

    handleText(data) {
        if (!this.textLayer) return;

        const content = data.content;
        const duration = (data.duration || 3) * 1000;
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

        this.textLayer.appendChild(textBox);

        requestAnimationFrame(() => {
            this.textLayer.style.opacity = "1";
        });

        if (duration > 0) {
            setTimeout(() => {
                this.textLayer.style.opacity = "0";
                setTimeout(() => {
                    this.textLayer.style.display = "none";
                    this.textLayer.innerHTML = "";
                }, 500);
            }, duration);
        }
    }

    handleCover(data) {
        if (!this.coverLayer) return;

        const path = data.content;
        const duration = (data.duration || 5) * 1000;
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

        requestAnimationFrame(() => {
            this.coverLayer.style.opacity = "1";
        });

        if (duration > 0) {
            setTimeout(() => {
                this.coverLayer.style.opacity = "0";
                setTimeout(() => {
                    this.coverLayer.innerHTML = "";
                    this.coverLayer.style.display = "none";
                }, 1000);
            }, duration);
        }
    }

    handleShake(options) {
        const body = document.body;
        const duration = options.duration || 500;
        const intensity = options.intensity || "heavy"; // mild, heavy, extreme
        const direction = options.direction || "horizontal"; // horizontal, vertical, random
        
        // Reset
        if (this.shakeInterval) clearInterval(this.shakeInterval);
        body.style.transform = "";
        
        // Determine pixel magnitude based on intensity
        let magnitude = 5;
        if (intensity === "mild") magnitude = 3;
        if (intensity === "heavy") magnitude = 10;
        if (intensity === "extreme") magnitude = 20;

        const startTime = Date.now();

        // Use Interval for Random/Vertical Shakes (CSS Keyframes are mostly horizontal)
        this.shakeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                clearInterval(this.shakeInterval);
                body.style.transform = "";
                return;
            }

            let x = 0;
            let y = 0;

            if (direction === "horizontal" || direction === "random" || direction === "diagonal") {
                x = (Math.random() - 0.5) * magnitude * 2;
            }
            if (direction === "vertical" || direction === "random" || direction === "diagonal") {
                y = (Math.random() - 0.5) * magnitude * 2;
            }

            if (direction === "diagonal") {
                y = x; 
            }

            body.style.transform = `translate(${x}px, ${y}px)`;

        }, 16); 
    }

    handleShatter(options) {
        this.handleShake({ duration: 800, intensity: "heavy", direction: "random" });

        const count = options.count || 75;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        for (let i = 0; i < count; i++) {
            const el = document.createElement("div");
            el.classList.add("cfx-shard");
            
            const p1 = `${Math.random()*100}% ${Math.random()*100}%`;
            const p2 = `${Math.random()*100}% ${Math.random()*100}%`;
            const p3 = `${Math.random()*100}% ${Math.random()*100}%`;
            el.style.clipPath = `polygon(${p1}, ${p2}, ${p3})`;
            
            const size = 30 + Math.random() * 100;
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;

            const startX = Math.random() * screenW;
            const startY = Math.random() * screenH;

            const particle = {
                element: el,
                x: startX,
                y: startY,
                speed: 400 + Math.random() * 600, 
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 400 
            };

            this.updateTransform(particle);
            this.layer.appendChild(el);
            this.particles.push(particle);
        }

        this.startLoop();
    }

    handleBorder(options) {
        if (!this.borderLayer) return;
        const isActive = this.borderLayer.classList.contains("active");
        const shouldBeActive = options.active !== undefined ? options.active : !isActive;
        const thickness = options.thickness || 20;

        if (shouldBeActive) {
            this.borderLayer.classList.add("active");
            this.borderLayer.style.borderWidth = `${thickness}px`;

            const color = options.color || "red";
            const rgb = this.colorToRGB(color);
            this.borderLayer.style.setProperty('--cfx-border-rgb', rgb);

        } else {
            this.borderLayer.classList.remove("active");
            this.borderLayer.style.borderWidth = "";
            this.borderLayer.style.removeProperty('--cfx-border-rgb');
        }
    }

    handleClear() {
        if (this.layer) this.layer.innerHTML = "";
        if (this.borderLayer) {
            this.borderLayer.classList.remove("active");
            this.borderLayer.style.borderWidth = "";
            this.borderLayer.style.removeProperty('--cfx-border-rgb');
        }
        if (this.coverLayer) {
            this.coverLayer.innerHTML = "";
            this.coverLayer.style.display = "none";
        }
        if (this.textLayer) {
            this.textLayer.innerHTML = "";
            this.textLayer.style.display = "none";
        }
        if (this.shakeInterval) clearInterval(this.shakeInterval);
        document.body.style.transform = "";
        this.particles = [];
        this.emitters = [];
    }

    /* --- SPAWN LOGIC --- */

    handleSpawn(data) {
        const count = data.count || 20;
        const time = data.time || 0;

        if (time > 0) {
            this.emitters.push({
                data: data,
                totalParticles: count,
                duration: time,
                elapsed: 0,
                spawned: 0
            });
            this.startLoop();
        } else {
            this.spawnBatch(data, count);
            this.startLoop();
        }
    }

    spawnBatch(data, amount) {
        const speedBase = data.speed || 300; 
        const scale = data.scale || 1; 
        const screenW = window.innerWidth;
        
        const isImage = data.type === "image";
        const size = (isImage ? 64 : 32) * scale;

        for (let i = 0; i < amount; i++) {
            const el = document.createElement("div");
            el.classList.add("cfx-particle");
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
            el.style.fontSize = `${size}px`; 

            if (isImage) {
                const img = document.createElement("img");
                img.src = data.content;
                el.appendChild(img);
            } else {
                el.innerText = data.content;
            }
            
            const startX = Math.random() * screenW;
            const startY = -100 - (Math.random() * 200); 

            const particle = {
                element: el,
                x: startX,
                y: startY,
                speed: speedBase + (Math.random() * (speedBase * 0.5)), 
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 100
            };

            this.updateTransform(particle);
            this.layer.appendChild(el);
            this.particles.push(particle);
        }
    }

    /* --- LOOP --- */

    startLoop() {
        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame(this._animate.bind(this));
        }
    }

    updateTransform(p) {
        p.element.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg)`;
    }

    _animate(time) {
        if (!this.running) return;
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        const limitY = window.innerHeight + 150;

        // Emitters
        const activeEmitters = [];
        for (const em of this.emitters) {
            em.elapsed += dt;
            const progress = Math.min(em.elapsed / em.duration, 1);
            const target = Math.floor(progress * em.totalParticles);
            const toSpawn = target - em.spawned;
            if (toSpawn > 0) {
                this.spawnBatch(em.data, toSpawn);
                em.spawned += toSpawn;
            }
            if (em.elapsed < em.duration) activeEmitters.push(em);
        }
        this.emitters = activeEmitters;

        // Particles
        const activeParticles = [];
        for (const p of this.particles) {
            p.y += p.speed * dt;
            p.rotation += p.rotationSpeed * dt;
            this.updateTransform(p);
            if (p.y < limitY) activeParticles.push(p);
            else p.element.remove();
        }
        this.particles = activeParticles;

        if (this.particles.length > 0 || this.emitters.length > 0) {
            requestAnimationFrame(this._animate.bind(this));
        } else {
            this.running = false;
        }
    }
}

const canvasFX = new CanvasFXManager();

Hooks.once('init', () => {
    window.CanvasFX = canvasFX;
});

Hooks.once('ready', () => {
    canvasFX.initialize();
    if (game.socket) {
        game.socket.on(SOCKET_NAME, (packet) => {
            canvasFX.executeLocal(packet.action, packet.payload);
        });
    }
});