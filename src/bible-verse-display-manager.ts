import { App, TFile, WorkspaceLeaf, MarkdownView } from 'obsidian';
import type { ScriptureSettings } from './types';
import { isBibleNoteFile } from './bible-note-utils';

export class BibleVerseDisplayManager {
	private app: App;
	private settings: ScriptureSettings;

	constructor(app: App, settings: ScriptureSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: ScriptureSettings): void {
		this.settings = settings;
	}

	// Apply verse number display classes to all currently open Bible notes
	applyVerseDisplayToOpenFiles(): void {
		const leaves = this.app.workspace.getLeavesOfType('markdown');
		
		leaves.forEach(leaf => {
			if (leaf.view instanceof MarkdownView && leaf.view.file) {
				const file = leaf.view.file;
				if (this.isBibleNote(file)) {
					this.applyVerseDisplayToLeaf(leaf);
				}
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
		
		// Determine which class to apply based on settings
		const classToApply = this.getCurrentDisplayClass();
		
		if (editorContainer) {
			editorContainer.removeClass(...classesToRemove);
			editorContainer.addClass(classToApply);
		}

		if (previewContainer) {
			previewContainer.removeClass(...classesToRemove);
			previewContainer.addClass(classToApply);
		}
	}

	// Get the current CSS class based on settings
	private getCurrentDisplayClass(): string {
		if (!this.settings.verseNumbersVisible) {
			return 'bible-numbers-none';
		}
		
		return this.settings.verseNumberDisplayMode === 'first' 
			? 'bible-numbers-first' 
			: 'bible-numbers-all';
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
		return isBibleNoteFile(this.settings, file);
	}

	// Toggle verse number visibility
	toggleVerseNumbers(): string {
		this.settings.verseNumbersVisible = !this.settings.verseNumbersVisible;
		this.applyVerseDisplayToOpenFiles();
		return this.settings.verseNumbersVisible ? 'Visible' : 'Hidden';
	}

	// Set display mode to 'first' and make visible
	showFirstVerseOnly(): string {
		this.settings.verseNumbersVisible = true;
		this.settings.verseNumberDisplayMode = 'first';
		this.applyVerseDisplayToOpenFiles();
		return 'First verse only';
	}

	// Set display mode to 'all' and make visible
	showAllVerseNumbers(): string {
		this.settings.verseNumbersVisible = true;
		this.settings.verseNumberDisplayMode = 'all';
		this.applyVerseDisplayToOpenFiles();
		return 'All verses';
	}
}
