jest.mock('nanoid', () => {
  let counter = 0;
  return {
    customAlphabet: jest.fn(() => () => {
      counter += 1;
      return `mock-uid-${counter}`;
    })
  };
});

import reducer, { scriptEnvironmentUpdateEvent } from './index';

// Minimal collection with an active environment and optionally an environmentsDraft
const makeState = ({ envVars = [], draft = null } = {}) => ({
  collections: [
    {
      uid: 'col-1',
      activeEnvironmentUid: 'env-1',
      environments: [
        {
          uid: 'env-1',
          name: 'Test',
          variables: envVars.map((v) => ({
            uid: `uid-${v.name}`,
            name: v.name,
            value: v.value,
            type: 'text',
            enabled: v.enabled !== false,
            secret: false
          }))
        }
      ],
      runtimeVariables: {},
      ...(draft ? { environmentsDraft: draft } : {})
    }
  ]
});

const getEnvVars = (state) => state.collections[0].environments[0].variables;
const getDraft = (state) => state.collections[0].environmentsDraft;

describe('scriptEnvironmentUpdateEvent', () => {
  test('adds new variable from script', () => {
    const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }] });
    const action = scriptEnvironmentUpdateEvent({
      collectionUid: 'col-1',
      envVariables: { __name__: 'Test', host: 'localhost', newVar: 'newValue' },
      runtimeVariables: {}
    });
    const result = reducer(state, action);
    const vars = getEnvVars(result);
    expect(vars).toHaveLength(2);
    expect(vars.find((v) => v.name === 'newVar').value).toBe('newValue');
  });

  test('updates existing variable value', () => {
    const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }] });
    const action = scriptEnvironmentUpdateEvent({
      collectionUid: 'col-1',
      envVariables: { __name__: 'Test', host: 'production.com' },
      runtimeVariables: {}
    });
    const result = reducer(state, action);
    expect(getEnvVars(result).find((v) => v.name === 'host').value).toBe('production.com');
  });

  test('removes enabled variable deleted by script', () => {
    const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }, { name: 'token', value: 'abc' }] });
    const action = scriptEnvironmentUpdateEvent({
      collectionUid: 'col-1',
      envVariables: { __name__: 'Test', host: 'localhost' },
      runtimeVariables: {}
    });
    const result = reducer(state, action);
    const vars = getEnvVars(result);
    expect(vars).toHaveLength(1);
    expect(vars[0].name).toBe('host');
  });

  test('keeps disabled variables untouched', () => {
    const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }, { name: 'disabled', value: 'x', enabled: false }] });
    const action = scriptEnvironmentUpdateEvent({
      collectionUid: 'col-1',
      envVariables: { __name__: 'Test', host: 'localhost' },
      runtimeVariables: {}
    });
    const result = reducer(state, action);
    const vars = getEnvVars(result);
    expect(vars).toHaveLength(2);
    expect(vars.find((v) => v.name === 'disabled')).toBeTruthy();
  });

  describe('draft sync', () => {
    test('adds script variable to existing draft', () => {
      const draft = {
        environmentUid: 'env-1',
        variables: [
          { uid: 'uid-host', name: 'host', value: 'localhost', type: 'text', enabled: true, secret: false },
          { uid: 'uid-myDraft', name: 'myDraft', value: 'draft-val', type: 'text', enabled: true, secret: false }
        ]
      };
      const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }], draft });
      const action = scriptEnvironmentUpdateEvent({
        collectionUid: 'col-1',
        envVariables: { __name__: 'Test', host: 'localhost', scriptVar: 'script-value', myDraft: 'draft-val' },
        runtimeVariables: {}
      });
      const result = reducer(state, action);
      const draftVars = getDraft(result).variables;
      expect(draftVars.find((v) => v.name === 'scriptVar')).toBeTruthy();
      expect(draftVars.find((v) => v.name === 'scriptVar').value).toBe('script-value');
      expect(draftVars.find((v) => v.name === 'myDraft').value).toBe('draft-val');
    });

    test('updates existing draft variable value from script', () => {
      const draft = {
        environmentUid: 'env-1',
        variables: [
          { uid: 'uid-host', name: 'host', value: 'localhost', type: 'text', enabled: true, secret: false }
        ]
      };
      const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }], draft });
      const action = scriptEnvironmentUpdateEvent({
        collectionUid: 'col-1',
        envVariables: { __name__: 'Test', host: 'updated-host' },
        runtimeVariables: {}
      });
      const result = reducer(state, action);
      expect(getDraft(result).variables.find((v) => v.name === 'host').value).toBe('updated-host');
    });

    test('preserves draft-only variables not in the script result', () => {
      const draft = {
        environmentUid: 'env-1',
        variables: [
          { uid: 'uid-host', name: 'host', value: 'localhost', type: 'text', enabled: true, secret: false },
          { uid: 'uid-userDraft', name: 'userDraftVar', value: 'draft-only', type: 'text', enabled: true, secret: false }
        ]
      };
      // userDraftVar is only in the draft, not in the saved environment
      const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }], draft });
      const action = scriptEnvironmentUpdateEvent({
        collectionUid: 'col-1',
        envVariables: { __name__: 'Test', host: 'localhost', scriptVar: 'script-value' },
        runtimeVariables: {}
      });
      const result = reducer(state, action);
      const draftVars = getDraft(result).variables;
      expect(draftVars.find((v) => v.name === 'host')).toBeTruthy();
      expect(draftVars.find((v) => v.name === 'userDraftVar').value).toBe('draft-only');
      expect(draftVars.find((v) => v.name === 'scriptVar').value).toBe('script-value');
    });

    test('removes script-deleted variable from draft', () => {
      const draft = {
        environmentUid: 'env-1',
        variables: [
          { uid: 'uid-host', name: 'host', value: 'localhost', type: 'text', enabled: true, secret: false },
          { uid: 'uid-token', name: 'token', value: 'abc', type: 'text', enabled: true, secret: false }
        ]
      };
      const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }, { name: 'token', value: 'abc' }], draft });
      const action = scriptEnvironmentUpdateEvent({
        collectionUid: 'col-1',
        envVariables: { __name__: 'Test', host: 'localhost' },
        runtimeVariables: {}
      });
      const result = reducer(state, action);
      const draftVars = getDraft(result).variables;
      expect(draftVars).toHaveLength(1);
      expect(draftVars[0].name).toBe('host');
    });

    test('does not re-add variable that user deleted from draft', () => {
      // User deleted "host" from the draft (it exists in saved env but not in draft)
      const draft = {
        environmentUid: 'env-1',
        variables: [
          { uid: 'uid-userDraft', name: 'userDraftVar', value: 'draft-only', type: 'text', enabled: true, secret: false }
        ]
      };
      const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }], draft });
      const action = scriptEnvironmentUpdateEvent({
        collectionUid: 'col-1',
        envVariables: { __name__: 'Test', host: 'localhost', scriptVar: 'new-from-script' },
        runtimeVariables: {}
      });
      const result = reducer(state, action);
      const draftVars = getDraft(result).variables;
      // host should NOT be re-added (user deleted it from draft)
      expect(draftVars.find((v) => v.name === 'host')).toBeUndefined();
      // userDraftVar should be preserved (draft-only)
      expect(draftVars.find((v) => v.name === 'userDraftVar')).toBeTruthy();
      // scriptVar should be added (new from script, not in saved env)
      expect(draftVars.find((v) => v.name === 'scriptVar').value).toBe('new-from-script');
    });

    test('does not create draft when none exists', () => {
      const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }] });
      const action = scriptEnvironmentUpdateEvent({
        collectionUid: 'col-1',
        envVariables: { __name__: 'Test', host: 'localhost', newVar: 'val' },
        runtimeVariables: {}
      });
      const result = reducer(state, action);
      expect(getDraft(result)).toBeUndefined();
    });

    test('does not touch draft for a different environment', () => {
      const draft = {
        environmentUid: 'env-other',
        variables: [
          { uid: 'uid-x', name: 'x', value: 'original', type: 'text', enabled: true, secret: false }
        ]
      };
      const state = makeState({ envVars: [{ name: 'host', value: 'localhost' }], draft });
      const action = scriptEnvironmentUpdateEvent({
        collectionUid: 'col-1',
        envVariables: { __name__: 'Test', host: 'localhost', newVar: 'val' },
        runtimeVariables: {}
      });
      const result = reducer(state, action);
      const draftVars = getDraft(result).variables;
      expect(draftVars).toHaveLength(1);
      expect(draftVars[0].value).toBe('original');
    });
  });
});
