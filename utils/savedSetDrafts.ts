import type { FinancialPlan } from '../types';
import { readPlan } from './plan';

export interface SetDraft {
  key: string;
  setId: string | null;
  baseRevision: number | null;
  plan: FinancialPlan;
  updatedAt: number;
  stamp: string;
  pendingSetId?: string;
}

export function draftScope(projectId: string, uid: string) {
  return `retireplan_drafts_v1:${projectId}:${encodeURIComponent(uid)}:`;
}

export function readDrafts(scope: string): SetDraft[] {
  const drafts: SetDraft[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(scope)) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key) ?? '');
        if (!data || key !== scope + data.key || typeof data.stamp !== 'string' || !Number.isFinite(data.updatedAt) ||
          (data.setId !== null && typeof data.setId !== 'string') ||
          (data.baseRevision !== null && !Number.isSafeInteger(data.baseRevision))) continue;
        const { plan } = readPlan(data.plan);
        if (typeof data.plan.planName === 'string') plan.planName = data.plan.planName;
        drafts.push({ ...data, plan });
      } catch {
        // An invalid draft should not hide other drafts.
      }
    }
  } catch {
    // Browser storage can be unavailable in private or restricted contexts.
  }
  return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function storeDraft(scope: string, draft: SetDraft) {
  try {
    localStorage.setItem(scope + draft.key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function removeDraft(scope: string, draft: SetDraft) {
  try {
    const key = scope + draft.key;
    const raw = localStorage.getItem(key);
    if (raw === null) return true;
    const stored = JSON.parse(raw);
    if (stored.stamp !== draft.stamp) return true;
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
