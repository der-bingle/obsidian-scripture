import { Editor } from 'obsidian';
import type { BibleVerse, BibleReferenceSettings } from './types';

export class CalloutFormatter {
	private settings: BibleReferenceSettings;

	constructor(settings: BibleReferenceSettings) {
		this.settings = settings;
	}

	insertScriptureCallout(editor: Editor, reference: string, verses: BibleVerse[], translation: string): void {
		const cursor = editor.getCursor();
		const callout = this.formatCallout(reference, verses, translation);

		const startPos = cursor;
		editor.replaceRange(callout, startPos);

		// Move cursor to after the callout (still has positioning issues but we'll fix later)
		const lines = callout.split('\n');
		const endPos = {
			line: startPos.line + lines.length - 1,
			ch: 0
		};

		editor.setCursor(endPos);
	}

	private formatCallout(reference: string, verses: BibleVerse[], translation: string): string {
		// Create properly formatted reference with full book name
		const formattedReference = this.formatProperReference(verses, translation);
		const header = `> [!scripture] ${formattedReference}`;

		// Format each verse according to settings
		const formattedVerses = verses.map((verse, index) => this.formatVerse(verse, index, verses.length));

		// Join verses with spaces (multiple verses in same callout)
		const versesText = formattedVerses.join(' ');

		// Split into lines and prefix each with "> " for callout formatting
		const calloutLines = this.formatAsCalloutLines(versesText);

		// Combine header and content with blank line at end
		return `${header}\n${calloutLines}\n\n`;
	}

	private formatProperReference(verses: BibleVerse[], translation: string): string {
		if (verses.length === 0) {
			return '';
		}

		const firstVerse = verses[0];
		const lastVerse = verses[verses.length - 1];

		// Get the full book name from the first verse
		const bookName = firstVerse.book;
		const chapter = firstVerse.chapter;

		// Format verse range
		let verseRange: string;
		if (verses.length === 1) {
			// Single verse
			verseRange = firstVerse.verse.toString();
		} else if (firstVerse.chapter === lastVerse.chapter) {
			// Same chapter, verse range
			verseRange = `${firstVerse.verse}–${lastVerse.verse}`;
		} else {
			// Cross-chapter range
			verseRange = `${firstVerse.verse}–${lastVerse.chapter}:${lastVerse.verse}`;
		}

		// Determine if translation should be included
		const shouldIncludeTranslation = this.shouldIncludeTranslation(translation);
		const translationSuffix = shouldIncludeTranslation ? `, ${translation}` : '';

		return `${bookName} ${chapter}:${verseRange}${translationSuffix}`;
	}

	private shouldIncludeTranslation(translation: string): boolean {
		switch (this.settings.translationDisplay) {
			case 'never':
				return false;
			case 'always':
				return true;
			case 'except-default':
				return translation !== this.settings.defaultTranslation;
			default:
				return false;
		}
	}

	private formatVerse(verse: BibleVerse, index: number, totalVerses: number): string {
		// Start with the verse content, joining multiple lines with newlines
		let content = verse.content.join('\n');

		// Add extra newline for poetry verses ONLY if it's not the last verse
		const isLastVerse = index === totalVerses - 1;
		if (verse.poetry && !isLastVerse) {
			content += '\n';
		}

		// Add verse number based on settings
		const versePrefix = this.getVersePrefix(verse.verse, index);

		return `${versePrefix}${content}`;
	}

	private getVersePrefix(verseNumber: number, index: number): string {
		switch (this.settings.verseNumbers) {
			case 'include':
				return `<sup>${verseNumber}</sup> `;
			case 'exclude-first':
				return index === 0 ? '' : `<sup>${verseNumber}</sup> `;
			case 'exclude':
			default:
				return '';
		}
	}

	private formatAsCalloutLines(text: string): string {
		// Split text into lines and prefix each with "> " for callout formatting
		return text
			.split('\n')
			.map(line => `> ${line}`)
			.join('\n');
	}

	updateSettings(settings: BibleReferenceSettings): void {
		this.settings = settings;
	}
}
