import { expect, test, type Page } from '@playwright/test';
import { setupLibraryApiMocks } from './helpers/mockApi';

const goToSection = async (page: Page, section: string) => {
  await page.getByTestId(`app-nav-${section}`).click();
  await expect(page.getByTestId('entity-library-workspace')).toBeVisible();
};

const openWorkspaceMenu = async (page: Page) => {
  await page.getByTestId('entity-library-workspace').click({ button: 'right', position: { x: 24, y: 24 } });
  await expect(page.getByTestId('entity-library-context-menu')).toBeVisible();
};

const openItemMenu = async (page: Page, itemId: string) => {
  await page.getByTestId(`entity-library-item-${itemId}`).click({ button: 'right' });
  await expect(page.getByTestId('entity-library-context-menu')).toBeVisible();
};

const openGroupMenu = async (page: Page, groupId: string) => {
  await page.getByTestId(`entity-library-group-${groupId}`).click({ button: 'right' });
  await expect(page.getByTestId('entity-library-context-menu')).toBeVisible();
};

const action = (page: Page, id: string) => page.getByTestId(`entity-library-action-${id}`);

test.beforeEach(async ({ page }) => {
  await setupLibraryApiMocks(page);
  page.on('dialog', (dialog) => void dialog.accept());
  await page.goto('/');
  await page.getByTestId('landing-login').click();
  await page.getByTestId('auth-email').fill('e2e@example.test');
  await page.getByTestId('auth-password').fill('Password123!');
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('app-nav-scenarios')).toBeVisible();
});

test('scenarios library supports groups, context actions, move and open', async ({ page }) => {
  await goToSection(page, 'scenarios');

  await expect(page.getByTestId('entity-library-group-201')).toBeVisible();
  await expect(page.getByTestId('entity-library-item-101')).toBeVisible();

  await openWorkspaceMenu(page);
  await action(page, 'create-group').click();
  await expect(page.getByTestId('entity-library-group-900')).toBeVisible();

  await openGroupMenu(page, '201');
  await action(page, 'rename-group').click();
  const renameInput = page.getByTestId('entity-library-group-201').locator('input');
  await expect(renameInput).toBeVisible();
  await renameInput.fill('Renamed Scenario Group');
  await renameInput.press('Enter');
  await expect(page.getByTestId('entity-library-group-201')).toContainText('Renamed Scenario Group');

  await openGroupMenu(page, '900');
  await action(page, 'delete-group').click();
  await expect(page.getByTestId('entity-library-group-900')).toHaveCount(0);

  await openItemMenu(page, '101');
  await action(page, 'cut-scenario').click();
  await expect(page.getByTestId('entity-library-item-101')).toHaveAttribute('data-cut', 'true');

  await openGroupMenu(page, '201');
  await action(page, 'paste-to-group').click();
  await expect(page.getByTestId('entity-library-item-101')).toHaveCount(0);

  await page.getByTestId('entity-library-group-201').dblclick();
  await expect(page.getByTestId('entity-library-item-101')).toBeVisible();
  await expect(page.getByTestId('entity-library-item-102')).toBeVisible();

  await page.getByTestId('entity-library-item-101').dblclick();
  await expect(page.getByTestId('entity-library-workspace')).toHaveCount(0);
});

test('maps library supports central workspace, context menu, keyboard delete and open', async ({ page }) => {
  await goToSection(page, 'maps');

  await expect(page.getByTestId('entity-library-item-301')).toBeVisible();
  await page.getByTestId('entity-library-item-301').click();
  await expect(page.getByTestId('entity-library-item-301')).toHaveAttribute('data-selected', 'true');
  await page.keyboard.press('Delete');
  await expect(page.getByTestId('entity-library-item-301')).toHaveCount(0);

  await openWorkspaceMenu(page);
  await action(page, 'create-map').click();
  await expect(page.getByTestId('entity-library-workspace')).toHaveCount(0);
});

test('characters library supports group navigation, modal open, cut/paste and drag/drop', async ({ page }) => {
  await goToSection(page, 'characters');

  await expect(page.getByTestId('entity-library-group-411')).toBeVisible();
  await expect(page.getByTestId('entity-library-item-401')).toBeVisible();

  await openWorkspaceMenu(page);
  await action(page, 'create-character').click();
  await expect(page.getByTestId('modal')).toBeVisible();
  await page.getByTestId('modal').click({ position: { x: 5, y: 5 } });
  await expect(page.getByTestId('modal')).toHaveCount(0);

  await openItemMenu(page, '401');
  await action(page, 'cut-character').click();
  await openGroupMenu(page, '411');
  await action(page, 'paste-to-group').click();
  await expect(page.getByTestId('entity-library-item-401')).toHaveCount(0);

  await page.getByTestId('entity-library-group-411').dblclick();
  await expect(page.getByTestId('entity-library-item-401')).toBeVisible();

  await page.getByTestId('entity-library-item-401').dblclick();
  await expect(page.getByTestId('modal')).toBeVisible();
  await page.getByTestId('modal').click({ position: { x: 5, y: 5 } });

  await page.getByTestId('entity-library-item-401').dragTo(page.getByTestId('entity-library-workspace'));
  await expect(page.getByTestId('entity-library-item-401')).toBeVisible();
});

test('items library supports group navigation, modal open, cut/paste and drag/drop', async ({ page }) => {
  await goToSection(page, 'items');

  await expect(page.getByTestId('entity-library-group-511')).toBeVisible();
  await expect(page.getByTestId('entity-library-item-501')).toBeVisible();

  await openWorkspaceMenu(page);
  await action(page, 'create-item').click();
  await expect(page.getByTestId('modal')).toBeVisible();
  await page.getByTestId('modal').click({ position: { x: 5, y: 5 } });
  await expect(page.getByTestId('modal')).toHaveCount(0);

  await page.getByTestId('entity-library-item-501').dragTo(page.getByTestId('entity-library-group-511'));
  await expect(page.getByTestId('entity-library-item-501')).toHaveCount(0);

  await page.getByTestId('entity-library-group-511').dblclick();
  await expect(page.getByTestId('entity-library-item-501')).toBeVisible();
  await expect(page.getByTestId('entity-library-item-502')).toBeVisible();

  await openItemMenu(page, '501');
  await action(page, 'cut-item').click();
  await expect(page.getByTestId('entity-library-item-501')).toHaveAttribute('data-cut', 'true');
});

test('assets library supports files, folders, sets and context menu paths', async ({ page }) => {
  await goToSection(page, 'assets');

  await expect(page.getByTestId('entity-library-group-611')).toBeVisible();
  await expect(page.getByTestId('entity-library-item-601')).toBeVisible();

  await openItemMenu(page, '601');
  await action(page, 'cut-asset').click();
  await openGroupMenu(page, '611');
  await action(page, 'paste-to-folder').click();
  await expect(page.getByTestId('entity-library-item-601')).toHaveCount(0);

  await page.getByTestId('entity-library-group-611').dblclick();
  await expect(page.getByTestId('entity-library-item-601')).toBeVisible();
  await expect(page.getByTestId('entity-library-item-602')).toBeVisible();

  await page.getByTestId('assets-mode-sets').click();
  await expect(page.getByTestId('entity-library-group-701')).toBeVisible();
  await page.getByTestId('entity-library-group-701').dblclick();
  await expect(page.getByTestId('entity-library-item-601')).toBeVisible();

  await openItemMenu(page, '601');
  await action(page, 'remove-from-set').click();
  await expect(page.getByTestId('entity-library-item-601')).toHaveCount(0);
});
