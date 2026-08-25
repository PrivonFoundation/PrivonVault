import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, FolderOpen, ArrowLeft, ArrowRight, Copy, Move, Check } from 'lucide-react';
import { FileSystemItem } from '../types';
import { is_safe_image_url as isSafeImageUrl } from '../crypto-core/index';
import { useI18n } from '../locales/i18nContext';
import { db, DBItem } from '../crypto-core/db';

interface CopyMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'copy' | 'move';
  item: FileSystemItem | null;
  allItems: FileSystemItem[];
  onComplete: () => void;
}

export const CopyMoveModal: React.FC<CopyMoveModalProps> = ({
  isOpen,
  onClose,
  mode,
  item,
  allItems,
  onComplete
}) => {
  const { t } = useI18n();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const folders = useMemo(() => {
    return allItems.filter(i => 
      i.type === 'folder' && 
      !i.isTrashed &&
      i.name !== 'Vault' &&
      i.name !== 'Backup' &&
      i.id !== item?.id
    );
  }, [allItems, item]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: t('rootFolder') }];
    let current = currentFolderId;
    while (current) {
      const folder = allItems.find(i => i.id === current);
      if (folder) {
        crumbs.push({ id: folder.id, name: folder.name });
        current = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs.reverse();
  }, [currentFolderId, allItems, t]);

  const currentFolders = useMemo(() => {
    return folders.filter(f => f.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  const handleConfirm = async () => {
    if (!item || !selectedFolderId) return;
    setIsProcessing(true);

    try {
      if (mode === 'copy') {
        const displayName = (item as any).decryptedName || item.name || '';
        const ext = displayName.includes('.') ? '.' + displayName.split('.').pop() : '';
        const baseName = ext ? displayName.slice(0, -ext.length) : displayName;
        let newName = `${baseName}${ext}`;
        
        const existingInTarget = allItems.filter(i => 
          i.parentId === selectedFolderId && i.name === newName
        );
        
        let counter = 1;
        while (existingInTarget.length > 0) {
          newName = `${baseName} (copy ${counter})${ext}`;
          counter++;
        }

        const newItem: DBItem = {
          id: Date.now().toString(),
          parentId: selectedFolderId,
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
      } else {
        const dbItem: DBItem = { 
          ...item, 
          fileData: item.rawBlob || undefined, 
          parentId: selectedFolderId 
        };
        delete (dbItem as any).url;
        delete (dbItem as any).rawBlob;
        await db.updateItem(dbItem);
      }

      onComplete();
      onClose();
    } catch (e) {
      console.error('Copy/Move error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md glass-card rounded-[32px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'copy' ? 'bg-neon-green/10 text-neon-green' : 'bg-blue-500/10 text-blue-500'}`}>
                {mode === 'copy' ? <Copy size={20} /> : <Move size={20} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {mode === 'copy' ? t('copyFile') : t('moveAction')}
                </h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{t('selectDestination')}</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2 no-scrollbar">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id || 'root'}>
                  {idx > 0 && <span className="text-zinc-600">/</span>}
                  <button
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${currentFolderId === crumb.id ? 'bg-neon-green/20 text-neon-green' : 'text-zinc-400 hover:text-white'}`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {currentFolders.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Folder size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{t('noFolderHere')}</p>
                </div>
              ) : (
                currentFolders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      setCurrentFolderId(folder.id);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all relative overflow-hidden ${selectedFolderId === folder.id ? 'bg-neon-green/10 border-neon-green' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}
                  >
                    <span className="relative z-10 flex items-center gap-3 w-full">
                      {folder.customIcon && isSafeImageUrl(folder.customIcon) ? (
                        <img src={folder.customIcon} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <FolderOpen size={16} className="text-neon-green" />
                        </div>
                      )}
                      <span className="text-sm font-bold text-white truncate">{folder.name}</span>
                      {selectedFolderId === folder.id && <Check size={16} className="text-neon-green ml-auto" />}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex gap-3">
            <button
              onClick={() => {
                if (currentFolderId) {
                  const parent = allItems.find(i => i.id === currentFolderId)?.parentId || null;
                  setCurrentFolderId(parent);
                  setSelectedFolderId(parent);
                }
              }}
              disabled={!currentFolderId}
              className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-400 font-bold text-sm disabled:opacity-50"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedFolderId || isProcessing}
              className={`flex-1 py-2 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 relative overflow-hidden ${selectedFolderId ? 'bg-neon-green text-black' : 'bg-zinc-800 text-zinc-500'}`}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'copy' ? <Copy size={16} /> : <Move size={16} />}
                    {mode === 'copy' ? t('copyFile') : t('moveAction')}
                  </>
                )}
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};