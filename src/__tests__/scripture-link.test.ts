import { describe, expect, it } from 'vitest';
import { resolveScriptureLink } from '../scripture-link';
import { DEFAULT_SETTINGS } from '../types';
import type { ScriptureSettings } from '../types';

const settings: ScriptureSettings = {
	...DEFAULT_SETTINGS,
	defaultTranslation: 'CSB',
	translations: [
		{
			name: 'CSB',
			fullName: 'Christian Standard Bible',
			filePath: 'Data/csb.json',
			availableAsNotes: true,
			notesDirectory: 'Bible',
		},
		{
			name: 'NLT',
			fullName: 'New Living Translation',
			filePath: 'Data/nlt.json',
		},
	],
};

describe('Scripture link resolution', () => {
	it('uses the configured notes directory', () => {
		expect(resolveScriptureLink(settings, 'NLT', 'James', 5, 19).target).toBe('Bible/James 5#19');
	});

	it('supports basename-only links', () => {
		expect(resolveScriptureLink({ ...settings, linkPathFormat: 'basename' }, 'CSB', 'James', 5, 19).target)
			.toBe('James 5#19');
	});

	it('falls back when the verse translation has no notes', () => {
		const result = resolveScriptureLink({ ...settings, linkingStrategy: 'verse-translation' }, 'NLT', 'Psalms', 23, 1);
		expect(result.target).toBe('Bible/Psalm 23#1');
		expect(result.didFallback).toBe(true);
		expect(result.warning).toContain('NLT has no Scripture notes');
	});
});
