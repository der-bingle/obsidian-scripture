import { AbstractInputSuggest, App, TFolder } from 'obsidian';
import type { TFile } from 'obsidian';

abstract class VaultPathSuggest<T extends { path: string }> extends AbstractInputSuggest<T> {
	constructor(app: App, private readonly targetInputEl: HTMLInputElement) {
		super(app, targetInputEl);
	}

	renderSuggestion(item: T, el: HTMLElement): void {
		el.setText(item.path);
	}

	selectSuggestion(item: T): void {
		this.setValue(item.path);
		this.targetInputEl.trigger('input');
		this.close();
	}
}

export class FileSuggest extends VaultPathSuggest<TFile> {
	constructor(app: App, inputEl: HTMLInputElement, private readonly extension?: string) {
		super(app, inputEl);
	}

	protected getSuggestions(query: string): TFile[] {
		const lowerQuery = query.toLowerCase();
		return this.app.vault.getFiles()
			.filter(file => !this.extension || file.extension === this.extension)
			.filter(file => file.path.toLowerCase().includes(lowerQuery))
			.slice(0, 100);
	}
}

export class FolderSuggest extends VaultPathSuggest<TFolder> {
	protected getSuggestions(query: string): TFolder[] {
		const lowerQuery = query.toLowerCase();
		const folders: TFolder[] = [];
		const collectFolders = (folder: TFolder): void => {
			folders.push(folder);
			for (const child of folder.children) {
				if (child instanceof TFolder) collectFolders(child);
			}
		};
		collectFolders(this.app.vault.getRoot());

		return folders
			.filter(folder => folder.path.toLowerCase().includes(lowerQuery))
			.slice(0, 100);
	}
}
