/**
 * albion_farming_rules.js
 * Verified Albion Online Island Farming Economic Rules & Profit Simulation Engine.
 *
 * Covers:
 * - Crops (T1 Carrot through T8 Pumpkin)
 * - Herbs (T2 Arcane Agaric through T8 Ghoul Yarrow)
 * - Pasture Farm Animals (T3 Chicken through T8 Cow) — Raise & Sell Grown OR Daily Eggs/Milk
 * - Wild Blood Royal City Island Biome +10% Yield Bonuses
 * - Exact Seed/Offspring Return Rates (Base vs Watered/Nurtured)
 * - Destiny Board Focus Efficiency (100 FCE/Mastery + 200 FCE/Spec -> 1,000 FP down to 125 FP)
 * - Market Sales Tax (4% Premium / 8% Non-Premium), Order Setup Fees (+2.5%), Direct Trade (0%), and NPC Seed Vendor Cap
 */

(function () {
  'use strict';

  function factory() {
    // -------------------------------------------------------------------------
    // 1. CONSTANTS & VERIFIED ALBION FARMING DATA
    // -------------------------------------------------------------------------

    const TILES_PER_PLOT = 9;
    const BASE_YIELD_PER_TILE = 4.5; // Average 4.5 items/tile without Premium; 9.0 with Premium
    const BASE_FOCUS_COST = 1000;    // Base Focus per watered tile / nurtured animal
    const ANIMAL_FEED_FAVORITE = 9;  // 9 favorite crops per 22h cycle (48 * 2 = 96 nut each)
    const ANIMAL_FEED_GENERIC = 18;  // 18 non-favorite crops per 22h cycle (48 nut each)

    const ISLAND_CITIES = [
      { id: 'Lymhurst', name: 'Lymhurst', biome: 'Forest' },
      { id: 'Bridgewatch', name: 'Bridgewatch', biome: 'Steppe' },
      { id: 'Martlock', name: 'Martlock', biome: 'Highlands' },
      { id: 'Fort Sterling', name: 'Fort Sterling', biome: 'Mountain' },
      { id: 'Thetford', name: 'Thetford', biome: 'Swamp' },
      { id: 'None', name: 'No Bonus', biome: 'Neutral' },
    ];

    const CATEGORIES = [
      { id: 'crops', name: 'Crops', masteryName: 'Crop Farmer', plotName: 'Farm Plot', color: '#facc15' },
      { id: 'herbs', name: 'Herbs', masteryName: 'Herbalist', plotName: 'Herb Garden', color: '#4ade80' },
      { id: 'animals', name: 'Animals', masteryName: 'Animal Breeder', plotName: 'Pasture', color: '#fb923c' },
    ];

    /**
     * Exact verified Albion Online Crop, Herb, and Farm Animal definitions.
     * Note: NPC seed/baby cost * (1 - baseReturn) === 2,000 silver across all tiers.
     * Watering/nurturing adds (1 - baseReturn) * 2 -> total return = 2 - baseReturn.
     */
    const ITEMS = [
      // --- CROPS ---
      {
        id: 'carrot', category: 'crops', tier: 1, name: 'Carrots', seedName: 'Carrot Seeds',
        seedId: 'T1_FARM_CARROT_SEED', productId: 'T1_CARROT', productName: 'Carrots',
        baseReturn: 0.0, wateredReturn: 2.0, npcSeedPrice: 2000, bonusCity: 'Lymhurst',
        defaultSeedPrice: 1950, defaultProductPrice: 380,
      },
      {
        id: 'bean', category: 'crops', tier: 2, name: 'Beans', seedName: 'Bean Seeds',
        seedId: 'T2_FARM_BEAN_SEED', productId: 'T2_BEAN', productName: 'Beans',
        baseReturn: 1 / 3, wateredReturn: 5 / 3, npcSeedPrice: 3000, bonusCity: 'Bridgewatch',
        defaultSeedPrice: 2950, defaultProductPrice: 390,
      },
      {
        id: 'wheat', category: 'crops', tier: 3, name: 'Wheat', seedName: 'Wheat Seeds',
        seedId: 'T3_FARM_WHEAT_SEED', productId: 'T3_WHEAT', productName: 'Sheaf of Wheat',
        baseReturn: 3 / 5, wateredReturn: 7 / 5, npcSeedPrice: 5000, bonusCity: 'Martlock',
        defaultSeedPrice: 4900, defaultProductPrice: 400,
      },
      {
        id: 'turnip', category: 'crops', tier: 4, name: 'Turnips', seedName: 'Turnip Seeds',
        seedId: 'T4_FARM_TURNIP_SEED', productId: 'T4_TURNIP', productName: 'Turnips',
        baseReturn: 11 / 15, wateredReturn: 19 / 15, npcSeedPrice: 7500, bonusCity: 'Fort Sterling',
        defaultSeedPrice: 7400, defaultProductPrice: 410,
      },
      {
        id: 'cabbage', category: 'crops', tier: 5, name: 'Cabbage', seedName: 'Cabbage Seeds',
        seedId: 'T5_FARM_CABBAGE_SEED', productId: 'T5_CABBAGE', productName: 'Cabbage',
        baseReturn: 4 / 5, wateredReturn: 6 / 5, npcSeedPrice: 10000, bonusCity: 'Thetford',
        defaultSeedPrice: 9800, defaultProductPrice: 420,
      },
      {
        id: 'potato', category: 'crops', tier: 6, name: 'Potatoes', seedName: 'Potato Seeds',
        seedId: 'T6_FARM_POTATO_SEED', productId: 'T6_POTATO', productName: 'Potatoes',
        baseReturn: 13 / 15, wateredReturn: 17 / 15, npcSeedPrice: 15000, bonusCity: 'Martlock',
        defaultSeedPrice: 14800, defaultProductPrice: 430,
      },
      {
        id: 'corn', category: 'crops', tier: 7, name: 'Corn', seedName: 'Corn Seeds',
        seedId: 'T7_FARM_CORN_SEED', productId: 'T7_CORN', productName: 'Bundle of Corn',
        baseReturn: 41 / 45, wateredReturn: 49 / 45, npcSeedPrice: 22500, bonusCity: 'Bridgewatch',
        defaultSeedPrice: 22000, defaultProductPrice: 440,
      },
      {
        id: 'pumpkin', category: 'crops', tier: 8, name: 'Pumpkins', seedName: 'Pumpkin Seeds',
        seedId: 'T8_FARM_PUMPKIN_SEED', productId: 'T8_PUMPKIN', productName: 'Pumpkin',
        baseReturn: 14 / 15, wateredReturn: 16 / 15, npcSeedPrice: 30000, bonusCity: 'Lymhurst',
        defaultSeedPrice: 29500, defaultProductPrice: 460,
      },

      // --- HERBS ---
      {
        id: 'agaric', category: 'herbs', tier: 2, name: 'Arcane Agaric', seedName: 'Arcane Agaric Seed',
        seedId: 'T2_FARM_AGARIC_SEED', productId: 'T2_AGARIC', productName: 'Arcane Agaric',
        baseReturn: 1 / 3, wateredReturn: 5 / 3, npcSeedPrice: 3000, bonusCity: 'Thetford',
        defaultSeedPrice: 2950, defaultProductPrice: 420,
      },
      {
        id: 'comfrey', category: 'herbs', tier: 3, name: 'Brightleaf Comfrey', seedName: 'Brightleaf Comfrey Seed',
        seedId: 'T3_FARM_COMFREY_SEED', productId: 'T3_COMFREY', productName: 'Brightleaf Comfrey',
        baseReturn: 3 / 5, wateredReturn: 7 / 5, npcSeedPrice: 5000, bonusCity: null,
        defaultSeedPrice: 4900, defaultProductPrice: 430,
      },
      {
        id: 'burdock', category: 'herbs', tier: 4, name: 'Crenellated Burdock', seedName: 'Crenellated Burdock Seed',
        seedId: 'T4_FARM_BURDOCK_SEED', productId: 'T4_BURDOCK', productName: 'Crenellated Burdock',
        baseReturn: 11 / 15, wateredReturn: 19 / 15, npcSeedPrice: 7500, bonusCity: 'Lymhurst',
        defaultSeedPrice: 7400, defaultProductPrice: 440,
      },
      {
        id: 'teasel', category: 'herbs', tier: 5, name: 'Dragon Teasel', seedName: 'Dragon Teasel Seed',
        seedId: 'T5_FARM_TEASEL_SEED', productId: 'T5_TEASEL', productName: 'Dragon Teasel',
        baseReturn: 4 / 5, wateredReturn: 6 / 5, npcSeedPrice: 10000, bonusCity: 'Bridgewatch',
        defaultSeedPrice: 9800, defaultProductPrice: 450,
      },
      {
        id: 'foxglove', category: 'herbs', tier: 6, name: 'Elusive Foxglove', seedName: 'Elusive Foxglove Seed',
        seedId: 'T6_FARM_FOXGLOVE_SEED', productId: 'T6_FOXGLOVE', productName: 'Elusive Foxglove',
        baseReturn: 13 / 15, wateredReturn: 17 / 15, npcSeedPrice: 15000, bonusCity: 'Martlock',
        defaultSeedPrice: 14800, defaultProductPrice: 465,
      },
      {
        id: 'mullein', category: 'herbs', tier: 7, name: 'Firetouched Mullein', seedName: 'Firetouched Mullein Seed',
        seedId: 'T7_FARM_MULLEIN_SEED', productId: 'T7_MULLEIN', productName: 'Firetouched Mullein',
        baseReturn: 41 / 45, wateredReturn: 49 / 45, npcSeedPrice: 22500, bonusCity: 'Thetford',
        defaultSeedPrice: 22000, defaultProductPrice: 480,
      },
      {
        id: 'yarrow', category: 'herbs', tier: 8, name: 'Ghoul Yarrow', seedName: 'Ghoul Yarrow Seed',
        seedId: 'T8_FARM_YARROW_SEED', productId: 'T8_YARROW', productName: 'Ghoul Yarrow',
        baseReturn: 14 / 15, wateredReturn: 16 / 15, npcSeedPrice: 30000, bonusCity: 'Fort Sterling',
        defaultSeedPrice: 29500, defaultProductPrice: 510,
      },

      // --- PASTURE ANIMALS ---
      {
        id: 'chicken', category: 'animals', tier: 3, name: 'Chickens', seedName: 'Baby Chickens',
        seedId: 'T3_FARM_CHICKEN_BABY', grownId: 'T3_FARM_CHICKEN_GROWN', grownName: 'Chicken',
        productId: 'T3_EGG', productName: 'Hen Eggs', favoriteFoodId: 'T3_WHEAT', favoriteFoodName: 'Wheat',
        baseReturn: 3 / 5, wateredReturn: 7 / 5, npcSeedPrice: 5000, bonusCity: 'Fort Sterling',
        defaultSeedPrice: 4900, defaultGrownPrice: 6800, defaultProductPrice: 520, defaultFeedPrice: 400,
      },
      {
        id: 'goat', category: 'animals', tier: 4, name: 'Goats', seedName: 'Kid',
        seedId: 'T4_FARM_GOAT_BABY', grownId: 'T4_FARM_GOAT_GROWN', grownName: 'Goat',
        productId: 'T4_MILK', productName: "Goat's Milk", favoriteFoodId: 'T4_TURNIP', favoriteFoodName: 'Turnips',
        baseReturn: 11 / 15, wateredReturn: 19 / 15, npcSeedPrice: 7500, bonusCity: 'Bridgewatch',
        defaultSeedPrice: 7400, defaultGrownPrice: 7200, defaultProductPrice: 560, defaultFeedPrice: 410,
      },
      {
        id: 'goose', category: 'animals', tier: 5, name: 'Geese', seedName: 'Gosling',
        seedId: 'T5_FARM_GOOSE_BABY', grownId: 'T5_FARM_GOOSE_GROWN', grownName: 'Goose',
        productId: 'T5_EGG', productName: 'Goose Eggs', favoriteFoodId: 'T5_CABBAGE', favoriteFoodName: 'Cabbage',
        baseReturn: 4 / 5, wateredReturn: 6 / 5, npcSeedPrice: 10000, bonusCity: 'Lymhurst',
        defaultSeedPrice: 9800, defaultGrownPrice: 7600, defaultProductPrice: 600, defaultFeedPrice: 420,
      },
      {
        id: 'sheep', category: 'animals', tier: 6, name: 'Sheep', seedName: 'Lamb',
        seedId: 'T6_FARM_SHEEP_BABY', grownId: 'T6_FARM_SHEEP_GROWN', grownName: 'Sheep',
        productId: 'T6_MILK', productName: "Sheep's Milk", favoriteFoodId: 'T6_POTATO', favoriteFoodName: 'Potatoes',
        baseReturn: 13 / 15, wateredReturn: 17 / 15, npcSeedPrice: 15000, bonusCity: 'Fort Sterling',
        defaultSeedPrice: 14800, defaultGrownPrice: 8200, defaultProductPrice: 640, defaultFeedPrice: 430,
      },
      {
        id: 'pig', category: 'animals', tier: 7, name: 'Pigs', seedName: 'Piglet',
        seedId: 'T7_FARM_PIG_BABY', grownId: 'T7_FARM_PIG_GROWN', grownName: 'Pig',
        productId: null, productName: null, favoriteFoodId: 'T7_CORN', favoriteFoodName: 'Corn',
        baseReturn: 41 / 45, wateredReturn: 49 / 45, npcSeedPrice: 22500, bonusCity: 'Thetford',
        defaultSeedPrice: 22000, defaultGrownPrice: 9200, defaultProductPrice: 0, defaultFeedPrice: 440,
      },
      {
        id: 'cow', category: 'animals', tier: 8, name: 'Cows', seedName: 'Calf',
        seedId: 'T8_FARM_COW_BABY', grownId: 'T8_FARM_COW_GROWN', grownName: 'Cow',
        productId: 'T8_MILK', productName: "Cow's Milk", favoriteFoodId: 'T8_PUMPKIN', favoriteFoodName: 'Pumpkins',
        baseReturn: 14 / 15, wateredReturn: 16 / 15, npcSeedPrice: 30000, bonusCity: 'Martlock',
        defaultSeedPrice: 29500, defaultGrownPrice: 10500, defaultProductPrice: 720, defaultFeedPrice: 460,
      },
    ];

    // -------------------------------------------------------------------------
    // 2. FOCUS COST, YIELD, AND MARKET FEES
    // -------------------------------------------------------------------------

    /**
     * Farming Focus Cost Efficiency formula:
     * FCE = (masteryLevel * 100) + (itemSpecLevel * 200) -> max 30,000 FCE
     * Focus Cost = round(1000 * 0.5 ^ (FCE / 10000)) -> 1,000 FP at 0/0 down to 125 FP at 100/100
     */
    function calculateFarmingFocusCost({ mastery = 100, spec = 100 }) {
      const m = Math.min(Math.max(Number(mastery) || 0, 0), 100);
      const s = Math.min(Math.max(Number(spec) || 0, 0), 100);
      const fce = m * 100 + s * 200;
      return Math.round(BASE_FOCUS_COST * Math.pow(0.5, fce / 10000));
    }

    /**
     * Yield per tile for crops, herbs, or animal produce (eggs/milk):
     * - Base: 4.5 items/tile
     * - Premium: x2.0 -> 9.0 items/tile
     * - Matching Island City Biome Bonus: x1.10 (+10%) -> 9.9 items/tile with Premium (4.95 without)
     */
    function calculateYieldPerTile({ item, cityId, hasPremium = true }) {
      const base = BASE_YIELD_PER_TILE * (hasPremium ? 2.0 : 1.0);
      const hasBonus = Boolean(item && item.bonusCity && cityId === item.bonusCity);
      return hasBonus ? base * 1.10 : base;
    }

    function getMarketFeeRate({ hasPremium = true, orderType = 'sell_order', directTrade = false }) {
      if (directTrade || orderType === 'direct_trade') return 0.0;
      const baseTax = hasPremium ? 0.04 : 0.08;
      const setupFee = orderType === 'sell_order' ? 0.025 : 0.0;
      return baseTax + setupFee;
    }

    function getBuyFeeRate({ buyOrderType = 'instant_buy' }) {
      return buyOrderType === 'buy_order' ? 0.025 : 0.0;
    }

    // -------------------------------------------------------------------------
    // 3. FARMING CYCLE PROFIT SIMULATION
    // -------------------------------------------------------------------------

    /**
     * Simulates one full 22h harvest cycle (or 44h non-Premium animal growth).
     *
     * Supports:
     * - Crops & Herbs: plant `totalTiles` seeds, water `wateredTiles` with Focus, harvest produce + settle net seed deficit/surplus.
     * - Animals (`animalMode === 'grown'`): raise `totalTiles` babies, feed `9` favorite (or `18` generic) crops each,
     *   nurture `wateredTiles` with Focus, sell grown animals + settle net baby deficit/surplus.
     * - Animals (`animalMode === 'produce'`): keep grown animals alive, feed daily crops, harvest eggs/milk every 22h (no baby replacement or nurturing).
     */
    function simulateFarming({
      itemId,
      plots = 5,
      extraTiles = 0,
      cityId = 'Lymhurst',
      hasPremium = true,
      wateredTiles = null,      // explicit integer 0..totalTiles; if null, uses waterMode
      waterMode = 'all',        // 'all' | 'self_sustain' | 'none'
      mastery = 100,
      spec = 100,
      seedPrice = 2000,
      productPrice = 380,
      grownPrice = 0,
      feedPrice = 400,
      useNpcCap = true,         // if true, buys replacement seeds from NPC merchant when cheaper than market + buy fee
      animalMode = 'grown',     // 'grown' | 'produce' (only for category === 'animals')
      useFavoriteFood = true,   // true -> 9 crops/animal; false -> 18 crops/animal
      marketFeeRate = 0.065,
      buyFeeRate = 0.025,
    }) {
      const item = ITEMS.find((i) => i.id === itemId) || ITEMS[0];
      const safePlots = Math.max(0, Math.floor(Number(plots) || 0));
      const safeExtra = Math.max(0, Math.floor(Number(extraTiles) || 0));
      const totalTiles = Math.max(1, safePlots * TILES_PER_PLOT + safeExtra);

      const isAnimal = item.category === 'animals';
      const effectiveAnimalMode = isAnimal && animalMode === 'produce' && item.productId ? 'produce' : 'grown';
      const canUseFocus = !(isAnimal && effectiveAnimalMode === 'produce');

      // Determine watered/nurtured tile count
      let activeWatered = 0;
      if (canUseFocus) {
        if (wateredTiles !== null && wateredTiles !== undefined) {
          activeWatered = Math.min(Math.max(Math.floor(Number(wateredTiles) || 0), 0), totalTiles);
        } else if (waterMode === 'all') {
          activeWatered = totalTiles;
        } else if (waterMode === 'self_sustain') {
          // Since wateredReturn - 1 === 1 - baseReturn, watering 50% of tiles balances net seeds to ~0
          activeWatered = Math.ceil(totalTiles / 2);
        } else {
          activeWatered = 0;
        }
      }
      const unwateredTiles = totalTiles - activeWatered;

      const focusCostPerTile = calculateFarmingFocusCost({ mastery, spec });
      const totalFocusSpent = activeWatered * focusCostPerTile;

      // Seed / Baby replacement & surplus
      const hasBiomeBonus = Boolean(item.bonusCity && cityId === item.bonusCity);
      const yieldPerTile = calculateYieldPerTile({ item, cityId, hasPremium });

      let expectedSeedsReturned = 0;
      let seedDeficit = 0;
      let seedSurplus = 0;
      let effectiveSeedBuyPrice = Math.max(0, Number(seedPrice) || 0);
      let boughtFromNpc = false;
      let seedBuyCost = 0;
      let seedBuyFee = 0;
      let seedSurplusGross = 0;
      let seedSurplusTax = 0;

      if (!(isAnimal && effectiveAnimalMode === 'produce')) {
        expectedSeedsReturned = activeWatered * item.wateredReturn + unwateredTiles * item.baseReturn;
        const netSeeds = expectedSeedsReturned - totalTiles;

        if (netSeeds < -1e-9) {
          seedDeficit = -netSeeds;
          const marketUnitEffective = effectiveSeedBuyPrice * (1 + buyFeeRate);
          if (useNpcCap && item.npcSeedPrice > 0 && item.npcSeedPrice < marketUnitEffective) {
            effectiveSeedBuyPrice = item.npcSeedPrice;
            boughtFromNpc = true;
            seedBuyCost = seedDeficit * item.npcSeedPrice;
            seedBuyFee = 0; // NPC vendor charges no Market buy-order setup fee
          } else {
            seedBuyCost = seedDeficit * effectiveSeedBuyPrice;
            seedBuyFee = seedBuyCost * buyFeeRate;
          }
        } else if (netSeeds > 1e-9) {
          seedSurplus = netSeeds;
          seedSurplusGross = seedSurplus * Math.max(0, Number(seedPrice) || 0);
          seedSurplusTax = seedSurplusGross * marketFeeRate;
        }
      }

      // Animal feed cost
      let feedUnitsPerTile = 0;
      let totalFeedUnits = 0;
      let feedCost = 0;
      let feedBuyFee = 0;
      if (isAnimal) {
        feedUnitsPerTile = useFavoriteFood ? ANIMAL_FEED_FAVORITE : ANIMAL_FEED_GENERIC;
        totalFeedUnits = totalTiles * feedUnitsPerTile;
        feedCost = totalFeedUnits * Math.max(0, Number(feedPrice) || 0);
        feedBuyFee = feedCost * buyFeeRate;
      }

      // Primary harvest output & revenue
      let totalHarvest = 0;
      let unitSellPrice = 0;
      if (isAnimal && effectiveAnimalMode === 'grown') {
        totalHarvest = totalTiles;
        unitSellPrice = Math.max(0, Number(grownPrice) || 0);
      } else {
        totalHarvest = totalTiles * yieldPerTile;
        unitSellPrice = Math.max(0, Number(productPrice) || 0);
      }

      const harvestGrossRevenue = totalHarvest * unitSellPrice;
      const harvestTax = harvestGrossRevenue * marketFeeRate;

      const totalBuyFees = seedBuyFee + feedBuyFee;
      const totalExpense = seedBuyCost + feedCost + totalBuyFees;
      const grossRevenue = harvestGrossRevenue + seedSurplusGross;
      const totalMarketTax = harvestTax + seedSurplusTax;
      const netRevenue = grossRevenue - totalMarketTax;
      const netProfit = netRevenue - totalExpense;

      const profitPerPlot = (netProfit / totalTiles) * TILES_PER_PLOT;
      const profitPerTile = netProfit / totalTiles;
      const profitMargin = totalExpense > 0 ? (netProfit / totalExpense) * 100 : (netProfit > 0 ? 100 : 0);

      // Focus efficiency metrics:
      // 1) Overall S/FP (total netProfit / totalFocusSpent)
      // 2) Marginal Watering S/FP (exact extra silver gained per Focus spent watering vs 0 watered tiles)
      const silverPerFocus = totalFocusSpent > 0 ? netProfit / totalFocusSpent : null;

      let marginalSilverPerFocus = null;
      if (totalFocusSpent > 0) {
        const unwateredProfit =
          (harvestGrossRevenue - harvestTax) -
          (feedCost + feedBuyFee) -
          (() => {
            const unwateredDeficit = totalTiles * (1 - item.baseReturn);
            const mktUnit = Math.max(0, Number(seedPrice) || 0) * (1 + buyFeeRate);
            const unitCost = (useNpcCap && item.npcSeedPrice > 0 && item.npcSeedPrice < mktUnit)
              ? item.npcSeedPrice
              : mktUnit;
            return unwateredDeficit * unitCost;
          })();
        marginalSilverPerFocus = (netProfit - unwateredProfit) / totalFocusSpent;
      }

      // Break-even unit sell price for primary harvest output
      const netCostAfterSeedSurplus = totalExpense - (seedSurplusGross - seedSurplusTax);
      const breakEvenPrice =
        totalHarvest > 0 && 1 - marketFeeRate > 0
          ? netCostAfterSeedSurplus / ((1 - marketFeeRate) * totalHarvest)
          : 0;

      const growthHours = isAnimal && effectiveAnimalMode === 'grown'
        ? (hasPremium ? 22 : 44)
        : 22;

      return {
        item,
        totalTiles,
        plots: totalTiles / TILES_PER_PLOT,
        wateredTiles: activeWatered,
        unwateredTiles,
        hasBiomeBonus,
        yieldPerTile,
        effectiveAnimalMode,
        growthHours,
        focusCostPerTile,
        totalFocusSpent,
        expectedSeedsReturned,
        seedDeficit,
        seedSurplus,
        effectiveSeedBuyPrice,
        boughtFromNpc,
        seedBuyCost,
        seedBuyFee,
        seedSurplusGross,
        seedSurplusTax,
        feedUnitsPerTile,
        totalFeedUnits,
        feedCost,
        feedBuyFee,
        totalBuyFees,
        totalExpense,
        totalHarvest,
        unitSellPrice,
        harvestGrossRevenue,
        harvestTax,
        grossRevenue,
        totalMarketTax,
        netRevenue,
        netProfit,
        profitPerPlot,
        profitPerTile,
        profitMargin,
        silverPerFocus,
        marginalSilverPerFocus,
        breakEvenPrice: Math.ceil(Math.max(0, breakEvenPrice)),
      };
    }

    /**
     * Calculates how many tiles can be watered/nurtured within a Focus budget (10k / 20k / 30k FP).
     */
    function fitTilesToFocus({ focusBudget, mastery = 100, spec = 100 }) {
      const costPerTile = calculateFarmingFocusCost({ mastery, spec });
      if (costPerTile <= 0 || focusBudget <= 0) return 0;
      return Math.floor(focusBudget / costPerTile);
    }

    function getRenderUrl(itemId, quality = 1, size = 64) {
      return `https://render.albiononline.com/v1/item/${encodeURIComponent(itemId)}.png?size=${size}&quality=${quality}`;
    }

    return {
      TILES_PER_PLOT,
      BASE_YIELD_PER_TILE,
      BASE_FOCUS_COST,
      ANIMAL_FEED_FAVORITE,
      ANIMAL_FEED_GENERIC,
      ISLAND_CITIES,
      CATEGORIES,
      ITEMS,
      calculateFarmingFocusCost,
      calculateYieldPerTile,
      getMarketFeeRate,
      getBuyFeeRate,
      simulateFarming,
      fitTilesToFocus,
      getRenderUrl,
    };
  }

  const AlbionFarmingRules = factory();
  if (typeof window !== 'undefined') window.AlbionFarmingRules = AlbionFarmingRules;
  if (typeof globalThis !== 'undefined') globalThis.AlbionFarmingRules = AlbionFarmingRules;
})();
