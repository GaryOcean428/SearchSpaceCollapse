import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

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
      "jsx-a11y": jsxA11yPlugin,
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

      // Accessibility Rules (jsx-a11y)
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/aria-activedescendant-has-tabindex": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/iframe-has-title": "error",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/media-has-caption": "warn",
      "jsx-a11y/mouse-events-have-key-events": "warn",
      "jsx-a11y/no-access-key": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-distracting-elements": "error",
      "jsx-a11y/no-interactive-element-to-noninteractive-role": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-to-interactive-role": "warn",
      "jsx-a11y/no-noninteractive-tabindex": "warn",
      "jsx-a11y/no-redundant-roles": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/scope": "error",
      "jsx-a11y/tabindex-no-positive": "warn",
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
