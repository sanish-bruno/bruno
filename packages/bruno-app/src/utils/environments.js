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
