import { MarkdownText } from "./MarkdownText.js";
import { narrativeMarkdown } from "../../core/formatting/markdown.js";
import { documentDate } from "../../core/formatting/document-dates.js";
import { referenceChoices } from "../../core/records/reference-fields.js";
import { fieldVisible } from "../../core/schema/field-visibility.js";
import { displayValue as fallbackValue, formatRecordDisplayId, hasValue as hasContent, resolveContextValue } from "../../core/records/record-values.js";
import { formatDate } from "../../core/formatting/dates.js";
import { formatDocumentTitle } from "../../core/formatting/document-titles.js";
import { dataModelForSection } from "../../core/schema/data-models.js";
import { PrintDocumentButton } from "../controls/PrintButton.js";
import { DocumentCoverPage } from "./DocumentCoverPage.js";
import { PreviewWatermark } from "./PreviewWatermark.js";
import { DiagramMedia } from "../diagrams/DiagramMedia.js";

export const DocumentPreview = {
  components: { MarkdownText, DocumentCoverPage, PreviewWatermark, PrintDocumentButton, DiagramMedia },
  emits: ["print"],
  props: {
    dataModel: { type: Object, required: true },
    documentConfig: { type: Object, default: null },
    documentModel: { type: Object, default: () => ({}) },
    documentSchemas: { type: Array, default: () => [] },
    isPrinting: { type: Boolean, default: false },
    pageSchema: { type: Object, required: true },
    printPageId: { type: String, default: "" },
    printDateLabel: { type: String, required: true },
    projectContext: { type: Object, required: true },
    sectionContext: { type: Object, default: null },
    partial: { type: Boolean, default: false }
  },
  computed: {
    configuration() {
      return this.documentConfig || this.pageSchema.document || {};
    },
    documentName() {
      return this.sectionContext?.documentTitle
        || this.pageSchema.title
        || this.pageSchema.label;
    },
    documentTitle() {
      return formatDocumentTitle(this.projectTitle, this.documentName, { partial: this.isPartial });
    },
    documentType() {
      return this.documentName;
    },
    isPartial() {
      return this.partial || Boolean(this.sectionContext?.partial);
    },
    metadataEntries() {
      const metadata = this.configuration.metadata || [
        { key: "preparedBy", label: "Prepared by" },
        { key: "preparationDate", label: "Date", format: "date" },
        { key: "version", label: "Version" }
      ];

      return metadata.filter(item => !this.pageSchema.omitEmptyFields || hasContent(this.documentValue(item.key))).map((item) => ({
        ...item,
        value: this.formatValue(this.documentValue(item.key), item.format)
      }));
    },
    partialSubtitle() {
      const excerptName = this.pageSchema.partialTitle
        || (this.pageSchema.title !== this.documentName ? this.pageSchema.title : "");
      return excerptName ? `${excerptName} · Working partial` : "Working partial";
    },
    previewSections() {
      return this.pageSchema.sections.filter(section => section.includeInPreview !== false
        && (!this.pageSchema.omitEmptyFields || (section.repeatable ? this.repeaterItems(section).length : this.previewFields(section).length)));
    },
    projectTitle() {
      const key = this.configuration.titleField || "projectName";
      return this.documentValue(key) || "";
    },
    version() {
      const key = this.configuration.versionField || "version";
      return this.documentValue(key) || "0.1";
    }
  },
  methods: {
    narrativeMarkdown,
    displayId(section, item, index) {
      const displayId = section.repeatable.displayId;
      return formatRecordDisplayId(displayId, item, index);
    },
    displayValue(value, field = null) {
      if (field?.reference && value) {
        const choices = referenceChoices(field.reference, this.documentModel);
        return String(value).split(/[,;]\s*/).map(id => choices.find(option => option.value === id)?.label || id).join('; ');
      }
      return fallbackValue(value);
    },
    documentValue(key) {
      if (this.configuration.metadata?.some(item => item.key === key && item.format === "date")) return documentDate(this.dataModel, key);
      const allowedContextFields = this.configuration.contextFallbackFields;

      if (Array.isArray(allowedContextFields) && !allowedContextFields.includes(key)) {
        return this.dataModel?.[key];
      }

      return resolveContextValue(this.dataModel, this.projectContext, key);
    },
    formatValue(value, format) {
      if (!hasContent(value)) {
        return "Not provided";
      }

      if (format === "date") {
        return formatDate(value);
      }

      return value;
    },
    nestedFields(field) {
      return (field.fields || []).filter((nestedField) => nestedField.includeInPreview !== false);
    },
    nestedItemTitle(field, index) {
      return `${field.itemLabel || "Item"} ${index + 1}`;
    },
    populatedNestedRecords(field, value) {
      if (!Array.isArray(value)) {
        return [];
      }

      const fields = this.nestedFields(field);
      return value.filter((record) => fields.some((nestedField) => hasContent(record[nestedField.key])));
    },
    previewFields(section) {
      return (section.fields || []).filter(field => field.includeInPreview !== false
        && (!this.pageSchema.omitEmptyFields || (fieldVisible(field, this.sectionModel(section)) && hasContent(this.sectionModel(section)[field.key]))));
    },
    previewRepeaterFields(section) {
      return section.repeatable.fields.filter((field) => field.includeInPreview !== false);
    },
    repeaterItems(section) {
      return (this.sectionModel(section)[section.repeatable.dataKey] || [])
        .filter((item) => !item._retired && !item.retired);
    },
    primaryRepeaterField(section) {
      const fields = this.previewRepeaterFields(section);
      return fields.find((field) => field.key === section.repeatable.primaryField) || fields[0];
    },
    secondaryRepeaterFields(section, item = null) {
      const primaryField = this.primaryRepeaterField(section);
      return this.previewRepeaterFields(section).filter(field => field.key !== primaryField?.key
        && (!this.pageSchema.omitEmptyFields || !item || ((field.preserveWhenHidden || fieldVisible(field, item)) && hasContent(item[field.key]))));
    },
    fieldNumber(section, sectionIndex, fieldIndex) {
      const field = this.previewFields(section)[fieldIndex];
      if (field?.documentNumber) {
        return field.documentNumber;
      }

      return `${this.sectionNumber(section, sectionIndex)}.${fieldIndex + 1}`;
    },
    requestPrint() {
      this.$emit("print", {
        pageId: this.printPageId || this.pageSchema.id,
        sectionCode: this.pageSchema.code,
        title: this.documentTitle
      });
    },
    sectionModel(section) {
      return dataModelForSection(section, this.dataModel, this.documentModel);
    },
    sectionNumber(section, sectionIndex) {
      if (section.documentNumber) {
        return section.documentNumber;
      }

      const prefix = this.sectionContext?.number ? `${this.sectionContext.number}.` : "";
      return `${prefix}${sectionIndex + 1}`;
    },
    numberDepth(number) {
      return String(number || "").split(".").filter(Boolean).length;
    },
    headingNumber(number) {
      return `${number}${this.numberDepth(number) === 1 ? "." : ""}`;
    },
    sectionHeadingLevel(section, sectionIndex) {
      const sectionDepth = this.numberDepth(this.sectionNumber(section, sectionIndex));

      if (this.sectionContext) {
        const firstChildDepth = this.numberDepth(this.sectionContext.number) + 1;
        return Math.min(6, 3 + Math.max(0, sectionDepth - firstChildDepth));
      }

      const depths = this.previewSections.map((candidate, index) => (
        this.numberDepth(this.sectionNumber(candidate, index))
      ));
      const shallowestDepth = Math.min(...depths.filter(Boolean), sectionDepth || 1);
      return Math.min(6, 2 + Math.max(0, sectionDepth - shallowestDepth));
    },
    sectionHeadingTag(section, sectionIndex) {
      return `h${this.sectionHeadingLevel(section, sectionIndex)}`;
    },
    fieldHeadingTag(section, sectionIndex) {
      return `h${Math.min(6, this.sectionHeadingLevel(section, sectionIndex) + 1)}`;
    },
    fieldHeadingText(section, sectionIndex, fieldIndex) {
      const field = this.previewFields(section)[fieldIndex];
      const number = section.numberFields === false
        ? ""
        : `${this.fieldNumber(section, sectionIndex, fieldIndex)} `;
      return `${number}${field.label}`;
    },
    contextHeadingText() {
      const number = this.sectionContext?.number
        ? `${this.headingNumber(this.sectionContext.number)} `
        : "";
      return `${number}${this.sectionContext?.title || ""}`;
    },
    sectionHeadingText(section, sectionIndex) {
      const number = this.sectionNumber(section, sectionIndex);
      return `${this.headingNumber(number)} ${section.title}`;
    }
  },
  template: `
    <div :id="pageSchema.id + '-preview'" class="document-preview-section">
      <div class="preview-toolbar">
        <div>
          <p class="section-kicker mb-1">Live document</p>
          <h2 class="h4 mb-1">Preview</h2>
          <p class="text-body-secondary mb-0">Updates automatically as you edit the form.</p>
        </div>
        <print-document-button
          :is-printing="isPrinting"
          @print="requestPrint"
        ></print-document-button>
      </div>

      <article class="document-preview is-print-target" :aria-label="pageSchema.label + ' document preview'">
        <header class="print-running-header" aria-hidden="true">
          <span>{{ documentTitle }}</span>
          <span>{{ printDateLabel }}</span>
        </header>

        <div class="document-content" :class="{ 'document-compact': pageSchema.compactPreview }">
          <preview-watermark :is-printing="isPrinting" :is-partial="isPartial"></preview-watermark>
          <document-cover-page
            v-if="!isPartial"
            :document-code="pageSchema.code"
            :document-name="documentName"
            :metadata-entries="metadataEntries"
            :project-title="projectTitle"
          ></document-cover-page>

          <header v-else class="document-title-block document-partial-title-block">
            <p class="document-type">{{ documentType }}</p>
            <h1>{{ projectTitle || "Untitled Project" }}</h1>
            <p class="document-subtitle">{{ partialSubtitle }}</p>
            <dl class="document-meta">
              <div v-for="item in metadataEntries" :key="item.key">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
          </header>

          <div class="document-body" :class="{ 'document-body-after-cover': !isPartial }">
          <template v-if="previewSections.length">
            <section v-if="sectionContext" class="document-context-section">
              <h2>{{ contextHeadingText() }}</h2>
            </section>
            <section v-for="(section, sectionIndex) in previewSections" :key="section.key">
              <div v-if="section.repeatable" class="document-heading-group document-table-heading-group">
                <component :is="sectionHeadingTag(section, sectionIndex)">{{ sectionHeadingText(section, sectionIndex) }}</component>
              </div>

              <component
                :is="pageSchema.compactPreview && !section.repeatable.displayId ? 'ul' : 'div'"
                v-if="section.repeatable && section.repeatable.previewStyle === 'list'"
                class="document-record-list"
              >
                <p v-if="!repeaterItems(section).length" class="document-empty">No records have been added yet.</p>
                <component
                  :is="pageSchema.compactPreview && !section.repeatable.displayId ? 'li' : 'article'"
                  v-for="(item, itemIndex) in repeaterItems(section)"
                  :key="item.id"
                  class="document-record"
                  :class="{ 'document-record-with-figure': section.repeatable.artifactField }"
                >
                  <header class="document-record-heading">
                    <span v-if="section.repeatable.displayId" class="document-record-id">{{ displayId(section, item, itemIndex) }}</span>
                    <markdown-text v-if="narrativeMarkdown(primaryRepeaterField(section))" :value="item[primaryRepeaterField(section).key]"></markdown-text>
                    <p v-else class="document-record-primary preserve-lines">{{ displayValue(item[primaryRepeaterField(section).key], primaryRepeaterField(section)) }}</p>
                  </header>
                  <dl v-if="secondaryRepeaterFields(section, item).length" class="document-record-meta">
                    <div
                      v-for="field in secondaryRepeaterFields(section, item)"
                      :key="field.key"
                      :class="{ 'document-record-meta-wide': ['nested-records', 'diagram-file'].includes(field.type) }"
                    >
                      <dt>{{ field.label }}</dt>
                      <dd v-if="field.type === 'diagram-file'">
                        <figure class="document-figure">
                          <diagram-media :file="item[field.key]" :title="item.title || field.label"></diagram-media>
                          <figcaption>Figure {{ displayId(section, item, itemIndex) }} — {{ item.title || 'Untitled diagram' }}</figcaption>
                        </figure>
                      </dd>
                      <dd v-else-if="field.type === 'nested-records'">
                        <ol v-if="populatedNestedRecords(field, item[field.key]).length" class="document-nested-records">
                          <li v-for="(record, recordIndex) in populatedNestedRecords(field, item[field.key])" :key="record.id">
                            <strong>{{ nestedItemTitle(field, recordIndex) }}</strong>
                            <dl>
                              <div v-for="nestedField in nestedFields(field)" :key="nestedField.key">
                                <dt>{{ nestedField.label }}</dt>
                                <dd><markdown-text v-if="narrativeMarkdown(nestedField)" :value="record[nestedField.key]"></markdown-text><span v-else class="preserve-lines">{{ displayValue(record[nestedField.key]) }}</span></dd>
                              </div>
                            </dl>
                          </li>
                        </ol>
                        <span v-else class="document-empty">Not provided</span>
                      </dd>
                      <dd v-else-if="narrativeMarkdown(field)"><markdown-text :value="item[field.key]"></markdown-text></dd>
                      <dd v-else class="preserve-lines">{{ displayValue(item[field.key], field) }}</dd>
                    </div>
                  </dl>
                </component>
              </component>

              <div v-else-if="section.repeatable && repeaterItems(section).length" class="document-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th v-if="section.repeatable.displayId" scope="col">ID</th>
                      <th v-for="field in previewRepeaterFields(section)" :key="field.key" scope="col">{{ field.label }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, itemIndex) in repeaterItems(section)" :key="item.id">
                      <td v-if="section.repeatable.displayId">{{ displayId(section, item, itemIndex) }}</td>
                      <td v-for="field in previewRepeaterFields(section)" :key="field.key" ><markdown-text v-if="narrativeMarkdown(field)" :value="item[field.key]"></markdown-text><span v-else class="preserve-lines">{{ displayValue(item[field.key], field) }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else-if="section.repeatable" class="document-empty">No records have been added yet.</p>

              <template v-else>
                <div class="document-heading-group">
                  <component :is="sectionHeadingTag(section, sectionIndex)">{{ sectionHeadingText(section, sectionIndex) }}</component>
                  <component v-if="!pageSchema.compactPreview && previewFields(section).length" :is="fieldHeadingTag(section, sectionIndex)">{{ fieldHeadingText(section, sectionIndex, 0) }}</component>
                </div>
                <template v-for="(field, fieldIndex) in previewFields(section)" :key="field.key">
                  <component v-if="!pageSchema.compactPreview && fieldIndex > 0" :is="fieldHeadingTag(section, sectionIndex)">{{ fieldHeadingText(section, sectionIndex, fieldIndex) }}</component>
                  <strong v-if="pageSchema.compactPreview && field.type === 'checkbox-group' && previewFields(section).length > 1">{{ field.label }}</strong>
                  <ul v-if="field.type === 'checkbox-group' && Array.isArray(sectionModel(section)[field.key]) && sectionModel(section)[field.key].length">
                    <li v-for="option in sectionModel(section)[field.key]" :key="option">{{ option }}</li>
                  </ul>
                  <p v-else-if="field.type === 'checkbox-group'" class="document-empty">Not provided</p>
                  <div v-else-if="narrativeMarkdown(field)"><strong v-if="pageSchema.compactPreview && previewFields(section).length > 1">{{ field.label }}:</strong><markdown-text :value="sectionModel(section)[field.key]"></markdown-text></div>
                  <p v-else class="preserve-lines"><strong v-if="pageSchema.compactPreview && previewFields(section).length > 1">{{ field.label }}: </strong>{{ displayValue(sectionModel(section)[field.key], field) }}</p>
                </template>
              </template>
            </section>
          </template>
          <section v-else>
            <h2>1. Overview</h2>
            <p>{{ pageSchema.description }}</p>
            <blockquote>This section is ready to generate from its schema when its workspace is developed.</blockquote>
          </section>
          </div>
        </div>

        <footer class="print-running-footer" aria-hidden="true">
          <span>{{ projectTitle || "Untitled Dynamic SRS" }}</span>
          <span class="print-page-number">Page </span>
          <span>{{ pageSchema.code }} · v{{ version }}</span>
        </footer>
      </article>
    </div>
  `
};
