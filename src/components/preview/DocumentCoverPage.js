export const DocumentCoverPage = {
  props: {
    documentCode: { type: String, default: "" },
    documentName: { type: String, required: true },
    metadataEntries: { type: Array, default: () => [] },
    projectTitle: { type: String, default: "" }
  },
  template: `
    <section class="document-cover-page" aria-label="Document cover page">
      <div class="document-cover-heading">
        <p v-if="documentCode" class="document-cover-code">{{ documentCode }}</p>
        <h1>{{ documentName }}</h1>
        <p class="document-cover-for">for</p>
        <h2>{{ projectTitle || "Untitled Project" }}</h2>
      </div>

      <dl v-if="metadataEntries.length" class="document-cover-meta">
        <div v-for="item in metadataEntries" :key="item.key">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      </dl>
    </section>
  `
};
