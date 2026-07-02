import { describe, expect, it } from 'vitest';
import { resolveExistingScriptureTarget, resolveScriptureLink } from '../scripture-link';
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

	it('opens a consolidated-notes target only after resolving its existing file', () => {
		const target = resolveScriptureLink(settings, 'NLT', 'James', 5, 19).target;
		expect(target).toBe('Bible/James 5#19');
		expect(resolveExistingScriptureTarget(
			target!,
			'Study.md',
			(linkpath, sourcePath) => {
				expect(linkpath).toBe('Bible/James 5');
				expect(sourcePath).toBe('Study.md');
				return { path: 'Bible/James 5.md' };
			},
		)).toBe('Bible/James 5.md#19');
	});

	it('resolves basename-only links to their existing chapter file', () => {
		const target = resolveScriptureLink({ ...settings, linkPathFormat: 'basename' }, 'CSB', 'James', 5, 19).target;
		expect(resolveExistingScriptureTarget(
			target!,
			'Notes/Study.md',
			(linkpath) => linkpath === 'James 5' ? { path: 'Bible/James 5.md' } : null,
		)).toBe('Bible/James 5.md#19');
	});

	it('refuses to open an unresolved target', () => {
		expect(resolveExistingScriptureTarget(
			'Bible/James 5#19',
			'Study.md',
			() => null,
		)).toBeNull();
	});
});
