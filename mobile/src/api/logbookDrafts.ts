import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogbookEntry, type LogbookEntryDraft } from './client';

// Logbook entries written while offline (or when the API is briefly
// unreachable) are queued here instead of being lost, and synced the next
// time the app detects a network connection or the Logbook screen regains
// focus. Plain AsyncStorage is fine here -- unlike the bearer token, drafts
// aren't sensitive and don't need encrypted storage.
const DRAFTS_KEY = 'siwes_finder_logbook_drafts';

export type QueuedDraft = LogbookEntryDraft & { localId: string; queuedAt: string };

async function readDrafts(): Promise<QueuedDraft[]> {
  const raw = await AsyncStorage.getItem(DRAFTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedDraft[];
  } catch {
    return [];
  }
}

async function writeDrafts(drafts: QueuedDraft[]): Promise<void> {
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export async function getQueuedDrafts(): Promise<QueuedDraft[]> {
  return readDrafts();
}

export async function queueDraft(entry: LogbookEntryDraft): Promise<QueuedDraft> {
  const drafts = await readDrafts();
  const draft: QueuedDraft = {
    ...entry,
    localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queuedAt: new Date().toISOString(),
  };
  await writeDrafts([...drafts, draft]);
  return draft;
}

export async function deleteQueuedDraft(localId: string): Promise<void> {
  const drafts = await readDrafts();
  await writeDrafts(drafts.filter((d) => d.localId !== localId));
}

// Submits every queued draft. A draft that fails again (still offline, or a
// genuine server rejection) stays queued for the next attempt rather than
// being silently dropped -- deleteQueuedDraft is the explicit escape hatch
// for a draft that will never succeed (e.g. the student's placement status
// changed since it was written).
export async function flushQueuedDrafts(): Promise<{ synced: number; remaining: QueuedDraft[] }> {
  const drafts = await readDrafts();
  if (drafts.length === 0) return { synced: 0, remaining: [] };

  const remaining: QueuedDraft[] = [];
  let synced = 0;
  for (const draft of drafts) {
    try {
      const { localId: _localId, queuedAt: _queuedAt, ...entry } = draft;
      await createLogbookEntry(entry);
      synced += 1;
    } catch {
      remaining.push(draft);
    }
  }
  await writeDrafts(remaining);
  return { synced, remaining };
}
