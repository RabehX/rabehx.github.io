/**
 * RX-2005 — Rabeh Azzam
 * The name is ten vector paths. Everything else is a datasheet.
 */

(function () {
    "use strict";

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const SVG = "http://www.w3.org/2000/svg";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = !window.matchMedia("(pointer: coarse)").matches;

    function el(name, attrs, parent) {
        const node = document.createElementNS(SVG, name);
        for (const k in attrs) node.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(node);
        return node;
    }

    // ----------------------------------------------------------
    // Toast + copy
    // ----------------------------------------------------------
    const toastEl = $("[data-toast]");
    let toastTimer;
    function toast(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add("is-on");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 1700);
    }

    function copy(text, label) {
        const done = () => toast(label || "Copied");
        const fallback = () => {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand("copy"); done(); } catch (e) { toast("Couldn't copy"); }
            ta.remove();
        };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
        else fallback();
    }

    $$("[data-copy]").forEach((btn) => {
        btn.addEventListener("click", () => copy(btn.dataset.copy, "Copied " + btn.dataset.copy));
    });

    // ----------------------------------------------------------
    // Letters — Рабех Аззам on a 24 × 24 grid, cap height 3 → 21.
    // Written as SVG path data; anchors that share coordinates are
    // shared points, so dragging one moves every segment that uses it.
    // ----------------------------------------------------------
    const GLYPHS = [
        ["Р", "M6 21 L6 3 L12.5 3 C15.75 3 18.5 5.5 18.5 8.75 C18.5 12 15.75 14.5 12.5 14.5 L6 14.5"],
        ["А", "M4.5 21 L12 3 L19.5 21 M7 15 L17 15"],
        ["Б", "M18 3 L6 3 L6 21 L12.5 21 C15.75 21 18.5 18.5 18.5 15.5 C18.5 12.5 15.75 10 12.5 10 L6 10"],
        ["Е", "M18 3 L6 3 L6 21 L18 21 M6 12 L16 12"],
        ["Х", "M5 3 L19 21 M19 3 L5 21"],
        ["А", "M4.5 21 L12 3 L19.5 21 M7 15 L17 15"],
        ["З", "M6 6 C7.25 4.25 9.5 3 12 3 C15.25 3 17.5 5 17.5 7.5 C17.5 10 15.25 12 12 12 L9.5 12 M12 12 C15.5 12 18.5 14 18.5 16.5 C18.5 19 15.5 21 12 21 C9.25 21 6.75 19.75 5.5 18"],
        ["З", "M6 6 C7.25 4.25 9.5 3 12 3 C15.25 3 17.5 5 17.5 7.5 C17.5 10 15.25 12 12 12 L9.5 12 M12 12 C15.5 12 18.5 14 18.5 16.5 C18.5 19 15.5 21 12 21 C9.25 21 6.75 19.75 5.5 18"],
        ["А", "M4.5 21 L12 3 L19.5 21 M7 15 L17 15"],
        ["М", "M4.5 21 L4.5 3 L12 14 L19.5 3 L19.5 21"]
    ];

    function parse(ch, d) {
        const tokens = d.match(/[MLC]|-?\d*\.?\d+/g);
        const pts = [];    // [x, y]
        const kind = [];   // "a" anchor | "c" control
        const cmds = [];   // [op, ...pointIndices]
        const anchorAt = new Map();
        let i = 0;
        const num = () => parseFloat(tokens[i++]);
        const anchor = () => {
            const x = num();
            const y = num();
            const key = x + "," + y;
            if (anchorAt.has(key)) return anchorAt.get(key);
            pts.push([x, y]);
            kind.push("a");
            anchorAt.set(key, pts.length - 1);
            return pts.length - 1;
        };
        const control = () => {
            pts.push([num(), num()]);
            kind.push("c");
            return pts.length - 1;
        };
        while (i < tokens.length) {
            const op = tokens[i++];
            if (op === "M" || op === "L") cmds.push([op, anchor()]);
            else if (op === "C") { const c1 = control(); const c2 = control(); cmds.push(["C", c1, c2, anchor()]); }
        }
        // Which control handles hang off which anchor (for drawing + dragging together)
        const handles = [];
        const attached = pts.map(() => []);
        let prev = null;
        cmds.forEach((c) => {
            if (c[0] === "C") {
                handles.push([prev, c[1]], [c[3], c[2]]);
                attached[prev].push(c[1]);
                attached[c[3]].push(c[2]);
            }
            prev = c[c.length - 1];
        });
        return { ch, pts, kind, cmds, handles, attached, original: pts.map((p) => p.slice()) };
    }

    const letters = GLYPHS.map(([ch, d]) => parse(ch, d));

    function pathData(L) {
        return L.cmds.map((c) => c[0] + c.slice(1).map((i) => L.pts[i][0] + " " + L.pts[i][1]).join(" ")).join(" ");
    }

    // ----------------------------------------------------------
    // Shared state
    // ----------------------------------------------------------
    const state = {
        selected: 0,
        weight: 1.5,
        keylines: true,
        points: true,
        activePoint: null
    };
    const views = [];   // every mounted letter view
    let onChange = () => {};

    function refresh(letterIndex) {
        views.forEach((v) => { if (letterIndex == null || v.index() === letterIndex) v.render(); });
        onChange(letterIndex);
    }

    // ----------------------------------------------------------
    // Letter view — draws one letter into an <svg>, optionally editable
    // ----------------------------------------------------------
    function buildBackdrop(svg) {
        let g = "";
        for (let i = 0; i <= 24; i++) g += "M" + i + " 0V24M0 " + i + "H24";
        el("path", { class: "grid", d: g }, svg);
        const k = el("g", { class: "keylines" }, svg);
        el("rect", { x: 2, y: 2, width: 20, height: 20 }, k);         // live area
        el("circle", { cx: 12, cy: 12, r: 10 }, k);                   // circle keyline
        el("rect", { x: 3, y: 3, width: 18, height: 18, rx: 0 }, k);  // square
        el("rect", { x: 4, y: 2, width: 16, height: 20 }, k);         // portrait
        el("rect", { x: 2, y: 4, width: 20, height: 16 }, k);         // landscape
        el("path", { d: "M0 0L24 24M24 0L0 24M12 0V24M0 12H24" }, k);
    }

    function mountLetter(svg, getIndex, opts) {
        svg.textContent = "";
        buildBackdrop(svg);
        const glyph = el("path", { class: "glyph" }, svg);
        const handles = el("g", { class: "handles" }, svg);
        let drag = null;
        let builtFor = -1;
        let lineEls = [];
        let ptEls = [];
        let hitEls = [];

        let widthPx = 0;
        function unitPx() {
            const vb = svg.viewBox.baseVal;
            return (widthPx || svg.getBoundingClientRect().width || 240) / (vb && vb.width ? vb.width : 24);
        }

        function buildHandles(L) {
            handles.textContent = "";
            lineEls = L.handles.map(() => el("line", {}, handles));
            ptEls = L.pts.map((_, i) => el(L.kind[i] === "a" ? "rect" : "circle", { class: "pt pt--" + (L.kind[i] === "a" ? "anchor" : "control") }, handles));
            hitEls = opts.editable ? L.pts.map((_, i) => {
                const h = el("circle", { class: "hit", "data-i": i }, handles);
                return h;
            }) : [];
            builtFor = getIndex();
        }

        function render() {
            const idx = getIndex();
            const L = letters[idx];
            if (builtFor !== idx) buildHandles(L);
            glyph.setAttribute("d", pathData(L));
            glyph.style.strokeWidth = state.weight;
            svg.classList.toggle("no-keylines", !state.keylines);
            svg.classList.toggle("no-points", !state.points);

            const u = unitPx();
            const s = (opts.big ? 5 : 3.5) / u;   // point size in viewBox units
            const hit = Math.max(opts.big ? 22 : 12, 10) / u;
            L.handles.forEach(([a, c], i) => {
                const ln = lineEls[i];
                ln.setAttribute("x1", L.pts[a][0]); ln.setAttribute("y1", L.pts[a][1]);
                ln.setAttribute("x2", L.pts[c][0]); ln.setAttribute("y2", L.pts[c][1]);
            });
            L.pts.forEach(([x, y], i) => {
                const p = ptEls[i];
                const active = state.activePoint && state.activePoint.letter === idx && state.activePoint.point === i;
                p.classList.toggle("is-active", !!active);
                if (L.kind[i] === "a") {
                    p.setAttribute("x", x - s); p.setAttribute("y", y - s);
                    p.setAttribute("width", s * 2); p.setAttribute("height", s * 2);
                } else {
                    p.setAttribute("cx", x); p.setAttribute("cy", y); p.setAttribute("r", s * 0.95);
                }
                if (hitEls[i]) {
                    hitEls[i].setAttribute("cx", x); hitEls[i].setAttribute("cy", y); hitEls[i].setAttribute("r", hit);
                }
            });
        }

        function toLocal(e) {
            const m = svg.getScreenCTM();
            if (!m) return null;
            const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
            return { x: p.x, y: p.y };
        }

        if (opts.editable) {
            svg.addEventListener("pointerdown", (e) => {
                const h = e.target.closest(".hit");
                if (!h) return;
                e.preventDefault();
                e.stopPropagation();
                const idx = getIndex();
                const L = letters[idx];
                const i = +h.dataset.i;
                const start = toLocal(e);
                if (!start) return;
                drag = {
                    id: e.pointerId, idx, i, start,
                    from: [i].concat(L.attached[i]).map((k) => ({ k, x: L.pts[k][0], y: L.pts[k][1] }))
                };
                svg.setPointerCapture(e.pointerId);
                state.activePoint = { letter: idx, point: i };
                if (opts.onGrab) opts.onGrab(idx);
                svg.closest(".tile, .inspector__canvas").classList.add("is-dragging");
                refresh(idx);
            });
            svg.addEventListener("pointermove", (e) => {
                if (!drag || e.pointerId !== drag.id) return;
                const p = toLocal(e);
                if (!p) return;
                const L = letters[drag.idx];
                const snap = e.shiftKey ? 1 : 0.25;
                const head = drag.from[0];
                let nx = clamp(Math.round((head.x + p.x - drag.start.x) / snap) * snap, 0, 24);
                let ny = clamp(Math.round((head.y + p.y - drag.start.y) / snap) * snap, 0, 24);
                const dx = nx - head.x;
                const dy = ny - head.y;
                drag.from.forEach((f, n) => {
                    L.pts[f.k][0] = n === 0 ? nx : clamp(f.x + dx, -2, 26);
                    L.pts[f.k][1] = n === 0 ? ny : clamp(f.y + dy, -2, 26);
                });
                refresh(drag.idx);
            });
            const end = (e) => {
                if (!drag || e.pointerId !== drag.id) return;
                const idx = drag.idx;
                drag = null;
                svg.closest(".tile, .inspector__canvas").classList.remove("is-dragging");
                refresh(idx);
            };
            svg.addEventListener("pointerup", end);
            svg.addEventListener("pointercancel", end);
        }

        const view = { index: getIndex, render, glyph };
        views.push(view);
        // Point and hit sizes are in screen pixels, so redraw whenever the svg changes size
        if ("ResizeObserver" in window) {
            new ResizeObserver((entries) => {
                const w = entries[0].contentRect.width;
                if (w && Math.abs(w - widthPx) > 0.5) {
                    widthPx = w;
                    render();
                }
            }).observe(svg);
        }
        render();
        return view;
    }

    // ----------------------------------------------------------
    // Fig. 1 — the specimen
    // ----------------------------------------------------------
    const specimen = $("[data-specimen]");
    const inspectorEl = $("[data-inspector]");
    const tiles = [];

    function select(i, opts) {
        state.selected = i;
        if (specimen) specimen.classList.add("has-picked");
        tiles.forEach((t, n) => t.classList.toggle("is-selected", n === i));
        refresh(null);
        if (opts && opts.scroll && inspectorEl) {
            $("#inspector").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
        }
    }

    if (specimen) {
        letters.forEach((L, i) => {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.setAttribute("role", "button");
            tile.setAttribute("tabindex", "0");
            tile.setAttribute("aria-label", "Letter " + L.ch + ", inspect");
            const label = document.createElement("span");
            label.className = "tile__label";
            label.textContent = String(i + 1).padStart(2, "0");
            tile.appendChild(label);
            const svg = el("svg", { class: "letter", viewBox: "0 0 24 24", "aria-hidden": "true" }, tile);
            mountLetter(svg, () => i, { editable: finePointer, onGrab: (idx) => { if (state.selected !== idx) select(idx); } });
            let downAt = null;
            tile.addEventListener("pointerdown", (e) => { downAt = { x: e.clientX, y: e.clientY }; });
            tile.addEventListener("click", (e) => {
                if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4) return;
                if (e.target.closest && e.target.closest(".hit")) return;
                select(i, { scroll: !finePointer });
            });
            tile.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select(i, { scroll: true });
                }
            });
            specimen.appendChild(tile);
            tiles.push(tile);
        });
        tiles[0].classList.add("is-selected");

        // Plotter pass: draw each letter in, one after another
        if (!reducedMotion) {
            const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
            const glyphs = views.slice(0, letters.length).map((v) => v.glyph);
            glyphs.forEach((g) => { g.style.strokeDasharray = "200"; g.style.strokeDashoffset = "200"; });
            ready.then(() => {
                glyphs.forEach((g, i) => {
                    const len = Math.ceil(g.getTotalLength()) + 2;
                    g.style.strokeDasharray = len;
                    g.style.strokeDashoffset = len;
                    g.getBoundingClientRect();
                    g.style.transition = "stroke-dashoffset 0.9s cubic-bezier(.6,0,.2,1) " + (i * 0.07) + "s";
                    g.style.strokeDashoffset = "0";
                    g.addEventListener("transitionend", () => {
                        g.style.transition = "";
                        g.style.strokeDasharray = "";
                        g.style.strokeDashoffset = "";
                    }, { once: true });
                });
            });
        }
    }

    // ----------------------------------------------------------
    // Fig. 2 — inspector + Kotlin output
    // ----------------------------------------------------------
    if (inspectorEl) {
        const svg = $("[data-inspector-svg]", inspectorEl);
        const picker = $("[data-picker]", inspectorEl);
        const codeEl = $("[data-code]", inspectorEl);
        const fileEl = $("[data-code-file]", inspectorEl);
        const readout = $("[data-readout]", inspectorEl);
        const weightInput = $("[data-weight]", inspectorEl);
        const weightOut = $("[data-weight-out]", inspectorEl);
        const weightLabel = $("[data-weight-label]");

        const pickBtns = letters.map((L, i) => {
            if (i === 5) {
                const gap = document.createElement("span");
                gap.className = "gap";
                picker.appendChild(gap);
            }
            const b = document.createElement("button");
            b.type = "button";
            b.setAttribute("role", "radio");
            b.setAttribute("aria-label", "Letter " + (i + 1) + ": " + L.ch);
            b.textContent = L.ch;
            b.addEventListener("click", () => select(i));
            picker.appendChild(b);
            return b;
        });

        picker.addEventListener("keydown", (e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const next = (state.selected + (e.key === "ArrowRight" ? 1 : -1) + letters.length) % letters.length;
            select(next);
            pickBtns[next].focus();
        });

        mountLetter(svg, () => state.selected, { editable: true, big: true });

        const f = (n) => {
            const r = Math.round(n * 100) / 100;
            return '<span class="n">' + r + "f</span>";
        };
        const pt = (L, i) => {
            const on = state.activePoint && state.activePoint.letter === state.selected && (state.activePoint.point === i || L.attached[state.activePoint.point].includes(i));
            const s = f(L.pts[i][0]) + ", " + f(L.pts[i][1]);
            return on ? "<mark>" + s + "</mark>" : s;
        };

        function renderCode() {
            const L = letters[state.selected];
            const k = (s) => '<span class="k">' + s + "</span>";
            const str = (s) => '<span class="s">"' + s + '"</span>';
            const lines = L.cmds.map((c) => {
                if (c[0] === "M") return "    moveTo(" + pt(L, c[1]) + ")";
                if (c[0] === "L") return "    lineTo(" + pt(L, c[1]) + ")";
                return "    curveTo(\n        " + pt(L, c[1]) + ",\n        " + pt(L, c[2]) + ",\n        " + pt(L, c[3]) + "\n    )";
            });
            const edited = L.pts.some((p, i) => p[0] !== L.original[i][0] || p[1] !== L.original[i][1]);
            codeEl.innerHTML =
                '<span class="c">// Letter ' + (state.selected + 1) + " of 10" + (edited ? ", edited by you" : "") + "</span>\n" +
                k("val") + " " + L.ch + ": ImageVector = ImageVector.Builder(\n" +
                "    name = " + str(L.ch) + ",\n" +
                "    defaultWidth = " + '<span class="n">24</span>.dp, defaultHeight = <span class="n">24</span>.dp,\n' +
                "    viewportWidth = " + f(24) + ", viewportHeight = " + f(24) + "\n" +
                ").path(\n" +
                "    stroke = SolidColor(Color.Black),\n" +
                "    strokeLineWidth = " + f(state.weight) + ",\n" +
                "    strokeLineCap = StrokeCap.Round,\n" +
                "    strokeLineJoin = StrokeJoin.Round\n" +
                ") {\n" + lines.join("\n") + "\n}.build()";
            fileEl.textContent = L.ch + ".kt";
            pickBtns.forEach((b, i) => {
                b.setAttribute("aria-checked", String(i === state.selected));
                b.tabIndex = i === state.selected ? 0 : -1;
            });
            const a = state.activePoint;
            if (a && a.letter === state.selected) {
                const p = L.pts[a.point];
                readout.textContent = (L.kind[a.point] === "a" ? "anchor" : "control") + "  x " + p[0].toFixed(2) + "  y " + p[1].toFixed(2);
            } else {
                readout.textContent = finePointer ? "Drag a point · Shift snaps to 1" : "Drag a point";
            }
        }

        onChange = () => renderCode();
        renderCode();

        weightInput.addEventListener("input", () => {
            state.weight = parseFloat(weightInput.value);
            weightOut.textContent = state.weight + "f";
            if (weightLabel) weightLabel.textContent = state.weight;
            refresh(null);
        });

        $$("[data-toggle]", inspectorEl).forEach((btn) => {
            btn.addEventListener("click", () => {
                const key = btn.dataset.toggle;
                state[key] = !state[key];
                btn.setAttribute("aria-pressed", String(state[key]));
                refresh(null);
            });
        });

        $$("[data-reset]", inspectorEl).forEach((btn) => {
            btn.addEventListener("click", () => {
                const which = btn.dataset.reset === "all" ? letters : [letters[state.selected]];
                which.forEach((L) => L.original.forEach((p, i) => { L.pts[i][0] = p[0]; L.pts[i][1] = p[1]; }));
                state.activePoint = null;
                refresh(null);
            });
        });

        $("[data-copy-code]", inspectorEl).addEventListener("click", () => {
            copy(codeEl.textContent, "Copied " + fileEl.textContent);
        });

    }

    // ----------------------------------------------------------
    // Fig. 4 — self-test. Local checks only, nothing leaves the page.
    // ----------------------------------------------------------
    function browserName() {
        const brands = navigator.userAgentData && navigator.userAgentData.brands;
        if (brands && brands.length) {
            const b = brands.find((x) => !/not.?a.?brand|chromium/i.test(x.brand)) || brands.find((x) => /chromium/i.test(x.brand));
            if (b) return b.brand + " " + b.version;
        }
        const ua = navigator.userAgent;
        let m;
        if ((m = ua.match(/Firefox\/(\d+)/))) return "Firefox " + m[1];
        if ((m = ua.match(/Edg\/(\d+)/))) return "Edge " + m[1];
        if ((m = ua.match(/Chrome\/(\d+)/))) return "Chrome " + m[1];
        if ((m = ua.match(/Version\/(\d+).*Safari/))) return "Safari " + m[1];
        return "Unknown";
    }

    function gpu() {
        try {
            const c = document.createElement("canvas");
            const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
            if (!gl) return null;
            const ext = gl.getExtension("WEBGL_debug_renderer_info");
            const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
            const parts = String(r).replace(/^ANGLE \((.*)\)$/, "$1").split(",").map((x) => x.trim());
            return (parts[1] || parts[0])
                .replace(/\s*\(0x[0-9a-f]+\)/gi, "")
                .replace(/ANGLE Metal Renderer:\s*/i, "")
                .replace(/\s+(Direct3D|vs_|ps_|OpenGL).*$/i, "")
                .trim() || null;
        } catch (e) {
            return null;
        }
    }

    function selfTests() {
        const mq = (q) => window.matchMedia(q).matches;
        const automated = navigator.webdriver === true;
        const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return null; } })();
        const g = gpu();
        const rows = [
            ["Engine", browserName(), "info"],
            ["Secure context", window.isSecureContext ? "HTTPS" : "insecure", window.isSecureContext ? "pass" : "fail"],
            ["Automation (webdriver)", automated ? "detected" : "not detected", automated ? "fail" : "pass"],
            ["Cookies", navigator.cookieEnabled ? "enabled" : "disabled", "info"],
            ["CPU threads", navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : "not exposed", "info"],
            ["Memory", navigator.deviceMemory ? "≥ " + navigator.deviceMemory + " GB" : "not exposed", "info"],
            ["Display", screen.width + " × " + screen.height + " @" + (Math.round((window.devicePixelRatio || 1) * 100) / 100) + "x", "info"],
            ["Touch points", String(navigator.maxTouchPoints || 0), "info"],
            ["GPU", g || "not exposed", g ? "info" : "info"],
            ["Color scheme", mq("(prefers-color-scheme: dark)") ? "dark" : "light", "info"],
            ["Reduced motion", mq("(prefers-reduced-motion: reduce)") ? "on" : "off", "info"],
            ["Time zone", tz || "unknown", "info"]
        ];
        return { rows, automated };
    }

    function initSelfTest() {
        const root = $("[data-selftest]");
        if (!root) return;
        const body = $("[data-selftest-rows]", root);
        const verdict = $("[data-selftest-verdict]", root);
        const runBtn = $("[data-selftest-run]", root);
        let timer = null;

        function run() {
            clearTimeout(timer);
            body.textContent = "";
            verdict.textContent = "";
            const { rows, automated } = selfTests();
            let i = 0;
            const step = () => {
                if (i < rows.length) {
                    const [name, value, result] = rows[i++];
                    const tr = document.createElement("tr");
                    const th = document.createElement("th");
                    th.scope = "row";
                    th.textContent = name;
                    const td = document.createElement("td");
                    td.textContent = value;
                    const badge = document.createElement("span");
                    badge.className = "r r--" + result;
                    badge.textContent = result === "info" ? "INFO" : result.toUpperCase();
                    td.appendChild(badge);
                    tr.append(th, td);
                    body.appendChild(tr);
                    timer = setTimeout(step, reducedMotion ? 0 : 90);
                    return;
                }
                const secure = window.isSecureContext;
                verdict.innerHTML =
                    '<span class="v ' + (secure ? "v--yes" : "v--no") + '">MEETS_BASIC_INTEGRITY</span>' +
                    '<span class="v ' + (secure && !automated ? "v--yes" : "v--no") + '">MEETS_DEVICE_INTEGRITY' + (automated ? ' <span class="why">— a robot is driving</span>' : "") + "</span>" +
                    '<span class="v v--no">MEETS_STRONG_INTEGRITY <span class="why">— needs hardware attestation, which a web page can\'t do</span></span>';
            };
            step();
        }

        runBtn.addEventListener("click", run);
        const io = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                io.disconnect();
                run();
            }
        }, { rootMargin: "0px 0px -15% 0px" });
        io.observe(root);
    }
    initSelfTest();

    // ----------------------------------------------------------
    // Live numbers from GitHub (public API, fails quietly)
    // ----------------------------------------------------------
    function initGitHub() {
        const repos = new Set($$("[data-gh-stars], [data-gh-release]").map((n) => n.dataset.ghStars || n.dataset.ghRelease));
        const fmt = new Intl.NumberFormat("en");
        repos.forEach((repo) => {
            fetch("https://api.github.com/repos/" + repo, { headers: { Accept: "application/vnd.github+json" } })
                .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
                .then((data) => {
                    $$('[data-gh-stars="' + repo + '"]').forEach((n) => {
                        n.innerHTML = "";
                        const a = document.createElement("a");
                        a.href = data.html_url + "/stargazers";
                        a.target = "_blank";
                        a.rel = "noopener";
                        a.textContent = fmt.format(data.stargazers_count) + " on GitHub";
                        n.appendChild(a);
                    });
                })
                .catch(() => {
                    $$('[data-gh-stars="' + repo + '"]').forEach((n) => {
                        n.innerHTML = '<a href="https://github.com/' + repo + '" target="_blank" rel="noopener">See on GitHub</a>';
                    });
                });
        });
        $$("[data-gh-release]").forEach((n) => {
            fetch("https://api.github.com/repos/" + n.dataset.ghRelease + "/releases/latest")
                .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
                .then((rel) => {
                    if (!rel.tag_name) return;
                    const date = rel.published_at ? new Date(rel.published_at).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" }) : "";
                    n.textContent = rel.tag_name + (date ? ", " + date : "");
                    if (rel.html_url) n.href = rel.html_url;
                })
                .catch(() => {});
        });
    }
    initGitHub();

    // ----------------------------------------------------------
    // Section marker in the top bar
    // ----------------------------------------------------------
    function initNav() {
        const links = $$("[data-nav]");
        const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                links.forEach((a) => a.removeAttribute("aria-current"));
                const a = map.get(e.target.id);
                if (a) a.setAttribute("aria-current", "true");
            });
        }, { rootMargin: "-40% 0px -55% 0px" });
        $$("main > section[id]").forEach((s) => io.observe(s));
    }
    initNav();

    $$("[data-year]").forEach((n) => { n.textContent = new Date().getFullYear(); });
})();
