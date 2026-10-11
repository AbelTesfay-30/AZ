/* ═══════════════════════════════════════════════════════════════
   AZAHELLTRADES | Trading Journal — ER. Abel Tesfay
   app.js
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const STORAGE_KEY = 'azahell_trades_v1';

/* ── Load from localStorage ──────────────────────────────────── */
let trades = [];
try {
  trades = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  if (!Array.isArray(trades)) trades = [];
} catch { trades = []; }

/* ── Set default datetime to now ─────────────────────────────── */
(function setNow() {
  const n = new Date();
  n.setMinutes(n.getMinutes() - n.getTimezoneOffset());
  document.getElementById('field-date').value = n.toISOString().slice(0, 16);
})();

/* ── Save ────────────────────────────────────────────────────── */
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

/* ── Stats ───────────────────────────────────────────────────── */
function calculateStats() {
  const total = trades.length;

  // Trade counter
  document.getElementById('stat-total').innerText = `${total} / 100`;
  document.getElementById('stat-bar-trades').style.width = `${Math.min((total / 100) * 100, 100)}%`;

  // Trade count badge
  const countEl = document.getElementById('trade-count');
  if (countEl) countEl.innerText = total > 0 ? `${total} trade${total > 1 ? 's' : ''}` : '';

  if (total === 0) {
    document.getElementById('stat-winrate').innerText   = '0.0%';
    document.getElementById('stat-wl').innerText        = '0W · 0L · 0BE';
    document.getElementById('stat-pnl').innerText       = '+0.00%';
    document.getElementById('stat-pnl').className       = 'stat-value';
    document.getElementById('stat-discipline').innerText = '—';
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('target-progress-text').innerText = '0.00% / +10.00%';
    return;
  }

  const wins   = trades.filter(t => t.outcome === 'WIN').length;
  const losses = trades.filter(t => t.outcome === 'LOSS').length;
  const be     = trades.filter(t => t.outcome === 'BE').length;

  const winrate = ((wins / total) * 100).toFixed(1);
  document.getElementById('stat-winrate').innerText = `${winrate}%`;
  document.getElementById('stat-wl').innerText      = `${wins}W · ${losses}L · ${be}BE`;

  // Net PnL
  let totalPnl = 0;
  let perfectCount = 0;
  trades.forEach(t => {
    if (t.outcome === 'WIN')  totalPnl += (t.risk * t.rr);
    if (t.outcome === 'LOSS') totalPnl -= t.risk;
    if (t.score === 5) perfectCount++;
  });

  const pnlEl = document.getElementById('stat-pnl');
  pnlEl.innerText = totalPnl >= 0 ? `+${totalPnl.toFixed(2)}%` : `${totalPnl.toFixed(2)}%`;
  pnlEl.className = 'stat-value ' + (totalPnl > 0 ? 'val-green' : totalPnl < 0 ? 'val-red' : '');

  // Discipline
  const discPct = ((perfectCount / total) * 100).toFixed(0);
  document.getElementById('stat-discipline').innerText = `${discPct}% (${perfectCount}/${total})`;

  // Prop firm progress bar
  const barPct = Math.max(0, Math.min(100, (totalPnl / 10) * 100));
  document.getElementById('progress-bar').style.width = `${barPct}%`;
  document.getElementById('target-progress-text').innerText =
    `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}% / +10.00%`;
}

