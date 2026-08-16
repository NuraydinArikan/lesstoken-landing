import test from 'node:test';
import assert from 'node:assert/strict';
import { supportContent } from '../lib/supportContent.mjs';

const LOCALES = ['tr', 'en'];
const PRODUCTS = ['extension', 'desktop', 'web'];

test('both locales exist', () => {
  for (const locale of LOCALES) {
    assert.ok(supportContent[locale], `missing locale: ${locale}`);
  }
});

test('every locale covers every product, with matching item counts', () => {
  for (const product of PRODUCTS) {
    const counts = LOCALES.map((locale) => {
      const items = supportContent[locale].faq[product];
      assert.ok(Array.isArray(items), `${locale}.faq.${product} is not an array`);
      assert.ok(items.length > 0, `${locale}.faq.${product} is empty`);
      return items.length;
    });
    assert.equal(
      counts[0], counts[1],
      `${product}: tr has ${counts[0]} items, en has ${counts[1]} -- adding a ` +
      'question in one language and forgetting the other leaves a gap no one notices'
    );
  }
});

test('every FAQ item has a non-empty question and answer', () => {
  for (const locale of LOCALES) {
    for (const product of PRODUCTS) {
      supportContent[locale].faq[product].forEach((item, idx) => {
        for (const field of ['q', 'a']) {
          assert.equal(typeof item[field], 'string',
            `${locale}.${product}[${idx}].${field} is not a string`);
          assert.ok(item[field].trim().length > 0,
            `${locale}.${product}[${idx}].${field} is blank`);
        }
      });
    }
  }
});

test('FAQ item links, when present, are well-formed and match across locales', () => {
  for (const product of PRODUCTS) {
    const trItems = supportContent.tr.faq[product];
    const enItems = supportContent.en.faq[product];
    trItems.forEach((trItem, idx) => {
      const enItem = enItems[idx];
      for (const [locale, item] of [['tr', trItem], ['en', enItem]]) {
        if (item.links === undefined) continue;
        assert.ok(Array.isArray(item.links),
          `${locale}.${product}[${idx}].links is not an array`);
        item.links.forEach((link, linkIdx) => {
          assert.equal(typeof link.label, 'string',
            `${locale}.${product}[${idx}].links[${linkIdx}].label is not a string`);
          assert.ok(link.label.trim().length > 0,
            `${locale}.${product}[${idx}].links[${linkIdx}].label is blank`);
          assert.equal(typeof link.href, 'string',
            `${locale}.${product}[${idx}].links[${linkIdx}].href is not a string`);
          assert.ok(link.href.trim().length > 0,
            `${locale}.${product}[${idx}].links[${linkIdx}].href is blank`);
        });
      }
      const trCount = trItem.links?.length ?? 0;
      const enCount = enItem.links?.length ?? 0;
      assert.equal(trCount, enCount,
        `${product}[${idx}]: tr has ${trCount} links, en has ${enCount} -- ` +
        'links must stay in parity like every other piece of this content');
    });
  }
});

test('tab labels and form strings are present in both locales', () => {
  for (const locale of LOCALES) {
    for (const product of PRODUCTS) {
      assert.ok(supportContent[locale].tabs[product]?.trim(),
        `${locale}.tabs.${product} is blank`);
    }
    for (const key of ['title', 'name', 'email', 'subject', 'message', 'send',
                       'sending', 'success', 'errorGeneric', 'errorRateLimit',
                       'errorNetwork']) {
      assert.ok(supportContent[locale].form[key]?.trim(),
        `${locale}.form.${key} is blank`);
    }
    for (const key of ['title', 'description', 'heading']) {
      assert.ok(supportContent[locale].meta[key]?.trim(),
        `${locale}.meta.${key} is blank`);
    }
  }
});

test('no placeholder text survived into shipped copy', () => {
  const banned = /\b(TODO|TBD|FIXME|lorem ipsum|XXX)\b/i;
  const walk = (value, path) => {
    if (typeof value === 'string') {
      assert.ok(!banned.test(value), `placeholder text at ${path}: ${value}`);
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
    }
  };
  walk(supportContent, 'supportContent');
});

test('no Ollama references -- the extension does not support it', () => {
  assert.ok(!/ollama/i.test(JSON.stringify(supportContent)));
});
