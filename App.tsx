

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { InputForm } from './components/InputForm';
import { SavedSetsPanel } from './components/SavedSetsPanel';
import { useFirebaseSession, type FirebaseSession } from './hooks/useFirebaseSession';
import { useSavedSets } from './hooks/useSavedSets';
import { FinancialPlan, DEFAULT_PLAN, ViewState, Language } from './types';
import { t } from './utils/locales';
import { readPlan } from './utils/plan';
import { draftScope } from './utils/savedSetDrafts';

// Icons
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>;
const SlidersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;

const PLAN_STORAGE_KEY = 'retireplan_data_v2';

function loadSavedPlan(): FinancialPlan {
  try {
    const savedPlan = localStorage.getItem(PLAN_STORAGE_KEY);
    if (savedPlan) return readPlan(JSON.parse(savedPlan)).plan;
  } catch {
    // The planner can still run when storage is blocked or its contents are invalid.
  }
  return DEFAULT_PLAN;
}

function blurPlanInput() {
  const focused = document.activeElement;
  if (focused instanceof HTMLElement && focused.closest('[data-plan-inputs]')) focused.blur();
}

function Planner({ guestPlan, changeGuestPlan, getGuestPlan, session, currentView, setCurrentView, lang, setLang }: {
  guestPlan: FinancialPlan;
  changeGuestPlan: (plan: FinancialPlan) => void;
  getGuestPlan: () => FinancialPlan;
  session: FirebaseSession;
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  lang: Language;
  setLang: (language: Language) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const importRequest = useRef(0);
  const uid = session.user?.uid;
  const { client } = session;
  const repository = useMemo(() => client && uid ? client.savedSetsFor(client.firestore, uid) : null, [client, uid]);
  const signedIn = repository !== null;
  const cloud = useSavedSets(repository, client && uid ? draftScope(client.projectId, uid) : '');
  const plan = signedIn ? cloud.workspace.draft.plan : guestPlan;
  const setPlan = signedIn ? cloud.update : changeGuestPlan;
  const changingSet = signedIn && (cloud.loading || cloud.busy);
  const hasUnstored = cloud.hasUnstored;

  useEffect(() => () => { importRequest.current++; }, []);

  useEffect(() => {
    if (!signedIn) return;
    function protectDraft(event: BeforeUnloadEvent) {
      blurPlanInput();
      if (!hasUnstored()) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', protectDraft);
    window.addEventListener('pagehide', blurPlanInput);
    return () => {
      window.removeEventListener('beforeunload', protectDraft);
      window.removeEventListener('pagehide', blurPlanInput);
    };
  }, [hasUnstored, signedIn]);

  function prepareWorkspace() {
    importRequest.current++;
    blurPlanInput();
  }

  function signOut() {
    prepareWorkspace();
    if (hasUnstored() && !window.confirm(t('draft_leave_confirm', lang))) return;
    void session.changeAuth('sign-out');
  }

  const handleExport = () => {
    blurPlanInput();
    const snapshot = signedIn ? cloud.getPlan() : getGuestPlan();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot));
    const name = snapshot.planName.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/, '');
    const filename = name.toLowerCase().endsWith('.json') ? name : `${name || 'financial_plan'}.json`;
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    event.currentTarget.value = '';
    prepareWorkspace();
    const request = ++importRequest.current;

    try {
      const fallbackName = file.name.replace(/\.json$/i, '').trim() || DEFAULT_PLAN.planName;
      const imported = readPlan(JSON.parse(await file.text()), fallbackName);
      if (request !== importRequest.current) return;
      if (signedIn) cloud.createDraft(imported.plan);
      else changeGuestPlan(imported.plan);
      alert(imported.warnings.length
        ? `${t('import_warning', lang)}\n\n${imported.warnings.join(', ')}`
        : t('import_success', lang));
    } catch {
      if (request === importRequest.current) alert(t('import_error', lang));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <input ref={fileInput} type="file" accept=".json,application/json" onChange={handleImport} hidden />
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              R
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">{t('app_title', lang)}</h1>
          </div>

          <div className="flex items-center gap-4">
             {/* Language Toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => setLang('en')}
                className={`px-2 py-1 text-xs font-bold rounded ${lang === 'en' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLang('th')}
                className={`px-2 py-1 text-xs font-bold rounded ${lang === 'th' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
              >
                TH
              </button>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={changingSet}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                <DownloadIcon /> {t('export', lang)}
              </button>
              <button disabled={changingSet} onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
                <UploadIcon /> {t('import', lang)}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden">
        {session.enabled && (
          <div className="mx-auto mb-4 max-w-6xl rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0 break-all text-slate-600">
                {session.checking && <span role="status">{t('auth_checking', lang)}</span>}
                {signedIn && <span>{session.user?.email || session.user?.displayName}</span>}
                {session.error && <span role="alert" className="text-red-700">{t(session.error, lang)}</span>}
              </div>
              {signedIn ? (
                <button type="button" onClick={signOut} disabled={session.working || changingSet}
                  className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                  {t('sign_out', lang)}
                </button>
              ) : session.client && !session.checking && (
                <button type="button" onClick={() => void session.changeAuth('sign-in')} disabled={session.working}
                  className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                  {t('sign_in_google', lang)}
                </button>
              )}
            </div>
            {signedIn && (
              <SavedSetsPanel controls={cloud} lang={lang} prepare={prepareWorkspace}
                guestPlan={JSON.stringify(guestPlan) !== JSON.stringify(DEFAULT_PLAN) ? guestPlan : undefined} />
            )}
          </div>
        )}
        {!cloud.loading && currentView === ViewState.DASHBOARD && <Dashboard plan={plan} lang={lang} />}
        {!cloud.loading && currentView === ViewState.INPUTS && (
          <fieldset data-plan-inputs disabled={changingSet} className="m-0 min-w-0 border-0 p-0">
            <InputForm key={signedIn ? cloud.workspace.draft.key : 'guest'} plan={plan} onChange={setPlan}
              lang={lang} savedName={signedIn && Boolean(cloud.workspace.saved)} />
          </fieldset>
        )}
      </main>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] z-30">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <button 
            onClick={() => setCurrentView(ViewState.DASHBOARD)}
            className={`flex flex-col items-center p-2 rounded-xl flex-1 transition-all ${
              currentView === ViewState.DASHBOARD ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ChartIcon />
            <span className="text-xs font-medium mt-1">{t('dashboard', lang)}</span>
          </button>
          
          <button 
            onClick={() => setCurrentView(ViewState.INPUTS)}
            className={`flex flex-col items-center p-2 rounded-xl flex-1 transition-all ${
              currentView === ViewState.INPUTS ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <SlidersIcon />
            <span className="text-xs font-medium mt-1">{t('inputs', lang)}</span>
          </button>
        </div>
        
         <div className="md:hidden border-t border-slate-100 flex justify-center py-2 bg-slate-50 gap-4 text-xs text-slate-500">
           <button disabled={changingSet} onClick={handleExport} className="hover:text-blue-600">{t('export', lang)}</button>
           <span className="text-slate-300">|</span>
           <button disabled={changingSet} onClick={() => fileInput.current?.click()} className="hover:text-blue-600">
             {t('import', lang)}
           </button>
        </div>
      </nav>

      <div className="h-24 md:h-0" />
    </div>
  );
}

function App() {
  const [guestPlan, setGuestPlan] = useState(loadSavedPlan);
  const guest = useRef(guestPlan);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [lang, setLang] = useState<Language>('en');
  const session = useFirebaseSession();

  useEffect(() => {
    try {
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(guestPlan));
    } catch {
      // Explicit downloads are still available when automatic saves are blocked.
    }
  }, [guestPlan]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <Planner key={session.user ? `account:${session.user.uid}` : 'guest'} session={session} guestPlan={guestPlan}
      changeGuestPlan={plan => { guest.current = plan; setGuestPlan(plan); }} getGuestPlan={() => guest.current}
      currentView={currentView} setCurrentView={setCurrentView} lang={lang} setLang={setLang} />
  );
}

export default App;
