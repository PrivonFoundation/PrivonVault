# Privon Vault UX Redesign

_Branch: `feat/onboarding-anytype-keyframe` | Status: in progress_

This document tracks the redesign pass that replaces the mascot-driven UI
with a native, monochrome, sheet-based UX. Only the project's own slogan
("All-in-One Privacy") is used.

## Principles

- **Native first**: bottom sheets, grouped rows, hairline separators, system fonts.
- **Monochrome**: app accent only (`--accent-color`, default Matte Metallic White `#E8E8E8`).
- **No mascot**: text-only branding (no images, no characters).
- **Local-only**: no new network calls, permissions, or telemetry.

## What changed

### Onboarding (`components/AuthScreen.tsx`)
- Welcome: wordmark + serif/sans hero with own slogan, two pill actions
  (Create a new vault / Import an existing vault), consent line, gear opening
  the quick settings sheet (Appearance + 51 languages).
- Benefits screen removed. Key screen is now a two-step primary button
  (Reveal and copy → Continue); the "save it later" bypass is gone.
- Import flow rebuilt with option cards: backup file + key form → restore via `backup_decrypt` with the same
  localStorage whitelist as `BackupView` → reload.

### Settings
- `components/QuickSettingsSheet.tsx` (new, reusable): Appearance rows +
  language list in grouped sheet style. Used on welcome.
- `components/views/SettingsView.tsx`: full-page view converted to a native
  bottom sheet with profile header and grouped rows (Application / Security /
  More). Selection-type settings open dedicated sub-sheets (Appearance Aa
  cards, language list, region list); toggles/sliders stay inline.

### Theme (`utils/theme.ts`, `types.ts`)
- New `ThemeMode = 'dark' | 'light' | 'system'`; `AppTheme` stays the resolved
  concrete theme. Helpers: `getSavedThemeMode()`, `resolveThemeMode()`
  (via `matchMedia`), `applyThemeMode()` (DOM + `meta theme-color`).
- `index.html` pre-paint script resolves `system`; Dashboard follows OS
  changes live.

### Dashboard
- `components/TopActions.tsx`: compact header (avatar → profile menu,
  centered tab title, + → add menu, global search field).
- `components/HomeSheets.tsx` (new): ProfileSheet (Settings/Storage/Trash)
  and AddSheet (Add file / New folder).
- Files tab is a virtualized 3-column grid (`FileItem layout="grid"`):
  photo thumbnails, real folder icons, amber-free monochrome, folders and
  system entries sorted first.
- `components/FolderIcon.tsx` (new): premium monochrome SVG folder mark
  following the app accent. FAB for quick file add.

### Gallery (`components/views/GalleryView.tsx`)
- Edge-to-edge 3-column virtualized grid, segmented filter
  (All/Photos/Videos/Favorites), item counter, native empty states.
- Immersive viewer: swipe navigation, tap-to-hide chrome, double-tap zoom
  with pan, share / favorite / delete actions, details panel.

### Music (`components/views/MusicView.tsx`)
- Tabbed browser style: working Songs/Albums/Artists/Favorites tabs,
  album/artist drill-down, Quick picks carousel, working shuffle,
  per-song action sheet (Play / Favorite / Delete).

### Classic folders (`utils/defaultFolders.ts`)
- Every vault ships Photos, Music, Videos, Documents, Downloads, Archives
  (stable IDs, localized display names, user rename respected, safe to delete).
- Files added at root are auto-filed by category; explicit folder context is
  respected.

## i18n
New keys in `TranslationKey` + `en`/`ro`/`es` (others fall back to English):
`welcomeHeroLine1/2`, `welcomeNewHere`, `welcomeHaveKey`, `welcomeConsent`,
`restoreTitle/Subtitle/FromFile/FromFileDesc/StartFresh/StartFreshDesc`,
`settingsProfileName`, `settingsGroupApplication/Security/More`,
`settingsAppearance`, `settingsModeLabel`, `folderPhotos/Music/Videos/Documents/Downloads/Archives`.

## Verification
- `npx tsc --noEmit` passes (required by PR template).
- `npm run build` passes (tsc + vite build).
- `crypto-core/` and `src-tauri/` untouched (no crypto changes).
