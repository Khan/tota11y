/**
 * An index of plugins.
 *
 * Exposes an array of plugin instances.
 */

const AltTextPlugin = require("./alt-text");
const ContrastPlugin = require("./contrast");
const HeadingsPlugin = require("./headings");
const LabelsPlugin = require("./labels");
const LandmarksPlugin = require("./landmarks");
const LinkTextPlugin = require("./link-text");
const A11yTextWand = require("./a11y-text-wand");
const FocusTracker = require("./focus-tracker");

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
        new FocusTracker(),
    ],
};
