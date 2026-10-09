import { db, DBItem } from '../crypto-core/db';
import type { TranslationKey } from '../locales';

/** Classic folders that ship with every vault: Photos, Music, Videos, Documents. */
export const CLASSIC_FOLDER_CATEGORY: Record<string, 'image' | 'audio' | 'video' | 'doc'> = {
  'folder-photos': 'image',
  'folder-music': 'audio',
  'folder-videos': 'video',
  'folder-documents': 'doc',
};

export const CLASSIC_FOLDER_NAME_KEYS: Record<string, TranslationKey> = {
  'folder-photos': 'folderPhotos',
  'folder-music': 'folderMusic',
  'folder-videos': 'folderVideos',
  'folder-documents': 'folderDocuments',
};

const ENSURED_FLAG = 'privon_classic_folders_v1';

const CLASSIC_DISPLAY_NAMES: Record<string, string> = {
  'folder-photos': 'Photos',
  'folder-music': 'Music',
  'folder-videos': 'Videos',
  'folder-documents': 'Documents',
};

export function isClassicFolderId(id: string): boolean {
  return id in CLASSIC_FOLDER_CATEGORY;
}

export function classicRenameFlag(id: string): string {
  return `privon_renamed_${id}`;
}

export function classicFolderIdForCategory(category?: string): string | null {
  for (const [id, cat] of Object.entries(CLASSIC_FOLDER_CATEGORY)) {
    if (cat === category) return id;
  }
  return null;
}

/** Creates the classic folders once (existing vaults included). Never re-creates deleted ones. */
export async function ensureClassicFolders(): Promise<void> {
  if (localStorage.getItem(ENSURED_FLAG)) return;
  try {
    const existing = new Set((await db.getAllItems()).map(i => i.id));
    const date = new Date().toLocaleDateString();
    for (const id of Object.keys(CLASSIC_FOLDER_CATEGORY)) {
      if (existing.has(id)) continue;
      const item: DBItem = {
        id,
        parentId: null,
        type: 'folder',
        name: CLASSIC_DISPLAY_NAMES[id] ?? id,
        date,
        isTrashed: false,
        isFavorite: false,
        category: 'other',
      };
      await db.addItem(item);
    }
  } catch (e) {
    console.error('Failed to ensure classic folders', e);
  } finally {
    localStorage.setItem(ENSURED_FLAG, '1');
  }
}
