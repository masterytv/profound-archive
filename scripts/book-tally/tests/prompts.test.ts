import { mkdtempSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { computePromptHash, loadPrompt, renderPrompt, stableStringify } from '../lib/prompts';

const questions = [{ id: 1, category: 'a', consumer_question: 'Did you see a light?' }, { id: 2, category: 'b', consumer_question: 'x?' }];
const schema = { type: 'object', properties: { b: { type: 'string' }, a: { type: 'number' } } };

describe('computePromptHash', () => {
  const base = { templateBytes: Buffer.from('You are a careful reader.\n'), questionList: questions, outputSchema: schema };
  it('is a stable 64-hex sha256', () => {
    const h = computePromptHash(base);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(computePromptHash({ ...base })).toBe(h);
  });
  it('is independent of object key order', () => {
    const reordered = { ...base, outputSchema: { properties: { a: { type: 'number' }, b: { type: 'string' } }, type: 'object' } };
    expect(computePromptHash(reordered)).toBe(computePromptHash(base));
  });
  it('changes with any component (template bytes, questions, schema, array order)', () => {
    const h = computePromptHash(base);
    expect(computePromptHash({ ...base, templateBytes: Buffer.from('You are a careful reader. \n') })).not.toBe(h);
    expect(computePromptHash({ ...base, questionList: [questions[1], questions[0]] })).not.toBe(h);
    expect(computePromptHash({ ...base, outputSchema: { ...schema, required: ['a'] } })).not.toBe(h);
  });
  it('component boundaries are unambiguous', () => {
    const a = computePromptHash({ templateBytes: 'ab', questionList: 'c' });
    const b = computePromptHash({ templateBytes: 'a', questionList: 'bc' });
    expect(a).not.toBe(b);
  });
  it('string and Buffer template give the same hash', () => {
    expect(computePromptHash({ ...base, templateBytes: 'You are a careful reader.\n' })).toBe(computePromptHash(base));
  });
  it('pinned value, verified independently via printf | sha256sum', () => {
    expect(computePromptHash({ templateBytes: 'T', questionList: [1], outputSchema: { a: 1 } }))
      .toBe('630762a6a0343ecf909424dc1631aaa75c62bf57d9853a04f826a97dc528926c');
  });
});

describe('render / load', () => {
  it('replaces placeholders and throws on missing variables', () => {
    expect(renderPrompt('Hi {{ name }}, {{n}} items', { name: 'Ann', n: '3' })).toBe('Hi Ann, 3 items');
    expect(() => renderPrompt('Hi {{who}}', {})).toThrow(/who/);
  });
  it('loads a prompt file and keeps exact bytes', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'bt-prompts-'));
    writeFileSync(path.join(dir, 'x-v1.md'), 'hello\r\n');
    const p = loadPrompt('x-v1', dir);
    expect(p.bytes.toString()).toBe('hello\r\n');
    expect(() => loadPrompt('../etc/passwd', dir)).toThrow();
  });
  it('stableStringify sorts keys recursively', () => {
    expect(stableStringify({ b: 1, a: { d: 1, c: [{ z: 1, y: 2 }] } })).toBe('{"a":{"c":[{"y":2,"z":1}],"d":1},"b":1}');
  });
});
