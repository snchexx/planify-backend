export const DEFAULT_ACTIVITY_TIME_ZONE = 'America/Bogota';

export function getActivityTimeZone(): string {
  const timeZone = process.env.ACTIVITY_TIME_ZONE ?? DEFAULT_ACTIVITY_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw new Error('ACTIVITY_TIME_ZONE debe ser una zona horaria IANA válida');
  }
  return timeZone;
}

export function localDateTimeToUtc(
  date: string,
  time: string,
  timeZone = getActivityTimeZone(),
): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second = 0] = time.split(':').map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  let timestamp = localAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(timestamp))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    );
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const adjusted = localAsUtc - (representedAsUtc - timestamp);
    if (adjusted === timestamp) {
      break;
    }
    timestamp = adjusted;
  }

  return new Date(timestamp);
}
