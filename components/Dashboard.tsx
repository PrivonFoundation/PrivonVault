
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, FolderPlus, Database, Search, Trash2, Settings, MoreVertical, 
  Folder, Image as ImageIcon, Music, FileText, ArrowLeft, Video, X,
  Pause, Play, SkipBack, SkipForward, ListMusic, ChevronDown, 
  Shuffle, Heart, Repeat, Share2, Menu, Moon, Copy, Move, SquarePen, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import { parseBlob } from 'music-metadata';
import { db, DBItem, getVaultKey } from '../crypto-core/db';
import { is_safe_image_url as isSafeImageUrl, decrypt, base64_encode, metadata_encrypt, metadata_decrypt } from '../crypto-core/index';
import { FileSystemItem, ViewState, AppTheme } from '../types';
import { useI18n } from '../locales/i18nContext';
import { FullPlayer } from './FullPlayer';
import { applyAccent, applyThemeMode, getSavedThemeMode, resolveThemeMode } from '../utils/theme';
import { classifyUpload, classicRenameFlag, ensureClassicFolders, isClassicFolderId, CLASSIC_FOLDER_NAME_KEYS } from '../utils/defaultFolders';
import type { ThemeMode } from '../types';

// Import Shared Components
import { FileItem } from './FileItem';
import { FileActionMenu } from './FileActionMenu';
import { TopActions } from './TopActions';
import { PinModal } from './PinModal';
import { EncryptionModal } from './EncryptionModal';
import { DecryptModal } from './DecryptModal';
import { CopyMoveModal } from './CopyMoveModal';
import { CustomizeModal } from './CustomizeModal';
import { AddSheet, ProfileSheet } from './HomeSheets';
import { FilesGrid } from './FilesGrid';
import { RecoveryCodesModal } from './RecoveryCodesModal';

// Import Views
import { StorageView } from './views/StorageView';
import { SettingsView, AboutView } from './views/SettingsView';
import { GalleryView } from './views/GalleryView';
import { MusicView } from './views/MusicView';
import { SearchView } from './views/SearchView';
import { TrashView } from './views/TrashView';
import { VaultView } from './views/VaultView';
import { DevCredentialsView } from './views/DevCredentialsView';
import { BackupView } from './views/BackupView';

interface DashboardProps {
  recoverySettings: {
    codes: string[] | null;
    count: number;
    regenerate: () => void;
    dismissCodes: () => void;
  };
  vaultSettings: {
    enabled: boolean;
    pin: string | null;
    update: (enabled: boolean, pin: string | null) => void;
    tier?: number;
    vaultPinAllowed?: boolean;
  };
  autoBlurSettings: { value: number; setValue: (val: number) => void; };
  autoLockSettings: { value: number; setValue: (val: number) => void; };
  progressiveLockSettings: {
    lockTime: number;
    setLockTime: (val: number) => void;
    attempts: number;
    setAttempts: (val: number) => void;
  };
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatTime = (seconds: number) => {
  if(!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

  const NavButton: React.FC<{
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
  }> = ({ active, onClick, icon, label }) => {
    return (
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.86 }}
        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
        className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2 select-none"
      >
        {active && (
          <motion.div
            layoutId="nav-active"
            className="absolute inset-x-1.5 inset-y-0.5 rounded-2xl"
            style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.14)' }}
            transition={{ type: 'spring', stiffness: 440, damping: 34 }}
          />
        )}
        <span
          className="relative z-10 transition-colors duration-200"
          style={{ color: active ? 'var(--accent-color)' : 'var(--onb-text-faint)' }}
        >
          {React.cloneElement(icon as React.ReactElement<any>, {
            size: 24,
            strokeWidth: active ? 2.3 : 1.85,
          })}
        </span>
        <span
          className="relative z-10 text-[10.5px] font-semibold leading-none tracking-tight transition-colors duration-200"
          style={{ color: active ? 'var(--accent-color)' : 'var(--onb-text-faint)' }}
        >
          {label}
        </span>
      </motion.button>
    );
  };

