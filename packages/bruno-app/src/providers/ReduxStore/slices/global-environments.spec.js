jest.mock('nanoid', () => {
  let counter = 0;
  return {
    customAlphabet: jest.fn(() => () => {
      counter += 1;
      return `mock-uid-${counter}`;
    })
  };
});

// Mock ipcRenderer and environmentSchema for the persist-to-disk path
jest.mock('@usebruno/schema', () => ({
  environmentSchema: {
    validate: jest.fn().mockResolvedValue(true)
  }
}));

window.ipcRenderer = {
  invoke: jest.fn().mockResolvedValue(undefined)
};

import reducer, {
  globalEnvironmentsUpdateEvent,
  _saveGlobalEnvironment,
  setGlobalEnvironmentDraft
} from './global-environments';

// Helper to build a mock store around the global-environments slice
const createMockStore = (initialState) => {
  let state = initialState;
  const dispatched = [];

  const dispatch = (action) => {
    dispatched.push(action);
    // Apply reducer actions (not thunks) to keep state in sync
    if (typeof action !== 'function' && action.type) {
      state = { ...state, globalEnvironments: reducer(state.globalEnvironments, action) };
    }
    return action;
  };

  const getState = () => state;

  return { dispatch, getState, dispatched };
};

const makeVar = (name, value, enabled = true) => ({
  uid: `uid-${name}`,
  name,
  value,
  type: 'text',
  secret: false,
  enabled
});

const makeState = ({ vars = [], draftVars = null, activeUid = 'env-1' } = {}) => ({
  globalEnvironments: {
    globalEnvironments: [
      {
        uid: 'env-1',
        name: 'global',
        variables: vars.map((v) => makeVar(v.name, v.value, v.enabled !== false))
      }
    ],
    activeGlobalEnvironmentUid: activeUid,
    globalEnvironmentDraft: draftVars
      ? { environmentUid: 'env-1', variables: draftVars.map((v) => makeVar(v.name, v.value, v.enabled !== false)) }
      : null
  },
  workspaces: { activeWorkspaceUid: null, workspaces: [] }
});

describe('globalEnvironmentsUpdateEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updates existing variable value', () => {
    const state = makeState({ vars: [{ name: 'baseUrl', value: 'old' }] });
    const store = createMockStore(state);

    globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { baseUrl: 'new' } })(store.dispatch, store.getState);

    const saveAction = store.dispatched.find((a) => a.type === _saveGlobalEnvironment.type);
    expect(saveAction.payload.variables.find((v) => v.name === 'baseUrl').value).toBe('new');
  });

  test('adds new variable from script', () => {
    const state = makeState({ vars: [{ name: 'baseUrl', value: 'localhost' }] });
    const store = createMockStore(state);

    globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { baseUrl: 'localhost', newVar: 'newVal' } })(store.dispatch, store.getState);

    const saveAction = store.dispatched.find((a) => a.type === _saveGlobalEnvironment.type);
    expect(saveAction.payload.variables.find((v) => v.name === 'newVar').value).toBe('newVal');
  });

  test('removes enabled variable deleted by script', () => {
    const state = makeState({ vars: [{ name: 'baseUrl', value: 'localhost' }, { name: 'token', value: 'abc' }] });
    const store = createMockStore(state);

    globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { baseUrl: 'localhost' } })(store.dispatch, store.getState);

    const saveAction = store.dispatched.find((a) => a.type === _saveGlobalEnvironment.type);
    expect(saveAction.payload.variables.find((v) => v.name === 'token')).toBeUndefined();
  });

  test('keeps disabled variables untouched', () => {
    const state = makeState({ vars: [{ name: 'baseUrl', value: 'localhost' }, { name: 'disabled', value: 'x', enabled: false }] });
    const store = createMockStore(state);

    globalEnvironmentsUpdateEvent({ globalEnvironmentVariables: { baseUrl: 'localhost' } })(store.dispatch, store.getState);

    const saveAction = store.dispatched.find((a) => a.type === _saveGlobalEnvironment.type);
    expect(saveAction.payload.variables.find((v) => v.name === 'disabled')).toBeTruthy();
  });

  describe('draft sync', () => {
    test('adds script variable to existing draft', () => {
      const state = makeState({
        vars: [{ name: 'baseUrl', value: 'localhost' }],
        draftVars: [{ name: 'baseUrl', value: 'localhost' }, { name: 'myDraft', value: 'draft-val' }]
      });
      const store = createMockStore(state);

      globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { baseUrl: 'localhost', scriptVar: 'script-val', myDraft: 'draft-val' }
      })(store.dispatch, store.getState);

      const draftAction = store.dispatched.find((a) => a.type === setGlobalEnvironmentDraft.type);
      expect(draftAction).toBeTruthy();
      const draftVars = draftAction.payload.variables;
      expect(draftVars.find((v) => v.name === 'scriptVar').value).toBe('script-val');
      expect(draftVars.find((v) => v.name === 'myDraft').value).toBe('draft-val');
    });

    test('updates existing draft variable value from script', () => {
      const state = makeState({
        vars: [{ name: 'baseUrl', value: 'localhost' }],
        draftVars: [{ name: 'baseUrl', value: 'localhost' }]
      });
      const store = createMockStore(state);

      globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { baseUrl: 'updated-host' }
      })(store.dispatch, store.getState);

      const draftAction = store.dispatched.find((a) => a.type === setGlobalEnvironmentDraft.type);
      expect(draftAction.payload.variables.find((v) => v.name === 'baseUrl').value).toBe('updated-host');
    });

    test('removes script-deleted variable from draft', () => {
      const state = makeState({
        vars: [{ name: 'baseUrl', value: 'localhost' }, { name: 'token', value: 'abc' }],
        draftVars: [{ name: 'baseUrl', value: 'localhost' }, { name: 'token', value: 'abc' }]
      });
      const store = createMockStore(state);

      globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { baseUrl: 'localhost' }
      })(store.dispatch, store.getState);

      const draftAction = store.dispatched.find((a) => a.type === setGlobalEnvironmentDraft.type);
      const draftVars = draftAction.payload.variables;
      expect(draftVars).toHaveLength(1);
      expect(draftVars[0].name).toBe('baseUrl');
    });

    test('preserves draft-only variables not in the script result', () => {
      const state = makeState({
        vars: [{ name: 'baseUrl', value: 'localhost' }],
        draftVars: [{ name: 'baseUrl', value: 'localhost' }, { name: 'userDraftVar', value: 'draft-only' }]
      });
      const store = createMockStore(state);

      // Script only knows about baseUrl and adds scriptVar — doesn't know about userDraftVar
      globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { baseUrl: 'localhost', scriptVar: 'script-val' }
      })(store.dispatch, store.getState);

      const draftAction = store.dispatched.find((a) => a.type === setGlobalEnvironmentDraft.type);
      const draftVars = draftAction.payload.variables;
      // All three should be in the draft
      expect(draftVars.find((v) => v.name === 'baseUrl')).toBeTruthy();
      expect(draftVars.find((v) => v.name === 'userDraftVar').value).toBe('draft-only');
      expect(draftVars.find((v) => v.name === 'scriptVar').value).toBe('script-val');
    });

    test('does not re-add variable that user deleted from draft', () => {
      // User deleted "baseUrl" from draft (it exists in saved env but not in draft)
      const state = makeState({
        vars: [{ name: 'baseUrl', value: 'localhost' }],
        draftVars: [{ name: 'userDraftVar', value: 'draft-only' }]
      });
      const store = createMockStore(state);

      globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { baseUrl: 'localhost', scriptVar: 'new-from-script' }
      })(store.dispatch, store.getState);

      const draftAction = store.dispatched.find((a) => a.type === setGlobalEnvironmentDraft.type);
      const draftVars = draftAction.payload.variables;
      // baseUrl should NOT be re-added (user deleted it from draft)
      expect(draftVars.find((v) => v.name === 'baseUrl')).toBeUndefined();
      // userDraftVar should be preserved (draft-only)
      expect(draftVars.find((v) => v.name === 'userDraftVar')).toBeTruthy();
      // scriptVar should be added (new from script, not in saved env)
      expect(draftVars.find((v) => v.name === 'scriptVar').value).toBe('new-from-script');
    });

    test('does not dispatch draft update when no draft exists', () => {
      const state = makeState({ vars: [{ name: 'baseUrl', value: 'localhost' }] });
      const store = createMockStore(state);

      globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { baseUrl: 'localhost', newVar: 'val' }
      })(store.dispatch, store.getState);

      const draftAction = store.dispatched.find((a) => a.type === setGlobalEnvironmentDraft.type);
      expect(draftAction).toBeUndefined();
    });

    test('does not touch draft for a different environment', () => {
      const state = makeState({
        vars: [{ name: 'baseUrl', value: 'localhost' }],
        draftVars: [{ name: 'x', value: 'original' }]
      });
      // Override the draft to point to a different env
      state.globalEnvironments.globalEnvironmentDraft.environmentUid = 'env-other';
      const store = createMockStore(state);

      globalEnvironmentsUpdateEvent({
        globalEnvironmentVariables: { baseUrl: 'localhost', newVar: 'val' }
      })(store.dispatch, store.getState);

      const draftAction = store.dispatched.find((a) => a.type === setGlobalEnvironmentDraft.type);
      expect(draftAction).toBeUndefined();
    });
  });
});
