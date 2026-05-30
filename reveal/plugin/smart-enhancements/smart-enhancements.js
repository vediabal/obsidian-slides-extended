/**
 * slides-extended-smart.js — Post-processing enhancements for reveal.js
 *
 * Ported from openmd worktree-exp+slides experiment.
 * Handles: language labels, callouts, breadcrumbs, TOC, smart scroll/zoom, banner, preview.
 *
 * Self-executing: waits for Reveal.initialize() to complete, then applies enhancements.
 * Does NOT need to be listed in the reveal.js plugins array.
 */

(function () {
    "use strict";

    function boot() {
        var cfg = window.__SE_SMART_CONFIG__ || {};

        // Wait for Reveal to exist and be initialized
        function waitForReveal() {
            if (typeof Reveal === "undefined" || !Reveal.isReady || !Reveal.isReady()) {
                setTimeout(waitForReveal, 50);
                return;
            }
            onRevealReady(Reveal, cfg);
        }
        waitForReveal();
    }

    function onRevealReady(reveal, cfg) {
        applyTypeScale(cfg);
        applyFont(cfg);
        processLanguageLabels();
        processCallouts();
        processBreadcrumbs(reveal);
        initTOC(reveal);
        initPreview(reveal);
        initControlBar(reveal, cfg);
        if (cfg.banner && cfg.banner.enabled) {
            renderBanner(cfg.banner);
        }
        if (cfg.listBlock) {
            reveal.getRevealElement().classList.add("list-block");
        }
        // Apply smart scroll/zoom after reveal.js layout settles
        if (cfg.smartScroll !== false) {
            setTimeout(function () {
                applySmartScrollZoom(reveal, cfg);
                syncControlBar(reveal);
            }, 300);
        }

        // Re-apply on resize
        var resizeTimer;
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (cfg.smartScroll !== false) {
                    applySmartScrollZoom(reveal, cfg);
                }
            }, 200);
        });
    }

// ── T2.1: Modular Type Scale ──────────────────────────────────────────

var FONT_FAMILIES = {
    system: '-apple-system, "PingFang SC", "Segoe UI", system-ui, sans-serif',
    serif: 'Georgia, "Noto Serif SC", "Source Serif Pro", serif',
    mono: '"SF Mono", Menlo, "Fira Code", monospace',
    inter: 'Inter, -apple-system, "Segoe UI", sans-serif',
};

function applyTypeScale(cfg) {
    var strategy = (cfg && cfg.typeScaleStrategy) || "classic";
    var slides = document.querySelector(".reveal .slides");
    if (!slides) return;

    var sizes;
    if (strategy === "material") {
        sizes = { h1: 2.25, h2: 1.75, h3: 1.375, h4: 1.125 };
    } else if (strategy === "dual") {
        var tight = (cfg && cfg.typeScaleTightRatio) || 1.2;
        var open = (cfg && cfg.typeScaleOpenRatio) || 1.414;
        var blend = 0.5;
        sizes = {
            h1: lerp(Math.pow(tight, 3), Math.pow(open, 3), blend),
            h2: lerp(Math.pow(tight, 2), Math.pow(open, 2), blend),
            h3: lerp(Math.pow(tight, 1), Math.pow(open, 1), blend),
            h4: lerp(Math.pow(tight, 0.5), Math.pow(open, 0.5), blend),
        };
    } else {
        // classic
        var ratio = (cfg && cfg.typeScaleRatio) || 1.333;
        sizes = {
            h1: Math.pow(ratio, 3),
            h2: Math.pow(ratio, 2),
            h3: Math.pow(ratio, 1),
            h4: Math.pow(ratio, 0.5),
        };
    }

    slides.style.setProperty("--h1-size", sizes.h1.toFixed(3) + "em");
    slides.style.setProperty("--h2-size", sizes.h2.toFixed(3) + "em");
    slides.style.setProperty("--h3-size", sizes.h3.toFixed(3) + "em");
    slides.style.setProperty("--h4-size", sizes.h4.toFixed(3) + "em");
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ── T2.2: Font selector ──────────────────────────────────────────────

function applyFont(cfg) {
    var key = (cfg && cfg.fontFamily) || "system";
    var family = FONT_FAMILIES[key] || FONT_FAMILIES.system;
    var slides = document.querySelector(".reveal .slides");
    if (slides) {
        slides.style.setProperty("--font-family", family);
        slides.style.fontFamily = "var(--font-family)";
    }
}

// ── T1.2: Code block language labels ──────────────────────────────────

function processLanguageLabels() {
    document.querySelectorAll(".reveal pre > code[class]").forEach(function (code) {
        var m =
            code.className.match(/\blanguage-(\w+)\b/) ||
            code.className.match(/\bhljs\s+(\w+)\b/);
        if (m && m[1] !== "hljs") {
            code.closest("pre").setAttribute("data-lang", m[1]);
        }
    });
}

// ── T1.3: GitHub-style callouts ───────────────────────────────────────

var CALLOUT_TYPES = {
    NOTE: { icon: "ℹ️", cls: "callout-note" },
    TIP: { icon: "💡", cls: "callout-tip" },
    IMPORTANT: { icon: "❗", cls: "callout-important" },
    WARNING: { icon: "⚠️", cls: "callout-warning" },
    CAUTION: { icon: "🔥", cls: "callout-caution" },
};

function processCallouts() {
    document.querySelectorAll(".reveal blockquote").forEach(function (bq) {
        // Skip blockquotes that are already processed as callouts
        if (bq.classList.contains("callout")) return;

        var firstP = bq.querySelector("p");
        if (!firstP) return;

        var text = firstP.innerHTML;
        var match = text.match(
            /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i
        );
        if (!match) return;

        var type = match[1].toUpperCase();
        var info = CALLOUT_TYPES[type];
        if (!info) return;

        // Remove the marker from the first paragraph
        firstP.innerHTML = text.replace(match[0], "");

        // Build callout structure (matching existing _callouts.scss expectations)
        var callout = document.createElement("div");
        callout.className = "callout " + info.cls;

        var titleDiv = document.createElement("div");
        titleDiv.className = "callout-title";

        var iconDiv = document.createElement("div");
        iconDiv.className = "callout-icon";
        iconDiv.textContent = info.icon;

        var titleInner = document.createElement("div");
        titleInner.className = "callout-title-inner";
        titleInner.textContent = type.charAt(0) + type.slice(1).toLowerCase();

        titleDiv.appendChild(iconDiv);
        titleDiv.appendChild(titleInner);

        var contentDiv = document.createElement("div");
        contentDiv.className = "callout-content";

        // Move all children of the blockquote into content
        while (bq.firstChild) {
            contentDiv.appendChild(bq.firstChild);
        }

        callout.appendChild(titleDiv);
        callout.appendChild(contentDiv);

        bq.parentNode.replaceChild(callout, bq);
    });
}

// ── T1.4: Sub-slide breadcrumb ────────────────────────────────────────

function processBreadcrumbs(reveal) {
    var stacks = document.querySelectorAll(".reveal .slides > section.stack");
    stacks.forEach(function (stack) {
        var children = stack.querySelectorAll(":scope > section");
        if (children.length < 2) return;

        // Get heading from first child
        var firstHeading = children[0].querySelector("h1, h2, h3, h4");
        if (!firstHeading) return;
        var title = firstHeading.textContent.trim();

        // Add breadcrumb to subsequent children
        for (var i = 1; i < children.length; i++) {
            // Skip if already has breadcrumb
            if (children[i].querySelector(".sub-breadcrumb")) continue;

            var bc = document.createElement("div");
            bc.className = "sub-breadcrumb";
            bc.textContent = title;
            children[i].insertBefore(bc, children[i].firstChild);
        }
    });
}

// ── T1.6: TOC overlay ────────────────────────────────────────────────

function initTOC(reveal) {
    // Create overlay DOM
    var overlay = document.createElement("div");
    overlay.id = "se-toc-overlay";
    overlay.innerHTML =
        '<div id="se-toc-panel"><h3>Table of Contents</h3><div id="se-toc-list"></div></div>';
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeTOC();
    });

    // Keyboard: 't' to toggle, Escape to close
    document.addEventListener("keydown", function (e) {
        if (e.key === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Don't trigger inside inputs
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            e.preventDefault();
            toggleTOC(reveal);
        }
        if (e.key === "Escape" && overlay.classList.contains("open")) {
            closeTOC();
        }
    });
}

