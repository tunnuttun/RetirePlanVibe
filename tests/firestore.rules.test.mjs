import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc,
  serverTimestamp, Timestamp, updateDoc,
} from 'firebase/firestore';

const projectId = 'demo-retireplan-vibe';
let environment;
const inputs = {
  currentAge: 30, retirementAge: 60, maxAge: 90, currency: 'THB',
  inflation: [], assets: [], debts: [], incomes: [], expenses: [], debtPayments: [],
};
const setData = () => ({ name: 'Retirement', inputs, revision: 1, lastOpenedAt: serverTimestamp() });
const setRef = (db, owner = 'owner', id = 'retirement') => doc(db, 'users', owner, 'savedSets', id);

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
beforeEach(async () => environment.clearFirestore());
after(async () => environment?.cleanup());

test('owner can create, list, open, rename, save, and delete a set', async () => {
  const db = environment.authenticatedContext('owner').firestore();
  const reference = setRef(db);
  await assertSucceeds(setDoc(reference, setData()));
  const savedSets = await assertSucceeds(getDocs(query(collection(db, 'users', 'owner', 'savedSets'),
    orderBy('lastOpenedAt', 'desc'), limit(25))));
  assert.equal(savedSets.size, 1);
  await assertSucceeds(updateDoc(reference, { lastOpenedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(reference, { name: 'แผนเกษียณ' }));
  await assertSucceeds(updateDoc(reference, { inputs: { ...inputs, retirementAge: 62 }, revision: 2 }));
  const saved = await assertSucceeds(getDoc(reference));
  assert.equal(saved.data().name, 'แผนเกษียณ');
  assert.equal(saved.data().revision, 2);
  await assertSucceeds(deleteDoc(reference));
});

test('guest and another account cannot read, list, create, modify, or delete the owner’s sets', async () => {
  const owner = environment.authenticatedContext('owner').firestore();
  await assertSucceeds(setDoc(setRef(owner), setData()));
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext('other')]) {
    const db = context.firestore();
    await assertFails(getDoc(setRef(db)));
    await assertFails(getDocs(collection(db, 'users', 'owner', 'savedSets')));
    await assertFails(setDoc(setRef(db, 'owner', 'new'), setData()));
    await assertFails(updateDoc(setRef(db), { name: 'Other account' }));
    await assertFails(deleteDoc(setRef(db)));
  }
  await assertFails(setDoc(doc(owner, 'users', 'owner'), { private: 'data' }));
});

test('rejects invalid fields, client-selected recency, and incorrect revisions', async () => {
  const db = environment.authenticatedContext('owner').firestore();
  const reference = setRef(db);
  await assertFails(setDoc(reference, { ...setData(), extra: true }));
  await assertFails(setDoc(reference, { ...setData(), revision: 2 }));
  await assertFails(setDoc(reference, { ...setData(), name: '   ' }));
  await assertFails(setDoc(reference, { ...setData(), lastOpenedAt: Timestamp.fromMillis(0) }));
  await assertFails(setDoc(reference, { ...setData(), inputs: { ...inputs, maxAge: 20 } }));
  await assertFails(setDoc(reference, { ...setData(), inputs: { ...inputs, assets: {} } }));
  await assertSucceeds(setDoc(reference, setData()));
  await assertFails(updateDoc(reference, { name: '' }));
  await assertFails(updateDoc(reference, { 'inputs.retirementAge': 65 }));
  await assertFails(updateDoc(reference, { 'inputs.retirementAge': 65, revision: 4 }));
  await assertFails(updateDoc(reference, { lastOpenedAt: Timestamp.fromMillis(0) }));
});
