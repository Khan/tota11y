/**
 * Allows users to see what screen readers would see.
 */

let $ = require("jquery");
let Plugin = require("../base");

require("./style.less");

class A11yTextWand extends Plugin {
  getTitle() {
    return "Accessible name + description";
  }

  getDescription() {
    return "Hover over elements (e.g. form fields) to see accessible names & descriptions passed to assistive technology";
  }

  run() {
    // HACK(jordan): We provide a fake summary to force the info panel to
    //     render.
    this.summary(" ");
    this.panel.render();

    $(document).on("mousemove.wand", function (e) {
      let element = document.elementFromPoint(e.clientX, e.clientY);

      let textAlternative = axs.properties.findTextAlternatives(element, {});

      // nasty Brucie hack: if it's an input with a value attribute, like WordPress search button <input type="submit" id="searchsubmit" value="Search">, grab its velue text and show that (otherwise textAlternative is blank for some reason) )

      if (
        $(element).prop("nodeName") === "INPUT" &&
        element.hasAttribute("value")
      ) {
        if (!textAlternative) {
          textAlternative = $(element).attr("value");
        } else {
          textAlternative += " " + $(element).attr("value");
        }
      }
      // TODO: test with fieldset and legend.

      // append anything found in aria-describedby, as screen readers will announce this too. It's a good way of adding accessible help text to form inputs— see https://developer.paciellogroup.com/blog/2014/12/using-aria-describedby-to-provide-helpful-form-hints/

      const describedBy = $(element).attr("aria-describedby");
      if (describedBy) {
        let describedIDs = describedBy.split(/\s/);
        for (const describedId of describedIDs) {
          const el = document.getElementById(describedId);
          if (el) textAlternative += " " + el.textContent;
        }
      }

      $(".tota11y-outlined").removeClass("tota11y-outlined");
      $(element).addClass("tota11y-outlined");

      if (!textAlternative) {
        $(".tota11y-info-section.active").html(
          <strong className="tota11y-nothingness">
            ** No text exposed to Assistive Tech! **
          </strong>
        );
      } else {
        $(".tota11y-info-section.active").text(textAlternative);
      }
    });
  }

  cleanup() {
    $(".tota11y-outlined").removeClass("tota11y-outlined");
    $(document).off("mousemove.wand");
  }
}

module.exports = A11yTextWand;
