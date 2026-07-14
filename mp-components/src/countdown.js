function normalizeRemaining(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

const pad = (value) => String(value).padStart(2, '0');

export function getCountdownParts(remaining) {
  const milliseconds = normalizeRemaining(remaining);
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  return {
    remaining: milliseconds,
    totalSeconds,
    totalMinutes,
    totalHours,
    days,
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
    seconds: totalSeconds % 60,
  };
}

export function formatCountdown(remaining, format = 'HH:mm:ss') {
  const parts = getCountdownParts(remaining);
  const template = typeof format === 'string' && format ? format : 'HH:mm:ss';
  const includeDays = template.includes('DD');
  const values = {
    DD: pad(parts.days),
    HH: pad(includeDays ? parts.hours : parts.totalHours),
    mm: pad(parts.minutes),
    ss: pad(parts.seconds),
  };

  return template.replace(/DD|HH|mm|ss/gu, (token) => values[token]);
}
