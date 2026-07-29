/*!
 * Canvas FX
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, TEMPLATES } from "../constants.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Displays the bundled demo macros so the GM can preview every effect
 * without writing a single script macro first.
 */
export class CanvasFXDemoApp extends HandlebarsApplicationMixin(ApplicationV2) {
    #macros;

    /**
     * @param {CanvasFXManager} manager
     * @param {{name: string, img: string, run: Function}[]} macros - Already-sorted demo entries.
     */
    constructor(manager, macros, options = {}) {
        super(options);
        this.manager = manager;
        this.#macros = macros;
    }

    static DEFAULT_OPTIONS = {
        id: "canvas-fx-demo",
        classes: [MODULE_ID, "canvas-fx-demo"],
        window: { title: "Canvas FX - Demo" },
        position: { width: 500, height: "auto" },
        actions: {
            playMacro: this.prototype.playMacro,
            clear: this.prototype.clearEffects
        }
    };

    static PARTS = {
        content: { template: TEMPLATES.DEMO }
    };

    async _prepareContext(options) {
        return {
            macros: this.#macros.map((entry, index) => ({
                index,
                name: entry.name,
                img: entry.img || "icons/svg/d20.svg"
            }))
        };
    }

    playMacro(event, target) {
        const entry = this.#macros[Number(target.dataset.macroIndex)];
        entry?.run();
    }

    clearEffects() {
        this.manager.Clear();
    }
}
