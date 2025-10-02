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
	linkingStrategy: 'default-translation' | 'verse-translation';
	includeHiddenLinks: boolean;
	/** Default for the insert modal: whether to include verse numbers when inserting multi-verse callouts */
	includeVerseNumbersOnInsert: boolean;
	calloutFolding: 'not-foldable' | 'foldable-expanded' | 'foldable-collapsed';
	verseNumbersVisible: boolean;
	verseNumberDisplayMode: 'first' | 'all';
}

// Default settings
export const DEFAULT_SETTINGS: ScriptureSettings = {
	translations: [],
	defaultTranslation: '',
	verseNumbers: 'exclude',
	translationDisplay: 'except-default',
	linkingStrategy: 'default-translation',
	includeHiddenLinks: false,
	includeVerseNumbersOnInsert: false,
	calloutFolding: 'not-foldable',
	verseNumbersVisible: true,
	verseNumberDisplayMode: 'first'
};

// Modal callback type
export type OnSubmitCallback = (reference: string, verses: BibleVerse[], translation: string, includeVerseNumbers: boolean) => void;

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
}