import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { documentOutlineIndex, schemaNodeIndex } from "../../core/schema/schema-tree.ts";

function titleCase(value = "") {
  return String(value)
    .replaceAll(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const WorkflowStageOverview = defineComponent({
  name: "WorkflowStageOverview",
  props: {
    nodeSchema: { type: Object as PropType<SchemaNode>, required: true },
    parentSchema: { type: Object as PropType<SchemaNode | null>, default: null },
    rootSchema: { type: Object as PropType<SchemaNode>, required: true }
  },
  computed: {
    dependencyNodes(): SchemaNode[] {
      const nodes = schemaNodeIndex(this.rootSchema);
      return (this.nodeSchema.workflow?.dependsOn || [])
        .map((id) => nodes.get(id))
        .filter((node): node is SchemaNode => Boolean(node));
    },
    documentTargets(): OutlineSection[] {
      const sections = documentOutlineIndex(this.rootSchema.document?.outline || []);
      return (this.nodeSchema.documentTargets || [])
        .map((key) => sections.get(key))
        .filter((target): target is OutlineSection & { number: string } => Boolean(target));
    },
    positionLabel(): string {
      const sequence = this.nodeSchema.workflow?.sequence;
      const total = this.parentSchema?.subpages?.length;
      return sequence && total ? `Stage ${sequence} of ${total}` : "Workflow stage";
    },
    reviewNodes(): SchemaNode[] {
      const nodes = schemaNodeIndex(this.rootSchema);
      const dependencies = new Set(this.nodeSchema.workflow?.dependsOn || []);
      return (this.nodeSchema.workflow?.reviews || [])
        .filter((id) => !dependencies.has(id))
        .map((id) => nodes.get(id))
        .filter((node): node is SchemaNode => Boolean(node));
    },
    roleLabel(): string {
      return titleCase(this.nodeSchema.workflow?.role || "planned");
    }
  },
  template: `
    <article class="card border-0 workflow-stage-overview">
      <div class="card-body p-4 p-md-5">
        <header class="workflow-stage-header">
          <div>
            <div class="workflow-stage-meta">
              <span class="workflow-stage-position">{{ positionLabel }}</span>
              <span class="workflow-stage-role">{{ roleLabel }}</span>
            </div>
            <p class="section-kicker mb-2">{{ nodeSchema.code }}</p>
            <h3 class="h4 mb-2">{{ nodeSchema.title }}</h3>
            <p class="text-body-secondary mb-0">{{ nodeSchema.description }}</p>
          </div>
          <span class="workflow-structure-badge">Structure only</span>
        </header>

        <div
          v-if="dependencyNodes.length || reviewNodes.length || documentTargets.length"
          class="workflow-stage-relationships"
        >
          <section v-if="dependencyNodes.length">
            <h4>Builds from</h4>
            <ul>
              <li v-for="node in dependencyNodes" :key="node.id">{{ node.title }}</li>
            </ul>
          </section>
          <section v-if="reviewNodes.length">
            <h4>Checks back against</h4>
            <ul>
              <li v-for="node in reviewNodes" :key="node.id">{{ node.title }}</li>
            </ul>
          </section>
          <section v-if="documentTargets.length">
            <h4>Contributes to</h4>
            <ul>
              <li v-for="target in documentTargets" :key="target.key">
                <span v-if="target.number">{{ target.number }}. </span>{{ target.title }}
              </li>
            </ul>
          </section>
        </div>

        <footer class="workflow-stage-empty-note">
          <strong>Content intentionally not implemented yet.</strong>
          <span>Questions and shared records will be added here as this construction stage is developed.</span>
        </footer>
      </div>
    </article>
  `
});
