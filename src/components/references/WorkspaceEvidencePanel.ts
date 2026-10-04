import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { DocumentModel, Evidence, SchemaNode } from '../../core/schema/schema-types.ts';
import type { ConnectedSource, EvidenceSection } from '../../core/evidence/evidence-model.ts';
import { connectedEvidence, evidenceSectionHasContent } from '../../core/evidence/evidence-model.ts';
import { MarkdownText } from '../preview/MarkdownText.ts';

let nextEvidencePanelId = 0;

export const WorkspaceEvidencePanel = defineComponent({
  name: 'WorkspaceEvidencePanel',
  components: { MarkdownText },
  emits: ['navigate-workspace'],
  props: {
    documentModel: { type: Object as PropType<DocumentModel>, required: true },
    documentSchemas: { type: Array as PropType<SchemaNode[]>, required: true },
    evidence: { type: Object as PropType<Evidence>, required: true }
  },
  data() {
    const id = ++nextEvidencePanelId;
    return { contentId: `workspace-evidence-content-${id}`, titleId: `workspace-evidence-title-${id}`, expanded: false };
  },
  computed: {
    sources(): ConnectedSource[] {
      return connectedEvidence(this.evidence, this.documentModel, this.documentSchemas);
    },
    populatedSectionCount(): number {
      return this.sources.reduce((count, source) => count + source.groups.filter(evidenceSectionHasContent).length, 0);
    }
  },
  methods: {
    evidenceSectionHasContent,
    availability(group: EvidenceSection): string {
      const count = group.repeatable ? group.records.length : group.values.length;
      if (!count) return 'No answers recorded yet. Open the source to add them.';
      return group.repeatable
        ? `${count} ${count === 1 ? 'record' : 'records'} available`
        : `${count} ${count === 1 ? 'answer' : 'answers'} available`;
    },
    sourceStatus(source: ConnectedSource): string {
      const count = source.groups.filter(evidenceSectionHasContent).length;
      return `${count} of ${source.groups.length} ${source.groups.length === 1 ? 'section' : 'sections'} with answers`;
    },
    openSource(group: EvidenceSection) {
      this.$emit('navigate-workspace', group.target);
    }
  },
  template: `
    <section v-if="sources.length" class="workspace-evidence-panel" :aria-labelledby="titleId">
      <header class="workspace-evidence-heading">
        <div>
          <p class="section-kicker mb-1">Earlier answers</p>
          <h3 :id="titleId" class="h5 mb-1">Connected project evidence</h3>
          <p v-if="expanded" class="text-body-secondary mb-0">{{ evidence.summary || 'Reuse what is already recorded. These answers are read-only here; open their source section to make a correction.' }}</p>
        </div>
        <div class="workspace-evidence-actions">
          <span class="workspace-evidence-count">{{ populatedSectionCount }} {{ populatedSectionCount === 1 ? 'section' : 'sections' }} with answers · {{ sources.length }} {{ sources.length === 1 ? 'source' : 'sources' }}</span>
          <button class="workspace-evidence-toggle" type="button" :aria-controls="contentId" :aria-expanded="expanded" @click="expanded = !expanded">
            {{ expanded ? 'Hide earlier answers' : 'Show earlier answers' }}
            <span aria-hidden="true">{{ expanded ? '⌃' : '⌄' }}</span>
          </button>
        </div>
      </header>
      <transition name="evidence-reveal">
        <div v-show="expanded" :id="contentId" class="workspace-evidence-sources">
          <article v-for="source in sources" :key="source.id" class="workspace-evidence-source card">
            <header class="workspace-evidence-source-heading">
              <div>
                <p v-if="source.schema.code" class="workspace-evidence-code mb-1">{{ source.schema.code }}</p>
                <h4 class="h6 mb-1">{{ source.schema.title || source.schema.label }}</h4>
                <p v-if="source.reason" class="small text-body-secondary mb-0">{{ source.reason }}</p>
              </div>
              <span class="workspace-evidence-status">{{ sourceStatus(source) }}</span>
            </header>
            <div class="workspace-evidence-groups">
              <section v-for="group in source.groups" :key="group.id" class="workspace-evidence-group">
                <header class="workspace-evidence-group-heading">
                  <div><h5>{{ group.title }}</h5><p class="mb-0">{{ availability(group) }}</p></div>
                  <button class="workspace-evidence-link" type="button" :aria-label="'Open ' + group.title + ' in ' + (source.schema.title || source.schema.label)" @click="openSource(group)">
                    Open section <span aria-hidden="true">→</span>
                  </button>
                </header>
                <details v-if="evidenceSectionHasContent(group)" class="workspace-evidence-answers">
                  <summary>Read earlier answers</summary>
                  <dl v-if="!group.repeatable" class="workspace-evidence-values">
                    <div v-for="value in group.values" :key="value.key">
                      <dt>{{ value.label }}</dt>
                      <dd><markdown-text v-if="value.markdown" :value="value.text"></markdown-text><span v-else class="preserve-lines">{{ value.text }}</span></dd>
                    </div>
                  </dl>
                  <article v-for="record in group.records" :key="record.id" class="workspace-evidence-record">
                    <h6><code>{{ record.id }}</code><span v-if="record.label"> — {{ record.label }}</span></h6>
                    <dl class="workspace-evidence-values">
                      <div v-for="value in record.values" :key="value.key">
                        <dt>{{ value.label }}</dt>
                        <dd><markdown-text v-if="value.markdown" :value="value.text"></markdown-text><span v-else class="preserve-lines">{{ value.text }}</span></dd>
                      </div>
                    </dl>
                  </article>
                </details>
              </section>
            </div>
          </article>
        </div>
      </transition>
    </section>
  `
});
