# Privon Vault UI/UX Design Standards
_Version: 2.5.0-beta | Last Updated: 2026-06-21_

## Core Philosophy
**Privon Vault respects the people behind the screen.** Every design decision must prioritize the human experience: clarity, safety, and zero friction. We design for people, not "users".

---

## 1. Terminology Standards
### People, Not "Users"
- Always use **"persoane"** (RO) / **"people"** (EN) / localized equivalent
- Never use **"utilizatori"** (RO) / **"users"** (EN) in UI text
- Rationale: People are humans first, customers second. This language reinforces respect

### Other Reserved Terms
| Wrong | Correct | Context |
|--------|---------|---------|
| utilizatori | persoane | Romanian UI everywhere |
| users | people | English UI / docs |
| login | unlock | Vault access is about unlocking, not logging in |
| logout | lock | Vault exit is locking, not logging out |
| password | master password | Always specify "master" for vault |
| files | items | Generic term in some views |

---

## 2. Visual Language
### Glassmorphism (Default Style)
All surfaces use the glassmorphism design system defined in `styles/glass.css`:
- **Background**: `bg-zinc-900/80` with `backdrop-blur-xl`
- **Cards**: `glass-card` class (semi-transparent, border-zinc-800)
- **Surfaces**: `glass-surface` for nested elements
- **Accent**: Matte Metallic White `#E8E8E8` (default), customizable via HSL picker

### Color System
| Role | Color | Usage |
|------|-------|-------|
| Accent (Default) | `#E8E8E8` (Matte Metallic White) | Buttons, active states, success |
| Background | `#000000` (Black) | Main app background |
| Card BG | `#09090b` (Zinc-950) | Cards, modals |
| Border | `#27272a` (Zinc-800) | Subtle separation |
| Text Primary | `#fafafa` (Zinc-50) | Headings, active text |
| Text Muted | `#71717a` (Zinc-500) | Secondary text, labels |
| Danger | `#ef4444` (Red-500) | Warnings, delete actions |
| Warning | `#eab308` (Yellow-500) | Cautions, notices |

### Typography
- **Font Family**: System font stack via `font-sans` (`system-ui, -apple-system, sans-serif`)
- **Code/Keys**: `font-mono` (for encryption keys, hashes)
- **Sizes**: `text-xs` (10px) for metadata, `text-sm` (12px) for body, `text-base` (14px) for headings, `text-lg` (18px) for titles
- **Weights**: `font-bold` for actions, `font-black` for section headers

---

## 3. Component Architecture
### Modal Standards
All modals follow this structure (`components/EncryptionModal.tsx`, `components/DecryptModal.tsx`):
```tsx
<AnimatePresence>
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
    
    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
      className="relative w-full max-w-[95vw] md:max-w-lg glass-card rounded-2xl overflow-hidden">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green">
            <Shield size={20} />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
      </div>
      
      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {/* Content here */}
      </div>
      
      {/* Footer actions */}
      <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 flex justify-between items-center">
        <button onClick={onClose}>Back</button>
        <button onClick={handleAction} className="bg-white text-black">Action</button>
      </div>
    </motion.div>
  </div>
</AnimatePresence>
```

### File Items (`components/FileItem.tsx`)
- Use `motion.div` with `whileHover={{ scale: 1.02 }}` and `whileTap={{ scale: 0.98 }}`
- Show file type icon (from `CATEGORY_ICONS` in VaultView)
- Display: name (truncate), size, date, category badge
- Actions: right-click for `FileActionMenu.tsx`

### Buttons
| Variant | Class | Usage |
|----------|-------|-------|
| Primary | `bg-accent text-black font-bold uppercase` | Main actions (Encrypt, Save, Download) |
| Outline | `bg-transparent border border-zinc-800 hover:border-accent` | Secondary actions |
| Danger | `bg-red-500/5 border-red-500/20 text-red-400` | Delete, destructive actions |
| Glass | `glass-button` | Navigation, back buttons |

---

## 4. Animation Standards
### Framer Motion Usage
All page transitions use `AnimatePresence` with these presets:
```typescript
// Page enter/exit
initial: { opacity: 0, x: 50 }
animate: { opacity: 1, x: 0 }
exit: { opacity: 0, x: -50 }

// Modal open/close
initial: { opacity: 0, scale: 0.9, y: 20 }
animate: { opacity: 1, scale: 1, y: 0 }
exit: { opacity: 0, scale: 0.9, y: 20 }

// Item lists
initial: { opacity: 0, y: 20 }
animate: { opacity: 1, y: 0 }
transition: { delay: index * 0.05 } // staggered
```

### Loading States
- Use `Loader2` from `lucide-react` with `animate-spin` class
- Color: `text-neon-green` for primary, `text-zinc-500` for muted
- Size: `size-5` (20px) for inline, `size-8` (32px) for full-page

