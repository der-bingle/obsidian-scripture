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
});
