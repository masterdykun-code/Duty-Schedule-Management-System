export function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromIso(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysIso(value, days) {
  const date = dateFromIso(value);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

export function currentWeekStartIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatIsoDate(date);
}

export function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const date = dateFromIso(value);
  return formatIsoDate(date) === value;
}

export function getRequestedWeekStart(value) {
  if (!value) {
    return currentWeekStartIso();
  }

  if (!isValidIsoDate(value)) {
    return null;
  }

  return value;
}
