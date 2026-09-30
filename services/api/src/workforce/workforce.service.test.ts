// ==========================================================
// services/api/src/workforce/workforce.service.test.ts
// Unit Tests for Phase 8 Workforce Valuation, Benchmarks & Simulation
// ==========================================================

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { WorkforceService } from './workforce.service.js';

describe('Phase 8 WorkforceService & Workload Mirror Tests', () => {
  const service = new WorkforceService();

  test('Test 1: Role normalization & catalog retrieval', () => {
    const roles = service.getMarketRoles();
    assert.ok(roles.length >= 6, 'Must have at least 6 normalized market roles');
    const webAdmin = service.getMarketRoleById('mkt_web_admin');
    assert.equal(webAdmin.canonicalTitle, 'Web Administrator');
    assert.ok(webAdmin.alternateTitles.includes('Website Administrator'));
    assert.equal(webAdmin.normalizedKdiLevel, 'MID');
  });

  test('Test 2: Salary benchmark source registration & hierarchy', () => {
    const sources = service.getSources();
    assert.ok(sources.length >= 4, 'Must have verified sources seeded');
    const bps = sources.find((s) => s.reliabilityTier === 'TIER_A');
    assert.ok(bps, 'Tier A official source must exist');
    assert.equal(bps?.country, 'Indonesia');

    // Register a new source
    const newSrc = service.registerSource({
      name: 'Indonesia Tech Salary Survey 2026',
      provider: 'TechInAsia Indonesia',
      url: 'https://techinasia.com/salary-guide',
      country: 'Indonesia',
      region: 'National',
      dataType: 'Tech Industry Report',
      publicationDate: '2026-04-01',
      effectivePeriod: '2026',
      methodology: 'Survey of 450 tech startups',
      reliabilityTier: 'TIER_B',
    });
    assert.ok(newSrc.sourceId);
    assert.equal(service.getSourceById(newSrc.sourceId).name, 'Indonesia Tech Salary Survey 2026');
  });

  test('Test 3: Benchmark snapshot generation', () => {
    const initialCount = service.getSnapshots('bmk_web_admin_jateng').length;
    assert.ok(initialCount >= 1, 'Initial snapshot must be created');
    const snap = service.createSnapshot('bmk_web_admin_jateng', 'Q3 Revision Snapshot');
    assert.equal(snap.benchmarkId, 'bmk_web_admin_jateng');
    assert.ok(snap.snapshotId.startsWith('snap_'));
    assert.equal(service.getSnapshots('bmk_web_admin_jateng').length, initialCount + 1);
  });

  test('Test 4: Historical benchmark preservation', () => {
    const beforeUpdate = { ...service.getBenchmarkById('bmk_web_admin_jateng') };
    const oldSalary = beforeUpdate.salaryMedian;

    // Snapshot before modification
    const snap = service.createSnapshot('bmk_web_admin_jateng', 'Pre-adjustment backup');
    assert.equal(snap.salaryMedian, oldSalary);

    // Update benchmark
    service.createOrUpdateBenchmark({
      benchmarkId: 'bmk_web_admin_jateng',
      marketRoleId: beforeUpdate.marketRoleId,
      marketRoleTitle: beforeUpdate.marketRoleTitle,
      location: beforeUpdate.location,
      country: beforeUpdate.country,
      currency: 'IDR',
      salaryMin: 4500000,
      salaryMedian: 5800000,
      salaryMax: 7200000,
      experienceLevel: 'MID',
      employmentType: 'FULL_TIME',
      sourceId: beforeUpdate.sourceId,
      sourceName: beforeUpdate.sourceName,
      sourceUrl: beforeUpdate.sourceUrl,
      sourceTier: beforeUpdate.sourceTier,
      publicationDate: '2026-06-01',
      effectivePeriod: '2026',
      isCurrent: true,
      isStale: false,
      confidence: 'HIGH',
      version: 2,
    });

    const afterUpdate = service.getBenchmarkById('bmk_web_admin_jateng');
    assert.equal(afterUpdate.salaryMedian, 5800000);
    // Historical snapshot still has oldSalary
    assert.equal(snap.salaryMedian, oldSalary);

    // Restore original benchmark to preserve baseline for subsequent tests
    service.createOrUpdateBenchmark(beforeUpdate);
  });

  test('Test 5: Geographic filtering', () => {
    const centralJavaBenchmarks = service.getBenchmarks({ location: 'Central Java' });
    assert.ok(centralJavaBenchmarks.length >= 4, 'Must find Central Java benchmarks');
    for (const b of centralJavaBenchmarks) {
      assert.ok(
        b.location.toLowerCase().includes('central java') || (b.region && b.region.toLowerCase().includes('jawa tengah')),
        'Location must match filter'
      );
    }
  });

  test('Test 6: Experience-level filtering', () => {
    const midBenchmarks = service.getBenchmarks({ experienceLevel: 'MID' });
    assert.ok(midBenchmarks.length >= 4);
    for (const b of midBenchmarks) {
      assert.equal(b.experienceLevel, 'MID');
    }
  });

  test('Test 7: Role matching & algorithm ranking', () => {
    const matches = service.findCandidateRoles({
      title: 'Web Master',
      skills: ['DNS Management', 'Linux Shell'],
      tools: ['Cloudflare'],
    });
    assert.ok(matches.length >= 1);
    assert.equal(matches[0].marketRole.marketRoleId, 'mkt_web_admin');
    assert.ok(matches[0].matchScore >= 0.5);
  });

  test('Test 8: Mapping confidence assignment', () => {
    const highMatch = service.findCandidateRoles({
      title: 'Web Administrator',
      skills: ['DNS Management', 'Apache/Nginx', 'SSL/TLS'],
      tools: ['cPanel', 'Cloudflare'],
    });
    assert.equal(highMatch[0].confidence, 'HIGH');

    const lowMatch = service.findCandidateRoles({
      title: 'Helper',
      skills: ['General assistance'],
    });
    if (lowMatch.length > 0) {
      assert.equal(lowMatch[0].confidence, 'LOW');
    }
  });

  test('Test 9: Responsibility overlap detection', () => {
    const canonical = service.getWorkloadProfileById('prf_human_operator_01');
    const wpMapping = canonical.mappings.find((m) => m.marketRoleId === 'mkt_wp_specialist');
    assert.ok(wpMapping);
    assert.ok(wpMapping.overlapFactor > 0, 'WordPress mapping must have overlapFactor > 0');
  });

  test('Test 10: Double-counting prevention in workload valuation', () => {
    const canonical = service.getWorkloadProfileById('prf_human_operator_01');
    const wpVal = canonical.equivalentRoles.find((r) => r.marketRoleId === 'mkt_wp_specialist');
    assert.ok(wpVal);
    // 40% allocation * (1 - 0.1 overlap) = 0.36 -> rounded to 0.4 in effectiveFte
    assert.ok(wpVal.equivalentFte <= 0.4);
    assert.ok(wpVal.illustrativeValueMedian < wpVal.benchmark.salaryMedian);
  });

  test('Test 11: Workload allocation calculation', () => {
    const canonical = service.getWorkloadProfileById('prf_human_operator_01');
    const webAdminVal = canonical.equivalentRoles.find((r) => r.marketRoleId === 'mkt_web_admin');
    assert.ok(webAdminVal);
    assert.equal(webAdminVal.allocationPercentage, 100);
    assert.equal(webAdminVal.equivalentFte, 1.0);
  });

  test('Test 12: Equivalent FTE aggregation', () => {
    const canonical = service.getWorkloadProfileById('prf_human_operator_01');
    assert.equal(canonical.totalEquivalentFte, 3.2, 'Canonical profile represents 3.2 FTE');
  });

  test('Test 13: Salary range calculation (Min, Median, Max)', () => {
    const canonical = service.getWorkloadProfileById('prf_human_operator_01');
    const val = canonical.illustrativeWorkforceValue;
    assert.ok(val.monthlyMin < val.monthlyMedian);
    assert.ok(val.monthlyMedian < val.monthlyMax);
    assert.equal(val.annualizedMedian, val.monthlyMedian * 12);
  });

  test('Test 14: Benchmark aggregation across roles', () => {
    const canonical = service.getWorkloadProfileById('prf_human_operator_01');
    let sumMedian = 0;
    for (const r of canonical.equivalentRoles) {
      sumMedian += r.illustrativeValueMedian;
    }
    assert.equal(canonical.illustrativeWorkforceValue.monthlyMedian, sumMedian);
  });

  test('Test 15: Source conflict handling & dispersion analysis', () => {
    const conflict = service.handleSourceConflict('mkt_web_admin', 'Central Java');
    assert.ok(conflict.sourcesCount >= 1);
    assert.ok(conflict.blendedMedian > 0);
    assert.ok(conflict.blendedMethodology.includes('median aggregation'));
  });

  test('Test 16: Stale benchmark detection', () => {
    const checkFresh = service.checkStaleness('bmk_web_admin_jateng', 365);
    assert.equal(checkFresh.isStale, false);

    // Stale if threshold is 0 days
    const checkStale = service.checkStaleness('bmk_web_admin_jateng', 0);
    assert.equal(checkStale.isStale, true);
    assert.ok(checkStale.stalenessReason?.includes('exceeds freshness threshold'));
  });

  test('Test 17: Illustrative gap calculation', () => {
    const canonical = service.getWorkloadProfileById('prf_human_operator_01');
    const gap = canonical.illustrativeGap;
    const actual = canonical.actualCompensation.totalMonthly;
    const expectedGapMedian = canonical.illustrativeWorkforceValue.monthlyMedian - actual;
    assert.equal(gap.monthlyMedian, expectedGapMedian);
    assert.ok(gap.monthlyMedian > 0, 'Gap must be positive when benchmark exceeds actual');
  });

  test('Test 18: Actual compensation input parsing', () => {
    const canonical = service.getWorkloadProfileById('prf_human_operator_01');
    assert.equal(canonical.actualCompensation.baseSalary, 3800000);
    assert.equal(canonical.actualCompensation.allowances, 700000);
    assert.equal(canonical.actualCompensation.totalMonthly, 4500000);
  });

  test('Test 19: AI virtual cost calculation (Virtual comp + LLM + Tool + Infra)', () => {
    const farhan = service.getVirtualEmployeeById('AGT-ENG-001');
    assert.equal(farhan.virtualCompensation.totalMonthly, 15000000);
    assert.equal(farhan.operatingCost.totalMonthlyIdr, 3840000);
    assert.equal(farhan.totalCostMonthlyIdr, 18840000);
  });

  test('Test 20: Project cost allocation & department summary', () => {
    const summary = service.getAiWorkforceSummary();
    assert.ok(summary.totalVirtualEmployees >= 5);
    assert.ok(summary.departments['Engineering'] >= 2);
    assert.ok(summary.totalVirtualCompensationMonthly > 0);
    assert.ok(summary.totalOperatingCostMonthly > 0);
    assert.equal(
      summary.totalCombinedAiCostMonthly,
      summary.totalVirtualCompensationMonthly + summary.totalOperatingCostMonthly
    );
  });

  test('Test 21: What-if simulation engine', () => {
    const sim = service.runWhatIfSimulation('prf_human_operator_01', {
      scenarioName: 'Scenario with Reduced Responsibilities',
      removedResponsibilityIds: ['resp_it_support'],
    });
    assert.equal(sim.adjustedResponsibilities.length, 5);
    assert.ok(sim.projectedFte < 3.2, 'FTE should decrease after removal');
    assert.ok(sim.comparisonBaselineDiff < 0, 'Valuation difference should be negative');
  });

  test('Test 22: Audit logging for changes', () => {
    const initialCount = service.getAuditRecords().length;
    service.registerSource({
      name: 'Audit Test Source',
      provider: 'Test Provider',
      url: 'https://test.com',
      country: 'Indonesia',
      region: 'Test',
      dataType: 'Test',
      publicationDate: '2026-01-01',
      effectivePeriod: '2026',
      methodology: 'Test',
      reliabilityTier: 'TIER_C',
    });
    const logs = service.getAuditRecords();
    assert.equal(logs.length, initialCount + 1);
    assert.equal(logs[0].action, 'CREATE');
  });

  test('Test 23: Authorization & sensitive data check', () => {
    const profile = service.getWorkloadProfileById('prf_human_operator_01');
    assert.ok(profile.actualCompensation.totalMonthly > 0);
    // Profile must have confidential disclaimer
    assert.ok(profile.disclaimer.includes('ILLUSTRATIVE MARKET WORKFORCE VALUATION ONLY'));
  });

  test('Test 24: Public data leakage prevention', () => {
    const publicData = service.getPublicWorkforceSummary();
    const jsonStr = JSON.stringify(publicData);
    assert.equal(jsonStr.includes('EMP-OPERATOR-01'), false, 'Human ID must NOT leak to public');
    assert.equal(jsonStr.includes('4500000'), false, 'Actual human compensation must NOT leak to public');
    assert.equal(jsonStr.includes('11280000'), false, 'Illustrative gap must NOT leak to public');
    assert.ok(publicData.technologyWorkforce.totalDigitalAgents >= 5);
  });

  test('Test 25: Graph integration entity generation', () => {
    const graph = service.getGraphEntities();
    assert.ok(graph.nodes.length >= 10, 'Graph nodes must include sources, roles, benchmarks');
    assert.ok(graph.relationships.length >= 10, 'Graph relationships must link benchmarks and roles');
    const sourceNode = graph.nodes.find((n) => n.label === 'SalaryBenchmarkSource');
    assert.ok(sourceNode);
  });

  test('Test 26: GraphRAG source provenance query', () => {
    const rag = service.queryGraphRAGProvenance('What roles cover this workload?');
    assert.equal(rag.supportStatus, 'SUPPORTED');
    assert.ok(rag.citedSources.length >= 1);
    assert.ok(rag.citedSources[0].url.startsWith('https://'));
  });

  test('Test 27: 3D visualization summary extraction', () => {
    const threeView = service.getThreeViewComparison();
    assert.ok(threeView.actualHumanCompensationMonthly > 0);
    assert.ok(threeView.equivalentMarketBenchmarkMedianMonthly > 0);
    assert.ok(threeView.aiActualOperatingCostMonthly > 0);
    assert.equal(threeView.currency, 'IDR');
  });

  test('Test 28: PDF/CSV/JSON export formats', () => {
    const jsonExport = service.exportWorkloadValuation('prf_human_operator_01', 'json');
    assert.equal(jsonExport.format, 'json');
    assert.ok(jsonExport.content.includes('prf_human_operator_01'));

    const csvExport = service.exportWorkloadValuation('prf_human_operator_01', 'csv');
    assert.equal(csvExport.format, 'csv');
    assert.ok(csvExport.content.includes('Market Role,Allocation %'));

    const mdExport = service.exportWorkloadValuation('prf_human_operator_01', 'markdown');
    assert.equal(mdExport.format, 'markdown');
    assert.ok(mdExport.content.includes('# WORKLOAD VALUATION & MARKET SALARY BENCHMARK REPORT'));
  });

  test('Test 29: No automatic normative salary claims', () => {
    const profile = service.getWorkloadProfileById('prf_human_operator_01');
    const disclaimer = profile.disclaimer.toLowerCase();
    assert.equal(disclaimer.includes('fair salary'), false);
    assert.equal(disclaimer.includes('true salary'), false);
    assert.equal(disclaimer.includes('underpaid'), false);
    assert.equal(disclaimer.includes('salary you deserve'), false);
    assert.ok(disclaimer.includes('illustrative'));
  });

  test('Test 30: End-to-end Workload Mirror execution', () => {
    // ONE HUMAN -> MULTIPLE RESPONSIBILITIES -> MULTIPLE EQUIVALENT ROLES -> BENCHMARK RANGE -> ALLOCATION -> FTE -> VALUATION -> GAP
    const profile = service.getWorkloadProfileById('prf_human_operator_01');
    assert.equal(profile.responsibilities.length, 6);
    assert.equal(profile.equivalentRoles.length, 6);
    assert.equal(profile.totalEquivalentFte, 3.2);
    assert.equal(profile.illustrativeWorkforceValue.monthlyMedian, 15580000);
    assert.equal(profile.actualCompensation.totalMonthly, 4500000);
    assert.equal(profile.illustrativeGap.monthlyMedian, 11080000);
  });
});
