import { describe, expect, it } from 'vitest';
import { orderTranslations } from '../translation-order';
import type { BibleTranslation } from '../types';

const translation = (name: string): BibleTranslation => ({
	name,
	fullName: `${name} full name`,
	filePath: `${name.toLowerCase()}.json`,
});

describe('translation ordering', () => {
	it('puts the primary translation first and alphabetizes the rest by short name', () => {
		const translations = [translation('NLT'), translation('ESV'), translation('CSB'), translation('NASB')];

		expect(orderTranslations(translations, 'ESV').map(({ name }) => name))
			.toEqual(['ESV', 'CSB', 'NASB', 'NLT']);
	});

	it('alphabetizes all translations when the primary translation is unavailable', () => {
		const translations = [translation('NLT'), translation('CSB'), translation('ESV')];

		expect(orderTranslations(translations, 'NIV').map(({ name }) => name))
			.toEqual(['CSB', 'ESV', 'NLT']);
	});

	it('does not mutate the configured translation order', () => {
		const translations = [translation('NLT'), translation('CSB'), translation('ESV')];

		orderTranslations(translations, 'CSB');

		expect(translations.map(({ name }) => name)).toEqual(['NLT', 'CSB', 'ESV']);
	});
});
