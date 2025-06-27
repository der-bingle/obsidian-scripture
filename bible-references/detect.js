import { PassageReference } from "./passage.js";
const regex_verse_sep = "[:\uFF1A\\.]";
const regex_book_num_prefix = "(?:(?:[123]|I{1,3}) ? ?)?";
const regex_book_name_tmpl = "\\p{Letter}[\\p{Letter}\\p{Dash} ]{MIN_MID,16}END_LETTER\\.? ? ?";
const regex_integer_with_opt_sep = "\\d{1,3}[abc]?(?: ? ?" + regex_verse_sep + " ? ?\\d{1,3}[abc]?)?";
const regex_verse_range = regex_integer_with_opt_sep + "(?: ? ?\\p{Dash} ? ?" + regex_integer_with_opt_sep + ")?";
const regex_trailing = "(?![\\d\\p{Letter}@#$%])";
const regex_between_ranges = " ? ?[,;] ? ?";
const regex_additional_range = regex_between_ranges + "(" + regex_verse_range + ")" + regex_trailing;
function* detect_references(text, book_names, exclude_book_names, min_chars = 2, match_from_start = true) {
  const from_string = (value) => {
    return PassageReference.from_string(
      value,
      book_names,
      exclude_book_names,
      min_chars,
      match_from_start
    );
  };
  const regex_book_name = regex_book_name_tmpl.replace("MIN_MID", String(Math.max(0, min_chars - 2))).replace("END_LETTER", min_chars > 1 ? "\\p{Letter}" : "");
  const regex_complete = regex_book_num_prefix + regex_book_name + regex_verse_range + regex_trailing;
  const regex_book_check = regex_between_ranges + "(" + regex_book_num_prefix + regex_book_name + ")";
  const regex = new RegExp(regex_complete, "uig");
  let end_of_prev_match = 0;
  while (true) {
    const match = regex.exec(text);
    if (!match) {
      return null;
    }
    const ref = from_string(match[0]);
    if (ref && ref.args_valid) {
      yield {
        ref,
        text: match[0],
        index: match.index,
        index_from_prev_match: match.index - end_of_prev_match
      };
      end_of_prev_match = match.index + match[0].length;
      const add_regex = new RegExp(regex_additional_range, "uiy");
      add_regex.lastIndex = regex.lastIndex;
      while (true) {
        const book_look_ahead = new RegExp(regex_book_check, "uiy");
        book_look_ahead.lastIndex = add_regex.lastIndex;
        const possible_book = book_look_ahead.exec(text);
        if (possible_book && from_string(possible_book[1])) {
          break;
        }
        const add_match = add_regex.exec(text);
        if (!add_match) {
          break;
        }
        const add_match_real_index = add_match.index + add_match[0].indexOf(add_match[1]);
        let prefix = ref.book;
        const has_verse_sep = new RegExp(regex_verse_sep).test(add_match[1]);
        if (!has_verse_sep && ["verse", "range_verses", "range_multi"].includes(ref.type)) {
          prefix += `${ref.end_chapter}:`;
        }
        const add_ref = from_string(prefix + add_match[1]);
        if (!add_ref || !add_ref.args_valid) {
          break;
        }
        yield {
          ref: add_ref,
          text: add_match[1],
          index: add_match_real_index,
          index_from_prev_match: add_match_real_index - end_of_prev_match
        };
        end_of_prev_match = add_match_real_index + add_match[1].length;
        if (add_regex.lastIndex > regex.lastIndex) {
          regex.lastIndex = add_regex.lastIndex;
        }
      }
    } else {
      const chars_to_next_word = match[0].indexOf(" ", 1);
      if (chars_to_next_word >= 1) {
        regex.lastIndex -= match[0].length - chars_to_next_word - 1;
      }
    }
  }
}
export {
  detect_references
};
//# sourceMappingURL=detect.js.map
