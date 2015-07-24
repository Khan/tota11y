/**
 * A plugin to label different levels of contrast on the page, and highlight
 * those with poor contrast for color blind users.
 */

let $ = require("jquery");
let Plugin = require("../base");
let annotate = require("../shared/annotate")("labels");
let blinder = require("color-blind/lib/blind").Blind;

let titleTemplate = require("./error-title.handlebars");
let descriptionTemplate = require("./error-description.handlebars");

require("./style.less");

class ColorBlindContrastPlugin extends Plugin {
    getTitle() {
        return "Color Blind Contrast";
    }

    getDescription() {
        return "Labels elements with insufficient contrast for color blind users";
    }

    addError({fgColor, bgColor, blindness, contrastRatio, requiredRatio}, el) {

        let templateData = {
            fgColorHex: axs.utils.colorToString(fgColor),
            bgColorHex: axs.utils.colorToString(bgColor),
            contrastRatio: contrastRatio,
            requiredRatio: requiredRatio,
            blindness: blindness
        };

        return this.error(
            titleTemplate(templateData),
            descriptionTemplate(templateData),
            $(el));
    }

    blind(color, blindness) {
        let alpha = color.alpha;
        color = blinder({
            R: color.red,
            G: color.green,
            B: color.blue
        }, blindness, false);
        return {
            red: color.R | 0,
            green: color.G | 0,
            blue: color.B | 0,
            alpha: alpha
        };
    }

    runOneType(el, combinations, fgColor, bgColor, style, blindness, blindnessName) {
        // Calculate required ratio based on size
        // Using strings to prevent rounding
        let requiredRatio = axs.utils.isLargeFont(style) ?
            "3.0" : "4.5";

        // Build a key for our `combinations` map and report the color
        // if we have not seen it yet
        let key = axs.utils.colorToString(fgColor) + "/" +
                    axs.utils.colorToString(bgColor) + "/" +
                    blindness + "/" +
                    requiredRatio;

        fgColor = this.blind(fgColor, blindness);
        bgColor = this.blind(bgColor, blindness);
        let contrastRatio = axs.utils.calculateContrastRatio(
            fgColor, bgColor).toFixed(2);

        if (!axs.utils.isLowContrast(contrastRatio, style)) {
            // For acceptable contrast values, we don't show ratios if
            // they have been presented already
            if (!combinations[key]) {
                annotate
                    .label($(el), contrastRatio)
                    .addClass("tota11y-label-success");

                // Add the key to the combinations map. We don't have an
                // error to associate it with, so we'll just give it the
                // value of `true`.
                combinations[key] = true;
            }
        } else {
            if (!combinations[key]) {
                // We do not show duplicates in the errors panel, however,
                // to keep the output from being overwhelming
                let error = this.addError(
                    {fgColor, bgColor, blindness: blindnessName, contrastRatio, requiredRatio},
                    el);

                combinations[key] = error;
            }

            // We display errors multiple times for emphasis. Each error
            // will point back to the entry in the info panel for that
            // particular color combination.
            //
            // TODO: The error entry in the info panel will only highlight
            // the first element with that color combination
            annotate.errorLabel(
                $(el),
                contrastRatio,
                "This contrast is insufficient at this size.",
                combinations[key]);
        }
    }

    run() {
        // Temporary parseColor proxy for FF, which offers "transparent" as a
        // default computed backgroundColor instead of `rgba(0, 0, 0, 0)`.
        //
        // https://github.com/GoogleChrome/accessibility-developer-tools/issues/180
        const _parseColor = axs.utils.parseColor;
        axs.utils.parseColor = function(colorString) {
            if (colorString === "transparent") {
                return new axs.utils.Color(0, 0, 0, 0);
            } else {
                return _parseColor(colorString);
            }
        };

        // A map of fg/bg color pairs that we have already seen to the error
        // entry currently present in the info panel
        let combinations = {};

        // [<internal name>, <name used on UI and in styles>]
        let blindnesses = [
            ["protan", "protanopia"],
            ["deutan", "deuteranopia"],
            ["tritan", "tritanopia"]
        ];

        $("*").each((i, el) => {
            // Only check elements with a direct text descendant
            if (!axs.properties.hasDirectTextDescendant(el)) {
                return;
            }

            // Ignore elements that are part of the tota11y UI
            if ($(el).parents(".tota11y").length > 0) {
                return;
            }

            // Ignore invisible elements
            if (axs.utils.elementIsTransparent(el) ||
                axs.utils.elementHasZeroArea(el)) {
                    return;
            }

            let style = getComputedStyle(el);
            let bgColor = axs.utils.getBgColor(style, el);
            let fgColor = axs.utils.getFgColor(style, el, bgColor);

            for (var blindness of blindnesses) {
                this.runOneType(el, combinations, fgColor, bgColor, style, blindness[0], blindness[1]);
            }
        });

        // Restore the original `parseColor` method
        axs.utils.parseColor = _parseColor;
    }

    cleanup() {
        annotate.removeAll();
    }
}

module.exports = ColorBlindContrastPlugin;