function toggleTOC(reveal) {
    var overlay = document.getElementById("se-toc-overlay");
    if (overlay.classList.contains("open")) {
        closeTOC();
    } else {
        openTOC(reveal);
    }
}

function openTOC(reveal) {
    var overlay = document.getElementById("se-toc-overlay");
    var list = document.getElementById("se-toc-list");
    list.innerHTML = "";

    var slides = reveal.getSlides();
    var indices = reveal.getIndices();
    var currentSlide = reveal.getCurrentSlide();

    var pageNum = 0;
    slides.forEach(function (slide) {
        pageNum++;
        var heading = slide.querySelector("h1, h2, h3, h4");
        if (!heading) return;

        var level = heading.tagName.toLowerCase(); // h1, h2, h3, h4
        var text = heading.textContent.trim();

        var slideIndices = reveal.getIndices(slide);

        var item = document.createElement("div");
        item.className = "se-toc-item se-toc-" + level;
        if (slide === currentSlide) {
            item.classList.add("active");
        }

        var pageSpan = document.createElement("span");
        pageSpan.className = "se-toc-page";
        pageSpan.textContent = pageNum;

        var textSpan = document.createElement("span");
        textSpan.className = "se-toc-text";
        textSpan.textContent = text;

        item.appendChild(pageSpan);
        item.appendChild(textSpan);

        item.addEventListener("click", function () {
            closeTOC();
            reveal.slide(slideIndices.h, slideIndices.v);
        });

        list.appendChild(item);
    });

    overlay.classList.add("open");
}

function closeTOC() {
    document.getElementById("se-toc-overlay").classList.remove("open");
}

// ── T3.1: Smart scroll/zoom decision engine ───────────────────────────

var MIN_SCALE_PLAIN = 0.8;
var MIN_SCALE_TALL = 0.92;

function applySmartScrollZoom(reveal, cfg) {
    var defaultScale = (cfg && cfg.defaultScale) || 1.0;
    var canvasHeight = reveal.getConfig().height || 700;

    // Set CSS custom property so the .se-scroll class knows the canvas height
    var slidesEl = document.querySelector(".reveal .slides");
    if (slidesEl) {
        slidesEl.style.setProperty("--se-canvas-height", canvasHeight + "px");
    }

    var slides = reveal.getSlides();
    slides.forEach(function (slide) {
        var sc = slide;

        // Clean up previous state
        slide.classList.remove("se-scroll");
        sc.style.zoom = "";

        var naturalH = measureNatural(slide, canvasHeight);
        var ratio = naturalH / canvasHeight;
        var hasTall = !!(
            sc.querySelector("pre") ||
            sc.querySelector(".mermaid") ||
            sc.querySelector("svg") ||
            sc.querySelector(".katex-display")
        );
        var minScale = hasTall ? MIN_SCALE_TALL : MIN_SCALE_PLAIN;
        var fit = 1 / ratio;

        if (ratio <= 1.0) {
            // Content fits
            if (defaultScale !== 1.0) {
                sc.style.zoom = defaultScale;
            }
        } else if (fit >= minScale) {
            // Slight overflow — scale down
            sc.style.zoom = fit * defaultScale;
        } else {
            // Too much content — add se-scroll class.
            // CSS handles height + overflow via !important (beats reveal.js inline styles).
            slide.classList.add("se-scroll");
            if (defaultScale !== 1.0) {
                sc.style.zoom = defaultScale;
            }
        }
    });
}

function measureNatural(section, canvasHeight) {
    // reveal.js constrains sections with inline style height/top and absolute positioning.
    // We must temporarily remove these constraints to measure true content height.
    var prevHeight = section.style.height;
    var prevMaxHeight = section.style.maxHeight;
    var prevOverflow = section.style.overflow;
    var prevTop = section.style.top;

    var hidden = getComputedStyle(section).display === "none";
    var prevVis, prevPos, prevDisp;
    if (hidden) {
        prevVis = section.style.visibility;
        prevPos = section.style.position;
        prevDisp = section.style.display;
        section.style.visibility = "hidden";
        section.style.position = "absolute";
        section.style.display = "block";
    }

    // Remove reveal.js height constraints to measure natural content height
    section.style.height = "auto";
    section.style.maxHeight = "none";
    section.style.overflow = "visible";
    section.style.top = "0";

    var h = section.scrollHeight;

    // Restore
    section.style.height = prevHeight;
    section.style.maxHeight = prevMaxHeight;
    section.style.overflow = prevOverflow;
    section.style.top = prevTop;

    if (hidden) {
        section.style.visibility = prevVis;
        section.style.position = prevPos;
        section.style.display = prevDisp;
    }
    return h;
}

// ── T3.2: Banner ──────────────────────────────────────────────────────

function renderBanner(bannerCfg) {
    var bar = document.getElementById("se-banner");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "se-banner";
        bar.innerHTML =
            '<div class="banner-text"></div><div class="banner-datetime" style="display:none"></div>';
        document.body.appendChild(bar);
    }

    if (!bannerCfg.enabled || !bannerCfg.text) {
        bar.classList.remove("visible");
        return;
    }

    bar.classList.add("visible");
    bar.style.fontFamily = bannerCfg.fontFamily || "inherit";
    bar.style.fontSize = (bannerCfg.fontSize || 14) + "px";
    bar.style.background = bannerCfg.bgColor || "#1a1d24";
    bar.style.color = bannerCfg.textColor || "#e6e9ef";

    var textEl = bar.querySelector(".banner-text");
    textEl.textContent = bannerCfg.text;
    textEl.style.textAlign = bannerCfg.align || "center";

    var dtEl = bar.querySelector(".banner-datetime");
    if (bannerCfg.showDatetime && bannerCfg.datetimeFormat) {
        dtEl.textContent = formatDatetime(bannerCfg.datetimeFormat);
        dtEl.style.display = "block";
    } else {
        dtEl.style.display = "none";
    }
}

