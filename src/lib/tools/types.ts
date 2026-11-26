/** Client-safe Tool types. Nothing here may import server-only code. */

export type Lane = 'heavy' | 'light';

export interface SelectField {
	type: 'select';
	label: string;
	options: { value: string; label: string }[];
	default: string;
	hint?: string;
}

export interface NumberField {
	type: 'number';
	label: string;
	min: number;
	max: number;
	step?: number;
	unit?: string;
	default: number;
	hint?: string;
}

export interface BooleanField {
	type: 'boolean';
	label: string;
	default: boolean;
	hint?: string;
}

export type SettingField = SelectField | NumberField | BooleanField;
export type SettingsSchema = Record<string, SettingField>;

export type SettingValue<F extends SettingField> = F extends SelectField
	? string
	: F extends NumberField
		? number
		: boolean;

export type SettingsOf<S extends SettingsSchema> = { [K in keyof S]: SettingValue<S[K]> };

export interface InputRules {
	accepts: { extensions: string[]; noun: string };
	maxBytes: number;
	maxDurationSec?: number;
}

/** External software a Tool needs; checked when the server starts. */
export type Dependency = 'ffmpeg' | 'ffprobe' | 'vocal-separator';

/** What a Tool's `meta.ts` default-exports. Client-safe. */
export interface ToolMeta extends InputRules {
	name: string;
	description: string;
	keywords: string[];
	lane: Lane;
	dependencies: Dependency[];
	settings: SettingsSchema;
	/** Position inside its Category; lower comes first. */
	order?: number;
	/**
	 * What the large numeral on a done Job shows: the size change (`saving`), the output
	 * format (`format`), or the output width (`width`). Left out, it says "Done".
	 */
	result?: 'saving' | 'format' | 'width';
}

export interface Tool extends ToolMeta {
	/** `<category>/<slug>`, from the Tool's folder path. */
	id: string;
	category: string;
	slug: string;
}

export interface Category {
	id: string;
	name: string;
	/** What powers the Category, shown under its name on the home page. */
	note: string;
	tools: Tool[];
}

export function defineTool<const M extends ToolMeta>(meta: M): M {
	return meta;
}
