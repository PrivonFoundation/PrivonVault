import React from 'react';

/**
 * Lazy icon-pack loader.
 *
 * Dynamic custom icons (formats like "fa:Beer", "md:Abc", legacy "Music")
 * are resolved at runtime from vault metadata, so the packs cannot be
 * tree-shaken. Loading each pack via dynamic import() keeps them in
 * separate chunks that only download when a file actually uses one,
 * instead of shipping all ~12 MB of icon sets in the main bundle.
 */

export type IconPack = Record<
  string,
  React.ComponentType<{ className?: string; size?: number | string; style?: React.CSSProperties }>
>;

const loaders: Record<string, () => Promise<IconPack>> = {
  lucide: () => import('lucide-react') as unknown as Promise<IconPack>,
  hero: () => import('@heroicons/react/24/solid') as unknown as Promise<IconPack>,
  fa: () => import('react-icons/fa') as unknown as Promise<IconPack>,
  md: () => import('react-icons/md') as unknown as Promise<IconPack>,
  bs: () => import('react-icons/bs') as unknown as Promise<IconPack>,
  bi: () => import('react-icons/bi') as unknown as Promise<IconPack>,
  io: () => import('react-icons/io5') as unknown as Promise<IconPack>,
  ri: () => import('react-icons/ri') as unknown as Promise<IconPack>,
  tb: () => import('react-icons/tb') as unknown as Promise<IconPack>,
};

const cache = new Map<string, Promise<IconPack>>();

export function loadIconPack(prefix: string): Promise<IconPack> {
  const loader = loaders[prefix];
  if (!loader) return Promise.resolve({});
  let task = cache.get(prefix);
  if (!task) {
    task = loader();
    cache.set(prefix, task);
  }
  return task;
}