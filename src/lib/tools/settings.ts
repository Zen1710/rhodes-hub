import type { SettingField, SettingsOf, SettingsSchema } from './types';

export type ParseResult<S extends SettingsSchema> =
	{ ok: true; value: SettingsOf<S> } | { ok: false; errors: Partial<Record<keyof S, string>> };

type FieldResult = { ok: true; value: unknown } | { ok: false; error: string };

function parseField(field: SettingField, input: string): FieldResult {
	switch (field.type) {
		case 'number': {
			const n = input.trim() === '' ? NaN : Number(input);
			return Number.isFinite(n) && n >= field.min && n <= field.max
				? { ok: true, value: n }
				: {
						ok: false,
						error: `${field.label} must be a number from ${field.min} to ${field.max}.`
					};
		}
		case 'boolean':
			return input === 'true' || input === 'false'
				? { ok: true, value: input === 'true' }
				: { ok: false, error: `${field.label} must be true or false.` };
		case 'select': {
			const values = field.options.map((o) => o.value);
			return values.includes(input)
				? { ok: true, value: input }
				: { ok: false, error: `${field.label} must be one of: ${values.join(', ')}.` };
		}
	}
}

/** Turns raw string values (query string, form) into typed settings, filling defaults. */
export function parseSettings<S extends SettingsSchema>(
	schema: S,
	raw: Record<string, string | undefined>
): ParseResult<S> {
	const value: Record<string, unknown> = {};
	const errors: Record<string, string> = {};

	for (const [key, field] of Object.entries(schema)) {
		const input = raw[key];
		if (input === undefined) {
			value[key] = field.default;
			continue;
		}
		const result = parseField(field, input);
		if (result.ok) value[key] = result.value;
		else errors[key] = result.error;
	}

	return Object.keys(errors).length > 0
		? { ok: false, errors: errors as Partial<Record<keyof S, string>> }
		: { ok: true, value: value as SettingsOf<S> };
}
