// Core Bible data structure interfaces
export interface BibleVerse {
	id: string;
	book: string;
	chapter: number;
	verse: number;
	content: string[];
	newParagraph?: boolean;
	poetry?: boolean;
}

export interface BibleData {
	translation: string;
	books: BibleBook[];
}

export interface BibleBook {
	id: string;
	title: string;
	bookNumber: number;
	testament: string;
	abbreviations: string[];
	chapters: BibleChapter[];
}

export interface BibleChapter {
	id: string;
	book: string;
	chapter: number;
	verseCount: number;
	wordCount: number;
	verses: BibleVerseData[];
}

export interface BibleVerseData {
	id: string;
	book: string;
	chapter: number;
	verse: number;
	content: string[];
	newParagraph: boolean;
	poetry: boolean;
}

// Translation configuration
export interface BibleTranslation {
	name: string;
	fullName: string;
	filePath: string;
	availableAsNotes?: boolean;
	notesDirectory?: string;
	isValid?: boolean;
	errorMessage?: string;
}

// Plugin settings interface
export interface ScriptureSettings {
	translations: BibleTranslation[];
	defaultTranslation: string;
	verseNumbers: 'include' | 'exclude' | 'exclude-first';
	translationDisplay: 'never' | 'always' | 'except-default';
	referenceFormat: 'full-name' | 'standard-abbrev' | 'english-abbrev' | 'chapter-verse';
	scriptureListReferenceFormat: 'full-name' | 'standard-abbrev' | 'english-abbrev' | 'chapter-verse';
	linkingStrategy: 'default-translation' | 'verse-translation';
	includeHiddenLinks: boolean;
	/** Default for the insert modal: whether to include verse numbers when inserting multi-verse callouts */
	includeVerseNumbersOnInsert: boolean;
	calloutFolding: 'not-foldable' | 'foldable-expanded' | 'foldable-collapsed';
	verseNumbersVisible: boolean;
	verseNumberDisplayMode: 'first' | 'all';
	bibleNoteTabTitleMode: 'never' | 'duplicates-only' | 'always';
}

// Default settings
export const DEFAULT_SETTINGS: ScriptureSettings = {
	translations: [],
	defaultTranslation: '',
	verseNumbers: 'exclude',
	translationDisplay: 'except-default',
	referenceFormat: 'full-name',
	scriptureListReferenceFormat: 'full-name',
	linkingStrategy: 'default-translation',
	includeHiddenLinks: false,
	includeVerseNumbersOnInsert: false,
	calloutFolding: 'not-foldable',
	verseNumbersVisible: true,
	verseNumberDisplayMode: 'first',
	bibleNoteTabTitleMode: 'duplicates-only'
};

// Modal callback type
export type OnSubmitCallback = (
	reference: string,
	verses: BibleVerse[],
	translation: string,
	includeVerseNumbers: boolean,
	insertAsPlainText: boolean,
	referenceFormat: 'full-name' | 'standard-abbrev' | 'english-abbrev' | 'chapter-verse'
) => void;

// Scripture list renderer interface
export interface ProcessedReference {
	originalInput: string;
	parsedReference: string;
	translation: string;
	highlighted?: boolean;
	verses?: BibleVerse[];
	testament?: 'OLD' | 'NEW';
	bookNumber?: number;
	isChapterReference?: boolean;
	error?: string;
}

// Public API interface for plugin interoperability
export interface ScriptureAPI {
	/**
	 * Get the currently configured primary/default translation
	 * @returns The translation object, or null if none configured
	 */
	getPrimaryTranslation(): BibleTranslation | null;

	/**
	 * Get all configured Bible translations
	 * @returns Array of all configured translations
	 */
	getAvailableTranslations(): BibleTranslation[];

	/**
	 * Get settings for a specific translation
	 * @param translationId - The translation ID to look up
	 * @returns Translation object if found, null otherwise
	 */
	getTranslationSettings(translationId: string): BibleTranslation | null;

	/**
	 * Format a verse reference into proper Obsidian link format
	 * @param book - Book name or abbreviation
	 * @param chapter - Chapter number
	 * @param verse - Optional verse number
	 * @param translation - Optional translation ID (uses primary if not provided)
	 * @returns Formatted Obsidian link string
	 */
	formatVerseReference(book: string, chapter: number, verse?: number, translation?: string): string;

	/**
	 * Parse scripture references from text
	 * @param text - Text to parse for scripture references
	 * @returns Object with parsed reference and detected translation
	 */
	parseScriptureReference(text: string): { reference: string; translation: string | null };

	/**
	 * Normalize book name variations and abbreviations to standard form
	 * @param bookName - Book name or abbreviation to normalize
	 * @returns Normalized book name, or original if not recognized
	 */
	normalizeBookName(bookName: string): string;

	/**
	 * Resolve scripture input to a chapter note target without opening it.
	 * @param input - Scripture reference input (e.g., "John 3:16 NLT")
	 * @returns Resolved target metadata or null when no chapter note can be resolved
	 */
	resolveScriptureNote(input: string): Promise<{ reference: string; translation: string; path: string; anchor?: string } | null>;

	/**
	 * Parse and open a scripture chapter note.
	 * @param input - Scripture reference input (e.g., "John 3:16 NLT")
	 * @param options - Optional open behavior
	 * @returns true when a note was opened, false otherwise
	 */
	openScriptureNote(input: string, options?: { openInNewLeaf?: boolean; silent?: boolean }): Promise<boolean>;
}
