import { describe, expect, it } from 'vitest';
import { parseScriptureSidebarUriRequest } from '../scripture-sidebar-uri';

describe('Scripture sidebar URI', () => {
	it('parses a reference with explicit sidebar options', () => {
		expect(parseScriptureSidebarUriRequest({
			reference: ' John 3:16 ',
			translation: ' NLT ',
			newSidebar: 'true',
		})).toEqual({
			reference: 'John 3:16',
			translation: 'NLT',
			newSidebar: true,
		});
	});

	it('supports the reference aliases and new-leaf compatibility flag', () => {
		expect(parseScriptureSidebarUriRequest({ ref: 'Psalm 23', newLeaf: '1' })).toEqual({
			reference: 'Psalm 23',
			translation: undefined,
			newSidebar: true,
		});
		expect(parseScriptureSidebarUriRequest({ q: 'Romans 8:28' }).reference).toBe('Romans 8:28');
	});

	it('returns an empty reference when no supported parameter is present', () => {
		expect(parseScriptureSidebarUriRequest({})).toEqual({
			reference: '',
			translation: undefined,
			newSidebar: false,
		});
	});
});
