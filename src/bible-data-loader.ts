import { App, normalizePath } from 'obsidian';
import type { BibleData, BibleTranslation } from './types';

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
				if (!this.validateBibleData(bibleData)) {
					console.error(`Invalid Bible data format: ${translation.filePath}`);
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

	private validateBibleData(data: unknown): data is BibleData {
		if (!data || typeof data !== 'object') {
			return false;
		}
		const candidate = data as Record<string, unknown>;

		if (typeof candidate.translation !== 'string' || !candidate.translation) {
			return false;
		}

		if (!Array.isArray(candidate.books)) {
			return false;
		}

		if (candidate.books.length > 0) {
			const firstBook: unknown = candidate.books[0];
			if (!firstBook || typeof firstBook !== 'object') return false;
			const book = firstBook as Record<string, unknown>;
			if (typeof book.id !== 'string' || typeof book.title !== 'string' || !Array.isArray(book.chapters)) {
				return false;
			}
		}

		return true;
	}
}
