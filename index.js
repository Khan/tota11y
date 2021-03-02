/**
 * The entry point for tota11y.
 *
 * Builds and mounts the toolbar.
 */

// Require the base tota11y styles right away so they can be overwritten
require("./less/tota11y.less");

const $ = require("jquery");

const plugins = require("./plugins");
const logoTemplate = require("./templates/logo.handlebars");

// Chrome Accessibility Developer Tools - required once as a global
require("script-loader!./node_modules/accessibility-developer-tools/dist/js/axs_testing.js");

class Toolbar {
    constructor() {
        this.activePlugin = null;
    }

    /**
     * Manages the state of the toolbar when a plugin is clicked, and toggles
     * the appropriate plugins on and off.
     */
    handlePluginClick(plugin) {
        // If the plugin was already selected, toggle it off
        if (plugin === this.activePlugin) {
            plugin.deactivate();
            this.activePlugin = null;
        } else {
            // Deactivate the active plugin if there is one
            if (this.activePlugin) {
                this.activePlugin.deactivate();
            }

            // Activate the selected plugin
            plugin.activate();
            this.activePlugin = plugin;
        }
    }

    /**
     * Renders the toolbar and appends it to the specified element.
     */
    appendTo($el) {
        let $logo = $(logoTemplate());
        let $toolbar;

        let $defaultPlugins = plugins.default.map((Plugin) => { // eslint-disable-line no-unused-vars
            return <Plugin onClick={this.handlePluginClick.bind(this)} />;
        });

        let $experimentalPlugins = null;
        if (plugins.experimental.length) {
            $experimentalPlugins = (
                <li>
                    <div className="tota11y-plugins-separator">
                        Developers:
                    </div>
                    <ul>
                      {
                          plugins.experimental.map((Plugin) => { // eslint-disable-line no-unused-vars
                              return (
                                  <Plugin onClick={this.handlePluginClick.bind(this)} />
                              );
                          })
                      }
                    </ul>
                </li>
            );
        }

        let $plugins = (
            <ul className="tota11y-plugins">
                {$defaultPlugins}
                {$experimentalPlugins}
            </ul>
        );

        let handleToggleClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            $toolbar.toggleClass("tota11y-expanded");
            $toolbar.attr("aria-expanded", $toolbar.is(".tota11y-expanded"));
        };

        let $toggle = (
            <button aria-controls="tota11y-toolbar"
                    className="tota11y-toolbar-toggle"
                    onClick={handleToggleClick}
                    aria-label="[tota11y] Toggle menu">
                <div aria-hidden="true" className="tota11y-toolbar-logo">
                    {$logo}
                </div>
            </button>
        );

        $toolbar = (
            <div id="tota11y-toolbar" className="tota11y tota11y-toolbar"
                 role="region"
                 aria-expanded="false">
                <div className="tota11y-toolbar-body">
                    {$plugins}
                </div>
                {$toggle}
            </div>
        );

        $el.append($toolbar);
    }
}

$(function() {
    var bar = new Toolbar();

    // TODO: Make this customizable
    bar.appendTo($("body"));
});
