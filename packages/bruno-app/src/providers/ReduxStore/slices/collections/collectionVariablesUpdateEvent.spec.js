jest.mock('nanoid', () => {
  let counter = 0;
  return {
    customAlphabet: jest.fn(() => () => {
      counter += 1;
      return `mock-uid-${counter}`;
    })
  };
});

// Mock ipcRenderer
window.ipcRenderer = {
  invoke: jest.fn().mockResolvedValue(undefined)
};

import { collectionVariablesUpdateEvent } from './actions';
import reducer from './index';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';

// Build a mock store that applies reducer actions synchronously
const createMockStore = (initialState) => {
  let state = initialState;
  const dispatched = [];

  const dispatch = (action) => {
    dispatched.push(action);
    if (typeof action === 'function') {
      return action(dispatch, () => state);
    }
    if (action.type) {
      state = {
        ...state,
        collections: {
          ...state.collections,
          collections: reducer({ collections: state.collections.collections }, action).collections
        }
      };
    }
    return action;
  };

  const getState = () => state;

  return { dispatch, getState, dispatched };
};

const makeCollection = ({ rootVars = [], draftRoot = null } = {}) => ({
  uid: 'col-1',
  name: 'Test Collection',
  pathname: '/test/collection',
  brunoConfig: { version: '1' },
  root: {
    request: {
      vars: {
        req: rootVars.map((v) => ({
          uid: `uid-${v.name}`,
          name: v.name,
          value: v.value,
          enabled: v.enabled !== false
        }))
      },
      script: { req: 'console.log("original script")' },
      headers: [{ uid: 'h1', name: 'Content-Type', value: 'application/json', enabled: true }]
    }
  },
  ...(draftRoot ? { draft: { root: draftRoot } } : {})
});

const makeState = (collection) => ({
  collections: { collections: [collection] }
});

const getCollection = (state) => state.collections.collections[0];
const getDraftVars = (state) => get(getCollection(state), 'draft.root.request.vars.req', []);
const getDraftScript = (state) => get(getCollection(state), 'draft.root.request.script.req');
const hasDraft = (state) => !!getCollection(state).draft;
const getSavedPayload = () => window.ipcRenderer.invoke.mock.calls[0]?.[2];
const getSavedVars = () => getSavedPayload()?.request?.vars?.req || [];

