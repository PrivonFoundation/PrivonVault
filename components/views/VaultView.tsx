
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ShieldCheck, Plus, FolderLock, 
  MoreVertical, Search, Lock, CreditCard, FileKey, 
  Globe, StickyNote, X, ChevronRight, Hash, Copy, Check, Trash2, Eye, EyeOff,
  Vault as SafeIcon
} from 'lucide-react';
import { useI18n } from '../../locales/i18nContext';
import { vault_encrypt_keys, vault_decrypt_keys } from '../../crypto-core/index';
import { getVaultKey } from '../../crypto-core/db';

interface VaultKeyEntry {
  id: string;
  key: string;
  algorithm: string;
  fileName?: string;
  categoryId: string;
  fileId: string;
  date: string;
}

interface VaultViewProps {
  onBack: () => void;
}

interface VaultCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'folder': <FolderLock />,
  'card': <CreditCard />,
  'key': <FileKey />,
  'web': <Globe />,
  'note': <StickyNote />,
  'hash': <Hash />
};

const DEFAULT_CATEGORIES: VaultCategory[] = [
  { id: 'personal', name: 'Personal', icon: 'folder', count: 0, color: '#e4e4e7' },
  { id: 'financial', name: 'Financiar', icon: 'card', count: 0, color: '#eab308' },
  { id: 'social', name: 'Social Media', icon: 'web', count: 0, color: '#3b82f6' },
  { id: 'documents', name: 'Documente', icon: 'note', count: 0, color: '#a855f7' },
];

