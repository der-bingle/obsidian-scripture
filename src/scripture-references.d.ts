declare module 'scripture-references' {
  // Minimal typing used by this plugin. Expand if you add more API usage.
  export interface PassageMatch {
    ref?: string;
    // additional fields unknown; use `any` where necessary
    [key: string]: any;
  }

  export function detectReferences(text: string): Iterable<PassageMatch>;
  // backward-compatible alias used by older code in this repo
  export const detect_references: typeof detectReferences;

  export class PassageReference {
    constructor(reference: string);
    toString(): string;
    // additional members are `any`
    [key: string]: any;
  }

  export const book_names_english: any;
  export const book_abbrev_english: any;
}
