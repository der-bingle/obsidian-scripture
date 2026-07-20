import { describe, expect, it } from 'vitest';
import { parseAndLookupReference } from '../verse-lookup';
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

	it('resolves a verse range', async () => {
		const verses = await parseAndLookupReference(dataLoader, translation, 'Luke 15:1-2');
		expect(verses.map(v => v.verse)).toEqual([1, 2]);
	});

	it('resolves a whole chapter reference', async () => {
		const verses = await parseAndLookupReference(dataLoader, translation, 'Luke 15');
		expect(verses.map(v => v.verse)).toEqual([1, 2, 3]);
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

	it('returns an empty array for a book that is missing from the data', async () => {
		expect(await parseAndLookupReference(dataLoader, translation, 'Mark 1:1')).toEqual([]);
	});

	it('returns an empty array for a chapter that is missing from the data', async () => {
		expect(await parseAndLookupReference(dataLoader, translation, 'Luke 16:1')).toEqual([]);
	});
});
