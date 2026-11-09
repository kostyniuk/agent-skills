// Example steps for record-app.mjs: tick a checkbox in a list and let the toast confirm it.
// Phrases are verbatim substrings of the segment's narration in script.json.
export const url = `${process.env.APP_URL || 'http://localhost:3000'}/events`;
const row = (page) => page.locator('main table tbody tr', { hasText: 'Q2 2026' }).first();
export async function ready(page) {
  await row(page).waitFor({ timeout: 120000 });
}
export default async function ({ page, at, T, hl, call, click }) {
  const writes = [];
  page.on('response', r => r.request().method() !== 'GET' && writes.push(`${r.status()} ${r.request().method()} ${r.url()}`));
  await T(at('This is the list')); await hl(page.locator('main table').first());
  await T(at('The Skip column')); await hl(page.getByRole('columnheader', { name: /skip/i })); await call('column', 'Skip');
  await T(at("I'll tick it")); await hl(row(page));
  await T(at('report.') + 0.3); await click(row(page).getByRole('checkbox').last());
  await call('PUT', '/v1/events/:id/skip');
  await T(at('the toast confirms')); await hl(page.locator('[data-sonner-toast], [role="status"]').first()).catch(() => {});
  return { writes };
}
