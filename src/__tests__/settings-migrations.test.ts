import { describe, expect, it } from 'vitest';
import { migrateStoredSettings } from '../settings-migrations';

describe('settings migrations', () => {
	it('migrates legacy reference and single-translation settings', () => {
		const result = migrateStoredSettings({
			referenceFormat: 'english-abbrev',
			bibleDataPath: '/Data//csb.json',
			defaultVersion: 'CSB',
		}, path => path.replace(/^\/+/, '').replace(/\/{2,}/g, '/'));

		expect(result.didMigrate).toBe(true);
		expect(result.settings.calloutReferenceFormat).toBe('english-abbrev');
		expect(result.settings.defaultTranslation).toBe('CSB');
		expect(result.settings.sidebarDefaultTranslation).toBe('CSB');
		expect(result.settings.linkPathFormat).toBe('configured-path');
		expect(result.settings.scriptureListReferenceAction).toBe('note');
		expect(result.settings.translations).toEqual([{
			name: 'CSB',
			fullName: 'CSB',
			filePath: 'Data/csb.json',
		}]);
	});

	it('uses defaults for invalid saved data', () => {
		const result = migrateStoredSettings(null);
		expect(result.didMigrate).toBe(false);
		expect(result.settings.translations).toEqual([]);
	});

	it('defaults an older valid configuration to note links without forcing a migration', () => {
		const result = migrateStoredSettings({
			translations: [{ name: 'CSB', fullName: 'CSB', filePath: 'csb.json' }],
			defaultTranslation: 'CSB',
			sidebarDefaultTranslation: 'CSB',
			linkPathFormat: 'configured-path',
		});

		expect(result.didMigrate).toBe(false);
		expect(result.settings.scriptureListReferenceAction).toBe('note');
	});

	it('repairs invalid sidebar and link settings', () => {
		const result = migrateStoredSettings({
			translations: [{ name: 'CSB', fullName: 'CSB', filePath: 'csb.json' }],
			defaultTranslation: 'CSB',
			sidebarDefaultTranslation: 'MISSING',
			linkPathFormat: 'legacy',
			scriptureListReferenceAction: 'legacy',
			lastSidebarState: { chapter: -4, side: 'left' },
		});

		expect(result.didMigrate).toBe(true);
		expect(result.settings.sidebarDefaultTranslation).toBe('CSB');
		expect(result.settings.linkPathFormat).toBe('configured-path');
		expect(result.settings.scriptureListReferenceAction).toBe('note');
		expect(result.settings.lastSidebarState).toMatchObject({ chapter: 1, side: 'left' });
	});

	it('preserves the sidebar reference action', () => {
		const result = migrateStoredSettings({
			translations: [],
			defaultTranslation: '',
			sidebarDefaultTranslation: '',
			linkPathFormat: 'configured-path',
			scriptureListReferenceAction: 'sidebar',
		});

		expect(result.settings.scriptureListReferenceAction).toBe('sidebar');
	});
});
