import path from 'path';
import { expect, test } from '@playwright/test';
import {
  SEEDED_EMPLOYER_EMAIL,
  SEEDED_EMPLOYER_PASSWORD,
  SEEDED_JOB_TITLE,
} from './global-setup';

const RESUME_PATH = path.join(__dirname, 'fixtures/resume.pdf');
const studentEmail = `e2e-siwes-finder-student-${Date.now()}@example.com`;
const studentPassword = 'e2e-test-password-3';

// One long, ordered flow (rather than independent tests) because each step
// depends on state built by the previous one: account -> profile -> resume
// -> application. Playwright preserves page/context across `test.step`s
// within a single `test`.
test('student signs up, completes profile, uploads a resume, and applies to the seeded job', async ({ page }) => {
  await test.step('sign up as a student', async () => {
    await page.goto('/signup');
    await page.getByPlaceholder('Amara Okafor').fill('E2E Test Student');
    await page.getByPlaceholder('you@university.edu.ng').fill(studentEmail);
    await page.getByPlaceholder('Create a password').fill(studentPassword);
    await page.getByRole('button', { name: 'Create student account' }).click();
    await expect(page).toHaveURL(/\/profile-setup/, { timeout: 15_000 });
  });

  await test.step('complete the profile-setup wizard', async () => {
    await page.getByPlaceholder('University of Lagos').fill('University of Lagos');
    await page.getByPlaceholder('Computer Science').fill('Computer Science');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText('SIWES duration')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText('Skills', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'React', exact: true }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('button', { name: 'Finish & go to dashboard' }).click();
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15_000 });
  });

  await test.step('upload a resume', async () => {
    await page.goto('/student/profile');
    await page.locator('input[type="file"]').setInputFiles(RESUME_PATH);
    await expect(page.getByText(/replace resume/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile updated successfully.')).toBeVisible();
  });

  await test.step('apply to the seeded job', async () => {
    await page.goto('/student/jobs');
    await page.getByPlaceholder(/search by role/i).fill(SEEDED_JOB_TITLE);
    await page.getByRole('link', { name: new RegExp(SEEDED_JOB_TITLE) }).click();
    await expect(page).toHaveURL(/\/student\/jobs\//);

    await page.getByRole('button', { name: /apply now/i }).click();
    await expect(page.getByText('Application Submitted')).toBeVisible({ timeout: 10_000 });
  });

  await test.step('the application shows up on the applications page', async () => {
    await page.goto('/student/applications');
    await expect(page.getByText(SEEDED_JOB_TITLE)).toBeVisible();
  });
});

test('the seeded employer sees the new applicant', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Company' }).click();
  await page.getByPlaceholder('you@company.com').fill(SEEDED_EMPLOYER_EMAIL);
  await page.getByPlaceholder('••••••••').fill(SEEDED_EMPLOYER_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/employer\/dashboard/, { timeout: 15_000 });

  await page.goto('/employer/applications');
  await expect(page.getByText('E2E Test Student')).toBeVisible({ timeout: 10_000 });
});
