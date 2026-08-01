// Core Bible data structure interfaces
export interface BibleVerse {
	id: string;
	book: string;
	chapter: number;
	verse: number;
	content: string[];
	newParagraph?: boolean | null;
	poetry?: boolean | null;
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
	newParagraph?: boolean;
	poetry?: boolean;
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

export type ReferenceFormat = 'full-name' | 'standard-abbrev' | 'english-abbrev' | 'chapter-verse';
export type InsertScriptureFormat = 'scripture-callout' | 'plain-text';
export type LinkPathFormat = 'configured-path' | 'basename';
export type ScriptureSidebarSide = 'left' | 'right';

export interface ScriptureSidebarState {
	instanceId: string;
	translation: string;
	bookId: string;
	chapter: number;
	anchorVerse: number;
	anchorOffset: number;
	side: ScriptureSidebarSide;
	lastUsedAt: number;
}

// Plugin settings interface
export interface ScriptureSettings {
	translations: BibleTranslation[];
	defaultTranslation: string;
	insertScriptureFormat: InsertScriptureFormat;
	verseNumbers: 'include' | 'exclude' | 'exclude-first';
	translationDisplay: 'never' | 'always' | 'except-default';
	calloutReferenceFormat: ReferenceFormat;
	linkReferenceFormat: ReferenceFormat;
	scriptureListReferenceFormat: ReferenceFormat;
	scriptureListReformatSource: boolean;
	scriptureListSourceReferenceFormat: ReferenceFormat;
	scriptureListReorderSourceByBook: boolean;
	linkingStrategy: 'default-translation' | 'verse-translation';
	linkPathFormat: LinkPathFormat;
	includeHiddenLinks: boolean;
	/** Default for the insert modal: whether to include verse numbers when inserting multi-verse callouts */
	includeVerseNumbersOnInsert: boolean;
	calloutFolding: 'not-foldable' | 'foldable-expanded' | 'foldable-collapsed';
	verseNumbersVisible: boolean;
	verseNumberDisplayMode: 'first' | 'all';
	bibleNoteTabTitleMode: 'never' | 'duplicates-only' | 'always';
	sidebarDefaultTranslation: string;
	lastSidebarState: ScriptureSidebarState | null;
}

// Default settings
export const DEFAULT_SETTINGS: ScriptureSettings = {
	translations: [],
	defaultTranslation: '',
	insertScriptureFormat: 'scripture-callout',
	verseNumbers: 'exclude',
	translationDisplay: 'except-default',
	calloutReferenceFormat: 'full-name',
	linkReferenceFormat: 'standard-abbrev',
	scriptureListReferenceFormat: 'full-name',
	scriptureListReformatSource: false,
	scriptureListSourceReferenceFormat: 'standard-abbrev',
	scriptureListReorderSourceByBook: false,
	linkingStrategy: 'default-translation',
	linkPathFormat: 'configured-path',
	includeHiddenLinks: false,
	includeVerseNumbersOnInsert: false,
	calloutFolding: 'not-foldable',
	verseNumbersVisible: true,
	verseNumberDisplayMode: 'first',
	bibleNoteTabTitleMode: 'duplicates-only',
	sidebarDefaultTranslation: '',
	lastSidebarState: null
};

// Modal callback type
export type OnSubmitCallback = (
	reference: string,
	verses: BibleVerse[],
	translation: string,
	includeVerseNumbers: boolean,
	insertScriptureFormat: InsertScriptureFormat,
	referenceFormat: ReferenceFormat
) => void;

// Scripture list renderer interface
export interface ProcessedReference {
	originalInput: string;
	parsedReference: string;
	translation: string;
	highlighted?: boolean;
	highlightMarker?: string;
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
	 * @returns Primary translation first, followed by all others alphabetically by short name
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

	/**
	 * Build a formatted scripture callout block without touching an editor.
	 * Applies the user's current callout settings (verse numbers, folding,
	 * reference format, hidden links) unless explicitly overridden.
	 * @param reference - Scripture reference input (e.g., "Luke 15:1-2", "John 3:16 NLT")
	 * @param options - Optional overrides; omitted values fall back to settings
	 * @returns The callout text, or null when the reference cannot be resolved
	 */
	getScriptureCallout(reference: string, options?: ScriptureCalloutOptions): Promise<string | null>;

	/**
	 * Batch form of {@link ScriptureAPI.getScriptureCallout}.
	 * Never throws for individual failures — unresolvable references come back
	 * with a null callout and an error message.
	 * @param references - Scripture reference inputs
	 * @param options - Optional overrides applied to every reference
	 */
	getScriptureCallouts(references: string[], options?: ScriptureCalloutOptions): Promise<ScriptureCalloutResult[]>;
}

export interface ScriptureCalloutOptions {
	/** Translation name (e.g., "CSB"). Defaults to the reference's own suffix, then the default translation. */
	translation?: string;
	/** Force verse numbers on or off. Omit to use the `verseNumbers` setting. */
	includeVerseNumbers?: boolean;
	/** Override the callout reference format. Omit to use `calloutReferenceFormat`. */
	referenceFormat?: ReferenceFormat;
}

export interface ScriptureCalloutResult {
	/** The reference as supplied by the caller */
	reference: string;
	/** The formatted callout, or null when the reference could not be resolved */
	callout: string | null;
	/** Why the reference failed to resolve, when applicable */
	error?: string;
}
