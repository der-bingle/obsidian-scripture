import type { BibleTranslation, ScriptureSettings } from './types';

export interface ScriptureLinkResolution {
	target: string | null;
	translation: BibleTranslation | null;
	didFallback: boolean;
	warning?: string;
}

const getNoteTranslations = (settings: ScriptureSettings): BibleTranslation[] =>
	settings.translations.filter(translation => translation.availableAsNotes && !!translation.notesDirectory);

const joinVaultPath = (directory: string, filename: string): string =>
	`${directory.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')}/${filename}`.replace(/\/{2,}/g, '/');

const getDefaultNoteTranslation = (settings: ScriptureSettings, noteTranslations: BibleTranslation[]): BibleTranslation | null =>
	noteTranslations.find(translation => translation.name === settings.defaultTranslation) || noteTranslations[0] || null;

const getRequestedNoteTranslation = (
	settings: ScriptureSettings,
	verseTranslation: string,
	noteTranslations: BibleTranslation[],
): BibleTranslation | null => {
	if (settings.linkingStrategy !== 'verse-translation') {
		return getDefaultNoteTranslation(settings, noteTranslations);
	}

	return noteTranslations.find(translation => translation.name === verseTranslation) || null;
};

export const getScriptureNoteTitle = (book: string, chapter: number): string => {
	const linkBook = book === 'Psalms' ? 'Psalm' : book;
	return `${linkBook} ${chapter}`;
};

export const resolveScriptureLink = (
	settings: ScriptureSettings,
	verseTranslation: string,
	book: string,
	chapter: number,
	verse?: number,
): ScriptureLinkResolution => {
	const noteTranslations = getNoteTranslations(settings);
	const requested = getRequestedNoteTranslation(settings, verseTranslation, noteTranslations);
	const fallback = getDefaultNoteTranslation(settings, noteTranslations);
	const translation = requested || fallback;
	const didFallback = settings.linkingStrategy === 'verse-translation' && !requested;

	if (!translation?.notesDirectory) {
		return {
			target: null,
			translation: null,
			didFallback: true,
			warning: 'No Scripture notes directory is configured for generated links',
		};
	}

	const title = getScriptureNoteTitle(book, chapter);
	const noteTarget = settings.linkPathFormat === 'basename'
		? title
		: joinVaultPath(translation.notesDirectory, title);
	const target = verse ? `${noteTarget}#${verse}` : noteTarget;

	return {
		target,
		translation,
		didFallback,
		warning: didFallback
			? `${verseTranslation} has no Scripture notes; linked to ${translation.fullName || translation.name} instead`
			: undefined,
	};
};

export const getEffectiveLinkingStrategy = (settings: ScriptureSettings): ScriptureSettings['linkingStrategy'] =>
	getNoteTranslations(settings).length < 2 ? 'default-translation' : settings.linkingStrategy;
