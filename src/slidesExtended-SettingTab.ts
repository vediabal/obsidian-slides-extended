import {
    type App,
    PluginSettingTab,
    Setting,
    type TAbstractFile,
    TFolder,
} from "obsidian";
import { FolderInputSuggest } from "obsidian-utilities";
import type { SlidesExtendedSettings } from "./@types";
import {
    getThemeFiles,
    ThemeInputSuggest,
} from "./obsidian/suggesters/ThemeSuggester";
import type { SlidesExtendedPlugin } from "./slidesExtended-Plugin";

/** This is because TypeScript's filters are dumb. */
function isFolder(file: TAbstractFile): file is TFolder {
    return file instanceof TFolder;
}
export class SlidesExtendedSettingTab extends PluginSettingTab {
    plugin: SlidesExtendedPlugin;
    newSettings!: SlidesExtendedSettings;

    constructor(app: App, plugin: SlidesExtendedPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async save() {
        await this.plugin.update(this.newSettings);
    }

    /** Save on exit */
    hide(): void {
        void this.save();
    }

    /** Show/validate setting changes */
    display(): void {
        this.newSettings = JSON.parse(
            JSON.stringify(this.plugin.settings),
        ) as SlidesExtendedSettings;
        this.drawElements();
    }

    drawElements(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("Slide preview mode")
            .setDesc("Select the slide preview pane display mode.")
            .addDropdown((cb) => {
                cb.addOption("tab", "As tab")
                    .addOption("split", "Split workspace")
                    .addOption("sidebar", "Right sidebar")
                    .setValue(this.newSettings.paneMode)
                    .onChange((value) => {
                        if (
                            value === "tab" ||
                            value === "split" ||
                            value === "sidebar"
                        ) {
                            this.newSettings.paneMode = value;
                        } else {
                            console.debug("Invalid pane mode", value);
                        }
                    });
            });

        new Setting(containerEl)
            .setName("Automatically start the preview server")
            .addToggle((value) =>
                value.setValue(this.newSettings.autoStart).onChange((value) => {
                    this.newSettings.autoStart = value;
                }),
            );

        new Setting(containerEl)
            .setName("Server port")
            .setDesc(
                "Specify the port number for the server to listen on. Default is 3000.",
            )
            .addText((text) =>
                text
                    .setPlaceholder("3000")
                    .setValue(this.newSettings.port)
                    .onChange((value) => {
                        this.newSettings.port = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Server host")
            .setDesc(
                "Specify the host for the server to listen on. Default is localhost. Use 0.0.0.0 to allow external connections.",
            )
            .addText((text) =>
                text
                    .setPlaceholder("localhost")
                    .setValue(this.newSettings.host)
                    .onChange((value) => {
                        this.newSettings.host = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Auto reload")
            .setDesc(
                "When enabled, the slide preview window automatically updates upon detecting changes in the source file.",
            )
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.autoReload)
                    .onChange((value) => {
                        this.newSettings.autoReload = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Auto complete")
            .setDesc(
                'Enable auto-complete inputs. "Always" enables it everywhere, "When slide preview is active" enables it only when the slide preview is active, and "Never" disables it.',
            )
            .addDropdown((cb) => {
                cb.addOption("always", "Always")
                    .addOption("inPreview", "When slide preview is active")
                    .addOption("never", "Never")
                    .setValue(this.newSettings.autoComplete)
                    .onChange((value) => {
                        this.newSettings.autoComplete = value;
                    });
            });

        new Setting(containerEl)
            .setName("Export directory")
            .setDesc(
                "Specify the directory where Slides Extended should export presentations.",
            )
            .addSearch((cb) => {
                const folders: TFolder[] = this.app.vault
                    .getAllLoadedFiles()
                    .filter<TFolder>(isFolder);
                const modal = new FolderInputSuggest(this.app, cb, folders);
                modal.onSelect(({ item }) => {
                    cb.setValue(item.path);
                    cb.inputEl.trigger("input");
                    modal.close();
                });
                cb.setPlaceholder("Folder")
                    .setValue(this.newSettings.exportDirectory)
                    .onChange((value) => {
                        this.newSettings.exportDirectory = value;
                    });
            });

        const themeSettings: Record<string, Setting> = {};
        const themeDesc = (type: string, assets: string) => {
            const desc =
                type === "slide" ? "*" : "*.highlight.css or *.hljs.css";
            if (assets) {
                return `Select the default ${desc} theme. Options include ${type}.css files defined in ${assets}.`;
            }
            return `Select the default ${desc} theme.`;
        };

        new Setting(containerEl)
            .setName("Assets directory")
            .setDesc(
                "Specify a vault directory for custom themes, CSS, scripts, and HTML templates. CSS files are searched in css/ and the directory root. Scripts are searched in js/. HTML templates in html/.",
            )
            .addSearch((cb) => {
                const folders: TFolder[] = this.app.vault
                    .getAllLoadedFiles()
                    .filter<TFolder>(isFolder);
                const modal = new FolderInputSuggest(this.app, cb, folders);
                modal.onSelect(({ item }) => {
                    cb.setValue(item.path);
                    cb.inputEl.trigger("input");
                    modal.close();
                });
                cb.setPlaceholder("Folder")
                    .setValue(this.newSettings.assetsDirectory)
                    .onChange((value) => {
                        this.newSettings.assetsDirectory = value;
                        for (const key in themeSettings) {
                            themeSettings[key].setDesc(themeDesc(key, value));
                        }
                    });
            });

        new Setting(containerEl)
            .setName("Custom scripts")
            .setHeading()
            .setDesc(
                "Load additional scripts into all presentations. Override per-note using property names.",
            );

        new Setting(containerEl)
            .setName("Scripts")
            .setDesc(
                "Comma-separated local script paths (resolved from vault or theme directory).",
            )
            .addText((text) =>
                text
                    .setPlaceholder("my-plugin.js, utils.js")
                    .setValue(this.newSettings.scripts)
                    .onChange((value) => {
                        this.newSettings.scripts = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Remote scripts")
            .setDesc("Comma-separated external script URLs.")
            .addText((text) =>
                text
                    .setPlaceholder("https://cdn.example.com/lib.js")
                    .setValue(this.newSettings.remoteScripts)
                    .onChange((value) => {
                        this.newSettings.remoteScripts = value;
                    }),
            );

        new Setting(containerEl).setName("Slides").setHeading();

        themeSettings.slide = new Setting(containerEl)
            .setName("Default slide theme")
            .setDesc(themeDesc("slide", this.newSettings.assetsDirectory))
            .addSearch((cb) => {
                const modal = new ThemeInputSuggest(
                    this.app,
                    cb,
                    getThemeFiles(this.plugin.obsidianUtils, "theme"),
                ).onSelect(({ item }) => {
                    cb.setValue(item);
                    cb.inputEl.trigger("input");
                    modal.close();
                });
                cb.setPlaceholder("black")
                    .setValue(this.newSettings.theme)
                    .onChange((value) => {
                        this.newSettings.theme = value;
                    });
            });

        themeSettings.highlight = new Setting(containerEl)
            .setName("Default highlight theme")
            .setDesc(themeDesc("highlight", this.newSettings.assetsDirectory))
            .addSearch((cb) => {
                const modal = new ThemeInputSuggest(
                    this.app,
                    cb,
                    getThemeFiles(this.plugin.obsidianUtils, "highlight"),
                ).onSelect(({ item }) => {
                    cb.setValue(item);
                    cb.inputEl.trigger("input");
                    modal.close();
                });
                cb.setPlaceholder("zenburn")
                    .setValue(this.newSettings.highlightTheme)
                    .onChange((value) => {
                        this.newSettings.highlightTheme = value;
                    });
            });

        new Setting(containerEl)
            .setName("Center content")
            .setDesc(
                "When enabled, content is centered on the slide by default.",
            )
            .addToggle((value) =>
                value.setValue(this.newSettings.center).onChange((value) => {
                    this.newSettings.center = value;
                }),
            );

        new Setting(containerEl)
            .setName("Transition style")
            .setDesc("Select a default slide transition")
            .addDropdown((cb) => {
                cb.addOption("none", "none")
                    .addOption("fade", "fade")
                    .addOption("slide", "slide")
                    .addOption("convex", "convex")
                    .addOption("concave", "concave")
                    .addOption("zoom", "zoom")
                    .setValue(this.newSettings.transition)
                    .onChange((value) => {
                        this.newSettings.transition = value;
                    });
            });

        new Setting(containerEl)
            .setName("Transition speed")
            .setDesc("Select a default transition speed")
            .addDropdown((cb) => {
                cb.addOption("slow", "slow")
                    .addOption("normal", "default")
                    .addOption("fast", "fast")
                    .setValue(this.newSettings.transitionSpeed)
                    .onChange((value) => {
                        this.newSettings.transitionSpeed = value;
                    });
            });

        new Setting(containerEl)
            .setName("Default horizontal slide separator")
            .setDesc(
                "Regex pattern used to split horizontal slides. Default: \\r?\\n---\\r?\\n. Override per-note with the 'separator' property.",
            )
            .addText((text) =>
                text
                    .setPlaceholder("\\r?\\n---\\r?\\n")
                    .setValue(this.newSettings.separator)
                    .onChange((value) => {
                        this.newSettings.separator = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Default vertical slide separator")
            .setDesc(
                "Regex pattern used to split vertical slides. Default: \\r?\\n--\\r?\\n. Override per-note with the 'verticalSeparator' property.",
            )
            .addText((text) =>
                text
                    .setPlaceholder("\\r?\\n--\\r?\\n")
                    .setValue(this.newSettings.verticalSeparator)
                    .onChange((value) => {
                        this.newSettings.verticalSeparator = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Presentation plugins")
            .setHeading()
            .setDesc(
                "Control presentation plugins. Override per-note using property names (e.g., enableCustomControls).",
            );

        new Setting(containerEl)
            .setName("Controls")
            .setDesc("Display presentation control arrows.")
            .addButton((btn) => {
                btn.setButtonText("enableCustomControls").setDisabled(true);
            })
            .addToggle((value) =>
                value.setValue(this.newSettings.controls).onChange((value) => {
                    this.newSettings.controls = value;
                }),
            );

        new Setting(containerEl)
            .setName("Chalkboard")
            .setDesc("Display a chalkboard and related controls.")
            .addButton((btn) => {
                btn.setButtonText("enableChalkboard").setDisabled(true);
            })
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.enableChalkboard)
                    .onChange((value) => {
                        this.newSettings.enableChalkboard = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Elapsed time bar")
            .setDesc(
                "Display an elapsed time bar; set 'timeForPresentation' property in seconds (500), minutes (55m), or hours (1h).",
            )
            .addButton((btn) => {
                btn.setButtonText("enableTimeBar").setDisabled(true);
            })
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.enableTimeBar)
                    .onChange((value) => {
                        this.newSettings.enableTimeBar = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Laser pointer")
            .setDesc("Change your mouse into a laser pointer (toggle with Q).")
            .addButton((btn) => {
                btn.setButtonText("enablePointer").setDisabled(true);
            })
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.enablePointer)
                    .onChange((value) => {
                        this.newSettings.enablePointer = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Menu")
            .setDesc("Display a presentation menu button.")
            .addButton((btn) => {
                btn.setButtonText("enableMenu").setDisabled(true);
            })
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.enableMenu)
                    .onChange((value) => {
                        this.newSettings.enableMenu = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Overview")
            .setDesc("When enabled, display a presentation overview button.")
            .addButton((btn) => {
                btn.setButtonText("enableOverview").setDisabled(true);
            })
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.enableOverview)
                    .onChange((value) => {
                        this.newSettings.enableOverview = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Progress bar (progress)")
            .setDesc("When enabled, display a presentation progress bar.")
            .addButton((btn) => {
                btn.setButtonText("progress").setDisabled(true);
            })
            .addToggle((value) =>
                value.setValue(this.newSettings.progress).onChange((value) => {
                    this.newSettings.progress = value;
                }),
            );

        new Setting(containerEl)
            .setName("Slide numbers")
            .setDesc("Display the page number of the current slide.")
            .addButton((btn) => {
                btn.setButtonText("slideNumber").setDisabled(true);
            })
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.slideNumber)
                    .onChange((value) => {
                        this.newSettings.slideNumber = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Math engine")
            .setDesc("Select the math rendering engine.")
            .addDropdown((cb) => {
                cb.addOption("katex", "KaTeX")
                    .addOption("mathjax", "MathJax")
                    .setValue(this.newSettings.mathEngine)
                    .onChange((value) => {
                        this.newSettings.mathEngine = value as
                            | "katex"
                            | "mathjax";
                    });
            });

        // ── Smart Enhancements ────────────────────────────────────────

        new Setting(containerEl)
            .setName("Smart enhancements")
            .setHeading()
            .setDesc(
                "Enhanced rendering features: type scale, smart scroll/zoom, callouts, TOC, breadcrumbs, and more.",
            );

        new Setting(containerEl)
            .setName("Enable smart enhancements")
            .setDesc(
                "Enable post-processing enhancements: callouts, code labels, breadcrumbs, TOC (t key), and smart scroll/zoom.",
            )
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.enableSmartEnhancements)
                    .onChange((value) => {
                        this.newSettings.enableSmartEnhancements = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Smart scroll/zoom")
            .setDesc(
                "Automatically decide per-slide whether to scale down or enable scrolling. Code blocks and diagrams trigger scrolling sooner.",
            )
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.smartScroll)
                    .onChange((value) => {
                        this.newSettings.smartScroll = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Block lists")
            .setDesc(
                "Force lists to display full-width (no side-by-side flow).",
            )
            .addToggle((value) =>
                value.setValue(this.newSettings.listBlock).onChange((value) => {
                    this.newSettings.listBlock = value;
                }),
            );

        new Setting(containerEl)
            .setName("Default scale")
            .setDesc(
                "Global scale multiplier for all slides (0.5–2.0). Default: 1.0.",
            )
            .addSlider((slider) =>
                slider
                    .setLimits(0.5, 2.0, 0.05)
                    .setValue(this.newSettings.defaultScale)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.newSettings.defaultScale = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Type scale strategy")
            .setDesc(
                "How heading sizes (h1–h4) are calculated relative to body text.",
            )
            .addDropdown((cb) => {
                cb.addOption("classic", "Classic Modular Scale")
                    .addOption("dual", "Dual-Ratio (Utopia)")
                    .addOption("material", "Material Design 3")
                    .setValue(this.newSettings.typeScaleStrategy)
                    .onChange((value) => {
                        if (
                            value === "classic" ||
                            value === "dual" ||
                            value === "material"
                        ) {
                            this.newSettings.typeScaleStrategy = value;
                        }
                    });
            });

        new Setting(containerEl)
            .setName("Type scale ratio")
            .setDesc(
                "Classic mode: single ratio (1.0–1.8). Presets: Major Third 1.25, Perfect Fourth 1.333, Perfect Fifth 1.5.",
            )
            .addSlider((slider) =>
                slider
                    .setLimits(1.0, 1.8, 0.01)
                    .setValue(this.newSettings.typeScaleRatio)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.newSettings.typeScaleRatio = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Dual-ratio: tight")
            .setDesc("Tight ratio for dual-ratio mode (default: 1.2).")
            .addSlider((slider) =>
                slider
                    .setLimits(1.0, 1.5, 0.01)
                    .setValue(this.newSettings.typeScaleTightRatio)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.newSettings.typeScaleTightRatio = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Dual-ratio: open")
            .setDesc("Open ratio for dual-ratio mode (default: 1.414).")
            .addSlider((slider) =>
                slider
                    .setLimits(1.0, 2.0, 0.01)
                    .setValue(this.newSettings.typeScaleOpenRatio)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.newSettings.typeScaleOpenRatio = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Font family")
            .setDesc("Default font family for slide content.")
            .addDropdown((cb) => {
                cb.addOption("system", "System")
                    .addOption("serif", "Serif")
                    .addOption("mono", "Monospace")
                    .addOption("inter", "Inter")
                    .setValue(this.newSettings.fontFamily)
                    .onChange((value) => {
                        this.newSettings.fontFamily = value;
                    });
            });

        // ── Banner settings ───────────────────────────────────────────

        new Setting(containerEl).setName("Banner").setHeading();

        new Setting(containerEl)
            .setName("Show banner")
            .setDesc(
                "Display a configurable banner bar at the top of all slides.",
            )
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.bannerEnabled)
                    .onChange((value) => {
                        this.newSettings.bannerEnabled = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Banner text")
            .setDesc("Text content displayed in the banner.")
            .addText((text) =>
                text
                    .setPlaceholder("Enter banner text…")
                    .setValue(this.newSettings.bannerText)
                    .onChange((value) => {
                        this.newSettings.bannerText = value;
                    }),
            );

        new Setting(containerEl).setName("Banner font").addDropdown((cb) => {
            cb.addOption(
                '-apple-system, "Segoe UI", system-ui, sans-serif',
                "System",
            )
                .addOption('Georgia, "Noto Serif SC", serif', "Serif")
                .addOption('"SF Mono", Menlo, monospace', "Mono")
                .addOption("Inter, -apple-system, sans-serif", "Inter")
                .setValue(this.newSettings.bannerFontFamily)
                .onChange((value) => {
                    this.newSettings.bannerFontFamily = value;
                });
        });

        new Setting(containerEl)
            .setName("Banner font size")
            .setDesc("Font size in pixels (10–32).")
            .addSlider((slider) =>
                slider
                    .setLimits(10, 32, 1)
                    .setValue(this.newSettings.bannerFontSize)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.newSettings.bannerFontSize = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Banner text alignment")
            .addDropdown((cb) => {
                cb.addOption("left", "Left")
                    .addOption("center", "Center")
                    .addOption("right", "Right")
                    .setValue(this.newSettings.bannerAlign)
                    .onChange((value) => {
                        if (
                            value === "left" ||
                            value === "center" ||
                            value === "right"
                        ) {
                            this.newSettings.bannerAlign = value;
                        }
                    });
            });

        new Setting(containerEl)
            .setName("Banner background color")
            .addColorPicker((color) =>
                color
                    .setValue(this.newSettings.bannerBgColor)
                    .onChange((value) => {
                        this.newSettings.bannerBgColor = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Banner text color")
            .addColorPicker((color) =>
                color
                    .setValue(this.newSettings.bannerTextColor)
                    .onChange((value) => {
                        this.newSettings.bannerTextColor = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Show date/time")
            .setDesc(
                "Display current date/time on the right side of the banner.",
            )
            .addToggle((value) =>
                value
                    .setValue(this.newSettings.bannerShowDatetime)
                    .onChange((value) => {
                        this.newSettings.bannerShowDatetime = value;
                    }),
            );

        new Setting(containerEl)
            .setName("Date/time format")
            .setDesc("Format string: YYYY, MM, DD, HH, mm.")
            .addText((text) =>
                text
                    .setPlaceholder("YYYY-MM-DD HH:mm")
                    .setValue(this.newSettings.bannerDatetimeFormat)
                    .onChange((value) => {
                        this.newSettings.bannerDatetimeFormat = value;
                    }),
            );
    }
}
