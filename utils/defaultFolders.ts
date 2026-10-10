import { db, DBItem } from '../crypto-core/db';
import type { TranslationKey } from '../locales';

/** Classic folders that ship with every vault. */
export const CLASSIC_FOLDER_CATEGORY: Record<string, 'image' | 'audio' | 'video' | 'doc' | 'other'> = {
  'folder-photos': 'image',
  'folder-music': 'audio',
  'folder-videos': 'video',
  'folder-documents': 'doc',
  'folder-downloads': 'other',
  'folder-archives': 'other',
  'folder-projects': 'other',
};

export const CLASSIC_FOLDER_NAME_KEYS: Record<string, TranslationKey> = {
  'folder-photos': 'folderPhotos',
  'folder-music': 'folderMusic',
  'folder-videos': 'folderVideos',
  'folder-documents': 'folderDocuments',
  'folder-downloads': 'folderDownloads',
  'folder-archives': 'folderArchives',
  'folder-projects': 'folderProjects',
};

const ENSURED_FLAG = 'privon_classic_folders_v3';

const CLASSIC_DISPLAY_NAMES: Record<string, string> = {
  'folder-photos': 'Photos',
  'folder-music': 'Music',
  'folder-videos': 'Videos',
  'folder-documents': 'Documents',
  'folder-downloads': 'Downloads',
  'folder-archives': 'Archives',
  'folder-projects': 'Projects',
};

const ARCHIVE_EXTS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'cbz', 'cbr', 'apk', 'dmg', 'msi', 'exe', 'appimage'];
const DOC_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'rtf', 'odt', 'epub'];

export function isClassicFolderId(id: string): boolean {
  return id in CLASSIC_FOLDER_CATEGORY;
}

export function classicRenameFlag(id: string): string {
  return `privon_renamed_${id}`;
}

/** Decide item category + destination folder for an uploaded file. */
export function classifyUpload(file: { name: string; type: string }): {
  category: 'image' | 'video' | 'audio' | 'doc' | 'other';
  folderId: string | null;
} {
  const mime = file.type || '';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (mime.startsWith('image/')) return { category: 'image', folderId: 'folder-photos' };
  if (mime.startsWith('video/')) return { category: 'video', folderId: 'folder-videos' };
  if (mime.startsWith('audio/')) return { category: 'audio', folderId: 'folder-music' };
  if (ARCHIVE_EXTS.includes(ext)) return { category: 'other', folderId: 'folder-archives' };
  if (DOC_EXTS.includes(ext) || mime.startsWith('text/') || mime === 'application/pdf') {
    return { category: 'doc', folderId: 'folder-documents' };
  }
  return { category: 'other', folderId: 'folder-downloads' };
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