---

## 5. Responsive Design
### Breakpoints
| Breakpoint | Class Prefix | Target |
|------------|--------------|--------|
| Mobile | `default` (no prefix) | Phones (< 768px) |
| Tablet | `md:` | Tablets (768px+) |
| Desktop | `lg:` | Laptops (1024px+) |
| Wide | `xl:` | Desktops (1280px+) |

### Mobile-First Rules
- Always use `max-w-[95vw]` for modals on mobile, `max-w-lg` on desktop
- Touch targets: minimum `p-3` (12px) padding, `size-5` (20px) icons
- Font sizes: `text-[9px]` mobile, `text-xs` desktop for metadata
- Stack vertically on mobile, horizontally on desktop: `flex-col md:flex-row`

---

## 6. Accessibility (A11y)
### Keyboard Navigation
- All interactive elements must be focusable with `Tab`
- Modals trap focus inside (use `focus-trap-react` or manual implementation)
- `Escape` key closes modals
- `Enter` key triggers primary action

### Screen Readers
- Use `aria-label` for icon-only buttons
- Use `aria-live="polite"` for dynamic messages (errors, success)
- Use `role="dialog"` for modals
- Use `aria-disabled="true"` for disabled states (not just `disabled`)

### Color Contrast
- Text on glass: minimum 4.5:1 ratio (Zinc-50 on Zinc-900/80 passes)
- Accent on dark: Matte Metallic White `#E8E8E8` on dark passes
- Error/Warning text: Red-400, Yellow-400 on dark backgrounds pass

---

## 7. Internationalization (i18n)
### Adding a New Language
1. Open `locales/index.ts`
2. Add language code to `LANGUAGES` array
3. Create locale file `locales/{code}.ts` following the `Translations` interface
4. Use existing keys — never create new keys without updating ALL languages
5. Test with `App.tsx` locale state

### Translation Rules
- Keep strings concise (max 50 chars for buttons, 120 for descriptions)
- Use `{t('key')}` in components, never hardcoded strings (except error codes)
- For people-related terms: use localized equivalent of "people"/"persoane", never "user"/"utilizator"
- Format: `key: 'Text string'` (always quotes, never unquoted)

### RTL Support (Future)
- Components must not use `ml-*` / `mr-*` hardcoded — use `ms-*` / `me-*` (start/end)
- Flex direction: use `rtl:flex-row-reverse` where needed
- Text alignment: `text-start` instead of `text-left`

---

## 8. Theming System
### Modes
Dark/light/system mode toggle. `data-theme` attribute on `<html>` drives Tailwind classes.

### Accent Color Picker
- Use `components/CustomColorPicker.tsx`
- Accepts HSL values, converts to HEX for storage
- Stored in `localStorage` as `theme_accent`, `app_accent_manual`
- Applied via CSS variable `--accent-color` on `:root`

---

## 9. Pull Request Checklist for UI/UX Changes
Before submitting a PR that changes UI/UX:
- [ ] Uses **"persoane"/"people"** terminology (never "utilizatori"/"users")
- [ ] Follows glassmorphism style (no plain `bg-white` or `bg-zinc-900` without transparency)
- [ ] Responsive: tested on mobile (375px) and desktop (1920px)
- [ ] Animations use Framer Motion with provided presets
- [ ] All text uses `t('key')` (no hardcoded strings)
- [ ] A11y: keyboard navigable, screen-reader friendly
- [ ] i18n: English source strings updated in `locales/en.ts` (community handles translations)
- [ ] Theming: works with dark/light/system modes
- [ ] Performance: no layout shifts, smooth animations (60fps)
- [ ] Screenshots attached for visual changes

---

## 10. Common Patterns
### Error Display
```tsx
<div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start">
  <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
  <p className="text-xs text-red-500/80 leading-relaxed">{error}</p>
</div>
```

### Success/Info Box
```tsx
<div className="p-4 rounded-xl bg-neon-green/5 border border-neon-green/20">
  <p className="text-xs text-neon-green/80">{message}</p>
</div>
```

### Loading Skeleton (Future)
Use `animate-pulse` with `bg-zinc-800` for loading states:
```tsx
<div className="h-10 w-full bg-zinc-800 rounded-xl animate-pulse" />
```

---

## Resources
- **Technical Architecture**: [ARCHITECTURE.md](https://github.com/privonn/PrivonVault/blob/main/docs/ARCHITECTURE.md)
- **i18n Keys**: [locales/en.ts](https://github.com/privonn/PrivonVault/blob/main/locales/en.ts)
- **Glass CSS**: [styles/glass.css](https://github.com/privonn/PrivonVault/blob/main/styles/glass.css)
- **Crypto Architecture**: [crypto-core/src/](https://github.com/privonn/PrivonVault/tree/main/crypto-core/src)
