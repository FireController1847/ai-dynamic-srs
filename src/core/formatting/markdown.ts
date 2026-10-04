// A deliberately small Markdown subset. Raw HTML is always escaped.
const escape = (value: unknown) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
function inline(text: string) {
  const tokens = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`/g;
  let result = '', offset = 0;
  for (const match of text.matchAll(tokens)) {
    result += escape(text.slice(offset, match.index));
    if (match[1]) result += `<a href="${escape(match[2])}" rel="noopener noreferrer">${escape(match[1])}</a>`;
    else if (match[3]) result += `<strong>${escape(match[3])}</strong>`;
    else if (match[4]) result += `<em>${escape(match[4])}</em>`;
    else result += `<code>${escape(match[5])}</code>`;
    offset = match.index + match[0].length;
  }
  return result + escape(text.slice(offset));
}

export function narrativeMarkdown(field: import("../schema/schema-types.ts").Field | null | undefined) {
  return field?.type === 'textarea' && field.markdown !== false && !field.reference && !field.referenceFormat
    && !/References$|ReferenceIds$/.test(field.key || '');
}

export function renderMarkdown(value: unknown) {
  const lines = String(value ?? '').replaceAll('\r\n', '\n').split('\n');
  let index = 0;
  const marker = (line: string) => /^(\s*)(?:([-+*])\s+|(\d+)[.)]\s+)(.*)$/.exec(line);
  const indent = (text: string) => text.replaceAll('\t', '    ').length;
  function list(depth: number): string {
    const first = marker(lines[index])!;
    const ordered = Boolean(first[3]);
    const tag = ordered ? 'ol' : 'ul';
    let html = `<${tag}${ordered ? ` start="${Number(first[3]) || 1}"` : ''}>`;
    while (index < lines.length) {
      const item = marker(lines[index]);
      if (!item || indent(item[1]) !== depth || Boolean(item[3]) !== ordered) break;
      html += `<li>${inline(item[4])}`;
      index++;
      while (index < lines.length && lines[index].trim()) {
        const next = marker(lines[index]);
        if (next) {
          if (indent(next[1]) <= depth) break;
          html += list(indent(next[1]));
        } else if (indent(lines[index].match(/^\s*/)?.[0] || "") > depth) {
          html += `<br>${inline(lines[index].trim())}`;
          index++;
        } else break;
      }
      html += '</li>';
    }
    return html + `</${tag}>`;
  }
  let html = '';
  while (index < lines.length) {
    if (!lines[index].trim()) { index++; continue; }
    const item = marker(lines[index]);
    if (item) { html += list(indent(item[1])); continue; }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !marker(lines[index])) paragraph.push(inline(lines[index++]));
    html += `<p>${paragraph.join('<br>')}</p>`;
  }
  return html;
}
