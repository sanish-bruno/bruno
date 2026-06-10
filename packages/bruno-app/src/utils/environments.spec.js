jest.mock('nanoid', () => {
  let counter = 0;
  return {
    customAlphabet: jest.fn(() => () => {
      counter += 1;
      return `mock-uid-${counter}`;
    })
  };
});

import { mergeScriptVarsIntoSaved, mergeScriptVarsIntoDraft } from './environments';

const makeVar = (name, value, enabled = true) => ({
  uid: `uid-${name}`,
  name,
  value,
  type: 'text',
  enabled,
  secret: false
});

describe('mergeScriptVarsIntoSaved', () => {
  test('updates value of existing variable', () => {
    const result = mergeScriptVarsIntoSaved([makeVar('host', 'localhost')], { host: 'production.com' });
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('production.com');
  });

  test('adds new variable from script', () => {
    const result = mergeScriptVarsIntoSaved([makeVar('host', 'localhost')], { host: 'localhost', newVar: 'val' });
    expect(result).toHaveLength(2);
    expect(result.find((v) => v.name === 'newVar').value).toBe('val');
  });

  test('removes enabled variable deleted by script', () => {
    const result = mergeScriptVarsIntoSaved([makeVar('host', 'localhost'), makeVar('token', 'abc')], { host: 'localhost' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('host');
  });

  test('keeps disabled variables', () => {
    const result = mergeScriptVarsIntoSaved([makeVar('host', 'localhost'), makeVar('disabled', 'x', false)], { host: 'localhost' });
    expect(result).toHaveLength(2);
    expect(result.find((v) => v.name === 'disabled')).toBeTruthy();
  });

  test('ignores __name__ key', () => {
    const result = mergeScriptVarsIntoSaved([makeVar('host', 'localhost')], { __name__: 'Test', host: 'localhost' });
    expect(result.find((v) => v.name === '__name__')).toBeUndefined();
  });

  test('does not add __name__ as a variable', () => {
    const result = mergeScriptVarsIntoSaved([], { __name__: 'Test', host: 'val' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('host');
  });

  test('handles null saved vars', () => {
    const result = mergeScriptVarsIntoSaved(null, { newVar: 'val' });
    expect(result).toHaveLength(1);
  });

  test('handles null script vars', () => {
    const result = mergeScriptVarsIntoSaved([makeVar('host', 'localhost')], null);
    expect(result).toHaveLength(0);
  });

  test('applies coerceValue option', () => {
    const result = mergeScriptVarsIntoSaved([makeVar('count', '0')], { count: 42 }, { coerceValue: String });
    expect(result[0].value).toBe('42');
  });

  test('uses custom makeVar for new variables', () => {
    const custom = (name, value) => ({ uid: 'custom', name, value, enabled: true });
    const result = mergeScriptVarsIntoSaved([], { x: '1' }, { makeVar: custom });
    expect(result[0]).toEqual({ uid: 'custom', name: 'x', value: '1', enabled: true });
  });

  test('does not mutate input array', () => {
    const saved = [makeVar('host', 'localhost')];
    mergeScriptVarsIntoSaved(saved, { host: 'changed' });
    expect(saved[0].value).toBe('localhost');
  });

  test('handles simultaneous add, update, and delete', () => {
    const saved = [makeVar('keep', 'old'), makeVar('remove', 'gone'), makeVar('disabled', 'x', false)];
    const result = mergeScriptVarsIntoSaved(saved, { keep: 'new', added: 'fresh' });
    expect(result).toHaveLength(3);
    expect(result.find((v) => v.name === 'keep').value).toBe('new');
    expect(result.find((v) => v.name === 'added').value).toBe('fresh');
    expect(result.find((v) => v.name === 'disabled')).toBeTruthy();
    expect(result.find((v) => v.name === 'remove')).toBeUndefined();
  });
});

describe('mergeScriptVarsIntoDraft', () => {
  test('updates value of existing draft variable', () => {
    const result = mergeScriptVarsIntoDraft([makeVar('host', 'localhost')], { host: 'updated' }, new Set(['host']));
    expect(result[0].value).toBe('updated');
  });

  test('adds variable new from script (not in pre-mutation saved)', () => {
    const result = mergeScriptVarsIntoDraft([makeVar('host', 'localhost')], { host: 'localhost', scriptVar: 'val' }, new Set(['host']));
    expect(result.find((v) => v.name === 'scriptVar').value).toBe('val');
  });

  test('does not re-add variable user deleted from draft', () => {
    const draft = [makeVar('userVar', 'draft-only')];
    const result = mergeScriptVarsIntoDraft(draft, { host: 'localhost', scriptNew: 'val' }, new Set(['host']));
    expect(result.find((v) => v.name === 'host')).toBeUndefined();
    expect(result.find((v) => v.name === 'userVar')).toBeTruthy();
    expect(result.find((v) => v.name === 'scriptNew').value).toBe('val');
  });

  test('removes variable from draft that script deleted', () => {
    const draft = [makeVar('host', 'localhost'), makeVar('token', 'abc')];
    const result = mergeScriptVarsIntoDraft(draft, { host: 'localhost' }, new Set(['host', 'token']));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('host');
  });

  test('keeps draft-only variables', () => {
    const draft = [makeVar('host', 'localhost'), makeVar('userDraftVar', 'mine')];
    const result = mergeScriptVarsIntoDraft(draft, { host: 'localhost', scriptVar: 'val' }, new Set(['host']));
    expect(result.find((v) => v.name === 'userDraftVar').value).toBe('mine');
  });

  test('keeps disabled draft variables', () => {
    const draft = [makeVar('host', 'localhost'), makeVar('disabledSaved', 'x', false)];
    const result = mergeScriptVarsIntoDraft(draft, { host: 'localhost' }, new Set(['host', 'disabledSaved']));
    expect(result).toHaveLength(2);
    expect(result.find((v) => v.name === 'disabledSaved')).toBeTruthy();
  });

  test('ignores __name__ key', () => {
    const result = mergeScriptVarsIntoDraft([makeVar('host', 'localhost')], { __name__: 'Test', host: 'localhost' }, new Set(['host']));
    expect(result.find((v) => v.name === '__name__')).toBeUndefined();
  });

  test('handles null draft vars', () => {
    const result = mergeScriptVarsIntoDraft(null, { x: '1' }, new Set());
    expect(result).toHaveLength(1);
  });

  test('does not mutate input array', () => {
    const draft = [makeVar('host', 'localhost')];
    mergeScriptVarsIntoDraft(draft, { host: 'changed' }, new Set(['host']));
    expect(draft[0].value).toBe('localhost');
  });

  test('applies coerceValue option', () => {
    const result = mergeScriptVarsIntoDraft([makeVar('count', '0')], { count: 42 }, new Set(['count']), { coerceValue: String });
    expect(result[0].value).toBe('42');
  });

  test('handles all rules simultaneously', () => {
    const draft = [
      makeVar('keep', 'old'),
      makeVar('userOnly', 'mine'),
      makeVar('scriptWillDelete', 'x')
    ];
    const script = { keep: 'new', scriptNew: 'fresh', userDeleted: 'still-in-script' };
    const preMutation = new Set(['keep', 'scriptWillDelete', 'userDeleted']);
    const result = mergeScriptVarsIntoDraft(draft, script, preMutation);
    expect(result.find((v) => v.name === 'keep').value).toBe('new');
    expect(result.find((v) => v.name === 'userOnly').value).toBe('mine');
    expect(result.find((v) => v.name === 'scriptNew').value).toBe('fresh');
    expect(result.find((v) => v.name === 'scriptWillDelete')).toBeUndefined();
    expect(result.find((v) => v.name === 'userDeleted')).toBeUndefined();
  });
});
