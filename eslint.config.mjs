import nextPlugin from "@next/eslint-plugin-next";
import jsoncPlugin from "eslint-plugin-jsonc";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const eslintConfig = [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", ".vscode/**"],
  },
  ...tseslint.configs.recommended,
  ...jsoncPlugin.configs["flat/recommended-with-json"],
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": hooksPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",

      // Spacing token enforcement
      // Warns when hard-coded spacing classes are used instead of tokens
      // Allows 0 values (p-0, gap-0, etc.) as they're valid resets
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\b(p[xytblr]?-([1-9]|1[0-9]|2[0-4])|gap-([1-9]|1[0-9]|2[0-4])|space-[xy]-([1-9]|1[0-9]|2[0-4])|m[xytblr]?-([1-9]|1[0-9]|2[0-4]))\\b/]",
          message:
            "Avoid hard-coded spacing classes (px-*, py-*, gap-*, space-*, m-*). Use token classes instead (px-input-x, gap-space-md, space-y-section, etc.). See docs/UI-PATTERNS.md for guidance.",
        },
        // Color token enforcement
        // Warns when hard-coded color classes are used instead of semantic tokens
        // Examples: bg-red-500, text-green-600, border-blue-400
        // Use semantic tokens instead: bg-destructive, text-success, border-border
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\b(bg|text|border|ring|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\\b/]",
          message:
            "Avoid hard-coded color classes (bg-red-500, text-green-600, etc.). Use semantic tokens instead (bg-destructive, text-success, bg-card, border-border, etc.). See docs/UI-PATTERNS.md for guidance.",
        },
      ],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];

export default eslintConfig;
