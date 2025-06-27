import { App, Editor, MarkdownView, Plugin, Notice } from 'obsidian';
import { BibleReferenceModal } from './src/modal';
import { BibleReferenceSettingTab } from './src/settings';
import { CalloutFormatter } from './src/callout-formatter';
import { BibleDataLoader } from './src/bible-data-loader';
import type { BibleReferenceSettings, BibleVerse } from './src/types';
import { DEFAULT_SETTINGS } from './src/types';

export default class BibleReferencePlugin extends Plugin {
	settings: BibleReferenceSettings;
	private calloutFormatter: CalloutFormatter;
	private dataLoader: BibleDataLoader;

	async onload() {
		await this.loadSettings();

		// Initialize components
		this.calloutFormatter = new CalloutFormatter(this.settings);
		this.dataLoader = new BibleDataLoader(this.app);

		// Add command to open reference modal
		this.addCommand({
			id: 'insert-bible-reference',
			name: 'Insert Bible Reference',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (this.settings.translations.length === 0) {
					new Notice('No Bible translations configured. Please add translations in plugin settings.');
					return;
				}

				new BibleReferenceModal(
					this.app,
					this.settings.translations,
					this.settings.defaultTranslation,
					this.dataLoader,
					(reference, verses, translation) => {
						this.insertScriptureCallout(editor, reference, verses, translation);
					}
				).open();
			}
		});

		// Add settings tab
		this.addSettingTab(new BibleReferenceSettingTab(this.app, this));

		console.log('Bible Reference Plugin loaded');
		console.log('Configured translations:', this.settings.translations.map(t => t.name));
	}

	async onunload() {
		console.log('Bible Reference Plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Migrate old settings if needed
		await this.migrateOldSettings();
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Update formatter when settings change
		this.updateFormatterSettings();
	}

	updateFormatterSettings() {
		if (this.calloutFormatter) {
			this.calloutFormatter.updateSettings(this.settings);
		}
	}

	private insertScriptureCallout(editor: Editor, reference: string, verses: BibleVerse[], translation: string) {
		this.calloutFormatter.insertScriptureCallout(editor, reference, verses, translation);
	}

	private async migrateOldSettings() {
		// Check if we have old single-translation settings to migrate
		const oldSettings = this.settings as any;

		if (oldSettings.bibleDataPath && this.settings.translations.length === 0) {
			console.log('Migrating old Bible Reference settings...');

			// Create a translation entry from old settings
			const translation = {
				name: oldSettings.defaultVersion || 'Default',
				filePath: oldSettings.bibleDataPath
			};

			this.settings.translations = [translation];
			this.settings.defaultTranslation = translation.name;

			// Clean up old properties
			delete oldSettings.bibleDataPath;
			delete oldSettings.defaultVersion;

			await this.saveSettings();

			new Notice('Bible Reference settings migrated to new format. Please verify translations in settings.');
		}
	}
}
