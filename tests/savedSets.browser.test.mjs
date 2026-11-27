import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, devices } from 'playwright';

const url = 'http://127.0.0.1:5178/';
const email = 'saved-sets@example.com';
const dialog = page => page.getByRole('dialog');
const button = (root, name) => root.getByRole('button', { name, exact: true });
const age = page => page.getByLabel('Current Age', { exact: true });
const picker = page => page.getByRole('button', { name: /^Saved Sets( \(\d+\))?$/ });
const savedRow = (page, name) => dialog(page).getByRole('listitem').filter({ hasText: name })
  .filter({ has: button(page, 'Open') });

async function ageIs(page, number) {
  await age(page).waitFor();
  await page.waitForFunction(value =>
    [...document.querySelectorAll('[data-plan-inputs] input')].some(input =>
      input.labels?.[0]?.textContent === 'Current Age' && input.value === value), String(number));
  assert.equal(await age(page).inputValue(), String(number));
}

async function goToInputs(page) {
  await button(page, 'Inputs').click();
}

async function editAge(page, value) {
  await age(page).fill(String(value));
  await age(page).blur();
}

async function signIn(page, address) {
  const opening = page.waitForEvent('popup');
  await button(page, 'Sign in with Google').click();
  const popup = await opening;
  await popup.getByText(/Sign-in with Google.com/).waitFor();
  const account = popup.locator('.js-reuse-account').filter({ hasText: address });
  if (await account.count()) {
    await account.click();
  } else {
    await button(popup, 'Add new account').click();
    await popup.locator('#email-input').fill(address);
    await popup.locator('#sign-in').click();
  }
  await button(page, 'Sign out').waitFor();
  await picker(page).waitFor();
}

async function saveAs(page, title) {
  await button(page, 'Save as new').click();
  await dialog(page).getByLabel('Set name').fill(title);
  await button(dialog(page), 'Save').click();
  await dialog(page).waitFor({ state: 'hidden' });
  await page.getByText(title, { exact: true }).waitFor();
}

async function selectSet(page, title) {
  await picker(page).click();
  await button(savedRow(page, title), 'Open').click();
  await dialog(page).waitFor({ state: 'hidden' });
}

async function deleteSet(page, title) {
  await picker(page).click();
  await button(savedRow(page, title), 'Delete').click();
  await dialog(page).getByText(`Delete “${title}” from your account?`).waitFor();
  await button(dialog(page), 'Delete').click();
  await dialog(page).getByRole('heading', { name: 'Saved Sets' }).waitFor();
  await button(dialog(page), 'Close').click();
}

let vite;
let browser;

before(async () => {
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5178', '--strictPort'], {
    env: { ...process.env, VITE_FIREBASE_USE_EMULATORS: 'true' },
  });
  let startup = '';
  vite.stdout.on('data', message => { startup += message; });
  vite.stderr.on('data', message => { startup += message; });

  for (let attempt = 0; attempt < 40; attempt++) {
    if (vite.exitCode !== null) throw new Error(startup);
    const response = await fetch(url).catch(() => null);
    if (response?.ok) {
      browser = await chromium.launch();
      return;
    }
    await delay(250);
  }
  throw new Error(`Vite did not start. ${startup}`);
});

after(async () => {
  await browser?.close();
  vite?.kill();
});

