import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import * as HeroIcons from '@heroicons/react/24/solid';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as BsIcons from 'react-icons/bs';
import * as BiIcons from 'react-icons/bi';
import * as IoIcons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import * as TbIcons from 'react-icons/tb';

import { FileSystemItem } from '../types';
import { Tag } from '../crypto-core/db';
import { FileItem } from './FileItem';
import { CustomColorPicker } from './CustomColorPicker';
import { useI18n } from '../locales/i18nContext';
import { is_safe_image_url as isSafeImageUrl } from '../crypto-core/index';

type PackKey = 'lucide' | 'hero' | 'emoji' | 'fa' | 'md' | 'bs' | 'bi' | 'io' | 'ri' | 'tb';

interface PackDef {
    key: PackKey;
    name: string;
    desc: string;
    icon: React.ReactNode;
    map?: any;
    prefix: string;
}

const getPackDefs = (t: (key: any) => string): PackDef[] => [
    { key: 'lucide', name: t('packLucide'), desc: t('packLucideDesc'), icon: <LucideIcons.Zap size={28} />, map: LucideIcons, prefix: 'lucide' },
    { key: 'hero', name: t('packHero'), desc: t('packHeroDesc'), icon: <LucideIcons.Star size={28} />, map: HeroIcons, prefix: 'hero' },
    { key: 'fa', name: t('packFontAwesome'), desc: t('packFontAwesomeDesc'), icon: <LucideIcons.Flag size={28} />, map: FaIcons, prefix: 'fa' },
    { key: 'md', name: t('packMaterial'), desc: t('packMaterialDesc'), icon: <LucideIcons.LayoutDashboard size={28} />, map: MdIcons, prefix: 'md' },
    { key: 'bs', name: t('packBootstrap'), desc: t('packBootstrapDesc'), icon: <LucideIcons.AppWindow size={28} />, map: BsIcons, prefix: 'bs' },
    { key: 'bi', name: t('packBoxIcons'), desc: t('packBoxIconsDesc'), icon: <LucideIcons.Box size={28} />, map: BiIcons, prefix: 'bi' },
    { key: 'io', name: t('packIonicons'), desc: t('packIoniconsDesc'), icon: <LucideIcons.Smartphone size={28} />, map: IoIcons, prefix: 'io' },
    { key: 'ri', name: t('packRemix'), desc: t('packRemixDesc'), icon: <LucideIcons.Repeat size={28} />, map: RiIcons, prefix: 'ri' },
    { key: 'tb', name: t('packTabler'), desc: t('packTablerDesc'), icon: <LucideIcons.Grid3X3 size={28} />, map: TbIcons, prefix: 'tb' },
    { key: 'emoji', name: t('packEmojis'), desc: t('packEmojisDesc'), icon: <span className="text-3xl">🎨</span>, prefix: 'emoji' },
];

const EMOJI_CATEGORIES_DATA: Record<string, string[]> = {
    'Folder': ['📁', '📂', '🗂️', '🗃️', '💼', '👜', '🎒', '📦', '🎁', '📫', '📪', '📭', '📬'],
    'Status': ['✅', '❌', '⚠️', '🔥', '⭐', '❤️', '🟢', '🔴', '🔒', '🔓', '🛡️', '🔑', '🧿', '🚫', '💯', '💢'],
    'Tech': ['💻', '🖥️', '🖨️', '🖱️', '📱', '🔋', '🔌', '📡', '💾', '💿', '📀', '📷', '📹', '🕹️', '🎙️', '🎚️', '🎛️', '⏱️', '💡'],
    'Media': ['📸', '🎥', '🎬', '🎧', '🎤', '🎹', '🎼', '🎨', '🎭', '🎫', '🎷', '🎸', '🎺', '🎻', '🥁', '🎲', '🎯', '🎳'],
    'Nature': ['🌲', '🌵', '🌴', '🍁', '🍄', '🌸', '🌍', '🌙', '☀️', '☁️', '⚡', '❄️', '🔥', '💧', '🌊', '🌈', '🌪️', '🌋', '🗻'],
    'Work': ['📊', '📉', '📅', '📌', '📎', '📝', '✒️', '📏', '🔨', '🔧', '🪛', '🧱', '⚙️', '⛓️', '🧲', '⚖️', '💸', '💵', '💳'],
    'Fun': ['🚀', '🛸', '🎮', '🎲', '👾', '🤖', '🎃', '👻', '🍕', '🍺', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '🍷', '🥂']
};

