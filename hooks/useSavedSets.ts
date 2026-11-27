import { useCallback, useEffect, useRef, useState } from 'react';
import type { SavedSet, SavedSetsRepository } from '../services/savedSets';
import { DEFAULT_PLAN, type FinancialPlan } from '../types';
import { planInputs } from '../utils/plan';
import { readDrafts, removeDraft, storeDraft, type SetDraft } from '../utils/savedSetDrafts';

type DraftEntry = { draft: SetDraft; stored: boolean };
type Workspace = { draft: SetDraft; saved: SavedSet | null; dirty: boolean; conflict: boolean };
type CloudError = 'cloud_error' | 'cloud_restore_error' | 'draft_cleanup_error';

const sameInputs = (a: FinancialPlan, b: FinancialPlan) =>
  JSON.stringify(planInputs(a)) === JSON.stringify(planInputs(b));

const wasChangedRemotely = (error: unknown) => error instanceof Error && error.name === 'SavedSetConflict';
const setKey = (id: string) => `set:${id}`;
const draftId = () => Array.from(crypto.getRandomValues(new Uint32Array(4)),
  part => part.toString(16).padStart(8, '0')).join('');

function newWorkspace(plan = DEFAULT_PLAN): Workspace {
  return {
    draft: {
      key: `new:${draftId()}`,
      setId: null,
      baseRevision: null,
      plan,
      updatedAt: 0,
      stamp: '',
    },
    saved: null,
    dirty: false,
    conflict: false,
  };
}

function savedWorkspace(saved: SavedSet, draft?: SetDraft): Workspace {
  const dirty = Boolean(draft && !sameInputs(draft.plan, saved.plan));
  return {
    draft: dirty && draft ? { ...draft, plan: { ...draft.plan, planName: saved.plan.planName } } : {
      key: setKey(saved.id),
      setId: saved.id,
      baseRevision: saved.revision,
      plan: saved.plan,
      updatedAt: 0,
      stamp: '',
    },
    saved,
    dirty,
    conflict: dirty && draft?.baseRevision !== saved.revision,
  };
}

