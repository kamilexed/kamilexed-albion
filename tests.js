/**
 * tests.js
 * Automated Node.js unit tests for Albion Online Economic Rules & Refining Simulation.
 * Run with: node tests.js
 */

import './albion_rules.js';
import './albion_farming_rules.js';
import './albion_crafting_rules.js';

const {
  RESOURCES,
  CITIES,
  TIERS,
  calculateRRR,
  calculateFocusCost,
  calculateStationFee,
  getMarketFeeRate,
  getBuyFeeRate,
  simulateRefining,
  simulateRecursiveRefining,
  fitBatchToFocus,
  getItemId,
  getPrevTierEnchantment,
} = globalThis.AlbionRules;

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
    failedCount++;
  }
}

console.log('=====================================================');
console.log('RUNNING ALBION ONLINE ECONOMIC RULES & ENGINE TESTS');
console.log('=====================================================\n');

// 1. RRR Tests (LPB / (1 + LPB))
console.log('[1] Resource Return Rate (RRR) Calculations:');
assert(!CITIES.some(c => c.id === 'Caerleon' || c.id === 'Brecilien'), 'Caerleon and Brecilien removed from locations');

const rrrNoBonusNoFocus = calculateRRR({ cityId: 'Fort Sterling', resourceId: 'ore', useFocus: false });
assert(Math.abs(rrrNoBonusNoFocus - 0.18 / 1.18) < 0.0001, 'Royal City base RRR without bonus/focus is 15.25% (0.18/1.18)');

const rrrCityBonusNoFocus = calculateRRR({ cityId: 'Thetford', resourceId: 'ore', useFocus: false });
assert(Math.abs(rrrCityBonusNoFocus - 0.58 / 1.58) < 0.0001, 'City bonus (Thetford for Ore) without focus is 36.71% (0.58/1.58)');

const rrrNoBonusWithFocus = calculateRRR({ cityId: 'Fort Sterling', resourceId: 'ore', useFocus: true });
assert(Math.abs(rrrNoBonusWithFocus - 0.77 / 1.77) < 0.0001, 'Off-city with focus is 43.50% (0.77/1.77)');

const rrrCityBonusWithFocus = calculateRRR({ cityId: 'Thetford', resourceId: 'ore', useFocus: true });
assert(Math.abs(rrrCityBonusWithFocus - 1.17 / 2.17) < 0.0001, 'City bonus (Thetford for Ore) with focus is 53.92% (1.17/2.17)');

const rrrIslandNoFocus = calculateRRR({ cityId: 'Island', resourceId: 'ore', useFocus: false });
assert(rrrIslandNoFocus === 0, 'Player Island without focus has 0% RRR');

const rrrIslandWithFocus = calculateRRR({ cityId: 'Island', resourceId: 'ore', useFocus: true });
assert(Math.abs(rrrIslandWithFocus - 0.59 / 1.59) < 0.0001, 'Player Island with focus has 37.11% RRR (0.59/1.59)');

const rrrDaily10 = calculateRRR({ cityId: 'Thetford', resourceId: 'ore', useFocus: true, dailyBonusPercent: 10 });
assert(Math.abs(rrrDaily10 - 1.27 / 2.27) < 0.0001, 'Daily +10% production bonus adds 0.10 to LPB (1.27/2.27 = 55.95%)');

// 2. Station Nutrition & Usage Fee Tests
console.log('\n[2] Station Nutrition & Usage Fee (Verified Item Values):');
// T4.0 Item Value = 16, nutrition = 16 * 0.1125 = 1.8. At 500 tax/100 nut -> 1.8 * 5 = 9.0 silver
const feeT4 = calculateStationFee({ tier: 4, enchantment: 0, feePer100Nutrition: 500 });
assert(Math.abs(feeT4 - 9.0) < 0.01, 'T4.0 (IV=16) station fee at 500 tax is 9.0 silver per craft', `Got: ${feeT4}`);

// T4.1 Item Value = 32, nutrition = 3.6 -> fee at 500 tax = 18.0 silver
const feeT41 = calculateStationFee({ tier: 4, enchantment: 1, feePer100Nutrition: 500 });
assert(Math.abs(feeT41 - 18.0) < 0.01, 'T4.1 (IV=32) station fee at 500 tax is 18.0 silver per craft', `Got: ${feeT41}`);

// T8.0 Item Value = 256 -> nutrition = 28.8 -> at 500 tax = 144.0 silver
const feeT8 = calculateStationFee({ tier: 8, enchantment: 0, feePer100Nutrition: 500 });
assert(Math.abs(feeT8 - 144.0) < 0.01, 'T8.0 (IV=256) station fee at 500 tax is 144.0 silver per craft', `Got: ${feeT8}`);

// 3. Focus Cost & Mastery Efficiency Tests (500/500 max specs -> 37,000 efficiency)
console.log('\n[3] Focus Cost & Specialization Efficiency (500/500 Max):');
const focusT2 = calculateFocusCost({ tier: 2, enchantment: 0, targetSpec: 0, otherSpecsAverage: 0 });
assert(focusT2 === 0, 'T2.0 cannot use focus (0 FP)');

const focusT3Zero = calculateFocusCost({ tier: 3, enchantment: 0, targetSpec: 0, otherSpecsAverage: 0 });
assert(focusT3Zero === 31, 'T3.0 base focus cost (0 spec) is 31 FP', `Got: ${focusT3Zero}`);

const focusT4Zero = calculateFocusCost({ tier: 4, enchantment: 0, targetSpec: 0, otherSpecsAverage: 0 });
assert(focusT4Zero === 54, 'T4.0 base focus cost (0 spec) is 54 FP', `Got: ${focusT4Zero}`);

const focusT41Zero = calculateFocusCost({ tier: 4, enchantment: 1, targetSpec: 0, otherSpecsAverage: 0 });
assert(focusT41Zero === 94, 'T4.1 base focus cost (0 spec) is 94 FP (same as T5.0)', `Got: ${focusT41Zero}`);

const focusT4MaxAll = calculateFocusCost({ tier: 4, enchantment: 0, targetSpec: 100, otherSpecsAverage: 100 });
assert(focusT4MaxAll === 4, 'T4.0 focus cost at 500/500 spec (37k eff = 54 * 0.5^3.7) is 4 FP', `Got: ${focusT4MaxAll}`);

