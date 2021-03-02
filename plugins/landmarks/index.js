/**
 * A plugin to label all ARIA landmark roles
 */

let $ = require("jquery");
let Plugin = require("../base");
let annotate = require("../shared/annotate")("landmarks");
require("./style.less");

class LandmarksPlugin extends Plugin {
  getTitle() {
    return "Landmarks, ARIA roles";
  }

  getDescription() {
    return "Labels set ARIA roles, outlines HTML landmarks";
  }

  run() {
    $("[role]:not(.tota11y-toolbar,.tota11y-plugin)").each(function () {
      annotate.label($(this), $(this).attr("role"));
    });

    $("header, footer, nav, aside, main").each(function () {
      annotate.label($(this), $(this).prop("tagName"));
      $(this).addClass("tota11y-element-outlined");
    });
  }

  cleanup() {
    annotate.removeAll();

    $(".tota11y-element-outlined").each(function () {
      $(this).removeClass("tota11y-element-outlined");
    });
  }
}

module.exports = LandmarksPlugin;