function formatDatetime(fmt) {
    var now = new Date();
    function pad(n) {
        return String(n).padStart(2, "0");
    }
    return fmt
        .replace("YYYY", now.getFullYear())
        .replace("MM", pad(now.getMonth() + 1))
        .replace("DD", pad(now.getDate()))
        .replace("HH", pad(now.getHours()))
        .replace("mm", pad(now.getMinutes()));
}

// ── T3.3: Preview views (Grid/Flat/Source) ────────────────────────────

var PREVIEW_MODES = ["off", "grid", "flat", "source"];
var ZOOM_LEVELS = [0.12, 0.15, 0.1875, 0.21875, 0.28, 0.35, 0.45];
var previewState = { current: "off", zoomIdx: 3, overlay: null, reveal: null };

function initPreview(reveal) {
    previewState.reveal = reveal;

    // Inject preview CSS
    if (!document.getElementById("se-preview-styles")) {
        var style = document.createElement("style");
        style.id = "se-preview-styles";
        style.textContent =
            ".se-preview-overlay{position:fixed;inset:0;z-index:180;background:rgba(10,12,16,.96);display:none;flex-direction:column;overflow-y:auto;scroll-behavior:smooth}" +
            ".se-preview-overlay.open{display:flex}" +
            ".se-preview-header{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:12px;padding:10px 24px;background:rgba(10,12,16,.9);backdrop-filter:blur(6px);border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}" +
            ".se-preview-header .mode-label{color:#5aa9ff;font:600 14px/1 -apple-system,'Segoe UI',system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em;margin-right:auto}" +
            ".se-preview-header button{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#9aa3b2;border-radius:6px;padding:4px 10px;cursor:pointer;font:12px/1.5 -apple-system,'Segoe UI',system-ui,sans-serif}" +
            ".se-preview-header button:hover{background:rgba(255,255,255,.12);color:#e6e9ef}" +
            ".se-preview-header button.active{background:rgba(90,169,255,.2);color:#5aa9ff;border-color:rgba(90,169,255,.4)}" +
            ".se-preview-header .zoom-label{color:#9aa3b2;font-size:11px;min-width:36px;text-align:center}" +
            ".se-preview-body{padding:20px 24px;flex:1}" +
            ".se-preview-row{display:flex;gap:16px;margin-bottom:24px;align-items:flex-start;flex-wrap:wrap}" +
            ".se-slide-thumb{flex-shrink:0;border:1px solid rgba(255,255,255,.12);border-radius:6px;overflow:hidden;position:relative;cursor:pointer;background:#fff;transition:width .2s,height .2s}" +
            ".se-slide-thumb:hover{border-color:rgba(90,169,255,.6)}" +
            ".se-thumb-inner{width:1280px;height:720px;transform-origin:top left;pointer-events:none;overflow:hidden}" +
            ".se-slide-label{position:absolute;bottom:4px;right:6px;background:rgba(0,0,0,.6);color:#fff;border-radius:3px;padding:1px 6px;font:10px/1.4 -apple-system,sans-serif}" +
            ".se-preview-flat .se-preview-body{display:flex;flex-wrap:wrap;gap:16px;padding:20px 24px}" +
            ".se-preview-source .se-preview-body{padding:20px 24px;max-width:900px;margin:0 auto}" +
            ".se-preview-source pre.md-source{background:rgba(255,255,255,.04);color:#c8d0dc;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:20px 24px;font:13px/1.7 'SF Mono',Menlo,'Fira Code',monospace;white-space:pre-wrap;word-wrap:break-word;overflow-x:auto;tab-size:2}";
        document.head.appendChild(style);
    }

    // Create overlay
    previewState.overlay = document.createElement("div");
    previewState.overlay.className = "se-preview-overlay";
    document.body.appendChild(previewState.overlay);

    // Keyboard: 'v' to cycle, +/- to zoom
    document.addEventListener("keydown", function (e) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.key === "v" && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            cyclePreview();
        }
        if (previewState.current !== "off") {
            if (e.key === "=" || e.key === "+") { e.preventDefault(); previewZoomIn(); }
            if (e.key === "-") { e.preventDefault(); previewZoomOut(); }
            if (e.key === "Escape") { e.preventDefault(); hidePreview(); }
        }
    });
}

function cyclePreview() {
    var idx = PREVIEW_MODES.indexOf(previewState.current);
    var next = PREVIEW_MODES[(idx + 1) % PREVIEW_MODES.length];
    if (next === "off") hidePreview();
    else showPreview(next);
}

function showPreview(mode) {
    previewState.current = mode;
    var overlay = previewState.overlay;
    overlay.innerHTML = "";
    overlay.className = "se-preview-overlay se-preview-" + mode + " open";

    if (mode === "grid") renderPreviewGrid();
    else if (mode === "flat") renderPreviewFlat();
    else if (mode === "source") renderPreviewSource();

    addPreviewHeader(mode);
}

function hidePreview() {
    previewState.current = "off";
    previewState.overlay.classList.remove("open");
    previewState.overlay.innerHTML = "";
}

function previewZoomIn() {
    if (previewState.current === "source") {
        zoomPreviewSource(1);
        return;
    }
    if (previewState.zoomIdx < ZOOM_LEVELS.length - 1) {
        previewState.zoomIdx++;
        applyPreviewZoom();
    }
}

function previewZoomOut() {
    if (previewState.current === "source") {
        zoomPreviewSource(-1);
        return;
    }
    if (previewState.zoomIdx > 0) {
        previewState.zoomIdx--;
        applyPreviewZoom();
    }
}

function zoomPreviewSource(dir) {
    var pre = previewState.overlay.querySelector("pre.md-source");
    if (!pre) return;
    var cur = parseFloat(pre.style.fontSize) || 13;
    var next = Math.max(8, Math.min(24, cur + dir * 2));
    pre.style.fontSize = next + "px";
    updatePreviewZoomLabel();
}

function applyPreviewZoom() {
    var z = ZOOM_LEVELS[previewState.zoomIdx];
    var w = Math.round(1280 * z);
    var h = Math.round(720 * z);

    previewState.overlay.querySelectorAll(".se-slide-thumb").forEach(function (thumb) {
        thumb.style.width = w + "px";
        thumb.style.height = h + "px";
        var inner = thumb.querySelector(".se-thumb-inner");
        if (inner) inner.style.transform = "scale(" + z + ")";
    });
    updatePreviewZoomLabel();
}

function updatePreviewZoomLabel() {
    var lbl = previewState.overlay.querySelector(".zoom-label");
    if (!lbl) return;
    if (previewState.current === "source") {
        var pre = previewState.overlay.querySelector("pre.md-source");
        lbl.textContent = pre ? Math.round(parseFloat(pre.style.fontSize) || 13) + "px" : "";
    } else {
        lbl.textContent = Math.round(ZOOM_LEVELS[previewState.zoomIdx] * 100) + "%";
    }
}

