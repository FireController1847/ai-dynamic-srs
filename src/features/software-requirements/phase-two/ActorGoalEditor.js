import { SchemaField } from "../../../components/fields/SchemaField.js";
import { fieldVisible } from "../../../core/schema/field-visibility.js";
import { resolveReferenceField } from "../../../core/records/reference-fields.js";
import { formatRecordDisplayId } from "../../../core/records/record-values.js";

export const ActorGoalEditor = {
  name: "ActorGoalEditor",
  components: { SchemaField },
  emits: ["move", "remove"],
  props: {
    goal: { type: Object, required: true }, section: { type: Object, required: true },
    documentModel: { type: Object, required: true }, actors: { type: Array, required: true },
    unassigned: { type: Boolean, default: false }
  },
  computed: {
    referenceId() { return formatRecordDisplayId(this.section.repeatable.displayId, this.goal); },
    fields() {
      return this.section.repeatable.fields.filter(field => field.key !== "actorId" && !field.hidden && fieldVisible(field, this.goal))
        .map(field => resolveReferenceField(field, this.documentModel, this.goal[field.key]));
    }
  },
  template: `
    <div class="border rounded p-3 mt-3">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="h6 mb-0">{{ referenceId }}</h5>
        <button type="button" class="btn btn-link btn-sm text-danger" @click="$emit('remove', goal)">Remove goal</button>
      </div>
      <div class="row g-3">
        <schema-field v-for="field in fields" :key="field.key" :field="field" :document-model="documentModel"
          :id-base="'srs-actor-goal-' + goal.id + '-' + field.key" :model-value="goal[field.key]"
          @update:model-value="goal[field.key] = $event"></schema-field>
      </div>
      <details class="mt-3" :open="unassigned">
        <summary class="small">{{ unassigned ? 'Choose an actor for this goal' : 'Move goal to another actor' }}</summary>
        <p v-if="unassigned" class="small text-body-secondary mt-2">Its actor is missing or unavailable. Choose a role below; the goal and its references are retained.</p>
        <label class="form-label mt-2" :for="'goal-owner-' + goal.id">Actor for {{ referenceId }}</label>
        <select class="form-select" :id="'goal-owner-' + goal.id" :value="goal.actorId"
          @change="$emit('move', { goal, actorId: $event.target.value })">
          <option disabled value="">Choose an actor</option>
          <option v-if="goal.actorId && !actors.some(actor => actor.referenceId === goal.actorId)" disabled :value="goal.actorId">Unavailable actor ({{ goal.actorId }})</option>
          <option v-for="actor in actors" :key="actor.referenceId" :value="actor.referenceId">{{ actor.name || 'Unnamed actor' }} — {{ actor.referenceId }}</option>
        </select>
      </details>
    </div>
  `
};
