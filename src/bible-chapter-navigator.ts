import { App, TFile, SuggestModal, Notice } from 'obsidian';
import type { ScriptureSettings, BibleTranslation } from './types';
import { getBibleNoteTranslation, getNoteEnabledTranslations, isBibleNoteFile, normalizeNotesDirectory } from './bible-note-utils';
import { orderTranslations } from './translation-order';

interface TranslationOption {
	translation: BibleTranslation;
	isCurrent: boolean;
}

export class BibleChapterNavigator {
	private app: App;
	private settings: ScriptureSettings;

	constructor(app: App, settings: ScriptureSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: ScriptureSettings): void {
		this.settings = settings;
	}

	/**
	 * Check if there's currently a Bible chapter note open
	 */
	canNavigate(): boolean {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return false;

		return this.isBibleChapterNote(activeFile);
	}

	/**
	 * Open the translation selector modal
	 */
	openTranslationSelector(): void {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile || !this.isBibleChapterNote(activeFile)) {
			new Notice('No Bible chapter note is currently open');
			return;
		}

		const availableTranslations = this.getAvailableTranslations(activeFile);
		if (availableTranslations.length === 0) {
			new Notice('No other translations with notes are available');
			return;
		}

		new TranslationSelectorModal(this.app, availableTranslations, (option, evt) => {
			void this.navigateToTranslation(activeFile, option.translation, evt);
		}).open();
	}

	/**
	 * Check if a file is a Bible chapter note
	 */
	private isBibleChapterNote(file: TFile): boolean {
		return isBibleNoteFile(this.settings, file);
	}

	/**
	 * Get the current translation for a Bible chapter note
	 */
	private getCurrentTranslation(file: TFile): BibleTranslation | null {
		return getBibleNoteTranslation(this.settings, file);
	}

	/**
	 * Get available translations that have notes (excluding current one)
	 */
	private getAvailableTranslations(currentFile: TFile): TranslationOption[] {
		const currentTranslation = this.getCurrentTranslation(currentFile);

		return orderTranslations(getNoteEnabledTranslations(this.settings), this.settings.defaultTranslation)
			.map(translation => ({
				translation,
				isCurrent: currentTranslation?.name === translation.name
			}));
	}

	/**
	 * Navigate to the same chapter in a different translation
	 */
	private async navigateToTranslation(currentFile: TFile, targetTranslation: BibleTranslation, evt?: MouseEvent | KeyboardEvent): Promise<void> {
		// Get the current file's ID from frontmatter
		const cache = this.app.metadataCache.getFileCache(currentFile);
		const currentId: unknown = cache?.frontmatter?.id;

		if (typeof currentId !== 'string' || !currentId) {
			new Notice('Current file has no id in frontmatter');
			return;
		}

		// Find the matching file in the target translation
		const targetFile = await this.findFileByIdInTranslation(currentId, targetTranslation);

		if (!targetFile) {
			new Notice(`Chapter not found in ${targetTranslation.fullName}`);
			return;
		}

		// Open the file with modifier key handling
		const openInNewTab = evt && (evt.ctrlKey || evt.metaKey);
		const openInNewPane = evt && (evt.ctrlKey || evt.metaKey) && evt.shiftKey;

		if (openInNewPane) {
			await this.app.workspace.getLeaf('split', 'vertical').openFile(targetFile);
		} else if (openInNewTab) {
			await this.app.workspace.openLinkText(targetFile.path, '', true);
		} else {
			await this.app.workspace.openLinkText(targetFile.path, '');
		}
	}

	/**
	 * Find a file with matching ID in the target translation's directory
	 */
	private async findFileByIdInTranslation(targetId: string, translation: BibleTranslation): Promise<TFile | null> {
		if (!translation.notesDirectory) return null;

		// Get all markdown files
		const allFiles = this.app.vault.getMarkdownFiles();

		// Filter to files in the translation's notes directory (including subdirectories)
		const normalizedDir = normalizeNotesDirectory(translation.notesDirectory || '');

		const translationFiles = allFiles.filter(file =>
			file.path.startsWith(normalizedDir)
		);

		// Search for file with matching ID
		for (const file of translationFiles) {
			const cache = this.app.metadataCache.getFileCache(file);
			const fileId: unknown = cache?.frontmatter?.id;

			if (fileId === targetId) {
				return file;
			}
		}

		return null;
	}
}

class TranslationSelectorModal extends SuggestModal<TranslationOption> {
	private options: TranslationOption[];
	private onSelect: (option: TranslationOption, evt?: MouseEvent | KeyboardEvent) => void;

	constructor(app: App, options: TranslationOption[], onSelect: (option: TranslationOption, evt?: MouseEvent | KeyboardEvent) => void) {
		super(app);
		this.options = options;
		this.onSelect = onSelect;

		this.setPlaceholder('Select translation to open...');
	}

	getSuggestions(query: string): TranslationOption[] {
		const lowerQuery = query.toLowerCase();

		return this.options.filter(option =>
			option.translation.fullName.toLowerCase().includes(lowerQuery) ||
			option.translation.name.toLowerCase().includes(lowerQuery)
		);
	}

	renderSuggestion(option: TranslationOption, el: HTMLElement): void {
		// Create a container with flexbox layout
		const container = el.createDiv({
			cls: ['scripture-translation-option', ...(option.isCurrent ? ['is-selected'] : [])]
		});

		// Add checkmark for current translation (on the left)
		if (option.isCurrent) {
			container.createSpan({
				text: '✓',
				cls: 'bible-current-translation-indicator'
			});
		} else {
			container.createSpan({ cls: 'scripture-translation-spacer' });
		}

		// Add the translation name
		container.createSpan({
			text: option.translation.fullName
		});
	}

	onChooseSuggestion(option: TranslationOption, evt: MouseEvent | KeyboardEvent): void {
		this.onSelect(option, evt);
	}
}
