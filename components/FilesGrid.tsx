import React, { useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useI18n } from '../locales/i18nContext';
import { FileItem } from './FileItem';
import { FolderIcon } from './FolderIcon';
import type { FileSystemItem, AppTheme } from '../types';

const ROW_HEIGHT = 136;
const COLS = 3;

interface FilesGridProps {
  items: FileSystemItem[];
  theme: AppTheme;
  decryptedUrls: Record<string, string>;
  isSelectionMode: boolean;
  selectedItems: Set<string>;
  renamingId: string | null;
  renameValue: string;
  onItemClick: (item: FileSystemItem) => void;
  onItemSelect: (id: string) => void;
  onOpenMenu: (item: FileSystemItem) => void;
  onAction: (action: string, item: FileSystemItem) => void;
  onRenameChange: (val: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
}

export const FilesGrid: React.FC<FilesGridProps> = ({
  items,
  theme,
  decryptedUrls,
  isSelectionMode,
  selectedItems,
  renamingId,
  renameValue,
  onItemClick,
  onItemSelect,
  onOpenMenu,
  onAction,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
}) => {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(() => {
    const r: FileSystemItem[][] = [];
    for (let i = 0; i < items.length; i += COLS) {
      r.push(items.slice(i, i + COLS));
    }
    return r;
  }, [items]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // Fresh measurement on every mount (tab switches remount this view)
  useEffect(() => {
    virtualizer.measure();
    scrollRef.current?.scrollTo({ top: 0 });
  }, [virtualizer]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div style={{ color: 'var(--accent-color)', opacity: 0.7 }}>
          <FolderIcon size={64} />
        </div>
        <p className="mt-4 text-[17px] font-semibold text-primary">{t('noFiles')}</p>
        <p className="mt-1 text-[14px] text-muted">{t('tapToUpload')}</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
          >
            <div className="grid grid-cols-3 gap-2 pb-2">
              {(rows[virtualRow.index] ?? []).map(item => (
                <FileItem
                  key={item.id}
                  item={item}
                  onAction={(act) => onAction(act, item)}
                  onOpenMenu={() => {
                    if (item.type !== 'system') onOpenMenu(item);
                  }}
                  onClick={() => (isSelectionMode ? onItemSelect(item.id) : onItemClick(item))}
                  theme={theme}
                  layout="grid"
                  thumbnailUrl={decryptedUrls[item.id]}
                  isRenaming={renamingId === item.id}
                  renameValue={renameValue}
                  onRenameChange={onRenameChange}
                  onRenameConfirm={onRenameConfirm}
                  onRenameCancel={onRenameCancel}
                  isSelected={selectedItems.has(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
