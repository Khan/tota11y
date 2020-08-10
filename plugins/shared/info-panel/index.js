/**
 * The following code defines an information panel that can be invoked from
 * any plugin to display summaries, errors, or more information about what
 * the plugin is doing.
 *
 * These panels are moveable and closeable, and are unique to the plugin that
 * created them. They appear in the bottom right corner of the viewport.
 *
 * Info panels consist of a title and three optional sections, which form
 * tabs that users can switch between.
 *
 *   Summary: A summary of the plugin's results
 *   Errors: A list of violations reported by this plugin. The tab marker also
 *           contains the number of errors listed
 */

let $ = require("jquery");
let annotate = require("../annotate")("info-panel");

let errorTemplate = require("./error.handlebars");
require("./style.less");

const INITIAL_PANEL_MARGIN_PX = 10;
const COLLAPSED_CLASS_NAME = "tota11y-collapsed";
const HIDDEN_CLASS_NAME = "tota11y-info-hidden";
const STATUS_PANEL_VIEW_CLASS_NAME = "tota11y-info-status-panel-view";

class InfoPanel {
    constructor(plugin, options = {}) {
        this.plugin = plugin;
        this.options = options;

        this.about = null;
        this.summary = null;
        this.errors = [];

        this.$el = null;
    }

    /**
     * Sets the contents of the about section as HTML
     */
    setAbout(about) {
        this.about = about;
    }

    /**
     * Sets the contents of the summary section as HTML
     */
    setSummary(summary) {
        this.summary = summary;
    }

    /**
     * Adds an error to the errors tab. Also receives a jQuery element to
     * highlight on hover.
     */
    addError(title, $description, $el) {
        let error = {title, $description, $el};
        this.errors.push(error);
        return error;
    }

    _addTab(title, html) {
        // Create and append a tab marker
        let $tab = (
            <li className="tota11y-info-tab">
                <a className="tota11y-info-tab-anchor" href="#">
                    <span className="tota11y-info-tab-anchor-text">
                        {title}
                    </span>
                </a>
            </li>
        );

        this.$el.find(".tota11y-info-tabs").append($tab);

        // Create and append the tab content
        let $section = $("<div>")
            .addClass("tota11y-info-section")
            .html(html);
        this.$el.find(".tota11y-info-sections").append($section);

        // Register an "activate" event for the tab, which switches the
        // tab's associated content to be visible, and changes the
        // appearance of the newly-active tab marker
        $tab.on("activate", () => {
            this.$el.find(".tota11y-info-tab.active")
                .removeClass("active");
            this.$el.find(".tota11y-info-section.active")
                .removeClass("active");

            $tab.addClass("active");
            $section.addClass("active");
        });

        // Activate the tab when its anchor is clicked
        $tab.on("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            $tab.trigger("activate");
        });

