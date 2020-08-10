/**
 * An index of plugins.
 *
 * Exposes an array of plugin instances.
 */

let AltTextPlugin = require("./alt-text");
let ContrastPlugin = require("./contrast");
let HeadingsPlugin = require("./headings");
let LabelsPlugin = require("./labels");
let LandmarksPlugin = require("./landmarks");
let LinkTextPlugin = require("./link-text");
let A11yTextWand = require("./a11y-text-wand");
let AriaVisualizer = require('./aria-visualizer');

module.exports = {
    default: [
        new HeadingsPlugin(),
        new ContrastPlugin(),
        new LinkTextPlugin(),
        new LabelsPlugin(),
        new AltTextPlugin(),
        new LandmarksPlugin(),
    ],

    experimental: [
        new A11yTextWand(),
        new AriaVisualizer(),
    ],
};
