import { describe, expect, it } from 'vitest';
import { convertScriptureReferencesToLinks } from '../scripture-reference-links';
import { DEFAULT_SETTINGS } from '../types';
import type { ScriptureSettings } from '../types';

const settings: ScriptureSettings = {
	...DEFAULT_SETTINGS,
	defaultTranslation: 'CSB',
	linkReferenceFormat: 'full-name',
	translations: [{
		name: 'CSB',
		fullName: 'Christian Standard Bible',
		filePath: 'Data/csb.json',
		availableAsNotes: true,
		notesDirectory: 'Bible',
	}],
};

describe('scripture reference link conversion', () => {
	it('uses canonical display formatting for names, abbreviations, and ranges', () => {
		const input = 'Read Jn. 3:16, Revelation 21:3-5, and 1 Cor. 13:1-4.';
		expect(convertScriptureReferencesToLinks(input, settings)).toEqual({
			text: 'Read [[Bible/John 3#16|John 3:16]], [[Bible/Revelation 21#3|Revelation 21:3–5]], and [[Bible/1 Corinthians 13#1|1 Corinthians 13:1–4]].',
			count: 3,
		});
	});

	it('honors the reference and path format settings', () => {
		const configured = { ...settings, linkReferenceFormat: 'standard-abbrev' as const, linkPathFormat: 'basename' as const };
		expect(convertScriptureReferencesToLinks('Jas. 1:16-18 and Mark 9', configured).text)
			.toBe('[[James 1#16|Jas 1:16–18]] and [[Mark 9|Mrk 9]]');
	});

	it('links verse and chapter ranges to their starting location', () => {
		expect(convertScriptureReferencesToLinks('John 3:16-4:2; Genesis 1-2', settings).text)
			.toBe('[[Bible/John 3#16|John 3:16–4:2]]; [[Bible/Genesis 1|Genesis 1–2]]');
	});

	it('adapts the parser canonical Psalms name to the plugin chapter-note title', () => {
		expect(convertScriptureReferencesToLinks('Ps. 136:1-9', settings).text)
			.toBe('[[Bible/Psalm 136#1|Psalms 136:1–9]]');
	});

	it('preserves frontmatter, code, wikilinks, and Markdown links', () => {
		const input = [
			'---',
			'title: John 3:16',
			'---',
			'John 3:16 and `Romans 8:28`',
			'```md',
			'Mark 9',
			'```',
			'[[Luke 15#1|Luke 15:1–2]]',
			'[Matthew 5:1](https://example.com)',
			'[Acts 2:1]: https://example.com',
		].join('\n');
		const result = convertScriptureReferencesToLinks(input, settings);

		expect(result.count).toBe(1);
		expect(result.text).toBe(input.replace('John 3:16 and', '[[Bible/John 3#16|John 3:16]] and'));
	});

	it('is idempotent on a second run and keeps repeated plain references', () => {
		const first = convertScriptureReferencesToLinks('John 3:16 and John 3:16', settings);
		const second = convertScriptureReferencesToLinks(first.text, settings);

		expect(first.count).toBe(2);
		expect(second).toEqual({ text: first.text, count: 0 });
	});

	it('leaves text unchanged when no note translation is configured', () => {
		expect(convertScriptureReferencesToLinks('John 3:16', DEFAULT_SETTINGS))
			.toEqual({ text: 'John 3:16', count: 0 });
	});
});
