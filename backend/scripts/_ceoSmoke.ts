import { buildApp } from "../src/app.js";

const app = await buildApp();
await app.ready();
const res = await app.inject({ method: "GET", url: "/v1/reports/ceo-control-center" });
const body = res.json();
const raw = JSON.stringify(body);
const panels = {
  managerScore: !!body.managerScore,
  dailyBriefing: !!body.dailyBriefing,
  finance: !!body.finance,
  operationsHealth: !!body.operationsHealth,
  peopleRisk: !!body.peopleRisk,
  automation: !!body.automation,
};
const score = body.managerScore?.score;
const checks = {
  http200: res.statusCode === 200,
  summaryPopulated: Boolean(body.currency && body.today && body.generatedAt),
  sixPanels: Object.values(panels).every(Boolean),
  briefingPresent: Boolean(body.dailyBriefing?.headline && body.dailyBriefing?.paragraphs?.length),
  scoreRange: typeof score === "number" && score >= 0 && score <= 100,
  topAlertsMax10: Array.isArray(body.topAlerts) && body.topAlerts.length <= 10,
  noDepoKati: !raw.includes("Depo Katı") && !raw.includes("WAREHOUSE"),
};
console.log(JSON.stringify({
  statusCode: res.statusCode,
  panels,
  managerScore: body.managerScore?.score,
  managerScoreBand: body.managerScore?.band,
  topAlertsCount: body.topAlerts?.length ?? 0,
  topAlertsFirst3: (body.topAlerts ?? []).slice(0, 3),
  financeSample: body.finance ? { monthRevenue: body.finance.monthRevenue, collected: body.finance.collected } : null,
  briefingHeadline: body.dailyBriefing?.headline,
  checks,
  depoKatiInJson: raw.includes("Depo Katı"),
  warehouseInJson: raw.includes("WAREHOUSE"),
}, null, 2));
await app.close();

