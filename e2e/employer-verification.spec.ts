import path from 'path';
import { expect, test } from '@playwright/test';
import { SEEDED_ADMIN_EMAIL, SEEDED_ADMIN_PASSWORD } from './global-setup';

const DOC_PATH = path.join(__dirname, 'fixtures/resume.pdf');
const companyEmail = `e2e-siwes-finder-company-${Date.now()}@example.com`;
const companyPassword = 'e2e-test-password-4';
const companyName = `E2E Verification Test Co ${Date.now()}`;

test('employer signs up, submits verification, and an admin approves it', async ({ page }) => {
  await test.step('sign up as a company', async () => {
    await page.goto('/signup');
    await page.getByRole('button', { name: 'Company' }).click();
    await page.getByPlaceholder('Paystack').fill(companyName);
    await page.getByPlaceholder('hr@company.com').fill(companyEmail);
    await page.getByPlaceholder('Create a password').fill(companyPassword);
    await page.getByRole('button', { name: 'Create company account' }).click();
    await expect(page).toHaveURL(/\/employer\/dashboard|\/login-redirect/, { timeout: 15_000 });
  });

  await test.step('submit CAC verification details', async () => {
    await page.goto('/employer/verification');
    // The verification form's <label> isn't associated with its <input> via
    // for/id, so getByLabel() can't find these — fall back to the label's
    // following sibling.
    await page.locator('label:text("Company name") + input').fill(companyName);
    await page.locator('label:text("CAC registration number") + input').fill('RC-E2E-12345');
    await page.locator('label:text("Official company email") + input').fill(companyEmail);
    await page.locator('input[type="file"]').setInputFiles(DOC_PATH);
    await expect(page.getByText(/document uploaded/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Submit for verification' }).click();
    await expect(page.getByText('Verification under review')).toBeVisible({ timeout: 10_000 });
  });

  await test.step('an admin approves the company', async () => {
    await page.goto('/login');
    await page.getByPlaceholder('you@university.edu.ng').fill(SEEDED_ADMIN_EMAIL);
    await page.getByPlaceholder('••••••••').fill(SEEDED_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 });

    await page.goto('/admin/companies');
    const card = page.locator('.rounded-2xl', { hasText: companyName });
    await card.getByRole('button', { name: 'Approve' }).click();
    await expect(card.getByText('approved', { exact: false })).toBeVisible({ timeout: 10_000 });
  });
});
