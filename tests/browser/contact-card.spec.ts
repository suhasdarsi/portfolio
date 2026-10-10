import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import jsQR from 'jsqr';
test('builds contact QR without saving anything, and handles unavailable Wallet service', async ({ page }) => {
  await page.goto('/pocket-card');
  await page.getByLabel('Full name', { exact: true }).fill('Alex Morgan');
  await page.getByLabel('Phone (+country code)', { exact: true }).fill('+1 (202) 555-0123');
  await page.getByLabel('LinkedIn URL').fill('https://www.linkedin.com/in/alex/');
  await expect(page.locator('#preview-name')).toHaveText('Alex Morgan');
  const decode = async () => {
    const src = await page.locator('#contact-qr').getAttribute('src');
    if (!src) return '';
    const { data, info } = await sharp(Buffer.from(src.split(',')[1], 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? '';
  };
  await expect.poll(decode).toContain('https://www.linkedin.com/in/alex/');
  const decoded = await decode();
  expect(decoded).toContain('TEL;TYPE=CELL:+12025550123');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key !== 'theme'))).toEqual([]);
  await page.route('**/api/wallet', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Wallet generation is not activated yet.' }) }));
  await page.getByRole('button', { name: 'Download for Apple Wallet' }).click();
  await expect(page.locator('#contact-status')).toContainText('not activated');
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
