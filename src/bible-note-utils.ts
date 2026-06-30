import { App, normalizePath, TAbstractFile, TFile, WorkspaceLeaf } from 'obsidian';
import type { BibleTranslation, ScriptureSettings } from './types';

export interface BibleNoteInfo {
	file: TFile;
	translation: BibleTranslation;
	baseTitle: string;
	chapterKey: string;
}

export const getNoteEnabledTranslations = (settings: ScriptureSettings): BibleTranslation[] =>
	settings.translations.filter(translation => translation.availableAsNotes && !!translation.notesDirectory);

export const normalizeNotesDirectory = (directory: string): string =>
	!directory ? '' : `${normalizePath(directory)}/`;

export const getBibleNoteTranslation = (settings: ScriptureSettings, file: TFile): BibleTranslation | null =>
	getNoteEnabledTranslations(settings).find(translation =>
		file.path.startsWith(normalizeNotesDirectory(translation.notesDirectory || ''))
	) || null;

export const isBibleNoteFile = (settings: ScriptureSettings, file: TFile): boolean =>
	!!getBibleNoteTranslation(settings, file);

export const normalizeBibleNoteBasename = (basename: string): string =>
	basename.trim().replace(/\s+/g, ' ').toLowerCase();

export const getBibleNoteChapterKey = (app: App, file: TFile): string => {
	const cache = app.metadataCache.getFileCache(file);
	const frontmatterId: unknown = cache?.frontmatter?.id;
	const normalizedId = typeof frontmatterId === 'string' ? frontmatterId.trim() : '';

	return normalizedId
		? `id:${normalizedId.toUpperCase()}`
		: `basename:${normalizeBibleNoteBasename(file.basename)}`;
};

export const getBibleNoteInfo = (app: App, settings: ScriptureSettings, file: TFile): BibleNoteInfo | null => {
	const translation = getBibleNoteTranslation(settings, file);
	if (!translation) return null;

	return {
		file,
		translation,
		baseTitle: file.basename,
		chapterKey: getBibleNoteChapterKey(app, file)
	};
};

const isTFile = (value: TAbstractFile | null): value is TFile =>
	value instanceof TFile;

export const resolveLeafFile = (app: App, leaf: WorkspaceLeaf): TFile | null => {
	const directFile = (leaf.view as ViewWithOptionalFile).file || null;
	if (directFile) {
		return directFile;
	}

	const viewState = leaf.getViewState();
	if (viewState.type !== 'markdown') {
		return null;
	}

	const filePath = typeof viewState.state?.file === 'string' ? viewState.state.file : null;
	if (!filePath) {
		return null;
	}

	const file = app.vault.getAbstractFileByPath(filePath);
	return isTFile(file) ? file : null;
};

interface ViewWithOptionalFile {
	file?: TFile | null;
}
