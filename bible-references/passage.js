var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { parse_int } from "./utils.js";
import {
  books_ordered,
  book_names_english,
  english_abbrev_include,
  english_abbrev_exclude
} from "./data.js";
import { last_verse } from "./last_verse.js";
function _verses_str_to_obj(ref) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  ref = ref.replace(/ /g, "").replace(/\./g, ":").replace(/：/gu, ":").replace(new RegExp("\\p{Dash}", "gu"), "-");
  let start_chapter;
  let start_verse;
  let end_chapter;
  let end_verse;
  if (!ref.includes(":")) {
    const parts = ref.split("-");
    start_chapter = (_a = parse_int(parts[0])) != null ? _a : void 0;
    end_chapter = (_c = parse_int((_b = parts[1]) != null ? _b : "")) != null ? _c : void 0;
  } else {
    const parts = ref.split("-");
    const start_parts = parts[0].split(":");
    start_chapter = (_d = parse_int(start_parts[0])) != null ? _d : void 0;
    start_verse = (_f = parse_int((_e = start_parts[1]) != null ? _e : "")) != null ? _f : void 0;
    if (parts[1]) {
      const end_parts = parts[1].split(":");
      if (end_parts.length > 1) {
        end_chapter = (_g = parse_int(end_parts[0])) != null ? _g : void 0;
        end_verse = (_h = parse_int(end_parts[1])) != null ? _h : void 0;
      } else {
        end_verse = (_i = parse_int(end_parts[0])) != null ? _i : void 0;
      }
    }
  }
  return { start_chapter, start_verse, end_chapter, end_verse };
}
function _detect_book(input, book_names, exclude_book_names = [], match_from_start = true) {
  const clean = (string) => {
    return string.trim().toLowerCase().replace(/^i /, "1").replace("1st ", "1").replace("first ", "1").replace(/^ii /, "2").replace("2nd ", "2").replace("second ", "2").replace(/^iii /, "3").replace("3rd ", "3").replace("third ", "3").replace(/[^\d\p{Letter}]/gui, "");
  };
  input = clean(input);
  if (!input) {
    return null;
  }
  exclude_book_names = exclude_book_names.map((name) => clean(name));
  if (exclude_book_names.includes(input)) {
    return null;
  }
  if (books_ordered.includes(input)) {
    return input;
  }
  const normalised = book_names.map(([code, name]) => [code, clean(name)]).filter(([code, name]) => name);
  const matches = [];
  for (const [code, name] of normalised) {
    if (input === name) {
      return code;
    } else if (name.startsWith(input)) {
      matches.push([code, name]);
    }
  }
  if (matches.length === 1) {
    return matches[0][0];
  } else if (matches.length) {
    return null;
  }
  let input_regex_str = input.split("").join(".{0,4}");
  if (match_from_start) {
    if (["1", "2", "3"].includes(input[0])) {
      input_regex_str = "^" + input[0] + input.slice(1).split("").join(".{0,4}");
    } else {
      input_regex_str = "^" + input_regex_str;
    }
  }
  const input_regex = new RegExp(input_regex_str);
  const fuzzy_matches = normalised.filter(([code, name]) => input_regex.test(name));
  if (fuzzy_matches.length === 1) {
    return fuzzy_matches[0][0];
  }
  return null;
}
class PassageReference {
  constructor(book_or_obj, chapter, verse) {
    __publicField(this, "type");
    __publicField(this, "range");
    __publicField(this, "book");
    __publicField(this, "ot");
    __publicField(this, "nt");
    __publicField(this, "start_chapter");
    __publicField(this, "start_verse");
    __publicField(this, "end_chapter");
    __publicField(this, "end_verse");
    __publicField(this, "args_valid");
    // Whether the original input was valid or not
    __publicField(this, "_args");
    var _a, _b, _c, _d, _e;
    if (typeof book_or_obj !== "string") {
      this._args = {
        book: book_or_obj.book,
        start_chapter: book_or_obj.start_chapter,
        start_verse: book_or_obj.start_verse,
        end_chapter: book_or_obj.end_chapter,
        end_verse: book_or_obj.end_verse
      };
    } else {
      this._args = {
        book: book_or_obj,
        start_chapter: chapter,
        start_verse: verse
      };
    }
    const chapters_given = typeof this._args.start_chapter === "number" || typeof this._args.end_chapter === "number";
    const verses_given = typeof this._args.start_verse === "number" || typeof this._args.end_verse === "number";
    this.book = this._args.book;
    this.start_chapter = (_a = this._args.start_chapter) != null ? _a : 1;
    this.start_verse = (_b = this._args.start_verse) != null ? _b : 1;
    this.end_chapter = (_d = (_c = this._args.end_chapter) != null ? _c : this._args.start_chapter) != null ? _d : 1;
    this.end_verse = (_e = this._args.end_verse) != null ? _e : this._args.end_chapter ? 999 : 1;
    if (books_ordered.indexOf(this.book) === -1) {
      this.book = "gen";
    }
    const last_verse_book = last_verse[this.book];
    if (this.start_chapter < 1) {
      this.start_chapter = 1;
      this.start_verse = 1;
    } else if (this.start_chapter > last_verse_book.length) {
      this.start_chapter = last_verse_book.length;
      this.start_verse = last_verse_book[last_verse_book.length - 1];
    }
    this.start_verse = Math.min(
      Math.max(this.start_verse, 1),
      last_verse_book[this.start_chapter - 1]
    );
    if (this.end_chapter < this.start_chapter || this.end_chapter === this.start_chapter && this.end_verse < this.start_verse) {
      this.end_chapter = this.start_chapter;
      this.end_verse = this.start_verse;
    }
    if (this.end_chapter > last_verse_book.length) {
      this.end_chapter = last_verse_book.length;
      this.end_verse = last_verse_book[last_verse_book.length - 1];
    }
    this.end_verse = Math.min(Math.max(this.end_verse, 1), last_verse_book[this.end_chapter - 1]);
    const chapters_same = this.start_chapter === this.end_chapter;
    const verses_same = this.start_verse === this.end_verse;
    if (chapters_same && verses_same) {
      this.type = chapters_given ? verses_given ? "verse" : "chapter" : "book";
    } else {
      this.type = chapters_same ? "range_verses" : verses_given ? "range_multi" : "range_chapters";
    }
    if (this.type === "range_multi" && this.start_verse === 1 && this.end_verse === last_verse_book[this.end_chapter - 1]) {
      this.type = "range_chapters";
    }
    this.range = this.type.startsWith("range_");
    this.ot = books_ordered.indexOf(this.book) < 39;
    this.nt = !this.ot;
    const determine_args_valid = () => {
      if (this._args.book !== this.book) {
        return false;
      }
      const props = ["start_chapter", "start_verse", "end_chapter", "end_verse"];
      for (const prop of props) {
        if (Number.isInteger(this._args[prop]) && this._args[prop] !== this[prop]) {
          return false;
        }
      }
      if (!this._args.start_chapter && (this._args.end_chapter || this._args.start_verse || this._args.end_verse)) {
        return false;
      }
      if (this._args.end_verse && !this._args.start_verse) {
        return false;
      }
      if (this._args.start_verse && this._args.end_chapter && !this._args.end_verse) {
        return false;
      }
      return true;
    };
    this.args_valid = determine_args_valid();
  }
  // Parse passage reference string
  // book_names can be a list if a single book has multiple names [["gen", "Genesis"], ...]
  static from_string(reference, book_names, exclude_book_names, min_chars = 2, match_from_start = true) {
    if (!book_names) {
      book_names = [...Object.entries(book_names_english), ...english_abbrev_include];
      if (!exclude_book_names) {
        exclude_book_names = [...english_abbrev_exclude];
      }
    }
    const book_names_list = Array.isArray(book_names) ? book_names : Object.entries(book_names);
    reference = reference.trim();
    let verses_start = reference.slice(1).search(/\d/) + 1;
    if (verses_start === 0) {
      verses_start = reference.length;
    }
    const book_str = reference.slice(0, verses_start).trim();
    if (book_str.length < min_chars) {
      return null;
    }
    const book_code = _detect_book(
      book_str,
      book_names_list,
      exclude_book_names,
      match_from_start
    );
    if (!book_code) {
      return null;
    }
    const verses_str = reference.slice(verses_start);
    let verses = _verses_str_to_obj(verses_str);
    const single_chapter = ["2jn", "3jn", "jud", "oba", "phm"].includes(book_code);
    if (single_chapter && verses.start_chapter && verses.start_verse === void 0 && verses.end_verse === void 0) {
      verses = _verses_str_to_obj("1:" + verses_str);
    }
    return new PassageReference(__spreadValues({ book: book_code }, verses));
  }
  // Return a new reference that extends from start of first ref to end of second ref
  static from_refs(start, end) {
    return new PassageReference({
      book: start.book,
      start_chapter: start.start_chapter,
      start_verse: start.start_verse,
      end_chapter: end.end_chapter,
      end_verse: end.end_verse
    });
  }
  // Get name for book (defaults to English when book names not provided)
  get_book_string(book_names = {}) {
    return book_names[this.book] || book_names_english[this.book];
  }
  // Get string representation of verses
  get_verses_string(verse_sep = ":", range_sep = "-") {
    if (this.type === "book") {
      return "";
    } else if (this.type === "chapter") {
      return `${this.start_chapter}`;
    } else if (this.type === "range_chapters") {
      return `${this.start_chapter}${range_sep}${this.end_chapter}`;
    } else if (this.type === "verse") {
      return `${this.start_chapter}${verse_sep}${this.start_verse}`;
    }
    let out = `${this.start_chapter}${verse_sep}${this.start_verse}${range_sep}`;
    if (this.end_chapter !== this.start_chapter) {
      out += `${this.end_chapter}${verse_sep}`;
    }
    return out + `${this.end_verse}`;
  }
  // Format passage reference to a readable string
  toString(book_names = {}, verse_sep = ":", range_sep = "-") {
    const out = this.get_book_string(book_names) + " " + this.get_verses_string(verse_sep, range_sep);
    return out.trim();
  }
  // Whether this reference ends before the given chapter/verse or not
  is_before(chapter, verse) {
    return this.end_chapter < chapter || this.end_chapter === chapter && this.end_verse < verse;
  }
  // Whether this reference starts after the given chapter/verse or not
  is_after(chapter, verse) {
    return this.start_chapter > chapter || this.start_chapter === chapter && this.start_verse > verse;
  }
  // Whether this reference includes the given chapter/verse or not
  includes(chapter, verse) {
    return !this.is_before(chapter, verse) && !this.is_after(chapter, verse);
  }
  // Get a reference for just the start verse of this reference (no effect if single verse)
  get_start() {
    return new PassageReference({
      book: this.book,
      start_chapter: this.start_chapter,
      start_verse: this.start_verse
    });
  }
  // Get a reference for just the end verse of this reference (no effect if single verse)
  get_end() {
    return new PassageReference({
      book: this.book,
      start_chapter: this.end_chapter,
      start_verse: this.end_verse
    });
  }
  // Get a reference for the verse previous to this one (accounting for chapters)
  // It can optionally be relative to the end verse, but a range is never returned (single verse)
  get_prev_verse(prev_to_end = false) {
    let chapter = prev_to_end ? this.end_chapter : this.start_chapter;
    let verse = prev_to_end ? this.end_verse : this.start_verse;
    if (chapter === 1 && verse === 1) {
      return null;
    }
    if (verse === 1) {
      chapter -= 1;
      verse = last_verse[this.book][chapter - 1];
    } else {
      verse -= 1;
    }
    return new PassageReference({
      book: this.book,
      start_chapter: chapter,
      start_verse: verse
    });
  }
  // Get a reference for the verse after this one (accounting for chapters)
  // It can optionally be relative to the end verse, but a range is never returned (single verse)
  get_next_verse(after_end = false) {
    let chapter = after_end ? this.end_chapter : this.start_chapter;
    let verse = after_end ? this.end_verse : this.start_verse;
    const last_verse_book = last_verse[this.book];
    if (chapter === last_verse_book.length && verse === last_verse_book[last_verse_book.length - 1]) {
      return null;
    }
    if (verse === last_verse_book[chapter - 1]) {
      chapter += 1;
      verse = 1;
    } else {
      verse += 1;
    }
    return new PassageReference({
      book: this.book,
      start_chapter: chapter,
      start_verse: verse
    });
  }
}
export {
  PassageReference,
  _detect_book,
  _verses_str_to_obj
};
//# sourceMappingURL=passage.js.map
