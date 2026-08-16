
import React from 'react';
import { DBItem, Tag } from './crypto-core/db';

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  children: React.ReactNode;
}

// --- App Core Types ---

export interface FileSystemItem extends Omit<DBItem, 'fileData'> {
  url?: string;
  rawBlob?: Blob;
}

export interface LocationItem {
  id: string; name: string; lat: number; lng: number; region: string;
}

export type ViewState = 'dashboard' | 'search' | 'trash' | 'settings' | 'storage' | 'about' | 'vault';
export type AppTheme = 'dark' | 'light' | 'system';

// --- CRYPTO TYPES ---
export type CryptoAlgorithm = 'AES-GCM' | 'AES-CTR' | 'ChaCha20-Poly1305' | 'XChaCha20-Poly1305' | 'Salsa20-Poly1305' | 'AES-GCM-Stream';
export type ArgonPurpose = 'master' | 'recovery' | 'pin';

export interface EncryptedData {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
  algorithm: CryptoAlgorithm;
}

export interface EncryptedMeta {
  ciphertext: string;
  iv: string;
}

export interface MetadataPlaintext {
  name: string;
  tags?: Tag[];
  artist?: string;
  album?: string;
  coverUrl?: string;
  customIcon?: string;
  externalUrl?: string;
}

export interface ArgonParams {
  iterations: number;
  memoryKib: number;
  parallelism: number;
}

export interface CryptoMetadata {
  master_salt: string;
  recovery_salts: string[];
  argon?: ArgonParams;
  tier?: number;
}

export interface VaultWrappers {
  master?: { ciphertext: string; iv: string };
  device?: { ciphertext: string; iv: string };
  recovery: Record<string, { ciphertext: string; iv: string }>;
}