/* ── Render desktop table ────────────────────────────────────── */
function renderTable() {
  const tbody     = document.getElementById('trades-body');
  const emptyEl   = document.getElementById('empty-state');
  const mobileEl  = document.getElementById('mobile-trades');
  tbody.innerHTML  = '';
  mobileEl.innerHTML = '';

  if (trades.length === 0) {
    emptyEl.classList.add('show');
    return;
  }
  emptyEl.classList.remove('show');

  // Newest first
  trades.slice().reverse().forEach((trade, revIdx) => {
    const origIdx  = trades.length - 1 - revIdx;
    const num      = origIdx + 1;
    const dateStr  = (trade.date || '').replace('T', '  ');

    // Outcome badge
    const outClass = trade.outcome === 'WIN' ? 'badge-win' : trade.outcome === 'LOSS' ? 'badge-loss' : 'badge-be';
    const outLabel = trade.outcome === 'BE' ? 'B/E' : trade.outcome;

    // Direction badge
    const dirClass = (trade.direction || '').includes('BUY') ? 'badge-buy' : 'badge-sell';

    // Net %
    let netPct = 0;
    let netStr = '0.00%';
    let netClass = '';
    if (trade.outcome === 'WIN') {
      netPct   = trade.risk * trade.rr;
      netStr   = `+${netPct.toFixed(2)}%`;
      netClass = 'val-green';
    } else if (trade.outcome === 'LOSS') {
      netPct   = -trade.risk;
      netStr   = `-${trade.risk.toFixed(2)}%`;
      netClass = 'val-red';
    }

    // Rule score
    const sc = trade.score;
    const scClass = sc === 5 ? 'score-perfect' : sc >= 3 ? 'score-ok' : 'score-low';
    const scLabel = `${sc}/5${sc === 5 ? ' ★' : ''}`;

    // Desktop row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-num">#${num}</td>
      <td style="white-space:nowrap; font-size:0.78rem;">${escHtml(dateStr)}</td>
      <td class="td-pair">${escHtml(trade.pair)}</td>
      <td class="td-session">${escHtml(trade.session || '')}</td>
      <td><span class="badge ${dirClass}">${escHtml((trade.direction || '').split(' ')[0])}</span></td>
      <td><span class="badge ${outClass}">${outLabel}</span></td>
      <td class="td-pnl ${netClass}">${netStr}</td>
      <td style="font-size:0.78rem; color:var(--muted);">${trade.rr > 0 ? trade.rr.toFixed(1) + 'R' : '—'}</td>
      <td class="${scClass}">${scLabel}</td>
      <td class="td-notes" title="${escHtml(trade.notes || '')}">${escHtml(trade.notes || '—')}</td>
      <td><button class="btn-del" data-idx="${origIdx}" title="Delete trade #${num}">✕</button></td>
    `;
    tbody.appendChild(tr);

    // Mobile card
    const card = document.createElement('div');
    card.className = 'trade-card';
    card.innerHTML = `
      <div class="tc-header">
        <span class="tc-num">#${num}</span>
        <span class="tc-pair">${escHtml(trade.pair)}</span>
        <span class="badge ${outClass}" style="margin-left:4px;">${outLabel}</span>
        <span class="tc-date">${escHtml(dateStr)}</span>
      </div>
      <div class="tc-body">
        <div class="tc-item">
          <span class="ti-label">Session</span>
          ${escHtml(trade.session || '—')}
        </div>
        <div class="tc-item">
          <span class="ti-label">Direction</span>
          <span class="badge ${dirClass}">${escHtml((trade.direction || '').split(' ')[0])}</span>
        </div>
        <div class="tc-item">
          <span class="ti-label">Risk</span>
          ${trade.risk}%
        </div>
        <div class="tc-item">
          <span class="ti-label">Net P&L</span>
          <span class="${netClass}" style="font-weight:700;">${netStr}</span>
        </div>
        <div class="tc-item">
          <span class="ti-label">R:R</span>
          ${trade.rr > 0 ? trade.rr.toFixed(1) + 'R' : '—'}
        </div>
        <div class="tc-item">
          <span class="ti-label">Rules</span>
          <span class="${scClass}">${scLabel}</span>
        </div>
      </div>
      ${trade.notes ? `<div class="tc-notes"><strong style="color:var(--muted);">Notes:</strong> ${escHtml(trade.notes)}</div>` : ''}
      <div class="tc-footer">
        <button class="btn-del" data-idx="${origIdx}" title="Delete trade #${num}">✕ Delete</button>
      </div>
    `;
    mobileEl.appendChild(card);
  });

  // Bind delete buttons (both table and mobile)
  document.querySelectorAll('.btn-del[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => deleteTrade(Number(btn.dataset.idx)));
  });
}

/* ── Delete ──────────────────────────────────────────────────── */
window.deleteTrade = function (index) {
  if (confirm(`Delete Trade #${index + 1} (${trades[index]?.pair || ''} — ${trades[index]?.outcome || ''})?`)) {
    trades.splice(index, 1);
    save();
    calculateStats();
    renderTable();
  }
};

/* ── Form submit ─────────────────────────────────────────────── */
document.getElementById('trade-form').addEventListener('submit', e => {
  e.preventDefault();

  let score = 0;
  if (document.getElementById('chk-htf').checked)   score++;
  if (document.getElementById('chk-sweep').checked) score++;
  if (document.getElementById('chk-mss').checked)   score++;
  if (document.getElementById('chk-eq').checked)    score++;
  if (document.getElementById('chk-risk').checked)  score++;

  const trade = {
    date:      document.getElementById('field-date').value,
    pair:      document.getElementById('field-pair').value,
    session:   document.getElementById('field-session').value,
    direction: document.getElementById('field-direction').value,
    risk:      parseFloat(document.getElementById('field-risk').value)   || 0.75,
    outcome:   document.getElementById('field-outcome').value,
    rr:        parseFloat(document.getElementById('field-rr').value)     || 0,
    score,
    notes:     document.getElementById('field-notes').value.trim()
  };

  trades.push(trade);
  save();

  // Reset only textarea and checklist; keep other fields for quick re-entry
  document.getElementById('field-notes').value = '';
  ['chk-htf','chk-sweep','chk-mss','chk-eq','chk-risk'].forEach(id => {
    document.getElementById(id).checked = true;
  });

  calculateStats();
  renderTable();

  // Scroll to history on mobile
  document.getElementById('trades-body').closest?.('.card')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
});

/* ── Clear button ────────────────────────────────────────────── */
document.getElementById('btn-clear').addEventListener('click', () => {
  document.getElementById('trade-form').reset();
  // Re-apply default datetime
  const n = new Date();
  n.setMinutes(n.getMinutes() - n.getTimezoneOffset());
  document.getElementById('field-date').value = n.toISOString().slice(0, 16);
});

/* ── CSV Export ──────────────────────────────────────────────── */
document.getElementById('btn-export').addEventListener('click', () => {
  if (trades.length === 0) return alert('No trades to export yet!');

  const headers = [
    'Trade_#', 'Date_Time', 'Pair', 'Session', 'Direction',
    'Outcome', 'Risk_%', 'Realized_RR', 'Net_PnL_%',
    'Rule_HTF', 'Rule_Sweep', 'Rule_MSS', 'Rule_EQ', 'Rule_1Trade',
    'Checklist_Score', 'Notes'
  ];

  const rows = trades.map((t, i) => {
    let netPnl = 0;
    if (t.outcome === 'WIN')  netPnl = +(t.risk * t.rr).toFixed(4);
    if (t.outcome === 'LOSS') netPnl = +(-t.risk).toFixed(4);

    // We don't store individual rule booleans in legacy data, so derive from score if needed
    return [
      i + 1,
      t.date || '',
      t.pair || '',
      t.session || '',
      t.direction || '',
      t.outcome || '',
      t.risk,
      t.rr,
      netPnl,
      '', '', '', '', '',   // individual rules not stored in legacy format
      t.score,
      (t.notes || '').replace(/"/g, '""')
    ];
  });

  let csv = '\uFEFF'; // BOM for Excel
  csv += headers.map(h => `"${h}"`).join(',') + '\r\n';
  rows.forEach(row => {
    csv += row.map((v, i) => {
      // Wrap strings in quotes
      if (typeof v === 'string') return `"${v}"`;
      return v;
    }).join(',') + '\r\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `AZAHELLTRADES_AbelTesfay_${new Date().toISOString().slice(0, 10)}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/* ── XSS helper ──────────────────────────────────────────────── */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Init ────────────────────────────────────────────────────── */
calculateStats();
renderTable();