const focusT8MaxAll = calculateFocusCost({ tier: 8, enchantment: 0, targetSpec: 100, otherSpecsAverage: 100 });
assert(focusT8MaxAll === 39, 'T8.0 focus cost at 500/500 spec (37k eff = 503 * 0.5^3.7) is 39 FP', `Got: ${focusT8MaxAll}`);

const focusT84MaxAll = calculateFocusCost({ tier: 8, enchantment: 4, targetSpec: 100, otherSpecsAverage: 100 });
assert(focusT84MaxAll === 363, 'T8.4 focus cost at 500/500 spec (37k eff = 4716 * 0.5^3.7) is 363 FP', `Got: ${focusT84MaxAll}`);

// 4. Market Tax Rate Tests
console.log('\n[4] Market Taxes & Order Setup Fees:');
const taxPremSellOrder = getMarketFeeRate({ hasPremium: true, orderType: 'sell_order' });
assert(Math.abs(taxPremSellOrder - 0.065) < 0.001, 'Premium Sell Order fee is 6.5% (4% tax + 2.5% setup)');

const taxPremInstant = getMarketFeeRate({ hasPremium: true, orderType: 'instant_sell' });
assert(Math.abs(taxPremInstant - 0.04) < 0.001, 'Premium Instant Sell fee is 4.0% (no setup fee)');

const taxNoPremSellOrder = getMarketFeeRate({ hasPremium: false, orderType: 'sell_order' });
assert(Math.abs(taxNoPremSellOrder - 0.105) < 0.001, 'Non-Premium Sell Order fee is 10.5% (8% tax + 2.5% setup)');
assert(getMarketFeeRate({ hasPremium: true, orderType: 'sell_order', directTrade: true }) === 0.0, 'Direct Trade removes all sales tax and setup fees (0%)');
assert(getMarketFeeRate({ hasPremium: false, orderType: 'instant_sell', directTrade: true }) === 0.0, 'Direct Trade is 0% even without Premium');

// 5. Lower-Tier Bar Return & Compounding Conservation Tests
console.log('\n[5] Lower-Tier RRR Returns & Compounding Conservation:');
const simComp = simulateRefining({
  tier: 5,
  enchantment: 0,
  batchCrafts: 500, // 1500 raw ore
  rawPrice: 140,
  prevTierPrice: 140,
  sellPrice: 460,
  rrr: 1.17 / 2.17, // 53.917%
  compound: true,
  stationFeePerCraft: 18,
  useFocus: true,
  focusCostPerCraft: 6,
  marketFeeRate: 0.065,
});

assert(simComp.totalRefinedProduced > 1000, 'Compounding 500 crafts at 53.9% yields >1000 bars', `Produced: ${simComp.totalRefinedProduced}`);
assert(simComp.totalPrevReturned > 500, 'Lower-tier bars ALSO return via RRR across rounds', `Returned: ${simComp.totalPrevReturned}`);
assert(simComp.totalPrevBought < simComp.totalPrevTierConsumed * 0.55, 'Returned lower-tier bars are reused, reducing bars bought from ~1084 to ~503', `Bought: ${simComp.totalPrevBought}, Gross Used: ${simComp.totalPrevTierConsumed}`);
assert(
  simComp.totalPrevBought - simComp.leftoverPrev === simComp.totalPrevTierConsumed - simComp.totalPrevReturned,
  'Exact lower-tier bar conservation: Bought - Leftover === Used - Returned'
);
assert(
  Math.abs(simComp.leftoverSalvageValue - (simComp.leftoverRawValue + simComp.leftoverPrevValue)) < 0.01,
  'Leftover salvage includes both leftover raw and leftover lower-tier bars'
);

// Single-run consistency check
const simSingle = simulateRefining({
  tier: 5,
  enchantment: 0,
  batchCrafts: 500,
  rawPrice: 140,
  prevTierPrice: 140,
  sellPrice: 460,
  rrr: 1.17 / 2.17,
  compound: false,
  stationFeePerCraft: 18,
  useFocus: true,
  focusCostPerCraft: 6,
  marketFeeRate: 0.065,
});

const expectedSingleNetMatCost =
  (1500 - Math.floor(1500 * (1.17 / 2.17))) * 140 +
  (500 - Math.floor(500 * (1.17 / 2.17))) * 140 +
  500 * 18;
const expectedSingleProfit = 500 * 460 * (1 - 0.065) - expectedSingleNetMatCost;
assert(
  Math.abs(simSingle.netProfit - expectedSingleProfit) < 0.01,
  'Single-run mode properly credits returned raw AND returned lower-tier bars',
  `Got: ${simSingle.netProfit}, Expected: ${expectedSingleProfit}`
);

// Break-even verification for both Compound and Single
const beComp = simulateRefining({
  tier: 5,
  enchantment: 0,
  batchCrafts: 500,
  rawPrice: 140,
  prevTierPrice: 140,
  sellPrice: simComp.breakEvenPrice,
  rrr: 1.17 / 2.17,
  compound: true,
  stationFeePerCraft: 18,
  useFocus: true,
  focusCostPerCraft: 6,
  marketFeeRate: 0.065,
});
assert(
  beComp.netProfit >= 0 && beComp.netProfit < simComp.totalRefinedProduced,
  'Compounding break-even price yields ~0 profit (within 1 silver rounding per item)',
  `Net Profit: ${beComp.netProfit}`
);

const beSingle = simulateRefining({
  tier: 5,
  enchantment: 0,
  batchCrafts: 500,
  rawPrice: 140,
  prevTierPrice: 140,
  sellPrice: simSingle.breakEvenPrice,
  rrr: 1.17 / 2.17,
  compound: false,
  stationFeePerCraft: 18,
  useFocus: true,
  focusCostPerCraft: 6,
  marketFeeRate: 0.065,
});
assert(
  beSingle.netProfit >= 0 && beSingle.netProfit < simSingle.totalRefinedProduced,
  'Single-run break-even price yields ~0 profit (within 1 silver rounding per item)',
  `Net Profit: ${beSingle.netProfit}`
);

