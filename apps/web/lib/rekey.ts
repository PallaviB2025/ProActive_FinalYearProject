import {
  initializeVault,
  encryptCredential,
} from "./crypto";
import type { StoredCredential, VaultMetadata } from "@proactive/shared";
import type { LocalCredential } from "./audit";

export async function prepareRekey(
  newMasterPassword: string,
  credentials: LocalCredential[],
): Promise<{
  newKey: CryptoKey;
  metadata: VaultMetadata;
  reEncrypted: StoredCredential[];
}> {
  const { key: newKey, metadata } = await initializeVault(newMasterPassword);
  const reEncrypted: StoredCredential[] = [];

  for (const item of credentials) {
    const { id, ...credData } = item;
    const payload = await encryptCredential(newKey, id, credData);
    reEncrypted.push({ id, payload });
  }

  return { newKey, metadata, reEncrypted };
}
