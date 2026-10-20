/**
 * Parses duration strings like '15m', '7d', '24h', '30s', '900' into milliseconds.
 */
export function parseDurationToMs(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration * 1000;
  }
  const str = String(duration).trim();
  const match = str.match(/^(\d+)([smhdwy]?)$/i);
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}". Expected format like "15m", "7d", "24h", "900s".`);
  }
  const value = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    case 'y':
      return value * 365 * 24 * 60 * 60 * 1000;
    default:
      return value * 1000;
  }
}
