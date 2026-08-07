/**
 * Trigger a browser download for a Blob with a given filename.
 */
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Extract a filename from a Content-Disposition header if present.
 */
export function filenameFromDisposition(disposition, fallback) {
    if (!disposition) return fallback;
    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    return match ? match[1].replace(/"/g, '') : fallback;
}
