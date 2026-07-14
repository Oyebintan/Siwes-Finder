import path from 'path';
import mongoose from 'mongoose';
import { expect, test } from '@playwright/test';
import User from '../src/models/User';
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
    // Signup routes through /verify-email first (the E2E server runs with
    // REQUIRE_EMAIL_VERIFICATION=true — see playwright.config.ts).
    await expect(page).toHaveURL(/\/verify-email/, { timeout: 15_000 });
  });

  await test.step('verify email (bypasses real inbox delivery, same as the student spec)', async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
    await User.updateOne({ email: companyEmail }, { $set: { emailVerified: true } });
    await mongoose.disconnect();

    // The API short-circuits to success once already verified in the DB.
    await page.getByPlaceholder('123456').fill('000000');
    await page.getByRole('button', { name: 'Verify email' }).click();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Continue' }).click();
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
    // The page has two hidden file inputs (company-logo image + CAC
    // document PDF) -- target the PDF one explicitly.
    await page.locator('input[type="file"][accept="application/pdf"]').setInputFiles(DOC_PATH);
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
    // The page opens on the 'pending' tab and refetches it after the
    // action, so success == the company leaving the pending queue.
    await expect(card).toHaveCount(0, { timeout: 10_000 });
  });
});
