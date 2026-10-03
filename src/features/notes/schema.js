export const notesSchema = {
  id: "general-notes",
  stateKey: "generalNotes",
  code: "GN",
  label: "General Notes (GN)",
  title: "General Notes",
  description: "Maintain one traceable, living notebook of facts, decisions, questions, research, and project observations.",
  engine: "notes",
  formComponent: "notes-form",
  previewComponent: "notes-preview",
  form: {
    kicker: "Living project record",
    intro: "Add a note to the running list. References and meaningful edit explanations are optional.",
    showCompletion: false,
    fullWidth: true
  },
  guide: {
    title: "How to maintain General Notes",
    summary: "Each note is simply one item in a running, skimmable list.",
    collapsed: true,
    steps: [
      { title: "Write the note", text: "The note text is the only required information. Its creation date is recorded automatically; no title is needed." },
      { title: "Add sources when useful", text: "Optionally attach any number of references directly to the note." },
      { title: "Explain meaningful changes", text: "When an edit changes the note's meaning, optionally explain why. The builder will add that explanation to the dated edit history." }
    ],
    termsTitle: "Notebook terms",
    terms: [
      { term: "Reference", definition: "Evidence or provenance for a note, such as a meeting and timestamp, document and page, message, dataset, diagram, or web address." },
      { term: "Edit history", definition: "An optional dated explanation of a meaningful change to a note." }
    ]
  },
  ai: {
    definitions: [
      { term: "Reference", definition: "A source or precise locator supporting a note." },
      { term: "Edit history", definition: "A dated explanation of a meaningful revision that actually occurred." }
    ],
    draftingGuidance: "Treat General Notes as a traceable living notebook, not as a formal requirements specification. Keep one coherent subject per note, preserve the user's wording where meaningful, distinguish facts from interpretations and open questions, and attach each source only to the note it supports. Do not fabricate reference details, dates, authors, related IDs, or edit history. An edit-history record is appropriate only for a meaningful revision that actually occurred; it must state what changed and why.",
    interviewGuidance: "Review existing workspace content first and identify noteworthy facts, decisions, questions, risks, observations, and research that do not already have a better canonical home. Ask for the exact source locator for each claim when available. When reviewing an existing note, confirm its current status and ask whether a meaningful change needs a dated edit explanation. Avoid turning the notebook into a duplicate requirements catalog."
  },
  document: {
    titleField: "projectName",
    organizationField: "clientOrganization",
    versionField: "version",
    metadata: [
      { key: "maintainedBy", label: "Maintained by" },
      { key: "lastReviewDate", label: "Last reviewed", format: "date" },
      { key: "version", label: "Version" }
    ]
  },
  sections: [
    {
      id: "notebook-details",
      key: "notebookDetails",
      title: "Notebook details",
      description: "Define who maintains this notebook, what belongs in it, and how it is reviewed.",
      includeInPreview: false,
      help: "Identify who maintains the notebook, its purpose and any useful review convention. Project identity comes from Client Requirements. The last-review date describes a review of the whole notebook; individual changes belong in each note’s edit history.",
      fields: [
        {
          key: "maintainedBy",
          label: "Maintained by",
          type: "text",
          default: "",
          columns: "col-md-6",
          placeholder: "Person or team responsible for the notebook",
          completion: false,
          aiHint: "Identify the accountable maintainer; do not infer a person from unrelated project roles."
        },
        {
          key: "version",
          label: "Working version",
          type: "text",
          default: "0.1",
          columns: "col-md-3",
          placeholder: "0.1",
          completion: false,
          aiHint: "Preserve the supplied version or leave the builder's default in place."
        },
        {
          key: "lastReviewDate",
          label: "Last reviewed",
          type: "date",
          default: "",
          columns: "col-md-3",
          helpText: "The date someone reviewed the notebook as a whole; individual note edits belong in each note's edit history.",
          aiHint: "Use only a confirmed notebook review date, not the current date by assumption."
        },
        {
          key: "notebookPurpose",
          label: "Notebook purpose and scope",
          type: "textarea",
          rows: 3,
          default: "",
          columns: "col-12",
          placeholder: "What this notebook should capture and what should be maintained elsewhere",
          completion: false,
          aiHint: "Define the notebook as supporting context and traceable working knowledge; avoid duplicating canonical requirements, financial models, or approved specifications."
        },
        {
          key: "maintenanceConvention",
          label: "Maintenance convention",
          type: "textarea",
          rows: 2,
          default: "",
          columns: "col-12",
          placeholder: "How entries are reviewed, linked, cited, resolved, superseded, and meaningfully edited",
          aiHint: "State any confirmed project convention. A sound default is to keep current note text in the body and append dated explanations for meaningful edits."
        }
      ]
    },
    {
      id: "notebook-entries",
      key: "notebookEntries",
      title: "Notebook entries",
      description: "Add, edit, source, connect, and maintain the individual notes that make up the combined notebook.",
      help: "Write one coherent note per item, keeping its body as the current understanding. A note needs no title or classification. Add sources directly to the note when useful, and explain a meaningful change in its dated edit history. Minor spelling fixes need no history entry.",
      repeatable: {
        dataKey: "notes",
        itemLabel: "Note",
        addLabel: "Add note",
        minimum: 1,
        displayId: { prefix: "GN-NOTE-", padding: 3 },
        completionFields: ["body"],
        aiAddendum: "Create a separate note for each materially different subject. References and edit-history entries are nested beneath the note they belong to. It is valid for a note to have no reference or edit-history record when none exists; do not manufacture either.",
        fields: [
          {
            key: "body",
            label: "Note",
            type: "textarea",
            rows: 5,
            default: "",
            columns: "col-12",
            placeholder: "Record the current fact, decision, question, observation, risk, or supporting context",
            helpText: "Keep this as the current understanding. When a meaningful edit changes it, add an Edit history record below explaining what changed and why.",
            aiHint: "Write a clear current-state note. Distinguish confirmed facts, quoted or paraphrased stakeholder statements, analysis, assumptions, and unresolved questions."
          },
          {
            key: "references",
            label: "References",
            type: "nested-records",
            default: [],
            columns: "col-12",
            itemLabel: "Reference",
            addLabel: "Add reference",
            minimum: 0,
            emptyText: "No references added. Add one whenever a source, meeting, document, link, or precise locator supports this note.",
            description: "Attach any number of sources directly to this note.",
            aiHint: "Keep each distinct source in its own record. Omit the collection when the note has no known source; never invent a citation.",
            fields: [
              {
                key: "title",
                label: "Reference name",
                type: "text",
                default: "",
                columns: "col-md-7",
                placeholder: "Meeting, document, message, dataset, diagram, or webpage",
                aiHint: "Give the source a recognizable, stable name."
              },
              {
                key: "type",
                label: "Source type",
                type: "select",
                default: "",
                columns: "col-md-5",
                placeholder: "Select a source type",
                options: ["Meeting or interview", "Document", "Email or message", "Webpage", "Dataset", "Diagram or model", "Observation", "Other"],
                advanced: true,
                aiHint: "Choose the source's actual format or origin."
              },
              {
                key: "locator",
                label: "Link or locator",
                type: "text",
                default: "",
                columns: "col-md-7",
                placeholder: "URL, file name, meeting ID, page, section, timestamp, or record key",
                aiHint: "Provide the most precise locator available, including page, section, timestamp, or record identifier when relevant."
              },
              {
                key: "asOfDate",
                label: "Source date / as of",
                type: "date",
                default: "",
                columns: "col-md-5",
                advanced: true,
                aiHint: "Use the date the source was created, observed, accessed, or known to be current, as appropriate and only when confirmed."
              },
              {
                key: "notes",
                label: "Reference notes",
                type: "textarea",
                rows: 2,
                default: "",
                columns: "col-12",
                advanced: true,
                placeholder: "Relevant excerpt context, speaker, access note, or limits of the source",
                aiHint: "Explain what part of the source supports the note or any limitation that affects interpretation; do not paste lengthy source text."
              }
            ]
          },
          {
            key: "editHistory",
            label: "Edit history",
            type: "nested-records",
            default: [],
            columns: "col-12",
            itemLabel: "Edit",
            addLabel: "Record meaningful edit",
            minimum: 0,
            emptyText: "No meaningful edits recorded. Minor spelling or formatting fixes do not need an entry.",
            description: "Append a dated explanation when the note's meaning, status, evidence, or conclusion changes.",
            aiHint: "Create an edit record only for a real, meaningful revision. Never backfill invented dates, editors, changes, or reasons.",
            fields: [
              {
                key: "editedDate",
                label: "Edited date",
                type: "date",
                default: "",
                columns: "col-md-4",
                aiHint: "Use the actual date of the meaningful edit."
              },
              {
                key: "editedBy",
                label: "Edited by",
                type: "text",
                default: "",
                columns: "col-md-8",
                placeholder: "Person or team making the edit",
                aiHint: "Identify the editor only when known."
              },
              {
                key: "changeSummary",
                label: "What changed",
                type: "textarea",
                rows: 2,
                default: "",
                columns: "col-md-6",
                placeholder: "Concise description of the meaningful revision",
                aiHint: "Summarize the changed meaning, status, evidence, or conclusion without reproducing the entire note."
              },
              {
                key: "reason",
                label: "Why it changed",
                type: "textarea",
                rows: 2,
                default: "",
                columns: "col-md-6",
                placeholder: "Correction, new evidence, client clarification, decision, or other reason",
                aiHint: "State the reason for the change and identify the triggering clarification, evidence, or decision when known."
              }
            ]
          }
        ]
      }
    }
  ]
};
