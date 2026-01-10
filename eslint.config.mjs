import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import react from "eslint-plugin-react"
import globals from "globals"

const baseConfig = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "quotes": ["error", "double"],
      "semi": ["error", "never"],
    },
  }
)

// The final configuration array.
export default [
    // Global ignores for all configurations.
    {
        ignores: ["dist/**", "node_modules/**"]
    },
    // Apply the base configuration only to .ts and .tsx files.
    ...baseConfig.map(config => ({...config, files: ["**/*.ts", "**/*.tsx", "eslint.config.mjs"]}))
]