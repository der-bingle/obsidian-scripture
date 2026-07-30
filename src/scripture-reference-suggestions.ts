import {
	PassageReference,
	detectBookCode,
	detectReferences,
	getChapterNumbers,
} from 'scripture-references';

export const SCRIPTURE_REFERENCE_SUGGESTION_LIMIT = 6;

export interface ScriptureReferenceSuggestion {
	reference: string;
	ref: PassageReference;
}

export const getScriptureReferenceSuggestions = (
	query: string,
	canonicalReference: string,
	limit = SCRIPTURE_REFERENCE_SUGGESTION_LIMIT,
): ScriptureReferenceSuggestion[] => {
	const trimmedQuery = query.trim();
	if (!trimmedQuery || trimmedQuery === canonicalReference.trim() || limit <= 0) return [];

	const detectedReference = Array.from(detectReferences(trimmedQuery))[0]?.ref;
	if (detectedReference) {
		return [{
			reference: detectedReference.toString(),
			ref: detectedReference,
		}];
	}

	const bookCode = detectBookCode(trimmedQuery);
	if (!bookCode) return [];

	return getChapterNumbers(bookCode)
		.slice(0, limit)
		.map(chapter => {
			const ref = new PassageReference(bookCode, chapter);
			return {
				reference: ref.toString(),
				ref,
			};
		});
};
