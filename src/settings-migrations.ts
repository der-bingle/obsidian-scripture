import { DEFAULT_SETTINGS } from './types';
import type { BibleTranslation, ReferenceFormat, ScriptureSettings } from './types';

interface LegacyScriptureSettings extends Partial<ScriptureSettings> {
	referenceFormat?: ReferenceFormat;
	bibleDataPath?: string;
	defaultVersion?: string;
}

export interface SettingsMigrationResult {
	settings: ScriptureSettings;
	didMigrate: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export const migrateStoredSettings = (
	storedData: unknown,
	normalizePath: (path: string) => string = path => path,
): SettingsMigrationResult => {
	const loaded = (isRecord(storedData) ? storedData : {}) as LegacyScriptureSettings;
	const currentSettings = { ...loaded };
	delete currentSettings.referenceFormat;
	delete currentSettings.bibleDataPath;
	delete currentSettings.defaultVersion;

	const settings: ScriptureSettings = { ...DEFAULT_SETTINGS, ...currentSettings };
	let didMigrate = false;

	if (loaded.referenceFormat && !loaded.calloutReferenceFormat) {
		settings.calloutReferenceFormat = loaded.referenceFormat;
		didMigrate = true;
	}

	if (loaded.bibleDataPath && settings.translations.length === 0) {
		const name = loaded.defaultVersion || 'Default';
		const translation: BibleTranslation = {
			name,
			fullName: name,
			filePath: normalizePath(loaded.bibleDataPath),
		};
		settings.translations = [translation];
		settings.defaultTranslation = name;
		didMigrate = true;
	}

	return { settings, didMigrate };
};
