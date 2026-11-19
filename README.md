# ⚔️ Albion Online — Standalone Tools & Calculators

Lightweight, zero-framework, offline-ready browser tools for Albion Online crafters, refiners, and traders.

---

## 📁 Project Structure

```
├── refining.html      # Standalone Refining Calculator (open directly in any browser)
├── index.html         # Launcher / entry redirect to refining.html
├── albion_rules.js    # Core game rules & verified formulas (RRR, Focus, Nutrition, Taxes)
├── albion_api.js      # Albion Online Data Project (AODP) client with 15-min cache
├── tests.js           # Automated Node.js unit test suite
├── package.json       # Minimal project config for running tests
└── README.md          # Documentation
```

---

## 🚀 How to Use

### 1. Run the Calculators
- Simply **double-click** [`refining.html`](refining.html) or [`index.html`](index.html).
- It opens directly in your default web browser (`file:///...`).
- No servers, no Node.js runtime, no builds needed.

### 2. Run the Unit Tests
To verify all economic formulas against the game's rules:

```powershell
node tests.js
# or
npm test
```

---

## 🛠️ Features Implemented

- **Resource Refining Simulator**: Ore (Metal Bars), Wood (Planks), Fiber (Cloth), Hide (Leather), Stone (Stone Blocks).
- **Tiers & Enchantments**: T2 to T8, with `.0`, `.1`, `.2`, `.3`, and `.4`.
- **Accurate Compounding**: Simulates re-refining returned raw materials across multiple rounds, including the consumption of additional lower-tier bars.
- **Dynamic Return Rates (RRR)**: City refining bonuses (Thetford, Fort Sterling, Lymhurst, Bridgewatch, Martlock), Focus, and Daily events.
- **Focus Efficiency & Cross-Spec**: Formula includes General Mastery, Target Spec, and full Tree Specialization bonuses.
- **Order Type & Taxes**: Switch between Sell Orders (+2.5% setup fee) and Instant Sell (0% setup fee) with Premium / Non-Premium tax rates.
- **AODP Live Market Prices**: Live market price fetching with color-coded scan age badges (`<30m`, `1-6h`, `6-24h`, `>24h`).
- **Discord & CSV Export**: One-click Discord monospaced table copy and CSV file download.
