# Internationalization (i18n) Guide

This application supports multiple languages (currently English and German) using `next-intl` with cookie-based locale storage.

## Architecture Overview

- **Language Storage**: User preference is stored in a cookie (`NEXT_LOCALE`)
- **Middleware**: Reads locale from cookie and sets it in request headers
- **Translation Files**: JSON files located in `/messages/` directory
- **Works in**: Both client and server components

## Adding New Translations

### 1. Update Translation Files

Add your translations to both language files:

**`messages/en.json`**
```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is a description"
  }
}
```

**`messages/de.json`**
```json
{
  "myFeature": {
    "title": "Meine Funktion",
    "description": "Dies ist eine Beschreibung"
  }
}
```

### 2. Using Translations in Client Components

```tsx
"use client";

import { useTranslations } from 'next-intl';

export function MyClientComponent() {
  const t = useTranslations();

  return (
    <div>
      <h1>{t('myFeature.title')}</h1>
      <p>{t('myFeature.description')}</p>
    </div>
  );
}
```

### 3. Using Translations in Server Components

```tsx
import { useTranslations } from 'next-intl';

export default async function MyServerComponent() {
  const t = await useTranslations();

  return (
    <div>
      <h1>{t('myFeature.title')}</h1>
      <p>{t('myFeature.description')}</p>
    </div>
  );
}
```

### 4. Translations with Variables

**Translation file:**
```json
{
  "greeting": "Hello {name}!",
  "itemCount": "You have {count} items"
}
```

**Component:**
```tsx
const t = useTranslations();

// Simple variable
<p>{t('greeting', { name: 'John' })}</p>

// Multiple variables
<p>{t('itemCount', { count: 5 })}</p>
```

## Language Toggle

The language toggle is available in the main navigation sidebar (user dropdown menu). Clicking it will:
1. Update the cookie
2. Load new translations
3. Reload the page to apply changes throughout the app

## Accessing Current Locale

### In Client Components

```tsx
"use client";

import { useLanguage } from '@/components/language-provider';

export function MyComponent() {
  const { locale, setLocale } = useLanguage();

  return (
    <div>
      <p>Current language: {locale}</p>
      <button onClick={() => setLocale(locale === 'en' ? 'de' : 'en')}>
        Toggle Language
      </button>
    </div>
  );
}
```

### In Server Components

```tsx
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, defaultLocale } from '@/i18n/config';

export default async function MyServerComponent() {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE)?.value || defaultLocale;

  return <div>Current locale: {locale}</div>;
}
```

## Adding a New Language

1. **Create translation file**: Add a new JSON file in `/messages/` (e.g., `fr.json`)

2. **Update config**: Edit `/i18n/config.ts`
```typescript
export const locales = ['en', 'de', 'fr'] as const;
```

3. **Update middleware**: Edit `/middleware.ts`
```typescript
const locales = ['en', 'de', 'fr'];
```

4. **Update language toggle**: Edit the language toggle in `/components/custom/main-nav.tsx` to include the new language option

## File Structure

```
/
├── messages/
│   ├── en.json          # English translations
│   └── de.json          # German translations
├── i18n/
│   └── config.ts        # i18n configuration
├── components/
│   └── language-provider.tsx  # Language context and provider
└── middleware.ts        # Cookie-based locale detection
```

## Best Practices

1. **Organize translations logically**: Group related translations under common keys (e.g., `navigation.*`, `common.*`, `errors.*`)

2. **Use namespaces**: For large features, create separate namespace sections in the JSON files

3. **Keep keys consistent**: Use the same key structure in all language files

4. **Add translations early**: When creating new features, add translations immediately rather than hardcoding strings

5. **Test both languages**: Always verify that your feature works correctly in all supported languages

## Examples in Codebase

- **Navigation**: See `/components/custom/main-nav.tsx`
- **Agent Selection**: See `/components/agent-selection-dialog.tsx`
- **Layout**: See `/app/(application)/layout.tsx`

## Troubleshooting

- **Translations not updating**: Clear cookies and reload the page
- **Missing translations**: Check that the key exists in both language files
- **Type errors**: Ensure all translation files have the same structure