export const VaultView: React.FC<VaultViewProps> = ({ onBack }) => {
  const { t } = useI18n();
  
  const [categories, setCategories] = useState<VaultCategory[]>(() => {
    const saved = localStorage.getItem('privon_vault_cats');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_CATEGORIES.map(c => ({ ...c, count: 0 }));
  });
  const [totalCount, setTotalCount] = useState(0);

  // Load counts
  useEffect(() => {
    const raw = localStorage.getItem('privon_vault_keys');
    const vk = getVaultKey();
    if (raw && vk) {
      try {
        const allKeys: VaultKeyEntry[] = JSON.parse(vault_decrypt_keys(raw, vk));
        setCategories(prev => prev.map(c => ({
          ...c,
          count: allKeys.filter(k => k.categoryId === c.id).length
        })));
        setTotalCount(allKeys.length);
      } catch {}
    }
  }, []);

  const [activeCategory, setActiveCategory] = useState<VaultCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<VaultKeyEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('privon_vault_cats', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (activeCategory) {
      const raw = localStorage.getItem('privon_vault_keys');
      const vk = getVaultKey();
      let items: VaultKeyEntry[] = [];
      if (raw && vk) {
        try {
          const all: VaultKeyEntry[] = JSON.parse(vault_decrypt_keys(raw, vk));
          items = all.filter(k => k.categoryId === activeCategory.id);
        } catch {}
      }
      setItems(items);
    }
  }, [activeCategory]);

  const handleCreateCategory = () => {
    if (!newCatName.trim()) {
        setIsCreating(false);
        return;
    }
    const newCat: VaultCategory = {
        id: `cat_${Date.now()}`,
        name: newCatName,
        icon: 'folder',
        count: 0,
        color: '#ffffff'
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
    setIsCreating(false);
  };

  const handleCopy = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    const raw = localStorage.getItem('privon_vault_keys');
    const vk = getVaultKey();
    if (raw && vk) {
      try {
        const all: VaultKeyEntry[] = JSON.parse(vault_decrypt_keys(raw, vk));
        const filtered = all.filter(k => k.id !== id);
        localStorage.setItem('privon_vault_keys', vault_encrypt_keys(JSON.stringify(filtered), vk));
      } catch {}
    }
    setItems(prev => prev.filter(i => i.id !== id));
    setCategories(prev => prev.map(c => 
      c.id === activeCategory?.id ? { ...c, count: Math.max(0, c.count - 1) } : c
    ));
    setDeleteConfirm(null);
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.98 }} 
      className="absolute inset-0 z-50 flex flex-col bg-background font-sans"
    >
      {/* HEADER */}
      <div className="px-5 pt-6 pb-4 border-b border-border bg-background sticky top-0 z-20">
         <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                  <button onClick={activeCategory ? () => setActiveCategory(null) : onBack} className="p-2 -ml-2 rounded-full hover:bg-zinc-900 transition-colors text-white group glass-button">
                     <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                  </button>
                 <div>
                    <h2 className="text-xl font-bold tracking-wide text-white flex items-center gap-2">
                        <SafeIcon size={22} className="text-neon-green" />
                        {activeCategory ? activeCategory.name : (t('keyStorage') || 'Stocare Chei')} 
                    </h2>
                    {activeCategory && <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{activeCategory.count} {t('elementsLabel')}</p>}
                 </div>
             </div>
         </div>
         
         <div className="mt-4 relative">
            <input 
                type="text" 
                placeholder={activeCategory ? t('vaultSearchIn').replace('{{name}}', activeCategory.name) : t('vaultSearchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-white focus:outline-none focus:border-neon-green transition-all placeholder:text-zinc-600"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
         </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        <AnimatePresence mode="wait">
            
            {/* VIEW 1: CATEGORIES GRID */}
            {!activeCategory ? (
                <motion.div 
                    key="categories"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">{t('categoriesLabel')}</h3>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="p-2 glass-button rounded-lg text-neon-green hover:text-black transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    {isCreating && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-4">
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder={t('vaultNewCategoryPlaceholder')}
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-green outline-none"
                                />
                                <button onClick={handleCreateCategory} className="px-4 bg-neon-green text-black rounded-xl font-bold text-xs uppercase">OK</button>
                                <button onClick={() => setIsCreating(false)} className="px-3 bg-zinc-800 text-zinc-400 rounded-xl"><X size={18}/></button>
                            </div>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((cat, idx) => (
                            <motion.button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="relative group p-4 sm:p-5 rounded-xl sm:rounded-[24px] glass-card hover:border-neon-green/50 transition-all text-left flex flex-col justify-between h-32 sm:h-36 overflow-hidden"
                                >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 origin-top-right">
                                    {React.cloneElement(CATEGORY_ICONS[cat.icon] as React.ReactElement<any>, { size: 60 })}
                                </div>

                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-black shadow-lg mb-4`} style={{ backgroundColor: cat.color }}>
                                    {React.cloneElement(CATEGORY_ICONS[cat.icon] as React.ReactElement<any>, { size: 20 })}
                                </div>

                                <div>
                                    <h4 className="font-bold text-white text-sm truncate">{cat.name}</h4>
                                    <p className="text-[10px] text-zinc-500 font-mono mt-1">{cat.count} {t('elementsLabel')}</p>
                                </div>
                                
                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                        <ChevronRight size={14} className="text-white" />
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {totalCount > 0 && (
                      <div className="pt-4 border-t border-zinc-800">
                        <button
                          onClick={async () => {
                            if (confirm(t('vaultDeleteAllConfirm'))) {
                              localStorage.removeItem('privon_vault_keys');
                              setCategories(prev => prev.map(c => ({ ...c, count: 0 })));
                              setTotalCount(0);
                            }
                          }}
                          className="w-full p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 relative overflow-hidden"
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            <Trash2 size={14} /> {t('vaultDeleteAll')}
                          </span>
                        </button>
                      </div>
                    )}
                </motion.div>
            ) : (
                /* VIEW 2: ITEMS LIST */
                <motion.div
                    key="items"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                >
                    <div className="space-y-3">
                        {items
                          .filter(item => 
                            (item.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.algorithm.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.id.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((item, idx) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col gap-3 group hover:border-zinc-700 transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-zinc-500">
                                            <Lock size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white truncate max-w-[180px]">{item.fileName}</h4>
                                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                                                <span className="px-1.5 py-0.5 rounded bg-zinc-800">{item.algorithm}</span>
                                                <span>{item.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => toggleVisibility(item.id)}
                                          className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                                        >
                                          {visibleKeys.has(item.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                        <button 
                                          onClick={() => handleCopy(item.key, item.id)}
                                          className="p-1.5 text-zinc-600 hover:text-neon-green transition-colors"
                                        >
                                          {copiedId === item.id ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
                                        </button>
                                        {deleteConfirm === item.id ? (
                                          <div className="flex items-center gap-1 ml-1">
                                            <button onClick={() => handleDelete(item.id)} className="px-2 py-1 rounded bg-red-500 text-white text-[9px] font-bold">{t('vaultDeleteYes')}</button>
                                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded bg-zinc-700 text-zinc-300 text-[9px] font-bold">{t('vaultDeleteNo')}</button>
                                          </div>
                                        ) : (
                                          <button 
                                            onClick={() => setDeleteConfirm(item.id)}
                                            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-black/50 rounded-lg px-3 py-2 font-mono text-[10px] break-all">
                                    <span className="text-zinc-600 shrink-0">{t('vaultIdLabel')}:</span>
                                    <span className="text-zinc-500">{item.id}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-black/50 rounded-lg px-3 py-2 font-mono text-[10px] break-all">
                                    <span className="text-neon-green/60 shrink-0">{t('vaultKeyLabel')}:</span>
                                    <span className={visibleKeys.has(item.id) ? 'text-neon-green' : 'text-zinc-700 blur-sm select-none'}>
                                        {item.key}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                        {items.length === 0 && (
                            <div className="text-center py-16">
                                <Lock size={32} className="mx-auto text-zinc-800 mb-3" />
<p className="text-zinc-600 text-xs">{t('vaultNoKeysInCategory')}</p>
                                 <p className="text-zinc-700 text-[10px] mt-1">{t('vaultKeysAppear')}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
