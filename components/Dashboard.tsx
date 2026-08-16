
import React, { useState, useRef, useMemo, useEffect, useDeferredValue } from 'react';
import { 
  Plus, FolderPlus, Database, Search, Trash2, Settings, Home, MoreVertical, 
  Folder, Image as ImageIcon, Music, FileText, ArrowLeft, Video, X,
  Pause, Play, SkipBack, SkipForward, ListMusic, ChevronDown, 
  Shuffle, Heart, Repeat, Share2, Menu, Moon, Copy, Move, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import { db, DBItem, getVaultKey } from '../crypto-core/db';
import { is_safe_image_url as isSafeImageUrl, decrypt, base64_encode, metadata_encrypt, metadata_decrypt } from '../crypto-core/index';
import { FileSystemItem, ViewState, AppTheme } from '../types';
import { useI18n } from '../locales/i18nContext';
import { FullPlayer } from './FullPlayer';
import snowDocumentImg from '../assets/snow-document.png';
import { seedTestData, clearTestData } from '../utils/seedData';

// Import Shared Components
import { FileItem } from './FileItem';
import { FileActionMenu } from './FileActionMenu';
import { TopActions } from './TopActions';
import { PinModal } from './PinModal';
import { EncryptionModal } from './EncryptionModal';
import { DecryptModal } from './DecryptModal';
import { CopyMoveModal } from './CopyMoveModal';
import { RecoveryCodesModal } from './RecoveryCodesModal';

// Import Views
import { StorageView } from './views/StorageView';
import { SettingsView, AboutView } from './views/SettingsView';
import { GalleryView } from './views/GalleryView';
import { MusicView } from './views/MusicView';
import { SearchView } from './views/SearchView';
import { TrashView } from './views/TrashView';
import { VaultView } from './views/VaultView';
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
  }> = ({ active, onClick, icon }) => {
    return (
      <motion.button
        onClick={onClick}
        className="relative flex items-center justify-center p-2"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {active && (
          <motion.div
            layoutId="nav-active"
            className="absolute inset-0 rounded-xl bg-white/10 backdrop-blur-sm border border-white/[0.08]"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <motion.div
          className={`relative z-10 transition-colors duration-200 ${
            active
              ? 'text-white drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.9)]'
              : 'text-white/35 group-hover:text-white/60'
          }`}
          animate={active ? {
            scale: [1, 1.08, 1],
            transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          } : {}}
        >
          {React.cloneElement(icon as React.ReactElement<any>, {
            size: 20,
            strokeWidth: active ? 2.5 : 1.8,
          })}
        </motion.div>
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
  const [appTheme, setAppTheme] = useState<AppTheme>(() => (localStorage.getItem('app_theme_mode') as AppTheme) || 'dark');

  const resolveTheme = (mode: AppTheme): 'dark' | 'light' => {
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  };
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
    const root = document.documentElement;
    root.style.setProperty('--accent-color', '#E8E8E8');
    root.style.setProperty('--accent-rgb', '232, 232, 232');
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
  const decryptResolveRef = useRef<((url: string | null) => void) | null>(null);

  // Vault/Pin UI State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'setup' | 'unlock' | 'disable'>('setup');
  const [pendingVaultAction, setPendingVaultAction] = useState<'enable' | 'access' | 'disable' | null>(null);

  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPlayingItem, setCurrentPlayingItem] = useState<FileSystemItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [allItems, setAllItems] = useState<FileSystemItem[]>([]);
  const [deviceStorage, setDeviceStorage] = useState<{ quota: number; usage: number } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [devSeedHidden, setDevSeedHidden] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadFiles();
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

  // Expose seed function in dev mode for performance testing
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).seedTestData = seedTestData;
      (window as any).clearTestData = clearTestData;
      console.log('💾 Run seedTestData(1000) in console to generate test files');
    }
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
    const root = document.documentElement;
    root.style.setProperty('--accent-color', accentColor);
    const r = parseInt(accentColor.slice(1, 3), 16);
    const g = parseInt(accentColor.slice(3, 5), 16);
    const b = parseInt(accentColor.slice(5, 7), 16);
    root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    localStorage.setItem('theme_accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    const root = document.documentElement;
    const mode = resolveTheme(appTheme);
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('app_theme_mode', appTheme);
  }, [appTheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (appTheme === 'system') {
        const root = document.documentElement;
        const mode = resolveTheme('system');
        if (mode === 'light') {
          root.style.setProperty('--bg-main', '#ffffff');
          root.style.setProperty('--bg-card', '#f4f4f5');
          root.style.setProperty('--bg-surface', '#e4e4e7');
          root.style.setProperty('--border-color', '#d4d4d8');
          root.style.setProperty('--text-main', '#09090b');
          root.style.setProperty('--text-muted', '#52525b');
        } else {
          root.style.setProperty('--bg-main', '#0a0a0a');
          root.style.setProperty('--bg-card', '#1a1a1a');
          root.style.setProperty('--bg-surface', '#2a2a2a');
          root.style.setProperty('--border-color', '#3a3a3a');
          root.style.setProperty('--text-main', '#ffffff');
          root.style.setProperty('--text-muted', '#a1a1aa');
        }
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [appTheme]);

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
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

  const deferredQuery = useDeferredValue(searchQuery);

  const items = useMemo(() => allItems.filter(i => !i.isTrashed), [allItems]);
  const trashItems = useMemo(() => allItems.filter(i => i.isTrashed), [allItems]);
  
  const currentFolder = useMemo(() => items.find(i => i.id === currentFolderId), [items, currentFolderId]);
  const visibleItems = useMemo(() => {
    const folderItems = items.filter(item => {
      if (item.type === 'system') return currentFolderId === null;
      return item.parentId === currentFolderId;
    });
    if (!deferredQuery) return folderItems;
    const q = deferredQuery.toLowerCase();
    return folderItems.filter(item => {
      const name = (item as any).decryptedName || item.name || '';
      return name.toLowerCase().includes(q);
    });
  }, [items, currentFolderId, deferredQuery]);

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
                        setCurrentPlayingItem(item);
                        setIsPlaying(true);
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
                setCurrentPlayingItem(item);
                setIsPlaying(true);
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
      const newItem: DBItem = {
        id: Date.now().toString(),
        parentId: currentFolderId,
        type: 'file',
        name: file.name,
        size: formatBytes(file.size),
        date: new Date().toLocaleDateString(),
        category: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'doc',
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

  const mode = resolveTheme(appTheme);
  return (
    <div className="min-h-screen flex flex-col font-sans relative overflow-hidden text-primary">
      {/* Premium metallic gradient background */}
      {mode === 'light' ? (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #e8e8e8 15%, #b0b0b0 30%, #505050 50%, #1a1a1a 70%, #0a0a0a 85%, #000000 100%)' }} />
      ) : (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #2a2a2a 0%, #1f1f1f 15%, #151515 30%, #0d0d0d 50%, #080808 70%, #030303 85%, #000000 100%)' }} />
      )}
      <div className="absolute pointer-events-none" style={{ top: '-20%', left: '10%', width: '120px', height: '180%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 20%, rgba(0,0,0,0.4) 35%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0) 100%)', transform: 'rotate(12deg)', filter: 'blur(18px)' }} />
      <div className="absolute pointer-events-none" style={{ top: '-15%', left: '35%', width: '80px', height: '170%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.1) 65%, rgba(0,0,0,0) 100%)', transform: 'rotate(8deg)', filter: 'blur(22px)' }} />
      <div className="absolute pointer-events-none" style={{ top: '-25%', left: '58%', width: '100px', height: '190%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.35) 32%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0) 100%)', transform: 'rotate(15deg)', filter: 'blur(15px)' }} />
      <div className="absolute pointer-events-none" style={{ top: '-10%', left: '78%', width: '90px', height: '160%', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 22%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.08) 62%, rgba(0,0,0,0) 100%)', transform: 'rotate(10deg)', filter: 'blur(20px)' }} />
      {/* Premium noise texture — subtle grain */}
      <div className="absolute pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />
      {/* Gradient orbs — enhanced depth */}
      <div className="absolute w-96 h-96 opacity-25" style={{ top: '-12%', left: '-8%', background: 'radial-gradient(circle, #d4d4d4 0%, transparent 70%)', borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%', animation: 'blobFloat1 20s ease-in-out infinite', filter: 'blur(60px)' }} />
      <div className="absolute w-80 h-80 opacity-20" style={{ top: '-3%', right: '-3%', background: 'radial-gradient(circle, #c0c0c0 0%, transparent 70%)', borderRadius: '40% 60% 50% 50% / 50% 40% 60% 50%', animation: 'blobFloat2 25s ease-in-out infinite', filter: 'blur(50px)' }} />
      <div className="absolute w-80 h-80 opacity-20" style={{ bottom: '-8%', right: '-8%', background: 'radial-gradient(circle, #1a1a1a 0%, transparent 70%)', borderRadius: '55% 45% 60% 40% / 45% 55% 45% 55%', animation: 'blobFloat2 28s ease-in-out infinite', filter: 'blur(50px)' }} />
      <div className="absolute w-64 h-64 opacity-15" style={{ bottom: '8%', left: '-3%', background: 'radial-gradient(circle, #2a2a2a 0%, transparent 70%)', borderRadius: '45% 55% 35% 65% / 55% 45% 55% 45%', animation: 'blobFloat3 22s ease-in-out infinite', filter: 'blur(40px)' }} />
      {/* Accent orb — dynamic color hint */}
      <div className="absolute w-72 h-72 opacity-[0.08]" style={{ top: '30%', right: '-5%', background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 70%)', borderRadius: '50%', animation: 'blobFloat1 18s ease-in-out infinite', filter: 'blur(50px)' }} />

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)} 
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
            onSuccess={(blob, mimeType) => {
              const url = URL.createObjectURL(blob);
              setDecryptedUrls(prev => ({ ...prev, [itemToDecrypt.id]: url }));
              if (decryptResolveRef.current) {
                decryptResolveRef.current(url);
                decryptResolveRef.current = null;
              }
              
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
            onSeek={handleSeek}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
             <motion.div key="dashboard-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full pb-32 relative">
               
               <TopActions 
                  activeTab={activeTab}
                  isCreatingFolder={isCreatingFolder}
                  newFolderName={newFolderName}
                  folderInputRef={folderInputRef}
                  onAddFile={() => fileInputRef.current?.click()}
                  onStartFolderCreation={startFolderCreation}
                  onNewFolderNameChange={setNewFolderName}
                  onConfirmFolderCreation={confirmFolderCreation}
                  onCancelFolderCreation={cancelFolderCreation}
                  onNavigateView={handleViewNavigation} 
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

                   <AnimatePresence mode="wait">
                    {activeTab === 'files' && (
                      <motion.div key="files" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                        <div className="flex flex-col pb-4" style={{ height: 'calc(100vh - 320px)' }}>
                          <div className="flex items-center gap-2.5 mb-5 shrink-0">
                           {currentFolderId === null ? (
                             <><Home size={22} className="text-primary" /><span className="font-bold text-lg text-primary">{t('files')}</span></>
                           ) : (
                             <div className="flex items-center gap-2">
                               <button onClick={() => { if(currentFolderId) { const p = items.find(i => i.id === currentFolderId)?.parentId || null; setCurrentFolderId(p); }}} className="flex items-center gap-1 hover:opacity-70 transition-opacity text-primary"><ArrowLeft size={20} /><span className="font-bold text-lg">{t('files')}</span></button>
                               <span className="text-muted">/</span>
                               <span className="font-bold text-lg text-primary">{items.find(i => i.id === currentFolderId)?.name}</span>
                             </div>
                           )}
                         </div>
                          <div className="relative mb-3 shrink-0">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              placeholder="Search files..."
                              className="w-full bg-black/30 backdrop-blur-sm border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:border-neon-green/50 focus:shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] focus:bg-black/40"
                            />
                            {searchQuery && (
                              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                         <Virtuoso
                           style={{ flex: 1 }}
                           totalCount={visibleItems.length}
                           itemContent={(index) => {
                             const item = visibleItems[index];
                             return (
                               <FileItem 
                                   key={item.id} item={item} onAction={(act) => handleItemAction(act, item)} 
                                   onOpenMenu={() => { if(item.type !== 'system') setMenuOpenItem(item); }} 
                                   onClick={() => isSelectionMode ? handleItemSelect(item.id) : handleNavigate(item)} 
                                   theme={appTheme}
                                   isRenaming={renamingId === item.id} renameValue={renameValue}
                                   onRenameChange={setRenameValue} onRenameConfirm={handleRenameConfirm}
                                   onRenameCancel={() => setRenamingId(null)}
                                   isSelected={selectedItems.has(item.id)}
                               />
                             );
                           }}
                           overscan={5}
                         />
                        </div>
                      </motion.div>
                    )}

                   {activeTab === 'gallery' && (
                     <motion.div key="gallery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                       <GalleryView items={items} onNavigate={handleNavigate} theme={appTheme} onDecrypt={decryptOnDemand} decryptedUrls={decryptedUrls} />
                     </motion.div>
                   )}

                   {activeTab === 'music' && (
                     <motion.div key="music" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                       <MusicView items={items} onPlay={(item) => { setCurrentPlayingItem(item); setIsPlaying(true); }} currentSong={currentPlayingItem} isPlaying={isPlaying} theme={appTheme} />
                     </motion.div>
                   )}

                    {activeTab === 'docs' && (
                      <motion.div key="docs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                         {(() => {
                           const docItems = items.filter(i => i.category === 'doc');
                           return docItems.length === 0 ? (
                             <div className="flex flex-col items-center justify-center px-8 pt-10">
                               <div className="glass-card rounded-[24px] p-4 max-w-xs w-full flex flex-col items-center">
                                  <div className="w-40 h-40 rounded-2xl overflow-hidden -mt-10 mb-4 shadow-xl glass-snow-float">
                                    <img src={snowDocumentImg} alt="Snow" className="w-full h-full object-cover" />
                                 </div>
                                 <div className="text-center px-2 pb-2">
                                   <h4 className="text-sm font-bold text-white text-center mb-2">Snow is preparing the document viewer</h4>
                                   <p className="text-xs text-zinc-300 text-center leading-relaxed">I'm working on PDF viewer, text editor, document signing and more. Thanks for exploring this beta with me!</p>
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
                          className="fixed bottom-[95px] left-4 right-4 z-50 cursor-pointer"
                      >
                          {/* Mini Player UI */}
                           <div className="glass-card rounded-full p-3 pr-4 flex items-center gap-3 relative overflow-hidden group">
                            <div className="w-14 h-14 rounded-full bg-black border border-border flex items-center justify-center shrink-0 overflow-hidden relative z-10">
                                {(() => {
                                   const src = currentPlayingItem.customIcon || currentPlayingItem.coverUrl;
                                   return src && isSafeImageUrl(src);
                                 })() ? (
                                     <img src={currentPlayingItem.customIcon || currentPlayingItem.coverUrl} className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                                 ) : (
                                     <Music size={18} className="text-muted" />
                                 )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center z-10">
                               <h4 className="text-sm font-bold text-primary truncate">{currentPlayingItem.name}</h4>
                               <p className="text-xs text-muted truncate">{currentPlayingItem.artist || t('unknownArtist')}</p>
                            </div>
                            <div className="flex items-center gap-2 z-10">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                                 className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-background hover:scale-105 transition-transform"
                               >
                                 {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
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

                {/* Dev seed button */}
                {import.meta.env.DEV && (
                  <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
                    <button
                      onClick={() => setDevSeedHidden((v) => !v)}
                      aria-label={devSeedHidden ? 'Show test buttons' : 'Hide test buttons'}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-black/60 text-white/90 text-sm shadow-lg backdrop-blur"
                    >
                      {devSeedHidden ? <EyeOff /> : <Eye />}
                    </button>
                    {!devSeedHidden && (
                      <>
                        <button
                          onClick={async () => {
                            const btn = document.activeElement as HTMLButtonElement;
                            btn.textContent = '...';
                            btn.disabled = true;
                            await seedTestData(1000);
                            btn.textContent = '1000 files added!';
                            setTimeout(() => { location.reload(); }, 1500);
                          }}
                          className="px-4 py-2 rounded-xl bg-neon-green text-black text-xs font-bold shadow-lg shadow-neon-green/30"
                        >
                          +1000 files
                        </button>
                        <button
                          onClick={async () => {
                            await clearTestData();
                            location.reload();
                          }}
                          className="px-4 py-2 rounded-xl bg-red-500/80 text-white text-xs font-bold shadow-lg"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                )}

                <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 16px))' }}
                >
                  <div className="mx-auto max-w-[260px] pointer-events-auto">
                    <div className="rounded-[28px] px-3 py-2.5 relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%)',
                        backdropFilter: 'blur(24px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.12)',
                      }}
                    >
                      <div className="flex justify-around items-center relative z-10">
                        <NavButton active={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={<Folder />} label={t('files')} />
                        <NavButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<ImageIcon />} label={t('gallery')} />
                        <NavButton active={activeTab === 'music'} onClick={() => setActiveTab('music')} icon={<Music />} label={t('music')} />
                        <NavButton active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} icon={<FileText />} label={t('documentsTab')} />
                      </div>
                    </div>
                  </div>
                </nav>
             </motion.div>
          )}

          {currentView === 'storage' && <StorageView onBack={() => setCurrentView('dashboard')} storageStats={storageStats} appTheme={appTheme} />}
          {currentView === 'settings' && (
            <SettingsView 
              key="settings-view"
              onBack={() => setCurrentView('dashboard')} 
              appTheme={appTheme} 
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
            />
          )}
          {currentView === 'search' && <SearchView items={items} onNavigate={(item) => { handleNavigate(item); setCurrentView('dashboard'); }} onBack={() => setCurrentView('dashboard')} theme={appTheme} />}
          {currentView === 'trash' && <TrashView trashItems={trashItems} onRestore={restoreFromTrash} onDeleteForever={deletePermanently} onBack={() => setCurrentView('dashboard')} theme={appTheme} />}
          {currentView === 'about' && <AboutView onBack={() => setCurrentView('settings')} accentColor={accentColor} />}
          {currentView === 'vault' && <VaultView onBack={() => setCurrentView('settings')} />}
          {currentView === 'backup' && <BackupView onBack={() => setCurrentView('dashboard')} theme={appTheme} />}
        </AnimatePresence>
      </div>
    </div>
  );
};
