import { useEffect, useId, useRef, useState } from 'react';
import type { SavedSetControls } from '../hooks/useSavedSets';
import type { SavedSet, SavedSetCursor } from '../services/savedSets';
import type { FinancialPlan, Language } from '../types';
import { t } from '../utils/locales';
import type { SetDraft } from '../utils/savedSetDrafts';

type Dialog = { kind: 'list' } | { kind: 'new' } | { kind: 'rename'; set: SavedSet } |
  { kind: 'delete'; set: SavedSet } | { kind: 'discard'; draft: SetDraft };

const button = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const primary = 'rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50';
const danger = 'rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50';

export function SavedSetsPanel({ controls, guestPlan, lang, prepare }: {
  controls: SavedSetControls;
  guestPlan?: FinancialPlan;
  lang: Language;
  prepare: () => void;
}) {
  const [mode, setMode] = useState<Dialog | null>(null);
  const [name, setName] = useState('');
  const [sets, setSets] = useState<SavedSet[]>([]);
  const [cursor, setCursor] = useState<SavedSetCursor>();
  const [listing, setListing] = useState(false);
  const [listError, setListError] = useState(false);
  const [listRetry, setListRetry] = useState(0);
  const modal = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const nameId = useId();
  const { workspace, entries, loading, busy, error, page, listVersion } = controls;
  const pickerOpen = mode?.kind === 'list';
  const blocked = loading || busy;
  const nameForm = mode?.kind === 'new' || mode?.kind === 'rename';
  const confirmation = mode?.kind === 'delete' || mode?.kind === 'discard';
  const label = (key: Parameters<typeof t>[0]) => t(key, lang);

  useEffect(() => {
    if (mode && !modal.current?.open) modal.current?.showModal();
    if (!mode && modal.current?.open) modal.current.close();
  }, [mode]);

  useEffect(() => {
    if (!pickerOpen || !page) return;
    let active = true;
    setListing(true);
    setListError(false);
    setSets([]);
    setCursor(undefined);
    page().then(result => {
      if (!active) return;
      setSets(result.items);
      setCursor(result.next);
    }).catch(() => {
      if (active) setListError(true);
    }).finally(() => {
      if (active) setListing(false);
    });
    return () => { active = false; };
  }, [page, pickerOpen, listRetry, listVersion]);

  async function loadMore() {
    if (!page || !cursor || listing) return;
    setListing(true);
    setListError(false);
    try {
      const result = await page(cursor);
      setSets(previous => [...previous, ...result.items.filter(set => !previous.some(item => item.id === set.id))]);
      setCursor(result.next);
    } catch {
      setListError(true);
    } finally {
      setListing(false);
    }
  }

  function close() {
    setMode(null);
  }

  function nameNewSet() {
    prepare();
    setName(workspace.draft.plan.planName);
    setMode({ kind: 'new' });
  }

  function startDraft(plan?: FinancialPlan) {
    prepare();
    controls.createDraft(plan);
    close();
  }

  const activeEntry = entries.find(entry => entry.draft.stamp === workspace.draft.stamp);
  const deleteHasDraft = mode?.kind === 'delete' && entries.some(entry => entry.draft.setId === mode.set.id);
  const dialogError = error && !pickerOpen ? label(error) : null;
  const title = mode?.kind === 'rename' ? label('set_rename') : mode?.kind === 'delete' ? label('set_delete') :
    mode?.kind === 'discard' ? label('draft_discard') : nameForm ? label('set_save_new') : label('saved_sets');

  return (
    <section className="space-y-2" aria-label={label('saved_sets')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-semibold text-slate-800">{workspace.draft.plan.planName.trim() || label('set_untitled')}</p>
          <p className="text-sm" role="status">
            {loading ? <span className="text-slate-600">{label('set_opening')}</span> : workspace.dirty && (
              <span className="font-medium text-amber-800">
                {label('unsaved_changes')}{activeEntry && !activeEntry.stored ? ` · ${label('draft_storage_failed')}` : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={blocked} onClick={() => {
            prepare();
            setMode({ kind: 'list' });
          }}>
            {label('saved_sets')}{entries.length ? ` (${entries.length})` : ''}
          </button>
          <button type="button" className={primary} disabled={blocked || workspace.conflict} onClick={() => {
            if (!workspace.saved) nameNewSet();
            else {
              prepare();
              void controls.save();
            }
          }}>{label('set_save')}</button>
          <button type="button" className={button} disabled={blocked} onClick={nameNewSet}>{label('set_save_new')}</button>
        </div>
      </div>
      {workspace.conflict && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900" role="alert">
          <span>{label('set_conflict')}</span>
          <button type="button" className={button} disabled={blocked} onClick={() => {
            prepare();
            setMode({ kind: 'discard', draft: workspace.draft });
          }}>{label('draft_discard')}</button>
        </div>
      )}
      {error && !mode && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-red-700" role="alert">
          <span>{label(error)}</span>
          {error === 'cloud_restore_error' && <button type="button" className={button} onClick={controls.retry}>{label('retry')}</button>}
        </div>
      )}
      <dialog ref={modal} aria-labelledby={titleId}
        onClose={close} onCancel={event => { if (busy) event.preventDefault(); }}
        className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl backdrop:bg-slate-900/50 sm:p-6">
        {mode && (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
              <button type="button" className={button} disabled={busy} onClick={close}>{label('close')}</button>
            </div>
            {pickerOpen && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={primary} disabled={busy} onClick={() => startDraft()}>{label('set_new')}</button>
                  {guestPlan && <button type="button" className={button} disabled={busy} onClick={() => startDraft(guestPlan)}>{label('use_browser_plan')}</button>}
                </div>
                {listing && <p className="text-sm text-slate-600" role="status">{label('set_loading_list')}</p>}
                {listError && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-red-700" role="alert">
                    {label('cloud_error')}
                    <button type="button" className={button} onClick={() => setListRetry(value => value + 1)}>{label('retry')}</button>
                  </div>
                )}
                {error && <p role="alert" className="text-sm text-red-700">{label(error)}</p>}
                {!listing && !listError && sets.length === 0 && <p className="text-sm text-slate-600">{label('set_empty')}</p>}
                {sets.length > 0 && (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-3">
                    {sets.map(set => (
                      <li key={set.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <div className="min-w-0 break-words">
                          <div className="font-medium">{set.plan.planName}</div>
                          <div className="text-xs text-slate-600">
                            {workspace.saved?.id === set.id && label('set_current')}
                            {workspace.saved?.id === set.id && entries.some(entry => entry.draft.setId === set.id) ? ' · ' : ''}
                            {entries.some(entry => entry.draft.setId === set.id) && label('unsaved_changes')}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <button type="button" className={button} disabled={busy} onClick={async () => {
                            prepare();
                            if (await controls.open(set.id)) close();
                          }}>{label('set_open')}</button>
                          <button type="button" className={button} disabled={busy} onClick={() => {
                            controls.clearError();
                            setName(set.plan.planName);
                            setMode({ kind: 'rename', set });
                          }}>{label('set_rename')}</button>
                          <button type="button" className={button} disabled={busy} onClick={() => {
                            controls.clearError();
                            setMode({ kind: 'delete', set });
                          }}>{label('set_delete')}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {cursor && <button type="button" className={button} disabled={listing || busy} onClick={() => void loadMore()}>{label('load_more')}</button>}
                {entries.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold">{label('browser_drafts')}</h3>
                    <ul className="divide-y divide-slate-100 rounded-lg border border-amber-100 bg-amber-50/50 px-3">
                      {entries.map(({ draft, stored }) => (
                        <li key={draft.key} className="flex flex-wrap items-center justify-between gap-2 py-3">
                          <div className="min-w-0 break-words">
                            <span>{draft.plan.planName.trim() || label('set_untitled')}</span>
                            {!stored && <div className="text-xs text-amber-800">{label('draft_storage_failed')}</div>}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button type="button" className={button} disabled={busy} onClick={() => {
                              prepare();
                              controls.resume(draft);
                              close();
                            }}>{label('draft_resume')}</button>
                            <button type="button" className={button} disabled={busy} onClick={() => {
                              controls.clearError();
                              setMode({ kind: 'discard', draft });
                            }}>{label('draft_discard')}</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {nameForm && (
              <form className="space-y-3" onSubmit={async event => {
                event.preventDefault();
                const trimmed = name.trim();
                if (!trimmed || busy) return;
                const success = mode.kind === 'rename'
                  ? await controls.rename(mode.set.id, trimmed)
                  : await controls.saveNew(trimmed);
                if (success) mode.kind === 'rename' ? setMode({ kind: 'list' }) : close();
              }}>
                <label htmlFor={nameId} className="block text-sm font-medium">{label('set_name')}</label>
                <input id={nameId} className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={name} autoFocus required disabled={busy} onChange={event => setName(event.target.value)} />
                {dialogError && <p className="text-sm text-red-700" role="alert">{dialogError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" className={button} disabled={busy} onClick={close}>{label('cancel')}</button>
                  <button type="submit" className={primary} disabled={busy || !name.trim()}>{label('set_save')}</button>
                </div>
              </form>
            )}
            {confirmation && (
              <div className="space-y-3">
                <p>{mode.kind === 'delete'
                  ? label('set_delete_confirm').replace('{name}', () => mode.set.plan.planName)
                  : label('draft_discard_confirm').replace('{name}', () => mode.draft.plan.planName || label('set_untitled'))}</p>
                {deleteHasDraft && <p className="text-sm text-slate-600">{label('set_delete_draft')}</p>}
                {dialogError && <p className="text-sm text-red-700" role="alert">{dialogError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" className={button} disabled={busy} onClick={close}>{label('cancel')}</button>
                  <button type="button" className={danger} disabled={busy} onClick={async () => {
                    prepare();
                    const success = mode.kind === 'delete'
                      ? await controls.deleteSet(mode.set.id)
                      : await controls.discard(mode.draft);
                    if (success) setMode({ kind: 'list' });
                  }}>{mode.kind === 'delete' ? label('set_delete') : label('draft_discard')}</button>
                </div>
              </div>
            )}
          </>
        )}
      </dialog>
    </section>
  );
}
