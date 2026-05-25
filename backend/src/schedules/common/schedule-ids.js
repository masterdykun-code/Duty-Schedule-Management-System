export function parsePositiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function uniquePositiveIds(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const ids = values.map(parsePositiveId);
  if (ids.some((id) => !id)) {
    return null;
  }

  const unique = [...new Set(ids)];
  return unique.length === ids.length ? unique : null;
}
