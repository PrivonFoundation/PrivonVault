import { metadata_decrypt } from '../crypto-core/index';

interface EncryptedItem {
  id: string;
  encryptedMeta: { ciphertext: string; iv: string };
}

interface DecryptedResult {
  id: string;
  name: string;
  tags?: any;
  artist?: string;
  album?: string;
  coverUrl?: string;
  customIcon?: string;
  externalUrl?: string;
}

let tauriAvailable: boolean | null = null;

async function checkTauri(): Promise<boolean> {
  if (tauriAvailable !== null) return tauriAvailable;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('batch_decrypt_metadata', { items: [], key: new Uint8Array(32) });
    tauriAvailable = false;
    return false;
  } catch (e: any) {
    if (e && typeof e === 'object' && 'message' in e && String(e.message).includes('invoke')) {
      tauriAvailable = false;
    } else {
      tauriAvailable = true;
    }
    return tauriAvailable;
  }
}

export async function batchDecryptMetadata(
  items: EncryptedItem[],
  key: Uint8Array,
): Promise<DecryptedResult[]> {
  const isTauri = await checkTauri();
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const tauriItems = items.map(item => [
        item.id,
        JSON.stringify(item.encryptedMeta),
      ] as [string, string]);
      const results: any[] = await invoke('batch_decrypt_metadata', { items: tauriItems, key });
      return results.map(r => ({
        id: r.id,
        name: r.decrypted_name,
        tags: r.decrypted_tags,
        artist: r.decrypted_artist,
        album: r.decrypted_album,
        coverUrl: r.decrypted_cover_url,
        customIcon: r.decrypted_custom_icon,
        externalUrl: r.decrypted_external_url,
      }));
    } catch {
      return decryptViaWasm(items, key);
    }
  }
  return decryptViaWasm(items, key);
}

function decryptViaWasm(items: EncryptedItem[], key: Uint8Array): DecryptedResult[] {
  return items.map(item => {
    try {
      const meta = JSON.parse(metadata_decrypt(JSON.stringify(item.encryptedMeta), key));
      return { id: item.id, ...meta };
    } catch {
      return { id: item.id, name: 'untitled' };
    }
  });
}
