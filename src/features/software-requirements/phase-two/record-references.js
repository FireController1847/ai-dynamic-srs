export const actorReference = {
  dataPath: ["softwareRequirementsSpecification", "records", "actors"],
  displayId: { prefix: "SRS-ACT-", padding: 3 },
  labelField: "name"
};

// Editing contexts only: records retain their independent canonical IDs.
export const primaryActorGrouping = {
  fieldKey: "primaryActorId", reference: actorReference, label: "Primary actor",
  recordFilter: { key: "status", in: ["Candidate", "Confirmed", "Needs clarification"] },
  description: "Add use cases beneath the actor seeking the result. The primary actor link is assigned automatically; supporting actors and goals remain separate references.",
  emptyText: "Add an actor in Actors & Goals before adding its use cases.",
  ungroupedTitle: "Use cases needing a primary actor"
};
