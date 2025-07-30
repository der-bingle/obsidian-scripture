import { App, TFile, WorkspaceLeaf } from 'obsidian';
import type { BibleReferenceSettings } from './types';

export class BibleVerseDisplayManager {
	private app: App;
	private settings: BibleReferenceSettings;

	constructor(app: App, settings: BibleReferenceSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: BibleReferenceSettings): void {
		this.settings = settings;
	}

	// Apply verse number display classes to all currently open Bible notes
	applyVerseDisplayToOpenFiles(): void {
		const leaves = this.app.workspace.getLeavesOfType('markdown');
		
		leaves.forEach(leaf => {
			const file = leaf.view?.file;
			if (file && this.isBibleNote(file)) {
				this.applyVerseDisplayToLeaf(leaf);
			}
		});
	}

	// Apply verse number display class to a specific leaf
	applyVerseDisplayToLeaf(leaf: WorkspaceLeaf): void {
		const view = leaf.view;
		if (view.getViewType() !== 'markdown') return;

		// Get the editor container (Live Preview mode)
		const editorContainer = view.containerEl.querySelector('.cm-editor');
		// Get the preview container (Reading mode)
		const previewContainer = view.containerEl.querySelector('.markdown-preview-view');

		// Remove existing verse number classes
		const classesToRemove = ['bible-numbers-none', 'bible-numbers-first', 'bible-numbers-all'];
		
		if (editorContainer) {
			editorContainer.removeClass(...classesToRemove);
			editorContainer.addClass(`bible-numbers-${this.settings.bibleVerseNumberDisplay}`);
		}

		if (previewContainer) {
			previewContainer.removeClass(...classesToRemove);
			previewContainer.addClass(`bible-numbers-${this.settings.bibleVerseNumberDisplay}`);
		}
	}

	// Remove verse number display classes from a leaf
	removeVerseDisplayFromLeaf(leaf: WorkspaceLeaf): void {
		const view = leaf.view;
		if (view.getViewType() !== 'markdown') return;

		const editorContainer = view.containerEl.querySelector('.cm-editor');
		const previewContainer = view.containerEl.querySelector('.markdown-preview-view');

		const classesToRemove = ['bible-numbers-none', 'bible-numbers-first', 'bible-numbers-all'];

		if (editorContainer) {
			editorContainer.removeClass(...classesToRemove);
		}

		if (previewContainer) {
			previewContainer.removeClass(...classesToRemove);
		}
	}

	// Check if a file is a Bible note based on translation settings
	isBibleNote(file: TFile): boolean {
		if (!file.path) return false;

		return this.settings.translations.some(translation => {
			if (!translation.availableAsNotes || !translation.notesDirectory) {
				return false;
			}

			// Normalize directory path (ensure it ends with /)
			const normalizedDir = translation.notesDirectory.endsWith('/') 
				? translation.notesDirectory 
				: translation.notesDirectory + '/';

			// Check if file is directly in the Bible notes directory
			const fileDir = file.parent?.path ? file.parent.path + '/' : '';
			return fileDir === normalizedDir;
		});
	}

	// Cycle through verse number display options
	cycleVerseNumberDisplay(): string {
		const options: Array<'first' | 'none' | 'all'> = ['first', 'none', 'all'];
		const currentIndex = options.indexOf(this.settings.bibleVerseNumberDisplay);
		const nextIndex = (currentIndex + 1) % options.length;
		
		this.settings.bibleVerseNumberDisplay = options[nextIndex];
		
		// Apply the new setting to all open Bible notes
		this.applyVerseDisplayToOpenFiles();

		// Return display name for the notice
		const displayNames = {
			'first': 'First verse only',
			'none': 'Hidden',
			'all': 'All verses'
		};

		return displayNames[this.settings.bibleVerseNumberDisplay];
	}
}