function addPreviewHeader(mode) {
    var header = document.createElement("div");
    header.className = "se-preview-header";

    var labels = { grid: "📐 Grid", flat: "📋 Flat", source: "📝 Source" };
    var lbl = document.createElement("span");
    lbl.className = "mode-label";
    lbl.textContent = labels[mode] || mode;
    header.appendChild(lbl);

    // Nav buttons
    var nav = document.createElement("div");
    nav.style.cssText = "display:flex;gap:4px";
    ["grid", "flat", "source"].forEach(function (m) {
        var btn = document.createElement("button");
        btn.className = m === mode ? "active" : "";
        btn.textContent = m.charAt(0).toUpperCase() + m.slice(1);
        btn.onclick = function () { showPreview(m); };
        nav.appendChild(btn);
    });
    header.appendChild(nav);

    // Zoom controls
    var zoomGroup = document.createElement("div");
    zoomGroup.style.cssText = "display:flex;align-items:center;gap:4px";
    var zOut = document.createElement("button");
    zOut.textContent = "−";
    zOut.onclick = previewZoomOut;
    var zLabel = document.createElement("span");
    zLabel.className = "zoom-label";
    zLabel.textContent = mode === "source" ? "13px" : Math.round(ZOOM_LEVELS[previewState.zoomIdx] * 100) + "%";
    var zIn = document.createElement("button");
    zIn.textContent = "+";
    zIn.onclick = previewZoomIn;
    zoomGroup.appendChild(zOut);
    zoomGroup.appendChild(zLabel);
    zoomGroup.appendChild(zIn);
    header.appendChild(zoomGroup);

    // Close
    var closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Close (v)";
    closeBtn.onclick = hidePreview;
    header.appendChild(closeBtn);

    previewState.overlay.insertBefore(header, previewState.overlay.firstChild);
}

function getSlideStructure() {
    var reveal = previewState.reveal;
    var hSlides = reveal.getHorizontalSlides();
    var structure = [];
    hSlides.forEach(function (hSlide, h) {
        var group = { h: h, slides: [] };
        if (hSlide.classList.contains("stack")) {
            var vSlides = hSlide.querySelectorAll(":scope > section");
            vSlides.forEach(function (vSlide, v) {
                group.slides.push({ h: h, v: v, section: vSlide });
            });
        } else {
            group.slides.push({ h: h, v: 0, section: hSlide });
        }
        structure.push(group);
    });
    return structure;
}

function createThumb(section, label, h, v) {
    var z = ZOOM_LEVELS[previewState.zoomIdx];
    var w = Math.round(1280 * z);
    var ht = Math.round(720 * z);

    var thumb = document.createElement("div");
    thumb.className = "se-slide-thumb";
    thumb.style.width = w + "px";
    thumb.style.height = ht + "px";
    thumb.onclick = function () {
        hidePreview();
        previewState.reveal.slide(h, v);
    };

    var inner = document.createElement("div");
    inner.className = "se-thumb-inner";
    inner.style.transform = "scale(" + z + ")";
    var clone = section.cloneNode(true);
    clone.style.cssText = "display:block!important;position:relative;width:1280px;height:720px;padding:30px 40px;box-sizing:border-box;";
    clone.classList.remove("past", "future", "present");
    inner.appendChild(clone);
    thumb.appendChild(inner);

    var lbl = document.createElement("div");
    lbl.className = "se-slide-label";
    lbl.textContent = label;
    thumb.appendChild(lbl);

    return thumb;
}

function renderPreviewGrid() {
    var body = document.createElement("div");
    body.className = "se-preview-body";
    var structure = getSlideStructure();
    var pageNum = 1;

    structure.forEach(function (group) {
        var row = document.createElement("div");
        row.className = "se-preview-row";
        group.slides.forEach(function (s) {
            var label = group.slides.length > 1
                ? (group.h + 1) + "." + (s.v + 1)
                : String(pageNum);
            row.appendChild(createThumb(s.section, label, s.h, s.v));
        });
        pageNum++;
        body.appendChild(row);
    });

    previewState.overlay.appendChild(body);
}

function renderPreviewFlat() {
    var body = document.createElement("div");
    body.className = "se-preview-body";
    var structure = getSlideStructure();
    var pageNum = 1;

    structure.forEach(function (group) {
        group.slides.forEach(function (s) {
            body.appendChild(createThumb(s.section, String(pageNum), s.h, s.v));
            pageNum++;
        });
    });

    previewState.overlay.appendChild(body);
}

function renderPreviewSource() {
    var body = document.createElement("div");
    body.className = "se-preview-body";
    var pre = document.createElement("pre");
    pre.className = "md-source";

    // Extract markdown from data-markdown sections
    var sections = document.querySelectorAll(".reveal section[data-markdown]");
    var texts = [];
    sections.forEach(function (sec) {
        var script = sec.querySelector("script[type='text/template']");
        if (script) {
            texts.push(script.textContent.trim());
        }
    });
    pre.textContent = texts.join("\n\n---\n\n") || "(No markdown source available)";

    body.appendChild(pre);
    previewState.overlay.appendChild(body);
}

    // Start
    boot();

// ── Control Bar ───────────────────────────────────────────────────────

var ctlState = { reveal: null, cfg: null };

// ── Runtime state for the more-menu toggles ──────────────────────────
var rtState = {
    transition: "fade",
    showProgress: true,
    mouseWheel: false,
    listBlock: false,
    defaultScale: 1.0,
    align: "left",
    scaleMode: "classic",
    dualRatioMin: 1.200,
    dualRatioMax: 1.414
};
var LS_KEY = "se-smart-v1";
function loadRtState() {
    try { var s = JSON.parse(localStorage.getItem(LS_KEY) || "{}"); Object.assign(rtState, s); } catch (e) { /* ignore */ }
}
function persistRtState() {
    localStorage.setItem(LS_KEY, JSON.stringify(rtState));
}

// Theme / font constants for the more-menu
var SLIDE_THEMES = [
    { id: "white", label: "☀️ White" }, { id: "black", label: "🌑 Black" },
    { id: "moon", label: "🌙 Moon" }, { id: "solarized", label: "🌿 Solarized" }
];
var FONTS = [
    { id: "system", label: "System", value: '-apple-system,"PingFang SC","Segoe UI",system-ui,sans-serif' },
    { id: "serif", label: "Serif", value: 'Georgia,"Noto Serif SC","Source Serif Pro",serif' },
    { id: "mono", label: "Mono", value: '"SF Mono",Menlo,"Fira Code",monospace' },
    { id: "inter", label: "Inter", value: "Inter,-apple-system,sans-serif" }
];
var TYPE_SCALES = [
    { id: "major-third", label: "Major Third (1.250)", ratio: 1.250 },
    { id: "perfect-fourth", label: "Perfect Fourth (1.333)", ratio: 1.333 },
    { id: "perfect-fifth", label: "Perfect Fifth (1.500)", ratio: 1.500 }
];
var SCALE_MODES = [
    { id: "classic", label: "Classic Modular" },
    { id: "dual-ratio", label: "Dual-Ratio (Utopia)" },
    { id: "material", label: "Material Design 3" }
];
var MD3_SIZES = { h1: 2.25, h2: 1.75, h3: 1.375, h4: 1.125 };

function closeAllPops(except) {
    ["se-scale-pop", "se-more-menu"].forEach(function (id) {
        if (id !== except) {
            var el = document.getElementById(id);
            if (el) el.classList.remove("open");
        }
    });
}

