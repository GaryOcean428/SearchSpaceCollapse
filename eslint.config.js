import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".cache/**",
      "attached_assets/**",
      "*.config.js",
      "*.config.ts",
      "build/**",
      ".venv/**",
      "qig-backend/**",
      "scripts/**",
      "data/**",
      "persistent_data/**",
      "migrations/**",
      "e2e/**",
      "docs/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": "off",

      // Architectural Pattern Enforcement

      // 1. Barrel File Pattern: Block deep component imports
      "no-restricted-imports": ["warn", {
        "patterns": [
          {
            "group": ["**/components/*/**", "!**/components/*/index"],
            "message": "Use barrel imports from component directories (import from index.ts)"
          },
          {
            "group": ["**/ui/*/**", "!**/ui/index"],
            "message": "Import UI components from @/components/ui barrel file"
          }
        ]
      }],

      // 2. Centralized API Client: No raw fetch in components
      "no-restricted-syntax": [
        "warn",
        {
          "selector": "CallExpression[callee.name='fetch']",
          "message": "Use centralized API client from @/lib/api instead of raw fetch()"
        }
      ],

      // 7. Configuration as Code: No magic numbers (except -1, 0, 1, 2)
      "no-magic-numbers": ["warn", {
        "ignore": [-1, 0, 1, 2],
        "ignoreArrayIndexes": true,
        "ignoreDefaultValues": true,
        "enforceConst": true,
        "ignoreEnums": true,
        "ignoreNumericLiteralTypes": true,
        "ignoreReadonlyClassProperties": true,
      }],
    },
  },

  // Special rules for .tsx files (React components)
  {
    files: ["**/*.tsx"],
    rules: {
      // 6. Custom Hooks: Warn on large components (>200 lines suggests need for extraction)
      "max-lines": ["warn", {
        "max": 200,
        "skipBlankLines": true,
        "skipComments": true,
      }],
    },
  },
];
