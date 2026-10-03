import { SupportingWork } from "../simplification/SupportingWork.js";
import { DynamicForm } from "../../../components/forms/FormWorkspace.js";
import { SchemaField } from "../../../components/fields/SchemaField.js";
import { SectionInfo } from "../../../components/controls/FormControls.js";
import { WorkspaceEvidencePanel } from "../../../components/references/WorkspaceEvidencePanel.js";
import { createRepeaterItem } from "../../../core/schema/state-factory.js";
import { formatRecordDisplayId, nextNumericId, hasNonDefaultValue } from "../../../core/records/record-values.js";
import { ActorGoalEditor } from "./ActorGoalEditor.js";

export const ActorsGoalsForm = {
  name: "ActorsGoalsForm",
  components: { SupportingWork, DynamicForm, SchemaField, SectionInfo, WorkspaceEvidencePanel, ActorGoalEditor },
  props: DynamicForm.props,
  emits: ["copy-markdown", "navigate-workspace"],
  computed: {
    actorSection() { return this.pageSchema.sections.find(section => section.id === "actor-catalog"); },
    goalSection() { return this.pageSchema.sections.find(section => section.id === "goal-catalog"); },
    boundaryPage() { return { ...this.pageSchema, sections: this.pageSchema.sections.filter(section => !section.repeatable) }; },
    actors() { return this.itemsFor(this.actorSection); },
    goals() { return this.itemsFor(this.goalSection); },
    actorChoices() {
      return this.actors.filter(actor => actor.status !== "Not an actor")
        .map(actor => ({ name: actor.name, referenceId: this.actorId(actor) }));
    },
    unassignedGoals() {
      const ids = new Set(this.actors.map(actor => this.actorId(actor)));
      return this.goals.filter(goal => !ids.has(goal.actorId) && this.goalSection.repeatable.fields
        .some(field => hasNonDefaultValue(goal[field.key], field.default)));
    },

  },
  methods: {
    ...DynamicForm.methods,
    actorId(actor) { return formatRecordDisplayId(this.actorSection.repeatable.displayId, actor); },
    goalsFor(actor) { return this.goals.filter(goal => goal.actorId === this.actorId(actor)); },
    addGoal(actor) {
      if (actor.status === "Not an actor") return;
      const records = this.sectionModel(this.goalSection).goals;
      const empty = this.goals.find(goal => this.goalSection.repeatable.fields
        .every(field => !hasNonDefaultValue(goal[field.key], field.default)));
      if (empty) {
        empty.actorId = this.actorId(actor);
        return;
      }
      records.push(createRepeaterItem(this.goalSection.repeatable, nextNumericId(records), { actorId: this.actorId(actor) }));
    },
    moveGoal({ goal, actorId }) {
      if (this.actorChoices.some(actor => actor.referenceId === actorId)) goal.actorId = actorId;
    },
    goalPromptSection(actor) {
      return { ...this.goalSection, key: `goals-for-${actor.id}`, title: `Goals for ${actor.name || 'unnamed actor'} (${this.actorId(actor)})`,
        description: "Add or refine goals beneath this actor. The form assigns their actor automatically.",
        ai: { draftingGuidance: "Return only this actor's goal updates. Do not output an Actor ID field; the form supplies that link. Keep goal IDs stable and let the application allocate IDs for new goals." },
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
          <span :id="pageSchema.id + '-goal-catalog'"></span>
          <article v-for="actor in actors" :key="actor.id" class="repeatable-item mt-4">
            <div class="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h4 class="h6 mb-0">{{ actor.name || 'New actor' }} <small class="text-body-secondary">{{ actorId(actor) }}</small></h4>
              <button v-if="actors.length > actorSection.repeatable.minimum" type="button" class="btn btn-link btn-sm text-danger"
                @click="removeItem(actorSection, actor)">Remove actor</button>
            </div>
            <div class="row g-3">
              <schema-field v-for="field in fieldsFor(actorSection, actor)" :key="field.key" :field="field" :document-model="documentModel"
                :id-base="fieldId(actorSection, field, actor)" :model-value="actor[field.key]" @update:model-value="actor[field.key] = $event"></schema-field>
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
              :document-model="documentModel" :actors="actorChoices" @move="moveGoal" @remove="removeItem(goalSection, $event)"></actor-goal-editor>
          </article>
        </div>
      </section>
      <section v-if="unassignedGoals.length" class="card p-4 mb-4">
        <h3 class="h5">Goals needing an actor</h3>
        <p class="text-body-secondary">These saved goals have no available actor. Assign them by name below. Removing an actor never deletes its goals.</p>
        <actor-goal-editor v-for="goal in unassignedGoals" :key="goal.id" :goal="goal" :section="goalSection"
          :document-model="documentModel" :actors="actorChoices" :unassigned="true" @move="moveGoal" @remove="removeItem(goalSection, $event)"></actor-goal-editor>
      </section>
    </div>
  `
};
