import { Notice } from 'obsidian';
import type { BibleData, BibleTranslation } from './types';

export class BibleDataLoader {
	private app: any;
	private loadedTranslations: Map<string, BibleData> = new Map();

	constructor(app: any) {
		this.app = app;
	}

	async loadTranslation(translation: BibleTranslation): Promise<BibleData | null> {
		// Check if already loaded and cached
		if (this.loadedTranslations.has(translation.name)) {
			return this.loadedTranslations.get(translation.name)!;
		}

		try {
			const adapter = this.app.vault.adapter;

			if (await adapter.exists(translation.filePath)) {
				const data = await adapter.read(translation.filePath);
				const bibleData: BibleData = JSON.parse(data);

				// Validate data structure
				if (!this.validateBibleData(bibleData)) {
					console.error(`Invalid Bible data format: ${translation.filePath}`);
					return null;
				}

				// Cache the loaded data
				this.loadedTranslations.set(translation.name, bibleData);

				console.log(`Loaded ${translation.name}: ${bibleData.translation} with ${bibleData.books?.length} books`);
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
			const adapter = this.app.vault.adapter;

			if (!(await adapter.exists(translation.filePath))) {
				return { isValid: false, errorMessage: 'File not found' };
			}

			const data = await adapter.read(translation.filePath);
			const bibleData: BibleData = JSON.parse(data);

			if (!this.validateBibleData(bibleData)) {
				return { isValid: false, errorMessage: 'Invalid Bible data format' };
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

	private validateBibleData(data: any): data is BibleData {
		if (!data || typeof data !== 'object') {
			return false;
		}

		if (!data.translation || typeof data.translation !== 'string') {
			return false;
		}

		if (!Array.isArray(data.books)) {
			return false;
		}

		// Basic validation of first book structure
		if (data.books.length > 0) {
			const firstBook = data.books[0];
			if (!firstBook.id || !firstBook.title || !Array.isArray(firstBook.chapters)) {
				return false;
			}
		}

		return true;
	}
}