const EMOJI_CAT_KEYS: Record<string, string> = {
    'Folder': 'emojiCategoryFolder',
    'Status': 'emojiCategoryStatus',
    'Tech': 'emojiCategoryTech',
    'Media': 'emojiCategoryMedia',
    'Nature': 'emojiCategoryNature',
    'Work': 'emojiCategoryWork',
    'Fun': 'emojiCategoryFun',
};

const getKeysForPack = (packKey: PackKey, packDefs: PackDef[]) => {
    if (packKey === 'emoji') return [];
    const def = packDefs.find(p => p.key === packKey);
    if (!def || !def.map) return [];
    return Object.keys(def.map).filter(k => {
        return /^[A-Z]/.test(k) && !k.endsWith('Context') && !k.endsWith('Provider') && k !== 'createLucideIcon' && k !== 'Icon';
    });
};

const getIconCategories = (pack: PackKey, packDefs: PackDef[]): Record<string, string[]> => {
    if (pack === 'emoji') {
        const out: Record<string, string[]> = {};
        Object.keys(EMOJI_CATEGORIES_DATA).forEach(k => {
            out[EMOJI_CAT_KEYS[k] || k] = EMOJI_CATEGORIES_DATA[k];
        });
        return out;
    }

    const keys = getKeysForPack(pack, packDefs);
    const catEssential = 'iconCategoryEssential';
    const catMedia = 'media';
    const catTech = 'tech';
    const catOffice = 'iconCategoryOffice';
    const catSecurity = 'iconCategorySecurityCat';
    const catWeather = 'iconCategoryWeather';
    const catArrows = 'iconCategoryArrows';
    const catAll = 'iconCategoryAll';

    const categories: Record<string, string[]> = {
        [catEssential]: [],
        [catMedia]: [],
        [catTech]: [],
        [catOffice]: [],
        [catSecurity]: [],
        [catWeather]: [],
        [catArrows]: [],
        [catAll]: keys
    };

    keys.forEach(key => {
        const lower = key.toLowerCase();
        if (['user', 'home', 'settings', 'menu', 'search', 'check', 'x', 'plus', 'minus', 'edit', 'trash', 'save', 'filter', 'grid', 'more', 'loader', 'flag', 'star', 'heart'].some(k => lower.includes(k))) categories[catEssential].push(key);
        if (['video', 'music', 'audio', 'image', 'camera', 'film', 'mic', 'volume', 'play', 'pause', 'stop', 'cast'].some(k => lower.includes(k))) categories[catMedia].push(key);
        if (['cpu', 'wifi', 'battery', 'code', 'database', 'server', 'laptop', 'phone', 'monitor', 'keyboard', 'mouse', 'bug', 'git', 'usb', 'bluetooth'].some(k => lower.includes(k))) categories[catTech].push(key);
        if (['file', 'folder', 'book', 'clip', 'paper', 'archive', 'calendar', 'chart', 'mail', 'inbox', 'printer', 'briefcase', 'pen'].some(k => lower.includes(k))) categories[catOffice].push(key);
        if (['lock', 'key', 'shield', 'eye', 'scan', 'alert', 'warning', 'info'].some(k => lower.includes(k))) categories[catSecurity].push(key);
        if (['sun', 'moon', 'cloud', 'rain', 'snow', 'wind', 'storm', 'zap', 'thermometer'].some(k => lower.includes(k))) categories[catWeather].push(key);
        if (['arrow', 'chevron', 'caret', 'corner', 'move', 'refresh', 'sync', 'loop', 'undo', 'redo'].some(k => lower.includes(k))) categories[catArrows].push(key);
    });

    if (categories[catEssential].length < 20) categories[catEssential] = keys.slice(0, 50);
    return categories;
};

