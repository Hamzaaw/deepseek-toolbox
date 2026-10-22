# Translations

The extension follows the browser's UI language. It does not change DeepSeek's language or translate your conversations and saved prompts.

## Current coverage

- **English, Persian (`fa`), Bengali (`bn`):** localized menus, settings, folder and bookmark tools, prompt and chain editors, confirmations, status messages, and export controls.
- **Arabic, German, Spanish, French, Hindi, Indonesian, Japanese, Korean, Brazilian Portuguese, Russian, Simplified Chinese, Traditional Chinese:** existing metadata and feature-label translations. Other interface text falls back to English. These are not complete interface translations.

The October 2026 audit checked all existing catalogs for matching metadata keys, nonempty values, manifest length limits, and intact placeholders. The original catalogs each contained only 11 messages; most interface text was hardcoded in English. Existing translated feature labels are now connected to the interface.

Persian and Arabic use right-to-left layout within Toolbox. Empty fields follow the interface direction; entered text chooses its own direction. DeepSeek's page direction is not changed.

Built-in example prompt bodies and their titles remain in English, and generated exports retain their existing format. Technical errors from external services may also be in English. Native-speaker feedback on wording is welcome.

## Contribute a translation

Edit `extension/_locales/<locale>/messages.json`. English is the reference catalog. Each `ui_` entry has an English `description` to identify its context. Copy the matching key from English and translate only its `message`.

Preserve `$VALUE1$` placeholders and their `placeholders` definitions. Keep prompt-template tokens such as `{topic}`, `{audience}`, `{tone}`, `{variable_name}`, and `{{variable}}` unchanged. Do not add HTML to messages. Keep `toolboxLocale` and `toolboxDirection` accurate for the catalog.

New interface text uses `ToolboxI18n.t('English text', [values])` for plain text or `ToolboxI18n.html(...)` inside HTML. Use `$1`, `$2`, etc. for substitutions. `ToolboxI18n.key(source)` derives the stable catalog key; changing the English source requires updating its catalog entries. Do not pass user content as a translation key.

Run `npm test` to validate all catalogs and test English fallback and safe substitutions. Run `npm run test:locales` after installing Playwright Chromium, or set `BROWSER_EXECUTABLE` to a compatible browser executable. Browser tests use disposable profiles, synthetic conversations, and test-only locale fallback selection; they never change an installed extension or real customer data.
