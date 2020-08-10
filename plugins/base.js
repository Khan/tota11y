/**
 * Base class for plugins.
 *
 * This module defines methods to render and mount plugins to the toolbar.
 * Each plugin will define four methods:
 *     getTitle: title to display in the toolbar
 *     getDescription: description to display in the toolbar
 *     run: code to run when the plugin is activated from the toolbar
 *     cleanup: code to run when the plugin is deactivated from the toolbar
 */

let InfoPanel = require("./shared/info-panel");

require("./style.less");

class Plugin {
    constructor(options = {}) {
        this.panel = new InfoPanel(this, options.panel);
        this.$checkbox = null;
    }

    getTitle() {
        return "New plugin";
    }

    getDescription() {
        return "";
    }

    /**
     * Methods that communicate directly with the info panel
     * TODO: Consider names like `setSummary` and `addError`
     */

    // Populates the info panel's "Summary" tab
    summary($html) {
        return this.panel.setSummary($html);
    }

    // Populates the info panel's "About" tab
    about($html) {
        return this.panel.setAbout($html);
    }

    // Adds an entry to the info panel's "Errors" tab
    error(title, $description, $el) {
        return this.panel.addError(title, $description, $el);
    }

    /**
     * Renders the plugin view.
     */
    render(clickHandler) {
        this.$checkbox = (
            <input
                className="tota11y-plugin-checkbox tota11y-sr-only"
                type="checkbox"
                onClick={() => clickHandler(this)} />
        );

        let $switch = (
            <label className="tota11y-plugin-switch">
                {this.$checkbox}
                <div aria-hidden="true"
                     className="tota11y-plugin-indicator">
                    &#x2713;
                </div>
                <div className="tota11y-plugin-info">
                    <div className="tota11y-plugin-title">
                        {this.getTitle()}
                    </div>
                    <div className="tota11y-plugin-description">
                        {this.getDescription()}
                    </div>
                </div>
            </label>
        );

        let $el = (
            <li role="menuitem" className="tota11y-plugin">
                {$switch}
            </li>
        );

        return $el;
    }

    /**
     * Activate the plugin from the UI.
     */
    activate() {
        this.run();
        this.panel.render();
    }

    /**
     * Deactivate the plugin from the UI.
     */
    deactivate() {
        this.cleanup();
        this.panel.destroy();

        this.$checkbox.prop("checked", false);
    }
}

module.exports = Plugin;