test('guest inputs and saved sets survive switching, reloads and conflicting browser sessions', async () => {
  const failed = [];
  const firstContext = await browser.newContext({ acceptDownloads: true });
  const first = await firstContext.newPage();
  first.on('pageerror', error => failed.push(error.message));
  await first.goto(url);
  await goToInputs(first);
  await first.getByLabel('Plan Name (Filename)', { exact: true }).fill('Guest browser plan');
  await editAge(first, 42);
  await first.reload();
  await goToInputs(first);
  await ageIs(first, 42);
  assert.equal(await first.getByLabel('Plan Name (Filename)', { exact: true }).inputValue(), 'Guest browser plan');
  await signIn(first, email);
  await ageIs(first, 30);
  await picker(first).click();
  await button(dialog(first), 'Use browser plan').click();
  await ageIs(first, 42);
  await first.getByText('Unsaved changes', { exact: true }).waitFor();
  await saveAs(first, 'Plan Alpha');

  await editAge(first, 45);
  await picker(first).click();
  await button(dialog(first), 'New').click();
  await ageIs(first, 30);
  await editAge(first, 55);
  await saveAs(first, 'Plan Beta');
  await selectSet(first, 'Plan Alpha');
  await ageIs(first, 45);
  await first.reload();
  await goToInputs(first);
  await ageIs(first, 45);
  await first.getByText('Unsaved changes', { exact: true }).waitFor();

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  second.on('pageerror', error => failed.push(error.message));
  await second.goto(url);
  await signIn(second, email);
  await goToInputs(second);
  await ageIs(second, 42);
  await selectSet(second, 'Plan Beta');
  await ageIs(second, 55);
  await first.reload();
  await goToInputs(first);
  await ageIs(first, 55);
  await picker(first).click();
  await dialog(first).getByRole('heading', { name: 'Drafts on this browser' }).waitFor();
  await button(dialog(first), 'Close').click();

  await selectSet(second, 'Plan Alpha');
  await age(second).fill('60');
  // Save with a valid age still focused so blur-committed values are included.
  await button(second, 'Save').click();
  await second.getByText('Unsaved changes', { exact: true }).waitFor({ state: 'hidden' });
  await second.reload();
  await goToInputs(second);
  await ageIs(second, 60);
  await selectSet(first, 'Plan Alpha');
  await ageIs(first, 45);
  await first.getByText(/This set changed or was deleted elsewhere/).waitFor();
  assert.equal(await button(first, 'Save').isDisabled(), true);

  await picker(first).click();
  await button(savedRow(first, 'Plan Alpha'), 'Rename').click();
  await dialog(first).getByLabel('Set name').fill('Renamed Alpha');
  await button(dialog(first), 'Save').click();
  await savedRow(first, 'Renamed Alpha').waitFor();
  await button(dialog(first), 'Close').click();
  const downloading = first.waitForEvent('download');
  await first.getByRole('button', { name: 'Export', exact: true }).first().click();
  const exported = await downloading;
  assert.equal(exported.suggestedFilename(), 'Renamed Alpha.json');
  const json = JSON.parse(await readFile(await exported.path(), 'utf8'));
  assert.equal(json.currentAge, 45);
  assert.equal(json.planName, 'Renamed Alpha');
  await saveAs(first, 'Local Draft Copy');

  const thirdContext = await browser.newContext();
  const third = await thirdContext.newPage();
  await third.goto(url);
  await signIn(third, 'other-account@example.com');
  await picker(third).click();
  await dialog(third).getByText('No saved sets yet.').waitFor();
  await thirdContext.close();

  await deleteSet(first, 'Local Draft Copy');
  await ageIs(first, 60);
  await deleteSet(first, 'Renamed Alpha');
  await ageIs(first, 55);
  await deleteSet(first, 'Plan Beta');
  await ageIs(first, 30);

  first.once('dialog', prompt => prompt.accept());
  await first.locator('input[type=file]').setInputFiles({
    name: 'imported.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...json, planName: 'Imported draft' })),
  });
  await first.getByText('Imported draft', { exact: true }).waitFor();
  await ageIs(first, 45);
  await first.getByText('Unsaved changes', { exact: true }).waitFor();
  await button(first, 'Sign out').click();
  await ageIs(first, 42);
  assert.equal(await first.getByLabel('Plan Name (Filename)', { exact: true }).inputValue(), 'Guest browser plan');
  await signIn(first, email);
  await first.getByText('Imported draft', { exact: true }).waitFor();
  await ageIs(first, 45);
  await button(first, 'TH').click();
  await first.getByText('ยังไม่ได้บันทึกการแก้ไข', { exact: true }).waitFor();
  assert.equal(await first.locator('html').getAttribute('lang'), 'th');
  assert.deepEqual(failed, []);
});

test('mobile layout supports sign-in, saving, and restoring a set', async () => {
  const mobile = await browser.newPage(devices['Pixel 7']);
  await mobile.goto(url);
  await signIn(mobile, 'mobile-account@example.com');
  await goToInputs(mobile);
  await editAge(mobile, 38);
  await saveAs(mobile, 'Mobile plan');
  await mobile.reload();
  await goToInputs(mobile);
  await ageIs(mobile, 38);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
});

test('warns before signing out when browser storage cannot keep a draft', async () => {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('retireplan_drafts_v1:')) throw new DOMException('Storage is full', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
  });
  await page.goto(url);
  await signIn(page, 'storage-full@example.com');
  await goToInputs(page);
  await editAge(page, 37);
  await page.getByText(/Browser storage is unavailable/).waitFor();
  const warning = page.waitForEvent('dialog').then(async prompt => {
    assert.match(prompt.message(), /could not keep your unsaved changes/);
    await prompt.dismiss();
  });
  await button(page, 'Sign out').click();
  await warning;
  await ageIs(page, 37);
  await saveAs(page, 'Saved with browser storage blocked');
  await button(page, 'Sign out').click();
  await button(page, 'Sign in with Google').waitFor();
});
