import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default [
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsparser,
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
    },
    eslintConfigPrettier,
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
            quotes: ["error", "double", { avoidEscape: true, allowTemplateLiterals: false }],
        },
    },
];