function initControlBar(reveal, cfg) {
    ctlState.reveal = reveal;
    ctlState.cfg = cfg;
    loadRtState();

    // Apply persisted runtime state
    if (rtState.transition) reveal.configure({ transition: rtState.transition });
    reveal.configure({ progress: rtState.showProgress !== false });
    reveal.configure({ mouseWheel: !!rtState.mouseWheel });
    if (rtState.listBlock) document.querySelector(".reveal")?.classList.add("list-block");
    // Alignment
    var revealEl = document.querySelector(".reveal");
    if (revealEl && rtState.align) {
        revealEl.className = revealEl.className.replace(/\balign-\w+/g, "");
        revealEl.classList.add("align-" + rtState.align);
    }
    if (rtState.fontId) {
        var f = FONTS.find(function (x) { return x.id === rtState.fontId; });
        if (f) {
            var sl = document.querySelector(".reveal .slides");
            if (sl) sl.style.setProperty("--font-family", f.value);
        }
    }

    // Inject CSS
    var style = document.createElement("style");
    style.textContent =
        /* control bar */
        "#se-ctl{position:fixed;bottom:12px;left:12px;z-index:100;display:flex;gap:6px;align-items:flex-end;font:13px/1.2 -apple-system,sans-serif;opacity:.35;transition:opacity .2s}" +
        "#se-ctl:hover{opacity:1}" +
        "#se-ctl .se-btn{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;background:rgba(28,32,40,.85);color:#e6e9ef;border:1px solid rgba(255,255,255,.1);border-radius:8px;cursor:pointer;user-select:none;backdrop-filter:blur(6px);font-size:17px;transition:border-color .15s,background .15s}" +
        "#se-ctl .se-btn:hover{border-color:rgba(90,169,255,.7);background:rgba(28,32,40,.95)}" +
        "#se-ctl .se-btn.active{border-color:rgba(90,169,255,.7);background:rgba(90,169,255,.2)}" +
        "#se-ctl .se-btn.muted{opacity:.4}" +
        "#se-ctl .se-label{color:#9aa3b2;font:11px/36px -apple-system,sans-serif;padding:0 4px;white-space:nowrap}" +
        /* popups shared */
        "#se-ctl .se-pop{position:absolute;bottom:calc(100% + 6px);left:0;display:none;background:rgba(28,32,40,.92);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px;backdrop-filter:blur(6px)}" +
        "#se-ctl .se-pop.open{display:flex}" +
        /* scale popup */
        "#se-scale-pop{flex-direction:row;align-items:center;gap:4px}" +
        "#se-scale-pop button{width:28px;height:28px;border:none;background:rgba(255,255,255,.06);color:#e6e9ef;font-size:14px;cursor:pointer;border-radius:5px}" +
        "#se-scale-pop button:hover{background:rgba(255,255,255,.12)}" +
        "#se-scale-pop .val{min-width:44px;text-align:center;color:#9aa3b2;font-size:12px}" +
        "#se-scale-pop .sep{width:1px;height:20px;background:rgba(255,255,255,.15);margin:0 2px}" +
        /* more-menu */
        "#se-more-menu{flex-direction:column;gap:2px;min-width:200px;max-height:70vh;overflow-y:auto}" +
        "#se-more-menu .menu-section{margin-bottom:4px}#se-more-menu .menu-section:last-child{margin-bottom:0}" +
        "#se-more-menu .menu-label{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;margin-bottom:2px}" +
        "#se-more-menu .menu-item{display:flex;align-items:center;justify-content:space-between;border:none;background:transparent;color:#e6e9ef;font-size:12px;cursor:pointer;border-radius:5px;padding:5px 8px;text-align:left;white-space:nowrap;width:100%}" +
        "#se-more-menu .menu-item:hover{background:rgba(255,255,255,.1)}" +
        "#se-more-menu .menu-item.active{background:rgba(90,169,255,.25);color:#5aa9ff}" +
        "#se-more-menu .se-sep{height:1px;background:rgba(255,255,255,.1);margin:4px 0}" +
        "#se-more-menu .scale-row{display:flex;align-items:center;gap:4px;padding:4px 8px}" +
        "#se-more-menu .scale-row button{width:28px;height:26px;border:none;background:rgba(255,255,255,.06);color:#e6e9ef;font-size:14px;cursor:pointer;border-radius:5px}" +
        "#se-more-menu .scale-row button:hover{background:rgba(255,255,255,.12)}" +
        "#se-more-menu .scale-row .val{min-width:44px;text-align:center;color:#9aa3b2;font-size:12px}" +
        "#se-more-menu .slider-row{display:flex;align-items:center;gap:6px;padding:4px 8px}" +
        "#se-more-menu .slider-row input[type=range]{flex:1;height:4px;accent-color:#5aa9ff;cursor:pointer}" +
        "#se-more-menu .slider-row .val{min-width:36px;text-align:right;color:#9aa3b2;font-size:11px}" +
        /* alignment */
        ".reveal.align-left .slides section{text-align:left}" +
        ".reveal.align-center .slides section{text-align:center}" +
        ".reveal.align-right .slides section{text-align:right}" +
        ".reveal.align-left .slides section :is(h1,h2,h3,h4){text-align:left}" +
        ".reveal.align-center .slides section :is(h1,h2,h3,h4){text-align:center}" +
        ".reveal.align-right .slides section :is(h1,h2,h3,h4){text-align:right}" +
        /* help overlay */
        "#se-help-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px)}" +
        "#se-help-overlay.open{display:flex}" +
        "#se-help-box{background:rgba(28,32,40,.95);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:24px 32px;color:#e6e9ef;font:14px/1.8 -apple-system,sans-serif;max-width:420px;width:90%}" +
        "#se-help-box h3{margin:0 0 12px;font-size:16px;color:#5aa9ff}" +
        "#se-help-box .hk{display:flex;justify-content:space-between;padding:2px 0}" +
        "#se-help-box .hk kbd{background:rgba(255,255,255,.1);border-radius:4px;padding:1px 8px;font:12px/1.6 monospace;color:#ffd9a0}";
    document.head.appendChild(style);

    // ── Build control bar ─────────────────────────────────────────────
    var bar = document.createElement("div");
    bar.id = "se-ctl";

    // ── 1. Scale button + popup ───────────────────────────────────────
    var scaleWrap = document.createElement("div");
    scaleWrap.style.position = "relative";

    var scaleBtn = document.createElement("div");
    scaleBtn.className = "se-btn";
    scaleBtn.id = "se-scale-btn";
    scaleBtn.title = "View settings (+ / −)";
    scaleBtn.innerHTML = "<span id='se-scale-ico'>🔍</span>";
    scaleBtn.onclick = function (e) {
        e.stopPropagation();
        document.getElementById("se-scale-pop").classList.toggle("open");
        closeAllPops("se-scale-pop");
    };
    scaleWrap.appendChild(scaleBtn);

    // Scale popup
    var scalePop = document.createElement("div");
    scalePop.className = "se-pop";
    scalePop.id = "se-scale-pop";
    scalePop.innerHTML =
        '<button id="se-s-minus" title="Decrease scale">−</button>' +
        '<span class="val" id="se-s-val">auto</span>' +
        '<button id="se-s-plus" title="Increase scale">+</button>' +
        '<button id="se-s-reset" title="Reset scale">⟲</button>' +
        '<span class="sep"></span>' +
        '<button id="se-align-btn" title="Alignment"><span id="se-align-ico">⬅</span></button>' +
        '<span class="sep"></span>' +
        '<button id="se-mode-btn" title="Scroll ↔ Zoom"><span id="se-mode-ico">🔍</span></button>';
    scaleWrap.appendChild(scalePop);
    bar.appendChild(scaleWrap);

    // ── 2. More button + menu ─────────────────────────────────────────
    var moreWrap = document.createElement("div");
    moreWrap.style.position = "relative";

    var moreBtn = document.createElement("div");
    moreBtn.className = "se-btn";
    moreBtn.title = "More settings";
    moreBtn.innerHTML = "<span>⋯</span>";
    moreBtn.onclick = function (e) {
        e.stopPropagation();
        document.getElementById("se-more-menu").classList.toggle("open");
        closeAllPops("se-more-menu");
        renderMoreMenu(reveal, cfg);
    };
    moreWrap.appendChild(moreBtn);

    var moreMenu = document.createElement("div");
    moreMenu.className = "se-pop";
    moreMenu.id = "se-more-menu";
    moreWrap.appendChild(moreMenu);
    bar.appendChild(moreWrap);

    // ── 3. TOC button ─────────────────────────────────────────────────
    var tocBtn = document.createElement("div");
    tocBtn.className = "se-btn";
    tocBtn.title = "Table of Contents (t)";
    tocBtn.textContent = "📑";
    tocBtn.onclick = function () { toggleTOC(reveal); };
    bar.appendChild(tocBtn);

    // ── 4. Preview button ─────────────────────────────────────────────
    var prevBtn = document.createElement("div");
    prevBtn.className = "se-btn";
    prevBtn.title = "Preview views (v)";
    prevBtn.textContent = "📐";
    prevBtn.onclick = function () { cyclePreview(); };
    bar.appendChild(prevBtn);

    document.body.appendChild(bar);

    // ── Help overlay ──────────────────────────────────────────────────
    var helpOverlay = document.createElement("div");
    helpOverlay.id = "se-help-overlay";
    var helpBox = document.createElement("div");
    helpBox.id = "se-help-box";
    helpBox.innerHTML =
        '<h3>Keyboard Shortcuts</h3>' +
        '<div class="hk"><span>Scale up / down</span><kbd>+</kbd> <kbd>−</kbd></div>' +
        '<div class="hk"><span>Reset scale</span><kbd>0</kbd></div>' +
        '<div class="hk"><span>Scroll ↔ Zoom toggle</span><kbd>s</kbd></div>' +
        '<div class="hk"><span>Table of contents</span><kbd>t</kbd></div>' +
        '<div class="hk"><span>Preview views</span><kbd>v</kbd></div>' +
        '<div class="hk"><span>Help</span><kbd>h</kbd></div>' +
        '<div class="hk"><span>Fullscreen</span><kbd>f</kbd></div>' +
        '<div class="hk"><span>Overview</span><kbd>Esc</kbd></div>' +
        '<div style="margin-top:12px;font-size:11px;color:rgba(255,255,255,.4)">Press <kbd>h</kbd> or click to close</div>';
    helpOverlay.appendChild(helpBox);
    helpOverlay.onclick = function () { helpOverlay.classList.remove("open"); };
    document.body.appendChild(helpOverlay);

    // Wire scale popup buttons (after DOM insertion)
    document.getElementById("se-s-minus").onclick = function (e) { e.stopPropagation(); adjustScale(reveal, cfg, -0.05); };
    document.getElementById("se-s-plus").onclick = function (e) { e.stopPropagation(); adjustScale(reveal, cfg, 0.05); };
    document.getElementById("se-s-reset").onclick = function (e) { e.stopPropagation(); resetScale(reveal, cfg); };
    document.getElementById("se-mode-btn").onclick = function (e) { e.stopPropagation(); toggleSlideMode(reveal, cfg); };
    document.getElementById("se-align-btn").onclick = function (e) {
        e.stopPropagation();
        var cycle = { left: "center", center: "right", right: "left" };
        rtState.align = cycle[rtState.align] || "left";
        var rev = document.querySelector(".reveal");
        if (rev) {
            rev.className = rev.className.replace(/\balign-\w+/g, "");
            rev.classList.add("align-" + rtState.align);
        }
        persistRtState();
        syncControlBar(reveal);
    };

    // Close popups when clicking outside
    document.addEventListener("click", function (e) {
        if (!e.target.closest("#se-ctl")) closeAllPops();
    });

    // Sync on slide change
    reveal.on("slidechanged", function () { syncControlBar(reveal); });

    // Keyboard shortcuts
    document.addEventListener("keydown", function (e) {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (previewState.current !== "off") return;
        if (document.getElementById("se-toc-overlay") &&
            document.getElementById("se-toc-overlay").classList.contains("open")) return;

        if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleSlideMode(reveal, cfg);
        }
        if ((e.key === "=" || e.key === "+") && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            adjustScale(reveal, cfg, 0.05);
        }
        if (e.key === "-" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            adjustScale(reveal, cfg, -0.05);
        }
        if (e.key === "0" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            resetScale(reveal, cfg);
        }
        if (e.key === "h" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            var ho = document.getElementById("se-help-overlay");
            if (ho) ho.classList.toggle("open");
        }
    });

    // Initial sync
    syncControlBar(reveal);
}

