import { describe, expect, it } from 'vitest';
import { validateBibleData } from '../bible-data-validation';

const validBible = {
	translation: 'TEST',
	books: [{
		id: 'JAS',
		title: 'James',
		bookNumber: 59,
		testament: 'New Testament',
		abbreviations: ['Jas'],
		chapters: [{
			id: 'JAS.005',
			book: 'James',
			chapter: 5,
			verseCount: 1,
			wordCount: 8,
			verses: [{
				id: 'JAS.5.19',
				book: 'James',
				chapter: 5,
				verse: 19,
				content: ['My brothers and sisters, if any among you strays…'],
				newParagraph: true,
				poetry: false,
			}],
		}],
	}],
};

describe('Bible data validation', () => {
	it('validates every nested Bible data level', () => {
		expect(validateBibleData(validBible)).toEqual({ isValid: true });
	});

	it('reports a precise nested mismatch', () => {
		const invalid = structuredClone(validBible);
		invalid.books[0]!.chapters[0]!.verses[0]!.chapter = 4;
		expect(validateBibleData(invalid)).toEqual({
			isValid: false,
			errorMessage: 'books[0].chapters[0].verses[0].chapter must match its chapter',
		});
	});

	it('rejects duplicate verse numbers', () => {
		const invalid = structuredClone(validBible);
		const duplicate = { ...invalid.books[0]!.chapters[0]!.verses[0]!, id: 'JAS.5.19b' };
		invalid.books[0]!.chapters[0]!.verses.push(duplicate);
		invalid.books[0]!.chapters[0]!.verseCount = 2;
		expect(validateBibleData(invalid).errorMessage).toContain('Duplicate verse number');
	});
});
