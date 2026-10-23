/** Standard local browser download; no remote server or filesystem permission. */
export function downloadText(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    // Safari/mobile browsers may consume the URL after the click handler.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
