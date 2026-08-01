'use client';

import { useState, type CSSProperties } from 'react';

const TOTAL_RECORDS = 100;
const FULL_PRICE = 12;
const PRESETS = [10, 25, 50, 100] as const;

const previewRows = [
  ['1', '0x71…8ca2', '78.4%', '148', '+$42,880'],
  ['2', '0xa4…19ef', '76.9%', '121', '+$31,240'],
  ['3', '0x2d…77b1', '74.6%', '177', '+$28,960'],
] as const;

export default function LandingRangeAccess() {
  const [selected, setSelected] = useState(25);
  const quote = Math.max(1, FULL_PRICE * selected / TOTAL_RECORDS);
  const calculation = quote === 1 && selected < 9
    ? `${selected} × 0.12 · 1 sUSD minimum`
    : `${selected} × 0.12 sUSD`;

  return (
    <section id="range-access" className="clarity-range clarity-section" aria-labelledby="range-title">
      <header className="clarity-heading clarity-heading-light pricing-heading">
        <p>RANGE PRICING DEMO</p>
        <h2 id="range-title">Pay for the data you select.</h2>
        <span>Choose a percentage of the listing. The record count and quote update immediately, before any wallet action.</span>
      </header>

      <div className="pricing-demo" aria-label="Interactive proportional range pricing demo">
        <header className="pricing-dataset">
          <div>
            <span>DATASET</span>
            <h3>Polymarket Traders by Win Rate</h3>
            <p>A ranked snapshot of 100 Polymarket traders, ordered by win rate across resolved positions.</p>
          </div>
          <dl>
            <div><dt>RECORDS</dt><dd>100</dd></div>
            <div><dt>FORMAT</dt><dd>CSV</dd></div>
            <div><dt>SNAPSHOT</dt><dd>Jul 31, 2026</dd></div>
          </dl>
        </header>

        <div className="pricing-control">
          <div className="pricing-selector">
            <div className="pricing-selector-head">
              <h3>How much data do you need?</h3>
              <output htmlFor="pricing-range">{selected}%</output>
            </div>
            <div className="pricing-range-wrap" style={{ '--pricing-selected': `${selected}%` } as CSSProperties}>
              <div className="pricing-range-track" aria-hidden="true"><i style={{ width: `${selected}%` }} /></div>
              <input id="pricing-range" className="pricing-range-input" type="range" min="1" max="100" value={selected} onChange={(event) => setSelected(Number(event.target.value))} aria-label="Percentage of records" />
            </div>
            <div className="pricing-range-scale"><span>1%</span><span>100%</span></div>
            <div className="pricing-presets" aria-label="Quick selections">
              {PRESETS.map((value) => <button key={value} type="button" data-value={value} aria-pressed={selected === value} onClick={() => setSelected(value)}>{value}%</button>)}
            </div>
          </div>

          <aside className="pricing-quote" aria-live="polite">
            <span>ESTIMATED QUOTE</span>
            <strong>{quote.toFixed(2)} <small>sUSD</small></strong>
            <dl>
              <div><dt>Selected records</dt><dd>{selected} of {TOTAL_RECORDS}</dd></div>
              <div><dt>Price calculation</dt><dd>{calculation}</dd></div>
              <div><dt>Full listing</dt><dd>12.00 sUSD</dd></div>
              <div><dt>Ranking range</dt><dd>1–{selected}</dd></div>
              <div><dt>Data avoided</dt><dd>{100 - selected}%</dd></div>
            </dl>
          </aside>
        </div>

        <div className="pricing-preview">
          <header><span>EXAMPLE PREVIEW</span><small>Top-ranked records from the selected range</small></header>
          <div className="pricing-table-wrap"><table><thead><tr><th>Rank</th><th>Trader</th><th>Win rate</th><th>Positions</th><th>Realized PnL</th></tr></thead><tbody>{previewRows.map((row) => <tr key={row[0]}>{row.map((value, index) => <td key={value} className={index === 4 ? 'pricing-positive' : undefined}>{value}</td>)}</tr>)}</tbody></table></div>
        </div>

        <div className="pricing-tech">
          <article><span>01 / SHELBY BLOB</span><h3>Complete data stays on Shelby.</h3><p>The published dataset is stored as a Shelby blob. Meris requests only the selected record range.</p></article>
          <article><span>02 / MICROPAYMENT</span><h3>Quote scales with the range.</h3><p>Paid ranges use proportional pricing with a minimum charge of 1 sUSD through a ShelbyUSD micropayment channel.</p></article>
          <article><span>03 / DELIVERY</span><h3>Funding is checked first.</h3><p>Meris verifies channel funding, then authorizes delivery of the selected records.</p></article>
        </div>
        <p className="pricing-snapshot"><b>Snapshot note:</b> This listing is a fixed snapshot captured on July 31, 2026. Preview values are illustrative and do not represent a live Polymarket leaderboard.</p>
      </div>
    </section>
  );
}
