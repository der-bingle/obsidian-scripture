import { detectReferences } from 'scripture-references';
import type { PassageReference } from 'scripture-references';
import type { BibleTranslation, BibleVerse } from './types';
import type { BibleDataLoader } from './bible-data-loader';

export interface ResolvedScriptureReference {
	ref: PassageReference;
	verses: BibleVerse[];
}

/**
 * Resolve a parsed passage reference into verse records.
 * Returns an empty array when the book, chapter, or verse range cannot be found.
 */
export async function lookupVerses(
	dataLoader: BibleDataLoader,
	translation: BibleTranslation,
	ref: PassageReference
): Promise<BibleVerse[]> {
	const bibleData = await dataLoader.loadTranslation(translation);
	if (!bibleData) {
		throw new Error(`Failed to load translation: ${translation.name}`);
	}

	const verses: BibleVerse[] = [];

	// Convert book ID to our format (e.g., 'jhn' -> 'JHN')
	const bookCode = ref.book.toUpperCase();

	const chapter = ref.start_chapter;
	const startVerse = ref.start_verse;
	const isChapterReference = ref.type === 'chapter';

	// Find the book in the books array
	const book = bibleData.books.find(b => b.id === bookCode);
	if (!book) {
		return [];
	}

	// Find the chapter
	if (!book.chapters || !Array.isArray(book.chapters)) {
		return [];
	}

	const chapterData = book.chapters.find(c => c.chapter === chapter);
	if (!chapterData) {
		return [];
	}

	// Find the verses
	if (!chapterData.verses || !Array.isArray(chapterData.verses)) {
		return [];
	}

	const endVerse = isChapterReference
		? chapterData.verses[chapterData.verses.length - 1]?.verse
		: (ref.end_verse || ref.start_verse);
	const lookupStartVerse = isChapterReference ? chapterData.verses[0]?.verse : startVerse;
	if (!lookupStartVerse || !endVerse) {
		return [];
	}

	for (let verseNum = lookupStartVerse; verseNum <= endVerse; verseNum++) {
		const verseData = chapterData.verses.find(v => v.verse === verseNum);
		if (verseData) {
			// Convert to our expected BibleVerse format
			const bibleVerse: BibleVerse = {
				id: verseData.id,
				book: verseData.book,
				chapter: verseData.chapter,
				verse: verseData.verse,
				content: verseData.content,
				newParagraph: verseData.newParagraph,
				poetry: verseData.poetry
			};
			verses.push(bibleVerse);
		}
	}

	return verses;
}

/**
 * Detect the first scripture reference in free text and resolve it into verse records.
 * Returns null when no reference can be detected. A detected but unavailable passage
 * returns its parsed reference with an empty verse array.
 */
export async function resolveScriptureReference(
	dataLoader: BibleDataLoader,
	translation: BibleTranslation,
	input: string
): Promise<ResolvedScriptureReference | null> {
	const firstMatch = Array.from(detectReferences(input))[0];
	if (!firstMatch) {
		return null;
	}

	return {
		ref: firstMatch.ref,
		verses: await lookupVerses(dataLoader, translation, firstMatch.ref),
	};
}

/**
 * Parse a free-text scripture reference and resolve it into verse records.
 * Returns an empty array when no reference can be detected in the input.
 */
export async function parseAndLookupReference(
	dataLoader: BibleDataLoader,
	translation: BibleTranslation,
	reference: string
): Promise<BibleVerse[]> {
	const resolved = await resolveScriptureReference(dataLoader, translation, reference);
	return resolved?.verses ?? [];
}
