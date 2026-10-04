import type { CopyRequest, DataModel, Field, SchemaNode, Section } from '../../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { SupportingWork } from "../simplification/SupportingWork.ts";
import { DynamicForm, dynamicFormProps } from "../../../components/forms/FormWorkspace.ts";
import type { RepeatableSection } from "../../../components/forms/FormWorkspace.ts";
import { SchemaField } from "../../../components/fields/SchemaField.ts";
import { CopyPromptControl, SectionInfo } from "../../../components/controls/FormControls.ts";
import type { FieldPromptFactory } from '../../../components/controls/FormControls.ts';
import { WorkspaceEvidencePanel } from "../../../components/references/WorkspaceEvidencePanel.ts";
import { createRepeaterItem } from "../../../core/schema/state-factory.ts";
import { dataModelForSection, mutableRecords } from "../../../core/schema/data-models.ts";
import { fieldVisible } from "../../../core/schema/field-visibility.ts";
import { resolveReferenceField } from "../../../core/records/reference-fields.ts";
import { sectionRecords } from "../../../core/schema/section-records.ts";
import { buildFormPrompt } from "../../../core/ai/prompt-builder.ts";
import { addEvidenceContextToPrompt } from "../../../core/ai/evidence-context.ts";
import { formatRecordDisplayId, hasNonDefaultValue } from "../../../core/records/record-values.ts";
import { nextRepeaterRecordId, removeRepeaterRecord } from "../../../core/records/record-lifecycle.ts";
import { ActorGoalEditor } from "./ActorGoalEditor.ts";
import type { ActorChoice } from "./ActorGoalEditor.ts";

