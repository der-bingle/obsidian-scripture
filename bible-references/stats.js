import { last_verse } from "./last_verse.js";
function get_chapters(book) {
  return [...Array(last_verse[book].length).keys()].map((i) => i + 1);
}
function get_verses(book, chapter) {
  return [...Array(last_verse[book][chapter - 1]).keys()].map((i) => i + 1);
}
export {
  get_chapters,
  get_verses
};
//# sourceMappingURL=stats.js.map
