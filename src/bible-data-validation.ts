import type { BibleData } from './types';

export interface BibleDataValidationResult {
	isValid: boolean;
	errorMessage?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === 'string' && value.trim().length > 0;

const isNonNegativeInteger = (value: unknown): value is number =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isPositiveInteger = (value: unknown): value is number =>
	typeof value === 'number' && Number.isInteger(value) && value > 0;

const invalid = (errorMessage: string): BibleDataValidationResult => ({ isValid: false, errorMessage });

export const validateBibleData = (data: unknown): BibleDataValidationResult => {
	if (!isRecord(data)) return invalid('Bible data must be an object');
	if (!isNonEmptyString(data.translation)) return invalid('translation must be a non-empty string');
	if (!Array.isArray(data.books) || data.books.length === 0) return invalid('books must be a non-empty array');

	const bookIds = new Set<string>();
	const bookNumbers = new Set<number>();

	for (const [bookIndex, rawBook] of data.books.entries()) {
		const path = `books[${bookIndex}]`;
		if (!isRecord(rawBook)) return invalid(`${path} must be an object`);
		if (!isNonEmptyString(rawBook.id)) return invalid(`${path}.id must be a non-empty string`);
		if (!isNonEmptyString(rawBook.title)) return invalid(`${path}.title must be a non-empty string`);
		if (!isPositiveInteger(rawBook.bookNumber)) return invalid(`${path}.bookNumber must be a positive integer`);
		if (!isNonEmptyString(rawBook.testament)) return invalid(`${path}.testament must be a non-empty string`);
		if (!Array.isArray(rawBook.abbreviations) || !rawBook.abbreviations.every(isNonEmptyString)) {
			return invalid(`${path}.abbreviations must contain only non-empty strings`);
		}
		if (!Array.isArray(rawBook.chapters) || rawBook.chapters.length === 0) {
			return invalid(`${path}.chapters must be a non-empty array`);
		}
		if (bookIds.has(rawBook.id)) return invalid(`Duplicate book id: ${rawBook.id}`);
		if (bookNumbers.has(rawBook.bookNumber)) return invalid(`Duplicate book number: ${rawBook.bookNumber}`);
		bookIds.add(rawBook.id);
		bookNumbers.add(rawBook.bookNumber);

		const chapterIds = new Set<string>();
		const chapterNumbers = new Set<number>();
		for (const [chapterIndex, rawChapter] of rawBook.chapters.entries()) {
			const chapterPath = `${path}.chapters[${chapterIndex}]`;
			if (!isRecord(rawChapter)) return invalid(`${chapterPath} must be an object`);
			if (!isNonEmptyString(rawChapter.id)) return invalid(`${chapterPath}.id must be a non-empty string`);
			if (!isNonEmptyString(rawChapter.book) || rawChapter.book !== rawBook.title) {
				return invalid(`${chapterPath}.book must match ${rawBook.title}`);
			}
			if (!isPositiveInteger(rawChapter.chapter)) return invalid(`${chapterPath}.chapter must be a positive integer`);
			if (!isNonNegativeInteger(rawChapter.verseCount)) return invalid(`${chapterPath}.verseCount must be a non-negative integer`);
			if (!isNonNegativeInteger(rawChapter.wordCount)) return invalid(`${chapterPath}.wordCount must be a non-negative integer`);
			if (!Array.isArray(rawChapter.verses)) return invalid(`${chapterPath}.verses must be an array`);
			if (rawChapter.verseCount !== rawChapter.verses.length) {
				return invalid(`${chapterPath}.verseCount does not match verses.length`);
			}
			if (chapterIds.has(rawChapter.id)) return invalid(`Duplicate chapter id: ${rawChapter.id}`);
			if (chapterNumbers.has(rawChapter.chapter)) return invalid(`Duplicate chapter number in ${rawBook.title}: ${rawChapter.chapter}`);
			chapterIds.add(rawChapter.id);
			chapterNumbers.add(rawChapter.chapter);

			const verseIds = new Set<string>();
			const verseNumbers = new Set<number>();
			for (const [verseIndex, rawVerse] of rawChapter.verses.entries()) {
				const versePath = `${chapterPath}.verses[${verseIndex}]`;
				if (!isRecord(rawVerse)) return invalid(`${versePath} must be an object`);
				if (!isNonEmptyString(rawVerse.id)) return invalid(`${versePath}.id must be a non-empty string`);
				if (!isNonEmptyString(rawVerse.book) || rawVerse.book !== rawBook.title) {
					return invalid(`${versePath}.book must match ${rawBook.title}`);
				}
				if (rawVerse.chapter !== rawChapter.chapter) return invalid(`${versePath}.chapter must match its chapter`);
				if (!isPositiveInteger(rawVerse.verse)) return invalid(`${versePath}.verse must be a positive integer`);
				if (!Array.isArray(rawVerse.content) || !rawVerse.content.every(value => typeof value === 'string')) {
					return invalid(`${versePath}.content must contain only strings`);
				}
				if (rawVerse.newParagraph !== undefined && rawVerse.newParagraph !== null && typeof rawVerse.newParagraph !== 'boolean') {
					return invalid(`${versePath}.newParagraph must be boolean when provided`);
				}
				if (rawVerse.poetry !== undefined && rawVerse.poetry !== null && typeof rawVerse.poetry !== 'boolean') {
					return invalid(`${versePath}.poetry must be boolean when provided`);
				}
				if (verseIds.has(rawVerse.id)) return invalid(`Duplicate verse id: ${rawVerse.id}`);
				if (verseNumbers.has(rawVerse.verse)) return invalid(`Duplicate verse number in ${rawChapter.id}: ${rawVerse.verse}`);
				verseIds.add(rawVerse.id);
				verseNumbers.add(rawVerse.verse);
			}
		}
	}

	return { isValid: true };
};

export const isBibleData = (data: unknown): data is BibleData => validateBibleData(data).isValid;
