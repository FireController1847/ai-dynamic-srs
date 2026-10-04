/** Saved values are deliberately open: schemas own vocabulary, not the persistence layer. */
export type DataModel = Record<string, unknown>;
export type DocumentModel = Record<string, DataModel>;
export type DataPath = string | readonly string[];
export interface RecordItem extends DataModel { id: number; _retired?: boolean; retired?: boolean; }
export interface DisplayId { prefix: string; padding: number; }
export interface Condition { key?: string; equals?: unknown; in?: readonly unknown[]; notIn?: readonly unknown[]; notEmpty?: boolean; all?: Condition[]; }
export interface Reference { dataPath: DataPath; displayId?: DisplayId; labelField: string; recordFilter?: Condition; }
export type FieldOption = string | number | { value: unknown; label: string };
export interface Field {
  [key: string]: unknown;
  key: string; label: string; type?: string; default?: unknown;
  fields?: Field[]; options?: FieldOption[]; reference?: Reference;
  columns?: string; placeholder?: string; helpText?: string; aiHint?: string;
  completion?: boolean; includeInPreview?: boolean; includeInPrompt?: boolean;
  showWhen?: Condition; editable?: boolean; hidden?: boolean; optional?: boolean;
  hideLabel?: boolean; advanced?: boolean; markdown?: boolean;
  rows?: number; min?: number; max?: number; step?: string | number;
  minimum?: number; itemLabel?: string; addLabel?: string; emptyText?: string;
  collectionPath?: DataPath; artifactField?: string; dateDocument?: string;
  referenceFormat?: string; format?: string; preserveWhenHidden?: boolean;
  documentNumber?: string;
}
export interface ParentConfig {
  fieldKey: string; label: string; reference: Reference; recordFilter?: Condition;
  allowUngrouped?: boolean; preserveFreeform?: boolean; ungroupedTitle?: string;
  ungroupedDescription?: string; ungroupedAddLabel?: string; unassignedOption?: string;
  relationshipLabel?: string; description?: string; emptyText?: string;
}
export interface Repeater {
  [key: string]: unknown;
  dataKey: string; fields: Field[]; itemLabel?: string; addLabel?: string;
  minimum?: number; completionMinimum?: number; completionFields?: string[];
  completionMode?: string; primaryField?: string; displayId?: DisplayId;
  recordFilter?: Condition; parent?: ParentConfig; initialItems?: DataModel[];
  allowAdd?: boolean; allowRemove?: boolean; artifactField?: string;
  stableIds?: boolean; previewStyle?: string; previewLayout?: string; emptyText?: string; aiAddendum?: string;
}
export interface Help { text?: string; what?: string; why?: string; expectation?: string; }
export interface AiDefinition { term: string; definition: string; }
export interface AiGuidance {
  [key: string]: unknown;
  task?: string; definitions?: AiDefinition[]; draftingGuidance?: string;
  interviewGuidance?: string; includeSiblingContext?: boolean; compactInterview?: boolean;
  orientation?: { focus?: string; example?: string; what?: string; plan?: string; requiredDefinitions?: string[] };
}
export interface Section {
  [key: string]: unknown;
  id: string; key: string; title: string; description?: string;
  fields?: Field[]; repeatable?: Repeater; dataPath?: DataPath;
  help?: string | Help; ai?: AiGuidance; includeInPreview?: boolean;
  documentTarget?: string; documentSubsection?: number; documentNumber?: string;
  previewTitle?: string; numberFields?: boolean; columns?: string;
}
export interface EvidenceGroup { sectionId: string; title?: string; fieldKeys?: string[]; recordFieldKeys?: string[]; }
export interface EvidenceSource {
  pageId: string; nodeId?: string; dataPath?: DataPath; reason?: string; referenceRole?: string;
  groups?: EvidenceGroup[]; subpageSelections?: Record<string, string>;
}
export interface Evidence { kicker?: string; title?: string; summary?: string; sources: EvidenceSource[]; interviewSources?: EvidenceSource[]; }
export interface GuideStep { title: string; text: string; }
export interface Guide {
  [key: string]: unknown; title?: string; summary?: string; paragraphs?: string[]; steps?: GuideStep[]; terms?: AiDefinition[]; }
export interface OutlineSection { key: string; title: string; number?: string; numbered?: boolean; sections?: OutlineSection[]; }
export interface DocumentConfig {
  [key: string]: unknown;
  title?: string; titleField?: string; versionField?: string; dateField?: string;
  contextFallbackFields?: string[]; outline?: OutlineSection[];
  authorField?: string; statusField?: string; code?: string; layout?: string;
  showCover?: boolean; sectionNumber?: string; dateDocument?: string;
  metadata?: { key: string; label: string; format?: string }[];
}
export interface SchemaNode {
  [key: string]: unknown;
  id: string; stateKey: string; title?: string; label?: string; code?: string;
  description?: string; sections?: Section[]; subpages?: readonly SchemaNode[];
  stateDefaults?: DataModel; dateDependencies?: string[];
  formComponent?: string; previewComponent?: string | false; summaryComponent?: string;
  form?: { kicker?: string; intro?: string; showCompletion?: boolean; fullWidth?: boolean };
  workspace?: { kicker?: string; title?: string; summary?: string; note?: string };
  guide?: Guide; ai?: AiGuidance; document?: DocumentConfig; evidence?: Evidence;
  documentTargets?: string[]; partialTitle?: string; omitEmptyFields?: boolean;
  periodField?: string; periods?: { minimum?: number; maximum?: number; default?: number };
  implemented?: boolean; status?: string; phase?: number; stage?: number;
  defaultSubpageId?: string; role?: string; dependsOn?: string[]; reviews?: string[]; compactPreview?: boolean;
  workflow?: { kind?: string; required?: boolean; role?: string; sequence?: number; dependsOn?: string[]; reviews?: string[]; principle?: string };
}
export interface CopyRequest { markdown: string; title: string; key: string; }
export interface NavigationRequest { pageId: string; anchorId?: string; subpageSelections?: Record<string, string>; }
export interface PrintRequest { pageId?: string; title?: string; sectionCode?: string; }

export interface ParentChoice { value: string; label: string; }
export interface MetadataEntry { key: string; label: string; value: unknown; format?: string; }
export interface SectionContext { number?: string; depth?: number; path?: string[]; documentTitle?: string; partial?: boolean; title?: string; }
export interface ReviewRecord extends DataModel { referenceId: string; label: unknown; }
export interface ReviewCatalog { title: string; target?: NavigationRequest; stageId?: string; sectionId?: string; items: ReviewRecord[]; }
export interface RecordReview { messages: string[]; catalogs: ReviewCatalog[]; }
export interface EvidenceView {
  data: DataModel; definition: EvidenceSource; percent: number;
  rootSchema: SchemaNode; schema: SchemaNode; tracked: boolean;
}
