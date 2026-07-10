/**

 * @typedef {'COLLECTION_FIRST' | 'AGGRESSIVE_GROWTH' | 'CONTROLLED_GROWTH' | 'COST_REDUCTION' | 'CASH_PROTECTION' | 'SUPPLIER_FOCUS'} LearningStrategy

 */



/**

 * @typedef {'UP' | 'DOWN' | 'FLAT'} TrendDirection

 */



/**

 * @typedef {Object} StrategySummaryDto

 * @property {LearningStrategy} strategy

 * @property {number} successRate

 * @property {number} usageCount

 * @property {number} impactScore

 * @property {number} overallScore

 */



/**

 * @typedef {Object} StrategyTableRowDto

 * @property {LearningStrategy} strategy

 * @property {number} usageCount

 * @property {number} successRate

 * @property {number} impactScore

 * @property {number} overallScore

 */



/**

 * @typedef {Object} AgentLearningRowDto

 * @property {string} agent

 * @property {number} taskCount

 * @property {number} successRate

 * @property {number} impactScore

 */



/**

 * @typedef {Object} DecisionTrendWindowDto

 * @property {number} score

 * @property {TrendDirection} trend

 */



/**

 * @typedef {Object} DecisionTrendDto

 * @property {DecisionTrendWindowDto} days30

 * @property {DecisionTrendWindowDto} days90

 * @property {DecisionTrendWindowDto} days180

 */



/**

 * @typedef {Object} LessonLearnedDto

 * @property {string} id

 * @property {string} category

 * @property {string} lesson

 * @property {number} confidence

 */



/**

 * @typedef {Object} LearningRecommendationDto

 * @property {string} id

 * @property {'P1' | 'P2' | 'P3'} priority

 * @property {string} title

 * @property {string} rationale

 */



/**

 * @typedef {Object} LearningEngineResponseDto

 * @property {number} learningScore

 * @property {StrategySummaryDto} bestStrategy

 * @property {StrategySummaryDto} worstStrategy

 * @property {StrategyTableRowDto[]} strategyTable

 * @property {AgentLearningRowDto[]} agentLearning

 * @property {DecisionTrendDto} decisionTrend

 * @property {LessonLearnedDto[]} lessonsLearned

 * @property {LearningRecommendationDto[]} recommendations

 * @property {string} summary

 * @property {string} today

 * @property {string} generatedAt

 * @property {{ depoKatiExcluded: boolean, virtualOnly: boolean }} meta

 */



export {}


