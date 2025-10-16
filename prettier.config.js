/** @type {import('prettier').Config} */
module.exports = {
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',
  embeddedLanguageFormatting: 'auto',

  overrides: [
    {
      files: ['*.md'],
      options: {
        parser: 'markdown',
        proseWrap: 'preserve',
        embeddedLanguageFormatting: 'off',
      },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: {
        singleQuote: false,
      },
    },
    {
      files: ['*.json', '*.jsonc'],
      options: {
        parser: 'json',
        singleQuote: false,
      },
    },
    {
      files: ['package.json'],
      options: {
        parser: 'json-stringify',
        singleQuote: false,
      },
    },
  ],
};