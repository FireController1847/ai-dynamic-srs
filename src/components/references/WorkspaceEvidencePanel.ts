import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { hasNonDefaultValue } from "../../core/records/record-values.ts";
import { completion, hasCompletionCriteria } from "../../core/schema/form-completion.ts";
import { dataModelForSection, valueAtPath } from "../../core/schema/data-models.ts";
import { schemaNodeIndex } from "../../core/schema/schema-tree.ts";
import { sectionRecords } from "../../core/schema/section-records.ts";

let nextEvidencePanelId = 0;

export const WorkspaceEvidencePanel = defineComponent({
  name: "WorkspaceEvidencePanel",
  emits: ["navigate-workspace"],
  props: {
    documentModel: { type: Object as PropType<DocumentModel>, required: true },
    documentSchemas: { type: Array as PropType<SchemaNode[]>, required: true },
    evidence: { type: Object as PropType<Evidence>, required: true }
  },
  data() {
    nextEvidencePanelId += 1;
    return {
      contentId: `workspace-evidence-content-${nextEvidencePanelId}`,
      titleId: `workspace-evidence-title-${nextEvidencePanelId}`,
      expanded: false
    };
  },
  computed: {
    sources(): EvidenceView[] {
      return (this.evidence.sources || []).map((definition) => {
        const rootSchema = this.documentSchemas.find(({ id }) => id === definition.pageId);
        const schema = definition.nodeId
          ? schemaNodeIndex(rootSchema).get(definition.nodeId)
          : rootSchema;
        if (!rootSchema || !schema) {
          return null;
        }

        const data = definition.dataPath
          ? valueAtPath(this.documentModel, definition.dataPath) || {}
          : this.documentModel[rootSchema.stateKey] || {};
        return {
          data,
          definition,
          percent: completion(schema, data, this.documentModel),
          rootSchema,
          schema,
          tracked: hasCompletionCriteria(schema)
        };
      }).filter(Boolean);
    }
  },
  methods: {
    fieldFor(section: Section | undefined, key: string) {
      const fields = section?.repeatable?.fields || section?.fields || [];
      return fields.find((field) => field.key === key) || { key };
    },
    fieldKeys(section: Section | undefined, group: EvidenceGroup) {
      return group.fieldKeys || (section?.fields || []).map(({ key }) => key);
    },
    groupSection(source: EvidenceView, group: EvidenceGroup): Section | undefined {
      return source.schema.sections?.find(({ id }) => id === group.sectionId);
    },
    groupTitle(source: EvidenceView, group: EvidenceGroup) {
      return group.title || this.groupSection(source, group)?.title || "Source context";
    },
    openSource(source: EvidenceView, group: EvidenceGroup) {
      const section = this.groupSection(source, group);
      this.$emit("navigate-workspace", {
        pageId: source.rootSchema.id,
        subpageSelections: source.definition.subpageSelections || {},
        anchorId: section
          ? `${source.schema.id}-${section.id}`
          : source.definition.nodeId
            ? `${source.schema.id}-subpanel`
            : `${source.schema.id}-panel`
      });
    },
    recordFieldKeys(section: Section | undefined, group: EvidenceGroup) {
      return group.recordFieldKeys || (section?.repeatable?.fields || []).map(({ key }) => key);
    },
    recordsFor(source: EvidenceView, group: EvidenceGroup) {
      const section = this.groupSection(source, group);
      if (!section?.repeatable) {
        return [];
      }

      const keys = this.recordFieldKeys(section, group);
      return sectionRecords(section.repeatable, this.sectionModel(source, group))
        .filter((item) => keys.some((key) => (
          hasNonDefaultValue(item[key], this.fieldFor(section, key)?.default)
        )));
    },
    groupAvailability(source: EvidenceView, group: EvidenceGroup) {
      const section = this.groupSection(source, group);
      if (!section) {
        return "Source section unavailable";
      }

      if (section.repeatable) {
        const count = this.recordsFor(source, group).length;
        return count
          ? `${count} populated ${count === 1 ? "record" : "records"}`
          : "No populated records yet";
      }

      const model = this.sectionModel(source, group);
      const count = this.fieldKeys(section, group).filter((key) => (
        hasNonDefaultValue(model[key], this.fieldFor(section, key)?.default)
      )).length;
      return count
        ? `${count} referenced ${count === 1 ? "field" : "fields"} recorded`
        : "No referenced details yet";
    },
    sourceStatus(source: EvidenceView) {
      if (!source.tracked) {
        return "Supporting record";
      }

      return `${source.percent}% complete`;
    },
    sectionModel(source: EvidenceView, group: EvidenceGroup): DataModel {
      const section = this.groupSection(source, group);
      return dataModelForSection(section || {}, source.data, this.documentModel);
    },
    toggleExpanded() {
      this.expanded = !this.expanded;
    }
  },
  template: `
    <section class="workspace-evidence-panel" :aria-labelledby="titleId">
      <header class="workspace-evidence-heading">
        <div>
          <p class="section-kicker mb-1">{{ evidence.kicker || 'Connected project evidence' }}</p>
          <h3 :id="titleId" class="h5 mb-1">{{ evidence.title || 'Review what is already known' }}</h3>
          <p v-if="expanded" class="text-body-secondary mb-0">{{ evidence.summary }}</p>
        </div>
        <div class="workspace-evidence-actions">
          <span class="workspace-evidence-count">{{ sources.length }} connected {{ sources.length === 1 ? 'source' : 'sources' }}</span>
          <button
            class="workspace-evidence-toggle"
            type="button"
            :aria-controls="contentId"
            :aria-expanded="expanded"
            @click="toggleExpanded"
          >
            {{ expanded ? 'Hide references' : 'Show references' }}
            <span aria-hidden="true">{{ expanded ? '⌃' : '⌄' }}</span>
          </button>
        </div>
      </header>

      <transition name="evidence-reveal">
        <div v-show="expanded" :id="contentId" class="workspace-evidence-sources">
          <article v-for="source in sources" :key="source.schema.id" class="workspace-evidence-source card">
            <header class="workspace-evidence-source-heading">
              <div>
                <p class="workspace-evidence-code mb-1">{{ source.schema.code }}</p>
                <h4 class="h6 mb-1">{{ source.schema.title }}</h4>
                <p class="small text-body-secondary mb-0">{{ source.definition.reason }}</p>
              </div>
              <span class="workspace-evidence-status">{{ sourceStatus(source) }}</span>
            </header>

            <div class="workspace-evidence-groups">
              <section
                v-for="group in source.definition.groups"
                :key="group.sectionId"
                class="workspace-evidence-group"
              >
                <div>
                  <h5>{{ groupTitle(source, group) }}</h5>
                  <p class="mb-0">{{ groupAvailability(source, group) }}</p>
                </div>
                <button class="workspace-evidence-link" type="button" @click="openSource(source, group)">
                  Open section <span aria-hidden="true">→</span>
                </button>
              </section>
            </div>
          </article>
        </div>
      </transition>
    </section>
  `
});