// 6. Enchanted Lower-Tier Material Requirements Tests
console.log('\n[6] Enchanted Lower-Tier Material Requirements:');
assert(getPrevTierEnchantment(6, 1) === 1, 'Refining T6.1 requires T5.1 lower-tier bar');
assert(getItemId('METALBAR', 5, getPrevTierEnchantment(6, 1)) === 'T5_METALBAR_LEVEL1@1', 'T6.1 uses T5_METALBAR_LEVEL1@1');
assert(getPrevTierEnchantment(5, 2) === 2, 'Refining T5.2 requires T4.2 lower-tier bar');
assert(getPrevTierEnchantment(8, 4) === 4, 'Refining T8.4 requires T7.4 lower-tier bar');
assert(getPrevTierEnchantment(4, 1) === 0, 'Refining T4.1 requires T3.0 bar (T3 cannot be enchanted)');
assert(getItemId('METALBAR', 3, getPrevTierEnchantment(4, 1)) === 'T3_METALBAR', 'T4.1 uses T3_METALBAR');

// 7. Individual Tier Specs & Recursive Refining Tests
console.log('\n[7] Individual Tier Specs & Recursive Refining:');
const customSpecs = { 4: 100, 5: 80, 6: 50, 7: 20, 8: 10 };
// T6.0 base = 164; efficiency = 50*250 + (100+80+20+10)*30 = 12,500 + 6,300 = 18,800 -> 164 * 0.5^1.88 = 44.54 -> 45 FP
const focusWithMap = calculateFocusCost({ tier: 6, enchantment: 0, specs: customSpecs });
assert(focusWithMap === 45, 'Focus cost with custom specs map is 45 FP (164 * 0.5^1.88)', `Got: ${focusWithMap}`);

const rrrFocus = calculateRRR({ cityId: 'Thetford', resourceId: 'ore', useFocus: true });
const rrrNoFocus = calculateRRR({ cityId: 'Thetford', resourceId: 'ore', useFocus: false });

const recSim = simulateRecursiveRefining({
  targetTier: 6,
  targetEnchantment: 1,
  batchCrafts: 500,
  rawPrices: { '6.1': 1050, '5.1': 350, '4.1': 115, '3.0': 25, '2.0': 12 },
  refinedPrices: { '5.1': 1100, '4.1': 280, '3.0': 42, '2.0': 18 },
  targetSellPrice: 4300,
  rrr: rrrFocus,
  rrrNoFocus: rrrNoFocus,
  compound: true,
  feePer100Nutrition: 500,
  focusMode: 'top_tier',
  specs: { 4: 100, 5: 100, 6: 100, 7: 100, 8: 100 },
  marketFeeRate: 0.065,
});

assert(recSim.stages.length === 5, 'Recursive chain for T6.1 has 5 stages (T6.1, T5.1, T4.1, T3.0, T2.0)');
assert(
  recSim.stages[1].crafts < recSim.stages[0].crafts &&
  recSim.stages[2].crafts < recSim.stages[1].crafts &&
  recSim.stages[3].crafts < recSim.stages[2].crafts &&
  recSim.stages[4].crafts < recSim.stages[3].crafts,
  'Each lower stage scales down by (1 - RRR) instead of repeating full target crafts',
  `Crafts chain: ${recSim.stages.map(s => s.crafts).join(' -> ')}`
);
assert(
  Math.abs(recSim.stages[0].stageRRR - rrrFocus) < 0.0001 &&
  Math.abs(recSim.stages[1].stageRRR - rrrNoFocus) < 0.0001,
  'In top_tier focus mode, Stage 0 gets 53.9% focus RRR while lower stages get 36.7% non-focus RRR'
);

// Accounting identity check: Recursive Net Profit vs Direct Net Profit (on same net expense basis)
const directEquivProfit = recSim.netRevenue - recSim.directMarketExpense;
assert(
  Math.abs((recSim.netProfit - directEquivProfit) - recSim.selfRefineSavings) < 0.01,
  'Accounting identity: Recursive Profit - Direct Profit === Self-Refine Savings'
);

// 8. Focus Pool Fit (10k / 30k FP Quick Batch) Tests
console.log('\n[8] Focus Pool Batch Sizing (10k & 30k FP):');
const maxSpecs = { 4: 100, 5: 100, 6: 100, 7: 100, 8: 100 };

// Direct compounding 10k FP on T4.0 (4 FP/craft)
const fitT4Comp10k = fitBatchToFocus({
  focusBudget: 10000,
  tier: 4,
  enchantment: 0,
  rrr: rrrFocus,
  compound: true,
  isRecursive: false,
  specs: maxSpecs,
});
const simT4Comp10k = simulateRefining({
  tier: 4,
  batchCrafts: fitT4Comp10k,
  rrr: rrrFocus,
  compound: true,
  useFocus: true,
  focusCostPerCraft: calculateFocusCost({ tier: 4, specs: maxSpecs }),
});
const simT4CompOver = simulateRefining({
  tier: 4,
  batchCrafts: fitT4Comp10k + 1,
  rrr: rrrFocus,
  compound: true,
  useFocus: true,
  focusCostPerCraft: calculateFocusCost({ tier: 4, specs: maxSpecs }),
});
assert(
  simT4Comp10k.totalFocusSpent <= 10000 && simT4CompOver.totalFocusSpent > 10000,
  'Direct compound 10k FP finds exact max initial batch without exceeding 10,000 FP',
  `Batch=${fitT4Comp10k}, Spent=${simT4Comp10k.totalFocusSpent} FP (next=${simT4CompOver.totalFocusSpent} FP)`
);

// Direct single-run 30k FP on T8.0 (39 FP/craft)
const fitT8Single30k = fitBatchToFocus({
  focusBudget: 30000,
  tier: 8,
  enchantment: 0,
  rrr: rrrFocus,
  compound: false,
  isRecursive: false,
  specs: maxSpecs,
});
assert(
  fitT8Single30k === Math.floor(30000 / 39),
  'Single-run 30k FP on T8.0 (39 FP) matches floor(30000 / 39) = 769',
  `Got: ${fitT8Single30k}`
);

