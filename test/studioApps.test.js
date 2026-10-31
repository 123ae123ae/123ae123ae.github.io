import test from 'node:test';
import assert from 'node:assert/strict';
import { studioAppsFor } from '../src/studioApps.js';

for (const locale of ['zh-CN', 'fr', 'en']) {
  test(`studio home separates app links and summaries in ${locale}`, () => {
    const apps = studioAppsFor(locale);
    assert.deepEqual(apps.map(app => app.name), ['Ham Ham', 'Pulum']);
    for (const app of apps) {
      assert.ok(app.summary.length > 12);
      assert.ok(app.links.some(link => link.label === 'privacy'));
      assert.ok(app.links.some(link => link.label === 'support'));
      for (const link of app.links) assert.ok(link.href.startsWith(`/${app.id}/`));
    }
    assert.ok(apps[1].links.some(link => link.label === 'terms'));
    assert.ok(apps[1].links.every(link => link.href.includes(`lang=${locale === 'zh-CN' ? 'zh' : locale}`)));
  });
}

test('unsupported studio language safely falls back to English', () => {
  assert.deepEqual(studioAppsFor('unknown'), studioAppsFor('en'));
});