// ── More menu renderer ────────────────────────────────────────────────
function renderMoreMenu(reveal, cfg) {
    var menu = document.getElementById("se-more-menu");
    if (!menu) return;
    menu.innerHTML = "";

    // Helper: create section
    function addSection(label) {
        var sec = document.createElement("div");
        sec.className = "menu-section";
        var lbl = document.createElement("div");
        lbl.className = "menu-label";
        lbl.textContent = label;
        sec.appendChild(lbl);
        menu.appendChild(sec);
        return sec;
    }
    function addSep() {
        var sep = document.createElement("div");
        sep.className = "se-sep";
        menu.appendChild(sep);
    }
    function addToggle(section, label, active, onclick) {
        var btn = document.createElement("button");
        btn.className = "menu-item";
        var span = document.createElement("span");
        span.textContent = label;
        var check = document.createElement("span");
        check.textContent = active ? "✓" : "";
        check.style.marginLeft = "auto";
        check.style.opacity = "0.5";
        btn.appendChild(span);
        btn.appendChild(check);
        btn.onclick = function (e) { e.stopPropagation(); onclick(); renderMoreMenu(reveal, cfg); };
        section.appendChild(btn);
    }

    // ── Banner ────────────────────────────────────────────────────────
    var bannerSec = addSection("Banner");
    var bannerEl = document.getElementById("se-banner");
    var bannerVisible = bannerEl && bannerEl.classList.contains("visible");
    addToggle(bannerSec, "Show banner", bannerVisible, function () {
        if (bannerEl) bannerEl.classList.toggle("visible");
    });
    addSep();

    // ── Layout ────────────────────────────────────────────────────────
    var layoutSec = addSection("Layout");
    addToggle(layoutSec, "Block lists", rtState.listBlock, function () {
        rtState.listBlock = !rtState.listBlock;
        var revealEl = document.querySelector(".reveal");
        if (revealEl) revealEl.classList.toggle("list-block", rtState.listBlock);
        persistRtState();
    });
    addToggle(layoutSec, rtState.transition === "fade" ? "Transition: fade" : "Transition: none", true, function () {
        rtState.transition = rtState.transition === "fade" ? "none" : "fade";
        reveal.configure({ transition: rtState.transition });
        persistRtState();
    });
    addToggle(layoutSec, "Progress bar", rtState.showProgress !== false, function () {
        rtState.showProgress = !rtState.showProgress;
        reveal.configure({ progress: rtState.showProgress });
        persistRtState();
    });
    addToggle(layoutSec, "Mouse wheel nav", !!rtState.mouseWheel, function () {
        rtState.mouseWheel = !rtState.mouseWheel;
        reveal.configure({ mouseWheel: rtState.mouseWheel });
        persistRtState();
    });
    addSep();

    // ── Default Scale ─────────────────────────────────────────────────
    var dsSec = addSection("Default Scale");
    var dsRow = document.createElement("div");
    dsRow.className = "scale-row";
    var dsMinus = document.createElement("button");
    dsMinus.textContent = "−";
    dsMinus.onclick = function (e) { e.stopPropagation(); dsBump(reveal, cfg, -0.1); };
    var dsVal = document.createElement("span");
    dsVal.className = "val";
    dsVal.textContent = Math.round(rtState.defaultScale * 100) + "%";
    var dsPlus = document.createElement("button");
    dsPlus.textContent = "+";
    dsPlus.onclick = function (e) { e.stopPropagation(); dsBump(reveal, cfg, 0.1); };
    var dsReset = document.createElement("button");
    dsReset.textContent = "⟲";
    dsReset.onclick = function (e) {
        e.stopPropagation();
        rtState.defaultScale = 1.0;
        persistRtState();
        applySmartScrollZoom(reveal, cfg);
        renderMoreMenu(reveal, cfg);
    };
    dsRow.appendChild(dsMinus);
    dsRow.appendChild(dsVal);
    dsRow.appendChild(dsPlus);
    dsRow.appendChild(dsReset);
    dsSec.appendChild(dsRow);
    addSep();

    // ── Slide Theme ───────────────────────────────────────────────────
    var themeSec = addSection("Slide Theme");
    var currentTheme = rtState.slideTheme || "black";
    SLIDE_THEMES.forEach(function (t) {
        var btn = document.createElement("button");
        btn.className = "menu-item" + (t.id === currentTheme ? " active" : "");
        btn.textContent = t.label;
        btn.onclick = function (e) {
            e.stopPropagation();
            applySlideTheme(reveal, t.id);
            renderMoreMenu(reveal, cfg);
        };
        themeSec.appendChild(btn);
    });
    addSep();

    // ── Type Scale ────────────────────────────────────────────────────
    var tsSec = addSection("Type Scale");
    var curScaleMode = rtState.scaleMode || "classic";
    // Scale mode selector
    SCALE_MODES.forEach(function (m) {
        var btn = document.createElement("button");
        btn.className = "menu-item" + (m.id === curScaleMode ? " active" : "");
        btn.textContent = m.label;
        btn.onclick = function (e) {
            e.stopPropagation();
            rtState.scaleMode = m.id;
            applyTypeScaleFromMode(reveal, cfg);
            renderMoreMenu(reveal, cfg);
        };
        tsSec.appendChild(btn);
    });

    // Mode-specific controls
    if (curScaleMode === "classic") {
        var currentRatio = rtState.typeScaleRatio || (cfg.typeScaleRatio || 1.333);
        TYPE_SCALES.forEach(function (s) {
            var btn = document.createElement("button");
            btn.className = "menu-item" + (Math.abs(currentRatio - s.ratio) < 0.01 ? " active" : "");
            btn.textContent = "  " + s.label;
            btn.style.paddingLeft = "16px";
            btn.onclick = function (e) {
                e.stopPropagation();
                rtState.typeScaleRatio = s.ratio;
                applyTypeScaleFromMode(reveal, cfg);
                renderMoreMenu(reveal, cfg);
            };
            tsSec.appendChild(btn);
        });
        // Fine-tuning slider
        var sliderRow = document.createElement("div");
        sliderRow.className = "slider-row";
        var slider = document.createElement("input");
        slider.type = "range";
        slider.min = "1.0";
        slider.max = "1.8";
        slider.step = "0.01";
        slider.value = currentRatio;
        var sliderVal = document.createElement("span");
        sliderVal.className = "val";
        sliderVal.textContent = currentRatio.toFixed(3);
        slider.addEventListener("input", function (e) {
            e.stopPropagation();
            var v = parseFloat(e.target.value);
            sliderVal.textContent = v.toFixed(3);
            rtState.typeScaleRatio = v;
            applyTypeScaleFromMode(reveal, cfg);
        });
        sliderRow.appendChild(slider);
        sliderRow.appendChild(sliderVal);
        tsSec.appendChild(sliderRow);
    } else if (curScaleMode === "dual-ratio") {
        // Two sliders: tight and open ratio
        function mkDualSlider(label, getter, setter) {
            var lbl = document.createElement("div");
            lbl.className = "menu-label";
            lbl.style.paddingTop = "4px";
            lbl.textContent = label;
            tsSec.appendChild(lbl);
            var row = document.createElement("div");
            row.className = "slider-row";
            var inp = document.createElement("input");
            inp.type = "range"; inp.min = "1.0"; inp.max = "1.8"; inp.step = "0.01"; inp.value = getter();
            var val = document.createElement("span");
            val.className = "val";
            val.textContent = getter().toFixed(3);
            inp.addEventListener("input", function (e) {
                e.stopPropagation();
                setter(parseFloat(e.target.value));
                val.textContent = getter().toFixed(3);
                applyTypeScaleFromMode(reveal, cfg);
            });
            row.appendChild(inp); row.appendChild(val); tsSec.appendChild(row);
        }
        mkDualSlider("Tight ratio (small)", function () { return rtState.dualRatioMin; }, function (v) { rtState.dualRatioMin = v; });
        mkDualSlider("Open ratio (large)", function () { return rtState.dualRatioMax; }, function (v) { rtState.dualRatioMax = v; });
    } else if (curScaleMode === "material") {
        var info = document.createElement("div");
        info.style.cssText = "padding:4px 8px;font-size:11px;color:#9aa3b2;line-height:1.6";
        info.innerHTML = "h1: " + MD3_SIZES.h1 + "em · h2: " + MD3_SIZES.h2 + "em<br>h3: " + MD3_SIZES.h3 + "em · h4: " + MD3_SIZES.h4 + 'em<br><span style="opacity:.5">Hand-tuned, non-adjustable</span>';
        tsSec.appendChild(info);
    }
    addSep();

    // ── Font ──────────────────────────────────────────────────────────
    var fontSec = addSection("Font");
    var currentFont = rtState.fontId || (cfg.fontFamily || "system");
    FONTS.forEach(function (f) {
        var btn = document.createElement("button");
        btn.className = "menu-item" + (f.id === currentFont ? " active" : "");
        btn.textContent = f.label;
        btn.style.fontFamily = f.value;
        btn.onclick = function (e) {
            e.stopPropagation();
            applyFontRuntime(f.id, f.value, reveal, cfg);
            renderMoreMenu(reveal, cfg);
        };
        fontSec.appendChild(btn);
    });
}