// Recursive all-stages 10k FP on T4.0
const fitRecAll10k = fitBatchToFocus({
  focusBudget: 10000,
  tier: 4,
  enchantment: 0,
  rrr: rrrFocus,
  rrrNoFocus,
  compound: true,
  isRecursive: true,
  focusMode: 'all',
  specs: maxSpecs,
});
const simRecAll10k = simulateRecursiveRefining({
  targetTier: 4,
  batchCrafts: fitRecAll10k,
  rrr: rrrFocus,
  rrrNoFocus,
  compound: true,
  focusMode: 'all',
  specs: maxSpecs,
});
assert(
  simRecAll10k.totalFocusSpent <= 10000 && simRecAll10k.totalFocusSpent >= 9950,
  'Recursive all-stages 10k FP stays within 10,000 FP budget',
  `Batch=${fitRecAll10k}, Spent=${simRecAll10k.totalFocusSpent} FP`
);

// 9. Buy Order Setup Fee & Faction Heart Refining Tests
console.log('\n[9] Buy Order Setup Fee & Faction Heart Refining:');
assert(getBuyFeeRate({ buyOrderType: 'buy_order' }) === 0.025, 'Buy Order setup fee is 2.5%');
assert(getBuyFeeRate({ buyOrderType: 'instant_buy' }) === 0.0, 'Instant Buy setup fee is 0%');

assert(RESOURCES.every(r => r.heartId && r.heartName), 'All 5 resource trees map to a Faction Heart ID and name');

const heartSimT83 = simulateRefining({
  tier: 8,
  enchantment: 3,
  batchCrafts: 100,
  rawPrice: 68000,
  prevTierPrice: 118000,
  sellPrice: 425000,
  rrr: rrrFocus,
  compound: true,
  stationFeePerCraft: 1000,
  useFocus: true,
  focusCostPerCraft: calculateFocusCost({ tier: 8, enchantment: 3, specs: maxSpecs }),
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
  useHeart: true,
  heartPrice: 40000,
});

assert(heartSimT83.heartActive === true, 'Heart Refining is active on T8.3');
assert(heartSimT83.rawReqPerCraft === 4, 'T8.3 Heart Refining uses 4 raw ore instead of 5', `Got: ${heartSimT83.rawReqPerCraft}`);
assert(heartSimT83.initialRawUnits === 400, '100 initial crafts of T8.3 with Heart uses 400 initial ore');
assert(
  heartSimT83.totalHeartsReturned > 0 &&
  heartSimT83.totalHeartsBought - heartSimT83.leftoverHearts === heartSimT83.netHeartsConsumed &&
  heartSimT83.netHeartsConsumed === heartSimT83.totalHeartsConsumed - heartSimT83.totalHeartsReturned,
  'Faction Hearts are affected by RRR and conserve Bought - Leftover === Used - Returned'
);
assert(heartSimT83.buyFeeSilver > 0, '2.5% Buy Order setup fee is applied to material costs');

const noHeartSimT83 = simulateRefining({
  tier: 8,
  enchantment: 3,
  batchCrafts: 100,
  rawPrice: 68000,
  prevTierPrice: 118000,
  sellPrice: 425000,
  rrr: rrrFocus,
  compound: true,
  stationFeePerCraft: 1000,
  useFocus: true,
  focusCostPerCraft: calculateFocusCost({ tier: 8, enchantment: 3, specs: maxSpecs }),
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
  useHeart: false,
});
assert(
  heartSimT83.netProfit > noHeartSimT83.netProfit,
  'When Faction Heart (40k) is cheaper than Raw Ore (68k), Heart Refining increases net profit',
  `HeartProfit=${Math.round(heartSimT83.netProfit)}, NormalProfit=${Math.round(noHeartSimT83.netProfit)}`
);

const heartSimT84 = simulateRefining({
  tier: 8,
  enchantment: 4,
  batchCrafts: 100,
  rawPrice: 205000,
  prevTierPrice: 350000,
  sellPrice: 1280000,
  rrr: rrrFocus,
  compound: true,
  useHeart: true,
  heartPrice: 40000,
});
assert(heartSimT84.heartActive === false && heartSimT84.rawReqPerCraft === 5, 'Heart Refining is disabled/ineligible on .4 resources');

const beHeart = simulateRefining({
  tier: 8,
  enchantment: 3,
  batchCrafts: 100,
  rawPrice: 68000,
  prevTierPrice: 118000,
  sellPrice: heartSimT83.breakEvenPrice,
  rrr: rrrFocus,
  compound: true,
  stationFeePerCraft: 1000,
  useFocus: true,
  focusCostPerCraft: calculateFocusCost({ tier: 8, enchantment: 3, specs: maxSpecs }),
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
  useHeart: true,
  heartPrice: 40000,
});
assert(
  beHeart.netProfit >= 0 && beHeart.netProfit < heartSimT83.totalRefinedProduced,
  'Heart Refining + Buy Order break-even price yields ~0 profit',
  `Net Profit: ${beHeart.netProfit}`
);

// 10. Per-Tier Focus & Faction Heart Selection in Recursive Refining
console.log('\n[10] Per-Tier Focus & Faction Heart Selection in Recursive Mode:');
const selectiveRec = simulateRecursiveRefining({
  targetTier: 8,
  targetEnchantment: 3,
  batchCrafts: 100,
  rawPrices: { '8.3': 68000, '7.3': 21500, '6.3': 7000, '5.3': 2400, '4.3': 740, '3.0': 25, '2.0': 12 },
  refinedPrices: { '7.3': 118000, '6.3': 28500, '5.3': 7400, '4.3': 1750, '3.0': 42, '2.0': 18 },
  targetSellPrice: 425000,
  rrr: rrrFocus,
  rrrNoFocus: rrrNoFocus,
  compound: true,
  feePer100Nutrition: 500,
  focusTiers: { 3: false, 4: false, 5: false, 6: false, 7: true, 8: true },
  specs: maxSpecs,
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
  useHeart: true,
  heartTiers: { 3: false, 4: false, 5: false, 6: false, 7: false, 8: true },
  heartPrice: 40000,
});

// Check Focus applied only to T8 and T7
const st8 = selectiveRec.stages.find(s => s.tier === 8);
const st7 = selectiveRec.stages.find(s => s.tier === 7);
const st6 = selectiveRec.stages.find(s => s.tier === 6);
const st3 = selectiveRec.stages.find(s => s.tier === 3);
assert(
  st8.useFocus === true && st7.useFocus === true && st6.useFocus === false && st3.useFocus === false,
  'Recursive Focus applied strictly to selected tiers (T8 & T7 only)'
);
assert(
  Math.abs(st7.stageRRR - rrrFocus) < 0.0001 && Math.abs(st6.stageRRR - rrrNoFocus) < 0.0001,
  'Selected Focus tiers use focus RRR while unchecked tiers use non-focus RRR'
);