        return $tab;
    }

    /**
     * Positions the info panel and sets up event listeners to make the
     * panel draggable
     */
    initAndPosition() {
        let panelLeftPx, panelTopPx;

        // Wire up the dismiss button
        this.$el.find(".tota11y-info-dismiss-trigger").click((e) => {
            e.preventDefault();
            e.stopPropagation();
            this.$el.addClass(HIDDEN_CLASS_NAME);

            // (a11y) Bring the focus back to the plugin's checkbox
            this.plugin.$checkbox.focus();
        });

        // Append the info panel to the body. In reality we'll likely want
        // it directly adjacent to the toolbar.
        $("body").append(this.$el);

        // Position info panel on the bottom right of the window
        panelLeftPx = window.innerWidth - this.$el.width() - INITIAL_PANEL_MARGIN_PX;
        panelTopPx = window.innerHeight - this.$el.height() - INITIAL_PANEL_MARGIN_PX;

        // Wire up draggable surface
        let $draggable = this.$el.find(".tota11y-info-title");
        let isDragging = false;

        // Variables for the starting positions of the mouse and panel
        let initMouseX, initMouseY;
        let initPanelLeft, initPanelTop;

        $draggable
            .on("mousedown", (e) => {
                e.preventDefault();

                // Start dragging, and record initial mouse and panel
                // positions
                isDragging = true;

                initMouseX = e.pageX;
                initMouseY = e.pageY;

                initPanelLeft = panelLeftPx;
                initPanelTop = panelTopPx;
            })
            .on("mouseup", (e) => {
                e.preventDefault();
                isDragging = false;
            });

        $(window).on("mousemove", (e) => {
            if (!isDragging) {
                return;
            }
            e.preventDefault();

            let deltaX = e.pageX - initMouseX;
            let deltaY = e.pageY - initMouseY;

            panelLeftPx = initPanelLeft + deltaX;
            panelTopPx = initPanelTop + deltaY;

            this.$el.css({
                left: panelLeftPx,
                top: panelTopPx
            });
        });


        this.$el.css({
            left: panelLeftPx,
            top: panelTopPx
        });
    }

    renderAnnotationCheckbox() {
        if (!this.options.disableAnnotation) {
            return (
                <label className="tota11y-info-annotation-toggle">
                    Annotate:
                    {" "}
                    <input
                        className="toggle-annotation"
                        type="checkbox"
                        checked="checked" />
                </label>
            );
        }

        return null;
    }

    render() {
        // Destroy the existing info panel to prevent double-renders
        if (this.$el) {
            this.$el.remove();
        }

        let hasContent = false;

        const classNames = ["tota11y", "tota11y-info"];

        if (this.options.statusPanelView) {
            classNames.push(STATUS_PANEL_VIEW_CLASS_NAME);
        }

        this.$el = (
            <div className={classNames.join(" ")} tabindex="-1">
                <header className="tota11y-info-title">
                    {this.plugin.getTitle()}
                    <span className="tota11y-info-controls">
                        {this.renderAnnotationCheckbox()}
                        <a aria-label="Close info panel"
                           href="#"
                           className="tota11y-info-dismiss-trigger">
                            &times;
                        </a>
                    </span>
                </header>
                <div className="tota11y-info-body">
                    <div className="tota11y-info-sections" />
                    <ul role="tablist" className="tota11y-info-tabs" />
                </div>
            </div>
        );

        // Add the appropriate tabs based on which information the info panel
        // was provided, then highlight the most important one.
        let $activeTab;
        if (this.about) {
            $activeTab = this._addTab("About", this.about);
        }

        if (this.summary) {
            $activeTab = this._addTab("Summary", this.summary);
        }

        // Wire annotation toggling
        this.$el.find(".toggle-annotation").click((e) => {
            if ($(e.target).prop("checked")) {
                annotate.show();
            } else {
                annotate.hide();
            }
        });

        if (this.errors.length > 0) {
            let $errors = $("<ul>").addClass("tota11y-info-errors");

            // Store a reference to the "Errors" tab so we can switch to it
            // later
            let $errorsTab;

            this.errors.forEach((error, i) => {
                let $error = $(errorTemplate(error));

                // Insert description jQuery object into template.
                // Description is passed as jQuery object
                // so that functionality can be inserted.
                $error
                    .find(".tota11y-info-error-description")
                    .prepend(error.$description);

                $errors.append($error);

                // Wire up the expand/collapse trigger
                let $trigger = $error.find(".tota11y-info-error-trigger");
                let $desc = $error.find(".tota11y-info-error-description");

                $trigger.click((e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    $trigger.toggleClass(COLLAPSED_CLASS_NAME);
                    $desc.toggleClass(COLLAPSED_CLASS_NAME);
                });

                // Attach a function to the original error object to open
                // this error so it can be done externally. We'll use this to
                // access error entries in the info panel from labels.
                error.show = () => {
                    // Make sure info panel is visible
                    this.$el.removeClass(HIDDEN_CLASS_NAME);

                    // Open the error entry
                    $trigger.removeClass(COLLAPSED_CLASS_NAME);
                    $desc.removeClass(COLLAPSED_CLASS_NAME);

                    // Switch to the "Errors" tab
                    $errorsTab.trigger("activate");

                    // Scroll to the error entry
                    let $scrollParent = $trigger.parents(
                        ".tota11y-info-section");
                    $scrollParent[0].scrollTop = $trigger[0].offsetTop - 10;
                };

                // Attach the `$trigger` as well so can access it externally.
                // We use this to highlight the trigger when hovering over
                // inline error labels.
                error.$trigger = $trigger;

                // Wire up the scroll-to-error button
                let $scroll = $error.find(".tota11y-info-error-scroll");
                $scroll.click((e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // TODO: This attempts to scroll to fixed elements
                    $(document).scrollTop(error.$el.offset().top - 80);
                });

                // Expand the first violation
                if (i === 0) {
                    $desc.toggleClass(COLLAPSED_CLASS_NAME);
                    $trigger.toggleClass(COLLAPSED_CLASS_NAME);
                }

                // Highlight the violating element on hover/focus. We do it
                // for both $trigger and $scroll to allow users to see the
                // highlight when scrolling to the element with the button.
                annotate.toggleHighlight(error.$el, $trigger);
                annotate.toggleHighlight(error.$el, $scroll);

                // Add code from error.$el to the information panel
                let errorHTML = error.$el[0].outerHTML;

                // Trim the code block if it is over 300 characters
                if (errorHTML.length > 300) {
                    errorHTML = errorHTML.substring(0, 300) + "...";
                }

                let $relevantCode = $error.find(
                    ".tota11y-info-error-description-code-container code");
                $relevantCode.text(errorHTML);
            });

            $errorsTab = $activeTab = this._addTab("Errors", $errors);

            // Add a small badge next to the tab title
            let $badge = $("<div>")
                .addClass("tota11y-info-error-count")
                .text(this.errors.length);

            $activeTab.find(".tota11y-info-tab-anchor").append($badge);
        }

        if ($activeTab) {
            $activeTab.trigger("activate");
            // hasContent is technically coupled to $activeTab, since if there
            // is no $activeTab then there is no content. This behavior may
            // change in the future.
            hasContent = true;
        }

        if (hasContent) {
            this.initAndPosition();
        }

        // (a11y) Shift focus to the newly-opened info panel
        this.$el.focus();

        return this.$el;
    }

    destroy() {
        // Reset contents
        this.about = null;
        this.summary = null;
        this.errors = [];

        // Remove the element
        if (this.$el) {
            this.$el.remove();
            this.$el = null;
        }

        // Remove the annotations
        annotate.removeAll();
    }
}

module.exports = InfoPanel;
