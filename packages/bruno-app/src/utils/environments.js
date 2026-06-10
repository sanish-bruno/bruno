import { uuid } from './common/index';

const stripEphemeralMetadata = (v) => {
  const { ephemeral, persistedValue, ...rest } = v || {};
  return rest;
};

/*
 Build variables suitable for persisting to disk.
 Strips internal metadata (ephemeral, persistedValue) that should not be written to the environment file.
*/
export const buildPersistedEnvVariables = (variables) => {
  const src = Array.isArray(variables) ? variables : [];
  return src.map(stripEphemeralMetadata);
};

export const buildEnvVariable = ({ envVariable: obj, withUuid = false }) => {
  let envVariable = {
    name: obj.name ?? '',
    value: !!obj.secret ? '' : (obj.value ?? ''),
    type: 'text',
    enabled: obj.enabled !== false,
    secret: !!obj.secret
  };

  if (!withUuid) {
    return envVariable;
  }

  return {
    uid: uuid(),
    ...envVariable
  };
};

/**
 * Strips the UID from an environment variable for comparison purposes.
 * This is useful when comparing variables where UIDs may differ but the actual data is the same.
 */
export const stripEnvVarUid = (variable) => {
  const { name, value, type, enabled, secret } = variable;
  return { name, value, type, enabled, secret };
};

// --- Script/draft/saved variable conflict resolution utilities ---

const defaultMakeVar = (name, value) => ({
  uid: uuid(),
  name,
  value,
  type: 'text',
  enabled: true,
  secret: false
});

/**
 * Filters out "__name__" from script vars and returns entries + a Set of valid names.
 */
function normalizeScriptVars(scriptVars) {
  const entries = Object.entries(scriptVars || {}).filter(([key]) => key !== '__name__');
  const names = new Set(entries.map(([key]) => key));
  return { entries, names };
}

/**
 * Merges script execution results into the saved (committed) variable array.
 *
 * Rules:
 * - UPDATE: var in saved AND script → update value
 * - ADD: var in script but NOT saved → add
 * - DELETE: var in saved but NOT script AND enabled → remove
 * - KEEP: disabled vars always kept
 *
 * @param {Array} savedVars - The committed/on-disk variable array
 * @param {Object} scriptVars - Flat { name: value } map from script execution (__name__ ignored)
 * @param {Object} [options]
 * @param {function} [options.coerceValue] - Transform applied to script values (default: identity)
 * @param {function} [options.makeVar] - Factory for new var objects, receives (name, value)
 * @returns {Array} New saved vars array (input not mutated)
 */
export function mergeScriptVarsIntoSaved(savedVars, scriptVars, options = {}) {
  const { coerceValue = (v) => v, makeVar = defaultMakeVar } = options;
  const { entries, names: scriptVarNames } = normalizeScriptVars(scriptVars);
  const vars = (savedVars || []).map((v) => ({ ...v }));

  for (const [name, rawValue] of entries) {
    const value = coerceValue(rawValue);
    const existing = vars.find((v) => v.name === name);
    if (existing) {
      existing.value = value;
    } else {
      vars.push(makeVar(name, value));
    }
  }

  return vars.filter((v) => !v.enabled || scriptVarNames.has(v.name));
}

/**
 * Merges script execution results into the draft variable array.
 *
 * Rules:
 * - UPDATE: var in draft AND script → update value
 * - ADD: var in script AND NOT in preMutationSavedVarNames → add (genuinely new)
 * - DON'T RE-ADD: var in preMutationSaved AND script but NOT draft → user deleted, respect it
 * - DELETE: var in preMutationSaved AND draft but NOT script → script deleted it
 * - KEEP: draft-only vars (not in preMutationSaved, not in script) → user's unsaved addition
 * - KEEP: disabled vars always kept
 *
 * @param {Array} draftVars - The user's unsaved edits array
 * @param {Object} scriptVars - Flat { name: value } map from script execution (__name__ ignored)
 * @param {Set} preMutationSavedVarNames - Var names that existed in saved state before mutation
 * @param {Object} [options]
 * @param {function} [options.coerceValue] - Transform applied to script values (default: identity)
 * @param {function} [options.makeVar] - Factory for new var objects, receives (name, value)
 * @returns {Array} New draft vars array (input not mutated)
 */
export function mergeScriptVarsIntoDraft(draftVars, scriptVars, preMutationSavedVarNames, options = {}) {
  const { coerceValue = (v) => v, makeVar = defaultMakeVar } = options;
  const { entries, names: scriptVarNames } = normalizeScriptVars(scriptVars);
  const vars = (draftVars || []).map((v) => ({ ...v }));

  for (const [name, rawValue] of entries) {
    const value = coerceValue(rawValue);
    const existing = vars.find((v) => v.name === name);
    if (existing) {
      existing.value = value;
    } else if (!preMutationSavedVarNames.has(name)) {
      vars.push(makeVar(name, value));
    }
  }

  return vars.filter((v) =>
    !v.enabled || scriptVarNames.has(v.name) || !preMutationSavedVarNames.has(v.name)
  );
}
