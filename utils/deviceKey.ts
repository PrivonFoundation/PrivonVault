const DEVICE_KEY_ACCOUNT = 'privon_device_key';

async function tryInvoke<T>(command: string, args: Record<string, unknown>): Promise<T | undefined> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<T>(command, args);
  } catch {
    return undefined;
  }
}

export async function storeDeviceKey(key: Uint8Array): Promise<boolean> {
  const result = await tryInvoke<void>('keyring_set', { account: DEVICE_KEY_ACCOUNT, secret: Array.from(key) });
  return result !== undefined;
}

export async function getDeviceKey(): Promise<Uint8Array | null> {
  const bytes = await tryInvoke<number[] | null>('keyring_get', { account: DEVICE_KEY_ACCOUNT });
  if (!bytes || !Array.isArray(bytes)) return null;
  return new Uint8Array(bytes);
}

export async function deleteDeviceKey(): Promise<boolean> {
  const result = await tryInvoke<void>('keyring_delete', { account: DEVICE_KEY_ACCOUNT });
  return result !== undefined;
}

export async function hasDeviceKey(): Promise<boolean> {
  return (await getDeviceKey()) !== null;
}