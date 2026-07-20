import { detectReferences } from 'scripture-references';
import type { PassageReference } from 'scripture-references';
import type { BibleTranslation, BibleVerse } from './types';
import type { BibleDataLoader } from './bible-data-loader';

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
 * Parse a free-text scripture reference and resolve it into verse records.
 * Returns an empty array when no reference can be detected in the input.
 */
export async function parseAndLookupReference(
	dataLoader: BibleDataLoader,
	translation: BibleTranslation,
	reference: string
): Promise<BibleVerse[]> {
	const matches = Array.from(detectReferences(reference));
	const firstMatch = matches[0];

	if (!firstMatch) {
		return [];
	}

	return await lookupVerses(dataLoader, translation, firstMatch.ref);
}
