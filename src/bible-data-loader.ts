import { App, normalizePath } from 'obsidian';
import type { BibleData, BibleTranslation } from './types';
import { isBibleData, validateBibleData } from './bible-data-validation';

export class BibleDataLoader {
	private app: App;
	private loadedTranslations: Map<string, BibleData> = new Map();

	constructor(app: App) {
		this.app = app;
	}

	async loadTranslation(translation: BibleTranslation): Promise<BibleData | null> {
		// Check if already loaded and cached
		const cached = this.loadedTranslations.get(translation.name);
		if (cached) return cached;

		try {
			const filePath = normalizePath(translation.filePath);
			const file = this.app.vault.getFileByPath(filePath);

			if (file) {
				const data = await this.app.vault.cachedRead(file);
				const bibleData: unknown = JSON.parse(data);

				// Validate data structure
				if (!isBibleData(bibleData)) {
					const validation = validateBibleData(bibleData);
					console.error(`Invalid Bible data format: ${translation.filePath}: ${validation.errorMessage || 'Unknown error'}`);
					return null;
				}

				// Cache the loaded data
				this.loadedTranslations.set(translation.name, bibleData);

				return bibleData;
			} else {
				console.error(`Bible file not found: ${translation.filePath}`);
				return null;
			}
		} catch (error) {
			console.error(`Error loading ${translation.name}:`, error);
			return null;
		}
	}

	async validateTranslation(translation: BibleTranslation): Promise<{ isValid: boolean; errorMessage?: string }> {
		try {
			const filePath = normalizePath(translation.filePath);
			const file = this.app.vault.getFileByPath(filePath);

			if (!file) {
				return { isValid: false, errorMessage: 'File not found' };
			}

			const data = await this.app.vault.cachedRead(file);
			const bibleData: unknown = JSON.parse(data);

			const validation = validateBibleData(bibleData);
			if (!validation.isValid) {
				return { isValid: false, errorMessage: validation.errorMessage || 'Invalid Bible data format' };
			}

			return { isValid: true };
		} catch (error) {
			return {
				isValid: false,
				errorMessage: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	getLoadedTranslation(name: string): BibleData | null {
		return this.loadedTranslations.get(name) || null;
	}

	clearCache(translationName?: string): void {
		if (translationName) {
			this.loadedTranslations.delete(translationName);
		} else {
			this.loadedTranslations.clear();
		}
	}

}