// Check Hearts applied only to T8 (not T7..T3)
assert(
  st8.heartActive === true && st8.heartsConsumed > 0 && st7.heartActive === false && st7.heartsConsumed === 0 && st6.heartActive === false,
  'Recursive Faction Hearts applied strictly to selected tiers (T8 only)'
);

// Check selective T8-only Hearts beats applying 40k Hearts on cheap T3-T7 ores
const allHeartsRec = simulateRecursiveRefining({
  targetTier: 8,
  targetEnchantment: 3,
  batchCrafts: 100,
  rawPrices: { '8.3': 68000, '7.3': 21500, '6.3': 7000, '5.3': 2400, '4.3': 740, '3.0': 25, '2.0': 12 },
  refinedPrices: { '7.3': 118000, '6.3': 28500, '5.3': 7400, '4.3': 1750, '3.0': 42, '2.0': 18 },
  targetSellPrice: 425000,
  rrr: rrrFocus,
  rrrNoFocus: rrrNoFocus,
  compound: true,
  feePer100Nutrition: 500,
  focusTiers: { 3: false, 4: false, 5: false, 6: false, 7: true, 8: true },
  specs: maxSpecs,
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
  useHeart: true,
  heartTiers: { 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
  heartPrice: 40000,
});
assert(
  selectiveRec.netProfit > allHeartsRec.netProfit,
  'Selective Heart refining (T8 only @ 40k vs 68k ore) yields higher profit than using 40k Hearts on cheaper T3-T7 stages',
  `Selective=${Math.round(selectiveRec.netProfit)}, AllHearts=${Math.round(allHeartsRec.netProfit)}`
);

// Check fitBatchToFocus works even when targetTier is NOT focused (only T7 is focused)
const fitT7OnlyBatch = fitBatchToFocus({
  focusBudget: 10000,
  tier: 8,
  enchantment: 3,
  rrr: rrrFocus,
  rrrNoFocus: rrrNoFocus,
  compound: true,
  isRecursive: true,
  focusTiers: { 3: false, 4: false, 5: false, 6: false, 7: true, 8: false },
  specs: maxSpecs,
});
const simT7Only = simulateRecursiveRefining({
  targetTier: 8,
  targetEnchantment: 3,
  batchCrafts: fitT7OnlyBatch,
  rrr: rrrFocus,
  rrrNoFocus: rrrNoFocus,
  compound: true,
  focusTiers: { 3: false, 4: false, 5: false, 6: false, 7: true, 8: false },
  specs: maxSpecs,
});
assert(
  fitT7OnlyBatch > 10 && simT7Only.totalFocusSpent <= 10000 && simT7Only.totalFocusSpent >= 9700,
  'fitBatchToFocus handles recursive mode even when only lower tiers (T7) use Focus',
  `Batch=${fitT7OnlyBatch}, Spent=${simT7Only.totalFocusSpent} FP`
);

// 11. Island Farming Rules & Profit Engine Tests
console.log('\n[11] Island Farming Rules & Profit Engine:');
const F = globalThis.AlbionFarmingRules;

assert(F.ITEMS.length === 15, 'All 15 farming items registered (8 Crops, 7 Herbs; Animals removed)');
assert(
  F.ITEMS.every(i => Math.abs(i.npcSeedPrice * (1 - i.baseReturn) - 2000) < 0.01),
  'Exact Albion economic invariant: NPC Seed Price * (1 - BaseReturn) === 2,000 silver across all tiers'
);
assert(
  F.ITEMS.every(i => Math.abs((i.wateredReturn - 1) - (1 - i.baseReturn)) < 0.0001),
  'Watering symmetry: Watered surplus (wateredReturn - 1) === Unwatered deficit (1 - baseReturn)'
);

assert(F.calculateFarmingFocusCost({ mastery: 0, spec: 0 }) === 1000, 'Farming focus cost at 0/0 spec is 1,000 FP');
assert(F.calculateFarmingFocusCost({ mastery: 100, spec: 0 }) === 500, 'Farming focus cost at 100 Mastery / 0 Spec is 500 FP');
assert(F.calculateFarmingFocusCost({ mastery: 0, spec: 100 }) === 250, 'Farming focus cost at 0 Mastery / 100 Spec is 250 FP');
assert(F.calculateFarmingFocusCost({ mastery: 100, spec: 100 }) === 125, 'Farming focus cost at 100/100 max spec is 125 FP');

const carrotItem = F.ITEMS.find(i => i.id === 'carrot');
assert(Math.abs(F.calculateYieldPerTile({ item: carrotItem, cityId: 'Martlock', hasPremium: false }) - 4.5) < 0.001, 'Non-Premium non-bonus yield is 4.5 / tile');
assert(Math.abs(F.calculateYieldPerTile({ item: carrotItem, cityId: 'Martlock', hasPremium: true }) - 9.0) < 0.001, 'Premium non-bonus yield is 9.0 / tile');
assert(Math.abs(F.calculateYieldPerTile({ item: carrotItem, cityId: 'Lymhurst', hasPremium: true }) - 9.9) < 0.001, 'Premium + matching biome (+10% Lymhurst for Carrots) yield is 9.9 / tile');

const selfSustainCarrots = F.simulateFarming({
  itemId: 'carrot',
  plots: 10, // 90 tiles
  cityId: 'Lymhurst',
  hasPremium: true,
  waterMode: 'self_sustain', // 45 watered, 45 unwatered
  mastery: 100,
  spec: 100,
  seedPrice: 2000,
  productPrice: 400,
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
});
assert(
  selfSustainCarrots.wateredTiles === 45 &&
  Math.abs(selfSustainCarrots.seedDeficit) < 0.001 &&
  Math.abs(selfSustainCarrots.seedSurplus) < 0.001,
  'Self-Sustain watering (50% tiles) produces exact 0 seed deficit and 0 seed surplus'
);

const npcCapSim = F.simulateFarming({
  itemId: 'carrot',
  plots: 5,
  waterMode: 'none',
  seedPrice: 2500, // more expensive than 2,000 NPC vendor
  productPrice: 400,
  useNpcCap: true,
  buyFeeRate: 0.025,
});
assert(
  npcCapSim.boughtFromNpc === true && npcCapSim.effectiveSeedBuyPrice === 2000 && npcCapSim.seedBuyFee === 0,
  'NPC Seed Cap automatically switches to NPC merchant (2,000s, 0% fee) when market seed price is higher'
);

const herbSim = F.simulateFarming({
  itemId: 'foxglove',
  plots: 5, // 45 tiles
  cityId: 'Martlock',
  hasPremium: true,
  waterMode: 'all',
  mastery: 100,
  spec: 100,
  seedPrice: 14800,
  productPrice: 465,
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
});
assert(
  herbSim.hasBiomeBonus === true &&
  Math.abs(herbSim.totalHarvest - 45 * 9.9) < 0.01 &&
  herbSim.seedSurplus > 0,
  'Herbs (Elusive Foxglove in Martlock) apply +10% biome yield and yield surplus seeds when watered'
);

const npcCapOffSim = F.simulateFarming({
  itemId: 'carrot',
  plots: 5,
  waterMode: 'none',
  seedPrice: 2500,
  productPrice: 400,
  useNpcCap: false,
  buyFeeRate: 0.025,
});
assert(
  npcCapSim.netProfit > npcCapOffSim.netProfit,
  'When unwatered and market seed > NPC vendor, NPC Seed Cap increases Net Profit by capping replacement cost'
);

const comfreyItem = F.ITEMS.find(i => i.id === 'comfrey');
const pumpkinItem = F.ITEMS.find(i => i.id === 'pumpkin');
const yarrowItem = F.ITEMS.find(i => i.id === 'yarrow');
assert(
  F.hasCityBonus(comfreyItem, 'Caerleon') && Math.abs(F.calculateYieldPerTile({ item: comfreyItem, cityId: 'Caerleon', hasPremium: true }) - 9.9) < 0.001,
  'Caerleon grants +10% farming yield bonus to Brightleaf Comfrey (T3 Herb)'
);
assert(
  F.hasCityBonus(pumpkinItem, 'Brecilien') && Math.abs(F.calculateYieldPerTile({ item: pumpkinItem, cityId: 'Brecilien', hasPremium: true }) - 9.9) < 0.001,
  'Brecilien grants +10% farming yield bonus to all Crops (e.g. T8 Pumpkins)'
);
assert(
  !F.hasCityBonus(yarrowItem, 'Brecilien') && Math.abs(F.calculateYieldPerTile({ item: yarrowItem, cityId: 'Brecilien', hasPremium: true }) - 9.0) < 0.001,
  'Brecilien does not grant +10% bonus to Herbs (e.g. T8 Ghoul Yarrow stays 9.0/tile)'
);

const beFarm = F.simulateFarming({
  itemId: 'pumpkin',
  plots: 5,
  cityId: 'Lymhurst',
  hasPremium: true,
  waterMode: 'none',
  seedPrice: 29500,
  productPrice: 460,
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
});
const beFarmCheck = F.simulateFarming({
  itemId: 'pumpkin',
  plots: 5,
  cityId: 'Lymhurst',
  hasPremium: true,
  waterMode: 'none',
  seedPrice: 29500,
  productPrice: beFarm.breakEvenPrice,
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
});
assert(
  beFarmCheck.netProfit >= 0 && beFarmCheck.netProfit < beFarmCheck.totalHarvest,
  'Farming break-even sell price yields ~0 profit (within 1 silver rounding per unit)',
  `Net Profit: ${beFarmCheck.netProfit.toFixed(2)}`
);

assert(F.fitTilesToFocus({ focusBudget: 10000, mastery: 100, spec: 100 }) === 80, '10k Focus at max spec waters exactly 80 tiles (80 * 125 = 10,000 FP)');
assert(F.fitTilesToFocus({ focusBudget: 20000, mastery: 100, spec: 100 }) === 160, '20k Focus at max spec waters exactly 160 tiles');
assert(F.fitTilesToFocus({ focusBudget: 30000, mastery: 100, spec: 100 }) === 240, '30k Focus at max spec waters exactly 240 tiles');

// 12. Equipment Crafting Rules & Profit Engine Tests
console.log('\n[12] Equipment Crafting Rules & Profit Engine:');
const C = globalThis.AlbionCraftingRules;

assert(C.CATEGORIES.length === 4, 'All 4 Crafting Trees registered (Warrior, Hunter, Mage, Toolmaker)');
assert(C.ITEMS.length >= 35, 'Comprehensive equipment & accessory crafting catalog loaded', `Count: ${C.ITEMS.length}`);

const swordItem = C.ITEMS.find(i => i.id === 'broadsword');
const bagItem = C.ITEMS.find(i => i.id === 'bag');
const glovesItem = C.ITEMS.find(i => i.id === 'brawler_gloves');

// Verify Exact Crafting RRR (LPB / (1 + LPB))
const craftRrrOffNoFocus = C.calculateCraftingRRR({ cityId: 'Thetford', item: swordItem, useFocus: false });
const craftRrrBonusNoFocus = C.calculateCraftingRRR({ cityId: 'Lymhurst', item: swordItem, useFocus: false });
const craftRrrOffFocus = C.calculateCraftingRRR({ cityId: 'Thetford', item: swordItem, useFocus: true });
const craftRrrBonusFocus = C.calculateCraftingRRR({ cityId: 'Lymhurst', item: swordItem, useFocus: true });
const craftRrrIslandNoFocus = C.calculateCraftingRRR({ cityId: 'Island', item: swordItem, useFocus: false });
const craftRrrIslandFocus = C.calculateCraftingRRR({ cityId: 'Island', item: swordItem, useFocus: true });

assert(Math.abs(craftRrrOffNoFocus.percentage - 15.25) < 0.05, 'Royal Off-City without Focus RRR is 15.25% (0.18 / 1.18)');
assert(Math.abs(craftRrrBonusNoFocus.percentage - 24.81) < 0.05, 'Bonus City (+15% LPB) without Focus RRR is 24.81% (0.33 / 1.33)');
assert(Math.abs(craftRrrOffFocus.percentage - 43.50) < 0.05, 'Royal Off-City with Focus RRR is 43.50% (0.77 / 1.77)');
assert(Math.abs(craftRrrBonusFocus.percentage - 47.92) < 0.05, 'Bonus City (+15% LPB) with Focus RRR is 47.92% (0.92 / 1.92)');
assert(craftRrrIslandNoFocus.percentage === 0, 'Island without Focus RRR is 0%');
assert(Math.abs(craftRrrIslandFocus.percentage - 37.11) < 0.05, 'Island with Focus RRR is 37.11% (0.59 / 1.59)');

// Verify Brecilien Bag & Caerleon War Gloves Bonuses
assert(
  C.calculateCraftingRRR({ cityId: 'Brecilien', item: bagItem, useFocus: false }).hasBonus === true,
  'Brecilien grants +15% crafting specialty bonus to Bags & Capes'
);
assert(
  C.calculateCraftingRRR({ cityId: 'Caerleon', item: glovesItem, useFocus: false }).hasBonus === true,
  'Caerleon grants +15% crafting specialty bonus to War Gloves & Tools'
);

// Verify Material & Output IDs
assert(C.getMaterialItemId('METALBAR', 6, 0) === 'T6_METALBAR', 'T6.0 Metal Bar ID is T6_METALBAR');
assert(C.getMaterialItemId('METALBAR', 6, 3) === 'T6_METALBAR_LEVEL3@3', 'T6.3 Metal Bar ID is T6_METALBAR_LEVEL3@3');
assert(C.getCraftedItemId(swordItem, 7, 2) === 'T7_MAIN_SWORD@2', 'T7.2 Broadsword ID is T7_MAIN_SWORD@2');

// Verify Compounding Material Conservation Invariant (Bought - Leftover === Used - Returned)
const craftSim = C.simulateCrafting({
  itemId: 'broadsword',
  tier: 6,
  enchantment: 1,
  cityId: 'Lymhurst',
  useFocus: true,
  compound: true,
  useJournals: true,
  quantity: 25,
  mastery: 100,
  spec: 100,
  crossSpec: 200,
  feePer100Nutrition: 400,
  primaryMatPrice: 5200,
  secondaryMatPrice: 4800,
  emptyJournalPrice: 14400,
  fullJournalPrice: 54000,
  outputPrice: 145000,
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
});

assert(
  craftSim.totalCrafts > craftSim.initialCrafts,
  'Compounding crafting produces more total items than initial batch',
  `Initial=${craftSim.initialCrafts}, Total=${craftSim.totalCrafts}`
);
assert(
  craftSim.primaryBought - craftSim.primaryLeftover === craftSim.primaryUsed - craftSim.primaryReturned &&
  craftSim.secondaryBought - craftSim.secondaryLeftover === craftSim.secondaryUsed - craftSim.secondaryReturned,
  'Exact conservation for both primary & secondary materials: Bought - Leftover === Used - Returned'
);
assert(
  craftSim.journalsFilled > 0 && craftSim.journalGrossRevenue > craftSim.journalPurchaseCost,
  'Crafting journal filling calculates exact fractional journals filled and journal revenue'
);

// Verify Break-Even Sell Price & Crafted Cost / Unit
const beCraftSim = C.simulateCrafting({
  itemId: 'broadsword',
  tier: 6,
  enchantment: 1,
  cityId: 'Lymhurst',
  useFocus: true,
  compound: true,
  useJournals: true,
  quantity: 25,
  mastery: 100,
  spec: 100,
  crossSpec: 200,
  feePer100Nutrition: 400,
  primaryMatPrice: 5200,
  secondaryMatPrice: 4800,
  emptyJournalPrice: 14400,
  fullJournalPrice: 54000,
  outputPrice: craftSim.breakEvenPrice,
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
});
assert(
  Math.abs(beCraftSim.netProfit) < 1,
  'Crafting break-even sell price yields exact 0 net profit',
  `NetProfit at break-even: ${beCraftSim.netProfit.toFixed(4)}`
);
assert(
  Math.abs(craftSim.unitCraftCost - craftSim.breakEvenPrice * (1 - 0.065)) < 1,
  'Crafted Cost / Unit matches Break-Even Sell Price net of market sales tax'
);

// Verify fitBatchToCraftingFocus stays within Focus Pool
const fittedBatch10k = C.fitBatchToCraftingFocus({
  focusPool: 10000,
  item: swordItem,
  tier: 6,
  enchantment: 0,
  cityId: 'Lymhurst',
  compound: true,
  mastery: 100,
  spec: 100,
  crossSpec: 100,
});
const fittedSim10k = C.simulateCrafting({
  itemId: 'broadsword',
  tier: 6,
  enchantment: 0,
  cityId: 'Lymhurst',
  useFocus: true,
  compound: true,
  quantity: fittedBatch10k,
  mastery: 100,
  spec: 100,
  crossSpec: 100,
});
assert(
  fittedSim10k.totalFocusCost <= 10000 && fittedSim10k.totalFocusCost > 0,
  'fitBatchToCraftingFocus (10k Focus) stays within 10,000 FP budget',
  `InitialBatch=${fittedBatch10k}, TotalCrafts=${fittedSim10k.totalCrafts}, FocusSpent=${fittedSim10k.totalFocusCost}`
);

// Verify Equipment Trees (Swords, Axes, etc.), Artifact 0% RRR, and Outlands Hideout RRR
assert(C.TREES.length === 31, 'All 31 Equipment & Accessory Trees registered across the 4 Stations', `Got: ${C.TREES.length}`);
assert(C.ITEMS.length >= 215, 'All 215+ weapons, armors, off-hands, bags, capes & tools loaded', `Count: ${C.ITEMS.length}`);

const swordTreeItems = C.ITEMS.filter(i => i.treeId === 'swords');
assert(
  swordTreeItems.length === 8 &&
  swordTreeItems.some(i => i.name === 'Broadsword') &&
  swordTreeItems.some(i => i.name === 'Claymore') &&
  swordTreeItems.some(i => i.name === 'Dual Swords') &&
  swordTreeItems.some(i => i.name === 'Carving Sword'),
  'Swords tree contains all 8 swords (Broadsword, Claymore, Dual Swords, Clarent, Carving, Galatine, Kingmaker, Infinity Blade)'
);

const carvingItem = C.ITEMS.find(i => i.id === 'carving');
const claymoreItem = C.ITEMS.find(i => i.id === 'claymore');
assert(
  C.getArtifactItemId(carvingItem, 6) === 'T6_ARTEFACT_2H_CLEAVER_HELL',
  'Artifact ID scales by tier and never has enchantment suffix'
);

// Artifact & Journal 0% RRR Invariant Test
const artCraftSim = C.simulateCrafting({
  itemId: 'carving',
  tier: 6,
  enchantment: 2,
  cityId: 'Lymhurst',
  useFocus: true,
  compound: true,
  useJournals: true,
  quantity: 10,
  primaryMatPrice: 12000,
  secondaryMatPrice: 11000,
  artifactPrice: 85000,
  emptyJournalPrice: 14400,
  fullJournalPrice: 54000,
  outputPrice: 480000,
  marketFeeRate: 0.065,
  buyFeeRate: 0.025,
});

assert(
  artCraftSim.hasArtifact === true &&
  artCraftSim.artifactsBought === artCraftSim.totalCrafts &&
  artCraftSim.artifactsUsed === artCraftSim.totalCrafts &&
  artCraftSim.artifactsReturned === 0 &&
  artCraftSim.artifactsLeftover === 0,
  'Artifacts are NEVER affected by RRR (1 consumed per craft, 0 returned, 0 leftover)',
  `TotalCrafts=${artCraftSim.totalCrafts}, ArtifactsBought=${artCraftSim.artifactsBought}, Returned=${artCraftSim.artifactsReturned}`
);

assert(
  artCraftSim.journalsReturned === 0 &&
  Math.abs(
    C.calculateJournalMetrics({ item: carvingItem, tier: 6, enchantment: 2 }).famePerCraft -
    C.calculateJournalMetrics({ item: claymoreItem, tier: 6, enchantment: 2 }).famePerCraft
  ) < 0.001,
  'Journals are NEVER affected by RRR and artifact does not inflate journal crafting fame'
);

// Outlands Hideout Zone Quality (Q1-Q6) & Power Level (1-9) RRR Tests
const hoQ6L9MatchNoFocus = C.calculateCraftingRRR({
  cityId: 'Hideout',
  item: swordItem,
  useFocus: false,
  hideoutZoneQuality: 6,
  hideoutPowerLevel: 9,
  hideoutBiomeMatch: true,
});
const hoQ6L9MatchFocus = C.calculateCraftingRRR({
  cityId: 'Hideout',
  item: swordItem,
  useFocus: true,
  hideoutZoneQuality: 6,
  hideoutPowerLevel: 9,
  hideoutBiomeMatch: true,
});
const hoQ6L9NoMatchNoFocus = C.calculateCraftingRRR({
  cityId: 'Hideout',
  item: swordItem,
  useFocus: false,
  hideoutZoneQuality: 6,
  hideoutPowerLevel: 9,
  hideoutBiomeMatch: false,
});
const hoQ1L1NoFocus = C.calculateCraftingRRR({
  cityId: 'Hideout',
  item: swordItem,
  useFocus: false,
  hideoutZoneQuality: 1,
  hideoutPowerLevel: 1,
  hideoutBiomeMatch: false,
});

assert(
  Math.abs(hoQ6L9MatchNoFocus.lpb - 0.82) < 0.0001 && Math.abs(hoQ6L9MatchNoFocus.percentage - 45.05) < 0.05,
  'Hideout Q6 (+26%) + Power Lvl 9 (+26% Gen + 30% Spec = +82% LPB) without Focus is 45.05% RRR'
);
assert(
  Math.abs(hoQ6L9MatchFocus.lpb - 1.41) < 0.0001 && Math.abs(hoQ6L9MatchFocus.percentage - 58.51) < 0.05,
  'Hideout Q6 + Power Lvl 9 + Biome Match with Focus (+141% LPB) is 58.51% RRR'
);
assert(
  Math.abs(hoQ6L9NoMatchNoFocus.lpb - 0.52) < 0.0001 && Math.abs(hoQ6L9NoMatchNoFocus.percentage - 34.21) < 0.05,
  'Hideout Q6 + Power Lvl 9 without Biome Match (+52% LPB) is 34.21% RRR'
);
assert(
  Math.abs(hoQ1L1NoFocus.lpb - 0.01) < 0.0001 && Math.abs(hoQ1L1NoFocus.percentage - 0.99) < 0.05,
  'Hideout Q1 (+1%) + Power Lvl 1 (0%) without Focus is 0.99% RRR'
);

// Verify Official Journal Fame/Capacity & Station Fee Ceil Rounding
const claymoreJMetrics = C.calculateJournalMetrics({ item: claymoreItem, tier: 6, enchantment: 1 });
assert(
  claymoreJMetrics.famePerCraft === 17280 &&
  claymoreJMetrics.journalFameReq === 14400 &&
  Math.abs(claymoreJMetrics.journalsPerCraft - 1.2) < 0.0001,
  'T6.1 Claymore yields 17,280 crafting fame and fills 1.20 T6 Journals (14,400 capacity)'
);
assert(
  C.calculateCraftingStationFee({ item: claymoreItem, tier: 6, enchantment: 1, feePer100Nutrition: 400 }) === 1844,
  'T6.1 Claymore station fee at 400 tax rounds up per craft to 1,844 silver'
);

// Verify Official Base Focus Cost (0 Spec -> 4,596 FP for T6.1 Robe, ~1,161 FP at 100 Mastery / 35 Spec / 270 Cross)
const druidRobeItem = C.ITEMS.find(i => i.id === 'druid_robe');
assert(
  C.calculateCraftingFocusCost({ item: druidRobeItem, tier: 6, enchantment: 1, mastery: 0, spec: 0, crossSpec: 0 }) === 4596,
  'T6.1 Druid Robe 0-spec base focus cost matches official items.json (4,596 FP)'
);
assert(
  C.calculateCraftingFocusCost({ item: druidRobeItem, tier: 6, enchantment: 1, mastery: 100, spec: 35, crossSpec: 270 }) === 1161,
  'T6.1 Druid Robe focus cost at 100 Mastery / 35 Spec / 270 Cross-Spec is 1,161 FP'
);

console.log('\n=====================================================');
console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('=====================================================');

if (failedCount > 0) {
  process.exit(1);
}
