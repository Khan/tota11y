/**
 * Keep track of a user's focus as it moves through the page.
 */

const Plugin = require("../base");

const annotate = require("../shared/annotate")("tabIndex");

// the `focus` and `blur` events do not bubble, so we're going to leverage
// the `focusin` and `focusout` events that will bubble up to the document
const FOCUS_EVENT = "focusin";
const BLUR_EVENT = "focusout";

// this will let us get a shorter info panel that just
// lets the user know we are tracking their focus
const PANEL_OPTIONS = {
  statusPanelView: true
};

// map our listener events to the relevant class we want them to apply
// to the target element
const FOCUS_STATES = {
  [FOCUS_EVENT]: "tota11y-outlined",
  [BLUR_EVENT]: "tota11y-was-focused"
};

// we're going to highlight thos elements that are focusable and those
// that are programmatically focusable
const FOCUSABLE_CLASSES = {
  natural: "tota11y-is-focusable",
  programmatic: "tota11y-is-programmatically-focusable"
};

// we'll use this attribute to store anelement's tab order for our annotations
const TAB_INDEX_ATTRIBUTE = "tota11yTabIndex";

// we'll use this to make sure we don't apply the was-focused
// indicator to our tota11y panels
const IGNORE = "tota11y"

// we're going to attempt to visualize the tab order of the page
// based on the source order of the tabbable elements
// this Array contains our tabbable element selectors
// NOTE: these come primarily from the following sources
//    - https://stackoverflow.com/q/1599660/656011
//    - https://allyjs.io/data-tables/focusable.html
const TABABLE_ELEMENTS = [
    // anchors with an href are the primary naturally focusable elements
    // on any page
    "a[href]:not([tabIndex^=\"-\"])",

    // any inputs or buttons that aren't disabled should be naturally
    // focusable and make up the rest of the common elements we'll be
    // dealing with
    "input:not([disabled]):not([tabIndex^=\"-\"])",
    "select:not([disabled]):not([tabIndex^=\"-\"])",
    "textarea:not([disabled]):not([tabIndex^=\"-\"])",
    "button:not([disabled]):not([tabIndex^=\"-\"])",

    // audio/video elements with controls should be naturally focusable
    // though they are less common
    "audio[controls]:not([tabIndex^=\"-\"])",
    "video[controls]:not([tabIndex^=\"-\"])",

    // these are some more obscure and esoteric elements that are also
    // naturally focusable
    "iframe:not([tabIndex^=\"-\"])",
    "area[href]:not([tabIndex^=\"-\"])",
    "summary:not([tabIndex^=\"-\"])",
    "keygen:not([tabIndex^=\"-\"])",

    // if an element has the contenteditable attribute, a user can focus on
    // it and manipulate its content, this includes elements that normally
    // would not receive focus
    "[contenteditable]:not([tabIndex^=\"-\"])",

    // this gives us any element with a defined tabindex that isn't negative
    // an element with a non-negative tabindex is naturally focusable, but
    // an element with a negative tabindex is only programmatically focusable
    // and will not receive focus during normal tabbing through the page
    "[tabIndex]:not([tabIndex^=\"-\"])",
];

// convenient method to quickly remove any focused element classes this
// plugin applied
// it is outside of the class because it doesn't really need
// to access this and it lets us now worry about binding
// our event handlers
const removeFocusClasses = (element) => {
  element.classList.remove(...Object.values(FOCUS_STATES));
};

// convenient method to quickly remove any focusable element classes this
// plugin applied
// it is outside of the class because it doesn't really need
// to access this and it lets us now worry about binding
// our event handlers
const removeHighlightClasses = (element) => {
  element.classList.remove(...Object.values(FOCUSABLE_CLASSES));
}

require("./style.less");

class FocusTracker extends Plugin {
    constructor(...args) {
        const options = Object.assign({}, args, { panel: PANEL_OPTIONS });

        super(options);

        this.currentTab = 0;

        this.applyFocusClass = this.applyFocusClass.bind(this);
    }

    getTitle() {
        return "Focus Tracker";
    }

    getDescription() {
        return "Keep track of what's been focused as you tab through the page.";
    }

    applyFocusClass(event) {
        // get the event target and event name
        const { target, type } = event;

        // remove any focused or was-focused indicators on the element
        removeFocusClasses(target);

        removeHighlightClasses(target);

        // we want to ignore our tota11y toggle and panel because we only care
        // about the user's regular DOM for this treatment
        const isNotTota11y = !target.closest(`.${IGNORE}`) && !target.classList.contains(IGNORE);

        if (isNotTota11y) {
            // choose the class we want to add to this element
            // based on whether this is the focusin or focusout event
            target.classList.add(FOCUS_STATES[type]);

            // when we focus in, we'll want to make sure we annitate if needed
            if (type === FOCUS_EVENT) {
                const tabOrder = target.dataset[TAB_INDEX_ATTRIBUTE];

                const validTabOrder = !isNaN(parseInt(tabOrder, 10));

                if (!validTabOrder) {
                    this.currentTab++;

                    target.dataset[TAB_INDEX_ATTRIBUTE] = this.currentTab;

                    annotate.label(target, `#${this.currentTab}`);
                }
            }
        }
    }

    // highlight any naturally focusable elements
    highlightNaturallyFocusableElements() {
        const selector = TABABLE_ELEMENTS.join(", ");

        [...document.querySelectorAll(selector)]
            .filter((element) => {
                return !element.closest(`.${IGNORE}`) && !element.classList.contains(IGNORE);
            })
            .forEach((element) => {
                element.classList.add(FOCUSABLE_CLASSES.natural);
            })
        ;
    }

    highlightProgrammaticallyFocusableElements() {
        [...document.querySelectorAll("[tabIndex^=\"-\"]")].forEach((element) => {
            element.classList.add(FOCUSABLE_CLASSES.programmatic);
            annotate.label(element, `tabIndex: ${element.tabIndex}`);
        });
    }

    addHighlights() {
        this.highlightNaturallyFocusableElements();
        this.highlightProgrammaticallyFocusableElements();
    }

    run() {
        // pop up our info panel to let the user know what we're doing
        this.summary("Tracking Focus.");
        this.panel.render();

        // dynamically apply our event listeners by looping through
        // our defined focus states and adding an event handler
        Object.keys(FOCUS_STATES).forEach((key) => {
            document.addEventListener(key, this.applyFocusClass);
        });

        this.addHighlights();
    }

    cleanup() {
        // clear annotations
        annotate.removeAll();

        // dynamically remove our event listeners by looping through
        // our defined focus states and removing the event handler
        Object.keys(FOCUS_STATES).forEach((key) => {
            document.removeEventListener(key, this.applyFocusClass);

            // we'll also want to clean up all of the classes we added
            [...document.querySelectorAll(`.${FOCUS_STATES[key]}`)].forEach((element) => {
                removeFocusClasses(element);
            });
        });

        // clean up our focusable highlights
        Object.keys(FOCUSABLE_CLASSES).forEach((key) => {
            [...document.querySelectorAll(`.${FOCUSABLE_CLASSES[key]}`)].forEach((element) => {
                removeHighlightClasses(element);
            });
        });
    }
}

module.exports = FocusTracker;
