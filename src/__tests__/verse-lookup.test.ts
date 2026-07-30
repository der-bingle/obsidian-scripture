import { describe, expect, it } from 'vitest';
import { parseAndLookupReference, resolveScriptureReference } from '../verse-lookup';
import type { BibleData, BibleTranslation } from '../types';
import type { BibleDataLoader } from '../bible-data-loader';

const translation: BibleTranslation = {
	name: 'CSB',
	fullName: 'Christian Standard Bible',
	filePath: 'Data/scripture/csb.json',
	availableAsNotes: true,
	notesDirectory: 'Bible',
};

const bibleData: BibleData = {
	translation: 'CSB',
	books: [
		{
			id: 'LUK',
			title: 'Luke',
			bookNumber: 42,
			testament: 'NEW',
			abbreviations: ['Lk'],
			chapters: [
				{
					id: 'LUK.15',
					book: 'Luke',
					chapter: 15,
					verseCount: 3,
					wordCount: 0,
					verses: [
						{ id: 'LUK.15.1', book: 'Luke', chapter: 15, verse: 1, content: ['All the tax collectors were approaching.'], newParagraph: true },
						{ id: 'LUK.15.2', book: 'Luke', chapter: 15, verse: 2, content: ['And the Pharisees were complaining.'] },
						{ id: 'LUK.15.3', book: 'Luke', chapter: 15, verse: 3, content: ['So he told them this parable:'], newParagraph: true },
					],
				},
			],
		},
	],
};

const dataLoader = {
	loadTranslation: async () => bibleData,
} as unknown as BibleDataLoader;

describe('verse lookup', () => {
	it('resolves a single verse', async () => {
		const verses = await parseAndLookupReference(dataLoader, translation, 'Luke 15:2');
		expect(verses).toHaveLength(1);
		expect(verses[0]?.verse).toBe(2);
	});

	it.each([
		['full book name', 'Luke 15:2'],
		['book abbreviation', 'Lk 15:2'],
		['punctuation variant', 'Lk 15.2'],
		['embedded reference', 'Read Luke 15:2 before the meeting'],
	])('detects a reference using a %s', async (_label, input) => {
		const resolved = await resolveScriptureReference(dataLoader, translation, input);
		expect(resolved?.ref.book).toBe('luk');
		expect(resolved?.ref.start_chapter).toBe(15);
		expect(resolved?.ref.start_verse).toBe(2);
		expect(resolved?.verses.map(verse => verse.verse)).toEqual([2]);
	});

	it('resolves a verse range', async () => {
		const resolved = await resolveScriptureReference(dataLoader, translation, 'Luke 15:1-2');
		expect(resolved?.ref.type).toBe('range_verses');
		expect(resolved?.verses.map(verse => verse.verse)).toEqual([1, 2]);
	});

	it('resolves a whole chapter reference', async () => {
		const resolved = await resolveScriptureReference(dataLoader, translation, 'Luke 15');
		expect(resolved?.ref.type).toBe('chapter');
		expect(resolved?.verses.map(verse => verse.verse)).toEqual([1, 2, 3]);
	});

	it('populates the display book name, not the book code', async () => {
		const verses = await parseAndLookupReference(dataLoader, translation, 'Luke 15:1');
		expect(verses[0]?.book).toBe('Luke');
	});

	it('preserves paragraph metadata used for callout spacing', async () => {
		const verses = await parseAndLookupReference(dataLoader, translation, 'Luke 15:2-3');
		expect(verses[0]?.newParagraph).toBeFalsy();
		expect(verses[1]?.newParagraph).toBe(true);
	});

	it('returns an empty array when no reference is detected', async () => {
		expect(await parseAndLookupReference(dataLoader, translation, 'not a reference')).toEqual([]);
	});

	it('returns null resolution when no reference is detected', async () => {
		expect(await resolveScriptureReference(dataLoader, translation, 'not a reference')).toBeNull();
	});

	it('returns an empty array for a book that is missing from the data', async () => {
		expect(await parseAndLookupReference(dataLoader, translation, 'Mark 1:1')).toEqual([]);
	});

	it('returns an empty array for a chapter that is missing from the data', async () => {
		expect(await parseAndLookupReference(dataLoader, translation, 'Luke 16:1')).toEqual([]);
	});
});
