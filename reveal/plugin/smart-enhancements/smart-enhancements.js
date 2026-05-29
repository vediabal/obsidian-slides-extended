/**
 * slides-extended-smart.js — Post-processing reveal.js plugin
 *
 * Ported from openmd worktree-exp+slides experiment.
 * Handles: language labels, callouts, breadcrumbs, TOC, smart scroll/zoom, banner.
 *
 * Registered as a reveal.js plugin via Reveal.initialize({ plugins: [...] }).
 * Runs after reveal.js finishes its own rendering.
 */

const SmartEnhancements = {
    id: "smart-enhancements",

    init: function (reveal) {
        // Read configuration from the global __SE_SMART_CONFIG__ object
        // (injected by the template or settings).
        const cfg = window.__SE_SMART_CONFIG__ || {};

        reveal.on("ready", function () {
            applyTypeScale(cfg);
            applyFont(cfg);
            processLanguageLabels();
            processCallouts();
            processBreadcrumbs(reveal);
            initTOC(reveal);
            initPreview(reveal);
            if (cfg.smartScroll !== false) {
                applySmartScrollZoom(reveal, cfg);
            }
            if (cfg.banner && cfg.banner.enabled) {
                renderBanner(cfg.banner);
            }
            if (cfg.listBlock) {
                reveal.getRevealElement().classList.add("list-block");
            }
        });

        // Re-apply smart scroll/zoom on window resize
        let resizeTimer;
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                if (cfg.smartScroll !== false) {
                    applySmartScrollZoom(reveal, cfg);
                }
            }, 200);
        });
    },
};

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

    var slides = reveal.getSlides();
    slides.forEach(function (slide) {
        // Find the content wrapper (reveal.js uses section directly)
        var sc = slide;

        var naturalH = measureNatural(slide, sc);
        var ratio = naturalH / canvasHeight;
        var hasTall = !!(
            sc.querySelector("pre") ||
            sc.querySelector(".mermaid") ||
            sc.querySelector("svg") ||
            sc.querySelector(".katex-display")
        );
        var minScale = hasTall ? MIN_SCALE_TALL : MIN_SCALE_PLAIN;
        var fit = 1 / ratio;

        // Clean up previous state
        slide.classList.remove("se-scroll");
        sc.style.zoom = "";
        sc.style.overflowY = "";

        if (ratio <= 1.0) {
            // Content fits
            if (defaultScale !== 1.0) {
                sc.style.zoom = defaultScale;
            }
        } else if (fit >= minScale) {
            // Slight overflow — scale down
            sc.style.zoom = fit * defaultScale;
        } else {
            // Too much content — enable scrolling
            slide.classList.add("se-scroll");
            sc.style.overflowY = "auto";
            if (defaultScale !== 1.0) {
                sc.style.zoom = defaultScale;
            }
        }
    });
}

function measureNatural(section, sc) {
    var prevZoom = sc.style.zoom;
    sc.style.zoom = "";

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

    var h = sc.scrollHeight;

    if (hidden) {
        section.style.visibility = prevVis;
        section.style.position = prevPos;
        section.style.display = prevDisp;
    }
    sc.style.zoom = prevZoom;
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
