declare module 'scripture-references' {
  // Minimal typing used by this plugin. Expand if you add more API usage.
  export interface PassageMatch {
    ref: PassageReference;
    text: string;
    index: number;
    index_from_prev_match: number;
    whole: boolean;
  }

  export function detectReferences(text: string): Iterable<PassageMatch>;
  // backward-compatible alias used by older code in this repo
  export const detect_references: typeof detectReferences;

  export class PassageReference {
    constructor(reference: string | {
      book: string;
      start_chapter?: number;
      start_verse?: number;
      end_chapter?: number;
      end_verse?: number;
    }, chapter?: number, verse?: number);
    book: string;
    start_chapter: number;
    start_verse: number;
    end_chapter: number;
    end_verse: number;
    type: 'book' | 'chapter' | 'range_chapters' | 'verse' | 'range_verses' | 'range_multi';
    args_valid: boolean;
    getBookName(): string;
    getVersesString(verseSep?: string, rangeSep?: string): string;
    toString(verseSep?: string, rangeSep?: string): string;
  }

  export const book_names_english: Record<string, string>;
  export const book_abbrev_english: Record<string, string> | Array<string | [string, string] | { name?: string; book?: string; title?: string; full?: string; long?: string; abbrev?: string; abbreviation?: string; abbr?: string; short?: string }>;
}
