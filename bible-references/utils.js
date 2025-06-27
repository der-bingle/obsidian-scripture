function parse_int(input, min, max) {
  let int = parseInt(input, 10);
  if (Number.isNaN(int)) {
    return null;
  }
  if (min !== void 0) {
    int = Math.max(int, min);
  }
  if (max !== void 0) {
    int = Math.min(int, max);
  }
  return int;
}
export {
  parse_int
};
//# sourceMappingURL=utils.js.map
