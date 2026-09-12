/**
 * Money comes from the API as whole paise (₹1 = 100 paise) so nothing is ever lost to rounding.
 * These helpers are the only place that turns it into something people read or type.
 */

/** 123456 → "₹1,234.56" (or "₹1,235" with decimals off). */
export function formatInr(paise: number, options: { decimals?: boolean } = {}): string {
    const decimals = options.decimals ?? true;
    const sign = paise < 0 ? "-" : "";
    const abs = Math.abs(Math.round(paise));
    const rupees = Math.floor(abs / 100);
    const whole = rupees.toLocaleString("en-IN");
    if (!decimals) return `${sign}₹${(abs % 100 >= 50 ? rupees + 1 : rupees).toLocaleString("en-IN")}`;
    return `${sign}₹${whole}.${String(abs % 100).padStart(2, "0")}`;
}

/** A rate in paise per minute as people say it: "₹5.00/min". */
export function formatRate(paisePerMinute: number): string {
    return `${formatInr(paisePerMinute)}/min`;
}

/** What someone typed in rupees ("1,500" or "1500.50") as paise; null if it isn't a number. */
export function paiseFromRupees(input: string): number | null {
    const cleaned = input.replace(/[,\s₹]/g, "");
    if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === "" || cleaned === "-") return null;
    return Math.round(Number(cleaned) * 100);
}

/** 3725 seconds → "1h 2m", 95 → "1m 35s", 0 → "0s" */
export function formatDuration(seconds: number): string {
    const total = Math.max(Math.round(seconds), 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${total % 60}s`;
    return `${total}s`;
}
