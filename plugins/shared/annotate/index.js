/**
 * Utility functions to annotate particular site elements.
 *
 * Annotations are namespaced, meaning you would normally include this
 * package like so:
 *
 *     let annotate = require("./annotate")("headers");
 *
 * This allows plugins to easily maintain their annotations, rather than
 * keeping track of an extra class name elsewhere.
 */

let $ = require("jquery");

let errorLabelTemplate = require("./error-label.handlebars");
require("./style.less");

// For very small (or zero-area) elements, highlights are not very useful.
// This constant declares highlights to be at least `MIN_HIGHLIGHT_SIZE` tall
// and across.
const MIN_HIGHLIGHT_SIZE = 25;

// Polyfill fallback for IE < 10
window.requestAnimationFrame = window.requestAnimationFrame ||
    function(callback) {
        window.setTimeout(callback, 16);
    };

module.exports = (namespace) => {
    // The class that will be applied to any annotation generated in this
    // namespace
    const ANNOTATION_CLASS = "tota11y-annotation-" + namespace;

    // A queue of {$annotation, $parent}'s that is populated by
    // `createAnnotation` and emptied by the `render()` method.
    //
    // Annotations are queued to reduce reflows.
    let queue = [];

    // Register a new annotation to a given jQuery element
    let createAnnotation = ($el, className) => {
        // Create a position an annotation relative to its offset parent.
        // We also store the element its annotation so we can reposition when
        // the window resizes.
        let $annotation = $("<div>")
            .addClass("tota11y")    // tota11y base class for styling
            .addClass(ANNOTATION_CLASS)
            .addClass(className)
            .css($el.position())
            .data({$el});

        // TODO: We can invoke a requestAnimationFrame(render) here to limit
        // the amount of times we run that timer

        // Append an object to the queue. We'll add the annotation to the DOM
        // later to reduce reflows.
        queue.push({
            $annotation: $annotation,
            $parent: $el.offsetParent()
        });

        return $annotation;
    };

    // To maintain a high framerate, we'll only render `RENDER_CHUNK_SIZE`
    // annotations per frame.
    //
    // NOTE: A value of "20" consistently hits 60fps on facebook.com
    const RENDER_CHUNK_SIZE = 20;

    // Mount all annotations to the DOM in sequence. This is done by
    // picking items off the queue, where each item consists of the
    // annotation and the node to which we'll append it.
    (function loop() {
        for (let i = 0; queue.length > 0 && i < RENDER_CHUNK_SIZE; i++) {
            let item = queue.shift();
            item.$parent.append(item.$annotation);
        }

        window.requestAnimationFrame(loop);
    })();

    // Handle resizes by repositioning all annotations in bulk
    $(window).resize(() => {
        let $annotations = $("." + ANNOTATION_CLASS);

        // Record the position of each annotation's corresponding element to
        // batch measurements
        let positions = $annotations.map((i, el) => {
            return $(el).data("$el").position();
        });

        // Reposition each annotation (batching invalidations)
        $annotations.each((i, el) => {
            $(el).css({
                top: positions[i].top,
                left: positions[i].left
            });
        });
    });

    return {
        // Places a small label in the top left corner of a given jQuery
        // element. By default, this label contains the element's tagName.
        label($el, text=$el.prop("tagName").toLowerCase()) {
            let $label = createAnnotation($el, "tota11y-label");
            return $label.html(text);
        },

        // Places a special label on an element that, when hovered, displays
        // an expanded error message.
        //
        // This method also accepts an optional `errorEntry`, which
        // corresponds to the object returned from `InfoPanel.addError`. This
        // object will contain a "show()" method when the info panel is
        // rendered, allowing us to externally open the entry in the info
        // panel corresponding to this error.
        errorLabel($el, text, expanded, errorEntry, level = "error") {
            let $innerHtml = $(errorLabelTemplate({
                text: text,
                detail: expanded,
                hasErrorEntry: !!errorEntry
            }));

            if (errorEntry) {
                $innerHtml.find(".tota11y-label-link").click((e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    errorEntry.show();
                });

                $innerHtml.hover(() => {
                    errorEntry.$trigger.addClass("trigger-highlight");
                }, () => {
                    errorEntry.$trigger.removeClass("trigger-highlight");
                });
            }

            return this.label($el)
                .addClass(`tota11y-label-${level}`)
                .html($innerHtml);
        },

        // Highlights a given jQuery element by placing a translucent
        // rectangle directly over it
        highlight($el) {
            let $highlight = createAnnotation($el, "tota11y-highlight");
            return $highlight.css({
                // include margins
                width: Math.max(MIN_HIGHLIGHT_SIZE, $el.outerWidth(true)),
                height: Math.max(MIN_HIGHLIGHT_SIZE, $el.outerHeight(true))
            });
        },

        // Toggles a highlight on a given jQuery element `$el` when `$trigger`
        // is hovered (mouseenter/mouseleave) or focused (focus/blur)
        toggleHighlight($el, $trigger) {
            let $highlight;

            $trigger.on("mouseenter focus", () => {
                if ($highlight) {
                    $highlight.remove();
                }

                $highlight = this.highlight($el);
            });

            $trigger.on("mouseleave blur", () => {
                if ($highlight) {
                    $highlight.remove();
                    $highlight = null;
                }
            });
        },

        hide() {
            $(".tota11y.tota11y-label").hide();
        },

        show() {
            $(".tota11y.tota11y-label").show();
        },

        removeAll() {
            // Remove all annotations
            $("." + ANNOTATION_CLASS).remove();
        }
    };
};
