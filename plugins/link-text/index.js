/**
 * A plugin to identify unclear link text such as "more" and "click here,"
 * which can make for a bad experience when using a screen reader
 */

let $ = require("jquery");
let Plugin = require("../base");
let annotate = require("../shared/annotate")("link-text");

class LinkTextPlugin extends Plugin {
    getTitle() {
        return "Link text";
    }

    getDescription() {
        return `
            Identifies links that may be confusing because they lack context
        `;
    }

    /**
     * Slightly modified unclear text checking that has been refactored into
     * a single method to be called with arbitrary strings.
     *
     * Original: https://github.com/GoogleChrome/accessibility-developer-tools/blob/9183b21cb0a02f5f04928f5cb7cb339b6bbc9ff8/src/audits/LinkWithUnclearPurpose.js#L55-67
     */
    isDescriptiveText(textContent) {
        // Handle when the text is undefined or null
        if (typeof textContent === "undefined" || textContent === null) {
            return false;
        }

        let stopWords = [
            "click", "tap", "go", "here", "learn", "more", "this", "page",
            "link", "about"
        ];
        // Generate a regex to match each of the stopWords
        let stopWordsRE = new RegExp(`\\b(${stopWords.join("|")})\\b`, "ig");

        textContent = textContent
            // Strip leading non-alphabetical characters
            .replace(/[^a-zA-Z ]/g, "")
            // Remove the stopWords
            .replace(stopWordsRE, "");

        // Return whether or not there is any text left
        return textContent.trim() !== "";
    }

    reportError($el, $description, content) {
        let entry = this.error("Link text is unclear", $description, $el);
        annotate.errorLabel($el, "",
            `Link text "${content}" is unclear`, entry);
    }

    /**
     * We can call linkWithUnclearPurpose from ADT directly once the following
     * issue has been resolved. There is some extra code here until then.
     * https://github.com/GoogleChrome/accessibility-developer-tools/issues/156
     */
    run() {
        $("a").each((i, el) => {
            let $el = $(el);

            // Ignore the tota11y UI
            if ($el.parents(".tota11y").length) {
                return;
            }

            // Ignore hidden links
            if (axs.utils.isElementOrAncestorHidden(el)) {
                return;
            }

            // Extract the text alternatives for this element: including
            // its text content, aria-label/labelledby, and alt text for
            // images.
            //
            // TODO: Read from `alts` to determine where the text is coming
            // from (for tailored error messages)
            let alts = {};
            let extractedText = axs.properties.findTextAlternatives(
                el, alts);

            if (!this.isDescriptiveText(extractedText)) {
                let $description = (
                    <div>
                        The text
                        {" "}
                        <i>"{extractedText}"</i>
                        {" "}
                        is unclear without context and may be confusing. See <a target="_blank" rel="noopener noreferrer" href="https://dna.babylonhealth.com/ui-guidelines/components/text-link">DNA guidance on link text</a>. Consider rearranging the
                        {" "}
                        <code>{"&lt;a&gt;&lt;/a&gt;"}</code>
                        {" "}
                        tags or using <code>aria-label</code>.
                    </div>
                );

                this.reportError($el, $description, extractedText);
            }
        });
    }

    cleanup() {
        annotate.removeAll();
    }
}

module.exports = LinkTextPlugin;
