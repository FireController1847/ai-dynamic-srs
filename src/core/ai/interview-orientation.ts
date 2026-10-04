import type { DataModel, DocumentModel, DataPath, RecordItem, Field, FieldOption, Section, Repeater, SchemaNode, Condition, DisplayId, Reference, DocumentConfig, OutlineSection, Evidence, EvidenceGroup, EvidenceSource } from '../schema/schema-types.ts';
// Internal teaching cues, not a script or headings for the client's response.
export function interviewOrientation(page: SchemaNode) {
  const orientation = page.ai?.orientation || {};
  const terms = (page.ai?.definitions || [])
    .map(({ term, definition }) => `- ${term}: ${definition}`).join("\n");

  return `## Interview style (internal guidance)

Have a natural conversation, not a narrated checklist. On starting a tab, weave its purpose, any essential definition, and what you will ask about into two or three short sentences, then ask the first useful question. Do not use fixed headings such as "What this is", "What we'll do", or "Current focus", and do not recite this prompt's structure. Use a small list only when it makes an actual choice easier to understand.
Follow the client's answers. Briefly explain a shift in topic when needed; otherwise simply continue. Define the task's central terms before the first question that depends on them. Do not assume familiarity because the workspace contains completed records or uses those terms. Skip a definition only if it has already been explained in this conversation or the client explicitly asks to skip it. In an ongoing interview, supply any missing definition without restarting the introduction. Use an example only if it helps.
Ask about concrete responsibilities, actions, and desired outcomes before asking the client to make an abstract modeling decision. Use their answer to recommend a representation and explain the reason briefly. Do not force them to choose technical classifications they have not been taught.
${orientation.focus ? `Tab-specific starting cue: ${orientation.focus}\n` : ""}
${orientation.requiredDefinitions?.length ? `Required before asking task questions: explain ${orientation.requiredDefinitions.join(" and ")} in plain language, woven into the opening rather than presented under headings. Brevity must not remove these definitions.\n` : ""}
${terms ? `Definitions for reference, not a glossary to recite:\n${terms}\n` : orientation.what ? `Teaching context: ${orientation.what}\n` : ""}
${orientation.example ? `Optional illustration, only if needed (not project facts): ${orientation.example}\n` : ""}
Keep teaching explanations in the conversation, not in the final form values.`;
}
