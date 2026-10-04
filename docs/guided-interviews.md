# Guided interviews and form handoff

[AI prompt contract](ai-prompts.md) is the authoritative definition of every copied prompt. This guide describes using and manually reviewing that workflow.

Copy the tab's AI guided interview into the project's existing AI conversation. It contains the full current-tab form structure, eligible records, nested children, and current answers so the AI can account for every applicable item. Earlier connected-project evidence stays outside the interview; use reliable prior conversation history or project memory for those facts. The AI explains unfamiliar terms, gathers missing information naturally, resolves contradictions, and tracks coverage before handing off to the app's scoped form prompts.

Create agreed new entries in the app, then paste the requested section, parent-group, record, or nested-item prompt into the same conversation. It supplies the exact input contract and returns complete supported answers for that scope. It does not interview again or return only changed values. Unsupported required answers are blank with a separate **Needs information** note. Review the response before entering it; the app does not import or apply AI output automatically.

If the inventory changes, copy a fresh tab prompt. A previous copied prompt cannot know records added later.

## Manual review — not run

1. Copy a populated Use Cases tab with 15 entries, blank required values, actor groups, and relationships. Confirm all 15 IDs, current answers, child contracts, choices, and conditions appear without truncation. In the AI conversation, expect coverage of every applicable entry and a handoff naming the appropriate copy controls.
2. Repeat with an empty catalog and a newly added blank record. Expect a complete record template and supported discovery of additions, without fabricated entries or new IDs. Copy a fresh prompt after adding an entry.
3. Copy a whole-section prompt, one parent group's prompt, one record prompt, and one nested-item prompt from the same tab. Confirm the requested outputs match their scopes, include exact labels and child formats, and return complete supported values without follow-up questions or an update-only response.
4. Exercise nested note references, the optional note change explanation, annual CBA values, multiple record links, Detailed Descriptions' conditional flows, and quality/interface applicability. Confirm child paths and conditional contracts are explicit; app-created edit history is excluded, and optional, read-only, automatic, retired, and ineligible fields are handled consistently.
5. Compare an interview with the subsequent form prompt. The interview includes complete current-tab answers and excludes earlier-source excerpts/calculated financial enrichment. Form prompts retain complete selected evidence, exact reference choices, and CBA/FSA calculated results. Neither includes diagram payloads or tooltip text.
6. Try one unsupported required fact and an unavailable reference. The interview should ask for the missing fact; the form prompt should leave the input blank with a separate **Needs information** note, without a question, invented ID, or `N/A` filler. Existing saved values must remain intact until the user changes them.
7. Review copied prompts from CR, SR, CBA, FSA, all implemented SRS stages, Effort Breakdown, and General Notes. Confirm their task guidance follows the shared two-job contract, including specialized actor/goal editing. Empty optional collections must not force fabricated records.

No builds, tests, automated checks, browser sessions, or real-model evaluations were run for this pass. Application version is `0.4.1-alpha`; workspace format remains 2.

Diagram sections/figures use a dedicated semantic generation response rather than formatted metadata answers. Follow [AI-generated diagrams](ai-diagrams.md) for selected evidence, one fenced dsrs-diagram JSON response, upload/import replacement and shared rendering checks. Ordinary interviews and metadata scopes must still exclude stored file contents.
