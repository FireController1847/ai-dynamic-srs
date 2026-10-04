// Capture the rendered page, not the interactive viewer or its serialized source.
export async function printableContent(content: HTMLElement) {
  const deadline = Date.now() + 20000;
  while (content.querySelector('[data-diagram-state="loading"]')) {
    if (Date.now() > deadline) throw new Error("Wait for the diagram previews to finish loading before printing.");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (content.querySelector('[data-diagram-state="error"]')) {
    throw new Error("A diagram preview is unavailable. Reopen the preview or replace its file before printing.");
  }
  await Promise.all([...content.querySelectorAll<HTMLImageElement>(".document-diagram img")].map(async (image) => {
    if (image.decode) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          image.decode(),
          new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("A diagram image did not finish loading.")), 10000); })
        ]);
      } finally { clearTimeout(timeout); }
    }
  }));
  if (!content.isConnected) throw new Error("The preview changed while preparing to print. Try again on the current tab.");
  const clone = content.cloneNode(true) as HTMLElement;
  const originals = [...content.querySelectorAll(".drawio-preview-frame svg")];
  clone.querySelectorAll(".drawio-preview-frame").forEach((frame, index) => {
    const svg = frame.querySelector("svg");
    if (!svg) throw new Error("The DrawIO diagram has no rendered page to print.");
    const bounds = originals[index]?.getBoundingClientRect();
    const width = bounds?.width || parseFloat(svg.getAttribute("width") || "");
    const height = bounds?.height || parseFloat(svg.getAttribute("height") || "");
    if (!svg.hasAttribute("viewBox") && width > 0 && height > 0) svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.cssText = "display:block;width:100%;height:auto;max-height:7in;";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    frame.replaceWith(svg);
  });
  clone.querySelectorAll("script, iframe, object, embed").forEach((node) => node.remove());
  clone.querySelectorAll("*").forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (/^on/i.test(attribute.name) || (/href$/i.test(attribute.name) && /^\s*javascript:/i.test(attribute.value))) {
        node.removeAttribute(attribute.name);
      }
    }
  });
  return clone.outerHTML;
}