// ── More-menu action helpers ──────────────────────────────────────────
function dsBump(reveal, cfg, delta) {
    rtState.defaultScale = Math.round((rtState.defaultScale + delta) * 100) / 100;
    rtState.defaultScale = Math.max(0.5, Math.min(2, rtState.defaultScale));
    persistRtState();
    applySmartScrollZoom(reveal, cfg);
    renderMoreMenu(reveal, cfg);
}

function applySlideTheme(reveal, themeId) {
    rtState.slideTheme = themeId;
    var themeLink = document.getElementById("theme");
    if (themeLink) {
        // Replace the theme filename in the existing href
        var href = themeLink.getAttribute("href");
        var newHref = href.replace(/[^/]+\.css$/, themeId + ".css");
        themeLink.setAttribute("href", newHref);
    }
    persistRtState();
    // Update mermaid theme for dark themes
    if (typeof mermaid !== "undefined" && mermaid.initialize) {
        mermaid.initialize({
            startOnLoad: false,
            theme: ["black", "moon"].includes(themeId) ? "dark" : "default"
        });
    }
}

function applyTypeScaleFromMode(reveal, cfg) {
    var slidesEl = document.querySelector(".reveal .slides");
    if (!slidesEl) return;
    var h1, h2, h3, h4;
    var mode = rtState.scaleMode || "classic";

    if (mode === "classic") {
        var r = rtState.typeScaleRatio || 1.333;
        h1 = r * r * r; h2 = r * r; h3 = r; h4 = Math.pow(r, 0.5);
    } else if (mode === "dual-ratio") {
        var blend = 0.5;
        var rMin = rtState.dualRatioMin || 1.2;
        var rMax = rtState.dualRatioMax || 1.414;
        function lerp(a, b, t) { return a + (b - a) * t; }
        h1 = lerp(rMin * rMin * rMin, rMax * rMax * rMax, blend);
        h2 = lerp(rMin * rMin, rMax * rMax, blend);
        h3 = lerp(rMin, rMax, blend);
        h4 = lerp(Math.pow(rMin, 0.5), Math.pow(rMax, 0.5), blend);
    } else if (mode === "material") {
        h1 = MD3_SIZES.h1; h2 = MD3_SIZES.h2; h3 = MD3_SIZES.h3; h4 = MD3_SIZES.h4;
    }

    slidesEl.style.setProperty("--h1-size", h1.toFixed(3) + "em");
    slidesEl.style.setProperty("--h2-size", h2.toFixed(3) + "em");
    slidesEl.style.setProperty("--h3-size", h3.toFixed(3) + "em");
    slidesEl.style.setProperty("--h4-size", h4.toFixed(3) + "em");
    persistRtState();
    // Re-run scroll/zoom since heading sizes affect content height
    applySmartScrollZoom(reveal, cfg);
}

