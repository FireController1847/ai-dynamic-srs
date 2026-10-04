import { stage, text, choice, review, requirementSection } from "./shared.ts";
import { baselineSources, operatingSource } from "./evidence.ts";

const groups = [
  {
    id: "operational", title: "Operational Quality",
    question: "What usability, supportability, compatibility, or maintainability must the established behavior have in its operating environment?",
    hints: "Consider supported environments, learning/support needs, operation and recovery procedures. Keep functionality in its existing functional requirement."
  },
  {
    id: "performance", title: "Performance and Reliability",
    question: "At what workload must the system respond, sustain capacity, remain available, or recover?",
    hints: "For speed/capacity, specify workload, units, measurement window, and passing threshold. For availability/recovery, specify the period, exclusions, recovery time and acceptable data loss where relevant."
  },
  {
    id: "security", title: "Security and Privacy",
    question: "Which established roles may access which information or actions, in what circumstances, and how is protection verified?",
    hints: "Use actor IDs and documented data boundaries. Consider authorization, confidentiality and audit evidence; cite behavioral access checks instead of duplicating them."
  },
  {
    id: "cultural-political", title: "Cultural and Political Requirements",
    question: "What language, accessibility, organizational policy, or jurisdiction-specific obligations are actually supported by the evidence?",
    hints: "Name the affected audience and authoritative source. Confirm applicability and version with the responsible party; do not copy Sunland's legal or geographic assumptions."
  }
];

export const qualityAttributesStage = stage(
  "srs-quality-attributes", "qualityAttributes", "Quality Attributes",
  "Ask how well the established behavior must work. Derive measurable expectations from actual use, rather than starting a generic wish list.",
  groups.map(({ id }) => `quality-requirements.${id}`), [...baselineSources, operatingSource],
  groups.flatMap(({ id, title, question, hints }) => [
    review(`${id}-review`, `${title} Review`, `quality-requirements.${id}`, question),
    {
      ...requirementSection(id, title, `quality-requirements.${id}`, "Quality", [
        text("measurementConditions", "Operating / measurement conditions", { placeholder: hints }),
        choice("targetAgreement", "Target agreement", ["Proposed", "Agreed", "Needs evidence"], { default: "Proposed" }),
        text("targetAuthority", "Target source or agreement authority", { type: "text", placeholder: "Who established this target, with what evidence/date?" })
      ]),
      description: `${hints} Add only supported obligations. A justified review with no additional requirements is valid.`
    }
  ]),
  "Follow the course's operational, performance (including reliability), security, and cultural/political categories. Derive qualities from existing goals, operating conditions, and use cases. Specify observable acceptance under stated conditions; propose missing thresholds as questions, not facts. Cite functional requirements for behavioral mechanisms rather than copying them. Review each category and justify non-applicability.",
  [
    { title: "Challenge a real scenario", text: "Ask what would make an existing use case unacceptable: slow response, downtime, confusing interaction, unauthorized access, or an unmet supported policy." },
    { title: "Agree on observable quality", text: "Record the condition, measure, acceptance result and authority. A number without a workload, time window, or agreement is not a complete target." },
    { title: "Reconcile and prioritize", text: "Check feasibility and conflicts with other requirements. Keep proposed targets visibly proposed and carry unresolved decisions to Assumptions & Dependencies." }
  ]
);
