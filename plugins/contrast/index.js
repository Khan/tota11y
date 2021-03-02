/**
 * A plugin to label different levels of contrast on the page, and highlight
 * those with poor contrast while suggesting alternatives.
 */

let $ = require("jquery");
let Plugin = require("../base");
let annotate = require("../shared/annotate")("contrast");

let titleTemplate = require("./error-title.handlebars");
let descriptionTemplate = require("./error-description.handlebars");

require("./style.less");

class ContrastPlugin extends Plugin {
  constructor() {
    super();
    // List of original colors for elements with insufficient contrast.
    // Used to restore original colors in cleanup.
    this.preservedColors = [];
  }

  getTitle() {
    return "Contrast";
  }

  getDescription() {
    return "Labels elements with insufficient contrast";
  }

  addError({ style, fgColor, bgColor, contrastRatio, requiredRatio }, el) {
    // Suggest colors at an "AA" level
    let suggestedColors = axs.color.suggestColors(bgColor, fgColor, {
      AA: requiredRatio,
    }).AA;

    let templateData = {
      fgColorHex: axs.color.colorToString(fgColor),
      bgColorHex: axs.color.colorToString(bgColor),
      contrastRatio: contrastRatio,
      requiredRatio: requiredRatio,
      suggestedFgColorHex: suggestedColors.fg,
      suggestedBgColorHex: suggestedColors.bg,
      suggestedColorsRatio: suggestedColors.contrast,
    };

    // Add click handler to preview checkbox
    let $description = $(descriptionTemplate(templateData));
    let originalFgColor = style.color;
    let originalBgColor = style.backgroundColor;

    $description.find(".preview-contrast-fix").click((e) => {
      if ($(e.target).prop("checked")) {
        // Set suggested colors
        $(el).css("color", suggestedColors.fg);
        $(el).css("background-color", suggestedColors.bg);
      } else {
        // Set original colors
        $(el).css("color", originalFgColor);
        $(el).css("background-color", originalBgColor);
      }
    });

    return this.error(titleTemplate(templateData), $description, $(el));
  }

  run() {
    // A map of fg/bg color pairs that we have already seen to the error
    // entry currently present in the info panel
    let combinations = {};

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

      if (
        axs.utils.elementIsTransparent(el) ||
        axs.utils.elementHasZeroArea(el)
      ) {
        return;
      }

      let style = getComputedStyle(el);

      // ignore 'visually hidden' things, eg https://www.a11yproject.com/posts/2013-01-11-how-to-hide-content/

      const visuallyHidden =
        style.getPropertyValue("clip") == "rect(0px, 0px, 0px, 0px)" && // even when zero, needs units
        style.getPropertyValue("clip-path") == "inset(50%)" &&
        style.getPropertyValue("height") == "1px" &&
        style.getPropertyValue("overflow") == "hidden" &&
        style.getPropertyValue("position") == "absolute" &&
        style.getPropertyValue("white-space") == "nowrap" &&
        style.getPropertyValue("width") == "1px";

      // Also ignore text with opacity:0 as found on guardian.co.uk, amazon.co.uk

      if (visuallyHidden || style.getPropertyValue("opacity") == "0") return;
      
      //

      let bgColor = axs.utils.getBgColor(style, el);
      let fgColor = axs.utils.getFgColor(style, el, bgColor);

      // Previous test used axs.utils.isLargeFont, which doesn't take bold text into account. This stolen from Mozilla under MPL 2.0 license https://searchfox.org/mozilla-central/source/devtools/shared/accessibility.js#23

      const isBoldText =
        parseInt(style.getPropertyValue("font-weight"), 10) >= 600;
      const size = parseFloat(style.getPropertyValue("font-size"));

      const LARGE_TEXT = {
        // CSS pixel value (constant) that corresponds to 14 point text size which defines large text when font text is bold (font weight is greater than or equal to 600).
        BOLD_LARGE_TEXT_MIN_PIXELS: 18.66,
        // CSS pixel value (constant) that corresponds to 18 point text size which defines large text for normal text (e.g. not bold).
        LARGE_TEXT_MIN_PIXELS: 24,
      };

      const isLargeText =
        size >=
        (isBoldText
          ? LARGE_TEXT.BOLD_LARGE_TEXT_MIN_PIXELS
          : LARGE_TEXT.LARGE_TEXT_MIN_PIXELS);

      // end Moz bit, need to replace the axs.utils below TODO

      // Calculate required ratio based on size
      // Using strings to prevent rounding
      //          let requiredRatio = axs.utils.isLargeFont(style) ?
      //				3.0 : 4.5;

      let requiredRatio = isLargeText ? 3.0 : 4.5;

      let contrastRatio = axs.color
        .calculateContrastRatio(fgColor, bgColor)
        .toFixed(2);

      //				console.log(contrastRatio+" / reqd="+ requiredRatio);

      // Build a key for our `combinations` map and report the color
      // if we have not seen it yet
      let key =
        axs.color.colorToString(fgColor) +
        "/" +
        axs.color.colorToString(bgColor) +
        "/" +
        requiredRatio;

      if (contrastRatio > requiredRatio) {
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
            {
              style,
              fgColor,
              bgColor,
              contrastRatio,
              requiredRatio,
            },
            el
          );

          // Save original color so it can be restored on cleanup.
          this.preservedColors.push({
            $el: $(el),
            fg: style.color,
            bg: style.backgroundColor,
          });

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
          combinations[key]
        );
      }
    });
  }

  cleanup() {
    // Set all elements to original color
    this.preservedColors.forEach((entry) => {
      entry.$el.css("color", entry.fg);
      entry.$el.css("background-color", entry.bg);
    });

    annotate.removeAll();
  }
}

module.exports = ContrastPlugin;
