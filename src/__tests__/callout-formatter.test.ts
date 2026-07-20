import { describe, expect, it } from 'vitest';
import { CalloutFormatter } from '../callout-formatter';
import { DEFAULT_SETTINGS } from '../types';
import type { BibleVerse } from '../types';

const verses: BibleVerse[] = [
	{
		id: 'JHN.3.16',
		book: 'John',
		chapter: 3,
		verse: 16,
		content: ['For God loved the world.'],
		newParagraph: true,
	},
	{
		id: 'JHN.3.17',
		book: 'John',
		chapter: 3,
		verse: 17,
		content: ['He did not send his Son to condemn the world.'],
	},
];

describe('callout formatting', () => {
	it('preserves the established scripture callout shape', () => {
		const formatter = new CalloutFormatter({
			...DEFAULT_SETTINGS,
			defaultTranslation: 'CSB',
			translations: [{
				name: 'CSB',
				fullName: 'Christian Standard Bible',
				filePath: 'Data/csb.json',
				availableAsNotes: true,
				notesDirectory: 'Bible/CSB',
			}],
		});
		const output = formatter.formatCallout('John 3:16-17', verses, 'CSB', true);

		expect(output).toContain('> [!scripture] [[Bible/CSB/John 3#16|John 3:16–17]]');
		expect(output).toContain('> <sup>16</sup>For God loved the world.');
		expect(output).toContain('<sup>17</sup>He did not send his Son');
	});

	it('defers to the verseNumbers setting when includeVerseNumbers is omitted', () => {
		const exclude = new CalloutFormatter({ ...DEFAULT_SETTINGS, verseNumbers: 'exclude' });
		expect(exclude.formatCallout('John 3:16-17', verses, 'CSB')).not.toContain('<sup>');

		const include = new CalloutFormatter({ ...DEFAULT_SETTINGS, verseNumbers: 'include' });
		expect(include.formatCallout('John 3:16-17', verses, 'CSB')).toContain('<sup>16</sup>');

		const excludeFirst = new CalloutFormatter({ ...DEFAULT_SETTINGS, verseNumbers: 'exclude-first' });
		const output = excludeFirst.formatCallout('John 3:16-17', verses, 'CSB');
		expect(output).not.toContain('<sup>16</sup>');
		expect(output).toContain('<sup>17</sup>');
	});

	it('honours an explicit includeVerseNumbers over the setting', () => {
		const formatter = new CalloutFormatter({ ...DEFAULT_SETTINGS, verseNumbers: 'include' });
		expect(formatter.formatCallout('John 3:16-17', verses, 'CSB', false)).not.toContain('<sup>');
	});

	it('applies the folding indicator from settings', () => {
		const formatter = new CalloutFormatter({ ...DEFAULT_SETTINGS, calloutFolding: 'foldable-expanded' });
		expect(formatter.formatCallout('John 3:16-17', verses, 'CSB')).toContain('> [!scripture]+ ');
	});

	it('keeps imported text literal in generated markdown', () => {
		const formatter = new CalloutFormatter(DEFAULT_SETTINGS);
		const unsafeVerse = [{ ...verses[0]!, content: ['<img src=x onerror=alert(1)>'] }];
		expect(formatter.formatCallout('John 3:16', unsafeVerse, 'CSB', false))
			.toContain('<img src=x onerror=alert(1)>');
	});
});