describe('collectionVariablesUpdateEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('adds new variable and persists to disk', () => {
    const store = createMockStore(makeState(makeCollection({
      rootVars: [{ name: 'baseUrl', value: 'localhost' }]
    })));

    collectionVariablesUpdateEvent({
      collectionVariables: { baseUrl: 'localhost', newVar: 'newVal' },
      collectionUid: 'col-1'
    })(store.dispatch, store.getState);

    // Draft should have the new var (setCollectionVars creates a draft)
    expect(hasDraft(store.getState())).toBe(true);
    expect(getDraftVars(store.getState()).find((v) => v.name === 'newVar')).toBeTruthy();

    // Disk save should include the new var
    expect(window.ipcRenderer.invoke).toHaveBeenCalled();
    expect(getSavedVars().find((v) => v.name === 'newVar').value).toBe('newVal');
  });

  test('updates existing variable value', () => {
    const store = createMockStore(makeState(makeCollection({
      rootVars: [{ name: 'baseUrl', value: 'localhost' }]
    })));

    collectionVariablesUpdateEvent({
      collectionVariables: { baseUrl: 'updated-host' },
      collectionUid: 'col-1'
    })(store.dispatch, store.getState);

    // Draft should have the updated value
    expect(getDraftVars(store.getState()).find((v) => v.name === 'baseUrl').value).toBe('updated-host');

    // Disk save should have the updated value
    expect(getSavedVars().find((v) => v.name === 'baseUrl').value).toBe('updated-host');
  });

  test('removes variable deleted by script', () => {
    const store = createMockStore(makeState(makeCollection({
      rootVars: [{ name: 'baseUrl', value: 'localhost' }, { name: 'token', value: 'abc' }]
    })));

    collectionVariablesUpdateEvent({
      collectionVariables: { baseUrl: 'localhost' },
      collectionUid: 'col-1'
    })(store.dispatch, store.getState);

    // Draft should NOT have the deleted var
    expect(getDraftVars(store.getState()).find((v) => v.name === 'token')).toBeUndefined();
    expect(getDraftVars(store.getState())).toHaveLength(1);

    // Disk save should NOT have the deleted var
    expect(getSavedVars().find((v) => v.name === 'token')).toBeUndefined();
  });

  test('keeps disabled variables untouched', () => {
    const store = createMockStore(makeState(makeCollection({
      rootVars: [
        { name: 'baseUrl', value: 'localhost' },
        { name: 'disabled', value: 'x', enabled: false }
      ]
    })));

    collectionVariablesUpdateEvent({
      collectionVariables: { baseUrl: 'localhost' },
      collectionUid: 'col-1'
    })(store.dispatch, store.getState);

    // Disabled var should still be in draft
    expect(getDraftVars(store.getState()).find((v) => v.name === 'disabled')).toBeTruthy();
    expect(getDraftVars(store.getState())).toHaveLength(2);
  });

  test('does not persist unrelated draft changes to disk', () => {
    const draftRoot = cloneDeep({
      request: {
        vars: { req: [{ uid: 'uid-baseUrl', name: 'baseUrl', value: 'localhost', enabled: true }] },
        script: { req: 'console.log("UNSAVED user script edit")' },
        headers: [{ uid: 'h1', name: 'Content-Type', value: 'application/json', enabled: true }]
      }
    });
    const store = createMockStore(makeState(makeCollection({
      rootVars: [{ name: 'baseUrl', value: 'localhost' }],
      draftRoot
    })));

    collectionVariablesUpdateEvent({
      collectionVariables: { baseUrl: 'localhost', scriptVar: 'val' },
      collectionUid: 'col-1'
    })(store.dispatch, store.getState);

    // Disk save should use the committed root script, NOT the user's unsaved draft script
    expect(getSavedPayload().request.script.req).toBe('console.log("original script")');
    expect(getSavedPayload().request.script.req).not.toContain('UNSAVED');
  });

  test('syncs script vars into existing draft without losing user edits', () => {
    const draftRoot = cloneDeep({
      request: {
        vars: { req: [{ uid: 'uid-baseUrl', name: 'baseUrl', value: 'localhost', enabled: true }] },
        script: { req: 'console.log("user draft script")' },
        headers: [{ uid: 'h1', name: 'Content-Type', value: 'application/json', enabled: true }]
      }
    });
    const store = createMockStore(makeState(makeCollection({
      rootVars: [{ name: 'baseUrl', value: 'localhost' }],
      draftRoot
    })));

    collectionVariablesUpdateEvent({
      collectionVariables: { baseUrl: 'localhost', scriptVar: 'val' },
      collectionUid: 'col-1'
    })(store.dispatch, store.getState);

    // Draft should contain the script's new var
    expect(getDraftVars(store.getState()).find((v) => v.name === 'scriptVar')).toBeTruthy();
    expect(getDraftVars(store.getState()).find((v) => v.name === 'baseUrl')).toBeTruthy();

    // Draft should still have the user's unsaved script edit
    expect(getDraftScript(store.getState())).toBe('console.log("user draft script")');
  });

  test('does not clear user draft after save', () => {
    const draftRoot = cloneDeep({
      request: {
        vars: { req: [{ uid: 'uid-baseUrl', name: 'baseUrl', value: 'localhost', enabled: true }] },
        script: { req: 'console.log("user draft")' },
        headers: []
      }
    });
    const store = createMockStore(makeState(makeCollection({
      rootVars: [{ name: 'baseUrl', value: 'localhost' }],
      draftRoot
    })));

    collectionVariablesUpdateEvent({
      collectionVariables: { baseUrl: 'localhost' },
      collectionUid: 'col-1'
    })(store.dispatch, store.getState);

    // Draft should still exist (user's unsaved script edit is preserved)
    expect(hasDraft(store.getState())).toBe(true);
    expect(getDraftScript(store.getState())).toBe('console.log("user draft")');

    // saveCollectionDraft should NOT be dispatched
    const draftClearAction = store.dispatched.find((a) => a.type === 'collections/saveCollectionDraft');
    expect(draftClearAction).toBeUndefined();
  });

  test('does nothing when collectionVariables is null', () => {
    const store = createMockStore(makeState(makeCollection({
      rootVars: [{ name: 'baseUrl', value: 'localhost' }]
    })));

    collectionVariablesUpdateEvent({ collectionVariables: null, collectionUid: 'col-1' })(store.dispatch, store.getState);

    expect(hasDraft(store.getState())).toBe(false);
    expect(window.ipcRenderer.invoke).not.toHaveBeenCalled();
  });
});
