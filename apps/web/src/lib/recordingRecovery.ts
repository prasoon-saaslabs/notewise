/**
 * Desktop recording crash recovery — spool MediaRecorder chunks + session metadata locally.
 */
const META_KEY = "notewise.recording.active";
const DB_NAME = "notewise-recording-recovery";
const STORE = "chunks";
const DB_VERSION = 1;

export type RecordingRecoveryMeta = {
  sessionId: string;
  meetingId: string;
  mime: string;
  seq: number;
  startedAt: number;
  userNotes?: string;
  channelMode?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export function readRecordingRecoveryMeta(): RecordingRecoveryMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RecordingRecoveryMeta;
  } catch {
    return null;
  }
}

export function writeRecordingRecoveryMeta(meta: RecordingRecoveryMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* quota */
  }
}

export function clearRecordingRecoveryMeta(): void {
  try {
    localStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
}

export async function appendRecoveryChunk(
  sessionId: string,
  seq: number,
  blob: Blob,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    tx.objectStore(STORE).put({
      id: `${sessionId}:${seq}`,
      sessionId,
      seq,
      blob,
      at: Date.now(),
    });
  });
}

export async function readRecoveryChunks(sessionId: string): Promise<Blob[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    req.onsuccess = () => {
      db.close();
      const rows = (req.result as Array<{ sessionId: string; seq: number; blob: Blob }>)
        .filter((r) => r.sessionId === sessionId)
        .sort((a, b) => a.seq - b.seq)
        .map((r) => r.blob);
      resolve(rows);
    };
  });
}

export async function clearRecoveryChunks(sessionId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    req.onsuccess = () => {
      const rows = req.result as Array<{ id: string; sessionId: string }>;
      for (const row of rows) {
        if (row.sessionId === sessionId) store.delete(row.id);
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB clear failed"));
  });
}

export async function clearAllRecovery(sessionId: string): Promise<void> {
  clearRecordingRecoveryMeta();
  await clearRecoveryChunks(sessionId).catch(() => undefined);
}
