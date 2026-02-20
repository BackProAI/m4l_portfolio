# Implementation Plan: PDF Generator Full Rebuild (200% Rule)

## 200% Certainty Rule (Mandatory)
Before making any code changes, be 200% certain about:
- Exact location and scope of the issue
- Correctness of the proposed fix
- No unintended side effects

If there is any doubt:
1. STOP immediately.
2. Search the codebase and/or documentation.
3. State: "I'm not 200% certain about [X]. Let me investigate..."
4. Present findings and proposed approach for discussion.

## Goal
Rebuild the PDF generator from scratch so the exported report mirrors the on-screen analysis sections shown in the provided screenshots, with improved formatting and layout consistency. Exclude the legacy text blocks that render raw tables and the specific "Asset-Class Metrics" and "Portfolio Risk Metrics" text output listed in the request.

## Scope and Inputs
Applies to the report generated when:
- "Give me a commentary on each managed fund?" = Yes
- "Include Portfolio Risk Summary?" = No

PDF must include these sections in some form (aligned to screenshots):
1. Portfolio Overview (Total Portfolio Value card)
2. Asset Allocation (chart + legend with % and $)
3. Risk Profile Assessment (current/target risk pills, alignment status card, comparison bars)
4. Portfolio Risk Summary (summary cards + asset-class metrics table) with clean PDF layout
5. Holdings Performance Overview (table + total return over time period)
6. Historical Performance Comparison (bar chart)
7. Holdings Detail Cards (managed funds + securities)
8. Detailed Analysis (Executive Summary, Portfolio Composition, Risk Profile Analysis, Alignment Assessment)
9. Diversification Analysis
10. Holdings Analysis + Performance Analysis (narrative)

Explicitly exclude these raw text blocks from the PDF output:
- Asset-Class Metrics table rendered as plain markdown text block
- Portfolio Risk Metrics lines:
  - "Portfolio Standard Deviation: 12.8%"
  - "Portfolio Variance: 0.0164"

## Non-Goals
- Do not reuse the current PDF generator layout or structure.
- Do not preserve old headers/footers or numbering logic.
- Do not embed raw markdown tables.

## Information Architecture (Page Flow)
Page order may expand based on card count; preserve section sequence and avoid orphaned headings.

1. Portfolio Overview + Asset Allocation
2. Risk Profile Assessment + Portfolio Risk Summary (visual cards + table)
3. Holdings Performance Overview + Historical Performance Comparison
4. Holdings Detail Cards (page 1)
5. Holdings Detail Cards (page 2+ if needed)
6. Detailed Analysis (Executive Summary, Composition, Risk Profile, Alignment)
7. Diversification Analysis + Holdings Analysis + Performance Analysis

## Layout and Formatting Rules (200% Rule)
- At 200% zoom, every label must be unambiguous and attached to its visual.
- Each page has a distinct section title.
- Use consistent margins and spacing; no cramped cards.
- All percentages use two decimals.
- All money values include separators and currency symbol.
- All charts have clear axis labels and non-redundant ticks.
- No repeated time period on every card; show it once per section.

## Implementation Steps

### Phase 1: Rebuild Architecture
1. Create a new PDF generator module (separate from the existing one).
2. Split PDF into explicit page components, one per section.
3. Create shared Header and Footer components:
   - Header: Section title + generated date
   - Footer: "Page X of Y" + consistent disclaimer placement

### Phase 2: Section Components (Mapped to Screenshots)

#### 2.1 Portfolio Overview
- Total portfolio value card (large numeric emphasis)

#### 2.2 Asset Allocation
- Pie chart with labels anchored to legend items
- Legend list with name, $ value, and %
- Ensure all asset classes show % with two decimals

#### 2.3 Risk Profile Assessment
- Current and target risk pills
- Alignment status card
- Risk comparison bars with inline % labels

#### 2.4 Portfolio Risk Summary
- Summary cards:
  - Portfolio Volatility
  - Portfolio Variance
  - Asset Classes Covered
- Asset-class metrics table (properly formatted PDF table, not markdown text)

#### 2.5 Holdings Performance Overview
- Table with Name, Description, Value, % Portfolio, Return
- Total return for all holdings over the time period shown once at the section footer

#### 2.6 Historical Performance Comparison
- Bar chart with clear axis label and non-redundant year labeling

#### 2.7 Holdings Detail Cards
- Two-column card grid
- Each card: name, type badge, description, value, weight, return, performance history
- "Return: N/A" styled as intentional (muted)

#### 2.8 Detailed Analysis
- Executive Summary
- Portfolio Composition (no repeated table data)
- Risk Profile Analysis
- Alignment Assessment

#### 2.9 Diversification Analysis + Holdings Analysis + Performance Analysis
- Move headings to avoid orphaned section titles
- Ensure narrative blocks have clear spacing and titles

### Phase 3: Data Consistency
- Align total return values across sections or explicitly label as different metrics
- Ensure all numeric formatting is consistent
- Remove raw markdown table rendering from analysis content

### Phase 4: QA Checklist
- All pages use distinct titles
- Page numbers are sequential
- Disclaimer placement is consistent
- No duplicate content blocks
- All sections appear in final PDF
- No raw markdown tables or the excluded text blocks appear

## Pre-Download Validation (Required)
Before the user downloads the PDF:
- Check that every required section is present
- Confirm no excluded text blocks are present
- Confirm totals and return metrics are consistent or clearly labeled
- Confirm layout passes the 200% rule

## Open Questions
- Confirm which disclaimer placement strategy to use (every page or last page only)
- Confirm whether stress test section should be renamed if no scenarios exist