export const ActorsGoalsForm = defineComponent({
  name: "ActorsGoalsForm",
  components: { SupportingWork, DynamicForm, SchemaField, SectionInfo, CopyPromptControl, WorkspaceEvidencePanel, ActorGoalEditor },
  props: dynamicFormProps,
  emits: ["copy-markdown", "navigate-workspace"],
  computed: {
    actorSection(): RepeatableSection {
      const section = (this.pageSchema.sections || []).find(section => section.id === "actor-catalog");
      if (!section?.repeatable) throw new Error("Actors & Goals schema is missing the actor catalog.");
      return section as RepeatableSection;
    },
    goalSection(): RepeatableSection {
      const section = (this.pageSchema.sections || []).find(section => section.id === "goal-catalog");
      if (!section?.repeatable) throw new Error("Actors & Goals schema is missing the goal catalog.");
      return section as RepeatableSection;
    },
    boundaryPage(): SchemaNode { return { ...this.pageSchema, sections: (this.pageSchema.sections || []).filter(section => !section.repeatable) }; },
    actors(): DataModel[] { return this.itemsFor(this.actorSection); },
    goals(): DataModel[] { return this.itemsFor(this.goalSection); },
    actorChoices(): ActorChoice[] {
      return this.actors.filter(actor => actor.status !== "Not an actor")
        .map(actor => ({ name: actor.name, referenceId: this.actorId(actor) }));
    },
    unassignedGoals(): DataModel[] {
      const ids = new Set(this.actors.map(actor => this.actorId(actor)));
      return this.goals.filter(goal => !ids.has(String(goal.actorId || "")) && this.goalSection.repeatable.fields
        .some(field => hasNonDefaultValue(goal[field.key], field.default)));
    },

  },
  methods: {
    sectionModel(section: Section): DataModel {
      return dataModelForSection(section, this.dataModel, this.documentModel);
    },
    itemsFor(section: RepeatableSection): DataModel[] {
      return sectionRecords(section.repeatable, this.sectionModel(section));
    },
    addItem(section: RepeatableSection) {
      const records = mutableRecords(this.sectionModel(section), section.repeatable.dataKey);
      records.push(createRepeaterItem(section.repeatable, nextRepeaterRecordId(section.repeatable, records, this.documentModel)));
    },
    removeItem(section: RepeatableSection, item: DataModel) {
      const records = mutableRecords(this.sectionModel(section), section.repeatable.dataKey);
      removeRepeaterRecord(section.repeatable, records, item, this.documentModel);
    },
    copyKey(section: Section, record?: DataModel, path: readonly (string | number)[] = []): string {
      return `${this.pageSchema.id}:${section.key}:${record ? 'record-' + record.id : 'section'}:${JSON.stringify(path)}`;
    },
    fieldId(section: Section, field: Field, item: DataModel | null = null): string {
      return [this.pageSchema.id, section.id, item?.id, field.key].filter(Boolean).join("-");
    },
    fieldsFor(section: Section, item: DataModel | null = null): Field[] {
      const fields = section.repeatable?.fields || section.fields || [];
      const model = item || this.sectionModel(section);
      return fields.filter(field => !field.hidden && fieldVisible(field, model))
        .map(field => resolveReferenceField(field, this.documentModel, model[field.key]));
    },
    promptFor(section: Section, record?: DataModel, fieldPath?: readonly (string | number)[]): string {
      const prompt = buildFormPrompt(this.pageSchema, section, this.dataModel, this.documentModel, { record, fieldPath });
      return addEvidenceContextToPrompt(prompt, this.pageSchema.evidence, this.documentModel, this.documentSchemas);
    },
    promptRequest(section: Section, record?: DataModel, path: readonly (string | number)[] = []): CopyRequest {
      const recordLabel = record && section.repeatable ? formatRecordDisplayId(section.repeatable.displayId, record) : '';
      const form = this;
      return { get markdown() { return form.promptFor(section, record, path); }, title: [section.title, recordLabel, ...path].filter(value => value !== '').join(' — '),
        key: this.copyKey(section, record, path) };
    },
    fieldPromptFactory(section: Section, record: DataModel): FieldPromptFactory {
      return path => this.promptRequest(section, record, path);
    },
    actorId(actor: DataModel): string { return formatRecordDisplayId(this.actorSection.repeatable.displayId, actor); },
    goalsFor(actor: DataModel): DataModel[] { return this.goals.filter(goal => String(goal.actorId || "") === this.actorId(actor)); },
    addGoal(actor: DataModel) {
      if (actor.status === "Not an actor") return;
      const records = mutableRecords(this.sectionModel(this.goalSection), this.goalSection.repeatable.dataKey);
      const empty = this.goals.find(goal => this.goalSection.repeatable.fields
        .every(field => !hasNonDefaultValue(goal[field.key], field.default)));
      if (empty) {
        empty.actorId = this.actorId(actor);
        return;
      }
      records.push(createRepeaterItem(this.goalSection.repeatable, nextRepeaterRecordId(this.goalSection.repeatable, records, this.documentModel), { actorId: this.actorId(actor) }));
    },
    moveGoal({ goal, actorId }: { goal: DataModel; actorId: string }) {
      if (this.actorChoices.some(actor => actor.referenceId === actorId)) goal.actorId = actorId;
    },
    goalPromptSection(actor: DataModel): RepeatableSection {
      return { ...this.goalSection, key: `goals-for-${actor.id}`, title: `Goals for ${actor.name || 'unnamed actor'} (${this.actorId(actor)})`,
        description: "Add or refine goals beneath this actor. The form assigns their actor automatically.",
        ai: { draftingGuidance: "Return complete requested goal records for this actor, including every applicable editable value and valid unchanged answers. Do not output other actors' goals or an Actor ID field; the form supplies that link. Keep goal IDs stable and let the application allocate IDs for new goals." },
        repeatable: { ...this.goalSection.repeatable,
          fields: this.goalSection.repeatable.fields.map(field => field.key === "actorId" ? { ...field, includeInPrompt: false } : field),
          recordFilter: { key: "actorId", equals: this.actorId(actor) } }
      };
    }
  },
  template: `
    <div>
      <workspace-evidence-panel :document-model="documentModel" :document-schemas="documentSchemas" :evidence="pageSchema.evidence"
        @navigate-workspace="$emit('navigate-workspace', $event)"></workspace-evidence-panel>
      <supporting-work :document-model="documentModel"></supporting-work>
      <dynamic-form :page-schema="boundaryPage" :data-model="dataModel" :document-model="documentModel"
        :document-schemas="documentSchemas" :copied-section="copiedSection" @copy-markdown="$emit('copy-markdown', $event)"></dynamic-form>
      <section :id="pageSchema.id + '-actor-catalog'" class="form-section card border-0 shadow-sm mb-4">
        <div class="card-body p-4">
          <div class="d-flex align-items-center justify-content-between gap-3 mb-3">
            <div><div class="section-title-row"><h3 class="h5">Actors and their goals</h3>
              <section-info :title="actorSection.title" :help="actorSection.help" :copy-key="copyKey(actorSection)"
                :copy-text="promptFor(actorSection)" :copied="copiedSection === copyKey(actorSection)"
                @copy-markdown="$emit('copy-markdown', $event)"></section-info>
              </div><p class="text-body-secondary mb-0">Describe a role, then add the outcomes it needs below. Goals are linked automatically.</p></div>
            <button type="button" class="btn btn-outline-primary btn-sm" @click="addItem(actorSection)">Add actor</button>
          </div>
          <div :id="pageSchema.id + '-goal-catalog'" class="section-title-row">
            <span class="small text-body-secondary">All goals</span>
            <section-info :title="goalSection.title" :help="goalSection.help" :copy-key="copyKey(goalSection)"
              :copy-text="promptFor(goalSection)" :copied="copiedSection === copyKey(goalSection)"
              @copy-markdown="$emit('copy-markdown', $event)"></section-info>
          </div>
          <article v-for="actor in actors" :key="actor.id" class="repeatable-item mt-4">
            <div class="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h4 class="h6 mb-0">{{ actor.name || 'New actor' }} <small class="text-body-secondary">{{ actorId(actor) }}</small></h4>
              <copy-prompt-control persistent :copied="copiedSection === copyKey(actorSection, actor)"
                :label="'Copy formatted-answer prompt for ' + actorId(actor)"
                tooltip="Copies every field for this actor. The AI returns ready-to-enter answers for this actor."
                @copy="$emit('copy-markdown', promptRequest(actorSection, actor))"></copy-prompt-control>
              <button v-if="actors.length > actorSection.repeatable.minimum" type="button" class="btn btn-link btn-sm text-danger"
                @click="removeItem(actorSection, actor)">Remove actor</button>
            </div>
            <div class="row g-3">
              <schema-field v-for="field in fieldsFor(actorSection, actor)" :key="field.key" :field="field" :document-model="documentModel"
                :id-base="fieldId(actorSection, field, actor)" :model-value="actor[field.key]"
                :copy-prompt="fieldPromptFactory(actorSection, actor)" :prompt-path="[field.key]" :copied-section="copiedSection"
                @copy-markdown="$emit('copy-markdown', $event)" @update:model-value="actor[field.key] = $event"></schema-field>
            </div>
            <div class="d-flex align-items-center justify-content-between gap-2 mt-4">
              <div class="section-title-row"><h4 class="h6 mb-0">Goals for {{ actor.name || 'this actor' }}</h4>
                <section-info :title="goalPromptSection(actor).title" :help="goalSection.help" :copy-key="copyKey(goalPromptSection(actor))"
                  :copy-text="promptFor(goalPromptSection(actor))" :copied="copiedSection === copyKey(goalPromptSection(actor))"
                  @copy-markdown="$emit('copy-markdown', $event)"></section-info>
              </div>
              <button v-if="actor.status !== 'Not an actor'" type="button" class="btn btn-outline-primary btn-sm" @click="addGoal(actor)">Add goal</button>
            </div>
            <p v-if="actor.status === 'Not an actor'" class="small text-warning mt-2">This role is marked “Not an actor.” Review or move its existing goals before proceeding.</p>
            <p v-else-if="!goalsFor(actor).length" class="small text-body-secondary mt-2">Add an outcome this actor needs when one applies.</p>
            <actor-goal-editor v-for="goal in goalsFor(actor)" :key="goal.id" :goal="goal" :section="goalSection"
              :document-model="documentModel" :actors="actorChoices" :copied-section="copiedSection"
              :record-prompt="promptRequest(goalPromptSection(actor), goal)" :copy-prompt="fieldPromptFactory(goalPromptSection(actor), goal)"
              @copy-markdown="$emit('copy-markdown', $event)" @move="moveGoal" @remove="removeItem(goalSection, $event)"></actor-goal-editor>
          </article>
        </div>
      </section>
      <section v-if="unassignedGoals.length" class="card p-4 mb-4">
        <h3 class="h5">Goals needing an actor</h3>
        <p class="text-body-secondary">These saved goals have no available actor. Assign them by name below. Removing an actor never deletes its goals.</p>
        <actor-goal-editor v-for="goal in unassignedGoals" :key="goal.id" :goal="goal" :section="goalSection"
          :document-model="documentModel" :actors="actorChoices" :unassigned="true" :copied-section="copiedSection"
          :record-prompt="promptRequest(goalSection, goal)" :copy-prompt="fieldPromptFactory(goalSection, goal)"
          @copy-markdown="$emit('copy-markdown', $event)" @move="moveGoal" @remove="removeItem(goalSection, $event)"></actor-goal-editor>
      </section>
    </div>
  `
});
