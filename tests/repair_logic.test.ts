import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRepairVsReplacement } from '../src/lib/calculations.ts';
import { inspectDangerousSymptoms } from '../src/lib/safetyChecks.ts';
import { INITIAL_DEMO_PROVIDERS } from '../src/lib/demoData.ts';

// ---------------- DETERMINISTIC CALCULATIONS ----------------

test('1. Deterministic Calculation: Standard Repair Quotation in LKR', () => {
  const result = calculateRepairVsReplacement({
    repairCostLKR: 18000,
    additionalRepairCostLKR: 0,
    replacementPriceLKR: 95000,
  });

  assert.equal(result.isValid, true);
  assert.equal(result.totalRepairCostLKR, 18000);
  assert.equal(result.replacementPriceLKR, 95000);
  assert.equal(result.costDifferenceLKR, 77000);
  assert.equal(result.repairCostRatio, 18.95);
  assert.equal(result.recommendationBand, 'strongly_repair');
  assert.match(result.bandTitle, /strongly favored/i);
});

test('2. Deterministic Calculation: Repair Cost Exceeds 70% threshold', () => {
  const result = calculateRepairVsReplacement({
    repairCostLKR: 140000,
    additionalRepairCostLKR: 10000,
    replacementPriceLKR: 180000,
    deviceAgeYears: 5,
  });

  assert.equal(result.isValid, true);
  assert.equal(result.totalRepairCostLKR, 150000);
  assert.equal(result.repairCostRatio, 83.33);
  assert.equal(result.recommendationBand, 'consider_replacement');
  assert.equal(result.keyConsiderations.length > 0, true);
});

test('3. Deterministic Calculation: Validation on Negative Repair Quote', () => {
  const result = calculateRepairVsReplacement({
    repairCostLKR: -5000,
    replacementPriceLKR: 100000,
  });

  assert.equal(result.isValid, false);
  assert.match(result.errorMessage || '', /negative/i);
});

test('4. Deterministic Calculation: Validation on Zero Replacement Price', () => {
  const result = calculateRepairVsReplacement({
    repairCostLKR: 12000,
    replacementPriceLKR: 0,
  });

  assert.equal(result.isValid, false);
  assert.match(result.errorMessage || '', /greater than zero/i);
});

// ---------------- DANGEROUS SYMPTOMS & SAFETY ----------------

test('5. Safety Inspection: Swollen Battery Detection', () => {
  const testScenarios = [
    'My laptop battery is swollen and pushing up the trackpad',
    'The back panel looks bulging and bloated near the battery',
    'Phone has expanded and puffed battery',
  ];

  for (const scenario of testScenarios) {
    const safety = inspectDangerousSymptoms(scenario);
    assert.equal(safety.hasDanger, true, `Expected danger for "${scenario}"`);
    assert.equal(safety.dangerType, 'battery_hazard');
    assert.match(safety.warningTitle, /swollen battery/i);
    assert.equal(safety.instructions.length >= 3, true);
  }
});

test('6. Safety Inspection: Smoke and Burning Smell Detection', () => {
  const scenario = 'I smell a burning smell and smoke came out of the charging port';
  const safety = inspectDangerousSymptoms(scenario);

  assert.equal(safety.hasDanger, true);
  assert.equal(safety.dangerType, 'smoke_fire');
  assert.match(safety.warningTitle, /smoke or burning/i);
});

test('7. Safety Inspection: Electrical Sparks Hazard', () => {
  const scenario = 'The charger cable produced sparks and made a loud popping sound';
  const safety = inspectDangerousSymptoms(scenario);

  assert.equal(safety.hasDanger, true);
  assert.equal(safety.dangerType, 'sparks_electrical');
});

test('8. Safety Inspection: Normal Non-Hazardous Symptoms', () => {
  const benignCases = [
    'Screen flickers when moving the hinge',
    'Battery percentage drops quickly from 80% to 20%',
    'Laptop takes 5 minutes to boot into Windows',
  ];

  for (const text of benignCases) {
    const safety = inspectDangerousSymptoms(text);
    assert.equal(safety.hasDanger, false);
    assert.equal(safety.dangerLevel, 'none');
  }
});

// ---------------- ALL 9 CORE AUDIT SCENARIOS ----------------

test('9. Scenario 1: Laptop battery drains quickly', async () => {
  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'laptop',
      brand: 'Dell',
      model: 'Inspiron 15',
      problemDescription: 'My laptop battery drains quickly from 100% to 0% in under 30 minutes',
    }),
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(data.issueCategory, 'BATTERY_POWER');
  assert.equal(data.dangerWarning, false);
  assert.equal(data.safeChecks.length > 0, true);
});

