import { debounce } from "@ember/runloop";

// TODO: Remove this file and use discouseDebounce after the 2.7 release.
let debounceFunction = debounce;

try {
  debounceFunction = require("discourse-common/lib/debounce").default;
} catch (_) {}

export default debounceFunction;
