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
	filePath: string;
	isValid?: boolean;
	errorMessage?: string;
}

// Plugin settings interface
export interface BibleReferenceSettings {
	translations: BibleTranslation[];
	defaultTranslation: string;
	verseNumbers: 'include' | 'exclude' | 'exclude-first';
	translationDisplay: 'never' | 'always' | 'except-default';
}

// Default settings
export const DEFAULT_SETTINGS: BibleReferenceSettings = {
	translations: [],
	defaultTranslation: '',
	verseNumbers: 'exclude',
	translationDisplay: 'except-default'
};

// Modal callback type
export type OnSubmitCallback = (reference: string, verses: BibleVerse[], translation: string) => void;