export function useSavedSets(repository: SavedSetsRepository | null, scope: string) {
  const [workspace, setWorkspace] = useState(newWorkspace);
  const current = useRef(workspace);
  const [entries, setEntries] = useState<DraftEntry[]>(() => repository
    ? readDrafts(scope).map(draft => ({ draft, stored: true }))
    : []);
  const drafts = useRef(entries);
  const [loading, setLoading] = useState(Boolean(repository));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<CloudError | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const running = useRef(false);
  const generation = useRef(0);
  const hasUnstored = useCallback(() => drafts.current.some(entry => !entry.stored), []);

  const show = useCallback((next: Workspace) => {
    current.current = next;
    setWorkspace(next);
  }, []);

  const updateEntries = useCallback((next: DraftEntry[]) => {
    drafts.current = next;
    setEntries(next);
  }, []);

  const remember = (draft: SetDraft): SetDraft => {
    const updated = { ...draft, updatedAt: Date.now(), stamp: draftId() };
    const stored = storeDraft(scope, updated);
    updateEntries([{ draft: updated, stored }, ...drafts.current.filter(entry => entry.draft.key !== updated.key)]);
    return updated;
  };

  const forget = useCallback((draft: SetDraft) => {
    if (!removeDraft(scope, draft)) {
      setError('draft_cleanup_error');
      return false;
    }
    updateEntries(drafts.current.filter(entry => entry.draft.stamp !== draft.stamp));
    return true;
  }, [scope, updateEntries]);

  const showSaved = useCallback((saved: SavedSet) => {
    const previous = drafts.current.find(entry => entry.draft.key === setKey(saved.id))?.draft;
    const pending = drafts.current.find(entry => entry.draft.pendingSetId === saved.id)?.draft;
    const next = savedWorkspace(saved, previous);
    if (pending && sameInputs(pending.plan, saved.plan)) forget(pending);
    if (previous && !next.dirty) forget(previous);
    show(next);
  }, [forget, show]);

  useEffect(() => {
    if (!repository) return;
    let active = true;
    setLoading(true);
    setError(null);
    repository.latest().then(saved => {
      if (!active) return;
      if (saved) {
        showSaved(saved);
      } else {
        const draft = drafts.current.find(entry => entry.draft.setId === null)?.draft;
        if (draft) show({ draft, saved: null, dirty: true, conflict: false });
      }
    }).catch(() => {
      if (active) setError('cloud_restore_error');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      generation.current++;
      running.current = false;
    };
  }, [attempt, repository, show, showSaved]);

  useEffect(() => {
    if (!repository) return;
    function refreshDrafts(event: StorageEvent) {
      if (event.key !== null && !event.key.startsWith(scope)) return;
      const inMemory = drafts.current.filter(entry => !entry.stored);
      const onDisk = readDrafts(scope).filter(draft => !inMemory.some(entry => entry.draft.key === draft.key));
      updateEntries([...inMemory, ...onDisk.map(draft => ({ draft, stored: true }))].sort(
        (left, right) => right.draft.updatedAt - left.draft.updatedAt,
      ));
    }
    window.addEventListener('storage', refreshDrafts);
    return () => window.removeEventListener('storage', refreshDrafts);
  }, [repository, scope, updateEntries]);

  async function perform<T>(operation: () => Promise<T>, done: (result: T) => void, conflicted?: () => void) {
    if (loading || running.current) return false;
    const account = generation.current;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await operation();
      if (account !== generation.current) return false;
      done(result);
      setListVersion(version => version + 1);
      return true;
    } catch (failure) {
      if (account !== generation.current) return false;
      if (wasChangedRemotely(failure) && conflicted) conflicted();
      else setError('cloud_error');
      return false;
    } finally {
      if (account === generation.current) {
        running.current = false;
        setBusy(false);
      }
    }
  }

  function update(plan: FinancialPlan) {
    if (loading || running.current) return;
    const active = current.current;
    if (active.draft.plan.planName === plan.planName && sameInputs(active.draft.plan, plan)) return;
    const dirty = !active.saved || !sameInputs(active.saved.plan, plan);
    if (!dirty && active.saved) {
      if (active.dirty) forget(active.draft);
      show(savedWorkspace(active.saved));
      return;
    }
    show({ ...active, draft: remember({ ...active.draft, plan }), dirty });
  }

  function createDraft(plan?: FinancialPlan) {
    if (loading || running.current) return;
    setError(null);
    const next = newWorkspace(plan);
    show(plan ? { ...next, dirty: true, draft: remember(next.draft) } : next);
  }

  async function open(id: string, draft?: SetDraft) {
    if (!repository) return false;
    const local = drafts.current.find(entry => entry.draft.key === setKey(id))?.draft ?? draft;
    const missing = local ? () => show({ draft: local, saved: null, dirty: true, conflict: true }) : undefined;
    const success = await perform(() => repository.open(id), showSaved, missing);
    return success || Boolean(local && current.current.draft.stamp === local.stamp && current.current.conflict);
  }

  function resume(draft: SetDraft) {
    if (loading || running.current) return;
    setError(null);
    show({ draft, saved: null, dirty: true, conflict: Boolean(draft.setId) });
    if (draft.setId) void open(draft.setId, draft);
  }

  async function save() {
    if (!repository) return false;
    const active = current.current;
    const { setId, baseRevision, plan } = active.draft;
    if (!setId || baseRevision === null || !active.dirty || active.conflict) return false;
    return perform(() => repository.save(setId, baseRevision, plan), saved => {
      forget(active.draft);
      show(savedWorkspace(saved));
    }, () => show({ ...active, conflict: true }));
  }

  async function saveNew(name: string) {
    if (!repository || loading || running.current) return false;
    const active = current.current;
    const id = active.draft.pendingSetId ?? repository.newId();
    const staged = remember({ ...active.draft, pendingSetId: id });
    show({ ...active, draft: staged, dirty: true });
    return perform(() => repository.create(id, name, staged.plan), saved => {
      if (!sameInputs(staged.plan, saved.plan)) {
        const { pendingSetId, ...draft } = staged;
        show({ ...active, draft: remember(draft), dirty: true, conflict: true });
        return;
      }
      forget(staged);
      showSaved(saved);
    });
  }

  async function rename(id: string, name: string) {
    if (!repository) return false;
    return perform(() => repository.rename(id, name), () => {
      const entry = drafts.current.find(candidate => candidate.draft.key === setKey(id));
      const matching = entry && remember({ ...entry.draft, plan: { ...entry.draft.plan, planName: name } });
      const active = current.current;
      if (active.saved?.id !== id) return;
      const saved = { ...active.saved, plan: { ...active.saved.plan, planName: name } };
      const plan = { ...active.draft.plan, planName: name };
      show({ ...active, saved, draft: entry?.draft.stamp === active.draft.stamp && matching ? matching : { ...active.draft, plan } });
    });
  }

  async function deleteSet(id: string) {
    if (!repository) return false;
    const selected = current.current.draft.setId === id;
    const local = drafts.current.find(entry => entry.draft.key === setKey(id))?.draft;
    return perform(async () => {
      await repository.delete(id);
      if (!selected) return { saved: null, failed: false };
      try {
        return { saved: await repository.latest(), failed: false };
      } catch {
        return { saved: null, failed: true };
      }
    }, ({ saved, failed }) => {
      if (local) forget(local);
      if (selected && saved) showSaved(saved);
      else if (selected) show(newWorkspace());
      if (failed) setError('cloud_restore_error');
    });
  }

  async function discard(draft: SetDraft) {
    if (!repository || loading || running.current) return false;
    if (current.current.draft.key !== draft.key) return forget(draft);
    if (draft.setId) {
      const id = draft.setId;
      const reset = () => {
        if (forget(draft)) show(newWorkspace());
      };
      const opened = await perform(() => repository.open(id), saved => {
        if (forget(draft)) show(savedWorkspace(saved));
      }, reset);
      return opened || current.current.draft.key !== draft.key;
    }
    if (!forget(draft)) return false;
    show(newWorkspace());
    return true;
  }

  return {
    workspace, entries, loading, busy, error, listVersion, update, createDraft, open, resume,
    save, saveNew, rename, deleteSet, discard,
    retry: () => setAttempt(value => value + 1),
    page: repository?.page,
    getPlan: () => current.current.draft.plan,
    hasUnstored,
    clearError: () => setError(null),
  };
}

export type SavedSetControls = ReturnType<typeof useSavedSets>;
