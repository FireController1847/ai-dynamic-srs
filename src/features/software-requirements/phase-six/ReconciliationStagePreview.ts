import { defineComponent } from 'vue';
import type { DataModel, SchemaNode, Section, Field } from '../../../core/schema/schema-types.ts';
import { documentPreviewProps } from '../../../components/preview/DocumentPreview.ts';
import { PlacedStagePreview } from '../../../components/preview/PlacedStagePreview.ts';
import { reconciliationModel } from './traceability.ts';

const reportFields: Field[] = [
  {key:'requirementId',label:'Requirement ID',type:'text'},
  {key:'requirementStatement',label:'Requirement statement',type:'textarea'},
  {key:'sources',label:'Supporting sources / use cases',type:'textarea'},
  {key:'goals',label:'Goals and actors',type:'text'},
  {key:'paths',label:'Behavior paths',type:'text'},
  {key:'models',label:'Related model figures',type:'text'},
  {key:'criterion',label:'Planned acceptance criterion',type:'textarea'},
  {key:'method',label:'Planned verification method',type:'text'},
  {key:'reviewStatus',label:'Requirement review status',type:'text'},
  {key:'outstanding',label:'Outstanding structural questions',type:'textarea'}
];
function traceabilitySection(target:string):Section {
  return {
    id:'derived-requirement-traceability',
    key:'derivedRequirementTraceability',
    title:'Requirements Traceability (derived from canonical records)',
    description:'Working record links and planned verification only. No test execution or approval is implied.',
    documentTarget:target,
    repeatable:{
      dataKey:'derivedTraceabilityRows',
      itemLabel:'Requirement',
      minimum:0,
      stableIds:true,
      previewStyle:'list',
      primaryField:'requirementId',
      fields:reportFields
    }
  };
}

export const ReconciliationStagePreview = defineComponent({
  name:'ReconciliationStagePreview',
  inheritAttrs:false,
  components:{PlacedStagePreview},
  props:documentPreviewProps,
  emits:['print'],
  computed:{
    includesTraceability():boolean {
      return ['srs-reconciliation-coverage','srs-reconciliation-verification'].includes(this.pageSchema.id);
    },
    previewPage():SchemaNode {
      if(!this.includesTraceability) return this.pageSchema;
      const target=this.pageSchema.id==='srs-reconciliation-verification'
        ? 'verification-traceability.traceability' : 'verification-traceability.coverage';
      return {...this.pageSchema,
        sections:[...(this.pageSchema.sections || []),traceabilitySection(target)]};
    },
    previewData():DataModel {
      if(!this.includesTraceability) return this.dataModel;
      const rows=reconciliationModel(this.documentModel).requirements.map((row,index)=>({
        id:index+1,requirementId:row.id,requirementStatement:row.statement,
        sources:[row.sourceEvidence,row.useCases.join(', ')].filter(Boolean).join('; '),
        goals:[row.goals.join(', '),row.actors.join(', ')].filter(Boolean).join('; '),
        paths:row.paths,models:row.figures.join(', '),criterion:row.criterion,
        method:row.method,reviewStatus:row.status,outstanding:row.findings.join('; ')
      }));
      return {...this.dataModel,derivedTraceabilityRows:rows};
    }
  },
  template:`
    <placed-stage-preview :page-schema="previewPage" :data-model="previewData"
      :document-config="documentConfig" :document-model="documentModel"
      :project-context="projectContext" :print-date-label="printDateLabel"
      :print-page-id="printPageId" :is-printing="isPrinting" :section-context="sectionContext"
      @print="$emit('print',$event)"
    ></placed-stage-preview>
  `
});
