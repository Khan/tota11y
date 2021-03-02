/**
 * A plugin to identify and validate heading tags (<h1>, <h2>, etc.)
 */

let $ = require("jquery");
let Plugin = require("../base");
let annotate = require("../shared/annotate")("headings");

let outlineItemTemplate = require("./outline-item.handlebars");
require("./style.less");

const ERRORS = {
    FIRST_NOT_H1(level) {
        return {
            title: "First heading is not an &lt;h1&gt;",
            description: `
                <div>
                    To give your page a proper structure for assistive
                    technologies, lay out your headings
                    beginning with an <code>&lt;h1&gt;</code>. We found an
                    <code>&lt;h${level}&gt;</code> instead. See <a href="https://dna.babylonhealth.com/accessibility/elements/headings" target="_blank" rel="noopener noreferrer">DNA guidance for Headings</a>.
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
        let _tag = (level) => `<code>&lt;h${level}&gt;</code>`;
        let description = `
            <div>
                <p>This page contains an ${_tag(currLevel)} tag directly
                following an ${_tag(prevLevel)}. Reduce the gap in
                the heading level by upgrading this tag to an
                ${_tag(prevLevel+1)}`;

        // Suggest upgrading the tag to the same level as `prevLevel` iff
        // `prevLevel` is not 1
        if (prevLevel !== 1) {
            description += ` or ${_tag(prevLevel)}`;
        }

        description += ". See <a href='https://dna.babylonhealth.com/accessibility/elements/headings' target='_blank' rel='noopener noreferrer'>DNA guidance for Headings</a>.</div>";

        return {
            title: `
                Nonconsecutive heading level used (h${prevLevel} &rarr;
                h${currLevel})
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
            let level = +$el.prop("tagName").slice(1);
            let error;

            // Check for any violations
            // NOTE: These violations do not overlap, but as we add more, we
            // may want to separate the conditionals here to report multiple
            // errors on the same tag.
            if (i === 0 && level !== 1) {
                error = ERRORS.FIRST_NOT_H1(level);                         // eslint-disable-line new-cap
            } else if (prevLevel && level - prevLevel > 1) {
                error = ERRORS.NONCONSECUTIVE_HEADER(prevLevel, level);     // eslint-disable-line new-cap
            }

            prevLevel = level;

            // Render the entry in the outline for the "Summary" tab
            let $item = $(outlineItemTemplate({
                level: level,
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
                    $el.prop("tagName").toLowerCase(),
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
                annotate.label($el).addClass("tota11y-label-success");

                // Mark the summary item as green
                $item
                    .find(".tota11y-heading-outline-level")
                    .addClass("tota11y-label-success");
            }
        });

        return $items;
    }

    run() {
        let $headings = $("h1, h2, h3, h4, h5, h6");
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
