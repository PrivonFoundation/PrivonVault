
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Terminal,
  Search, CreditCard, FileKey,
  Globe, StickyNote, X, ChevronRight, Hash, Copy, Check, Trash2, Eye, EyeOff,
  KeyRound
} from 'lucide-react';
import { useI18n } from '../../locales/i18nContext';
import { vault_encrypt_keys, vault_decrypt_keys } from '../../crypto-core/index';
import { getVaultKey } from '../../crypto-core/db';

export type DevCredentialKind = 'api-key' | 'token' | 'secret' | 'other';

interface DevCredentialEntry {
  id: string;
  name: string;
  kind: DevCredentialKind;
  value: string;
  categoryId: string;
  date: string;
}

interface DevCredentialsViewProps {
  onBack: () => void;
}

interface DevCredentialCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
}

type StoreError = 'decrypt-failed' | 'no-key';

type EntriesResult =
  | { ok: true; entries: DevCredentialEntry[] }
  | { ok: false; error: StoreError };

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'terminal': <Terminal />,
  'card': <CreditCard />,
  'key': <FileKey />,
  'web': <Globe />,
  'note': <StickyNote />,
  'hash': <Hash />
};

const DEFAULT_CATEGORIES: DevCredentialCategory[] = [
  { id: 'dev_api', name: 'API Keys', icon: 'key', count: 0, color: '#e4e4e7' },
  { id: 'dev_tokens', name: 'Tokens', icon: 'card', count: 0, color: '#3b82f6' },
  { id: 'dev_secrets', name: 'Secrets', icon: 'terminal', count: 0, color: '#eab308' },
];

const KINDS: DevCredentialKind[] = ['api-key', 'token', 'secret', 'other'];

const MASK = '••••••••';

function freshDefaults(): DevCredentialCategory[] {
  return DEFAULT_CATEGORIES.map(c => ({ ...c, count: 0 }));
}

function loadEntries(): EntriesResult {
  const raw = localStorage.getItem('privon_devcreds');
  if (!raw) return { ok: true, entries: [] };
  const vk = getVaultKey();
  if (!vk) return { ok: false, error: 'no-key' };
  try {
    const parsed = JSON.parse(vault_decrypt_keys(raw, vk));
    if (!Array.isArray(parsed)) return { ok: false, error: 'decrypt-failed' };
    return { ok: true, entries: parsed as DevCredentialEntry[] };
  } catch {
    return { ok: false, error: 'decrypt-failed' };
  }
}

function saveEntries(entries: DevCredentialEntry[]): boolean {
  const vk = getVaultKey();
  if (!vk) return false;
  try {
    localStorage.setItem('privon_devcreds', vault_encrypt_keys(JSON.stringify(entries), vk));
    return true;
  } catch {
    return false;
  }
}

function loadCategories(): { ok: true; cats: DevCredentialCategory[] } | { ok: false } {
  const vk = getVaultKey();
  const meta = localStorage.getItem('privon_devcreds_meta');
  if (meta) {
    if (!vk) return { ok: false };
    try {
      const parsed = JSON.parse(vault_decrypt_keys(meta, vk));
      if (!Array.isArray(parsed)) return { ok: false };
      return { ok: true, cats: parsed as DevCredentialCategory[] };
    } catch {
      return { ok: false };
    }
  }
  const legacy = localStorage.getItem('privon_devcreds_cats');
  if (legacy) {
    let cats: DevCredentialCategory[] = freshDefaults();
    try {
      const parsed = JSON.parse(legacy);
      if (Array.isArray(parsed) && parsed.length > 0) cats = parsed as DevCredentialCategory[];
    } catch {}
    if (vk && cats.length > 0) {
      try {
        localStorage.setItem('privon_devcreds_meta', vault_encrypt_keys(JSON.stringify(cats), vk));
        localStorage.removeItem('privon_devcreds_cats');
      } catch {}
    }
    return { ok: true, cats };
  }
  return { ok: true, cats: freshDefaults() };
}

function saveCategories(cats: DevCredentialCategory[]): boolean {
  const vk = getVaultKey();
  if (!vk) return false;
  try {
    localStorage.setItem('privon_devcreds_meta', vault_encrypt_keys(JSON.stringify(cats), vk));
    return true;
  } catch {
    return false;
  }
}