// Keep the simple ratio-only version for backward compat
function applyTypeScaleRatio(ratio) {
    rtState.typeScaleRatio = ratio;
    rtState.scaleMode = "classic";
    var slidesEl = document.querySelector(".reveal .slides");
    if (slidesEl) {
        slidesEl.style.setProperty("--h1-size", Math.pow(ratio, 3).toFixed(2) + "em");
        slidesEl.style.setProperty("--h2-size", Math.pow(ratio, 2).toFixed(2) + "em");
        slidesEl.style.setProperty("--h3-size", ratio.toFixed(2) + "em");
        slidesEl.style.setProperty("--h4-size", Math.pow(ratio, 0.5).toFixed(2) + "em");
    }
    persistRtState();
}

function applyFontRuntime(fontId, fontValue, reveal, cfg) {
    rtState.fontId = fontId;
    var slidesEl = document.querySelector(".reveal .slides");
    if (slidesEl) {
        slidesEl.style.setProperty("--font-family", fontValue);
    }
    persistRtState();
    // Re-run scroll/zoom since font change affects content height
    applySmartScrollZoom(reveal, cfg);
}

// Per-slide manual overrides
var slideOverrides = {}; // key → { mode: 'scroll'|'zoom'|null, scale: number|null }

function slideKey(reveal) {
    var idx = reveal.getIndices();
    return idx.h + "." + (idx.v || 0);
}

function getOverride(reveal) {
    return slideOverrides[slideKey(reveal)] || {};
}

function toggleSlideMode(reveal, cfg) {
    var key = slideKey(reveal);
    var cur = slideOverrides[key] || {};
    var slide = reveal.getCurrentSlide();
    var isScrolling = slide.classList.contains("se-scroll");

    if (isScrolling) {
        // Switch to zoom
        cur.mode = "zoom";
        slide.classList.remove("se-scroll");
        // Apply zoom to fit
        var canvasH = reveal.getConfig().height || 700;
        var naturalH = measureNatural(slide, canvasH);
        var fit = canvasH / naturalH;
        slide.style.zoom = fit;
        slide.querySelector(":scope > div").style.setProperty("justify-content", "center", "important");
    } else {
        // Switch to scroll
        cur.mode = "scroll";
        slide.classList.add("se-scroll");
        slide.style.zoom = "";
        slide.querySelector(":scope > div").style.setProperty("justify-content", "flex-start", "important");
    }
    slideOverrides[key] = cur;
    syncControlBar(reveal);
}

function adjustScale(reveal, cfg, delta) {
    var slide = reveal.getCurrentSlide();
    var curZoom = parseFloat(slide.style.zoom) || 1.0;
    var newZoom = Math.max(0.3, Math.min(2.0, curZoom + delta));
    slide.style.zoom = newZoom;

    var key = slideKey(reveal);
    slideOverrides[key] = slideOverrides[key] || {};
    slideOverrides[key].scale = newZoom;
    syncControlBar(reveal);
}

function resetScale(reveal, cfg) {
    var key = slideKey(reveal);
    delete slideOverrides[key];
    // Re-run auto decision for this slide
    applySmartScrollZoom(reveal, cfg);
    syncControlBar(reveal);
}

function syncControlBar(reveal) {
    var slide = reveal.getCurrentSlide();
    if (!slide) return;
    var isScrolling = slide.classList.contains("se-scroll");

    // Scale popup: mode icon + value
    var modeIco = document.getElementById("se-mode-ico");
    var modeBtn = document.getElementById("se-mode-btn");
    var sVal = document.getElementById("se-s-val");
    var scaleIco = document.getElementById("se-scale-ico");
    var alignIco = document.getElementById("se-align-ico");
    if (modeIco) modeIco.textContent = isScrolling ? "↕️" : "🔍";
    if (modeBtn) modeBtn.title = isScrolling ? "Mode: Scroll (s)" : "Mode: Zoom (s)";
    if (scaleIco) scaleIco.textContent = isScrolling ? "↕️" : "🔍";
    var z = parseFloat(slide.style.zoom);
    if (sVal) sVal.textContent = z ? Math.round(z * 100) + "%" : "auto";
    if (alignIco) {
        var icons = { left: "⬅", center: "⬛", right: "➡" };
        alignIco.textContent = icons[rtState.align] || "⬅";
    }
}

})();
