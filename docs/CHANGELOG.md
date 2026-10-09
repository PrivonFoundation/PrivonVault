# Changelog

All notable changes to Privon Vault will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Redesign (`feat/onboarding-anytype-keyframe`)

- Removed the Snow mascot (assets, texts, placeholders); text-only branding.
- New native welcome (own slogan), rebuilt vault import with restore.
- Settings as native bottom sheets (quick + full + option sub-sheets).
- System theme mode (dark / light / system) with OS follow.
- Dashboard: compact header, profile/add sheets, FAB, files grid, native rows.
- Gallery: 3-column grid + immersive viewer (swipe, zoom, actions).
- Music: working tabs, drill-down, action sheet, shuffle.
- Classic folders (Photos/Music/Videos/Documents) with auto-filing.
- Docs: new `docs/REDESIGN.md` tracking this pass.

## [2.5.0-beta] - 2026-05-27

### First Official Beta Release

Privon Vault is a four-in-one, client-side encrypted file manager, gallery, music player, and document viewer. Zero tracking, zero ads, zero data collection. Fully compliant with [Protocol-3305](https://github.com/ObscuritySecurity/protocol-3305).

### Encryption System — 4 Layers

- **Layer 1 — Database Encryption (IndexedDB):** Every file stored in IndexedDB is auto-encrypted with AES-256-GCM. Master key derived from the person's Master Password via Argon2id (params per threat model tier, e.g. tier 4: 256 MB memory, 19 iterations).
- **Layer 2 — File & Folder Encryption:** Manual encryption supporting 6 algorithms: AES-256-GCM, XChaCha20-Poly1305, ChaCha20-Poly1305, AES-CTR (256-bit), Salsa20-Poly1305, AES-GCM-Stream.
- **Layer 3 — Encrypted Backup:** Full vault backups protected with Argon2id + AES-256-GCM and a unique 26-character key.
- **Layer 4 — Streaming Encryption:** Large files processed in 4MB chunks with per-chunk AES-GCM encryption, safe for low-RAM devices.

### Security Features

- **Master Password (30+ characters)** — vault-wide encryption gate
- **Settings Password** — separate optional password for sensitive settings
- **Progressive Lockout** — increasing delays after failed attempts (configurable)
- **Self-Destruct** — database auto-wipe after configurable failed attempts
- **Auto-Lock & Visual Obfuscation** — blur + lock after inactivity
- **Dead Man Switch** — auto-blur, auto-lock, auto-destruct on prolonged inactivity
- **Unique Key Per File/Folder** — each item encrypted with its own AES-256-GCM key
- **10 Recovery Codes** — single-use emergency access codes
- **PIN Blacklist** — common/weak PINs blocked
- **Encrypted Backup Key** — separate key for backup protection

### Key Management

- **Master Key Derivation:** Argon2id (params per threat model tier, Rust crypto-core WASM)
- **Passphrase KDF:** Argon2id (params per tier) for manual file encryption
- **Backup KDF:** Argon2id + AES-256-GCM
- **Streaming KDF:** Argon2id (params per tier)
- **AES-CTR Key Derivation:** WebCrypto native HKDF-SHA256
- **Streaming Nonces:** HMAC-SHA256-based per-chunk derivation (prevents collision)

### File Management

- File manager with add, rename, duplicate, move, copy, download, encrypt, decrypt
- Folder organization with custom icons and categories
- Search across all files and folders
- Trash system with restore capability
- Storage overview by file type (photos, videos, music, documents)

### Multiple Views

- **Gallery** — photos and videos with favorites and albums
- **Music** — audio playback with albums, artists, playlists
- **Documents** — view standard document formats
- **Vault** — categorized encryption key storage

### Customization

- **100 themes** across multiple categories
- **40+ fonts** across multiple categories (21 imported, 123 defined)
- **10+ icon packs** for folders and files (or upload your own)
- **Dark / Light / System mode**
- **Custom accent color** via built-in color picker
- **Custom labels** for file organization

### Internationalization

- **51 languages** fully translated
- Interface adapts to locale automatically

### Cryptographic Libraries

- **[Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/)** — AES-256-GCM encryption, random IV generation, CryptoKey management
- **[hash-wasm](https://github.com/Daninet/hash-wasm)** — Argon2id (128MB memory, 19 iterations)
- **[libsodium-wrappers](https://github.com/jedisct1/libsodium.js)** — ChaCha20, XChaCha20, Salsa20, BLAKE2b
- **[NIST SP 800-38D](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-38d.pdf)** — AES-GCM standard

### Platform Support

- **Desktop:** Windows (MSI, EXE), Linux (AppImage, deb, rpm), macOS (DMG, APP) — via Tauri
- **Mobile:** Android (APK), iOS (IPA) — via Tauri v2
- **Web:** Any browser with Web Crypto API support — via Vite

### stack 

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Desktop:** Tauri 2 (Rust + WebView)
- **Mobile:** tauri 2 (Rust + WebView)
- **Storage:** IndexedDB + localStorage (100% client-side, zero server)
- **Build:** TypeScript strict mode, `npx tsc --noEmit` for type-checking


### Known Limitations (Beta)

- No professional third-party security audit yet (planned for future)
- iOS build requires macOS + Apple Developer account

---
