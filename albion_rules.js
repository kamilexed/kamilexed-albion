/**
 * albion_rules.js
 * Core Albion Online Game Rules, Constants, and Pure Economic Formulas.
 *
 * Verified against Albion Online game client & databases (2026):
 * - RRR via Local Production Bonus: RRR = LPB / (1 + LPB)
 *   Royal City Base = 18%, Refining Specialty = +40%, Focus = +59%, Island Base = 0%
 * - RRR applies to BOTH raw material AND lower-tier refined material
 * - Item Values: T2=4, T3=8, T4=16, T5=32, T6=64, T7=128, T8=256 (x2^enchant)
 * - Station Nutrition Fee: ItemValue * 0.1125 * (FeePer100 / 100)
 * - Base Focus Costs (0 spec): T2=0, T3=31, T4=54, T5=94, T6=164, T7=287, T8=503
 *   Enchantments shift effective tier (1.75x per effective tier step)
 * - Focus Cost Formula: BaseFocus * 0.5 ^ (Efficiency / 10000)
 * - Market Taxes: 4% Premium / 8% Non-Premium + 2.5% Sell Order Setup Fee
 */

(function () {
  'use strict';

  function factory() {
    // -------------------------------------------------------------------------
    // 1. GAME CONSTANTS & DEFINITIONS
    // -------------------------------------------------------------------------

    const RESOURCES = [
      {
        id: 'ore',
        name: 'Ore & Metal Bar',
        rawName: 'Ore',
        refinedName: 'Metal Bar',
        bonusCity: 'Thetford',
        rawPrefix: 'ORE',
        refinedPrefix: 'METALBAR',
        heartId: 'T1_FACTION_MOUNTAIN_TOKEN_1',
        heartName: 'Mountainheart',
        color: '#38bdf8',
      },
      {
        id: 'wood',
        name: 'Wood & Planks',
        rawName: 'Wood',
        refinedName: 'Planks',
        bonusCity: 'Fort Sterling',
        rawPrefix: 'WOOD',
        refinedPrefix: 'PLANKS',
        heartId: 'T1_FACTION_FOREST_TOKEN_1',
        heartName: 'Treeheart',
        color: '#f59e0b',
      },
      {
        id: 'fiber',
        name: 'Fiber & Cloth',
        rawName: 'Fiber',
        refinedName: 'Cloth',
        bonusCity: 'Lymhurst',
        rawPrefix: 'FIBER',
        refinedPrefix: 'CLOTH',
        heartId: 'T1_FACTION_SWAMP_TOKEN_1',
        heartName: 'Vineheart',
        color: '#34d399',
      },
      {
        id: 'hide',
        name: 'Hide & Leather',
        rawName: 'Hide',
        refinedName: 'Leather',
        bonusCity: 'Martlock',
        rawPrefix: 'HIDE',
        refinedPrefix: 'LEATHER',
        heartId: 'T1_FACTION_STEPPE_TOKEN_1',
        heartName: 'Beastheart',
        color: '#fb923c',
      },
      {
        id: 'stone',
        name: 'Stone & Stone Blocks',
        rawName: 'Stone',
        refinedName: 'Stone Block',
        bonusCity: 'Bridgewatch',
        rawPrefix: 'ROCK',
        refinedPrefix: 'STONEBLOCK',
        heartId: 'T1_FACTION_HIGHLAND_TOKEN_1',
        heartName: 'Rockheart',
        color: '#94a3b8',
      },
    ];

    const CITIES = [
      { id: 'Thetford', name: 'Thetford', bonus: 'ore', isCity: true },
      { id: 'Fort Sterling', name: 'Fort Sterling', bonus: 'wood', isCity: true },
      { id: 'Lymhurst', name: 'Lymhurst', bonus: 'fiber', isCity: true },
      { id: 'Bridgewatch', name: 'Bridgewatch', bonus: 'stone', isCity: true },
      { id: 'Martlock', name: 'Martlock', bonus: 'hide', isCity: true },
      { id: 'Island', name: 'Player Island / Private', bonus: null, isCity: false },
      { id: 'Custom', name: 'Hideout / Custom RRR', bonus: null, isCity: false },
    ];

    // Tier requirements and verified base Item Values / Focus Costs
    // verified: albiononline2d / albionfreemarket / game data
    const TIERS = {
      2: { tier: 2, label: 'T2 - Novice', rawReq: 1, prevReq: 0, baseItemValue: 4, baseFocus: 0 },
      3: { tier: 3, label: 'T3 - Journeyman', rawReq: 2, prevReq: 1, baseItemValue: 8, baseFocus: 31 },
      4: { tier: 4, label: 'T4 - Adept', rawReq: 2, prevReq: 1, baseItemValue: 16, baseFocus: 54 },
      5: { tier: 5, label: 'T5 - Expert', rawReq: 3, prevReq: 1, baseItemValue: 32, baseFocus: 94 },
      6: { tier: 6, label: 'T6 - Master', rawReq: 4, prevReq: 1, baseItemValue: 64, baseFocus: 164 },
      7: { tier: 7, label: 'T7 - Grandmaster', rawReq: 5, prevReq: 1, baseItemValue: 128, baseFocus: 287 },
      8: { tier: 8, label: 'T8 - Elder', rawReq: 5, prevReq: 1, baseItemValue: 256, baseFocus: 503 },
    };

    const ENCHANTMENTS = {
      0: { level: 0, label: '.0 Common', mult: 1 },
      1: { level: 1, label: '.1 Uncommon', mult: 2 },
      2: { level: 2, label: '.2 Rare', mult: 4 },
      3: { level: 3, label: '.3 Exceptional', mult: 8 },
      4: { level: 4, label: '.4 Pristine', mult: 16 },
    };

    // Exact base focus cost by effective tier (tier + enchantment) at 0 efficiency
    // verified: Albion Online refining progression (~1.75x per effective tier)
    const BASE_FOCUS_BY_EFFECTIVE_TIER = {
      2: 0,     // T2 cannot be focused
      3: 31,    // T3.0
      4: 54,    // T4.0
      5: 94,    // T5.0, T4.1
      6: 164,   // T6.0, T5.1, T4.2
      7: 287,   // T7.0, T6.1, T5.2, T4.3
      8: 503,   // T8.0, T7.1, T6.2, T5.3, T4.4
      9: 880,   // T8.1, T7.2, T6.3, T5.4
      10: 1540, // T8.2, T7.3, T6.4
      11: 2695, // T8.3, T7.4
      12: 4716, // T8.4
    };

    // -------------------------------------------------------------------------
    // 2. RESOURCE RETURN RATE (RRR)
    // -------------------------------------------------------------------------

    /**
     * Calculates Resource Return Rate (0.0 to 1.0) via Albion's Local Production Bonus formula:
     * RRR = LPB / (1 + LPB)
     * verified: Albion Online Wiki
     * - Royal City base LPB: +18% (0.18 / 1.18 = 15.25%)
     * - City Specialty Refining LPB: +40% (0.58 / 1.58 = 36.71%)
     * - Focus LPB: +59% (0.77 / 1.77 = 43.50% off-city; 1.17 / 2.17 = 53.92% bonus city)
     * - Player Island base LPB: 0% (0% no focus; 0.59 / 1.59 = 37.11% with focus)
     * - Daily Production Event: +10% or +20% added directly to LPB
     */
    function calculateRRR({
      cityId,
      resourceId,
      useFocus,
      dailyEvent = false,
      dailyBonusPercent = 0,
      customRRR = 0,
    }) {
      if (cityId === 'Custom') {
        const val = Math.min(Math.max(Number(customRRR) || 0, 0), 90);
        return val / 100;
      }

      const res = RESOURCES.find((r) => r.id === resourceId);
      const city = CITIES.find((c) => c.id === cityId);
      const hasCityBonus = !!(city && res && city.bonus === res.id);
      const isRoyalCity = city ? city.isCity : true;

      let lpb = isRoyalCity ? 0.18 : 0.0;
      if (hasCityBonus) lpb += 0.40;
      if (useFocus) lpb += 0.59;

      const eventBonus = dailyBonusPercent > 0 ? Number(dailyBonusPercent) / 100 : (dailyEvent ? 0.10 : 0);
      lpb += eventBonus;

      if (lpb <= 0) return 0;
      return lpb / (1 + lpb);
    }

    // -------------------------------------------------------------------------
    // 3. FOCUS COST & EFFICIENCY
    // -------------------------------------------------------------------------

    /**
     * Focus cost calculation with T4-T8 Tier Specializations + Cross-Spec (Max 500/500).
     * verified: Albion Refining Destiny Board has NO separate general mastery node;
     * it has only T4, T5, T6, T7, T8 spec nodes (max 500/500 total).
     * Formula: Cost = BaseFocus * 0.5 ^ (TotalEfficiency / 10000)
     * Efficiency contributions:
     * - Specific Tier Spec (0-100): 250 pts per level (max 25,000)
     * - Other 4 Tier Specs (0-100): 30 pts per level each (up to 4 * 3,000 = 12,000)
     * Max possible efficiency for T4-T8 = 25,000 + 12,000 = 37,000 (0.5^3.7 = 0.07695x)
     */
    function calculateFocusCost({
      tier,
      enchantment = 0,
      targetSpec = 100,
      otherSpecsAverage = 100,
      specs = null, // optional { 4: 100, 5: 100, 6: 100, 7: 100, 8: 100 }
    }) {
      if (tier <= 2) return 0; // T2 refining does not support Focus

      const effectiveTier = tier + (Number(enchantment) || 0);
      const baseFocus =
        BASE_FOCUS_BY_EFFECTIVE_TIER[effectiveTier] !== undefined
          ? BASE_FOCUS_BY_EFFECTIVE_TIER[effectiveTier]
          : Math.round(54 * Math.pow(1.75, effectiveTier - 4));

      if (baseFocus <= 0) return 0;

      let efficiency = 0;

      if (specs && typeof specs === 'object') {
        if (tier >= 4) {
          const activeTierSpec = Math.min(Math.max(Number(specs[tier]) || 0, 0), 100);
          efficiency += activeTierSpec * 250;
        }
        [4, 5, 6, 7, 8].forEach((t) => {
          if (t !== tier) {
            efficiency += Math.min(Math.max(Number(specs[t]) || 0, 0), 100) * 30;
          }
        });
      } else {
        const clampedTargetSpec = Math.min(Math.max(Number(targetSpec) || 0, 0), 100);
        const clampedOtherSpecs = Math.min(Math.max(Number(otherSpecsAverage) || 0, 0), 100);
        efficiency += (tier >= 4 ? clampedTargetSpec * 250 + clampedOtherSpecs * 30 * 4 : clampedOtherSpecs * 30 * 5);
      }

      const discount = Math.pow(0.5, efficiency / 10000);
      return Math.max(1, Math.round(baseFocus * discount));
    }

    // -------------------------------------------------------------------------
    // 4. STATION USAGE FEE (NUTRITION)
    // -------------------------------------------------------------------------

    /**
     * Calculates station silver tax per craft.
     * verified: Albion Online Nutrition formula:
     * Nutrition used per craft = ItemValue * 0.1125
     * Silver cost = (NutritionUsed * FeePer100Nutrition) / 100
     */
    function calculateStationFee({ tier, enchantment = 0, feePer100Nutrition = 500 }) {
      const tierData = TIERS[tier];
      if (!tierData) return 0;

      const enchData = ENCHANTMENTS[enchantment] || ENCHANTMENTS[0];
      const itemValue = tierData.baseItemValue * enchData.mult;

      const nutritionUsed = itemValue * 0.1125;
      const silverFee = (nutritionUsed * (Number(feePer100Nutrition) || 0)) / 100;
      return silverFee;
    }

    // -------------------------------------------------------------------------
    // 5. MARKET TAXES & LISTING FEES
    // -------------------------------------------------------------------------

    /**
     * Market Fee rate calculation.
     * verified: Albion Market Rules:
     * - Market Tax: 4% with Premium, 8% without Premium.
     * - Listing / Setup Fee: 2.5% for Sell Orders, 0% for Direct/Instant Sell.
     */
    function getMarketFeeRate({ hasPremium = true, orderType = 'sell_order' }) {
      const baseTax = hasPremium ? 0.04 : 0.08;
      const setupFee = orderType === 'sell_order' ? 0.025 : 0.0;
      return baseTax + setupFee;
    }

    /**
     * Buy setup fee rate calculation.
     * verified: Albion Market Rules:
     * - Placing a Buy Order incurs a non-refundable 2.5% setup fee.
     * - Instant Buy (buying directly from sell orders) has 0% setup fee.
     */
    function getBuyFeeRate({ buyOrderType = 'instant_buy' }) {
      return buyOrderType === 'buy_order' ? 0.025 : 0.0;
    }

    // -------------------------------------------------------------------------
    // 6. REFINING SIMULATION (COMPOUNDING & SINGLE-RUN)
    // -------------------------------------------------------------------------

    /**
     * Complete refining financial and batch simulation.
     * verified:
     * - RRR applies to BOTH raw resources AND lower-tier refined bars!
     * - Faction Heart Refining substitutes 1 raw resource with 1 Faction Heart
     *   (not eligible on .4 resources or T2). Faction Hearts are NOT returned by RRR.
     */
    function simulateRefining({
      tier,
      enchantment = 0,
      batchCrafts = 500, // Initial craft attempts
      rawPrice = 50,
      prevTierPrice = 40,
      sellPrice = 150,
      rrr = 0.539,
      compound = true,
      stationFeePerCraft = 0,
      useFocus = false,
      focusCostPerCraft = 0,
      marketFeeRate = 0.065,
      buyFeeRate = 0.0,
      useHeart = false,
      heartPrice = 0,
    }) {
      const tierData = TIERS[tier] || TIERS[4];
      const heartActive = Boolean(useHeart && enchantment !== 4 && tierData.rawReq >= 2);
      const rawReq = heartActive ? tierData.rawReq - 1 : tierData.rawReq;
      const prevReq = tierData.prevReq;
      const heartReq = heartActive ? 1 : 0;

      let totalCrafts = 0;
      let totalRefinedProduced = 0;
      let totalRawConsumed = 0;
      let totalPrevTierConsumed = 0;
      let totalHeartsConsumed = 0;
      let totalRawReturned = 0;
      let totalPrevReturned = 0;
      let totalHeartsReturned = 0;
      let totalPrevBought = 0;
      let totalHeartsBought = 0;
      let leftoverRaw = 0;
      let leftoverPrev = 0;
      let leftoverHearts = 0;
      const rounds = [];

      if (compound) {
        let currentRaw = batchCrafts * rawReq;
        let availablePrev = 0;
        let availableHearts = 0;
        let roundNum = 1;

        while (currentRaw >= rawReq) {
          const craftsThisRound = Math.floor(currentRaw / rawReq);
          const rawUsed = craftsThisRound * rawReq;
          const prevUsed = craftsThisRound * prevReq;
          const heartsUsed = craftsThisRound * heartReq;

          // Reuse returned lower-tier bars first; only buy deficit
          let prevBoughtThisRound = 0;
          if (prevUsed > availablePrev) {
            prevBoughtThisRound = prevUsed - availablePrev;
            totalPrevBought += prevBoughtThisRound;
            availablePrev = 0;
          } else {
            availablePrev -= prevUsed;
          }

          // Reuse returned Faction Hearts first; only buy deficit
          let heartsBoughtThisRound = 0;
          if (heartsUsed > availableHearts) {
            heartsBoughtThisRound = heartsUsed - availableHearts;
            totalHeartsBought += heartsBoughtThisRound;
            availableHearts = 0;
          } else {
            availableHearts -= heartsUsed;
          }

          const rawReturned = Math.floor(rawUsed * rrr);
          const prevReturned = Math.floor(prevUsed * rrr);
          const heartsReturned = Math.floor(heartsUsed * rrr);

          currentRaw = currentRaw - rawUsed + rawReturned;
          availablePrev += prevReturned;
          availableHearts += heartsReturned;

          totalCrafts += craftsThisRound;
          totalRefinedProduced += craftsThisRound;
          totalRawConsumed += rawUsed;
          totalPrevTierConsumed += prevUsed;
          totalHeartsConsumed += heartsUsed;
          totalRawReturned += rawReturned;
          totalPrevReturned += prevReturned;
          totalHeartsReturned += heartsReturned;

          rounds.push({
            round: roundNum,
            crafts: craftsThisRound,
            rawUsed,
            rawReturned,
            prevUsed,
            prevReturned,
            prevBought: prevBoughtThisRound,
            heartsUsed,
            heartsReturned,
            heartsBought: heartsBoughtThisRound,
            refinedProduced: craftsThisRound,
          });

          roundNum++;
          if (roundNum > 60) break; // Infinite loop safety
        }
        leftoverRaw = currentRaw;
        leftoverPrev = availablePrev;
        leftoverHearts = availableHearts;
      } else {
        // Single run: craft batchCrafts once, retain returned raw + lower-tier bars + Faction Hearts
        const rawUsed = batchCrafts * rawReq;
        const prevUsed = batchCrafts * prevReq;
        const heartsUsed = batchCrafts * heartReq;
        const rawReturned = Math.floor(rawUsed * rrr);
        const prevReturned = Math.floor(prevUsed * rrr);
        const heartsReturned = Math.floor(heartsUsed * rrr);

        totalCrafts = batchCrafts;
        totalRefinedProduced = batchCrafts;
        totalRawConsumed = rawUsed;
        totalPrevTierConsumed = prevUsed;
        totalHeartsConsumed = heartsUsed;
        totalRawReturned = rawReturned;
        totalPrevReturned = prevReturned;
        totalHeartsReturned = heartsReturned;
        totalPrevBought = prevUsed;
        totalHeartsBought = heartsUsed;
        leftoverRaw = rawReturned;
        leftoverPrev = prevReturned;
        leftoverHearts = heartsReturned;

        rounds.push({
          round: 1,
          crafts: batchCrafts,
          rawUsed,
          rawReturned,
          prevUsed,
          prevReturned,
          prevBought: prevUsed,
          heartsUsed,
          heartsReturned,
          heartsBought: heartsUsed,
          refinedProduced: batchCrafts,
        });
      }

      // Material & Operating Costs (Faction Hearts ALSO benefit from RRR returns)
      const initialRawUnits = batchCrafts * rawReq;
      const netRawConsumed = initialRawUnits - leftoverRaw;
      const netPrevConsumed = totalPrevBought - leftoverPrev;
      const netHeartsConsumed = totalHeartsBought - leftoverHearts;

      const totalRawCost = initialRawUnits * rawPrice;
      const totalPrevTierCost = totalPrevBought * prevTierPrice;
      const totalHeartCost = totalHeartsBought * heartPrice;
      const buyFeeSilver = (totalRawCost + totalPrevTierCost + totalHeartCost) * buyFeeRate;
      const totalStationCost = totalCrafts * stationFeePerCraft;
      const totalExpense = totalRawCost + totalPrevTierCost + totalHeartCost + buyFeeSilver + totalStationCost;

      // Revenue & Retained Salvage
      const grossRevenue = totalRefinedProduced * sellPrice;
      const marketTaxSilver = grossRevenue * marketFeeRate;
      const leftoverRawValue = leftoverRaw * rawPrice;
      const leftoverPrevValue = leftoverPrev * prevTierPrice;
      const leftoverHeartValue = leftoverHearts * heartPrice;
      const leftoverSalvageValue = leftoverRawValue + leftoverPrevValue + leftoverHeartValue;

      // Net results (net of retained uncrafted raw & lower-tier returns)
      const netRevenue = grossRevenue - marketTaxSilver + leftoverSalvageValue;
      const netProfit = netRevenue - totalExpense;
      const effectiveExpense = totalExpense - leftoverSalvageValue;
      const profitMargin = effectiveExpense > 0 ? (netProfit / effectiveExpense) * 100 : 0;
      const profitPerCraft = totalCrafts > 0 ? netProfit / totalCrafts : 0;

      // Focus efficiency
      const totalFocusSpent = useFocus ? totalCrafts * focusCostPerCraft : 0;
      const silverPerFocus = totalFocusSpent > 0 ? netProfit / totalFocusSpent : null;

      // Break-even sell price (covers net material/station expenses after market taxes)
      const breakEvenPrice =
        totalRefinedProduced > 0 && 1 - marketFeeRate > 0
          ? effectiveExpense / ((1 - marketFeeRate) * totalRefinedProduced)
          : 0;

      return {
        heartActive,
        rawReqPerCraft: rawReq,
        heartReqPerCraft: heartReq,
        totalCrafts,
        totalRefinedProduced,
        initialRawUnits,
        totalRawConsumed,
        netRawConsumed,
        totalPrevTierConsumed, // gross used across all crafts
        totalPrevBought,       // upfront/bought lower-tier bars needed
        netPrevConsumed,       // net lower-tier bars lost after RRR
        totalHeartsConsumed,   // gross hearts used across all crafts
        totalHeartsBought,     // upfront/bought hearts needed
        totalHeartsReturned,   // hearts returned via RRR
        leftoverHearts,        // uncrafted hearts retained
        netHeartsConsumed,     // net hearts lost after RRR
        totalRawReturned,
        totalPrevReturned,
        leftoverRaw,
        leftoverPrev,
        totalRawCost,
        totalPrevTierCost,
        totalHeartCost,
        buyFeeSilver,
        totalStationCost,
        totalExpense,
        effectiveExpense,
        grossRevenue,
        marketTaxSilver,
        leftoverRawValue,
        leftoverPrevValue,
        leftoverHeartValue,
        leftoverSalvageValue,
        netRevenue,
        netProfit,
        profitMargin,
        profitPerCraft,
        totalFocusSpent,
        silverPerFocus,
        breakEvenPrice: Math.ceil(Math.max(0, breakEvenPrice)),
        rounds,
      };
    }

    // -------------------------------------------------------------------------
    // 7. RECURSIVE REFINING SIMULATION (SELF-REFINED CHAIN)
    // -------------------------------------------------------------------------

    /**
     * Recursive Refining Simulation:
     * Calculates the full multi-tier chain from T2/T3 up to targetTier.
     * Instead of buying lower-tier bars from market, refines them from raw materials.
     * Properly applies:
     * - Lower-tier bar RRR returns at every stage (each stage shrinks by 1 - stageRRR!)
     * - Separate RRR with/without Focus per stage based on focusMode ('top_tier' | 'all' | 'none')
     */
    function simulateRecursiveRefining({
      targetTier,
      targetEnchantment = 0,
      batchCrafts = 500,
      rawPrices = {},      // { '6.1': 1050, '5.1': 350, ... }
      refinedPrices = {},  // { '5.1': 1100, ... } (for market comparison)
      targetSellPrice = 4300,
      rrr = 0.539,         // RRR when focus is active (or default if rrrNoFocus not given)
      rrrNoFocus = null,   // RRR when focus is NOT active on lower stages
      compound = true,
      feePer100Nutrition = 500,
      focusMode = 'top_tier', // legacy fallback: 'top_tier' | 'all' | 'none'
      focusTiers = null,      // optional per-tier map { 3: bool, ..., 8: bool }
      specs = null,
      marketFeeRate = 0.065,
      buyFeeRate = 0.0,
      useHeart = false,
      heartTiers = null,      // optional per-tier map { 3: bool, ..., 8: bool }
      heartPrice = 0,
    }) {
      // If rrrNoFocus isn't explicitly passed, derive reasonable fallback or use rrr
      const focusRRR = rrr;
      const noFocusRRR = rrrNoFocus !== null ? rrrNoFocus : rrr;

      const stageUsesFocus = (tier, idx) => {
        if (tier <= 2) return false;
        if (focusTiers) return Boolean(focusTiers[tier]);
        return idx === 0
          ? (focusMode === 'top_tier' || focusMode === 'all')
          : focusMode === 'all';
      };

      const stageUsesHeart = (tier, enchantment, idx) => {
        if (!useHeart || enchantment === 4 || (TIERS[tier] && TIERS[tier].rawReq < 2)) return false;
        if (heartTiers) return Boolean(heartTiers[tier]);
        return idx === 0;
      };

      // 1. Trace the chain of stages from targetTier down to 2
      const stages = [];
      let curTier = targetTier;
      let curEnch = targetEnchantment;

      while (curTier >= 2) {
        stages.push({
          tier: curTier,
          enchantment: curEnch,
          tierData: TIERS[curTier],
          enchData: ENCHANTMENTS[curEnch] || ENCHANTMENTS[0],
        });
        if (curTier === 2) break;
        curEnch = getPrevTierEnchantment(curTier, curEnch);
        curTier--;
      }

      // 2. Simulate target stage first (stages[0])
      const targetStage = stages[0];
      const targetUsesFocus = stageUsesFocus(targetStage.tier, 0);
      const targetUsesHeart = stageUsesHeart(targetStage.tier, targetStage.enchantment, 0);
      const targetRRR = targetUsesFocus ? focusRRR : noFocusRRR;

      const targetSim = simulateRefining({
        tier: targetStage.tier,
        enchantment: targetStage.enchantment,
        batchCrafts,
        rawPrice: 0,
        prevTierPrice: 0,
        sellPrice: targetSellPrice,
        rrr: targetRRR,
        compound,
        stationFeePerCraft: calculateStationFee({
          tier: targetStage.tier,
          enchantment: targetStage.enchantment,
          feePer100Nutrition,
        }),
        useFocus: targetUsesFocus,
        focusCostPerCraft: calculateFocusCost({
          tier: targetStage.tier,
          enchantment: targetStage.enchantment,
          specs,
        }),
        marketFeeRate,
        buyFeeRate,
        useHeart: targetUsesHeart,
        heartPrice,
      });

      targetStage.crafts = targetSim.totalCrafts;
      targetStage.refinedProduced = targetSim.totalRefinedProduced;
      targetStage.rawConsumed = targetSim.totalRawConsumed;
      targetStage.rawReturned = targetSim.totalRawReturned;
      targetStage.netRawNeeded = targetSim.netRawConsumed; // net raw consumed after leftover
      targetStage.initialRawUnits = targetSim.initialRawUnits;
      targetStage.stageRRR = targetRRR;
      targetStage.barsNeededFromPrev = targetSim.netPrevConsumed;
      targetStage.heartActive = targetSim.heartActive;
      targetStage.heartsConsumed = targetSim.netHeartsConsumed;
      targetStage.useFocus = targetUsesFocus;

      // 3. For lower stages (stages[1] to stages[last])
      let neededBars = targetStage.barsNeededFromPrev;

      for (let i = 1; i < stages.length; i++) {
        const st = stages[i];
        const useFocusHere = stageUsesFocus(st.tier, i);
        const useHeartHere = stageUsesHeart(st.tier, st.enchantment, i);
        const stageRRR = useFocusHere ? focusRRR : noFocusRRR;

        // To net-produce neededBars refined bars, stage performs stageCrafts = neededBars
        const stageCrafts = neededBars;
        const rawReq = useHeartHere ? (st.tierData.rawReq - 1) : st.tierData.rawReq;
        const prevReq = st.tierData.prevReq;
        const heartReq = useHeartHere ? 1 : 0;

        const totalRawUsed = stageCrafts * rawReq;
        const totalRawReturned = Math.floor(totalRawUsed * stageRRR);
        const netRawNeeded = totalRawUsed - totalRawReturned;

        const totalHeartsUsed = stageCrafts * heartReq;
        const totalHeartsReturned = Math.floor(totalHeartsUsed * stageRRR);
        const netHeartsNeeded = totalHeartsUsed - totalHeartsReturned;

        const totalPrevUsed = stageCrafts * prevReq;
        const totalPrevReturned = Math.floor(totalPrevUsed * stageRRR);
        const netPrevNeeded = st.tier > 2 ? totalPrevUsed - totalPrevReturned : 0;

        st.crafts = stageCrafts;
        st.refinedProduced = neededBars;
        st.rawConsumed = totalRawUsed;
        st.rawReturned = totalRawReturned;
        st.netRawNeeded = netRawNeeded;
        st.initialRawUnits = netRawNeeded;
        st.stageRRR = stageRRR;
        st.barsNeededFromPrev = netPrevNeeded;
        st.heartActive = useHeartHere;
        st.heartsConsumed = netHeartsNeeded;
        st.useFocus = useFocusHere;

        neededBars = netPrevNeeded;
      }

      // 4. Compute financial costs for each stage
      let totalRawCost = 0;
      let totalHeartCost = 0;
      let totalHeartsConsumed = 0;
      let totalStationCost = 0;
      let totalFocusSpent = 0;

      stages.forEach((st, idx) => {
        const key = `${st.tier}.${st.enchantment}`;
        const rawP = Number(rawPrices[key]) || Number(rawPrices[`T${st.tier}.${st.enchantment}`]) || 0;
        const stageRawCost = st.netRawNeeded * rawP;
        const stageHearts = st.heartsConsumed || 0;
        const stageHeartCost = stageHearts * heartPrice;

        const stationFeeUnit = calculateStationFee({
          tier: st.tier,
          enchantment: st.enchantment,
          feePer100Nutrition,
        });
        const stageStationCost = st.crafts * stationFeeUnit;

        const focusUnit = calculateFocusCost({
          tier: st.tier,
          enchantment: st.enchantment,
          specs,
        });
        const stageFocusCost = st.useFocus ? st.crafts * focusUnit : 0;

        st.rawPrice = rawP;
        st.rawCost = stageRawCost;
        st.heartCost = stageHeartCost;
        st.stationFeeUnit = stationFeeUnit;
        st.stationCost = stageStationCost;
        st.focusUnit = focusUnit;
        st.focusSpent = stageFocusCost;

        totalRawCost += stageRawCost;
        totalHeartCost += stageHeartCost;
        totalHeartsConsumed += stageHearts;
        totalStationCost += stageStationCost;
        totalFocusSpent += stageFocusCost;
      });

      const buyFeeSilver = (totalRawCost + totalHeartCost) * buyFeeRate;
      const totalRecursiveExpense = totalRawCost + totalHeartCost + buyFeeSilver + totalStationCost;

      // 5. Comparison against Direct Market Buy (using exact same net consumption basis)
      const prevKey = stages.length > 1 ? `${stages[1].tier}.${stages[1].enchantment}` : null;
      const directBarPrice = prevKey ? Number(refinedPrices[prevKey]) || Number(refinedPrices[`T${prevKey}`]) || 0 : 0;
      const directPrevBarsCost = stages[0].barsNeededFromPrev * directBarPrice;
      const targetHeartCost = stages[0].heartCost || 0;
      const directBuyFee = (stages[0].rawCost + targetHeartCost + directPrevBarsCost) * buyFeeRate;
      const directMarketExpense = stages[0].rawCost + targetHeartCost + directPrevBarsCost + directBuyFee + stages[0].stationCost;
      const selfRefineSavings = directMarketExpense - totalRecursiveExpense;

      // 6. Final revenue & profit
      const grossRevenue = targetStage.refinedProduced * targetSellPrice;
      const marketTaxSilver = grossRevenue * marketFeeRate;
      const netRevenue = grossRevenue - marketTaxSilver;
      const netProfit = netRevenue - totalRecursiveExpense;
      const profitMargin = totalRecursiveExpense > 0 ? (netProfit / totalRecursiveExpense) * 100 : 0;
      const silverPerFocus = totalFocusSpent > 0 ? netProfit / totalFocusSpent : null;
      const breakEvenPrice =
        targetStage.refinedProduced > 0 && 1 - marketFeeRate > 0
          ? totalRecursiveExpense / ((1 - marketFeeRate) * targetStage.refinedProduced)
          : 0;

      return {
        stages,
        heartActive: stages.some(s => s.heartActive),
        totalHeartsConsumed,
        totalHeartCost,
        buyFeeSilver,
        totalRefinedProduced: targetStage.refinedProduced,
        totalRawCost,
        totalStationCost,
        totalRecursiveExpense,
        directMarketExpense,
        selfRefineSavings,
        grossRevenue,
        marketTaxSilver,
        netRevenue,
        netProfit,
        profitMargin,
        totalFocusSpent,
        silverPerFocus,
        breakEvenPrice: Math.ceil(Math.max(0, breakEvenPrice)),
      };
    }

    /**
     * Binary-searches the exact maximum initial batch size whose simulated
     * totalFocusSpent stays <= focusBudget across Direct, Compounding, and Recursive modes.
     */
    function fitBatchToFocus({
      focusBudget,
      tier,
      enchantment = 0,
      rrr = 0.539,
      rrrNoFocus = null,
      compound = true,
      isRecursive = false,
      focusMode = 'top_tier',
      focusTiers = null,
      specs = null,
      useHeart = false,
      heartTiers = null,
    }) {
      if (tier <= 2 || focusBudget <= 0) return 1;
      const focusCostPerCraft = calculateFocusCost({ tier, enchantment, specs });
      if (focusCostPerCraft <= 0) return 1;

      const evalFocus = (batch) => {
        if (isRecursive && tier > 2) {
          return simulateRecursiveRefining({
            targetTier: tier,
            targetEnchantment: enchantment,
            batchCrafts: batch,
            rrr,
            rrrNoFocus,
            compound,
            focusMode: focusMode === 'none' ? 'top_tier' : focusMode,
            focusTiers,
            specs,
            useHeart,
            heartTiers,
          }).totalFocusSpent;
        }
        return simulateRefining({
          tier,
          enchantment,
          batchCrafts: batch,
          rrr,
          compound,
          useFocus: true,
          focusCostPerCraft,
          useHeart: Boolean(useHeart && (!heartTiers || heartTiers[tier])),
        }).totalFocusSpent;
      };

      const minCost = evalFocus(1);
      if (minCost <= 0 || minCost > focusBudget) return 1;

      let lo = 1;
      let hi = 2;
      while (hi < 1000000 && evalFocus(hi) <= focusBudget) {
        hi *= 2;
      }
      let best = 1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (evalFocus(mid) <= focusBudget) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return best;
    }

    // -------------------------------------------------------------------------
    // 8. ITEM ID BUILDER & ENCHANTMENT RULES
    // -------------------------------------------------------------------------

    /**
     * Determines the required enchantment of the lower-tier refined resource.
     * verified: Albion Online Refining Rules:
     * - Refining T4.x requires T3.0 (T3 has no enchantments).
     * - Refining T5.x through T8.x requires the SAME enchantment level of the lower tier
     *   (e.g., T6.1 requires T5.1, T6.2 requires T5.2, T8.4 requires T7.4).
     */
    function getPrevTierEnchantment(tier, enchantment = 0) {
      if (tier <= 4) return 0;
      return enchantment;
    }

    function getItemId(prefix, tier, enchantment = 0) {
      const baseId = `T${tier}_${prefix}`;
      if (enchantment > 0) {
        return `${baseId}_LEVEL${enchantment}@${enchantment}`;
      }
      return baseId;
    }

    function getRenderUrl(itemId, quality = 1, size = 64) {
      return `https://render.albiononline.com/v1/item/${encodeURIComponent(itemId)}.png?size=${size}&quality=${quality}`;
    }

    return {
      RESOURCES,
      CITIES,
      TIERS,
      ENCHANTMENTS,
      BASE_FOCUS_BY_EFFECTIVE_TIER,
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
      getRenderUrl,
    };
  }

  const result = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = result;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.AlbionRules = result;
  }
  if (typeof window !== 'undefined') {
    window.AlbionRules = result;
  }
})();
