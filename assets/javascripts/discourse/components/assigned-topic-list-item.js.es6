import DiscourseURL from "discourse/lib/url";
import computed from "ember-addons/ember-computed-decorators";
import { wantsNewWindow } from "discourse/lib/intercept-click";

export function showEntrance(e) {
  let target = $(e.target);

  if (target.hasClass("posts-map") || target.parents(".posts-map").length > 0) {
    if (target.prop("tagName") !== "A") {
      target = target.find("a");
      if (target.length === 0) {
        target = target.end();
      }
    }

    this.appEvents.trigger("topic-entrance:show", {
      topic: this.get("topic"),
      position: target.offset()
    });
    return false;
  }
}

export function navigateToTopic(topic, href) {
  this.appEvents.trigger("header:update-topic", topic);
  DiscourseURL.routeTo(href || topic.get("url"));
  return false;
}

export default Ember.Component.extend({
  tagName: "tr",
  classNameBindings: [":topic-list-item", "unboundClassNames", "topic.visited"],
  attributeBindings: ["data-topic-id"],
  "data-topic-id": Ember.computed.alias("topic.id"),

  @computed
  newDotText() {
    return this.currentUser && this.currentUser.trust_level > 0
      ? ""
      : I18n.t("filters.new.lower_title");
  },

  actions: {
    toggleBookmark() {
      this.get("topic").toggleBookmark();
    }
  },

  @computed("topic", "lastVisitedTopic")
  unboundClassNames(topic, lastVisitedTopic) {
    let classes = [];

    if (topic.get("category")) {
      classes.push("category-" + topic.get("category.fullSlug"));
    }

    if (topic.get("tags")) {
      topic.get("tags").forEach(tagName => classes.push("tag-" + tagName));
    }

    if (topic.get("hasExcerpt")) {
      classes.push("has-excerpt");
    }

    if (topic.get("unseen")) {
      classes.push("unseen-topic");
    }

    if (topic.get("displayNewPosts")) {
      classes.push("new-posts");
    }

    ["liked", "archived", "bookmarked", "pinned", "closed"].forEach(name => {
      if (topic.get(name)) {
        classes.push(name);
      }
    });

    if (topic === lastVisitedTopic) {
      classes.push("last-visit");
    }

    return classes.join(" ");
  },

  hasLikes: function() {
    return this.get("topic.like_count") > 0;
  },

  hasOpLikes: function() {
    return this.get("topic.op_like_count") > 0;
  },

  @computed
  expandPinned: function() {
    const pinned = this.get("topic.pinned");
    if (!pinned) {
      return false;
    }

    if (this.site.mobileView) {
      if (!this.siteSettings.show_pinned_excerpt_mobile) {
        return false;
      }
    } else {
      if (!this.siteSettings.show_pinned_excerpt_desktop) {
        return false;
      }
    }

    if (this.get("expandGloballyPinned") && this.get("topic.pinned_globally")) {
      return true;
    }

    if (this.get("expandAllPinned")) {
      return true;
    }

    return false;
  },

  showEntrance,

  click(e) {
    const result = this.showEntrance(e);
    if (result === false) {
      return result;
    }

    const topic = this.get("topic");
    const target = $(e.target);
    if (target.hasClass("bulk-select")) {
      const selected = this.get("selected");

      if (target.is(":checked")) {
        selected.addObject(topic);
      } else {
        selected.removeObject(topic);
      }
    }

    if (target.hasClass("raw-topic-link")) {
      if (wantsNewWindow(e)) {
        return true;
      }
      return this.navigateToTopic(topic, target.attr("href"));
    }

    if (target.closest("a.topic-status").length === 1) {
      this.get("topic").togglePinnedForUser();
      return false;
    }

    return this.unhandledRowClick(e, topic);
  },

  navigateToTopic,

  // Can be overwritten by plugins to handle clicks on other parts of the row
  unhandledRowClick() {},

  highlight(opts = { isLastViewedTopic: false }) {
    const $topic = this.$();
    $topic
      .addClass("highlighted")
      .attr("data-islastviewedtopic", opts.isLastViewedTopic);

    $topic.on("animationend", () => $topic.removeClass("highlighted"));
  },

  _highlightIfNeeded: function() {
    // highlight the last topic viewed
    if (this.session.get("lastTopicIdViewed") === this.get("topic.id")) {
      this.session.set("lastTopicIdViewed", null);
      this.highlight({ isLastViewedTopic: true });
    } else if (this.get("topic.highlight")) {
      // highlight new topics that have been loaded from the server or the one we just created
      this.set("topic.highlight", false);
      this.highlight();
    }
  }.on("didInsertElement")
});
