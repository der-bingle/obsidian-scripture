import { book_abbrev_english } from 'scripture-references';
import type { BibleVerse, ReferenceFormat, ScriptureSettings } from './types';

interface ReferenceDisplayOptions {
	isChapterReference?: boolean;
}

const STANDARD_BOOK_ABBREVIATIONS: Record<string, string> = {
	Genesis: 'GEN', Exodus: 'EXO', Leviticus: 'LEV', Numbers: 'NUM', Deuteronomy: 'DEU',
	Joshua: 'JOS', Judges: 'JDG', Ruth: 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA',
	'1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH', '2 Chronicles': '2CH',
	Ezra: 'EZR', Nehemiah: 'NEH', Esther: 'EST', Job: 'JOB', Psalms: 'PSA',
	Psalm: 'PSA', Proverbs: 'PRO', Ecclesiastes: 'ECC', 'Song of Solomon': 'SNG',
	Isaiah: 'ISA', Jeremiah: 'JER', Lamentations: 'LAM', Ezekiel: 'EZK', Daniel: 'DAN',
	Hosea: 'HOS', Joel: 'JOL', Amos: 'AMO', Obadiah: 'OBA', Jonah: 'JON', Micah: 'MIC',
	Nahum: 'NAM', Habakkuk: 'HAB', Zephaniah: 'ZEP', Haggai: 'HAG', Zechariah: 'ZEC',
	Malachi: 'MAL', Matthew: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT',
	Romans: 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', Galatians: 'GAL',
	Ephesians: 'EPH', Philippians: 'PHP', Colossians: 'COL', '1 Thessalonians': '1TH',
	'2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI', Titus: 'TIT',
	Philemon: 'PHM', Hebrews: 'HEB', James: 'JAS', '1 Peter': '1PE', '2 Peter': '2PE',
	'1 John': '1JN', '2 John': '2JN', '3 John': '3JN', Jude: 'JUD', Revelation: 'REV'
};

let englishAbbrevMapCache: Record<string, string> | null = null;

export function formatReferenceDisplay(
	verses: BibleVerse[],
	translation: string,
	defaultTranslation: string,
	translationDisplay: ScriptureSettings['translationDisplay'],
	referenceFormat: ReferenceFormat,
	options: ReferenceDisplayOptions = {}
): string {
	if (verses.length === 0) {
		return '';
	}

	const firstVerse = verses[0];
	const lastVerse = verses[verses.length - 1];
	const chapter = firstVerse.chapter;
	const includeTranslation = shouldIncludeTranslation(translation, defaultTranslation, translationDisplay);
	const translationSuffix = includeTranslation ? `, ${translation}` : '';

	if (options.isChapterReference) {
		return formatChapterDisplay(firstVerse.book, chapter, referenceFormat, translationSuffix);
	}

	let verseRange: string;
	if (verses.length === 1) {
		verseRange = firstVerse.verse.toString();
	} else if (firstVerse.chapter === lastVerse.chapter) {
		verseRange = `${firstVerse.verse}–${lastVerse.verse}`;
	} else {
		verseRange = `${firstVerse.verse}–${lastVerse.chapter}:${lastVerse.verse}`;
	}

	if (referenceFormat === 'chapter-verse') {
		return `${chapter}:${verseRange}${translationSuffix}`;
	}

	const bookName = getBookDisplayName(firstVerse.book, referenceFormat);
	return `${bookName} ${chapter}:${verseRange}${translationSuffix}`;
}

export function getBookDisplayName(bookName: string, referenceFormat: ReferenceFormat): string {
	switch (referenceFormat) {
		case 'chapter-verse':
			return '';
		case 'standard-abbrev':
			return toTitleCaseAbbreviation(STANDARD_BOOK_ABBREVIATIONS[bookName] || bookName);
		case 'english-abbrev':
			return toTitleCaseAbbreviation(getEnglishAbbreviation(bookName) || STANDARD_BOOK_ABBREVIATIONS[bookName] || bookName);
		case 'full-name':
		default:
			return bookName;
	}
}

function formatChapterDisplay(bookName: string, chapter: number, referenceFormat: ReferenceFormat, translationSuffix: string): string {
	if (referenceFormat === 'chapter-verse') {
		return `${chapter}${translationSuffix}`;
	}

	const displayBookName = getBookDisplayName(bookName, referenceFormat);
	return `${displayBookName} ${chapter}${translationSuffix}`;
}

function shouldIncludeTranslation(translation: string, defaultTranslation: string, translationDisplay: ScriptureSettings['translationDisplay']): boolean {
	switch (translationDisplay) {
		case 'never':
			return false;
		case 'always':
			return true;
		case 'except-default':
		default:
			return translation !== defaultTranslation;
	}
}

function getEnglishAbbreviation(bookName: string): string | null {
	if (!englishAbbrevMapCache) {
		englishAbbrevMapCache = buildEnglishAbbrevMap(book_abbrev_english);
	}
	return englishAbbrevMapCache[bookName] || null;
}

function buildEnglishAbbrevMap(source: any): Record<string, string> {
	const map: Record<string, string> = {};
	if (!source) return map;

	const add = (name: string, abbrev: string) => {
		if (!name || !abbrev) return;
		map[name] = toTitleCaseAbbreviation(abbrev);
	};

	if (Array.isArray(source)) {
		for (const entry of source) {
			if (Array.isArray(entry) && entry.length >= 2) {
				add(String(entry[0]), String(entry[1]));
				continue;
			}
			if (entry && typeof entry === 'object') {
				const name = entry.name || entry.book || entry.title || entry.full || entry.long;
				const abbrev = entry.abbrev || entry.abbreviation || entry.short;
				if (name && abbrev) add(String(name), String(abbrev));
			}
		}
	}

	if (source && typeof source === 'object') {
		for (const [key, value] of Object.entries(source)) {
			if (typeof value === 'string') {
				if (key.includes(' ') || /\d/.test(key)) {
					add(key, value);
				} else if (value.includes(' ') || /\d/.test(value)) {
					add(value, key);
				}
			}
		}
	}

	return map;
}

function toTitleCaseAbbreviation(abbrev: string): string {
	return abbrev.replace(/[A-Za-z]+/g, segment => {
		if (!segment) {
			return segment;
		}

		return `${segment.charAt(0).toUpperCase()}${segment.slice(1).toLowerCase()}`;
	});
}
