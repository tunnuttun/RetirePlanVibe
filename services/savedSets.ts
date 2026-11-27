import {
  collection, deleteDoc, doc, getDocs, limit, orderBy, query, runTransaction,
  serverTimestamp, startAfter, updateDoc,
  type DocumentSnapshot, type Firestore, type QueryDocumentSnapshot,
} from 'firebase/firestore/lite';
import type { FinancialPlan } from '../types';
import { planInputs, readPlan } from '../utils/plan';

export type SavedSet = { id: string; revision: number; plan: FinancialPlan };
export type SavedSetCursor = QueryDocumentSnapshot;
const pageSize = 25;

class SavedSetConflict extends Error {
  constructor() {
    super('The saved set has changed or been deleted');
    this.name = 'SavedSetConflict';
  }
}

function decode(snapshot: DocumentSnapshot): SavedSet {
  const data = snapshot.data();
  if (!data || typeof data.name !== 'string' || !data.name.trim() ||
    !Number.isSafeInteger(data.revision) || data.revision < 1 ||
    !data.inputs || typeof data.inputs !== 'object' || Array.isArray(data.inputs)) {
    throw new Error('Invalid saved set');
  }
  return {
    id: snapshot.id,
    revision: data.revision,
    plan: readPlan({ ...data.inputs, planName: data.name }).plan,
  };
}

export function savedSetsFor(db: Firestore, uid: string) {
  const sets = collection(db, 'users', uid, 'savedSets');
  const recentlyOpened = orderBy('lastOpenedAt', 'desc');

  return {
    newId: () => doc(sets).id,
    async latest() {
      const results = await getDocs(query(sets, recentlyOpened, limit(1)));
      return results.docs[0] ? decode(results.docs[0]) : null;
    },
    async page(cursor?: SavedSetCursor) {
      const constraints = cursor ? [recentlyOpened, startAfter(cursor)] : [recentlyOpened];
      const results = await getDocs(query(sets, ...constraints, limit(pageSize)));
      return {
        items: results.docs.map(decode),
        next: results.size === pageSize ? results.docs[pageSize - 1] : undefined,
      };
    },
    async open(id: string) {
      const reference = doc(sets, id);
      return runTransaction(db, async transaction => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) throw new SavedSetConflict();
        const saved = decode(snapshot);
        transaction.update(reference, { lastOpenedAt: serverTimestamp() });
        return saved;
      });
    },
    async create(id: string, name: string, plan: FinancialPlan) {
      const reference = doc(sets, id);
      const inputs = planInputs(plan);
      return runTransaction(db, async transaction => {
        const snapshot = await transaction.get(reference);
        if (snapshot.exists()) return decode(snapshot);
        transaction.set(reference, { name, inputs, revision: 1, lastOpenedAt: serverTimestamp() });
        return { id, revision: 1, plan: { ...inputs, planName: name } };
      });
    },
    async save(id: string, baseRevision: number, plan: FinancialPlan) {
      const reference = doc(sets, id);
      const inputs = planInputs(plan);
      return runTransaction(db, async transaction => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) throw new SavedSetConflict();
        const saved = decode(snapshot);
        if (JSON.stringify(planInputs(saved.plan)) === JSON.stringify(inputs)) return saved;
        if (saved.revision !== baseRevision) throw new SavedSetConflict();
        const revision = saved.revision + 1;
        transaction.update(reference, { inputs, revision });
        return { id, revision, plan: { ...inputs, planName: saved.plan.planName } };
      });
    },
    rename: (id: string, name: string) => updateDoc(doc(sets, id), { name }),
    delete: (id: string) => deleteDoc(doc(sets, id)),
  };
}

export type SavedSetsRepository = ReturnType<typeof savedSetsFor>;
