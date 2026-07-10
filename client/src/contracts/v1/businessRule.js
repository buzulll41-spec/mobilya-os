/**
 * İş Kuralları DTO'ları (backend `businessRuleDto.ts` ile eş).
 *
 * @typedef {'COLLECTION'|'SHIPMENT'|'PROFITABILITY'|'DATA_QUALITY'|'RISK'|'AUTOMATION'|'OPERATIONS'|'SALES'} BusinessRuleCategory
 * @typedef {'NUMBER'|'PERCENT'|'BOOLEAN'|'TEXT'|'ENUM'} BusinessRuleValueType
 * @typedef {'INFO'|'WARNING'|'CRITICAL'} BusinessRuleSeverity
 *
 * @typedef {Object} BusinessRuleDto
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} description
 * @property {BusinessRuleCategory} category
 * @property {BusinessRuleSeverity} severity
 * @property {BusinessRuleValueType} valueType
 * @property {boolean} isEnabled
 * @property {string} value
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {Object} BusinessRulesResponseDto
 * @property {Object} summary
 * @property {BusinessRuleDto[]} rules
 * @property {Object} filters
 * @property {string} generatedAt
 *
 * @typedef {Object} RuleSimulationDto
 * @property {string} ruleCode
 * @property {string} proposedValue
 * @property {string} currentValue
 * @property {Array<{label:string,before:number,after:number,delta:number}>} metrics
 * @property {number} advisoriesBefore
 * @property {number} advisoriesAfter
 * @property {number} actionsBefore
 * @property {number} actionsAfter
 * @property {number} automationJobsBefore
 * @property {number} automationJobsAfter
 * @property {number} casesBefore
 * @property {number} casesAfter
 * @property {boolean} depoKatiMentioned
 * @property {string} generatedAt
 */

export {}
