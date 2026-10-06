/**
 * Construct the .well-known/change-password URL for a given website string.
 * Used across MonitoringSection and AuditSection for "change at site" links.
 */
export function getChangePasswordUrl(website: string): string {
  let host = website.trim();
  if (!host.startsWith("http://") && !host.startsWith("https://")) {
    host = `https://${host}`;
  }
  try {
    const url = new URL(host);
    return `${url.origin}/.well-known/change-password`;
  } catch {
    return `https://${website}/.well-known/change-password`;
  }
}
