import { describe, expect, it } from 'vitest';
import { cloneScriptureSidebarState, createScriptureSidebarState, getScriptureSidebarNavigationTarget, parseScriptureSidebarState } from '../scripture-sidebar-state';
import { DEFAULT_SETTINGS } from '../types';
import type { BibleVerse } from '../types';
import type { PassageReference } from 'scripture-references';

const settings = {
	...DEFAULT_SETTINGS,
	defaultTranslation: 'CSB',
	sidebarDefaultTranslation: 'NLT',
	translations: [
		{ name: 'CSB', fullName: 'CSB', filePath: 'csb.json' },
		{ name: 'NLT', fullName: 'NLT', filePath: 'nlt.json' },
	],
};

describe('Scripture sidebar state', () => {
	it('starts with the configured sidebar default at Genesis 1 defaults', () => {
		const state = createScriptureSidebarState(settings);
		expect(state.translation).toBe('NLT');
		expect(state.chapter).toBe(1);
		expect(state.side).toBe('right');
	});

	it('sanitizes invalid persisted numeric state', () => {
		const state = parseScriptureSidebarState({ chapter: -3, anchorVerse: 0, side: 'left' }, settings);
		expect(state.chapter).toBe(1);
		expect(state.anchorVerse).toBe(1);
		expect(state.side).toBe('left');
	});

	it('clones location while assigning a new instance id', () => {
		const source = createScriptureSidebarState(settings, { bookId: 'JAS', chapter: 5, anchorVerse: 19 });
		const clone = cloneScriptureSidebarState(settings, source);
		expect(clone).toMatchObject({ translation: 'NLT', bookId: 'JAS', chapter: 5, anchorVerse: 19 });
		expect(clone.instanceId).not.toBe(source.instanceId);
	});

	it('derives a navigation target without extending persisted sidebar state', () => {
		const verse: BibleVerse = {
			id: 'JHN.003.016',
			book: 'John',
			chapter: 3,
			verse: 16,
			content: ['For God loved the world in this way.'],
		};
		const target = getScriptureSidebarNavigationTarget({
			ref: { book: 'jhn' } as PassageReference,
			verses: [verse],
		});

		expect(target).toEqual({ bookId: 'JHN', chapter: 3, anchorVerse: 16 });
		expect(Object.keys(target ?? {})).toEqual(['bookId', 'chapter', 'anchorVerse']);
	});
});
