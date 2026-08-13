/*!
 * Canvas FX
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

export const MODULE_ID = "canvas-fx";

export const TEMPLATES = {
    DEMO: `modules/${MODULE_ID}/templates/demo.hbs`,
    BUILDER: `modules/${MODULE_ID}/templates/builder.hbs`
};

// Sci-Fi Level Up plays this unless the caller passes its own `audio`. Shared
// rather than inlined because it is both the runtime default and the Builder's
// prefill, and the two have to stay in step.
export const DEFAULT_LEVELUP_AUDIO = "";