export const CustomizeModal: React.FC<{
    item: FileSystemItem;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedItem: FileSystemItem) => void;
}> = ({ item, isOpen, onClose, onSave }) => {
    const { t } = useI18n();
    const [view, setView] = useState<'main' | 'packs' | 'library'>('main');
    const [selectedPack, setSelectedPack] = useState<PackKey>('lucide');

    const [name, setName] = useState(item.name);
    const [selectedIcon, setSelectedIcon] = useState<string | undefined>(item.customIcon);
    const [tags, setTags] = useState<Tag[]>(item.tags || []);
    const [activeTab, setActiveTab] = useState<'icon' | 'tags'>('icon');

    const [iconCategory, setIconCategory] = useState<string>('');
    const [librarySearch, setLibrarySearch] = useState('');

    const [newTagLabel, setNewTagLabel] = useState('');
    const [newTagColor, setNewTagColor] = useState('#e4e4e7');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const previewItem: FileSystemItem = {
        ...item,
        name: name,
        customIcon: selectedIcon,
        tags: tags,
    };

    const packDefs = useMemo(() => getPackDefs(t), [t]);
    const activeCategories = useMemo(() => getIconCategories(selectedPack, packDefs), [selectedPack, packDefs]);

    const visibleLibraryIcons = useMemo(() => {
        let icons = activeCategories[iconCategory] || [];
        if (librarySearch.trim()) {
            const searchLower = librarySearch.toLowerCase();
            if (selectedPack !== 'emoji') {
                icons = icons.filter(iconName => iconName.toLowerCase().includes(searchLower));
            }
        }
        return icons.slice(0, 48);
    }, [iconCategory, librarySearch, selectedPack, activeCategories]);

    const hasMoreIcons = useMemo(() => {
        const total = (activeCategories[iconCategory] || []).length;
        return total > visibleLibraryIcons.length;
    }, [activeCategories, iconCategory, visibleLibraryIcons.length]);

    const handlePackSelect = (pack: PackKey) => {
        setSelectedPack(pack);
        const cats = getIconCategories(pack, packDefs);
        const firstCat = Object.keys(cats).includes('iconCategoryEssential') ? 'iconCategoryEssential' : Object.keys(cats)[0];
        setIconCategory(firstCat);
        setView('library');
    };

    const handleIconSelect = (iconName: string) => {
        let finalIconString = iconName;
        if (selectedPack !== 'lucide') {
            finalIconString = `${selectedPack}:${iconName}`;
        }
        setSelectedIcon(finalIconString);
        setView('main');
    };

    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedIcon(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addTag = () => {
        if (!newTagLabel.trim()) return;
        const newTag: Tag = {
            id: Date.now().toString(),
            label: newTagLabel,
            color: newTagColor
        };
        setTags([...tags, newTag]);
        setNewTagLabel('');
    };

    const removeTag = (id: string) => {
        setTags(tags.filter(t => t.id !== id));
    };

    const handleSave = () => {
        onSave({ ...item, name, customIcon: selectedIcon, tags });
        onClose();
    };

    const RenderSelectedIconPreview = () => {
        if (!selectedIcon) return null;
        if (isSafeImageUrl(selectedIcon)) {
            return <img src={selectedIcon} className="w-8 h-8 rounded-lg object-cover" />;
        }
        if (selectedIcon.startsWith('emoji:')) {
            return <span className="text-lg">{selectedIcon.replace('emoji:', '')}</span>;
        }
        if (selectedIcon.includes(':')) {
            const [prefix, name] = selectedIcon.split(':');
            const def = packDefs.find(p => p.key === prefix);
            if (def && def.map && def.map[name]) {
                const Cmp = def.map[name];
                return Cmp ? <Cmp size={18} /> : null;
            }
            return null;
        }
        const Cmp = LucideIcons[selectedIcon as keyof typeof LucideIcons] as React.ElementType;
        if (Cmp && (typeof Cmp === 'function' || typeof Cmp === 'object')) return <Cmp size={18} />;
        return null;
    };

    if (!isOpen) return null;

    const getHeaderTitle = () => {
        if (view === 'packs') return t('choosePack' as any) || 'Alege Pachetul';
        if (view === 'library') return t('librarySectionTitle');
        return t('iconStudio') || 'Customize';
    };

    const getHeaderSubtitle = () => {
        if (view === 'packs') return item.name;
        if (view === 'library') return packDefs.find(p => p.key === selectedPack)?.name || '';
        return item.name;
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-[95vw] md:max-w-lg glass-card rounded-lg md:rounded-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[85vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-3 py-2 md:px-6 md:py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-6 h-6 md:w-10 md:h-10 rounded md:rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green">
                                <LucideIcons.Palette size={10} className="md:size-5" />
                            </div>
                            <div>
                                <h3 className="text-xs md:text-lg font-bold text-white">{getHeaderTitle()}</h3>
                                {getHeaderSubtitle() && (
                                    <p className="text-[9px] md:text-xs text-zinc-500 font-medium">{getHeaderSubtitle()}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-2.5 md:p-6 custom-scrollbar min-h-0">
                        <AnimatePresence mode="wait">
                            {view === 'main' ? (
                            <motion.div
                                key="main"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-2 md:space-y-4"
                            >
                                {/* Rename */}
                                <div>
                                    <label className="text-[8px] font-black uppercase text-zinc-500 mb-1 block">{t('rename' as any) || 'Rename'}</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-black/50 border border-zinc-800 rounded md:rounded-xl px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-bold text-white outline-none focus:border-neon-green transition-colors"
                                    />
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b border-zinc-800">
                                    <button onClick={() => setActiveTab('icon')} className={`flex-1 py-2 md:py-3 text-[8px] md:text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'icon' ? 'text-neon-green border-b-2 border-neon-green bg-zinc-900/30' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                        <LucideIcons.Image size={10} className="md:size-4 inline mr-1" />
                                        {t('iconStudio')}
                                    </button>
                                    <button onClick={() => setActiveTab('tags')} className={`flex-1 py-2 md:py-3 text-[8px] md:text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'tags' ? 'text-neon-green border-b-2 border-neon-green bg-zinc-900/30' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                        <LucideIcons.Tag size={10} className="md:size-4 inline mr-1" />
                                        {t('tagEngine')}
                                    </button>
                                </div>

                                {/* ICON TAB */}
                                {activeTab === 'icon' && (
                                    <div className="space-y-2 md:space-y-4">
                                        <div className="flex items-center justify-between p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-900/50 border border-zinc-800">
                                            <div className="flex items-center gap-2 md:gap-4">
                                                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-black border border-zinc-800 flex items-center justify-center overflow-hidden text-white">
                                                    <RenderSelectedIconPreview />
                                                    {!selectedIcon && <LucideIcons.Image size={20} className="text-zinc-600" />}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] md:text-sm font-bold text-white">{t('currentIcon' as any) || 'Current Icon'}</p>
                                                    <p className="text-[8px] md:text-[10px] text-zinc-500">{t('publiclyVisible' as any) || 'Publicly visible'}</p>
                                                </div>
                                            </div>
                                            {selectedIcon && (
                                                <button onClick={() => setSelectedIcon(undefined)} className="px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl bg-red-500/10 text-red-500 text-[8px] md:text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-colors">
                                                    {t('reset' as any) || 'Reset'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="p-4 md:p-8 rounded-lg md:rounded-xl border-2 border-dashed border-zinc-800 bg-black/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-neon-green/50 transition-all group" onClick={() => fileInputRef.current?.click()}>
                                            <div className="p-2 md:p-4 rounded-full bg-zinc-900 group-hover:scale-110 transition-transform">
                                                <LucideIcons.Upload size={14} className="md:size-6 text-zinc-500 group-hover:text-neon-green" />
                                            </div>
                                            <span className="text-[8px] md:text-xs font-bold text-white">{t('uploadImage' as any) || 'Upload Image'}</span>
                                            <span className="text-[7px] md:text-[10px] text-zinc-600">{t('jpgPngSvg')}</span>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleIconUpload} />
                                        </div>

                                        <button onClick={() => setView('packs')} className="w-full p-3 md:p-4 rounded-lg md:rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-neon-green/50 transition-all text-left group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green">
                                                        <LucideIcons.Grid size={12} className="md:size-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] md:text-sm font-bold text-white group-hover:text-neon-green transition-colors">{t('openLibrary' as any) || 'Open Library'}</p>
                                                        <p className="text-[7px] md:text-[10px] text-zinc-600">{t('accessCollections' as any) || 'Access 10 premium collections'}</p>
                                                    </div>
                                                </div>
                                                <LucideIcons.ChevronRight size={12} className="md:size-5 text-zinc-600" />
                                            </div>
                                        </button>
                                    </div>
                                )}

                                {/* TAGS TAB */}
                                {activeTab === 'tags' && (
                                    <div className="space-y-3 md:space-y-4">
                                        <div className="p-2 md:p-4 rounded-lg md:rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2 md:space-y-3">
                                            <h4 className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{t('newTag' as any) || 'Tag Nou'}</h4>
                                            <div className="flex gap-2 md:gap-3">
                                                <input type="text" placeholder={t('tagLabel' as any) || "Tag name..."} value={newTagLabel} onChange={(e) => setNewTagLabel(e.target.value)} className="flex-1 bg-black/50 border border-zinc-800 rounded-lg md:rounded-xl px-2 md:px-4 text-[9px] md:text-sm text-white outline-none focus:border-neon-green" />
                                                <div className="w-8 md:w-12"><CustomColorPicker compact color={newTagColor} onChange={setNewTagColor} /></div>
                                                <button onClick={addTag} className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-neon-green text-black flex items-center justify-center hover:scale-105 transition-transform"><LucideIcons.Plus size={12} className="md:size-5" /></button>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-2 md:mb-3">{t('activeTags' as any) || 'Etichete Active'}</h4>
                                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                                                {tags.map(tag => (
                                                    <span key={tag.id} className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-0.5 md:py-1.5 rounded-lg text-black text-[8px] md:text-xs font-bold" style={{ backgroundColor: tag.color }}>
                                                        {tag.label}
                                                        <button onClick={() => removeTag(tag.id)} className="hover:bg-black/20 rounded-full p-0.5"><LucideIcons.X size={8} className="md:size-3" /></button>
                                                    </span>
                                                ))}
                                                {tags.length === 0 && <p className="text-[8px] md:text-xs text-zinc-600 italic">{t('noTagsAdded' as any) || 'No tags added.'}</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : view === 'packs' ? (
                            <motion.div
                                key="packs"
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 40 }}
                            >
                                <button onClick={() => setView('main')} className="text-[9px] md:text-sm font-bold text-zinc-500 hover:text-neon-green uppercase flex items-center gap-1 mb-2">
                                    ← {t('backButton')}
                                </button>
                                <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                                    {packDefs.map(pack => (
                                        <button
                                            key={pack.key}
                                            onClick={() => handlePackSelect(pack.key)}
                                            className="p-2 md:p-3 rounded-lg md:rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-neon-green/50 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-gradient-to-br from-neon-green to-emerald-600 flex items-center justify-center text-black shrink-0">
                                                    {React.cloneElement(pack.icon as React.ReactElement<any>, { size: 12 })}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[8px] md:text-xs font-bold text-white truncate">{pack.name}</p>
                                                    <p className="text-[6px] md:text-[9px] text-zinc-600 truncate">{pack.desc}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="library"
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 40 }}
                                className="space-y-2"
                            >
                                <button onClick={() => setView('packs')} className="text-[9px] md:text-sm font-bold text-zinc-500 hover:text-neon-green uppercase flex items-center gap-1">
                                    ← {t('backButton')}
                                </button>
                                {selectedPack !== 'emoji' && (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder={t('searchLibrary' as any) || "Search..."}
                                            value={librarySearch}
                                            onChange={(e) => setLibrarySearch(e.target.value)}
                                            className="w-full bg-black/50 border border-zinc-800 rounded-lg md:rounded-xl py-1 md:py-1.5 pl-6 md:pl-8 pr-6 md:pr-8 text-[7px] md:text-[10px] font-bold text-white outline-none focus:border-neon-green"
                                        />
                                        <LucideIcons.Search size={8} className="md:size-3 absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                                        {librarySearch && (
                                            <button onClick={() => setLibrarySearch('')} className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
                                                <LucideIcons.X size={8} className="md:size-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                    {Object.keys(activeCategories).map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => { setIconCategory(cat); setLibrarySearch(''); }}
                                            className={`px-1.5 md:px-3 py-0.5 md:py-1 rounded md:rounded-lg text-[6px] md:text-[9px] font-black uppercase border transition-all whitespace-nowrap flex-shrink-0 ${iconCategory === cat ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'}`}
                                        >
                                            {t(cat as any)}
                                        </button>
                                    ))}
                                </div>
                                {visibleLibraryIcons.length > 0 ? (
                                    <div className="grid grid-cols-6 md:grid-cols-8 gap-1 md:gap-1.5">
                                        {visibleLibraryIcons.map((iconName) => {
                                            const fullId = selectedPack === 'lucide' ? iconName : `${selectedPack}:${iconName}`;
                                            const isSelected = selectedIcon === fullId;
                                            let Content = null;
                                            const def = packDefs.find(p => p.key === selectedPack);
                                            if (selectedPack === 'emoji') {
                                                Content = <span className="text-sm md:text-lg">{iconName}</span>;
                                            } else if (def && def.map) {
                                                const IconCmp = def.map[iconName];
                                                if (IconCmp && (typeof IconCmp === 'function' || typeof IconCmp === 'object')) {
                                                    Content = <IconCmp size={14} />;
                                                }
                                            }
                                            if (!Content) return null;
                                            return (
                                                <button
                                                    key={iconName}
                                                    onClick={() => handleIconSelect(iconName)}
                                                    title={iconName}
                                                    className={`aspect-square rounded md:rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-neon-green text-black ring-1 ring-white scale-110' : 'bg-zinc-900/70 border border-zinc-800 text-zinc-500 hover:border-zinc-400 hover:text-white'}`}
                                                >
                                                    {Content}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-24 text-zinc-600">
                                        <p className="text-[9px] md:text-xs">{t('noIconFound' as any) || 'No icons found.'}</p>
                                    </div>
                                )}
                                {hasMoreIcons && (
                                    <p className="text-center text-[7px] md:text-[9px] text-zinc-600 uppercase font-bold">{t('showingTop48' as any) || 'Showing first 48. Use search for all.'}</p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                    {/* Footer Actions */}
                    <div className="p-3 md:p-6 border-t border-zinc-800 bg-zinc-900/30 flex justify-between items-center gap-3 md:gap-6 shrink-0">
                        {view === 'main' ? (
                            <>
                                <button onClick={onClose} className="text-[9px] md:text-xs font-bold text-zinc-500 hover:text-white uppercase">
                                    {t('cancel' as any) || 'Cancel'}
                                </button>
                                <button onClick={handleSave} className="px-5 md:px-10 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-white text-black text-[10px] md:text-xs font-bold uppercase tracking-wider relative overflow-hidden">
                                    <span className="relative z-10">{t('save' as any) || 'Save'} →</span>
                                </button>
                            </>
                        ) : (
                            <div className="w-full text-center">
                                <button onClick={onClose} className="text-[9px] md:text-xs font-bold text-zinc-500 hover:text-white uppercase">
                                    {t('cancel' as any) || 'Cancel'}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
