import { ajax } from "discourse/lib/ajax";
import Route from "@ember/routing/route";

export default Route.extend({
  model() {
    return ajax(`/groups/${this.modelFor("group").get("name")}/members.json`, { data: {offset: 0, order:null, asc:true, filter:null} });
  },

  afterModel() {
    this.transitionTo("group.assignments.show", "everyone");
  }
});