import { describe, expect, it } from 'vitest';
import { formatReferenceDisplay, getBookDisplayName } from '../reference-format';
import type { BibleVerse } from '../types';

const verse = (chapter: number, number: number): BibleVerse => ({
	id: `JAS.${chapter}.${number}`,
	book: 'James',
	chapter,
	verse: number,
	content: [`Verse ${number}`],
});

describe('reference formatting', () => {
	it('formats verse ranges and translation suffixes', () => {
		expect(formatReferenceDisplay(
			[verse(1, 16), verse(1, 17), verse(1, 18)],
			'NLT',
			'CSB',
			'except-default',
			'full-name',
		)).toBe('James 1:16–18, NLT');
	});

	it('formats chapter-only references', () => {
		expect(formatReferenceDisplay(
			[verse(1, 1)],
			'CSB',
			'CSB',
			'except-default',
			'chapter-verse',
			{ isChapterReference: true },
		)).toBe('1');
	});

	it('uses standard title-case abbreviations', () => {
		expect(getBookDisplayName('James', 'standard-abbrev')).toBe('Jas');
	});
});
