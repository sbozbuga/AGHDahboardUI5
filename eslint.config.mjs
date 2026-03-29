import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				sap: "readonly"
			},
			ecmaVersion: 2023,
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-redundant-type-constituents": "off"
		}
	},
	{
		linterOptions: {
			reportUnusedDisableDirectives: "off"
		}
	},
	{
		ignores: ["eslint.config.mjs"]
	}
);
