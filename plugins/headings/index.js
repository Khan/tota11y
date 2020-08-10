/**
 * A plugin to identify and validate heading tags (<h1>, <h2>, etc.)
 */

let $ = require("jquery");
let Plugin = require("../base");
let annotate = require("../shared/annotate")("headings");

let outlineItemTemplate = require("./outline-item.handlebars");
require("./style.less");

class HeadingLevel {
    /*
     * Constructs a heading level from a heading element (h1 - h6) or
     * any element with a heading role and an aria level (potentially >6).
     */
    constructor($el) {
        let tagName = $el.prop("tagName").toLowerCase();
        if ($el.attr("role") === "heading"
                && typeof $el.attr("aria-level") !== "undefined") {
            this._level = +$el.attr("aria-level");
            this._tag = `&lt;${tagName} role="heading" aria-level="${this._level}"&gt;`
        } else  {
            this._level = +tagName.slice(1);
            this._tag = `&lt;${tagName}&gt;`
        }
    }

    tag() {
        return this._tag;
    }

    value() {
        return this._level;
    }
}

const ERRORS = {
    FIRST_NOT_H1(level) {
        return {
            title: "First heading is not an &lt;h1&gt;",
            description: `
                <div>
                    To give your document a proper structure for assistive
                    technologies, it is important to lay out your headings
                    beginning with an <code>&lt;h1&gt;</code>. We found an
                    <code>${level.tag()}</code> instead.
                </div>
            `
        };
    },

    // This error is currently unused.
    //
    // The HTML5 outlining algorithm[1] enables the use of "sectioning roots"
    // to support multiple <h1> tags when embedded inside of containers like
    // <section> or <article>. There are currently "no known implementations
    // of the outline algorithm in graphical browsers or assistive technology
    // user agents" [2], so we instead simply "use heading rank (h1-h6) to
    // convey document structure." [2].
    //
    // [1]: http://www.w3.org/html/wg/drafts/html/master/semantics.html#outline
    // [2]: https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Sections_and_Outlines_of_an_HTML5_document#The_HTML5_Outline_Algorithm
    MULTIPLE_H1: {
        title: "&lt;h1&gt; used when one is already present"
    },

    // This error accepts two arguments to display a relevant error message
    NONCONSECUTIVE_HEADER(prevLevel, currLevel) {
        let levelToTagCode = (level) => {
            if (level <= 6) {
                return `<code>&lt;h${level}&gt;</code>`;
            }
            return `<code>&lt;div role="heading" aria-level="${level}"&gt;>`;
        }
        let _tag = (level) => `<code>${level.tag()}</code>`;

        let description = `
            <div>
                This document contains an ${_tag(currLevel)} tag directly
                following an ${_tag(prevLevel)}. In order to maintain a consistent
                outline of the page for assistive technologies, reduce the gap in
                the heading level by upgrading this tag to an
                ${levelToTagCode(prevLevel.value()+1)}`;

        // Suggest upgrading the tag to the same level as `prevLevel` iff
        // `prevLevel` is not 1
        if (prevLevel.value() !== 1) {
            description += ` or ${levelToTagCode(prevLevel.value())}`;
        }

        description += ".</div>";

        return {
            // just convert to hX for title as space is constrained even
            // if actual tag is not h1-h6
            title: `
                Nonconsecutive heading level used (h${prevLevel.value()} &rarr;
                h${currLevel.value()})
            `,
            description: description
        };
    }
};

class HeadingsPlugin extends Plugin {
    getTitle() {
        return "Headings";
    }

    getDescription() {
        return `
            Highlights headings (&lt;h1&gt;, &lt;h2&gt;, etc) and
            order violations
        `;
    }

    /**
     * Computes an outline of the page and reports any violations.
     */
    outline($headings) {
        let $items = [];

        let prevLevel;
        $headings.each((i, el) => {
            let $el = $(el);
            let level = new HeadingLevel($el);
            let error;

            // Check for any violations
            // NOTE: These violations do not overlap, but as we add more, we
            // may want to separate the conditionals here to report multiple
            // errors on the same tag.
            if (i === 0 && level.value() !== 1) {
                error = ERRORS.FIRST_NOT_H1(level);                         // eslint-disable-line new-cap
            } else if (prevLevel.value()
                    && level.value() - prevLevel.value() > 1) {
                error = ERRORS.NONCONSECUTIVE_HEADER(prevLevel, level);     // eslint-disable-line new-cap
            }

            prevLevel = level;

            // Render the entry in the outline for the "Summary" tab
            let $item = $(outlineItemTemplate({
                // provide a numerical level which can go arbitarily high
                // and a capped level which we use for styling the element
                // that stops after 6.
                level: level.value(),
                _level: level.value() <= 6 ? level.value() : "higher",
                text: $el.text()
            }));

            $items.push($item);

            // Highlight the heading element on hover
            annotate.toggleHighlight($el, $item);

            if (error) {
                // Register an error to the info panel
                let infoPanelError = this.error(
                    error.title, $(error.description), $el);

                // Place an error label on the heading tag
                annotate.errorLabel(
                    $el,
                    // just convert to hX for title as space is constrained even
                    // if actual tag is not h1-h6
                    `h${level.value()}`,
                    error.title,
                    infoPanelError);

                // Mark the summary item as red
                // Pretty hacky, since we're borrowing label styles for this
                // summary tab
                $item
                    .find(".tota11y-heading-outline-level")
                    .addClass("tota11y-label-error");
            } else {
                // Label the heading tag
                annotate.label($el, `h${level.value()}`)
                    .addClass("tota11y-label-success");

                // Mark the summary item as green
                $item
                    .find(".tota11y-heading-outline-level")
                    .addClass("tota11y-label-success");
            }
        });

        return $items;
    }

    run() {
        let $headings = $(
            "h1, h2, h3, h4, h5, h6, [role=\"heading\"][aria-level]"
        );
        // `this.outline` has the side-effect of also reporting violations
        let $items = this.outline($headings);

        if ($items.length) {
            let $outline = (
                <div className="tota11y-heading-outline">
                    {$items}
                </div>
            );

            this.summary($outline);
        }
    }

    cleanup() {
        annotate.removeAll();
    }
}

module.exports = HeadingsPlugin;
