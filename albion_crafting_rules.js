/**
 * albion_crafting_rules.js
 * Verified Albion Online Equipment & Accessories Crafting Economic Rules & Profit Engine.
 *
 * Covers:
 * - 4 Crafting Stations (Warrior Forge, Hunter Lodge, Mage Tower, Toolmaker)
 * - 31 Equipment Trees (Swords, Axes, Maces, Hammers, Crossbows, War Gloves, Bows, Spears,
 *   Daggers, Quarterstaffs, Nature Staffs, Fire Staffs, Frost Staffs, Cursed Staffs,
 *   Holy Staffs, Arcane Staffs, Plate/Leather/Cloth Helmets/Armors/Boots, Shields, Torches,
 *   Tomes, Bags, Capes, Gathering Tools) with all non-artifact and artifact items (215+ items)
 * - Exact Albion Online Equipment Crafting Resource Return Rate (RRR = LPB / (1 + LPB)):
 *   - Royal Cities / Caerleon / Brecilien Base LPB: +18% (15.25% RRR)
 *   - City Crafting Specialty Bonus LPB: +15% (24.81% RRR without Focus, 47.92% RRR with Focus)
 *   - Outlands Hideout Crafting LPB:
 *     - Zone Quality (Q1–Q6): +1%, +6%, +11%, +16%, +21%, +26%
 *     - Hideout Power Level (Lvl 1–9 General): 0%, +6%, +11%, +15%, +18%, +20%, +22%, +24%, +26%
 *     - Hideout Power Level (Lvl 1–9 Biome Specialty): 0% up to +30% (+3.75% per level from Lvl 2 to 9)
 *   - Island: 0% without Focus, 37.11% with Focus
 *   - Daily Crafting Bonus Event: +10% or +20% LPB
 * - Artifact & Journal Invariant:
 *   - Artifacts (1 per craft) are NEVER affected by Return Rate (0% RRR — consumed on every craft)
 *   - Crafting Journals are NEVER affected by Return Rate (0% RRR — filled by base material fame)
 */

