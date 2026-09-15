const pairs = (items) => items.map((i) => `${i.key}=${i.value}`).join('; ');

const httpWire = (items) => {
  const enabled = items.filter((h) => !h.disabled);
  if (enabled.length === 0) return '';
  return enabled.map((h) => `${h.key}: ${h.value}`).join('\n') + '\n';
};

const metadataLines = (items) => items.map((i) => `${i.key}: ${i.value}`).join('\n');

const lastWins = (items) => {
  const result = {};
  for (const item of items) {
    result[item.key] = item.value;
  }
  return result;
};

// Postman's PropertyList.toObject(excludeDisabled, caseSensitive, multiValue, sanitizeKeys)
const postmanHeaders = (items, excludeDisabled, caseSensitive, multiValue, sanitizeKeys) => {
  const result = {};
  for (const item of items) {
    if (excludeDisabled && item.disabled) continue;
    const key = caseSensitive === false ? item.key.toLowerCase() : item.key;
    if (sanitizeKeys && !key) continue;
    if (multiValue) {
      if (!(key in result)) {
        result[key] = item.value;
      }
    } else {
      result[key] = item.value;
    }
  }
  return result;
};

module.exports = { pairs, httpWire, metadataLines, lastWins, postmanHeaders };
