/**
 * RABEH AZZAM — Portfolio
 * Physics hero, playground toys and the little things in between.
 */

(function () {
    "use strict";

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    // ================================================
    // Toast
    // ================================================
    const toastEl = $("[data-toast]");
    let toastTimer;

    function toast(message) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add("is-on");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 1800);
    }

    // ================================================
    // Status bar — clock, battery, scrolled state
    // ================================================
    function initStatusBar() {
        const bar = $(".statusbar");
        const clock = $("[data-clock]");
        const battery = $("[data-battery]");

        function tickClock() {
            const now = new Date();
            clock.textContent = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
        }
        if (clock) {
            tickClock();
            setInterval(tickClock, 15000);
        }

        if (battery && navigator.getBattery) {
            navigator.getBattery().then((b) => {
                const update = () => { battery.style.width = Math.round(b.level * 100) + "%"; };
                update();
                b.addEventListener("levelchange", update);
            }).catch(() => {});
        }

        if (bar) {
            const onScroll = () => bar.classList.toggle("is-scrolled", window.scrollY > 40);
            onScroll();
            window.addEventListener("scroll", onScroll, { passive: true });
        }
    }

    // ================================================
    // Hero — letters as physical objects
    // ================================================
    const hero = {
        toggleGravity: () => false
    };

    function initHero() {
        const stage = $("[data-stage]");
        if (!stage) return;

        if (!window.Matter) {
            stage.classList.add("is-static");
            return;
        }

        const { Engine, Bodies, Body, Composite, Constraint } = window.Matter;
        const engine = Engine.create();
        const world = engine.world;
        const items = $$(".glyph, .pill, .sticker", stage).map((el) => ({
            el,
            kind: el.classList.contains("glyph") ? "glyph" : el.classList.contains("sticker") ? "sticker" : "pill"
        }));
        const gravityBtn = $("[data-action='gravity']");

        const STEP = 1000 / 60;
        let W = 0;
        let H = 0;
        let walls = [];
        let ceiling = null;
        let released = false;
        let zeroG = false;
        let held = null;
        let tween = null;
        let running = false;
        let acc = 0;
        let last = 0;
        let built = false;

        function measure() {
            W = stage.clientWidth;
            H = stage.clientHeight;

            items.forEach((item) => {
                item.el.style.transform = "none";
                item.el.style.width = "";
                item.el.style.height = "";
            });

            items.forEach((item) => {
                const rect = item.el.getBoundingClientRect();
                if (item.kind === "glyph") {
                    const fs = parseFloat(getComputedStyle(item.el).fontSize);
                    item.w = Math.round(rect.width);
                    item.h = Math.round(fs * 0.8);
                } else {
                    item.w = Math.round(rect.width);
                    item.h = Math.round(rect.height);
                }
                item.el.style.width = item.w + "px";
                item.el.style.height = item.h + "px";
            });
        }

        // Where each glyph sits when the name is "assembled"
        function formation() {
            const glyphs = items.filter((i) => i.kind === "glyph");
            const lines = [glyphs.filter((g) => g.el.dataset.line === "0"), glyphs.filter((g) => g.el.dataset.line === "1")];
            const lineH = glyphs[0].h;
            const gap = lineH * 0.08;
            const blockH = lineH * 2 + gap;
            const top = H * 0.56 - blockH / 2;

            lines.forEach((line, li) => {
                const total = line.reduce((s, g) => s + g.w, 0);
                let x = (W - total) / 2;
                const y = top + li * (lineH + gap) + lineH / 2;
                line.forEach((g) => {
                    g.home = { x: x + g.w / 2, y, angle: 0 };
                    x += g.w;
                });
            });
        }

        function dropPoint(item, index) {
            if (reducedMotion) {
                const x = W * (0.12 + ((index * 0.17) % 0.76));
                return { x, y: H - item.h / 2 - 2, angle: 0 };
            }
            return {
                x: clamp(Math.random() * W, item.w / 2 + 10, W - item.w / 2 - 10),
                y: -120 - index * 90,
                angle: (Math.random() - 0.5) * 0.8
            };
        }

        function build() {
            Composite.clear(world, false);
            held = null;
            tween = null;
            released = false;
            ceiling = null;

            measure();
            formation();

            const t = 200;
            walls = [
                Bodies.rectangle(W / 2, H + t / 2, W * 3, t, { isStatic: true }),
                Bodies.rectangle(-t / 2, H / 2 - H, t, H * 4, { isStatic: true }),
                Bodies.rectangle(W + t / 2, H / 2 - H, t, H * 4, { isStatic: true })
            ];
            Composite.add(world, walls);
            if (zeroG) addCeiling();

            let dropIndex = 0;
            items.forEach((item) => {
                const common = { restitution: 0.25, friction: 0.35, frictionAir: zeroG ? 0.004 : 0.012 };

                if (item.kind === "glyph") {
                    item.body = Bodies.rectangle(item.home.x, item.home.y, item.w * 0.94, item.h, {
                        ...common,
                        isStatic: true,
                        density: 0.0016,
                        chamfer: { radius: Math.min(item.w, item.h) * 0.08 }
                    });
                } else {
                    const p = dropPoint(item, dropIndex++);
                    item.home = p;
                    item.body = item.kind === "sticker"
                        ? Bodies.circle(p.x, p.y, item.w / 2, { ...common, restitution: 0.5, density: 0.001 })
                        : Bodies.rectangle(p.x, p.y, item.w, item.h, { ...common, density: 0.001, chamfer: { radius: item.h / 2 } });
                    Body.setAngle(item.body, p.angle);
                }
                Composite.add(world, item.body);
            });

            built = true;
            render();
            stage.classList.add("is-ready");
        }

        function addCeiling() {
            if (ceiling) return;
            items.forEach((item) => {
                if (item.body && item.body.position.y < item.h) {
                    Body.setPosition(item.body, { x: item.body.position.x, y: item.h + 20 });
                }
            });
            ceiling = Bodies.rectangle(W / 2, -100, W * 3, 200, { isStatic: true });
            Composite.add(world, ceiling);
        }

        function removeCeiling() {
            if (!ceiling) return;
            Composite.remove(world, ceiling);
            ceiling = null;
        }

        function release() {
            if (released) return;
            released = true;
            items.forEach((item) => {
                if (item.kind === "glyph") {
                    Body.setStatic(item.body, false);
                    Body.setAngularVelocity(item.body, (Math.random() - 0.5) * 0.02);
                }
            });
        }

        function render() {
            for (const item of items) {
                const { x, y } = item.body.position;
                item.el.style.transform = "translate3d(" + (x - item.w / 2).toFixed(1) + "px," + (y - item.h / 2).toFixed(1) + "px,0) rotate(" + item.body.angle.toFixed(4) + "rad)";
            }
        }

        function stepTween(now) {
            const p = clamp((now - tween.start) / tween.duration, 0, 1);
            const e = 1 - Math.pow(1 - p, 4);
            tween.parts.forEach(({ item, from, to }) => {
                Body.setPosition(item.body, { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e });
                Body.setAngle(item.body, from.angle + (to.angle - from.angle) * e);
            });
            if (p >= 1) {
                tween.parts.forEach(({ item }) => {
                    Body.setVelocity(item.body, { x: 0, y: 0 });
                    Body.setAngularVelocity(item.body, 0);
                    if (item.kind !== "glyph") Body.setStatic(item.body, false);
                });
                tween = null;
            }
        }

        function reset() {
            if (held) dropHeld();
            released = false;
            let dropIndex = 0;
            const parts = items.map((item) => {
                const b = item.body;
                // Unwind full spins so letters don't twirl back several times
                const angle = Math.atan2(Math.sin(b.angle), Math.cos(b.angle));
                Body.setAngle(b, angle);
                Body.setStatic(b, true);
                const to = item.kind === "glyph" ? item.home : dropPoint(item, dropIndex++);
                return { item, from: { x: b.position.x, y: b.position.y, angle }, to };
            });
            tween = { start: performance.now(), duration: reducedMotion ? 1 : 900, parts };
            wake();
        }

        function shake() {
            if (tween) return;
            release();
            items.forEach((item) => {
                Body.setVelocity(item.body, { x: (Math.random() - 0.5) * 30, y: -8 - Math.random() * 18 });
                Body.setAngularVelocity(item.body, (Math.random() - 0.5) * 0.4);
            });
            wake();
        }

        function setZeroG(on) {
            zeroG = on;
            engine.gravity.y = on ? 0 : 1;
            engine.gravity.x = 0;
            items.forEach((item) => { item.body.frictionAir = on ? 0.004 : 0.012; });
            if (gravityBtn) gravityBtn.setAttribute("aria-pressed", String(on));
            if (on) {
                addCeiling();
                release();
                items.forEach((item) => {
                    Body.setVelocity(item.body, { x: (Math.random() - 0.5) * 6, y: -2 - Math.random() * 4 });
                    Body.setAngularVelocity(item.body, (Math.random() - 0.5) * 0.06);
                });
            } else {
                removeCeiling();
            }
            wake();
            return on;
        }
        hero.toggleGravity = () => setZeroG(!zeroG);

        // Pointer dragging — only on objects, so the page still scrolls on touch
        function local(e) {
            const r = stage.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        }

        function dropHeld() {
            if (!held) return;
            Composite.remove(world, held.constraint);
            held.item.el.classList.remove("is-held");
            const v = held.item.body.velocity;
            const speed = Math.hypot(v.x, v.y);
            if (speed > 45) Body.setVelocity(held.item.body, { x: (v.x / speed) * 45, y: (v.y / speed) * 45 });
            held = null;
        }

        stage.addEventListener("pointerdown", (e) => {
            const el = e.target.closest(".glyph, .pill, .sticker");
            if (!el || tween) return;
            const item = items.find((i) => i.el === el);
            if (!item) return;
            e.preventDefault();
            if (held) dropHeld();
            release();
            el.setPointerCapture(e.pointerId);
            const p = local(e);
            const constraint = Constraint.create({
                pointA: p,
                bodyB: item.body,
                pointB: { x: p.x - item.body.position.x, y: p.y - item.body.position.y },
                stiffness: 0.12,
                damping: 0.08,
                length: 0
            });
            Composite.add(world, constraint);
            held = { item, constraint, id: e.pointerId };
            el.classList.add("is-held");
            wake();
        });

        stage.addEventListener("pointermove", (e) => {
            if (!held || e.pointerId !== held.id) return;
            const p = local(e);
            held.constraint.pointA.x = p.x;
            held.constraint.pointA.y = p.y;
        });

        ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
            stage.addEventListener(type, (e) => {
                if (held && e.pointerId === held.id) dropHeld();
            });
        });

        // Controls
        $$("[data-action]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const action = btn.dataset.action;
                if (action === "gravity") setZeroG(!zeroG);
                if (action === "shake") shake();
                if (action === "reset") reset();
            });
        });

        // Tilt the phone, tilt the world (where the browser allows it without a prompt)
        window.addEventListener("deviceorientation", (e) => {
            if (zeroG || e.gamma == null) return;
            engine.gravity.x = clamp(e.gamma / 60, -0.8, 0.8);
        });

        // Loop
        function frame(now) {
            if (!running) return;
            const dt = Math.min(now - last, 50);
            last = now;
            if (tween) stepTween(now);
            acc += dt;
            while (acc >= STEP) {
                Engine.update(engine, STEP);
                acc -= STEP;
            }
            // Anything that escaped gets politely returned
            items.forEach((item) => {
                const p = item.body.position;
                if (p.y > H + 300 || p.x < -300 || p.x > W + 300 || p.y < -3000) {
                    Body.setPosition(item.body, { x: W / 2, y: zeroG ? H / 2 : -100 });
                    Body.setVelocity(item.body, { x: 0, y: 0 });
                }
            });
            render();
            requestAnimationFrame(frame);
        }

        function wake() {
            if (running || !built || document.hidden || !heroVisible) return;
            running = true;
            last = performance.now();
            acc = 0;
            requestAnimationFrame(frame);
        }

        function sleep() {
            running = false;
        }

        let heroVisible = true;
        new IntersectionObserver((entries) => {
            heroVisible = entries[0].isIntersecting;
            heroVisible ? wake() : sleep();
        }).observe(stage);

        document.addEventListener("visibilitychange", () => (document.hidden ? sleep() : wake()));

        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (Math.abs(stage.clientWidth - W) > 40 || Math.abs(stage.clientHeight - H) > 120) {
                    build();
                    wake();
                }
            }, 200);
        });

        const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => {
            build();
            wake();
        });
    }

    // ================================================
    // Manifesto — words light up as you scroll
    // ================================================
    function initManifesto() {
        const el = $("[data-reveal-words]");
        if (!el) return;

        const highlight = ["playful.", "security,", "Compose."];
        const words = el.textContent.trim().split(/\s+/);
        el.textContent = "";
        const spans = words.map((word, i) => {
            const span = document.createElement("span");
            span.className = "w" + (highlight.includes(word) ? " hl" : "");
            span.textContent = word;
            el.appendChild(span);
            if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
            return span;
        });

        if (reducedMotion) {
            spans.forEach((s) => s.classList.add("on"));
            return;
        }

        let ticking = false;
        function update() {
            ticking = false;
            const r = el.getBoundingClientRect();
            const vh = window.innerHeight;
            const progress = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.3), 0, 1);
            const count = Math.round(progress * spans.length);
            spans.forEach((s, i) => s.classList.toggle("on", i < count));
        }
        window.addEventListener("scroll", () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });
        update();
    }

    // ================================================
    // Scroll reveal
    // ================================================
    function initReveal() {
        if (reducedMotion) return;
        const targets = $$(".section-head, .project, .toy, .about__grid, .contact__title, .contact__mail");
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-in");
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: "0px 0px -10% 0px" });

        targets.forEach((el) => {
            el.classList.add("reveal");
            io.observe(el);
        });
    }

    // ================================================
    // Project tilt
    // ================================================
    function initTilt() {
        if (!finePointer || reducedMotion) return;
        $$("[data-tilt]").forEach((card) => {
            const visual = $(".project__visual", card);
            if (!visual) return;
            card.addEventListener("pointermove", (e) => {
                const r = visual.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top) / r.height - 0.5;
                visual.style.transform = "perspective(900px) rotateY(" + (x * 8).toFixed(2) + "deg) rotateX(" + (-y * 8).toFixed(2) + "deg)";
            });
            card.addEventListener("pointerleave", () => {
                visual.style.transform = "";
            });
            visual.style.transition = "transform .4s cubic-bezier(.22,1,.36,1)";
        });
    }

    // ================================================
    // Icon lab — a tiny nod to Iconsax Compose
    // ================================================
    const ICONS = {
        Home: '<path class="f" d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5A1.5 1.5 0 0 1 3.5 19z"/>',
        Notification: '<path class="f" d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
        Heart: '<path class="f" d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
        Star: '<path class="f" d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
        Setting: '<path class="f" fill-rule="evenodd" d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>',
        User: '<circle class="f" cx="12" cy="8" r="4"/><path class="f" d="M4.5 20.5c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6z"/>',
        SearchNormal: '<circle class="f" cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.5-4.5"/>',
        Lock: '<rect class="f" x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
        ShieldTick: '<path class="f" d="M12 3 19.5 6v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/><path d="m9 12 2 2 4-4" stroke="var(--icon-cut, currentColor)"/>',
        Message: '<path class="f" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-5 3.5z"/>',
        Camera: '<path class="f" fill-rule="evenodd" d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.5L9 4.5h6L16.5 7H19a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18zM12 10a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z"/>',
        Folder: '<path class="f" d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5z"/>'
    };

    function initIconLab() {
        const lab = $("[data-iconlab]");
        if (!lab) return;
        const grid = $("[data-icon-grid]", lab);
        const code = $("[data-icon-code]", lab);
        const styleBtns = $$("[data-style]", lab);
        let style = "Outline";
        let current = "Home";
        let touched = false;

        const cells = Object.keys(ICONS).map((name) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "iconlab__cell";
            btn.setAttribute("aria-label", name);
            btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + "</svg>";
            const pick = () => select(name);
            btn.addEventListener("pointerenter", () => { touched = true; pick(); });
            btn.addEventListener("focus", pick);
            btn.addEventListener("click", () => { touched = true; pick(); });
            grid.appendChild(btn);
            return btn;
        });

        function select(name) {
            current = name;
            cells.forEach((c) => c.classList.toggle("is-active", c.getAttribute("aria-label") === name));
            code.textContent = "Icon(Iconsax." + style + "." + name + ', contentDescription = "' + name + '")';
        }

        styleBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                style = btn.dataset.style;
                lab.dataset.style = style;
                styleBtns.forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
                select(current);
            });
        });

        select(current);

        // Idle wander until someone touches it
        if (!reducedMotion) {
            const names = Object.keys(ICONS);
            let i = 0;
            const timer = setInterval(() => {
                if (touched) return clearInterval(timer);
                const visible = window.innerWidth > 640 ? names.length : 8;
                i = (i + 1) % visible;
                select(names[i]);
            }, 1400);
        }
    }

    // ================================================
    // Spring toy — Compose's spring(), simulated
    // ================================================
    function initSpring() {
        const root = $("[data-spring]");
        if (!root) return;
        const arena = $("[data-spring-arena]", root);
        const ball = $("[data-spring-ball]", root);
        const band = $("[data-spring-band] line", root);
        const plot = $("[data-spring-plot]", root);
        const codeEl = $("[data-spring-code]", root);
        const ctx = plot.getContext("2d");

        const state = {
            x: 0, y: 0, vx: 0, vy: 0,
            damping: 0.5, dampingName: "MediumBouncy",
            stiffness: 200, stiffnessName: "Low",
            dragging: false, moved: false, dir: { x: 1, y: 0 },
            running: false
        };
        const history = [];
        const HISTORY = 160;

        function renderCode() {
            const k = (s) => '<span class="k">' + s + "</span>";
            const v = (s) => '<span class="v">' + s + "</span>";
            codeEl.innerHTML =
                k("val") + " offset " + k("by") + " animateOffsetAsState(\n" +
                "    targetValue = Offset.Zero,\n" +
                "    animationSpec = spring(\n" +
                "        dampingRatio = " + v("Spring.DampingRatio" + state.dampingName) + ",\n" +
                "        stiffness = " + v("Spring.Stiffness" + state.stiffnessName) + "\n" +
                "    )\n)";
        }

        function bindSegmented(group, apply) {
            const btns = $$("button", group);
            btns.forEach((btn) => {
                btn.addEventListener("click", () => {
                    btns.forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
                    apply(parseFloat(btn.dataset.value), btn.dataset.name);
                    renderCode();
                    flick();
                });
            });
        }
        bindSegmented($("[data-spring-damping]", root), (val, name) => { state.damping = val; state.dampingName = name; });
        bindSegmented($("[data-spring-stiffness]", root), (val, name) => { state.stiffness = val; state.stiffnessName = name; });

        function bounds() {
            return { hx: arena.clientWidth / 2 - 40, hy: arena.clientHeight / 2 - 40 };
        }

        function draw() {
            ball.style.transform = "translate(" + state.x.toFixed(1) + "px," + state.y.toFixed(1) + "px)";
            const cx = arena.clientWidth / 2;
            const cy = arena.clientHeight / 2;
            band.setAttribute("x1", cx);
            band.setAttribute("y1", cy);
            band.setAttribute("x2", cx + state.x);
            band.setAttribute("y2", cy + state.y);
        }

        function drawPlot() {
            const dpr = window.devicePixelRatio || 1;
            const w = plot.clientWidth;
            const h = plot.clientHeight;
            if (plot.width !== Math.round(w * dpr)) {
                plot.width = Math.round(w * dpr);
                plot.height = Math.round(h * dpr);
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            const styles = getComputedStyle(document.documentElement);
            ctx.strokeStyle = styles.getPropertyValue("--line");
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
            ctx.setLineDash([]);
            if (history.length < 2) return;
            const max = Math.max(40, ...history.map(Math.abs));
            ctx.strokeStyle = styles.getPropertyValue("--accent");
            ctx.lineWidth = 2;
            ctx.beginPath();
            history.forEach((d, i) => {
                const x = (i / (HISTORY - 1)) * w;
                const y = h / 2 - (d / max) * (h / 2 - 4);
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            });
            ctx.stroke();
        }

        let last = 0;
        function frame(now) {
            const dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;
            if (!state.dragging) {
                const k = state.stiffness;
                const c = 2 * state.damping * Math.sqrt(k);
                const steps = Math.max(1, Math.ceil(dt / 0.001));
                const h = dt / steps;
                for (let i = 0; i < steps; i++) {
                    state.vx += (-k * state.x - c * state.vx) * h;
                    state.vy += (-k * state.y - c * state.vy) * h;
                    state.x += state.vx * h;
                    state.y += state.vy * h;
                }
            }
            history.push(state.x * state.dir.x + state.y * state.dir.y);
            if (history.length > HISTORY) history.shift();
            draw();
            drawPlot();

            const settled = !state.dragging && Math.hypot(state.x, state.y) < 0.15 && Math.hypot(state.vx, state.vy) < 0.15;
            if (settled) {
                state.x = state.y = state.vx = state.vy = 0;
                draw();
                state.running = false;
                return;
            }
            requestAnimationFrame(frame);
        }

        function run() {
            if (state.running) return;
            state.running = true;
            last = performance.now();
            requestAnimationFrame(frame);
        }

        function setDir() {
            const d = Math.hypot(state.x, state.y) || 1;
            state.dir = { x: state.x / d, y: state.y / d };
        }

        function flick() {
            const { hx, hy } = bounds();
            const a = Math.random() * Math.PI * 2;
            const r = Math.min(hx, hy) * 0.85;
            state.x = Math.cos(a) * r;
            state.y = Math.sin(a) * r;
            state.vx = state.vy = 0;
            setDir();
            run();
        }

        let start = null;
        ball.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            ball.setPointerCapture(e.pointerId);
            state.dragging = true;
            state.moved = false;
            start = { px: e.clientX, py: e.clientY, x: state.x, y: state.y };
            state.vx = state.vy = 0;
            run();
        });
        ball.addEventListener("pointermove", (e) => {
            if (!state.dragging) return;
            const { hx, hy } = bounds();
            const dx = e.clientX - start.px;
            const dy = e.clientY - start.py;
            if (Math.hypot(dx, dy) > 3) state.moved = true;
            state.x = clamp(start.x + dx, -hx, hx);
            state.y = clamp(start.y + dy, -hy, hy);
        });
        const end = () => {
            if (!state.dragging) return;
            state.dragging = false;
            setDir();
            history.length = 0;
        };
        ball.addEventListener("pointerup", end);
        ball.addEventListener("pointercancel", end);
        ball.addEventListener("click", () => {
            if (state.moved) {
                state.moved = false;
                return;
            }
            flick();
        });

        renderCode();
        draw();
        drawPlot();
        window.addEventListener("resize", () => { draw(); drawPlot(); });
    }

    // ================================================
    // Ripple pads — Material ripples that sing
    // ================================================
    function initPads() {
        const root = $("[data-pads]");
        if (!root) return;

        const notes = [
            ["C4", 261.63], ["D4", 293.66], ["E4", 329.63], ["G4", 392.0],
            ["A4", 440.0], ["C5", 523.25], ["D5", 587.33], ["E5", 659.25],
            ["G5", 783.99], ["A5", 880.0], ["C6", 1046.5], ["D6", 1174.66]
        ];
        const colors = [
            ["#ff5a1f", "#fff"], ["#ffd23f", "#141413"], ["#3ddc84", "#141413"], ["#7b8cff", "#fff"],
            ["#ff9ecf", "#141413"], ["#141413", "#fff"], ["#f1eee6", "#141413"], ["#ff5a1f", "#fff"],
            ["#3ddc84", "#141413"], ["#ffd23f", "#141413"], ["#7b8cff", "#fff"], ["#ff9ecf", "#141413"]
        ];
        let audio = null;

        function sound(freq) {
            try {
                if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
                if (audio.state === "suspended") audio.resume();
                const t = audio.currentTime;
                const gain = audio.createGain();
                const filter = audio.createBiquadFilter();
                filter.type = "lowpass";
                filter.frequency.value = 2400;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.exponentialRampToValueAtTime(0.28, t + 0.008);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
                [["triangle", 1, 1], ["sine", 2, 0.35]].forEach(([type, mult, level]) => {
                    const osc = audio.createOscillator();
                    const g = audio.createGain();
                    osc.type = type;
                    osc.frequency.value = freq * mult;
                    g.gain.value = level;
                    osc.connect(g).connect(filter);
                    osc.start(t);
                    osc.stop(t + 1);
                });
                filter.connect(gain).connect(audio.destination);
            } catch (err) {
                // No audio available — the ripples still work
            }
        }

        function hit(pad, x, y, freq) {
            const r = pad.getBoundingClientRect();
            const size = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) * 2;
            const ripple = document.createElement("span");
            ripple.className = "pad__ripple";
            ripple.style.left = x + "px";
            ripple.style.top = y + "px";
            ripple.style.width = ripple.style.height = size + "px";
            pad.appendChild(ripple);
            ripple.addEventListener("animationend", () => ripple.remove());
            pad.classList.add("is-hit");
            setTimeout(() => pad.classList.remove("is-hit"), 140);
            sound(freq);
        }

        notes.forEach(([name, freq], i) => {
            const pad = document.createElement("button");
            pad.type = "button";
            pad.className = "pad";
            pad.setAttribute("aria-label", "Play " + name);
            pad.style.setProperty("--pad", colors[i][0]);
            pad.style.color = colors[i][1];
            pad.addEventListener("pointerdown", (e) => {
                const r = pad.getBoundingClientRect();
                hit(pad, e.clientX - r.left, e.clientY - r.top, freq);
            });
            pad.addEventListener("click", (e) => {
                // Keyboard activation (pointer presses were handled on pointerdown)
                if (e.detail === 0) hit(pad, pad.clientWidth / 2, pad.clientHeight / 2, freq);
            });
            root.appendChild(pad);
        });
    }

    // ================================================
    // Terminal
    // ================================================
    function initTerminal() {
        const root = $("[data-term]");
        if (!root) return;
        const screen = $("[data-term-screen]", root);
        const out = $("[data-term-out]", root);
        const form = $("[data-term-form]", root);
        const input = $("[data-term-input]", root);
        const history = [];
        let cursor = 0;

        const LINKS = {
            github: "https://github.com/RabehX",
            telegram: "https://t.me/RabehX",
            securify: "https://github.com/RabehX/Securify",
            iconsax: "https://github.com/RabehX/iconsax-compose",
            email: "mailto:rabehxofficial@gmail.com"
        };

        function print(parts, cls) {
            const p = document.createElement("p");
            if (cls) p.className = cls;
            [].concat(parts).forEach((part) => {
                if (typeof part === "string") {
                    p.appendChild(document.createTextNode(part));
                } else {
                    const a = document.createElement("a");
                    a.href = part.href;
                    a.textContent = part.text;
                    if (!part.href.startsWith("mailto:")) {
                        a.target = "_blank";
                        a.rel = "noopener";
                    }
                    p.appendChild(a);
                }
            });
            out.appendChild(p);
            screen.scrollTop = screen.scrollHeight;
        }

        const commands = {
            help() {
                print("Commands:");
                print("  whoami     projects   stack    contact", "dim");
                print("  ls         cat <file> open <x> theme <light|dark|auto>", "dim");
                print("  gravity    date       echo     clear", "dim");
            },
            whoami() {
                print("Rabeh Azzam — mobile developer.");
                print("Android, Kotlin, Compose. Soft spot for device security.", "dim");
            },
            projects() {
                print(["Securify         ", { text: "github.com/RabehX/Securify", href: LINKS.securify }]);
                print("  root checker + Play Integrity, Material 3 Expressive", "dim");
                print(["Iconsax Compose  ", { text: "github.com/RabehX/iconsax-compose", href: LINKS.iconsax }]);
                print("  1,000+ Iconsax icons for Compose Multiplatform", "dim");
            },
            stack() {
                print("languages  Kotlin · Java · Python · C++ · Shell");
                print("tools      Jetpack Compose · Android SDK · Git · Figma");
            },
            contact() {
                print(["email     ", { text: "rabehxofficial@gmail.com", href: LINKS.email }]);
                print(["telegram  ", { text: "t.me/RabehX", href: LINKS.telegram }]);
                print(["github    ", { text: "github.com/RabehX", href: LINKS.github }]);
            },
            ls() {
                print("about.txt  contact.txt  projects/  playground/");
            },
            cat(args) {
                const file = args[0];
                if (file === "about.txt") return commands.whoami();
                if (file === "contact.txt") return commands.contact();
                print(file ? "cat: " + file + ": No such file" : "usage: cat <file>");
            },
            open(args) {
                const key = (args[0] || "").toLowerCase();
                if (!LINKS[key]) return print("usage: open " + Object.keys(LINKS).join("|"));
                print("opening " + key + "…", "dim");
                window.open(LINKS[key], key === "email" ? "_self" : "_blank", "noopener");
            },
            theme(args) {
                const mode = args[0];
                if (!["light", "dark", "auto"].includes(mode)) return print("usage: theme light|dark|auto");
                if (mode === "auto") document.documentElement.removeAttribute("data-theme");
                else document.documentElement.setAttribute("data-theme", mode);
                print("theme → " + mode, "dim");
            },
            gravity() {
                const on = hero.toggleGravity();
                print(on ? "gravity: off. scroll up and see." : "gravity: back on.", "dim");
            },
            date() {
                print(new Date().toString());
            },
            echo(args) {
                print(args.join(" "));
            },
            clear() {
                out.textContent = "";
            },
            sudo(args) {
                if (args.join(" ").toLowerCase() === "hire rabeh") {
                    print("[sudo] password accepted. Excellent decision.");
                    print(["→ ", { text: "rabehxofficial@gmail.com", href: LINKS.email }]);
                    return;
                }
                print("rabeh is not in the sudoers file. This incident will be reported.", "dim");
            },
            rm(args) {
                if (args.join(" ").includes("-rf")) return print("nice try.", "dim");
                print("rm: permission denied", "dim");
            }
        };

        function run(raw) {
            const line = raw.trim();
            print("$ " + line, "cmd");
            if (!line) return;
            history.push(line);
            cursor = history.length;
            const [name, ...args] = line.split(/\s+/);
            const cmd = commands[name.toLowerCase()];
            if (cmd) cmd(args);
            else print("command not found: " + name + " — try help", "dim");
        }

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            run(input.value);
            input.value = "";
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "ArrowUp" && history.length) {
                cursor = Math.max(0, cursor - 1);
                input.value = history[cursor];
                e.preventDefault();
            } else if (e.key === "ArrowDown") {
                cursor = Math.min(history.length, cursor + 1);
                input.value = history[cursor] || "";
                e.preventDefault();
            } else if (e.key === "Tab") {
                const match = Object.keys(commands).find((c) => input.value && c.startsWith(input.value));
                if (match) {
                    input.value = match + " ";
                    e.preventDefault();
                }
            }
        });

        screen.addEventListener("click", (e) => {
            if (!e.target.closest("a") && !window.getSelection().toString()) input.focus({ preventScroll: true });
        });

        $$("[data-term-suggest] button", root).forEach((btn) => {
            btn.addEventListener("click", () => run(btn.textContent));
        });

        print("rabeh-shell 1.0 — type help, or tap a suggestion.", "dim");
    }

    // ================================================
    // Bottom navigation
    // ================================================
    function initNavbar() {
        const nav = $(".navbar");
        if (!nav) return;
        const indicator = $(".navbar__indicator", nav);
        const items = $$(".navbar__item", nav);
        let active = null;

        function place() {
            if (!active) return;
            indicator.style.width = active.offsetWidth + "px";
            indicator.style.transform = "translateX(" + active.offsetLeft + "px)";
        }

        function setActive(key) {
            const next = items.find((i) => i.dataset.nav === key);
            if (!next || next === active) return;
            items.forEach((i) => {
                i.classList.toggle("is-active", i === next);
                if (i === next) i.setAttribute("aria-current", "true");
                else i.removeAttribute("aria-current");
            });
            active = next;
            requestAnimationFrame(place);
        }

        const sections = [
            [".hero", "top"], ["#work", "work"], ["#lab", "lab"], ["#about", "about"], ["#contact", "contact"]
        ];
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) setActive(entry.target.dataset.navKey);
            });
        }, { rootMargin: "-45% 0px -50% 0px" });

        sections.forEach(([sel, key]) => {
            const el = $(sel);
            if (!el) return;
            el.dataset.navKey = key;
            io.observe(el);
        });

        setActive("top");
        window.addEventListener("resize", place);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    }

    // ================================================
    // Contact — copy + magnetic email
    // ================================================
    function initContact() {
        $$("[data-copy]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const text = btn.dataset.copy;
                const done = () => toast("Copied " + text);
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
                } else {
                    fallbackCopy(text, done);
                }
            });
        });

        function fallbackCopy(text, done) {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand("copy");
                done();
            } catch (err) {
                toast(text);
            }
            ta.remove();
        }

        if (!finePointer || reducedMotion) return;
        $$("[data-magnetic]").forEach((el) => {
            el.addEventListener("pointermove", (e) => {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left - r.width / 2) / r.width;
                const y = (e.clientY - r.top - r.height / 2) / r.height;
                el.style.transform = "translate(" + (x * 18).toFixed(1) + "px," + (y * 10).toFixed(1) + "px)";
            });
            el.addEventListener("pointerleave", () => {
                el.style.transform = "";
            });
        });
    }

    // ================================================
    // Init
    // ================================================
    $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

    initStatusBar();
    initHero();
    initManifesto();
    initReveal();
    initTilt();
    initIconLab();
    initSpring();
    initPads();
    initTerminal();
    initNavbar();
    initContact();
})();
