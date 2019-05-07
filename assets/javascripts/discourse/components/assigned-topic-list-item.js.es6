import computed from "ember-addons/ember-computed-decorators";
import { ListItemDefaults } from "discourse/components/topic-list-item";

const privateMessageHelper = {
  @computed("topic.archetype")
  isPrivateMessage(archetype) {
    return archetype === "private_message";
  }
};

export default Ember.Component.extend(ListItemDefaults, privateMessageHelper);