(function () {
  'use strict';

  function factory() {
    // -------------------------------------------------------------------------
    // 1. CONSTANTS, CITIES, HIDEOUT TABLES, MATERIALS, CATEGORIES & TREES
    // -------------------------------------------------------------------------

    const CRAFTING_CITIES = [
      { id: 'Thetford', name: 'Thetford', baseLPB: 0.18 },
      { id: 'Fort Sterling', name: 'Fort Sterling', baseLPB: 0.18 },
      { id: 'Lymhurst', name: 'Lymhurst', baseLPB: 0.18 },
      { id: 'Bridgewatch', name: 'Bridgewatch', baseLPB: 0.18 },
      { id: 'Martlock', name: 'Martlock', baseLPB: 0.18 },
      { id: 'Caerleon', name: 'Caerleon', baseLPB: 0.18 },
      { id: 'Brecilien', name: 'Brecilien', baseLPB: 0.18 },
      { id: 'Hideout', name: 'Hideout', baseLPB: 0.00 },
      { id: 'Island', name: 'Island', baseLPB: 0.00 },
      { id: 'Custom', name: 'Custom Return Rate', baseLPB: 0.00 },
    ];

    const CITY_SPECIALTY_LPB = 0.15; // +15% LPB in matching Royal/Outland city
    const FOCUS_BONUS_LPB = 0.59;    // +59% LPB when using Focus

    /**
     * Outlands Zone Quality (Q1 to Q6) global crafting LPB bonus.
     */
    const HIDEOUT_ZONE_QUALITY_LPB = {
      1: 0.01,
      2: 0.06,
      3: 0.11,
      4: 0.16,
      5: 0.21,
      6: 0.26,
    };

    /**
     * Outlands Hideout Power Level (1 to 9) general crafting LPB bonus (applies to all items).
     */
    const HIDEOUT_POWER_GENERAL_LPB = {
      1: 0.00,
      2: 0.06,
      3: 0.11,
      4: 0.15,
      5: 0.18,
      6: 0.20,
      7: 0.22,
      8: 0.24,
      9: 0.26,
    };

    /**
     * Outlands Hideout Power Level (1 to 9) biome specialty LPB bonus (3.75% per level from Lvl 2 to 9).
     */
    const HIDEOUT_POWER_SPECIALTY_LPB = {
      1: 0.00,
      2: 0.0375,
      3: 0.075,
      4: 0.1125,
      5: 0.15,
      6: 0.1875,
      7: 0.225,
      8: 0.2625,
      9: 0.30,
    };

    const MATERIALS = {
      METALBAR: { id: 'METALBAR', name: 'Metal Bar', plural: 'Metal Bars' },
      PLANKS: { id: 'PLANKS', name: 'Planks', plural: 'Planks' },
      LEATHER: { id: 'LEATHER', name: 'Leather', plural: 'Leather' },
      CLOTH: { id: 'CLOTH', name: 'Cloth', plural: 'Cloth' },
    };

    const CATEGORIES = [
      {
        id: 'warrior',
        name: 'Warrior Forge',
        shortName: 'Warrior',
        journalPrefix: 'JOURNAL_WARRIOR',
        journalName: "Blacksmith's Journal",
        color: '#f87171',
      },
      {
        id: 'hunter',
        name: 'Hunter Lodge',
        shortName: 'Hunter',
        journalPrefix: 'JOURNAL_HUNTER',
        journalName: "Fletcher's Journal",
        color: '#4ade80',
      },
      {
        id: 'mage',
        name: 'Mage Tower',
        shortName: 'Mage',
        journalPrefix: 'JOURNAL_MAGE',
        journalName: "Imbuer's Journal",
        color: '#60a5fa',
      },
      {
        id: 'toolmaker',
        name: 'Toolmaker',
        shortName: 'Accessories & Tools',
        journalPrefix: 'JOURNAL_TOOLMAKER',
        journalName: "Tinker's Journal",
        color: '#facc15',
      },
    ];

    /**
     * Equipment & Accessory Trees grouped under the 4 Crafting Stations.
     */
    const TREES = [
      // Warrior Forge
      { id: 'swords', category: 'warrior', name: 'Swords', bonusCity: 'Lymhurst', iconCode: 'MAIN_SWORD' },
      { id: 'axes', category: 'warrior', name: 'Axes', bonusCity: 'Martlock', iconCode: 'MAIN_AXE' },
      { id: 'maces', category: 'warrior', name: 'Maces', bonusCity: 'Thetford', iconCode: 'MAIN_MACE' },
      { id: 'hammers', category: 'warrior', name: 'Hammers', bonusCity: 'Fort Sterling', iconCode: '2H_HAMMER' },
      { id: 'crossbows', category: 'warrior', name: 'Crossbows', bonusCity: 'Bridgewatch', iconCode: '2H_CROSSBOW' },
      { id: 'wargloves', category: 'warrior', name: 'War Gloves', bonusCity: 'Caerleon', iconCode: '2H_KNUCKLES_SET1' },
      { id: 'plate_helmets', category: 'warrior', name: 'Plate Helmets', bonusCity: 'Fort Sterling', iconCode: 'HEAD_PLATE_SET1' },
      { id: 'plate_armors', category: 'warrior', name: 'Plate Armors', bonusCity: 'Bridgewatch', iconCode: 'ARMOR_PLATE_SET1' },
      { id: 'plate_boots', category: 'warrior', name: 'Plate Boots', bonusCity: 'Martlock', iconCode: 'SHOES_PLATE_SET1' },
      { id: 'shields', category: 'warrior', name: 'Shields', bonusCity: 'Martlock', iconCode: 'OFF_SHIELD' },

      // Hunter Lodge
      { id: 'bows', category: 'hunter', name: 'Bows', bonusCity: 'Lymhurst', iconCode: '2H_BOW' },
      { id: 'spears', category: 'hunter', name: 'Spears', bonusCity: 'Fort Sterling', iconCode: 'MAIN_SPEAR' },
      { id: 'daggers', category: 'hunter', name: 'Daggers', bonusCity: 'Bridgewatch', iconCode: 'MAIN_DAGGER' },
      { id: 'quarterstaffs', category: 'hunter', name: 'Quarterstaffs', bonusCity: 'Martlock', iconCode: '2H_QUARTERSTAFF' },
      { id: 'naturestaffs', category: 'hunter', name: 'Nature Staffs', bonusCity: 'Thetford', iconCode: 'MAIN_NATURESTAFF' },
      { id: 'leather_hoods', category: 'hunter', name: 'Leather Hoods', bonusCity: 'Lymhurst', iconCode: 'HEAD_LEATHER_SET1' },
      { id: 'leather_jackets', category: 'hunter', name: 'Leather Jackets', bonusCity: 'Thetford', iconCode: 'ARMOR_LEATHER_SET1' },
      { id: 'leather_shoes', category: 'hunter', name: 'Leather Shoes', bonusCity: 'Lymhurst', iconCode: 'SHOES_LEATHER_SET1' },
      { id: 'torches', category: 'hunter', name: 'Torches', bonusCity: 'Martlock', iconCode: 'OFF_TORCH' },

      // Mage Tower
      { id: 'firestaffs', category: 'mage', name: 'Fire Staffs', bonusCity: 'Thetford', iconCode: 'MAIN_FIRESTAFF' },
      { id: 'froststaffs', category: 'mage', name: 'Frost Staffs', bonusCity: 'Martlock', iconCode: 'MAIN_FROSTSTAFF' },
      { id: 'cursedstaffs', category: 'mage', name: 'Cursed Staffs', bonusCity: 'Bridgewatch', iconCode: 'MAIN_CURSEDSTAFF' },
      { id: 'holystaffs', category: 'mage', name: 'Holy Staffs', bonusCity: 'Fort Sterling', iconCode: 'MAIN_HOLYSTAFF' },
      { id: 'arcanestaffs', category: 'mage', name: 'Arcane Staffs', bonusCity: 'Lymhurst', iconCode: 'MAIN_ARCANESTAFF' },
      { id: 'cloth_cowls', category: 'mage', name: 'Cloth Cowls', bonusCity: 'Thetford', iconCode: 'HEAD_CLOTH_SET1' },
      { id: 'cloth_robes', category: 'mage', name: 'Cloth Robes', bonusCity: 'Fort Sterling', iconCode: 'ARMOR_CLOTH_SET1' },
      { id: 'cloth_sandals', category: 'mage', name: 'Cloth Sandals', bonusCity: 'Bridgewatch', iconCode: 'SHOES_CLOTH_SET1' },
      { id: 'tomes', category: 'mage', name: 'Tomes & Orbs', bonusCity: 'Martlock', iconCode: 'OFF_BOOK' },

      // Toolmaker
      { id: 'bags', category: 'toolmaker', name: 'Bags', bonusCity: 'Brecilien', iconCode: 'BAG' },
      { id: 'capes', category: 'toolmaker', name: 'Capes', bonusCity: 'Brecilien', iconCode: 'CAPE' },
      { id: 'tools', category: 'toolmaker', name: 'Gathering Tools', bonusCity: 'Caerleon', iconCode: '2H_TOOL_PICK' },
    ];

    const FAME_PER_MATERIAL_UNIT = {
      4: 22.5,
      5: 90,
      6: 270,
      7: 645,
      8: 1395,
    };

    const JOURNAL_FAME_REQUIRED = {
      4: 3600,
      5: 7200,
      6: 14400,
      7: 28380,
      8: 58590,
    };

    const BASE_FOCUS_PER_8_UNITS = {
      4: 429,
      5: 750,
      6: 1313,
      7: 2298,
      8: 4021,
      9: 7037,
      10: 12315,
      11: 21551,
      12: 37715,
    };

    /**
     * Compact builder for items in a tree.
     */
    function buildTreeItems(treeId, category, bonusCity, defs) {
      return defs.map((d) => ({
        id: d.id,
        treeId,
        category,
        name: d.name,
        code: d.code,
        primaryMat: d.pMat,
        primaryQty: d.pQty,
        secondaryMat: d.sMat || null,
        secondaryQty: d.sQty || 0,
        artifactCode: d.artCode || null,
        artifactName: d.artName || null,
        bonusCity,
        supportsEnchant: d.supportsEnchant !== false,
      }));
    }

    const ITEMS = [
      // ==================== WARRIOR FORGE ====================
      ...buildTreeItems('swords', 'warrior', 'Lymhurst', [
        { id: 'broadsword', name: 'Broadsword', code: 'MAIN_SWORD', pMat: 'METALBAR', pQty: 16, sMat: 'LEATHER', sQty: 8 },
        { id: 'claymore', name: 'Claymore', code: '2H_CLAYMORE', pMat: 'METALBAR', pQty: 20, sMat: 'LEATHER', sQty: 12 },
        { id: 'dualswords', name: 'Dual Swords', code: '2H_DUALSWORD', pMat: 'METALBAR', pQty: 20, sMat: 'LEATHER', sQty: 12 },
        { id: 'clarent', name: 'Clarent Blade', code: 'MAIN_SCIMITAR_MORGANA', pMat: 'METALBAR', pQty: 16, sMat: 'LEATHER', sQty: 8, artCode: 'ARTEFACT_MAIN_SCIMITAR_MORGANA', artName: 'Bloodforged Blade' },
        { id: 'carving', name: 'Carving Sword', code: '2H_CLEAVER_HELL', pMat: 'METALBAR', pQty: 20, sMat: 'LEATHER', sQty: 12, artCode: 'ARTEFACT_2H_CLEAVER_HELL', artName: 'Demonic Blade' },
        { id: 'galatine', name: 'Galatine Pair', code: '2H_DUALSCIMITAR_UNDEAD', pMat: 'METALBAR', pQty: 20, sMat: 'LEATHER', sQty: 12, artCode: 'ARTEFACT_2H_DUALSCIMITAR_UNDEAD', artName: 'Cursed Blades' },
        { id: 'kingmaker', name: 'Kingmaker', code: '2H_CLAYMORE_AVALON', pMat: 'METALBAR', pQty: 20, sMat: 'LEATHER', sQty: 12, artCode: 'ARTEFACT_2H_CLAYMORE_AVALON', artName: 'Remnants of the Old King' },
        { id: 'infinity_blade', name: 'Infinity Blade', code: 'MAIN_SWORD_CRYSTAL', pMat: 'METALBAR', pQty: 16, sMat: 'LEATHER', sQty: 8, artCode: 'ARTEFACT_MAIN_SWORD_CRYSTAL', artName: 'Infinite Crystal' },
      ]),

      ...buildTreeItems('axes', 'warrior', 'Martlock', [
        { id: 'battleaxe', name: 'Battleaxe', code: 'MAIN_AXE', pMat: 'METALBAR', pQty: 16, sMat: 'PLANKS', sQty: 8 },
        { id: 'greataxe', name: 'Greataxe', code: '2H_AXE', pMat: 'METALBAR', pQty: 20, sMat: 'PLANKS', sQty: 12 },
        { id: 'halberd', name: 'Halberd', code: '2H_HALBERD', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'carrioncaller', name: 'Carrioncaller', code: '2H_HALBERD_MORGANA', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_HALBERD_MORGANA', artName: 'Morgana Halberd Head' },
        { id: 'infernal_scythe', name: 'Infernal Scythe', code: '2H_SCYTHE_HELL', pMat: 'METALBAR', pQty: 20, sMat: 'PLANKS', sQty: 12, artCode: 'ARTEFACT_2H_SCYTHE_HELL', artName: 'Hellish Sicklehead' },
        { id: 'bear_paws', name: 'Bear Paws', code: '2H_DUALAXE_KEEPER', pMat: 'METALBAR', pQty: 20, sMat: 'PLANKS', sQty: 12, artCode: 'ARTEFACT_2H_DUALAXE_KEEPER', artName: 'Keeper Axeheads' },
        { id: 'realmbreaker', name: 'Realmbreaker', code: '2H_AXE_AVALON', pMat: 'METALBAR', pQty: 20, sMat: 'PLANKS', sQty: 12, artCode: 'ARTEFACT_2H_AXE_AVALON', artName: 'Avalonian Battle Memoir' },
        { id: 'crystal_reaper', name: 'Crystal Reaper', code: '2H_SCYTHE_CRYSTAL', pMat: 'METALBAR', pQty: 20, sMat: 'PLANKS', sQty: 12, artCode: 'ARTEFACT_2H_SCYTHE_CRYSTAL', artName: 'Edged Crystal' },
      ]),

      ...buildTreeItems('maces', 'warrior', 'Thetford', [
        { id: 'mace', name: 'Mace', code: 'MAIN_MACE', pMat: 'METALBAR', pQty: 16, sMat: 'CLOTH', sQty: 8 },
        { id: 'heavymace', name: 'Heavy Mace', code: '2H_MACE', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12 },
        { id: 'morningstar', name: 'Morning Star', code: '2H_FLAIL', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12 },
        { id: 'bedrock_mace', name: 'Bedrock Mace', code: 'MAIN_ROCKMACE_KEEPER', pMat: 'METALBAR', pQty: 16, sMat: 'CLOTH', sQty: 8, artCode: 'ARTEFACT_MAIN_ROCKMACE_KEEPER', artName: 'Runed Rock' },
        { id: 'incubus_mace', name: 'Incubus Mace', code: 'MAIN_MACE_HELL', pMat: 'METALBAR', pQty: 16, sMat: 'CLOTH', sQty: 8, artCode: 'ARTEFACT_MAIN_MACE_HELL', artName: 'Infernal Mace Head' },
        { id: 'camlann_mace', name: 'Camlann Mace', code: '2H_MACE_MORGANA', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_MACE_MORGANA', artName: 'Imbued Mace Head' },
        { id: 'oathkeepers', name: 'Oathkeepers', code: '2H_DUALMACE_AVALON', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_DUALMACE_AVALON', artName: 'Broken Oaths' },
        { id: 'dreadstorm_monarch', name: 'Dreadstorm Monarch', code: 'MAIN_MACE_CRYSTAL', pMat: 'METALBAR', pQty: 16, sMat: 'CLOTH', sQty: 8, artCode: 'ARTEFACT_MAIN_MACE_CRYSTAL', artName: 'Dreadstorm Crystal' },
      ]),

      ...buildTreeItems('hammers', 'warrior', 'Fort Sterling', [
        { id: 'hammer', name: 'Hammer', code: 'MAIN_HAMMER', pMat: 'METALBAR', pQty: 24 },
        { id: 'polehammer', name: 'Polehammer', code: '2H_POLEHAMMER', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12 },
        { id: 'greathammer', name: 'Great Hammer', code: '2H_HAMMER', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12 },
        { id: 'tombhammer', name: 'Tombhammer', code: '2H_HAMMER_UNDEAD', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_HAMMER_UNDEAD', artName: 'Ancient Hammer Head' },
        { id: 'forge_hammers', name: 'Forge Hammers', code: '2H_DUALHAMMER_HELL', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_DUALHAMMER_HELL', artName: 'Hellish Hammer Heads' },
        { id: 'grovekeeper', name: 'Grovekeeper', code: '2H_RAM_KEEPER', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_RAM_KEEPER', artName: 'Engraved Log' },
        { id: 'hand_of_justice', name: 'Hand of Justice', code: '2H_HAMMER_AVALON', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_HAMMER_AVALON', artName: 'Massive Metallic Hand' },
        { id: 'truebolt_hammer', name: 'Truebolt Hammer', code: '2H_HAMMER_CRYSTAL', pMat: 'METALBAR', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_HAMMER_CRYSTAL', artName: 'Crackling Crystal' },
      ]),

      ...buildTreeItems('crossbows', 'warrior', 'Bridgewatch', [
        { id: 'crossbow', name: 'Crossbow', code: '2H_CROSSBOW', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'heavy_crossbow', name: 'Heavy Crossbow', code: '2H_CROSSBOWLARGE', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'light_crossbow', name: 'Light Crossbow', code: 'MAIN_1HCROSSBOW', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8 },
        { id: 'weeping_repeater', name: 'Weeping Repeater', code: '2H_REPEATINGCROSSBOW_UNDEAD', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_REPEATINGCROSSBOW_UNDEAD', artName: 'Lost Crossbow Mechanism' },
        { id: 'boltcasters', name: 'Boltcasters', code: '2H_DUALCROSSBOW_HELL', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_DUALCROSSBOW_HELL', artName: 'Hellish Bolts' },
        { id: 'siegebow', name: 'Siegebow', code: '2H_CROSSBOWLARGE_MORGANA', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_CROSSBOWLARGE_MORGANA', artName: 'Alluring Bolts' },
        { id: 'energy_shaper', name: 'Energy Shaper', code: '2H_CROSSBOW_CANNON_AVALON', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_CROSSBOW_CANNON_AVALON', artName: 'Humming Avalonian Whirligig' },
        { id: 'arclight_blasters', name: 'Arclight Blasters', code: '2H_DUALCROSSBOW_CRYSTAL', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_DUALCROSSBOW_CRYSTAL', artName: 'Arclight Crystal' },
      ]),

      ...buildTreeItems('wargloves', 'warrior', 'Caerleon', [
        { id: 'brawler_gloves', name: 'Brawler Gloves', code: '2H_KNUCKLES_SET1', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'battle_bracers', name: 'Battle Bracers', code: '2H_KNUCKLES_SET2', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'spiked_gauntlets', name: 'Spiked Gauntlets', code: '2H_KNUCKLES_SET3', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'ursine_maulers', name: 'Ursine Maulers', code: '2H_KNUCKLES_KEEPER', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_KNUCKLES_KEEPER', artName: 'Ursine Guardian Remains' },
        { id: 'hellfire_hands', name: 'Hellfire Hands', code: '2H_KNUCKLES_HELL', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_KNUCKLES_HELL', artName: 'Severed Demonic Horns' },
        { id: 'ravenstrike_cestus', name: 'Ravenstrike Cestus', code: '2H_KNUCKLES_MORGANA', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_KNUCKLES_MORGANA', artName: 'Warped Raven Plate' },
        { id: 'fists_of_avalon', name: 'Fists of Avalon', code: '2H_KNUCKLES_AVALON', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_KNUCKLES_AVALON', artName: 'Damaged Avalonian Gauntlet' },
        { id: 'forcepulse_bracers', name: 'Forcepulse Bracers', code: '2H_KNUCKLES_CRYSTAL', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_KNUCKLES_CRYSTAL', artName: 'Pulsating Crystal' },
      ]),

      ...buildTreeItems('plate_helmets', 'warrior', 'Fort Sterling', [
        { id: 'plate_helmet', name: 'Soldier Helmet', code: 'HEAD_PLATE_SET1', pMat: 'METALBAR', pQty: 8 },
        { id: 'knight_helmet', name: 'Knight Helmet', code: 'HEAD_PLATE_SET2', pMat: 'METALBAR', pQty: 8 },
        { id: 'guardian_helmet', name: 'Guardian Helmet', code: 'HEAD_PLATE_SET3', pMat: 'METALBAR', pQty: 8 },
        { id: 'graveguard_helmet', name: 'Graveguard Helmet', code: 'HEAD_PLATE_UNDEAD', pMat: 'METALBAR', pQty: 8, artCode: 'ARTEFACT_HEAD_PLATE_UNDEAD', artName: 'Ancient Padding' },
        { id: 'demon_helmet', name: 'Demon Helmet', code: 'HEAD_PLATE_HELL', pMat: 'METALBAR', pQty: 8, artCode: 'ARTEFACT_HEAD_PLATE_HELL', artName: 'Demonic Scraps' },
        { id: 'judicator_helmet', name: 'Judicator Helmet', code: 'HEAD_PLATE_KEEPER', pMat: 'METALBAR', pQty: 8, artCode: 'ARTEFACT_HEAD_PLATE_KEEPER', artName: 'Carved Skull Padding' },
        { id: 'duskweaver_helmet', name: 'Duskweaver Helmet', code: 'HEAD_PLATE_FEY', pMat: 'METALBAR', pQty: 8, artCode: 'ARTEFACT_HEAD_PLATE_FEY', artName: 'Veilweaver Mandibles' },
        { id: 'helmet_of_valor', name: 'Helmet of Valor', code: 'HEAD_PLATE_AVALON', pMat: 'METALBAR', pQty: 8, artCode: 'ARTEFACT_HEAD_PLATE_AVALON', artName: 'Exalted Visor' },
      ]),

      ...buildTreeItems('plate_armors', 'warrior', 'Bridgewatch', [
        { id: 'plate_armor', name: 'Soldier Armor', code: 'ARMOR_PLATE_SET1', pMat: 'METALBAR', pQty: 16 },
        { id: 'knight_armor', name: 'Knight Armor', code: 'ARMOR_PLATE_SET2', pMat: 'METALBAR', pQty: 16 },
        { id: 'guardian_armor', name: 'Guardian Armor', code: 'ARMOR_PLATE_SET3', pMat: 'METALBAR', pQty: 16 },
        { id: 'graveguard_armor', name: 'Graveguard Armor', code: 'ARMOR_PLATE_UNDEAD', pMat: 'METALBAR', pQty: 16, artCode: 'ARTEFACT_ARMOR_PLATE_UNDEAD', artName: 'Ancient Chain Rings' },
        { id: 'demon_armor', name: 'Demon Armor', code: 'ARMOR_PLATE_HELL', pMat: 'METALBAR', pQty: 16, artCode: 'ARTEFACT_ARMOR_PLATE_HELL', artName: 'Demonic Plates' },
        { id: 'judicator_armor', name: 'Judicator Armor', code: 'ARMOR_PLATE_KEEPER', pMat: 'METALBAR', pQty: 16, artCode: 'ARTEFACT_ARMOR_PLATE_KEEPER', artName: 'Preserved Animal Fur' },
        { id: 'duskweaver_armor', name: 'Duskweaver Armor', code: 'ARMOR_PLATE_FEY', pMat: 'METALBAR', pQty: 16, artCode: 'ARTEFACT_ARMOR_PLATE_FEY', artName: 'Veilweaver Carapace' },
        { id: 'armor_of_valor', name: 'Armor of Valor', code: 'ARMOR_PLATE_AVALON', pMat: 'METALBAR', pQty: 16, artCode: 'ARTEFACT_ARMOR_PLATE_AVALON', artName: 'Exalted Plating' },
      ]),

      ...buildTreeItems('plate_boots', 'warrior', 'Martlock', [
        { id: 'plate_boots', name: 'Soldier Boots', code: 'SHOES_PLATE_SET1', pMat: 'METALBAR', pQty: 8 },
        { id: 'knight_boots', name: 'Knight Boots', code: 'SHOES_PLATE_SET2', pMat: 'METALBAR', pQty: 8 },
        { id: 'guardian_boots', name: 'Guardian Boots', code: 'SHOES_PLATE_SET3', pMat: 'METALBAR', pQty: 8 },
        { id: 'graveguard_boots', name: 'Graveguard Boots', code: 'SHOES_PLATE_UNDEAD', pMat: 'METALBAR', pQty: 8, artCode: 'ARTEFACT_SHOES_PLATE_UNDEAD', artName: 'Ancient Bindings' },
        { id: 'demon_boots', name: 'Demon Boots', code: 'SHOES_PLATE_HELL', pMat: 'METALBAR', pQty: 8, artCode: 'ARTEFACT_SHOES_PLATE_HELL', artName: 'Demonic Filling' },
        { id: 'judicator_boots', name: 'Judicator Boots', code: 'SHOES_PLATE_KEEPER', pMat: 'METALBAR', pQty: 8, artCode: 'ARTEFACT_SHOES_PLATE_KEEPER', artName: 'Inscribed Bindings' },
        { id: 'duskweaver_boots', name: 'Duskweaver Boots', code: 'SHOES_PLATE_FEY', pMat: 'METALBAR', pQty: 8, artCode: 'ARTEFACT_SHOES_PLATE_FEY', artName: 'Veilweaver Claws' },
        { id: 'boots_of_valor', name: 'Boots of Valor', code: 'SHOES_PLATE_AVALON', pMat: 'METALBAR', pQty: 8, artCode: 'ARTEFACT_SHOES_PLATE_AVALON', artName: 'Exalted Greave' },
      ]),

      ...buildTreeItems('shields', 'warrior', 'Martlock', [
        { id: 'shield', name: 'Shield', code: 'OFF_SHIELD', pMat: 'PLANKS', pQty: 4, sMat: 'METALBAR', sQty: 4 },
        { id: 'sarcophagus', name: 'Sarcophagus', code: 'OFF_TOWERSHIELD_UNDEAD', pMat: 'PLANKS', pQty: 4, sMat: 'METALBAR', sQty: 4, artCode: 'ARTEFACT_OFF_TOWERSHIELD_UNDEAD', artName: 'Ancient Shield Core' },
        { id: 'caitiff_shield', name: 'Caitiff Shield', code: 'OFF_SHIELD_HELL', pMat: 'PLANKS', pQty: 4, sMat: 'METALBAR', sQty: 4, artCode: 'ARTEFACT_OFF_SHIELD_HELL', artName: 'Infernal Shield Core' },
        { id: 'facebreaker', name: 'Facebreaker', code: 'OFF_SPIKEDSHIELD_MORGANA', pMat: 'PLANKS', pQty: 4, sMat: 'METALBAR', sQty: 4, artCode: 'ARTEFACT_OFF_SPIKEDSHIELD_MORGANA', artName: 'Bloodforged Spikes' },
        { id: 'astral_aegis', name: 'Astral Aegis', code: 'OFF_SHIELD_AVALON', pMat: 'PLANKS', pQty: 4, sMat: 'METALBAR', sQty: 4, artCode: 'ARTEFACT_OFF_SHIELD_AVALON', artName: 'Crushed Avalonian Heirloom' },
        { id: 'unbreakable_ward', name: 'Unbreakable Ward', code: 'OFF_SHIELD_CRYSTAL', pMat: 'PLANKS', pQty: 4, sMat: 'METALBAR', sQty: 4, artCode: 'ARTEFACT_OFF_SHIELD_CRYSTAL', artName: 'Unbreakable Crystal' },
      ]),

      // ==================== HUNTER LODGE ====================
      ...buildTreeItems('bows', 'hunter', 'Lymhurst', [
        { id: 'bow', name: 'Bow', code: '2H_BOW', pMat: 'PLANKS', pQty: 32 },
        { id: 'warbow', name: 'Warbow', code: '2H_WARBOW', pMat: 'PLANKS', pQty: 32 },
        { id: 'longbow', name: 'Longbow', code: '2H_LONGBOW', pMat: 'PLANKS', pQty: 32 },
        { id: 'whispering_bow', name: 'Whispering Bow', code: '2H_LONGBOW_UNDEAD', pMat: 'PLANKS', pQty: 32, artCode: 'ARTEFACT_2H_LONGBOW_UNDEAD', artName: 'Ghastly Arrows' },
        { id: 'wailing_bow', name: 'Wailing Bow', code: '2H_BOW_HELL', pMat: 'PLANKS', pQty: 32, artCode: 'ARTEFACT_2H_BOW_HELL', artName: 'Demonic Arrowheads' },
        { id: 'bow_of_badon', name: 'Bow of Badon', code: '2H_BOW_KEEPER', pMat: 'PLANKS', pQty: 32, artCode: 'ARTEFACT_2H_BOW_KEEPER', artName: 'Carved Bone' },
        { id: 'mistpiercer', name: 'Mistpiercer', code: '2H_BOW_AVALON', pMat: 'PLANKS', pQty: 32, artCode: 'ARTEFACT_2H_BOW_AVALON', artName: 'Immaculately Crafted Riser' },
        { id: 'skystrider_bow', name: 'Skystrider Bow', code: '2H_BOW_CRYSTAL', pMat: 'PLANKS', pQty: 32, artCode: 'ARTEFACT_2H_BOW_CRYSTAL', artName: 'Windborne Crystal' },
      ]),

      ...buildTreeItems('spears', 'hunter', 'Fort Sterling', [
        { id: 'spear', name: 'Spear', code: 'MAIN_SPEAR', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8 },
        { id: 'pike', name: 'Pike', code: '2H_SPEAR', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'glaive', name: 'Glaive', code: '2H_GLAIVE', pMat: 'METALBAR', pQty: 20, sMat: 'PLANKS', sQty: 12 },
        { id: 'heron_spear', name: 'Heron Spear', code: 'MAIN_SPEAR_KEEPER', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8, artCode: 'ARTEFACT_MAIN_SPEAR_KEEPER', artName: 'Keeper Spearhead' },
        { id: 'spirithunter', name: 'Spirithunter', code: '2H_HARPOON_HELL', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_HARPOON_HELL', artName: 'Infernal Harpoon Tip' },
        { id: 'trinity_spear', name: 'Trinity Spear', code: '2H_TRIDENT_UNDEAD', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_TRIDENT_UNDEAD', artName: 'Cursed Barbs' },
        { id: 'daybreaker', name: 'Daybreaker', code: 'MAIN_SPEAR_LANCE_AVALON', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8, artCode: 'ARTEFACT_MAIN_SPEAR_LANCE_AVALON', artName: 'Ruined Ancestral Vamplate' },
        { id: 'rift_glaive', name: 'Rift Glaive', code: '2H_GLAIVE_CRYSTAL', pMat: 'METALBAR', pQty: 20, sMat: 'PLANKS', sQty: 12, artCode: 'ARTEFACT_2H_GLAIVE_CRYSTAL', artName: 'Rift Crystal' },
      ]),

      ...buildTreeItems('daggers', 'hunter', 'Bridgewatch', [
        { id: 'dagger', name: 'Dagger', code: 'MAIN_DAGGER', pMat: 'METALBAR', pQty: 12, sMat: 'LEATHER', sQty: 12 },
        { id: 'daggerpair', name: 'Dagger Pair', code: '2H_DAGGERPAIR', pMat: 'METALBAR', pQty: 16, sMat: 'LEATHER', sQty: 16 },
        { id: 'claws', name: 'Claws', code: '2H_CLAWPAIR', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'bloodletter', name: 'Bloodletter', code: 'MAIN_RAPIER_MORGANA', pMat: 'METALBAR', pQty: 16, sMat: 'LEATHER', sQty: 8, artCode: 'ARTEFACT_MAIN_RAPIER_MORGANA', artName: 'Hardened Debole' },
        { id: 'demonfang', name: 'Demonfang', code: 'MAIN_DAGGER_HELL', pMat: 'METALBAR', pQty: 12, sMat: 'LEATHER', sQty: 12, artCode: 'ARTEFACT_MAIN_DAGGER_HELL', artName: 'Broken Demonic Fang' },
        { id: 'black_hands', name: 'Black Hands', code: '2H_IRONGAUNTLETS_HELL', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_IRONGAUNTLETS_HELL', artName: 'Black Leather' },
        { id: 'deathgivers', name: 'Deathgivers', code: '2H_DUALSICKLE_UNDEAD', pMat: 'METALBAR', pQty: 16, sMat: 'LEATHER', sQty: 16, artCode: 'ARTEFACT_2H_DUALSICKLE_UNDEAD', artName: 'Ghastly Blades' },
        { id: 'bridled_fury', name: 'Bridled Fury', code: '2H_DAGGER_KATAR_AVALON', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_DAGGER_KATAR_AVALON', artName: 'Bloodstained Antiquities' },
        { id: 'twin_slayers', name: 'Twin Slayers', code: '2H_DAGGERPAIR_CRYSTAL', pMat: 'METALBAR', pQty: 16, sMat: 'LEATHER', sQty: 16, artCode: 'ARTEFACT_2H_DAGGERPAIR_CRYSTAL', artName: 'Death-Touched Crystal' },
      ]),

      ...buildTreeItems('quarterstaffs', 'hunter', 'Martlock', [
        { id: 'quarterstaff', name: 'Quarterstaff', code: '2H_QUARTERSTAFF', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'ironclad_staff', name: 'Iron-clad Staff', code: '2H_IRONCLADEDSTAFF', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'double_bladed_staff', name: 'Double Bladed Staff', code: '2H_DOUBLEBLADEDSTAFF', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'black_monk_stave', name: 'Black Monk Stave', code: '2H_COMBATSTAFF_MORGANA', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_COMBATSTAFF_MORGANA', artName: 'Reinforced Morgana Pole' },
        { id: 'soulscythe', name: 'Soulscythe', code: '2H_TWINSCYTHE_HELL', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_TWINSCYTHE_HELL', artName: 'Hellish Sicklehead Pair' },
        { id: 'staff_of_balance', name: 'Staff of Balance', code: '2H_ROCKSTAFF_KEEPER', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_ROCKSTAFF_KEEPER', artName: 'Preserved Rocks' },
        { id: 'grailseeker', name: 'Grailseeker', code: '2H_QUARTERSTAFF_AVALON', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_QUARTERSTAFF_AVALON', artName: 'Timeworn Walking Staff' },
        { id: 'phantom_twinblade', name: 'Phantom Twinblade', code: '2H_DOUBLEBLADEDSTAFF_CRYSTAL', pMat: 'LEATHER', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_DOUBLEBLADEDSTAFF_CRYSTAL', artName: 'Mirage Crystal' },
      ]),

      ...buildTreeItems('naturestaffs', 'hunter', 'Thetford', [
        { id: 'naturestaff', name: 'Nature Staff', code: 'MAIN_NATURESTAFF', pMat: 'PLANKS', pQty: 16, sMat: 'CLOTH', sQty: 8 },
        { id: 'great_naturestaff', name: 'Great Nature Staff', code: '2H_NATURESTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'CLOTH', sQty: 12 },
        { id: 'wild_staff', name: 'Wild Staff', code: '2H_WILDSTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'CLOTH', sQty: 12 },
        { id: 'druidic_staff', name: 'Druidic Staff', code: 'MAIN_NATURESTAFF_KEEPER', pMat: 'PLANKS', pQty: 16, sMat: 'CLOTH', sQty: 8, artCode: 'ARTEFACT_MAIN_NATURESTAFF_KEEPER', artName: 'Druidic Inscriptions' },
        { id: 'blight_staff', name: 'Blight Staff', code: '2H_NATURESTAFF_HELL', pMat: 'PLANKS', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_NATURESTAFF_HELL', artName: 'Symbol of Blight' },
        { id: 'rampant_staff', name: 'Rampant Staff', code: '2H_NATURESTAFF_KEEPER', pMat: 'PLANKS', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_NATURESTAFF_KEEPER', artName: 'Preserved Log' },
        { id: 'ironroot_staff', name: 'Ironroot Staff', code: 'MAIN_NATURESTAFF_AVALON', pMat: 'PLANKS', pQty: 16, sMat: 'CLOTH', sQty: 8, artCode: 'ARTEFACT_MAIN_NATURESTAFF_AVALON', artName: 'Uprooted Perennial Sapling' },
        { id: 'forgebark_staff', name: 'Forgebark Staff', code: 'MAIN_NATURESTAFF_CRYSTAL', pMat: 'PLANKS', pQty: 16, sMat: 'CLOTH', sQty: 8, artCode: 'ARTEFACT_MAIN_NATURESTAFF_CRYSTAL', artName: 'Forged Crystal' },
      ]),

      ...buildTreeItems('leather_hoods', 'hunter', 'Lymhurst', [
        { id: 'leather_hood', name: 'Mercenary Hood', code: 'HEAD_LEATHER_SET1', pMat: 'LEATHER', pQty: 8 },
        { id: 'hunter_hood', name: 'Hunter Hood', code: 'HEAD_LEATHER_SET2', pMat: 'LEATHER', pQty: 8 },
        { id: 'assassin_hood', name: 'Assassin Hood', code: 'HEAD_LEATHER_SET3', pMat: 'LEATHER', pQty: 8 },
        { id: 'stalker_hood', name: 'Stalker Hood', code: 'HEAD_LEATHER_MORGANA', pMat: 'LEATHER', pQty: 8, artCode: 'ARTEFACT_HEAD_LEATHER_MORGANA', artName: 'Imbued Visor' },
        { id: 'hellion_hood', name: 'Hellion Hood', code: 'HEAD_LEATHER_HELL', pMat: 'LEATHER', pQty: 8, artCode: 'ARTEFACT_HEAD_LEATHER_HELL', artName: 'Demonhide Padding' },
        { id: 'specter_hood', name: 'Specter Hood', code: 'HEAD_LEATHER_UNDEAD', pMat: 'LEATHER', pQty: 8, artCode: 'ARTEFACT_HEAD_LEATHER_UNDEAD', artName: 'Ghastly Visor' },
        { id: 'mistwalker_hood', name: 'Mistwalker Hood', code: 'HEAD_LEATHER_FEY', pMat: 'LEATHER', pQty: 8, artCode: 'ARTEFACT_HEAD_LEATHER_FEY', artName: 'Flawless Griffin Beak' },
        { id: 'hood_of_tenacity', name: 'Hood of Tenacity', code: 'HEAD_LEATHER_AVALON', pMat: 'LEATHER', pQty: 8, artCode: 'ARTEFACT_HEAD_LEATHER_AVALON', artName: 'Augured Padding' },
      ]),

      ...buildTreeItems('leather_jackets', 'hunter', 'Thetford', [
        { id: 'leather_jacket', name: 'Mercenary Jacket', code: 'ARMOR_LEATHER_SET1', pMat: 'LEATHER', pQty: 16 },
        { id: 'hunter_jacket', name: 'Hunter Jacket', code: 'ARMOR_LEATHER_SET2', pMat: 'LEATHER', pQty: 16 },
        { id: 'assassin_jacket', name: 'Assassin Jacket', code: 'ARMOR_LEATHER_SET3', pMat: 'LEATHER', pQty: 16 },
        { id: 'stalker_jacket', name: 'Stalker Jacket', code: 'ARMOR_LEATHER_MORGANA', pMat: 'LEATHER', pQty: 16, artCode: 'ARTEFACT_ARMOR_LEATHER_MORGANA', artName: 'Imbued Leather Folds' },
        { id: 'hellion_jacket', name: 'Hellion Jacket', code: 'ARMOR_LEATHER_HELL', pMat: 'LEATHER', pQty: 16, artCode: 'ARTEFACT_ARMOR_LEATHER_HELL', artName: 'Demonhide Leather' },
        { id: 'specter_jacket', name: 'Specter Jacket', code: 'ARMOR_LEATHER_UNDEAD', pMat: 'LEATHER', pQty: 16, artCode: 'ARTEFACT_ARMOR_LEATHER_UNDEAD', artName: 'Ghastly Leather' },
        { id: 'mistwalker_jacket', name: 'Mistwalker Jacket', code: 'ARMOR_LEATHER_FEY', pMat: 'LEATHER', pQty: 16, artCode: 'ARTEFACT_ARMOR_LEATHER_FEY', artName: 'Untarnished Griffin Feathers' },
        { id: 'jacket_of_tenacity', name: 'Jacket of Tenacity', code: 'ARMOR_LEATHER_AVALON', pMat: 'LEATHER', pQty: 16, artCode: 'ARTEFACT_ARMOR_LEATHER_AVALON', artName: 'Augured Sash' },
      ]),

      ...buildTreeItems('leather_shoes', 'hunter', 'Lymhurst', [
        { id: 'leather_shoes', name: 'Mercenary Shoes', code: 'SHOES_LEATHER_SET1', pMat: 'LEATHER', pQty: 8 },
        { id: 'hunter_shoes', name: 'Hunter Shoes', code: 'SHOES_LEATHER_SET2', pMat: 'LEATHER', pQty: 8 },
        { id: 'assassin_shoes', name: 'Assassin Shoes', code: 'SHOES_LEATHER_SET3', pMat: 'LEATHER', pQty: 8 },
        { id: 'stalker_shoes', name: 'Stalker Shoes', code: 'SHOES_LEATHER_MORGANA', pMat: 'LEATHER', pQty: 8, artCode: 'ARTEFACT_SHOES_LEATHER_MORGANA', artName: 'Imbued Soles' },
        { id: 'hellion_shoes', name: 'Hellion Shoes', code: 'SHOES_LEATHER_HELL', pMat: 'LEATHER', pQty: 8, artCode: 'ARTEFACT_SHOES_LEATHER_HELL', artName: 'Demonhide Bindings' },
        { id: 'specter_shoes', name: 'Specter Shoes', code: 'SHOES_LEATHER_UNDEAD', pMat: 'LEATHER', pQty: 8, artCode: 'ARTEFACT_SHOES_LEATHER_UNDEAD', artName: 'Ghastly Bindings' },
        { id: 'mistwalker_shoes', name: 'Mistwalker Shoes', code: 'SHOES_LEATHER_FEY', pMat: 'LEATHER', pQty: 8, artCode: 'ARTEFACT_SHOES_LEATHER_FEY', artName: 'Griffin Underfur' },
        { id: 'shoes_of_tenacity', name: 'Shoes of Tenacity', code: 'SHOES_LEATHER_AVALON', pMat: 'LEATHER', pQty: 8, artCode: 'ARTEFACT_SHOES_LEATHER_AVALON', artName: 'Augured Fasteners' },
      ]),

      ...buildTreeItems('torches', 'hunter', 'Martlock', [
        { id: 'torch', name: 'Torch', code: 'OFF_TORCH', pMat: 'PLANKS', pQty: 4, sMat: 'CLOTH', sQty: 4 },
        { id: 'mistcaller', name: 'Mistcaller', code: 'OFF_HORN_KEEPER', pMat: 'PLANKS', pQty: 4, sMat: 'CLOTH', sQty: 4, artCode: 'ARTEFACT_OFF_HORN_KEEPER', artName: 'Runed Horn' },
        { id: 'leering_cane', name: 'Leering Cane', code: 'OFF_JESTERCANE_HELL', pMat: 'PLANKS', pQty: 4, sMat: 'CLOTH', sQty: 4, artCode: 'ARTEFACT_OFF_JESTERCANE_HELL', artName: 'Hellish Handle' },
        { id: 'cryptcandle', name: 'Cryptcandle', code: 'OFF_LAMP_UNDEAD', pMat: 'PLANKS', pQty: 4, sMat: 'CLOTH', sQty: 4, artCode: 'ARTEFACT_OFF_LAMP_UNDEAD', artName: 'Ghastly Candle' },
        { id: 'sacred_scepter', name: 'Sacred Scepter', code: 'OFF_TALISMAN_AVALON', pMat: 'PLANKS', pQty: 4, sMat: 'CLOTH', sQty: 4, artCode: 'ARTEFACT_OFF_TALISMAN_AVALON', artName: 'Shattered Avalonian Memento' },
        { id: 'blueflame_torch', name: 'Blueflame Torch', code: 'OFF_TORCH_CRYSTAL', pMat: 'PLANKS', pQty: 4, sMat: 'CLOTH', sQty: 4, artCode: 'ARTEFACT_OFF_TORCH_CRYSTAL', artName: 'Blueflame Crystal' },
      ]),

      // ==================== MAGE TOWER ====================
      ...buildTreeItems('firestaffs', 'mage', 'Thetford', [
        { id: 'firestaff', name: 'Fire Staff', code: 'MAIN_FIRESTAFF', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8 },
        { id: 'greatfire', name: 'Great Fire Staff', code: '2H_FIRESTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'infernal_staff', name: 'Infernal Staff', code: '2H_INFERNOSTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'wildfire_staff', name: 'Wildfire Staff', code: 'MAIN_FIRESTAFF_KEEPER', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8, artCode: 'ARTEFACT_MAIN_FIRESTAFF_KEEPER', artName: 'Wildfire Orb' },
        { id: 'brimstone_staff', name: 'Brimstone Staff', code: '2H_FIRESTAFF_HELL', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_FIRESTAFF_HELL', artName: 'Burning Orb' },
        { id: 'blazing_staff', name: 'Blazing Staff', code: '2H_INFERNOSTAFF_MORGANA', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_INFERNOSTAFF_MORGANA', artName: 'Unholy Scroll' },
        { id: 'dawnsong', name: 'Dawnsong', code: '2H_FIRE_RINGPAIR_AVALON', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_FIRE_RINGPAIR_AVALON', artName: 'Glowing Harmonic Ring' },
        { id: 'flamewalker_staff', name: 'Flamewalker Staff', code: 'MAIN_FIRESTAFF_CRYSTAL', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8, artCode: 'ARTEFACT_MAIN_FIRESTAFF_CRYSTAL', artName: 'Pyreheart Crystal' },
      ]),

      ...buildTreeItems('froststaffs', 'mage', 'Martlock', [
        { id: 'froststaff', name: 'Frost Staff', code: 'MAIN_FROSTSTAFF', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8 },
        { id: 'greatfrost', name: 'Great Frost Staff', code: '2H_FROSTSTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'glacial_staff', name: 'Glacial Staff', code: '2H_GLACIALSTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'hoarfrost_staff', name: 'Hoarfrost Staff', code: 'MAIN_FROSTSTAFF_KEEPER', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8, artCode: 'ARTEFACT_MAIN_FROSTSTAFF_KEEPER', artName: 'Hoarfrost Orb' },
        { id: 'icicle_staff', name: 'Icicle Staff', code: '2H_ICEGAUNTLETS_HELL', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_ICEGAUNTLETS_HELL', artName: 'Icicle Orb' },
        { id: 'permafrost_prism', name: 'Permafrost Prism', code: '2H_ICECRYSTAL_UNDEAD', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_ICECRYSTAL_UNDEAD', artName: 'Cursed Frozen Crystal' },
        { id: 'chillhowl', name: 'Chillhowl', code: 'MAIN_FROSTSTAFF_AVALON', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8, artCode: 'ARTEFACT_MAIN_FROSTSTAFF_AVALON', artName: 'Chilled Crystalline Shard' },
        { id: 'arctic_staff', name: 'Arctic Staff', code: '2H_FROSTSTAFF_CRYSTAL', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_FROSTSTAFF_CRYSTAL', artName: 'Icy Crystal' },
      ]),

      ...buildTreeItems('cursedstaffs', 'mage', 'Bridgewatch', [
        { id: 'cursedstaff', name: 'Cursed Staff', code: 'MAIN_CURSEDSTAFF', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8 },
        { id: 'great_cursedstaff', name: 'Great Cursed Staff', code: '2H_CURSEDSTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'demonic_staff', name: 'Demonic Staff', code: '2H_DEMONICSTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'lifecurse_staff', name: 'Lifecurse Staff', code: 'MAIN_CURSEDSTAFF_UNDEAD', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8, artCode: 'ARTEFACT_MAIN_CURSEDSTAFF_UNDEAD', artName: 'Lost Cursed Crystal' },
        { id: 'cursed_skull', name: 'Cursed Skull', code: '2H_SKULLORB_HELL', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_SKULLORB_HELL', artName: 'Cursed Jawbone' },
        { id: 'damnation_staff', name: 'Damnation Staff', code: '2H_CURSEDSTAFF_MORGANA', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_CURSEDSTAFF_MORGANA', artName: 'Bloodforged Catalyst' },
        { id: 'shadowcaller', name: 'Shadowcaller', code: 'MAIN_CURSEDSTAFF_AVALON', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8, artCode: 'ARTEFACT_MAIN_CURSEDSTAFF_AVALON', artName: 'Fractured Opaque Orb' },
        { id: 'rotcaller_staff', name: 'Rotcaller Staff', code: 'MAIN_CURSEDSTAFF_CRYSTAL', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8, artCode: 'ARTEFACT_MAIN_CURSEDSTAFF_CRYSTAL', artName: 'Rotten Crystal' },
      ]),

      ...buildTreeItems('holystaffs', 'mage', 'Fort Sterling', [
        { id: 'holystaff', name: 'Holy Staff', code: 'MAIN_HOLYSTAFF', pMat: 'PLANKS', pQty: 16, sMat: 'CLOTH', sQty: 8 },
        { id: 'great_holystaff', name: 'Great Holy Staff', code: '2H_HOLYSTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'CLOTH', sQty: 12 },
        { id: 'divine_staff', name: 'Divine Staff', code: '2H_DIVINESTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'CLOTH', sQty: 12 },
        { id: 'lifetouch_staff', name: 'Lifetouch Staff', code: 'MAIN_HOLYSTAFF_MORGANA', pMat: 'PLANKS', pQty: 16, sMat: 'CLOTH', sQty: 8, artCode: 'ARTEFACT_MAIN_HOLYSTAFF_MORGANA', artName: 'Possessed Scroll' },
        { id: 'fallen_staff', name: 'Fallen Staff', code: '2H_HOLYSTAFF_HELL', pMat: 'PLANKS', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_HOLYSTAFF_HELL', artName: 'Infernal Scroll' },
        { id: 'redemption_staff', name: 'Redemption Staff', code: '2H_HOLYSTAFF_UNDEAD', pMat: 'PLANKS', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_HOLYSTAFF_UNDEAD', artName: 'Ghastly Scroll' },
        { id: 'hallowfall', name: 'Hallowfall', code: 'MAIN_HOLYSTAFF_AVALON', pMat: 'PLANKS', pQty: 16, sMat: 'CLOTH', sQty: 8, artCode: 'ARTEFACT_MAIN_HOLYSTAFF_AVALON', artName: 'Messianic Curio' },
        { id: 'exalted_staff', name: 'Exalted Staff', code: '2H_HOLYSTAFF_CRYSTAL', pMat: 'PLANKS', pQty: 20, sMat: 'CLOTH', sQty: 12, artCode: 'ARTEFACT_2H_HOLYSTAFF_CRYSTAL', artName: 'Exalted Crystal' },
      ]),

      ...buildTreeItems('arcanestaffs', 'mage', 'Lymhurst', [
        { id: 'arcanestaff', name: 'Arcane Staff', code: 'MAIN_ARCANESTAFF', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8 },
        { id: 'great_arcanestaff', name: 'Great Arcane Staff', code: '2H_ARCANESTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'enigmatic_staff', name: 'Enigmatic Staff', code: '2H_ENIGMATICSTAFF', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12 },
        { id: 'witchwork_staff', name: 'Witchwork Staff', code: 'MAIN_ARCANESTAFF_UNDEAD', pMat: 'PLANKS', pQty: 16, sMat: 'METALBAR', sQty: 8, artCode: 'ARTEFACT_MAIN_ARCANESTAFF_UNDEAD', artName: 'Lost Arcane Crystal' },
        { id: 'occult_staff', name: 'Occult Staff', code: '2H_ARCANESTAFF_HELL', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_ARCANESTAFF_HELL', artName: 'Occult Orb' },
        { id: 'malevolent_locus', name: 'Malevolent Locus', code: '2H_ENIGMATICORB_MORGANA', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_ENIGMATICORB_MORGANA', artName: 'Possessed Catalyst' },
        { id: 'evensong', name: 'Evensong', code: '2H_ARCANE_RINGPAIR_AVALON', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_ARCANE_RINGPAIR_AVALON', artName: 'Hypnotic Harmonic Ring' },
        { id: 'astral_staff', name: 'Astral Staff', code: '2H_ARCANESTAFF_CRYSTAL', pMat: 'PLANKS', pQty: 20, sMat: 'METALBAR', sQty: 12, artCode: 'ARTEFACT_2H_ARCANESTAFF_CRYSTAL', artName: 'Startouched Crystal' },
      ]),

      ...buildTreeItems('cloth_cowls', 'mage', 'Thetford', [
        { id: 'cloth_cowl', name: 'Scholar Cowl', code: 'HEAD_CLOTH_SET1', pMat: 'CLOTH', pQty: 8 },
        { id: 'cleric_cowl', name: 'Cleric Cowl', code: 'HEAD_CLOTH_SET2', pMat: 'CLOTH', pQty: 8 },
        { id: 'mage_cowl', name: 'Mage Cowl', code: 'HEAD_CLOTH_SET3', pMat: 'CLOTH', pQty: 8 },
        { id: 'druid_cowl', name: 'Druid Cowl', code: 'HEAD_CLOTH_KEEPER', pMat: 'CLOTH', pQty: 8, artCode: 'ARTEFACT_HEAD_CLOTH_KEEPER', artName: 'Druidic Preserved Beak' },
        { id: 'fiend_cowl', name: 'Fiend Cowl', code: 'HEAD_CLOTH_HELL', pMat: 'CLOTH', pQty: 8, artCode: 'ARTEFACT_HEAD_CLOTH_HELL', artName: 'Infernal Cloth Visor' },
        { id: 'cultist_cowl', name: 'Cultist Cowl', code: 'HEAD_CLOTH_MORGANA', pMat: 'CLOTH', pQty: 8, artCode: 'ARTEFACT_HEAD_CLOTH_MORGANA', artName: 'Alluring Padding' },
        { id: 'feyscale_hat', name: 'Feyscale Hat', code: 'HEAD_CLOTH_FEY', pMat: 'CLOTH', pQty: 8, artCode: 'ARTEFACT_HEAD_CLOTH_FEY', artName: 'Intact Fey Fibula' },
        { id: 'cowl_of_purity', name: 'Cowl of Purity', code: 'HEAD_CLOTH_AVALON', pMat: 'CLOTH', pQty: 8, artCode: 'ARTEFACT_HEAD_CLOTH_AVALON', artName: 'Sanctified Mask' },
      ]),

      ...buildTreeItems('cloth_robes', 'mage', 'Fort Sterling', [
        { id: 'cloth_robe', name: 'Scholar Robe', code: 'ARMOR_CLOTH_SET1', pMat: 'CLOTH', pQty: 16 },
        { id: 'cleric_robe', name: 'Cleric Robe', code: 'ARMOR_CLOTH_SET2', pMat: 'CLOTH', pQty: 16 },
        { id: 'mage_robe', name: 'Mage Robe', code: 'ARMOR_CLOTH_SET3', pMat: 'CLOTH', pQty: 16 },
        { id: 'druid_robe', name: 'Druid Robe', code: 'ARMOR_CLOTH_KEEPER', pMat: 'CLOTH', pQty: 16, artCode: 'ARTEFACT_ARMOR_CLOTH_KEEPER', artName: 'Druidic Feathers' },
        { id: 'fiend_robe', name: 'Fiend Robe', code: 'ARMOR_CLOTH_HELL', pMat: 'CLOTH', pQty: 16, artCode: 'ARTEFACT_ARMOR_CLOTH_HELL', artName: 'Infernal Cloth Folds' },
        { id: 'cultist_robe', name: 'Cultist Robe', code: 'ARMOR_CLOTH_MORGANA', pMat: 'CLOTH', pQty: 16, artCode: 'ARTEFACT_ARMOR_CLOTH_MORGANA', artName: 'Alluring Amulet' },
        { id: 'feyscale_robe', name: 'Feyscale Robe', code: 'ARMOR_CLOTH_FEY', pMat: 'CLOTH', pQty: 16, artCode: 'ARTEFACT_ARMOR_CLOTH_FEY', artName: 'Fey Dorsal Wing' },
        { id: 'robe_of_purity', name: 'Robe of Purity', code: 'ARMOR_CLOTH_AVALON', pMat: 'CLOTH', pQty: 16, artCode: 'ARTEFACT_ARMOR_CLOTH_AVALON', artName: 'Sanctified Belt' },
      ]),

      ...buildTreeItems('cloth_sandals', 'mage', 'Bridgewatch', [
        { id: 'cloth_sandals', name: 'Scholar Sandals', code: 'SHOES_CLOTH_SET1', pMat: 'CLOTH', pQty: 8 },
        { id: 'cleric_sandals', name: 'Cleric Sandals', code: 'SHOES_CLOTH_SET2', pMat: 'CLOTH', pQty: 8 },
        { id: 'mage_sandals', name: 'Mage Sandals', code: 'SHOES_CLOTH_SET3', pMat: 'CLOTH', pQty: 8 },
        { id: 'druid_sandals', name: 'Druid Sandals', code: 'SHOES_CLOTH_KEEPER', pMat: 'CLOTH', pQty: 8, artCode: 'ARTEFACT_SHOES_CLOTH_KEEPER', artName: 'Druidic Bindings' },
        { id: 'fiend_sandals', name: 'Fiend Sandals', code: 'SHOES_CLOTH_HELL', pMat: 'CLOTH', pQty: 8, artCode: 'ARTEFACT_SHOES_CLOTH_HELL', artName: 'Infernal Cloth Bindings' },
        { id: 'cultist_sandals', name: 'Cultist Sandals', code: 'SHOES_CLOTH_MORGANA', pMat: 'CLOTH', pQty: 8, artCode: 'ARTEFACT_SHOES_CLOTH_MORGANA', artName: 'Alluring Bindings' },
        { id: 'feyscale_sandals', name: 'Feyscale Sandals', code: 'SHOES_CLOTH_FEY', pMat: 'CLOTH', pQty: 8, artCode: 'ARTEFACT_SHOES_CLOTH_FEY', artName: 'Fey Dragonscales' },
        { id: 'sandals_of_purity', name: 'Sandals of Purity', code: 'SHOES_CLOTH_AVALON', pMat: 'CLOTH', pQty: 8, artCode: 'ARTEFACT_SHOES_CLOTH_AVALON', artName: 'Sanctified Bindings' },
      ]),

      ...buildTreeItems('tomes', 'mage', 'Martlock', [
        { id: 'tome', name: 'Tome of Spells', code: 'OFF_BOOK', pMat: 'CLOTH', pQty: 4, sMat: 'LEATHER', sQty: 4 },
        { id: 'eye_of_secrets', name: 'Eye of Secrets', code: 'OFF_ORB_MORGANA', pMat: 'CLOTH', pQty: 4, sMat: 'LEATHER', sQty: 4, artCode: 'ARTEFACT_OFF_ORB_MORGANA', artName: 'Alluring Crystal' },
        { id: 'muisak', name: 'Muisak', code: 'OFF_DEMONSKULL_HELL', pMat: 'CLOTH', pQty: 4, sMat: 'LEATHER', sQty: 4, artCode: 'ARTEFACT_OFF_DEMONSKULL_HELL', artName: 'Demonic Jawbone' },
        { id: 'taproot', name: 'Taproot', code: 'OFF_TOTEM_KEEPER', pMat: 'CLOTH', pQty: 4, sMat: 'LEATHER', sQty: 4, artCode: 'ARTEFACT_OFF_TOTEM_KEEPER', artName: 'Inscribed Stone' },
        { id: 'celestial_censer', name: 'Celestial Censer', code: 'OFF_CENSER_AVALON', pMat: 'CLOTH', pQty: 4, sMat: 'LEATHER', sQty: 4, artCode: 'ARTEFACT_OFF_CENSER_AVALON', artName: 'Severed Celestial Keepsake' },
        { id: 'timelocked_grimoire', name: 'Timelocked Grimoire', code: 'OFF_TOME_CRYSTAL', pMat: 'CLOTH', pQty: 4, sMat: 'LEATHER', sQty: 4, artCode: 'ARTEFACT_OFF_TOME_CRYSTAL', artName: 'Timelocked Crystal' },
      ]),

      // ==================== TOOLMAKER ====================
      ...buildTreeItems('bags', 'toolmaker', 'Brecilien', [
        { id: 'bag', name: 'Bag', code: 'BAG', pMat: 'CLOTH', pQty: 8, sMat: 'LEATHER', sQty: 8 },
        { id: 'satchel_of_insight', name: 'Satchel of Insight', code: 'BAG_INSIGHT', pMat: 'CLOTH', pQty: 8, sMat: 'LEATHER', sQty: 8, artCode: 'SKILLBOOK_STANDARD', artName: 'Tome of Insight' },
      ]),

      ...buildTreeItems('capes', 'toolmaker', 'Brecilien', [
        { id: 'cape', name: 'Cape', code: 'CAPE', pMat: 'CLOTH', pQty: 4, sMat: 'LEATHER', sQty: 4 },
      ]),

      ...buildTreeItems('tools', 'toolmaker', 'Caerleon', [
        { id: 'pickaxe', name: 'Pickaxe', code: '2H_TOOL_PICK', pMat: 'PLANKS', pQty: 6, sMat: 'METALBAR', sQty: 2, supportsEnchant: false },
        { id: 'stone_hammer', name: 'Stone Hammer', code: '2H_TOOL_HAMMER', pMat: 'PLANKS', pQty: 6, sMat: 'METALBAR', sQty: 2, supportsEnchant: false },
        { id: 'wood_axe', name: 'Wood Axe', code: '2H_TOOL_AXE', pMat: 'PLANKS', pQty: 6, sMat: 'METALBAR', sQty: 2, supportsEnchant: false },
        { id: 'sickle', name: 'Sickle', code: '2H_TOOL_SICKLE', pMat: 'PLANKS', pQty: 6, sMat: 'METALBAR', sQty: 2, supportsEnchant: false },
        { id: 'skinning_knife', name: 'Skinning Knife', code: '2H_TOOL_KNIFE', pMat: 'PLANKS', pQty: 6, sMat: 'METALBAR', sQty: 2, supportsEnchant: false },
        { id: 'fishing_rod', name: 'Fishing Rod', code: '2H_TOOL_FISHINGROD', pMat: 'PLANKS', pQty: 6, sMat: 'CLOTH', sQty: 2, supportsEnchant: false },
      ]),
    ];

    // -------------------------------------------------------------------------
    // 2. ITEM IDS, RRR (CITIES + HIDEOUTS), FOCUS, STATION FEE & JOURNALS
    // -------------------------------------------------------------------------

    function getMaterialItemId(matId, tier, enchantment = 0) {
      const t = Math.min(Math.max(Number(tier) || 4, 4), 8);
      const e = Math.min(Math.max(Number(enchantment) || 0, 0), 4);
      if (e === 0) return `T${t}_${matId}`;
      return `T${t}_${matId}_LEVEL${e}@${e}`;
    }

    /**
     * Artifacts in Albion Online scale by Tier (T4–T8) and are NEVER enchanted.
     */
    function getArtifactItemId(item, tier) {
      if (!item || !item.artifactCode) return null;
      const t = Math.min(Math.max(Number(tier) || 4, 4), 8);
      return `T${t}_${item.artifactCode}`;
    }

    function getCraftedItemId(item, tier, enchantment = 0) {
      const t = Math.min(Math.max(Number(tier) || 4, 4), 8);
      const e = item && item.supportsEnchant === false
        ? 0
        : Math.min(Math.max(Number(enchantment) || 0, 0), 4);
      if (e === 0) return `T${t}_${item.code}`;
      return `T${t}_${item.code}@${e}`;
    }

    function getJournalItemIds(categoryId, tier) {
      const cat = CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0];
      const t = Math.min(Math.max(Number(tier) || 4, 4), 8);
      return {
        emptyId: `T${t}_${cat.journalPrefix}_EMPTY`,
        fullId: `T${t}_${cat.journalPrefix}_FULL`,
        journalName: `T${t} ${cat.journalName}`,
      };
    }

    function getTotalMaterialsPerCraft(item) {
      if (!item) return 16;
      return (Number(item.primaryQty) || 0) + (Number(item.secondaryQty) || 0);
    }

    /**
     * Calculates Equipment Crafting Resource Return Rate (RRR).
     * Supports Royal Cities, Caerleon, Brecilien, Outlands Hideout (Zone Quality Q1-Q6 + Power Level 1-9 + Biome Specialty), Island, and Custom RRR.
     */
    function calculateCraftingRRR({
      cityId = 'Lymhurst',
      item = null,
      useFocus = false,
      dailyBonusPercent = 0,
      customRRR = null,
      hideoutZoneQuality = 6,
      hideoutPowerLevel = 9,
      hideoutBiomeMatch = true,
    }) {
      if (cityId === 'Custom' && customRRR !== null && customRRR !== undefined) {
        const clamped = Math.min(Math.max(Number(customRRR) || 0, 0), 95);
        return {
          percentage: Number(clamped.toFixed(2)),
          rate: clamped / 100,
          lpb: null,
          hasBonus: false,
        };
      }

      const focusLPB = useFocus ? FOCUS_BONUS_LPB : 0.0;
      const dailyLPB = (Number(dailyBonusPercent) || 0) / 100;

      if (cityId === 'Hideout') {
        const q = Math.min(Math.max(Math.round(Number(hideoutZoneQuality) || 1), 1), 6);
        const p = Math.min(Math.max(Math.round(Number(hideoutPowerLevel) || 1), 1), 9);
        const zoneLPB = HIDEOUT_ZONE_QUALITY_LPB[q] || 0.01;
        const powerLPB = HIDEOUT_POWER_GENERAL_LPB[p] || 0.00;
        const specLPB = hideoutBiomeMatch ? (HIDEOUT_POWER_SPECIALTY_LPB[p] || 0.00) : 0.00;
        const totalLPB = zoneLPB + powerLPB + specLPB + focusLPB + dailyLPB;
        const rate = totalLPB > 0 ? totalLPB / (1 + totalLPB) : 0;

        return {
          percentage: Number((rate * 100).toFixed(2)),
          rate,
          lpb: Number(totalLPB.toFixed(4)),
          hasBonus: Boolean(hideoutBiomeMatch && specLPB > 0),
          hideoutBreakdown: {
            zoneQuality: q,
            powerLevel: p,
            zoneLPB,
            powerLPB,
            specLPB,
          },
        };
      }

      const cityObj = CRAFTING_CITIES.find((c) => c.id === cityId) || CRAFTING_CITIES[0];
      const baseLPB = cityObj.baseLPB;
      const hasBonus = Boolean(item && item.bonusCity === cityId);
      const specialtyLPB = hasBonus ? CITY_SPECIALTY_LPB : 0.0;

      const totalLPB = baseLPB + specialtyLPB + focusLPB + dailyLPB;
      const rate = totalLPB > 0 ? totalLPB / (1 + totalLPB) : 0;

      return {
        percentage: Number((rate * 100).toFixed(2)),
        rate,
        lpb: Number(totalLPB.toFixed(4)),
        hasBonus,
      };
    }

    function calculateCraftingFocusCost({
      item,
      tier = 4,
      enchantment = 0,
      mastery = 100,
      spec = 100,
      crossSpec = 0,
    }) {
      const t = Math.min(Math.max(Number(tier) || 4, 4), 8);
      const e = item && item.supportsEnchant === false
        ? 0
        : Math.min(Math.max(Number(enchantment) || 0, 0), 4);
      const effTier = Math.min(Math.max(t + e, 4), 12);
      const totalMats = getTotalMaterialsPerCraft(item);
      const basePer8 = BASE_FOCUS_PER_8_UNITS[effTier] || 429;
      const baseFocus = (totalMats / 8) * basePer8;

      const m = Math.min(Math.max(Number(mastery) || 0, 0), 100);
      const s = Math.min(Math.max(Number(spec) || 0, 0), 100);
      const cs = Math.min(Math.max(Number(crossSpec) || 0, 0), 800);
      const fce = m * 30 + s * 250 + cs * 30;

      return Math.max(1, Math.round(baseFocus * Math.pow(0.5, fce / 10000)));
    }

    function calculateCraftingStationFee({
      item,
      tier = 4,
      enchantment = 0,
      feePer100Nutrition = 400,
    }) {
      const fee = Math.max(0, Number(feePer100Nutrition) || 0);
      if (fee <= 0) return 0;
      const t = Math.min(Math.max(Number(tier) || 4, 4), 8);
      const e = item && item.supportsEnchant === false
        ? 0
        : Math.min(Math.max(Number(enchantment) || 0, 0), 4);
      const effTier = Math.min(Math.max(t + e, 4), 12);
      const totalMats = getTotalMaterialsPerCraft(item);
      const itemValue = totalMats * Math.pow(2, effTier);
      const nutrition = itemValue * 0.1125;
      return Math.ceil((nutrition / 100) * fee);
    }

    /**
     * Calculates crafting fame and journals filled per craft.
     * Note: Artifact fame does NOT fill crafting journals, and journals are NEVER affected by RRR.
     */
    function calculateJournalMetrics({ item, tier = 4, enchantment = 0 }) {
      const t = Math.min(Math.max(Number(tier) || 4, 4), 8);
      const e = item && item.supportsEnchant === false
        ? 0
        : Math.min(Math.max(Number(enchantment) || 0, 0), 4);
      const totalMats = getTotalMaterialsPerCraft(item);
      const baseFamePerUnit = FAME_PER_MATERIAL_UNIT[t] || 22.5;
      const famePerCraft = totalMats * baseFamePerUnit * Math.pow(2, e);
      const journalFameReq = JOURNAL_FAME_REQUIRED[t] || 3600;
      const journalsPerCraft = famePerCraft / journalFameReq;
      return {
        famePerCraft,
        journalFameReq,
        journalsPerCraft,
      };
    }

    function getMarketFeeRate({ hasPremium = true, orderType = 'sell_order', directTrade = false }) {
      if (directTrade || orderType === 'direct_trade') return 0.0;
      const baseTax = hasPremium ? 0.04 : 0.08;
      const setupFee = orderType === 'sell_order' ? 0.025 : 0.0;
      return baseTax + setupFee;
    }

    function getBuyFeeRate({ buyOrderType = 'buy_order' }) {
      return buyOrderType === 'buy_order' ? 0.025 : 0.0;
    }

    /**
     * Simulates iterative compounding crafts for refined materials ONLY.
     * Artifacts and Journals are NOT returned by RRR.
     */
    function simulateCompoundingMaterials({
      initialCrafts,
      primaryQty,
      secondaryQty,
      returnRate,
      compound = true,
    }) {
      const batch = Math.max(1, Math.floor(Number(initialCrafts) || 1));
      const pReq = Math.max(0, Number(primaryQty) || 0);
      const sReq = Math.max(0, Number(secondaryQty) || 0);
      const rrr = Math.min(Math.max(Number(returnRate) || 0, 0), 0.95);

      const initialPrimaryBought = batch * pReq;
      const initialSecondaryBought = batch * sReq;

      if (!compound || rrr <= 0) {
        const pRet = Math.floor(initialPrimaryBought * rrr);
        const sRet = Math.floor(initialSecondaryBought * rrr);
        return {
          initialCrafts: batch,
          totalCrafts: batch,
          primaryBought: initialPrimaryBought,
          primaryUsed: initialPrimaryBought,
          primaryReturned: pRet,
          primaryLeftover: pRet,
          secondaryBought: initialSecondaryBought,
          secondaryUsed: initialSecondaryBought,
          secondaryReturned: sRet,
          secondaryLeftover: sRet,
        };
      }

      let availP = initialPrimaryBought;
      let availS = initialSecondaryBought;
      let totalCrafts = 0;
      let primaryUsed = 0;
      let primaryReturned = 0;
      let secondaryUsed = 0;
      let secondaryReturned = 0;

      let safety = 0;
      while (safety < 1000) {
        safety++;
        const canP = pReq > 0 ? Math.floor(availP / pReq) : Infinity;
        const canS = sReq > 0 ? Math.floor(availS / sReq) : Infinity;
        const craftsThisWave = Math.min(canP, canS);
        if (craftsThisWave <= 0 || !Number.isFinite(craftsThisWave)) break;

        const usedP = craftsThisWave * pReq;
        const usedS = craftsThisWave * sReq;
        const retP = Math.floor(usedP * rrr);
        const retS = Math.floor(usedS * rrr);

        totalCrafts += craftsThisWave;
        primaryUsed += usedP;
        primaryReturned += retP;
        secondaryUsed += usedS;
        secondaryReturned += retS;

        availP = availP - usedP + retP;
        availS = availS - usedS + retS;
      }

      return {
        initialCrafts: batch,
        totalCrafts,
        primaryBought: initialPrimaryBought,
        primaryUsed,
        primaryReturned,
        primaryLeftover: availP,
        secondaryBought: initialSecondaryBought,
        secondaryUsed,
        secondaryReturned,
        secondaryLeftover: availS,
      };
    }

    // -------------------------------------------------------------------------
    // 3. FULL CRAFTING BATCH SIMULATION
    // -------------------------------------------------------------------------

    function simulateCrafting({
      itemId = 'broadsword',
      tier = 4,
      enchantment = 0,
      cityId = 'Lymhurst',
      useFocus = true,
      dailyBonusPercent = 0,
      customRRR = null,
      hideoutZoneQuality = 6,
      hideoutPowerLevel = 9,
      hideoutBiomeMatch = true,
      compound = true,
      useJournals = true,
      quantity = 10,
      mastery = 100,
      spec = 100,
      crossSpec = 0,
      feePer100Nutrition = 400,
      primaryMatPrice = 300,
      secondaryMatPrice = 300,
      artifactPrice = 0,
      emptyJournalPrice = 4000,
      fullJournalPrice = 12000,
      outputPrice = 10000,
      marketFeeRate = 0.065,
      buyFeeRate = 0.025,
    }) {
      const item = ITEMS.find((i) => i.id === itemId) || ITEMS[0];
      const safeTier = Math.min(Math.max(Number(tier) || 4, 4), 8);
      const safeEnchant = item.supportsEnchant === false
        ? 0
        : Math.min(Math.max(Number(enchantment) || 0, 0), 4);

      const rrrObj = calculateCraftingRRR({
        cityId,
        item,
        useFocus,
        dailyBonusPercent,
        customRRR,
        hideoutZoneQuality,
        hideoutPowerLevel,
        hideoutBiomeMatch,
      });

      const comp = simulateCompoundingMaterials({
        initialCrafts: quantity,
        primaryQty: item.primaryQty,
        secondaryQty: item.secondaryQty,
        returnRate: rrrObj.rate,
        compound,
      });

      const totalCrafts = comp.totalCrafts;

      // Refined Material Costs & Leftover Credit
      const pPrice = Math.max(0, Number(primaryMatPrice) || 0);
      const sPrice = item.secondaryMat ? Math.max(0, Number(secondaryMatPrice) || 0) : 0;

      const primaryPurchaseCost = comp.primaryBought * pPrice;
      const secondaryPurchaseCost = comp.secondaryBought * sPrice;
      const leftoverPrimaryValue = comp.primaryLeftover * pPrice;
      const leftoverSecondaryValue = comp.secondaryLeftover * sPrice;
      const totalLeftoverValue = leftoverPrimaryValue + leftoverSecondaryValue;

      const netPrimaryCost = (comp.primaryBought - comp.primaryLeftover) * pPrice;
      const netSecondaryCost = (comp.secondaryBought - comp.secondaryLeftover) * sPrice;

      // Artifact Cost (1 per craft, NEVER affected by RRR — 0 returned, 0 leftover)
      const hasArtifact = Boolean(item.artifactCode);
      const artUnitPrice = hasArtifact ? Math.max(0, Number(artifactPrice) || 0) : 0;
      const artifactsBought = hasArtifact ? totalCrafts : 0;
      const artifactsUsed = artifactsBought;
      const artifactsReturned = 0;
      const artifactsLeftover = 0;
      const artifactPurchaseCost = artifactsBought * artUnitPrice;

      // Station Fee
      const stationFeePerCraft = calculateCraftingStationFee({
        item,
        tier: safeTier,
        enchantment: safeEnchant,
        feePer100Nutrition,
      });
      const totalStationFee = totalCrafts * stationFeePerCraft;

      // Focus Cost
      const focusPerCraft = useFocus
        ? calculateCraftingFocusCost({
            item,
            tier: safeTier,
            enchantment: safeEnchant,
            mastery,
            spec,
            crossSpec,
          })
        : 0;
      const totalFocusCost = totalCrafts * focusPerCraft;

      // Journals (NEVER affected by RRR — 1 empty journal consumed per 1 full journal produced)
      const jMetrics = calculateJournalMetrics({
        item,
        tier: safeTier,
        enchantment: safeEnchant,
      });
      const totalFame = totalCrafts * jMetrics.famePerCraft;
      const journalsFilled = useJournals ? totalCrafts * jMetrics.journalsPerCraft : 0;
      const journalsReturned = 0;
      const eJPrice = useJournals ? Math.max(0, Number(emptyJournalPrice) || 0) : 0;
      const fJPrice = useJournals ? Math.max(0, Number(fullJournalPrice) || 0) : 0;
      const journalPurchaseCost = journalsFilled * eJPrice;
      const journalGrossRevenue = journalsFilled * fJPrice;
      const journalMarketTax = journalGrossRevenue * marketFeeRate;

      // Buy Order Setup Fees (on net consumed materials + artifacts + empty journals)
      const totalNetMaterialPurchase = netPrimaryCost + netSecondaryCost + artifactPurchaseCost + journalPurchaseCost;
      const totalBuyOrderFee = totalNetMaterialPurchase * buyFeeRate;

      // Output Revenue & Sales Tax
      const outPrice = Math.max(0, Number(outputPrice) || 0);
      const itemGrossRevenue = totalCrafts * outPrice;
      const itemMarketTax = itemGrossRevenue * marketFeeRate;

      // Totals
      const totalProductionCost = netPrimaryCost + netSecondaryCost + artifactPurchaseCost + journalPurchaseCost + totalBuyOrderFee + totalStationFee;
      const grossRevenue = itemGrossRevenue + journalGrossRevenue;
      const totalMarketTax = itemMarketTax + journalMarketTax;
      const netRevenue = grossRevenue - totalMarketTax;
      const netProfit = netRevenue - totalProductionCost;

      const profitPerCraft = totalCrafts > 0 ? netProfit / totalCrafts : 0;
      const profitMargin = totalProductionCost > 0
        ? (netProfit / totalProductionCost) * 100
        : (netProfit > 0 ? 100 : 0);
      const silverPerFocus = totalFocusCost > 0 ? netProfit / totalFocusCost : null;

      // Net Crafted Cost / Unit (net of journal revenue credit)
      const netJournalProfit = (journalGrossRevenue - journalMarketTax) - (journalPurchaseCost * (1 + buyFeeRate));
      const netCostForItems = Math.max(0, totalProductionCost - (journalGrossRevenue - journalMarketTax));
      const unitCraftCost = totalCrafts > 0 ? netCostForItems / totalCrafts : 0;
      const breakEvenPrice = totalCrafts > 0 && (1 - marketFeeRate) > 0
        ? unitCraftCost / (1 - marketFeeRate)
        : 0;

      return {
        item,
        tier: safeTier,
        enchantment: safeEnchant,
        cityId,
        rrr: rrrObj,
        compound,
        useJournals,
        hasArtifact,
        initialCrafts: comp.initialCrafts,
        totalCrafts,
        primaryBought: comp.primaryBought,
        primaryUsed: comp.primaryUsed,
        primaryReturned: comp.primaryReturned,
        primaryLeftover: comp.primaryLeftover,
        secondaryBought: comp.secondaryBought,
        secondaryUsed: comp.secondaryUsed,
        secondaryReturned: comp.secondaryReturned,
        secondaryLeftover: comp.secondaryLeftover,
        artifactsBought,
        artifactsUsed,
        artifactsReturned,
        artifactsLeftover,
        artifactPurchaseCost,
        primaryPurchaseCost,
        secondaryPurchaseCost,
        leftoverPrimaryValue,
        leftoverSecondaryValue,
        totalLeftoverValue,
        netPrimaryCost,
        netSecondaryCost,
        stationFeePerCraft,
        totalStationFee,
        focusPerCraft,
        totalFocusCost,
        totalFame,
        journalsFilled,
        journalsReturned,
        journalPurchaseCost,
        journalGrossRevenue,
        netJournalProfit,
        totalBuyOrderFee,
        totalProductionCost,
        itemGrossRevenue,
        grossRevenue,
        totalMarketTax,
        netRevenue,
        netProfit,
        profitPerCraft,
        profitMargin,
        silverPerFocus,
        unitCraftCost,
        breakEvenPrice,
      };
    }

    function fitBatchToCraftingFocus({
      focusPool = 30000,
      item,
      tier = 4,
      enchantment = 0,
      cityId = 'Lymhurst',
      dailyBonusPercent = 0,
      customRRR = null,
      hideoutZoneQuality = 6,
      hideoutPowerLevel = 9,
      hideoutBiomeMatch = true,
      compound = true,
      mastery = 100,
      spec = 100,
      crossSpec = 0,
    }) {
      const focusPerCraft = calculateCraftingFocusCost({
        item,
        tier,
        enchantment,
        mastery,
        spec,
        crossSpec,
      });
      if (focusPerCraft <= 0) return 10;

      const rrrObj = calculateCraftingRRR({
        cityId,
        item,
        useFocus: true,
        dailyBonusPercent,
        customRRR,
        hideoutZoneQuality,
        hideoutPowerLevel,
        hideoutBiomeMatch,
      });

      const maxTotalCrafts = Math.max(1, Math.floor(focusPool / focusPerCraft));
      if (!compound || rrrObj.rate <= 0) {
        return maxTotalCrafts;
      }

      let low = 1;
      let high = maxTotalCrafts;
      let best = 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const sim = simulateCompoundingMaterials({
          initialCrafts: mid,
          primaryQty: item.primaryQty,
          secondaryQty: item.secondaryQty,
          returnRate: rrrObj.rate,
          compound: true,
        });
        if (sim.totalCrafts <= maxTotalCrafts) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return Math.max(1, best);
    }

    function getRenderUrl(itemId, quality = 1, size = 64) {
      return `https://render.albiononline.com/v1/item/${encodeURIComponent(itemId)}.png?size=${size}&quality=${quality}`;
    }

    return {
      CRAFTING_CITIES,
      CITY_SPECIALTY_LPB,
      FOCUS_BONUS_LPB,
      HIDEOUT_ZONE_QUALITY_LPB,
      HIDEOUT_POWER_GENERAL_LPB,
      HIDEOUT_POWER_SPECIALTY_LPB,
      MATERIALS,
      CATEGORIES,
      TREES,
      FAME_PER_MATERIAL_UNIT,
      JOURNAL_FAME_REQUIRED,
      BASE_FOCUS_PER_8_UNITS,
      ITEMS,
      getMaterialItemId,
      getArtifactItemId,
      getCraftedItemId,
      getJournalItemIds,
      getTotalMaterialsPerCraft,
      calculateCraftingRRR,
      calculateCraftingFocusCost,
      calculateCraftingStationFee,
      calculateJournalMetrics,
      getMarketFeeRate,
      getBuyFeeRate,
      simulateCompoundingMaterials,
      simulateCrafting,
      fitBatchToCraftingFocus,
      getRenderUrl,
    };
  }

  const AlbionCraftingRules = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = AlbionCraftingRules;
  if (typeof window !== 'undefined') window.AlbionCraftingRules = AlbionCraftingRules;
  if (typeof globalThis !== 'undefined') globalThis.AlbionCraftingRules = AlbionCraftingRules;
})();
