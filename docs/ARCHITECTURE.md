# Privon Vault Architecture Overview
_Version: 2.5.0-beta | Last Updated: 2026-06-21_

## Table of Contents
1. [Crypto Layer (crypto-core)](#1-crypto-layer-crypto-core)
2. [Database Encryption (IndexedDB)](#2-database-encryption-indexeddb)
3. [Metadata Encryption](#3-metadata-encryption)
4. [Automatic Encryption (Vault Default)](#4-automatic-encryption-vault-default)
5. [Manual Encryption](#5-manual-encryption)
6. [Encrypted Backup System](#6-encrypted-backup-system)
7. [Streaming Encryption](#7-streaming-encryption)
9. [Project Directory Structure](#9-project-directory-structure)

---

## 1. Crypto Layer (crypto-core)

All cryptographic operations run through a single Rust crate `crypto-core/` compiled to WASM (for browser/webview) and linked natively (for Tauri desktop).

### Rust Crate Modules (`crypto-core/src/`)

| File | Purpose |
|------|---------|
| `kdf.rs` | Argon2id key derivation (configurable iterations/memory/parallelism) |
| `aead.rs` | AES-256-GCM encrypt/decrypt, 12-byte nonce |
| `aes_ctr.rs` | AES-CTR + HKDF-SHA256 subkey split + HMAC-SHA256 Encrypt-then-MAC |
| `chacha_salsa.rs` | ChaCha20-Poly1305 (12B nonce), XChaCha20-Poly1305 (24B), Salsa20-Poly1305 (24B) |
| `stream.rs` | 4MB chunked streaming, `CRYTO_STREAM` magic header v1, per-chunk HMAC IV |
| `crypto.rs` | Composite ops: random_bytes, base64, encrypt/decrypt (vault default AES-GCM), encrypt_with_passphrase (6 algoritmi + Argon2id) |
| `key_wrapping.rs` | Recovery codes (10x CRYTO-NN-XXXX-XXXX-XXXX), wrap/unwrap raw key, derive_master_key |
| `backup_crypto.rs` | 26-char passphrase, backup_encrypt/decrypt Argon2id→AES-GCM `[16B salt][12B iv][ct+tag]` |
| `metadata_crypto.rs` | Encrypted metadata blobs AES-GCM (JSON → base64) |
| `security.rs` | PIN validation (6 digit, blacklist), exponential backoff, pin_hash/pin_verify |
| `threat_model.rs` | `get_argon_params(purpose, tier)` — JSON with iterations/memorySize/parallelism for 4 tiers |
| `sanitize.rs` | URL sanitization, HTML escape, MIME type safety (svg/html extension blocking) |
| `vault_storage.rs` | Encrypted key storage for vault entries (AES-GCM, JSON integrity) |
| `wasm_bindings.rs` | `#[wasm_bindgen]` bindings for all functions (307 lines) |

### JS Bridge (`crypto-core/index.ts`, 269 lines)

Imports from `./pkg/crypto_core.js` (wasm-bindgen output). Lazy-init with `ensureInit()`. 50+ exported functions: `derive_key`, `aes_gcm_encrypt/decrypt`, `aes_ctr_encrypt/decrypt`, `chacha20_poly1305_encrypt/decrypt`, `xchacha20_poly1305_encrypt/decrypt`, `salsa20_poly1305_encrypt/decrypt`, `stream_encrypt/decrypt`, `random_bytes`, `base64_encode/decode`, `generate_passphrase`, `generate_recovery_codes`, `parse_code_index`, `encrypt_with_passphrase/decrypt_with_passphrase`, `encrypt/decrypt`, `encrypt_string/decrypt_string`, `backup_encrypt/decrypt`, `wrap_raw_key/unwrap_raw_key`, `metadata_encrypt/decrypt`, `pin_hash/pin_verify`, `get_argon_params`, `vault_encrypt_keys/decrypt_keys`, `derive_master_key`, `generate_vault_key`, `validate_pin`, `get_backoff_time`, `is_safe_image_url`, `sanitize_url`, `escape_html`, `safe_mime_type_for_ext`.

### Tauri Native Bridge (`src-tauri/src/lib.rs`, 276 lines)

Same `crypto-core` crate linked natively. 38 `#[tauri::command]` functions registered covering all operations plus `greet`.

### Key Derivation

```
Master Password + Random Salt (16 bytes)
  → Argon2id (params per threat model tier, e.g. tier 4 = 19 iters / 262144 KB / 1 par)
  → 32-byte raw key
  → wrap_raw_key(MVK, masterKey) → localStorage privon_vault_wrappers
```

### Tauri Commands (38)

Utilitare: `greet`, `random_bytes`, `base64_encode`, `base64_decode`, `get_argon_params`
KDF: `derive_key`
AEAD: `aes_gcm_encrypt/decrypt`, `aes_ctr_encrypt/decrypt`
ChaCha/Salsa: `chacha20_poly1305_encrypt/decrypt`, `xchacha20_poly1305_encrypt/decrypt`, `salsa20_poly1305_encrypt/decrypt`
Streaming: `stream_encrypt/decrypt`
Composite: `encrypt_with_passphrase/decrypt_with_passphrase`, `encrypt/decrypt`, `encrypt_string/decrypt_string`
Backup/Recovery: `backup_encrypt/decrypt`, `generate_passphrase`, `generate_recovery_codes`, `wrap_raw_key/unwrap_raw_key`
Metadata: `metadata_encrypt/decrypt`
Security: `pin_hash`, `pin_verify`

---

## 2. Database Encryption (IndexedDB)

Implemented in `crypto-core/db.ts` (305 lines). `DB_NAME = 'PrivonVault'`, `DB_VERSION = 3`, single store `'files'` with `keyPath: 'id'`.

### Encryption on File Add
When a file is added via `db.addItem()`:
1. Check if `item.fileData` exists and `!item.isEncrypted`
2. Call `encrypt(plaintext, vaultKey)` (WASM) → `{ciphertext, iv}` JSON
3. Store in IndexedDB: `fileData`: Blob(ciphertext), `iv`, `algorithm: 'AES-GCM'`, `isEncrypted: true`

### VaultDB Methods
- `init()` — open/upgrade DB, v3 migration encrypts legacy metadata via cursor
- `addItem()` — encrypts metadata + fileData before store
- `updateItem()` — same encryption flow
- `getAllItems()` — returns all items
- `deleteItem()` — delete by id
- `clearDatabase()` — clear store
- `exportDatabase()` — items with fileDataBase64
- `importDatabase()` — validate + restore

Vault key is held in memory: `setVaultKey(key)`, `getVaultKey()`.

---

## 3. Metadata Encryption

Implemented in `crypto-core/src/metadata_crypto.rs` (46 lines) + WASM bindings. All sensitive metadata fields are encrypted with AES-256-GCM.

### Encryption Flow
```
{ name, tags, artist, album, coverUrl, customIcon, externalUrl }
  → JSON.stringify
  → metadata_encrypt(json, vaultKey)  // AES-256-GCM
  → { ciphertext: base64, iv: base64 }
  → stored in DBItem.encryptedMeta
```

### Fields Remain Plaintext
`id`, `parentId`, `type`, `size`, `date`, `category`, `isEncrypted`, `isTrashed`, `isFavorite`, `iv`, `salt`, `algorithm`, `iconOnlyMode`

---

## 4. Automatic Encryption (Vault Default)
- **Trigger**: Any file added via Dashboard, Upload, or New Folder
- **Algorithm**: AES-256-GCM
- **Key**: In-memory Vault Key (raw Uint8Array, not CryptoKey)
- **Storage**: IndexedDB with `isEncrypted: true` flag

---

## 5. Manual Encryption

Triggered via `EncryptionModal` component (`components/EncryptionModal.tsx`, 536 lines).

### 6 Supported Algorithms
| Algorithm | Description |
|-----------|-------------|
| AES-GCM-Stream | 4MB chunked streaming |
| AES-GCM | NIST-recommended standard |
| XChaCha20-Poly1305 | Extended 192-bit nonce |
| ChaCha20-Poly1305 | Mobile-optimized |
| AES-CTR + HMAC | Classic AES with integrity check |
| Salsa20-Poly1305 | DJB's original stream cipher |

### Flow
1. Algorithm selection
2. 32-byte random key generation
3. Decrypt if previously vault-encrypted
4. Encrypt with selected algorithm via WASM
5. Store in IndexedDB
6. Optional save to vault storage (encrypted in localStorage)

---

## 6. Encrypted Backup System

Implemented in `crypto-core/src/backup_crypto.rs` (88 lines) + `components/views/BackupView.tsx` (425 lines).

### Backup Creation
1. Generate 26-char passphrase (130 bits entropy, alphabet excludes ambiguous chars)
2. Collect: IndexedDB dump + whitelisted localStorage keys
3. Encrypt: Argon2id → AES-256-GCM → `[16B salt][12B IV][ciphertext + 16B GCM tag]`
4. Download as `.enc` file

### Backup Restoration
1. Upload `.enc` file + enter 26-char key
2. Decrypt → validate → restore whitelisted localStorage keys (18 keys) + `db.importDatabase()`
3. Reload

---

## 7. Streaming Encryption

Implemented in `crypto-core/src/stream.rs` (259 lines). Processes files in 4MB chunks.

### Format
```
[CRYTO_STREAM header v1][Chunk 0][Chunk 1]...[Chunk N]
```

Each chunk: AES-GCM encrypted with per-chunk IV derived via HMAC-SHA256(baseIV, chunkIndex).

---

---

## 9. Project Directory Structure

```
CrytoTool/
├── App.tsx                       # Root state machine (625ln)
├── index.tsx / index.html        # Entry points
├── index.css / types.ts          # Styles + types
│
├── crypto-core/                  # Rust WASM crate (inima proiectului)
│   ├── Cargo.toml
│   ├── src/lib.rs + 14 modules   # All crypto logic
│   ├── index.ts                  # JS bridge (269ln)
│   ├── db.ts                     # IndexedDB wrapper (305ln)
│   └── pkg/                      # WASM build output
│
├── components/                   # 20 .tsx files
│   ├── AuthScreen.tsx (1390ln)   # Setup/unlock/recovery
│   ├── Dashboard.tsx (1203ln)    # Main shell + view router + modals
│   ├── ui.tsx (662ln)            # Shared primitives
│   ├── AutoDestructCountdown     # Self-destruct timer
│   └── views/ (8 views)
│
├── utils/
│
├── locales/                      # 51 limbi
│
├── styles/                       # glass.css (603ln) + themes + fonts
│
├── src-tauri/                    # Tauri backend
│   ├── src/lib.rs (276ln)        # 38 comenzi
│
└── .github/workflows/            # 7 CI files
```

### IndexedDB Data Hierarchy
```
IndexedDB: "PrivonVault" (Version 3)
└── Object Store: "files" (keyPath: 'id')
    │
    ├── 📁 Root Folder (parentId: null)
    │   ├── 📄 File 1 (isEncrypted: true, algorithm: 'AES-GCM')
    │   ├── 📁 Subfolder
    │   │   ├── 📄 File 2 (isEncrypted: true, algorithm: 'XChaCha20-Poly1305')
    │   │   └── 📄 File 3 (isEncrypted: true, algorithm: 'AES-GCM-Stream')
    │   └── ...
    ├── 📁 Gallery Folder (category: 'image')
    ├── 📁 Music Folder (category: 'audio')
    └── 📁 System Folder (type: 'system')
```

### DBItem Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `parentId` | string \| null | Parent folder ID |
| `type` | 'file' \| 'folder' \| 'system' | Item type |
| `name` | string | Display name (empty if encryptedMeta present) |
| `encryptedMeta` | `{ ciphertext, iv }` | AES-GCM encrypted metadata |
| `size` | string | Human-readable size |
| `date` | string | Date |
| `fileData` | Blob | Encrypted file data |
| `iv` | string | Base64 IV |
| `salt` | string | Base64 salt (manual encryption) |
| `algorithm` | CryptoAlgorithm | Encryption algorithm |
| `isEncrypted` | boolean | Encrypted flag |
| `category` | 'image'\|'video'\|'audio'\|'doc'\|'other' | File category |
| `isTrashed` | boolean | Trash flag |
| `isFavorite` | boolean | Favorite flag |
| `tags` | Tag[] | Person tags |
