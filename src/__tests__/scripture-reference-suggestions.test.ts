import { describe, expect, it } from 'vitest';
import {
	SCRIPTURE_REFERENCE_SUGGESTION_LIMIT,
	getScriptureReferenceSuggestions,
} from '../scripture-reference-suggestions';

const referencesFor = (input: string, canonicalReference = 'Luke 15'): string[] =>
	getScriptureReferenceSuggestions(input, canonicalReference).map(suggestion => suggestion.reference);

describe('Scripture reference suggestions', () => {
	it('returns no suggestions for empty or unchanged canonical input', () => {
		expect(referencesFor('')).toEqual([]);
		expect(referencesFor('   ')).toEqual([]);
		expect(referencesFor('Luke 15')).toEqual([]);
	});

	it.each(['j', 'jo', 'not a reference'])('returns no suggestions for unresolved input: %s', input => {
		expect(referencesFor(input)).toEqual([]);
	});

	it.each(['joh', 'john', 'jhn'])('uses unique partial names and abbreviations for John: %s', input => {
		expect(referencesFor(input)).toEqual([
			'John 1',
			'John 2',
			'John 3',
			'John 4',
			'John 5',
			'John 6',
		]);
	});

	it('does not mix the Johannine epistles into John suggestions', () => {
		const suggestions = referencesFor('jhn');
		expect(suggestions.every(reference => reference.startsWith('John '))).toBe(true);
		expect(suggestions.some(reference => /^[123] John/.test(reference))).toBe(false);
	});

	it.each([
		['1jn', ['1 John 1', '1 John 2', '1 John 3', '1 John 4', '1 John 5']],
		['2jn', ['2 John']],
		['3jn', ['3 John']],
	])('strictly scopes numbered John abbreviations: %s', (input, expected) => {
		expect(referencesFor(input)).toEqual(expected);
	});

	it.each([
		['chapter reference', 'jhn 3', 'John 3'],
		['single verse', 'John 3:16', 'John 3:16'],
		['verse range', 'John 3:16-18', 'John 3:16-18'],
		['punctuation variant', 'Jn 3.16', 'John 3:16'],
		['embedded reference', 'Read John 3:16 today', 'John 3:16'],
	])('returns one canonical suggestion for a %s', (_label, input, expected) => {
		expect(referencesFor(input)).toEqual([expected]);
	});

	it('uses canonical single-chapter book formatting', () => {
		expect(referencesFor('jud')).toEqual(['Jude']);
	});

	it('honors the result limit without translation-specific data', () => {
		const suggestions = getScriptureReferenceSuggestions('jhn', '', 3);
		expect(suggestions.map(suggestion => suggestion.reference)).toEqual(['John 1', 'John 2', 'John 3']);
		expect(SCRIPTURE_REFERENCE_SUGGESTION_LIMIT).toBe(6);
	});

	it('returns only the exact chapter after a chapter is supplied', () => {
		expect(referencesFor('jhn 3')).toEqual(['John 3']);
	});
});
