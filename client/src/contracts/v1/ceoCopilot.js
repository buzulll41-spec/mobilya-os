/** FAZ 102 — CEO Copilot contracts. */

export const CEO_COPILOT_ROLE = {
  CEO: 'ceo',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
}

export const CEO_COPILOT_INTENT = {
  TODAY_ISSUES: 'today_issues',
  TODAY_PRIORITIES: 'today_priorities',
  COLLECTION_WHY: 'collection_why',
  REVENUE_WHY: 'revenue_why',
  RISKS: 'risks',
  WORKER_COLLECTION: 'worker_collection',
  WORKER_SHIPMENT: 'worker_shipment',
  WORKER_SALES: 'worker_sales',
  WORKER_PROCUREMENT: 'worker_procurement',
  COMPANY_HEALTH: 'company_health',
  GRAPH_OVERDUE_READY: 'graph_overdue_ready',
  GRAPH_EMPLOYEE_RISKY: 'graph_employee_risky',
  PREDICTION_RISKY_ORDERS: 'prediction_risky_orders',
  PREDICTION_TOMORROW_DELAY: 'prediction_tomorrow_delay',
  PREDICTION_RISKY_CUSTOMERS: 'prediction_risky_customers',
  PREDICTION_WEEK_COLLECTION: 'prediction_week_collection',
  LEARNING_ACCURACY: 'learning_accuracy',
  LEARNING_BEST_PREDICTION: 'learning_best_prediction',
  LEARNING_WORST_TOPIC: 'learning_worst_topic',
  LEARNING_CONFIDENCE: 'learning_confidence',
  DECISION_BEST_WORKER: 'decision_best_worker',
  DECISION_LOW_QUALITY: 'decision_low_quality',
  DECISION_30_DAY_PERFORMANCE: 'decision_30_day_performance',
  DECISION_RISK_REDUCTION: 'decision_risk_reduction',
  OPTIMIZATION_MONTHLY_GROWTH: 'optimization_monthly_growth',
  OPTIMIZATION_BEST_WORKER: 'optimization_best_worker',
  OPTIMIZATION_MOST_CHANGES: 'optimization_most_changes',
  OPTIMIZATION_CURRENT_STRATEGY: 'optimization_current_strategy',
  COLLABORATION_TODAY_FEED: 'collaboration_today_feed',
  COLLABORATION_MOST_HELP: 'collaboration_most_help',
  COLLABORATION_BUSIEST_TEAM: 'collaboration_busiest_team',
  BOARD_CONVENE: 'board_convene',
  BOARD_TODAY_MEETING: 'board_today_meeting',
  BOARD_TOP_DECISIONS: 'board_top_decisions',
  BOARD_TOMORROW_FOCUS: 'board_tomorrow_focus',
  BOARD_STRATEGIC_QUESTION: 'board_strategic_question',
  BOARD_HISTORY: 'board_history',
  SHOW_DETAIL: 'show_detail',
  EXECUTE_ACTION: 'execute_action',
  GENERAL: 'general',
}

export const CEO_COPILOT_TOOL = {
  NAVIGATE: 'navigate',
  RUN_BRAIN_SCAN: 'run_brain_scan',
  FETCH_CONTEXT: 'fetch_context',
}

/** @typedef {'mock' | 'openai' | 'gemini'} LlmProviderId */
