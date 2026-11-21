import { z } from "zod";

const KEY = "coinciente.connection";
const pointerSchema = z.object({ owner: z.string().min(1), connectionId: z.uuid() });

type PointerStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): PointerStorage {
  return window.localStorage;
}

export function saveConnectionPointer(owner: string, connectionId: string, storage: PointerStorage = browserStorage()): void {
  const pointer = pointerSchema.safeParse({ owner, connectionId });
  if (!pointer.success) return;
  try {
    storage.setItem(KEY, JSON.stringify(pointer.data));
  } catch {
    // A conexão continua utilizável nesta tela quando o armazenamento está indisponível.
  }
}

export function loadConnectionPointer(owner: string, storage: PointerStorage = browserStorage()): string | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const pointer = pointerSchema.safeParse(JSON.parse(raw) as unknown);
    if (pointer.success && pointer.data.owner === owner) return pointer.data.connectionId;
    storage.removeItem(KEY);
  } catch {
    clearConnectionPointer(storage);
  }
  return null;
}

export function clearConnectionPointer(storage: PointerStorage = browserStorage()): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // Sem ponteiro utilizável neste navegador.
  }
}