export const Dashboard: React.FC<DashboardProps> = ({ 
  recoverySettings,
  vaultSettings,
  autoBlurSettings, 
  autoLockSettings, 
  progressiveLockSettings
}) => {
  const [showCodesModal, setShowCodesModal] = useState(false);
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('files');
  const [currentView, setCurrentView] = useState<ViewState | 'backup'>('dashboard');
  const [appTheme, setAppThemeState] = useState<AppTheme>(() => resolveThemeMode(getSavedThemeMode()));
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getSavedThemeMode());
  const [musicNavOpen, setMusicNavOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const setAppTheme = (mode: ThemeMode) => {
    setThemeModeState(mode);
    setAppThemeState(applyThemeMode(mode));
  };
  useEffect(() => { setMusicNavOpen(false); }, [activeTab]);

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('app_accent_manual') || localStorage.getItem('theme_accent') || '#E8E8E8';
  });
  const setManualAccent = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('app_accent_manual', color);
  };
  const clearManualAccent = () => {
    localStorage.removeItem('app_accent_manual');
    localStorage.setItem('theme_accent', '#E8E8E8');
    applyAccent(appTheme, '#E8E8E8');
    setAccentColor('#E8E8E8');
  };
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<FileSystemItem | null>(null); 
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenItem, setMenuOpenItem] = useState<FileSystemItem | null>(null);
  
  // Encryption Modal State
  const [isEncryptionModalOpen, setIsEncryptionModalOpen] = useState(false);
  const [itemToEncrypt, setItemToEncrypt] = useState<FileSystemItem | null>(null);
  const [isDecryptModalOpen, setIsDecryptModalOpen] = useState(false);
  const [itemToDecrypt, setItemToDecrypt] = useState<FileSystemItem | null>(null);
  
  // Copy/Move Modal State
  const [isCopyMoveModalOpen, setIsCopyMoveModalOpen] = useState(false);
  const [copyMoveMode, setCopyMoveMode] = useState<'copy' | 'move' | null>(null);
  const [copyMoveItem, setCopyMoveItem] = useState<FileSystemItem | null>(null);
  const [itemToCustomize, setItemToCustomize] = useState<FileSystemItem | null>(null);
  const decryptResolveRef = useRef<((url: string | null) => void) | null>(null);

  // Vault/Pin UI State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'setup' | 'unlock' | 'disable'>('setup');
  const [pendingVaultAction, setPendingVaultAction] = useState<'enable' | 'access' | 'disable' | null>(null);

  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>({});

  const [currentPlayingItem, setCurrentPlayingItem] = useState<FileSystemItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [volume, setVolumeState] = useState(() => {
    const v = parseFloat(localStorage.getItem('privon_volume') || '0.9');
    return Number.isNaN(v) ? 0.9 : Math.min(1, Math.max(0, v));
  });
  const [allItems, setAllItems] = useState<FileSystemItem[]>([]);
  const [deviceStorage, setDeviceStorage] = useState<{ quota: number; usage: number } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    ensureClassicFolders().finally(() => loadFiles());
    if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(est => {
            if (est.quota && est.usage) setDeviceStorage({ quota: est.quota, usage: est.usage });
        });
    }
    
    // Remove legacy theme config if present
    if (localStorage.getItem('app_theme_config')) {
      localStorage.removeItem('app_theme_config');
    }
    
    return () => {
        Object.values(decryptedUrls).forEach(url => URL.revokeObjectURL(url as string));
    };
  }, []);

  useEffect(() => {
    if (recoverySettings.codes && recoverySettings.codes.length > 0) {
      setShowCodesModal(true);
    }
  }, [recoverySettings.codes]);

  // --- NAVIGATION HANDLER ---
  const handleViewNavigation = (view: ViewState) => {
    setCurrentView(view);
  };

  // --- VAULT LOGIC ---
  const handleOpenVaultSettings = () => {
    if (vaultSettings.enabled) {
      // Logic handled via Toggle in Settings
    } else {
      setPendingVaultAction('enable');
      setPinModalMode('setup');
      setShowPinModal(true);
    }
  };

  const handleDisableVault = () => {
     setPendingVaultAction('disable');
     setPinModalMode('unlock'); // Must confirm current PIN to disable
     setShowPinModal(true);
  };

  const handlePinSuccess = (pin: string) => {
    setShowPinModal(false);
    
    if (pendingVaultAction === 'enable') {
        vaultSettings.update(true, pin);
        setCurrentView('vault');
    } else if (pendingVaultAction === 'access') {
        setCurrentView('vault');
    } else if (pendingVaultAction === 'disable') {
        vaultSettings.update(false, null);
    }
    setPendingVaultAction(null);
    
    window.dispatchEvent(new CustomEvent('pin-setup-done', { detail: pin }));
  };

  const decryptOnDemand = async (item: FileSystemItem): Promise<string | null> => {
    if (decryptedUrls[item.id]) return decryptedUrls[item.id];
    if (!item.rawBlob || !item.isEncrypted || !item.iv) return item.url || null;

    try {
      if (item.salt) {
          return new Promise((resolve) => {
              decryptResolveRef.current = resolve;
              setItemToDecrypt(item);
              setIsDecryptModalOpen(true);
          });
      } 
      else {
          const encryptedData = new Uint8Array(await item.rawBlob.arrayBuffer());
          const key = getVaultKey();
          if (!key) return null;
          const decryptedData = await decrypt(base64_encode(encryptedData), item.iv, key);
          
          const sourceName = (item as any).decryptedName || item.name;
          const ext = sourceName.split('.').pop()?.toLowerCase() || '';
          const mimeType = ext === 'svg' ? 'application/octet-stream' :
                           ext === 'gif' ? 'image/gif' :
                           ext === 'png' ? 'image/png' :
                           ext === 'webp' ? 'image/webp' :
                           ext === 'jpg' || ext === 'jpeg' || ext === 'jfif' ? 'image/jpeg' :
                           ext === 'avif' ? 'image/avif' :
                           ext === 'bmp' ? 'image/bmp' :
                           ext === 'ico' ? 'image/x-icon' :
                           item.category === 'image' ? 'image/jpeg' :
                           ext === 'mp3' ? 'audio/mpeg' :
                           ext === 'wav' ? 'audio/wav' :
                           ext === 'ogg' ? 'audio/ogg' :
                           ext === 'flac' ? 'audio/flac' :
                           item.category === 'audio' ? 'audio/mpeg' :
                           ext === 'mp4' ? 'video/mp4' :
                           ext === 'webm' ? 'video/webm' :
                           ext === 'mkv' ? 'video/x-matroska' :
                           item.category === 'video' ? 'video/mp4' : 'application/octet-stream';

           const arrayBuffer = decryptedData.buffer.slice(decryptedData.byteOffset, decryptedData.byteOffset + decryptedData.byteLength) as ArrayBuffer;
           const blob = new Blob([arrayBuffer], { type: mimeType });
          const url = URL.createObjectURL(blob);
          
          setDecryptedUrls(prev => ({ ...prev, [item.id]: url }));
          return url;
      }
    } catch (e) {
      console.error("Lazy decryption error:", e);
      alert(t('decryptionFailed'));
      return null;
    }
  };

  useEffect(() => {
    applyAccent(appTheme, accentColor);
    localStorage.setItem('theme_accent', accentColor);
  }, [accentColor, appTheme]);

  useEffect(() => {
    // Apply the saved preference (resolving 'system') and follow OS changes
    applyThemeMode(getSavedThemeMode());
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (getSavedThemeMode() === 'system') setAppThemeState(resolveThemeMode('system'));
    };
    try {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    const syncAudio = async () => {
      if (audioRef.current && currentPlayingItem) {
          const streamUrl = await decryptOnDemand(currentPlayingItem);
          if (streamUrl && audioRef.current.src !== streamUrl) {
              audioRef.current.src = streamUrl;
              if (isPlaying) audioRef.current.play().catch(console.error);
          } else if (audioRef.current.src) {
              if (isPlaying) audioRef.current.play().catch(console.error);
              else audioRef.current.pause();
          }
      }
    };
    syncAudio();
  }, [currentPlayingItem, isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const seekToTime = (time: number) => {
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  const setVolume = (v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    localStorage.setItem('privon_volume', String(clamped));
    if (audioRef.current) audioRef.current.volume = clamped;
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const audioSongs = useMemo(
    () => allItems.filter(i => i.category === 'audio' && !i.isTrashed),
    [allItems]
  );

  const playQueueIndex = (ids: string[], index: number) => {
    for (let step = 0; step < ids.length; step++) {
      const ni = (index + step + ids.length) % ids.length;
      const item = allItems.find(i => i.id === ids[ni] && !i.isTrashed);
      if (item) {
        setQueueIds(ids);
        setQueueIndex(ni);
        setCurrentPlayingItem(item);
        setIsPlaying(true);
        return;
      }
    }
  };

  const playSong = (item: FileSystemItem, list?: FileSystemItem[]) => {
    const pool = list && list.length > 0 ? list : audioSongs;
    const ids = pool.map(s => s.id);
    const order = isShuffled ? [...ids].sort(() => Math.random() - 0.5) : ids;
    const at = order.indexOf(item.id);
    const start = at >= 0 ? at : 0;
    if (isShuffled) {
      const [first, ...rest] = [...order.slice(start), ...order.slice(0, start)];
      playQueueIndex([first, ...rest], 0);
    } else {
      playQueueIndex(order, start);
    }
  };

  const stepQueue = (dir: 1 | -1, auto: boolean) => {
    if (queueIds.length === 0) return;
    if (auto && repeatMode === 'one') {
      seekToTime(0);
      if (audioRef.current) audioRef.current.play().catch(console.error);
      return;
    }
    let ni = queueIndex + dir;
    if (ni < 0 || ni >= queueIds.length) {
      if (auto && repeatMode === 'off') {
        setIsPlaying(false);
        return;
      }
      ni = (ni + queueIds.length) % queueIds.length;
    }
    playQueueIndex(queueIds, ni);
  };

  const handleTrackEnded = () => {
    stepQueue(1, true);
  };

  const toggleShuffle = () => {
    const next = !isShuffled;
    setIsShuffled(next);
    if (queueIds.length === 0) return;
    if (next) {
      const current = queueIds[queueIndex];
      const rest = queueIds.filter(id => id !== current);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      setQueueIds([current, ...rest]);
      setQueueIndex(0);
    } else {
      // keep the current queue order, just play it straight
    }
  };

  const cycleRepeat = () => {
    setRepeatMode(prev => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  };

  const selectQueueIndex = (index: number) => {
    playQueueIndex(queueIds, index);
  };

  useEffect(() => {
    setAllItems(prev => prev.map(item => 
      item.id === 'sys-1' ? { ...item, status: vaultSettings.enabled ? 'Active' : 'Disabled' } : item
    ));
  }, [vaultSettings.enabled]);

  const yieldToBrowser = (): Promise<void> =>
    new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

  const loadFiles = async () => {
    try {
      const dbItems = await db.getAllItems();
      const systemItems: FileSystemItem[] = [
        { id: 'sys-1', parentId: null, type: 'system', name: t('systemFolderVault'), status: vaultSettings.enabled ? t('systemActive') : t('systemDisabled'), date: t('systemDate'), category: 'other' },
        { id: 'sys-2', parentId: null, type: 'system', name: t('systemFolderBackup'), status: t('systemSecure'), date: t('systemDate'), category: 'other' },
      ];

      const key = getVaultKey();
      const loadedItems: FileSystemItem[] = [];
      const BATCH = 100;
      for (let i = 0; i < dbItems.length; i += BATCH) {
        const batch = dbItems.slice(i, i + BATCH);
        const decrypted = batch.map(item => {
          const entry: any = { ...item, url: item.externalUrl, rawBlob: item.fileData };
          if (item.encryptedMeta && key) {
            try {
              const meta = JSON.parse(metadata_decrypt(JSON.stringify(item.encryptedMeta), key));
              entry.decryptedName = meta.name;
              entry.decryptedTags = meta.tags;
              entry.decryptedArtist = meta.artist;
              entry.decryptedAlbum = meta.album;
              entry.decryptedCoverUrl = meta.coverUrl;
              entry.decryptedCustomIcon = meta.customIcon;
              entry.decryptedExternalUrl = meta.externalUrl;
            } catch (e) {
              console.warn('Failed to decrypt metadata for item', item.id, e);
            }
          }
          const classicKey = CLASSIC_FOLDER_NAME_KEYS[item.id];
          if (classicKey && !item.encryptedMeta && !localStorage.getItem(classicRenameFlag(item.id))) {
            entry.name = t(classicKey);
          }
          return entry as FileSystemItem;
        });
        loadedItems.push(...decrypted);
        if (i + BATCH < dbItems.length) await yieldToBrowser();
      }

      setAllItems([...systemItems, ...loadedItems]);
    } catch (e) {
      console.error("Failed to load items from DB", e);
    }
  };

  const items = useMemo(() => allItems.filter(i => !i.isTrashed), [allItems]);
  const trashItems = useMemo(() => allItems.filter(i => i.isTrashed), [allItems]);
  
  const currentFolder = useMemo(() => items.find(i => i.id === currentFolderId), [items, currentFolderId]);
  const visibleItems = useMemo(() => {
    const list = items.filter(item => {
      if (item.type === 'system') return currentFolderId === null;
      return item.parentId === currentFolderId;
    });
    const rank = (i: FileSystemItem) => (i.type === 'system' ? 0 : i.type === 'folder' ? 1 : 2);
    return [...list].sort((a, b) => rank(a) - rank(b));
  }, [items, currentFolderId]);

  const storageStats = useMemo(() => {
    let limit = 64 * 1024 * 1024 * 1024; let used = 0;
    const breakdown = { image: 0, video: 0, audio: 0, doc: 0, other: 0 };
    items.forEach(item => { 
        if(item.type !== 'system') used += 1024 * 1024;
        if(item.category) breakdown[item.category as keyof typeof breakdown]++;
    }); 
    if (deviceStorage) { used = deviceStorage.usage; limit = deviceStorage.quota; }
    return { used, limit, breakdown };
  }, [items, deviceStorage]);

  const handleItemAction = (action: string, item: FileSystemItem) => {
    if (item.type === 'system') return;
    if (action === 'rename') { setRenamingId(item.id); setRenameValue((item as any).decryptedName || item.name); }
    else if (action === 'delete') { moveToTrash(item.id); }
    else if (action === 'favorite') { toggleFavorite(item); }
    else if (action === 'encrypt') { setItemToEncrypt(item); setIsEncryptionModalOpen(true); }
    else if (action === 'decrypt') {
      if (item.salt && item.isEncrypted) {
        setItemToDecrypt(item);
        setIsDecryptModalOpen(true);
      }
    }
    else if (action === 'copy') { setCopyMoveMode('copy'); setCopyMoveItem(item); setIsCopyMoveModalOpen(true); }
    else if (action === 'move') { setCopyMoveMode('move'); setCopyMoveItem(item); setIsCopyMoveModalOpen(true); }
    else if (action === 'duplicate') { handleDuplicate(item); }
    else if (action === 'select') { 
      setIsSelectionMode(true);
      setSelectedItems(new Set([item.id]));
    }
    else if (action === 'customize') {
      setItemToCustomize({
        ...item,
        name: (item as any).decryptedName || item.name,
        tags: (item as any).decryptedTags || item.tags,
        customIcon: (item as any).decryptedCustomIcon || item.customIcon,
      });
    }
  };

  const handleCustomizeSave = async (updated: FileSystemItem) => {
    const dbItem: any = { ...updated, fileData: updated.rawBlob };
    if (updated.encryptedMeta) {
      const key = getVaultKey();
      if (!key) throw new Error('no vault key');
      const meta = JSON.parse(metadata_decrypt(JSON.stringify(updated.encryptedMeta), key));
      meta.name = updated.name;
      meta.tags = updated.tags;
      meta.customIcon = updated.customIcon;
      dbItem.encryptedMeta = JSON.parse(metadata_encrypt(JSON.stringify(meta), key));
      dbItem.name = '';
      delete dbItem.tags; delete dbItem.artist; delete dbItem.album;
      delete dbItem.coverUrl; delete dbItem.customIcon; delete dbItem.externalUrl;
    }
    delete dbItem.url; delete dbItem.rawBlob;
    await db.updateItem(dbItem);
    loadFiles();
    setItemToCustomize(null);
  };

  const handleItemSelect = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedItems) {
      await moveToTrash(id);
    }
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const handleMoveSelected = () => {
    const firstItem = allItems.find(i => selectedItems.has(i.id));
    if (firstItem) {
      setCopyMoveMode('move');
      setCopyMoveItem(firstItem);
      setIsCopyMoveModalOpen(true);
    }
  };

  const handleCopySelected = () => {
    const firstItem = allItems.find(i => selectedItems.has(i.id));
    if (firstItem) {
      setCopyMoveMode('copy');
      setCopyMoveItem(firstItem);
      setIsCopyMoveModalOpen(true);
    }
  };

  const toggleFavorite = async (item: FileSystemItem) => {
      const dbItem: DBItem = { ...item, fileData: item.rawBlob, isFavorite: !item.isFavorite };
      delete (dbItem as any).url; delete (dbItem as any).rawBlob;
      await db.updateItem(dbItem);
      loadFiles();
  };

  const handleNavigate = (item: FileSystemItem) => {
    if (item.name === t('systemFolderVault') && item.type === 'system') {
        if (vaultSettings.enabled) {
            setPendingVaultAction('access');
            setPinModalMode('unlock');
            setShowPinModal(true);
        } else {
            setPendingVaultAction('enable');
            setPinModalMode('setup');
            setShowPinModal(true);
        }
        return;
    }

    if (item.name === t('systemFolderBackup') && item.type === 'system') {
        setCurrentView('backup');
        return;
    }

    if (item.type === 'folder' || item.type === 'system') setCurrentFolderId(item.id);
    else {
        // If it's a file, try to decrypt it on demand if needed
        if (item.isEncrypted && item.salt && !decryptedUrls[item.id]) {
            decryptOnDemand(item).then((url) => {
                if (url) {
                    if(item.category === 'audio') {
                        playSong(item);
                    } else {
                        // For images/videos, logic is handled in Gallery/Dashboard rendering via decryptedUrls
                        // But for a generic file open, we might want a preview modal?
                        // For now, let's assume dashboard handles media via tabs, or we set activeItem
                        setActiveItem(item);
                    }
                }
            });
        } else {
            if(item.category === 'audio') {
                playSong(item);
            } else {
                setActiveItem(item);
            }
        }
    }
  };

  const startFolderCreation = () => {
    setIsCreatingFolder(true);
    setNewFolderName('');
    setTimeout(() => { folderInputRef.current?.focus(); }, 50);
  };

  const cancelFolderCreation = () => { setIsCreatingFolder(false); setNewFolderName(''); };

  const confirmFolderCreation = async () => {
      if (!newFolderName.trim()) { cancelFolderCreation(); return; }
      const newItem: DBItem = {
          id: Date.now().toString(),
          parentId: currentFolderId,
          type: 'folder',
          name: newFolderName,
          date: new Date().toLocaleDateString(),
          isTrashed: false,
          isFavorite: false,
          category: 'other'
      };
      await db.addItem(newItem);
      loadFiles();
      setIsCreatingFolder(false);
      setNewFolderName('');
  };

  const handleRenameConfirm = async () => {
      if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
      const item = allItems.find(i => i.id === renamingId);
      if (item && isClassicFolderId(item.id)) localStorage.setItem(classicRenameFlag(item.id), '1');
      if (item && item.type !== 'system') {
          const dbItem: any = { ...item, fileData: item.rawBlob };
          if (item.encryptedMeta) {
            const key = getVaultKey();
            if (!key) throw new Error('no vault key');
            const meta = JSON.parse(metadata_decrypt(JSON.stringify(item.encryptedMeta), key));
            meta.name = renameValue;
            dbItem.encryptedMeta = JSON.parse(metadata_encrypt(JSON.stringify(meta), key));
            dbItem.name = '';
            delete dbItem.tags; delete dbItem.artist; delete dbItem.album;
            delete dbItem.coverUrl; delete dbItem.customIcon; delete dbItem.externalUrl;
          } else {
            dbItem.name = renameValue;
          }
          delete dbItem.url; delete dbItem.rawBlob;
          await db.updateItem(dbItem);
          loadFiles();
      }
      setRenamingId(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const { category, folderId } = classifyUpload(file);
      let artist: string | undefined;
      let album: string | undefined;
      let coverUrl: string | undefined;
      if (category === 'audio') {
        try {
          const meta = await parseBlob(file);
          artist = meta.common.artist || undefined;
          album = meta.common.album || undefined;
          const pic = meta.common.picture?.[0];
          if (pic?.data?.length) {
            let bin = '';
            const bytes = pic.data;
            const CHUNK = 8192;
            for (let i = 0; i < bytes.length; i += CHUNK) {
              bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
            }
            coverUrl = `data:${pic.format};base64,${btoa(bin)}`;
          }
        } catch (e) {
          console.warn('Audio metadata parse failed', e);
        }
      }
      const autoParent = currentFolderId ?? folderId;
      const parentOk = autoParent === null || autoParent === currentFolderId || allItems.some(i => i.id === autoParent && !i.isTrashed);
      const newItem: DBItem = {
        id: Date.now().toString(),
        parentId: parentOk ? autoParent : currentFolderId,
        type: 'file',
        name: file.name,
        size: formatBytes(file.size),
        date: new Date().toLocaleDateString(),
        category,
        artist,
        album,
        coverUrl,
        fileData: file,
        isTrashed: false,
        isFavorite: false
      };
      await db.addItem(newItem);
      loadFiles();
    }
  };

  const moveToTrash = async (id: string) => {
     const itm = allItems.find(i => i.id === id);
     if(itm && itm.type !== 'system') {
         const dbItem: DBItem = { ...itm, fileData: itm.rawBlob, isTrashed: true };
         delete (dbItem as any).url; delete (dbItem as any).rawBlob;
         await db.updateItem(dbItem);
         loadFiles();
     }
  };

  const handleDuplicate = async (item: FileSystemItem) => {
    const displayName = (item as any).decryptedName || item.name || '';
    const ext = displayName.includes('.') ? '.' + displayName.split('.').pop() : '';
    const baseName = ext ? displayName.slice(0, -ext.length) : displayName;
    let counter = 1;
    let newName = `${baseName} (copy)${ext}`;
    
    while (allItems.some(i => i.name === newName && i.parentId === item.parentId)) {
      counter++;
      newName = `${baseName} (copy ${counter})${ext}`;
    }

    const newItem: DBItem = {
      id: Date.now().toString(),
      parentId: item.parentId,
      type: item.type,
      name: newName,
      size: item.size,
      date: new Date().toLocaleDateString(),
      category: item.category,
      isEncrypted: item.isEncrypted,
      iv: item.iv,
      salt: item.salt,
      algorithm: item.algorithm,
      isFavorite: item.isFavorite,
      isTrashed: false,
      customIcon: item.customIcon,
      iconOnlyMode: item.iconOnlyMode,
    };

    if (item.rawBlob) {
      newItem.fileData = item.rawBlob;
    }

    await db.addItem(newItem);
    loadFiles();
  };

  const restoreFromTrash = async (id: string) => {
    const itm = allItems.find(i => i.id === id);
    if (itm) {
        const dbItem: DBItem = { ...itm, fileData: itm.rawBlob, isTrashed: false };
        delete (dbItem as any).url; delete (dbItem as any).rawBlob;
        await db.updateItem(dbItem);
        loadFiles();
    }
  };

  const deletePermanently = async (id: string) => {
      await db.deleteItem(id);
      loadFiles();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-hidden text-primary">
      {/* Solid background — deep black in dark mode, clean white in light mode */}
      <div className="absolute inset-0 bg-background" />
      {/* Accent orb — subtle brand depth */}
      <div className="absolute w-72 h-72 opacity-[0.07]" style={{ top: '30%', right: '-5%', background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 70%)', borderRadius: '50%', animation: 'blobFloat1 18s ease-in-out infinite', filter: 'blur(50px)' }} />

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      <audio 
        ref={audioRef} 
        onEnded={handleTrackEnded} 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      <AnimatePresence>
        {showPinModal && (
            <PinModal 
                mode={pinModalMode} 
                savedPin={vaultSettings.pin} 
                tier={vaultSettings.tier}
                onSuccess={handlePinSuccess}
                onClose={() => { setShowPinModal(false); setPendingVaultAction(null); }}
            />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCodesModal && recoverySettings.codes && (
          <RecoveryCodesModal
            codes={recoverySettings.codes}
            onDownload={() => {
              const date = new Date().toISOString().split('T')[0];
              const header = t('exportHeader').replace('{{date}}', date);
              const content = header + recoverySettings.codes!.join('\n');
              const blob = new Blob([content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = t('exportFilename');
              a.click();
              URL.revokeObjectURL(url);
            }}
            onDismiss={() => {
              recoverySettings.dismissCodes();
              setShowCodesModal(false);
            }}
          />
        )}
      </AnimatePresence>
      
      {itemToEncrypt && (
          <EncryptionModal 
            isOpen={isEncryptionModalOpen}
            onClose={() => { setIsEncryptionModalOpen(false); setItemToEncrypt(null); }}
            onRefresh={loadFiles}
            item={itemToEncrypt}
            vaultPin={vaultSettings.pin}
            onRequestPinSetup={async () => {
                return new Promise((resolve) => {
                    setPendingVaultAction('enable');
                    setPinModalMode('setup');
                    setShowPinModal(true);
                    const handler = (e: CustomEvent) => {
                        resolve(e.detail || null);
                        window.removeEventListener('pin-setup-done', handler as EventListener);
                    };
                    window.addEventListener('pin-setup-done', handler as EventListener);
                });
            }}
          />
      )}

      {itemToDecrypt && (
          <DecryptModal
            isOpen={isDecryptModalOpen}
            onClose={() => {
              if (decryptResolveRef.current) {
                decryptResolveRef.current(null);
                decryptResolveRef.current = null;
              }
              setIsDecryptModalOpen(false);
              setItemToDecrypt(null);
            }}
            onSuccess={async (blob, mimeType) => {
              const url = URL.createObjectURL(blob);
              setDecryptedUrls(prev => ({ ...prev, [itemToDecrypt.id]: url }));
              if (decryptResolveRef.current) {
                decryptResolveRef.current(url);
                decryptResolveRef.current = null;
              }

              const dbItem: DBItem = { ...itemToDecrypt, fileData: blob, isEncrypted: false };
              delete dbItem.iv; delete dbItem.salt; delete dbItem.algorithm;
              delete (dbItem as any).url; delete (dbItem as any).rawBlob;
              await db.updateItem(dbItem);
              await loadFiles();

              const decryptedItem = { ...itemToDecrypt, url };
              setActiveItem(decryptedItem);

              setIsDecryptModalOpen(false);
              setItemToDecrypt(null);
            }}
            item={itemToDecrypt}
            vaultPin={vaultSettings.pin}
            vaultTier={vaultSettings.tier}
          />
      )}

      <CopyMoveModal
        isOpen={isCopyMoveModalOpen}
        onClose={() => { setIsCopyMoveModalOpen(false); setCopyMoveItem(null); setCopyMoveMode(null); }}
        mode={copyMoveMode || 'copy'}
        item={copyMoveItem}
        allItems={allItems}
        onComplete={loadFiles}
      />

      {itemToCustomize && (
        <CustomizeModal
          item={itemToCustomize}
          isOpen={true}
          onClose={() => setItemToCustomize(null)}
          onSave={handleCustomizeSave}
        />
      )}


      <FileActionMenu 
        isOpen={!!menuOpenItem}
        item={menuOpenItem}
        onClose={() => setMenuOpenItem(null)}
        onAction={handleItemAction}
      />

      <AnimatePresence>
        {isFullPlayerOpen && currentPlayingItem && (
          <FullPlayer
            currentPlayingItem={currentPlayingItem}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onClose={() => setIsFullPlayerOpen(false)}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSeekTime={seekToTime}
            onPrev={() => stepQueue(-1, false)}
            onNext={() => stepQueue(1, false)}
            volume={volume}
            onVolumeChange={setVolume}
            shuffleOn={isShuffled}
            onToggleShuffle={toggleShuffle}
            repeatMode={repeatMode}
            onCycleRepeat={cycleRepeat}
            queue={queueIds.map(id => allItems.find(i => i.id === id)).filter((i): i is FileSystemItem => !!i)}
            queueIndex={queueIndex}
            onSelectQueueItem={selectQueueIndex}
            sourceName={(currentPlayingItem as any).decryptedAlbum || currentPlayingItem.album || t('songs')}
            onAction={(act, item) => handleItemAction(act, item)}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
             <motion.div key="dashboard-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={activeTab === 'music' ? "flex flex-col h-full relative" : "flex flex-col h-full pb-32 relative"}>
               
               {activeTab !== 'music' && (<TopActions 
                  activeTab={activeTab}
                  isCreatingFolder={isCreatingFolder}
                  newFolderName={newFolderName}
                  folderInputRef={folderInputRef}
                  onNewFolderNameChange={setNewFolderName}
                  onConfirmFolderCreation={confirmFolderCreation}
                  onCancelFolderCreation={cancelFolderCreation}
                  onNavigateView={handleViewNavigation} 
                  onOpenProfileMenu={() => setProfileSheetOpen(true)}
                  onOpenAddMenu={() => setAddSheetOpen(true)}
               />)}
               <ProfileSheet
                 open={profileSheetOpen}
                 onClose={() => setProfileSheetOpen(false)}
                 onNavigate={handleViewNavigation}
               />
               <AddSheet
                 open={addSheetOpen}
                 onClose={() => setAddSheetOpen(false)}
                 onAddFile={() => fileInputRef.current?.click()}
                 onNewFolder={startFolderCreation}
               />

                <main className="flex-1 px-5 overflow-y-auto pb-8">
                   {isSelectionMode && (
                     <motion.div 
                       initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                       className="mb-4 p-4 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-between"
                     >
                        <div className="flex items-center gap-3">
                          <span className="text-neon-green font-bold">{selectedItems.size}</span>
                          <span className="text-zinc-400 text-sm">{t('selectedCount')}</span>
                        </div>
                       <div className="flex items-center gap-2">
                         <button onClick={handleCopySelected} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">
                           <Copy size={18} className="text-white" />
                         </button>
                         <button onClick={handleMoveSelected} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">
                           <Move size={18} className="text-white" />
                         </button>
                         <button onClick={handleDeleteSelected} className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30">
                           <Trash2 size={18} className="text-red-500" />
                         </button>
                          <button onClick={() => { setIsSelectionMode(false); setSelectedItems(new Set()); }} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold">
                            {t('cancel')}
                          </button>
                       </div>
                     </motion.div>
                   )}

                   <AnimatePresence>
                    {activeTab === 'files' && (
                      <motion.div key="files" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18, ease: "easeOut" }}>
                        <div className="flex flex-col pb-4" style={{ height: 'calc(100vh - 320px)' }}>
                          {currentFolderId !== null && (
                            <div className="flex items-center gap-2 mb-3 px-2 shrink-0">
                              <button onClick={() => { if(currentFolderId) { const p = items.find(i => i.id === currentFolderId)?.parentId || null; setCurrentFolderId(p); }}} className="flex items-center gap-1.5 text-[16px] font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--accent-color)' }}><ArrowLeft size={18} /><span>{t('files')}</span></button>
                              <span className="text-muted">/</span>
                              <span className="font-semibold text-[16px] text-primary truncate">{items.find(i => i.id === currentFolderId)?.name}</span>
                            </div>
                          )}
                         <FilesGrid
                           items={visibleItems}
                           theme={appTheme}
                           decryptedUrls={decryptedUrls}
                           isSelectionMode={isSelectionMode}
                           selectedItems={selectedItems}
                           renamingId={renamingId}
                           renameValue={renameValue}
                           onItemClick={handleNavigate}
                           onItemSelect={handleItemSelect}
                           onOpenMenu={setMenuOpenItem}
                           onAction={(act, item) => handleItemAction(act, item)}
                           onRenameChange={setRenameValue}
                           onRenameConfirm={handleRenameConfirm}
                           onRenameCancel={() => setRenamingId(null)}
                         />
                        </div>
                      </motion.div>
                    )}

                   {activeTab === 'gallery' && (
                     <motion.div key="gallery" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18, ease: "easeOut" }}>
                       <GalleryView items={items} onNavigate={handleNavigate} theme={appTheme} onDecrypt={decryptOnDemand} decryptedUrls={decryptedUrls} onAction={(act, item) => handleItemAction(act, item)} />
                     </motion.div>
                   )}

                   {activeTab === 'music' && (
                     <motion.div key="music" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18, ease: "easeOut" }}>
                       <MusicView items={items} onPlay={(item, list) => playSong(item, list)} currentSong={currentPlayingItem} isPlaying={isPlaying} theme={appTheme} onAction={(act, item) => handleItemAction(act, item)} />
                     </motion.div>
                   )}

                    {activeTab === 'docs' && (
                      <motion.div key="docs" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18, ease: "easeOut" }}>
                         {(() => {
                           const docItems = items.filter(i => i.category === 'doc');
                           return docItems.length === 0 ? (
                             <div className="flex flex-col items-center justify-center px-8 pt-10">
                               <div className="glass-card rounded-[24px] p-4 max-w-xs w-full flex flex-col items-center">
                                  <div className="w-24 h-24 rounded-2xl glass-card flex items-center justify-center -mt-10 mb-4 shadow-xl" style={{ color: 'var(--accent-color)' }}>
                                    <FileText size={48} />
                                 </div>
                                 <div className="text-center px-2 pb-2">
                                   <h4 className="text-sm font-bold text-white text-center mb-2">Document viewer coming soon</h4>
                                   <p className="text-xs text-zinc-300 text-center leading-relaxed">We're working on PDF viewer, text editor, document signing and more. Thanks for exploring this beta!</p>
                                 </div>
                               </div>
                             </div>
                          ) : (
                            <div className="flex flex-col gap-2" style={{ height: 'calc(100vh - 300px)' }}>
                                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 px-1 shrink-0">{t('encryptedDocuments')}</p>
                                <Virtuoso
                                  style={{ flex: 1 }}
                                  totalCount={docItems.length}
                                  itemContent={(index) => (
                                    <FileItem key={docItems[index].id} item={docItems[index]} onAction={(act) => handleItemAction(act, docItems[index])} onOpenMenu={() => { if(docItems[index].type !== 'system') setMenuOpenItem(docItems[index]); }} onClick={() => handleNavigate(docItems[index])} theme={appTheme} />
                                  )}
                                  overscan={5}
                                />
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                   </AnimatePresence>
                </main>

                <AnimatePresence>
                  {currentPlayingItem && !isFullPlayerOpen && (
                     <motion.div 
                         initial={{ y: 50, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.9 }}
                         transition={{ type: "spring", damping: 20, stiffness: 300 }}
                         onClick={() => setIsFullPlayerOpen(true)}
                          className={activeTab === 'music' ? (musicNavOpen ? "fixed bottom-[108px] left-4 right-4 z-50 cursor-pointer" : "fixed bottom-4 left-4 right-4 z-50 cursor-pointer") : "fixed bottom-[108px] left-4 right-4 z-50 cursor-pointer"}
                      >
                          {/* Mini Player UI */}
                           <div className="glass-haze rounded-[28px] px-3 py-2.5 flex items-center gap-3 relative overflow-hidden">
                            {(() => {
                              const src = (currentPlayingItem as any).decryptedCoverUrl || (currentPlayingItem as any).decryptedCustomIcon || currentPlayingItem.customIcon || currentPlayingItem.coverUrl;
                              return src && isSafeImageUrl(src) ? (
                                <img src={src} className="w-10 h-10 rounded-[10px] object-cover shrink-0 relative z-10" alt="" draggable={false} />
                              ) : (
                                <span className="w-10 h-10 rounded-[10px] bg-white/10 flex items-center justify-center shrink-0 relative z-10">
                                  <Music size={18} className="text-white/70" />
                                </span>
                              );
                            })()}
                            <div className="flex-1 min-w-0 flex flex-col justify-center z-10">
                               <h4 className="text-[15px] font-bold text-white truncate">{(currentPlayingItem as any).decryptedName || currentPlayingItem.name}</h4>
                               <p className="text-[13px] text-white/60 truncate">{(currentPlayingItem as any).decryptedArtist || currentPlayingItem.artist || t('unknownArtist')}</p>
                            </div>
                            <div className="flex items-center gap-4 pr-1 z-10">
                               <button
                                 onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                                 aria-label={isPlaying ? 'Pause' : 'Play'}
                                 className="text-white active:scale-90 transition-transform"
                               >
                                 {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-0.5" />}
                               </button>
                               <button
                                 onClick={(e) => { e.stopPropagation(); stepQueue(1, false); }}
                                 aria-label="Next"
                                 className="text-white active:scale-90 transition-transform"
                               >
                                 <SkipForward size={26} fill="currentColor" />
                               </button>
                            </div>
                         </div>
                     </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {activeItem && activeItem.url && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col"
                      onClick={() => setActiveItem(null)}
                    >
                      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-center justify-between px-6 pt-4">
                        <p className="text-sm font-bold text-white truncate max-w-[70%]">{activeItem.name}</p>
                        <button className="p-2 rounded-full text-white hover:text-neon-green transition-colors">
                          <X size={24} />
                        </button>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-4">
                        {activeItem.category === 'video' ? (
                          <video
                            src={activeItem.url}
                            controls
                            autoPlay
                            className="max-w-full max-h-full rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <img
                            src={activeItem.url}
                            alt={activeItem.name}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {activeTab === 'music' && !musicNavOpen && (
                  <button
                    type="button"
                    onClick={() => setMusicNavOpen(true)}
                    aria-label="Menu"
                    className="fixed bottom-6 right-4 z-[95] w-14 h-14 rounded-full glass-haze flex items-center justify-center text-primary shadow-xl transition-transform active:scale-95"
                  >
                    <LayoutGrid size={24} />
                  </button>
                )}
                {activeTab === 'files' && !(currentPlayingItem && !isFullPlayerOpen) && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={t('addFile')}
                    className="glass-haze fixed bottom-28 right-5 z-40 w-16 h-16 rounded-full flex items-center justify-center text-primary shadow-xl transition-transform active:scale-95"
                    style={{ backgroundColor: 'var(--onb-surface-strong)', border: '1px solid var(--onb-border)' }}
                  >
                    <SquarePen size={24} />
                  </button>
                )}

                {(activeTab !== 'music' || musicNavOpen) && (
                  <nav
                    className="fixed bottom-4 left-4 right-4 z-40"
                    style={{ paddingBottom: 'max(0rem, env(safe-area-inset-bottom, 0px))' }}
                  >
                    <div className="glass-haze rounded-[26px] pl-1 pr-1.5 py-1.5 flex items-center gap-0.5">
                      <div className="flex-1 flex items-stretch relative z-10">
                        <NavButton active={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={<Folder />} label={t('files')} />
                        <NavButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<ImageIcon />} label={t('gallery')} />
                        <NavButton active={activeTab === 'music'} onClick={() => setActiveTab('music')} icon={<Music />} label={t('music')} />
                        <NavButton active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} icon={<FileText />} label={t('documentsTab')} />
                      </div>
                      <div className="w-px self-stretch my-2 shrink-0" style={{ backgroundColor: 'var(--onb-border)' }} />
                      <motion.button
                        type="button"
                        onClick={() => { setActiveTab('files'); setCurrentView('search'); }}
                        aria-label={t('search')}
                        whileTap={{ scale: 0.86 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                        className="w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0"
                        style={{ color: 'var(--text-muted)', backgroundColor: 'var(--onb-surface)' }}
                      >
                        <Search size={22} strokeWidth={2} />
                      </motion.button>
                    </div>
                  </nav>
                )}
             </motion.div>
          )}

          {currentView === 'storage' && <StorageView onBack={() => setCurrentView('dashboard')} storageStats={storageStats} appTheme={appTheme} />}
          {currentView === 'settings' && (
            <SettingsView 
              key="settings-view"
              onBack={() => setCurrentView('dashboard')} 
              appTheme={appTheme} 
              themeMode={themeMode}
              setAppTheme={setAppTheme} 
              accentColor={accentColor} 
              setManualAccent={setManualAccent} 
              clearManualAccent={clearManualAccent} 
              autoBlurSettings={autoBlurSettings} 
              autoLockSettings={autoLockSettings} 
              progressiveLockSettings={progressiveLockSettings}
              recoverySettings={recoverySettings}
              vaultSettings={{
                ...vaultSettings,
                openVault: handleOpenVaultSettings,
                disableVault: handleDisableVault
              }}
              onOpenAbout={() => setCurrentView('about')} 
              onOpenDevCreds={() => setCurrentView('devcreds')}
            />
          )}
          {currentView === 'search' && <SearchView items={items} onNavigate={(item) => { handleNavigate(item); setCurrentView('dashboard'); }} onBack={() => setCurrentView('dashboard')} theme={appTheme} />}
          {currentView === 'trash' && <TrashView trashItems={trashItems} onRestore={restoreFromTrash} onDeleteForever={deletePermanently} onBack={() => setCurrentView('dashboard')} theme={appTheme} />}
          {currentView === 'about' && <AboutView onBack={() => setCurrentView('settings')} accentColor={accentColor} />}
          {currentView === 'vault' && <VaultView onBack={() => setCurrentView('settings')} />}
          {currentView === 'devcreds' && <DevCredentialsView onBack={() => setCurrentView('settings')} />}
          {currentView === 'backup' && <BackupView onBack={() => setCurrentView('dashboard')} theme={appTheme} />}
        </AnimatePresence>
      </div>
    </div>
  );
};
