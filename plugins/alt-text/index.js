/**
 * A plugin to check for valid alternative representations for images
 */

let $ = require("jquery");
let Plugin = require("../base");
let annotate = require("../shared/annotate")("alt-text");
let audit = require("../shared/audit");

class AltTextPlugin extends Plugin {
  getTitle() {
    return "Image alt-text";
  }

  getDescription() {
    return "Annotates images without alt text";
  }

  reportError(el) {
    let $el = $(el);
    let src = $el.attr("src") || "..";
    let title = "Image is missing alt text";
    let $error = (
      <div>
        <p>
          This image does not have an associated "alt" attribute. Please specify
          the alt text for this image like so:
        </p>

        <pre>
          <code>{`&lt;img src="${src}" alt="Image description"&gt`}</code>
        </pre>

        <p>
          If the image is decorative and does not convey any information to the
          surrounding content, however, you may leave this "alt" attribute
          empty. See{" "}
          <a
            href="https://dna.babylonhealth.com/accessibility/elements/text-descriptions"
            target="_blank"
            rel="noopener noreferrer"
          >
            DNA guidance on text descriptions
          </a>
          .
        </p>

        <pre>
          <code>
            {`&lt;img src="${src}" alt=""&gt;`}
            <br />
            {`&lt;img src="${src}" role="presentation"&gt;`}
          </code>
        </pre>
      </div>
    );

    // Place an error label on the element and register it as an
    // error in the info panel
    let entry = this.error(title, $error, $el);
    annotate.errorLabel($el, "", title, entry);
  }

  run() {
    // Generate errors for any images that fail the Accessibility
    // Developer Tools audit
    let { result, elements } = audit("imagesWithoutAltText");

    if (result === "FAIL") {
      elements.forEach(this.reportError.bind(this));
    }

    //  present alt text for checking if attrib exists but not blank
    $("img[alt]:not([alt=''])").each((i, el) => {
      // "Error" labels have a warning icon and expanded text on hover,
      // but we add a special `warning` class to color it differently.
      let altMsg = "Check alt: " + $(el).attr("alt");

      annotate
        .errorLabel($(el), "Check!", $(el).attr("alt"))
        .addClass("tota11y-label-warning");
    });

    //  label presentational images
    $('img[role="presentation"], img[alt=""]').each((i, el) => {
      // "Error" labels have a warning icon and expanded text on hover,
      // but we add a special `warning` class to color it differently.
      annotate
        .errorLabel($(el), "", "This image is decorative")
        .addClass("tota11y-label-warning");
    });
  }

  cleanup() {
    annotate.removeAll();
  }
}

module.exports = AltTextPlugin;
