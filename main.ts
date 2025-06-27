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

				// Check if there's selected text and if it contains a Bible reference
				const selectedText = editor.getSelection().trim();
				const selectionInfo = this.extractReferenceFromSelection(selectedText);

				new BibleReferenceModal(
					this.app,
					this.settings.translations,
					selectionInfo.translation || this.settings.defaultTranslation,
					this.dataLoader,
					selectionInfo.reference,
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

	private extractReferenceFromSelection(selectedText: string): { reference: string; translation: string | null } {
		// Only check for references if the selection is reasonable length (not a whole document)
		if (!selectedText || selectedText.length > 100 || selectedText.includes('\n')) {
			return { reference: '', translation: null };
		}

		try {
			// Import detect_references for validation
			const { detect_references } = require('./bible-references/index.js');

			const matchGenerator = detect_references(selectedText);
			const matches = Array.from(matchGenerator);

			// If we found a valid reference, extract the reference and translation
			if (matches && matches.length > 0 && (matches[0] as any).ref) {
				const { reference, translation } = this.parseReferenceAndTranslation(selectedText);
				console.log('Found Bible reference in selection:', reference, translation ? `(${translation})` : '');
				return { reference, translation };
			}
		} catch (error) {
			// If there's any error with detection, just return empty
			console.log('No Bible reference detected in selection');
		}

		return { reference: '', translation: null };
	}

	private parseReferenceAndTranslation(text: string): { reference: string; translation: string | null } {
		// Look for common translation patterns at the end of the reference
		// Matches patterns like: "John 3:16, NET" or "John 3:16 (ESV)" or "John 3:16 NET"
		const translationPatterns = [
			/, ([A-Z]{2,5})$/,           // "John 3:16, NET"
			/\(([A-Z]{2,5})\)$/,         // "John 3:16 (NET)"
			/ ([A-Z]{2,5})$/             // "John 3:16 NET"
		];

		for (const pattern of translationPatterns) {
			const match = text.match(pattern);
			if (match) {
				const possibleTranslation = match[1];

				// Check if this translation exists in our configured translations
				const foundTranslation = this.settings.translations.find(t =>
					t.name.toUpperCase() === possibleTranslation.toUpperCase()
				);

				if (foundTranslation) {
					// Remove the translation part to get clean reference
					const reference = text.replace(pattern, '').trim();
					return { reference, translation: foundTranslation.name };
				}
			}
		}

		// No translation found or translation not configured, return full text as reference
		return { reference: text.trim(), translation: null };
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
