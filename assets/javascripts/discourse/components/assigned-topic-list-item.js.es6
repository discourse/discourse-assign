import { ListItemDefaults } from "discourse/components/topic-list-item";
import computed from "ember-addons/ember-computed-decorators";

const privateMessageHelper = {
  @computed("topic.archetype")
  isPrivateMessage(archetype) {
    return archetype === "private_message";
  }
};

export default Ember.Component.extend(ListItemDefaults, privateMessageHelper);
