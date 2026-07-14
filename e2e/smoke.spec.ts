import { expect, test } from '@playwright/test';

// These don't touch the database — they verify the app boots, routes
// resolve, and the core auth-page chrome renders.
test.describe('smoke', () => {
  test('landing page renders and links to signup/login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Register as a Student' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register as a Company' })).toBeVisible();
    // Text is hidden on small screens; the aria-label keeps the role query
    // working at any viewport.
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('login page renders the credentials form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByPlaceholder('you@university.edu.ng')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  test('signup page renders and toggles between student/company copy', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create student account' })).toBeVisible();

    await page.getByRole('button', { name: 'Company' }).click();
    await expect(page.getByRole('button', { name: 'Create company account' })).toBeVisible();
  });

  test('a dashboard route redirects an unauthenticated visitor to login', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  });
});
