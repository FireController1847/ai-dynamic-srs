import type { DataModel, DocumentModel, SchemaNode, Section } from '../core/schema/schema-types.ts';
import { asDataModel } from '../core/schema/data-models.ts';
import { parseAiFormResponse } from '../core/ai/form-response.ts';
import { applyAiFormResponse } from '../core/ai/form-response-import.ts';
import type { AiFormImportExpectation, AiFormImportResult } from '../core/ai/form-response-import.ts';

interface ActiveTarget {
  page: SchemaNode;
  section: Section;
  dataModel: DataModel;
}

function currentTarget(
  root: SchemaNode,
  document: DocumentModel,
  activeSubpages: Record<string, string>,
  responseText: string,
  expectedPage?: string,
  expectedSection?: string
): ActiveTarget {
  const response = parseAiFormResponse(responseText);
  let page = root;
  let dataModel: DataModel = asDataModel(document[page.stateKey]);

  while (page.subpages?.length) {
    const selected = activeSubpages[page.id] || page.defaultSubpageId || page.subpages[0].id;
    const child = page.subpages.find(candidate => candidate.id === selected) || page.subpages[0];
    dataModel = asDataModel(dataModel[child.stateKey]);
    page = child;
  }

  if ((expectedPage && response.page !== expectedPage)
    || (expectedSection && response.section !== expectedSection)) {
    throw new Error('This response targets a different scope than the last copied AI prompt. Copy that prompt again.');
  }
  if (response.page !== page.id) {
    throw new Error('This JSON targets a different form. Open the same tab/stage where its prompt was copied.');
  }
  const section = page.sections?.find(candidate => candidate.id === response.section);
  if (!section) {
    throw new Error('This JSON section is not on the current form. Reopen its original stage or copy a fresh prompt.');
  }
  if (root.id === 'notes') {
    throw new Error('Notes uses an audited revision editor. Continue entering Notes answers manually until its separate import workflow is supported.');
  }
  return { page, section, dataModel };
}

export function importAiFormOnActivePage(args: {
  root: SchemaNode;
  document: DocumentModel;
  activeSubpages: Record<string, string>;
  responseText: string;
  preview: boolean;
  expectedPage?: string;
  expectedSection?: string;
  expectation?: AiFormImportExpectation;
}): AiFormImportResult {
  // Validate against an isolated data snapshot, never the live Vue proxy.
  // The same parser/merge engine is used for preview and the actual apply.
  const document = args.preview
    ? JSON.parse(JSON.stringify(args.document)) as DocumentModel
    : args.document;
  const { page, section, dataModel } = currentTarget(
    args.root, document, args.activeSubpages, args.responseText, args.expectedPage, args.expectedSection
  );
  return applyAiFormResponse({
    page, section, dataModel, documentModel: document,
    response: args.responseText,
    ...(args.expectation ? { expectation: args.expectation } : {})
  });
}
