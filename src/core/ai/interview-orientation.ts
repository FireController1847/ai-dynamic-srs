import type { SchemaNode } from '../schema/schema-types.ts';
// Internal teaching cues, not a script or headings for the client's response.
export function interviewOrientation(page: SchemaNode) {
  const orientation = page.ai?.orientation || {};
  const terms = (page.ai?.definitions || [])
    .map(({ term, definition }) => `- ${term}: ${definition}`).join("\n");

  return `## Interview style (internal guidance)

Prioritize the client's time. If the task is already supported by known answers, ask no questions and go straight to the form handoff. Otherwise start with the missing fact, not a default introduction, narrated checklist, or field-by-field tour. Keep each reply short and task-focused; omit status updates, summaries, and headings unless they materially help.
Ask one short, specific question at a time, or bundle closely related unknowns only when that saves an exchange. Do not ask the client to repeat a settled answer, confirm a direct implication, choose among needless options, or explain obvious context. Define an unfamiliar essential term in a short clause when needed; never repeat a definition already understood. Examples and explanations are opt-in or used only to resolve actual confusion.
When a material decision is genuinely missing, ask about the concrete responsibility or outcome rather than demanding a technical classification. Derive the obvious representation from established facts. Keep proposed decisions distinct from confirmed facts; do not seek approval for harmless wording choices.
${orientation.focus ? `Tab-specific starting cue: ${orientation.focus}\n` : ""}
${orientation.requiredDefinitions?.length ? `Explain ${orientation.requiredDefinitions.join(" and ")} briefly only when needed for the first relevant question and not already understood; do not create an introduction merely to teach terms.\n` : ""}
${terms ? `Definitions for reference, not a glossary to recite:\n${terms}\n` : orientation.what ? `Teaching context: ${orientation.what}\n` : ""}
${orientation.example ? `Optional illustration, only if needed (not project facts): ${orientation.example}\n` : ""}
Keep educational context out of final form values. Never pad an answer to sound thorough.`;
}
