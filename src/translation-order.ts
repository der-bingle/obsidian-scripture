import type { BibleTranslation } from './types';

/**
 * Put the primary translation first, then order the remaining translations by
 * their short names. The configured array is never mutated.
 */
export const orderTranslations = (
	translations: BibleTranslation[],
	primaryTranslation: string,
): BibleTranslation[] =>
	translations
		.map((translation, index) => ({ translation, index }))
		.sort((a, b) => {
			const aIsPrimary = a.translation.name === primaryTranslation;
			const bIsPrimary = b.translation.name === primaryTranslation;

			if (aIsPrimary !== bIsPrimary) return aIsPrimary ? -1 : 1;

			const nameComparison = a.translation.name.localeCompare(
				b.translation.name,
				undefined,
				{ sensitivity: 'base' },
			);

			return nameComparison || a.index - b.index;
		})
		.map(({ translation }) => translation);