test('10. Scenario 2: Laptop overheats', async () => {
  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'laptop',
      brand: 'HP',
      model: 'Pavilion',
      problemDescription: 'Laptop overheats, the fan runs at maximum speed and it suddenly shuts down',
    }),
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(data.issueCategory, 'OVERHEATING');
  assert.match(data.categoryLabel, /heat|cooling/i);
});

test('11. Scenario 3: Smartphone screen is damaged', async () => {
  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'smartphone',
      brand: 'Samsung',
      model: 'Galaxy A52',
      problemDescription: 'My phone fell on concrete and the screen is cracked with broken glass and touch issues',
    }),
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(data.issueCategory, 'PHYSICAL_DAMAGE');
});

test('12. Scenario 4: Phone does not charge', async () => {
  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'smartphone',
      brand: 'Xiaomi',
      model: 'Redmi Note 11',
      problemDescription: 'The charging cable is loose in the port and the phone will not charge at all',
    }),
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(data.issueCategory, 'CHARGING');
});

test('13. Scenario 5: Laptop is slow', async () => {
  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'laptop',
      brand: 'Lenovo',
      model: 'IdeaPad',
      problemDescription: 'Laptop is extremely slow, programs freeze and takes 10 minutes to open Word',
    }),
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(data.issueCategory, 'PERFORMANCE');
});

test('14. Scenario 6: Battery is swollen', async () => {
  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'laptop',
      brand: 'Dell',
      model: 'Inspiron',
      problemDescription: 'The laptop battery is swollen and pushing the keyboard upwards',
    }),
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(data.dangerWarning, true);
  assert.match(data.disclaimer, /critical safety notice/i);
});

test('15. Scenario 7: Device produces a burning smell', async () => {
  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'laptop',
      brand: 'ASUS',
      model: 'ZenBook',
      problemDescription: 'I smell a burning smell and smoke came out when plugged in',
    }),
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(data.dangerWarning, true);
  assert.match(data.summary, /burning|thermal|fire/i);
});

test('16. Scenario 8: User provides an unclear description', async () => {
  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'smartphone',
      brand: 'Apple',
      model: 'iPhone 13',
      problemDescription: 'it broke',
    }),
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(data.issueCategory, 'INSUFFICIENT_INFORMATION');
  assert.equal(data.clarifyingQuestions.length > 0, true);
});

test('17. Scenario 9: User describes a problem outside supported categories', async () => {
  const res = await fetch('http://localhost:3000/api/assessments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: 'other',
      brand: 'LG',
      model: 'Smart Refrigerator',
      problemDescription: 'My microwave and refrigerator door is not closing and humming loudly',
    }),
  });
  assert.equal(res.ok, true);
  const data = await res.json();
  assert.equal(data.issueCategory, 'OTHER');
  assert.match(data.summary, /exclusively in laptops and smartphones/i);
});

// ---------------- PROVIDER DIRECTORY & DEMO DATA ----------------

test('18. Provider Directory: Demonstration Listing Safeguards', () => {
  const demoListings = INITIAL_DEMO_PROVIDERS.filter((p) => p.isDemo);
  assert.equal(demoListings.length > 0, true);

  for (const demo of demoListings) {
    assert.equal(demo.isDemo, true);
    assert.equal(demo.verificationStatus, 'unverified');
    assert.match(demo.name, /Example repair listing/i);
    assert.match(demo.contact, /Demonstration/i);
  }
});

test('19. Provider Directory: Sri Lankan District Filtering', () => {
  const colomboProviders = INITIAL_DEMO_PROVIDERS.filter(
    (p) => p.district.toLowerCase() === 'colombo'
  );
  assert.equal(colomboProviders.length >= 1, true);
  assert.equal(colomboProviders[0].district, 'Colombo');
});

// ---------------- REST ENDPOINTS VERIFICATION ----------------

test('20. REST Endpoints: GET /api/providers/:id', async () => {
  const res = await fetch('http://localhost:3000/api/providers/demo-colombo-1');
  assert.equal(res.ok, true);
  const provider = await res.json();
  assert.equal(provider.id, 'demo-colombo-1');
  assert.equal(provider.district, 'Colombo');
});

test('21. Security: Admin endpoint rejects unauthenticated access', async () => {
  const res = await fetch('http://localhost:3000/api/admin/summary');
  assert.equal(res.status, 403);
});
