const LOCAL_STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function localDateNow() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function localStampNow() {
  const date = new Date();
  return `${localDateNow()}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

export function parseLocalStamp(value) {
  if (typeof value !== 'string' || !LOCAL_STAMP.test(value)) return NaN;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return NaN;
  const [day, time] = value.split('T');
  const [year, month, dateNumber] = day.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== dateNumber ||
      date.getHours() !== hours || date.getMinutes() !== minutes) return NaN;
  return date.getTime();
}

export function validPeriod(startAt, endAt, now = Date.now()) {
  const start = parseLocalStamp(startAt);
  const end = parseLocalStamp(endAt);
  return Number.isFinite(start) && Number.isFinite(end) && start > now && end > start;
}

// Half-open periods: the instant endAt is excluded.
export function periodsOverlap(aStart, aEnd, bStart, bEnd) {
  const startA = parseLocalStamp(aStart);
  const endA = parseLocalStamp(aEnd);
  const startB = parseLocalStamp(bStart);
  const endB = parseLocalStamp(bEnd);
  if (![startA, endA, startB, endB].every(Number.isFinite)) return false;
  return startA < endB && startB < endA;
}

export function rentalDays(startAt, endAt) {
  const start = parseLocalStamp(startAt);
  const end = parseLocalStamp(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  // Demonstration pricing only: any started 24-hour block counts as one day.
  return Math.ceil((end - start) / 86_400_000);
}
