/**
 * Money is stored in minor units (kopiyky) so it never touches a float.
 * This is the only place that turns it back into something a person reads.
 */
const formatter = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

export function formatHryvnia(minorUnits: number): string {
  return `${formatter.format(Math.round(minorUnits / 100))} ₴`;
}