export const DevCredentialsView: React.FC<DevCredentialsViewProps> = ({ onBack }) => {
  const { t } = useI18n();

  const kindLabel = (kind: DevCredentialKind): string => {
    switch (kind) {
      case 'api-key': return t('devCredsKindApiKey');
      case 'token': return t('devCredsKindToken');
      case 'secret': return t('devCredsKindSecret');
      default: return t('devCredsKindOther');
    }
  };

  const [catInit] = useState(() => loadCategories());
  const [categories, setCategories] = useState<DevCredentialCategory[]>(
    catInit.ok ? catInit.cats : freshDefaults()
  );
  const [storeError, setStoreError] = useState<StoreError | null>(
    catInit.ok ? null : 'decrypt-failed'
  );
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const res = loadEntries();
    if (!res.ok) {
      setStoreError(res.error);
      return;
    }
    setCategories(prev => prev.map(c => ({
      ...c,
      count: res.entries.filter(k => k.categoryId === c.id).length
    })));
    setTotalCount(res.entries.length);
  }, []);

  const [activeCategory, setActiveCategory] = useState<DevCredentialCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<DevCredentialEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<DevCredentialKind>('api-key');
  const [newValue, setNewValue] = useState('');

  const hideTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      setItems([]);
      setVisibleIds(new Set());
      hideTimers.current.forEach(clearTimeout);
      hideTimers.current.clear();
      if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
    };
  }, []);

  useEffect(() => {
    if (storeError) return;
    saveCategories(categories);
  }, [categories, storeError]);

  useEffect(() => {
    if (!activeCategory) {
      setItems([]);
      setVisibleIds(new Set());
      return;
    }
    const res = loadEntries();
    if (!res.ok) {
      setStoreError(res.error);
      setItems([]);
      return;
    }
    setItems(res.entries.filter(k => k.categoryId === activeCategory.id));
  }, [activeCategory]);

  const handleCreateCategory = () => {
    if (!newCatName.trim()) {
      setIsCreating(false);
      return;
    }
    if (storeError) {
      setIsCreating(false);
      return;
    }
    const newCat: DevCredentialCategory = {
      id: crypto.randomUUID(),
      name: newCatName,
      icon: 'terminal',
      count: 0,
      color: '#ffffff'
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
    setIsCreating(false);
  };

  const handleAddCredential = () => {
    if (storeError || !activeCategory || !newName.trim() || !newValue.trim()) return;
    const res = loadEntries();
    if (!res.ok) {
      setStoreError(res.error);
      return;
    }
    const entry: DevCredentialEntry = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      kind: newKind,
      value: newValue.trim(),
      categoryId: activeCategory.id,
      date: new Date().toISOString().slice(0, 10)
    };
    const all = [...res.entries, entry];
    if (!saveEntries(all)) {
      setStoreError('no-key');
      return;
    }
    setItems(all.filter(k => k.categoryId === activeCategory.id));
    setCategories(prev => prev.map(c =>
      c.id === activeCategory.id ? { ...c, count: c.count + 1 } : c
    ));
    setTotalCount(prev => prev + 1);
    setNewName('');
    setNewValue('');
    setNewKind('api-key');
  };

  const handleCopy = async (value: string, id: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (clipboardTimer.current) clearTimeout(clipboardTimer.current);
    clipboardTimer.current = setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText();
        if (current === value) await navigator.clipboard.writeText('');
      } catch {}
    }, 30000);
  };

  const handleDelete = (id: string) => {
    if (storeError) {
      setDeleteConfirm(null);
      return;
    }
    const res = loadEntries();
    if (!res.ok) {
      setStoreError(res.error);
      setDeleteConfirm(null);
      return;
    }
    const filtered = res.entries.filter(k => k.id !== id);
    if (!saveEntries(filtered)) {
      setStoreError('no-key');
      setDeleteConfirm(null);
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
    setCategories(prev => prev.map(c =>
      c.id === activeCategory?.id ? { ...c, count: Math.max(0, c.count - 1) } : c
    ));
    setTotalCount(prev => Math.max(0, prev - 1));
    setDeleteConfirm(null);
  };

  const handleDeleteAll = () => {
    if (storeError) return;
    if (!confirm(t('devCredsDeleteAllConfirm'))) return;
    const defaults = freshDefaults();
    localStorage.removeItem('privon_devcreds');
    localStorage.removeItem('privon_devcreds_cats');
    if (!saveCategories(defaults)) {
      setStoreError('no-key');
      return;
    }
    setCategories(defaults);
    setItems([]);
    setVisibleIds(new Set());
    setTotalCount(0);
  };

  const toggleVisibility = (id: string) => {
    const pending = hideTimers.current.get(id);
    if (pending) {
      clearTimeout(pending);
      hideTimers.current.delete(id);
    }
    setVisibleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      next.add(id);
      hideTimers.current.set(id, setTimeout(() => {
        hideTimers.current.delete(id);
        setVisibleIds(cur => {
          const n = new Set(cur);
          n.delete(id);
          return n;
        });
      }, 30000));
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
      <div className="px-5 pt-6 pb-4 border-b border-border bg-background sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={activeCategory ? () => setActiveCategory(null) : onBack} className="p-2 -ml-2 rounded-full hover:bg-zinc-900 transition-colors text-white group glass-button">
              <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white flex items-center gap-2">
                <Terminal size={22} className="text-neon-green" />
                {activeCategory ? activeCategory.name : t('devCredsTitle')}
              </h2>
              {activeCategory && <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{activeCategory.count} {t('elementsLabel')}</p>}
            </div>
          </div>
        </div>

        <div className="mt-4 relative">
          <input
            type="text"
            placeholder={activeCategory ? t('devCredsSearchIn').replace('{{name}}', activeCategory.name) : t('devCredsSearchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-white focus:outline-none focus:border-neon-green transition-all placeholder:text-zinc-600"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
        </div>

        {storeError && (
          <div className="mt-3 text-red-400 text-xs font-medium bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center">
            {storeError === 'no-key' ? t('devCredsNoKeyError') : t('devCredsDecryptError')}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        <AnimatePresence mode="wait">

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
                    <button onClick={() => setIsCreating(false)} className="px-3 bg-zinc-800 text-zinc-400 rounded-xl"><X size={18} /></button>
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
                    onClick={handleDeleteAll}
                    className="w-full p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Trash2 size={14} /> {t('devCredsDeleteAll')}
                    </span>
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="items"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder={t('devCredsNamePlaceholder')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-green outline-none placeholder:text-zinc-600"
                />
                <div className="flex gap-2">
                  {KINDS.map(k => (
                    <button
                      key={k}
                      onClick={() => setNewKind(k)}
                      className={`flex-1 px-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all ${newKind === k ? 'bg-neon-green text-black' : 'bg-black/50 border border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {kindLabel(k)}
                    </button>
                  ))}
                </div>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={t('devCredsValuePlaceholder')}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCredential()}
                  className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-neon-green outline-none placeholder:text-zinc-600"
                />
                <button
                  onClick={handleAddCredential}
                  disabled={storeError !== null || !newName.trim() || !newValue.trim()}
                  className="w-full py-3 rounded-xl bg-neon-green text-black text-xs font-bold uppercase tracking-wide disabled:opacity-40 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> {t('devCredsAddButton')}
                </button>
              </div>

              <div className="space-y-3">
                {items
                  .filter(item =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    kindLabel(item.kind).toLowerCase().includes(searchQuery.toLowerCase())
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
                            <KeyRound size={16} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white truncate max-w-[180px]">{item.name}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-zinc-800">{kindLabel(item.kind)}</span>
                              <span>{item.date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleVisibility(item.id)}
                            className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                          >
                            {visibleIds.has(item.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => handleCopy(item.value, item.id)}
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
                        <span className="text-neon-green/60 shrink-0">{t('devCredsValueLabel')}:</span>
                        <span className={visibleIds.has(item.id) ? 'text-neon-green' : 'text-zinc-700 select-none'}>
                          {visibleIds.has(item.id) ? item.value : MASK}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                {items.length === 0 && (
                  <div className="text-center py-16">
                    <Terminal size={32} className="mx-auto text-zinc-800 mb-3" />
                    <p className="text-zinc-600 text-xs">{t('devCredsNoItems')}</p>
                    <p className="text-zinc-700 text-[10px] mt-1">{t('devCredsAddHint')}</p>
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
