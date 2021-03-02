/**
 * A plugin to identify empty elements, esp those to fake styling
 *  <p>, <h1..6>, <li>, <ol>, <ul> and <br><br>
 * do we need to strip out &nbsp too? TODO
 *
 * TODO: add tests on dummy index page for these
 */


let $ = require("jquery");
let Plugin = require("../base");
let annotate = require("../shared/annotate")("landmarks");


let outlineItemTemplate = require("./index.js");
require("./index.js");


class EmptyElementsPlugin extends Plugin {
    getTitle() {
        return "Empty elements";
    }

    getDescription() {
        return `
            Highlights empty elements that should be removed
        `;
    }
	run() {
		  $("h1:empty, h2:empty, h3:empty, h4:empty, h5:empty, h6:empty, li:empty, ol:empty, ul:empty, nav:empty, header:empty, main:empty, aside:empty, footer:empty, figcaption:empty").each(function () {
			$(this).append("EMPTY ELEMENT !!");
			$(this).addClass("tota11y-empty"); // so we can find them again
			annotate.errorLabel($(this),"Empty!", $(this).prop("tagName"));
		});

		$("p:empty, br+br").each(function () {
			$(this).addClass("tota11y-empty"); // so we can find them again
			annotate.label($(this), $(this).prop("tagName"));
		});


	  }

	  cleanup() {
		annotate.removeAll();
		$(".tota11y-empty").each(function () {
			$(this).empty();
		});
	  }
	}

module.exports = EmptyElementsPlugin;
