import { setupRenderingTest } from "discourse/tests/helpers/component-test";
import { discourseModule, exists } from "discourse/tests/helpers/qunit-helpers";
import hbs from "htmlbars-inline-precompile";
import { render } from "@ember/test-helpers";
import { test } from "qunit";
import { withPluginApi } from "discourse/lib/plugin-api";
import { resetPostSmallActionClassesCallbacks } from "discourse/widgets/post-small-action";

discourseModule(
  "Discourse Assign | Integration | Widget | Small Action Post Class",
  function (hooks) {
    setupRenderingTest(hooks);

    test("Adds private-assign class when assigns are not public", async function (assert) {
      try {
        this.siteSettings.assigns_public = false;

        this.set("args", {
          id: 10,
          actionCode: "assigned",
        });

        withPluginApi("1.6.0", (api) => {
          api.addPostSmallActionClassesCallback((post) => {
            if (
              post.actionCode.includes("assigned") &&
              !this.siteSettings.assigns_public
            ) {
              return ["private-assign"];
            }
          });
        });

        await render(
          hbs`<MountWidget @widget="post-small-action" @args={{this.args}} />`
        );

        assert.ok(exists(".small-action.private-assign"));
      } finally {
        resetPostSmallActionClassesCallbacks();
      }
    });

    test("Does not add private-assign class when assigns are public", async function (assert) {
      try {
        this.siteSettings.assigns_public = true;

        this.set("args", {
          id: 10,
          actionCode: "assigned",
        });

        withPluginApi("1.6.0", (api) => {
          api.addPostSmallActionClassesCallback((post) => {
            if (
              post.actionCode.includes("assigned") &&
              !this.siteSettings.assigns_public
            ) {
              return ["private-assign"];
            }
          });
        });

        await render(
          hbs`<MountWidget @widget="post-small-action" @args={{this.args}} />`
        );

        assert.ok(!exists(".small-action.private-assign"));
      } finally {
        resetPostSmallActionClassesCallbacks();
      }
    });
  }
);
