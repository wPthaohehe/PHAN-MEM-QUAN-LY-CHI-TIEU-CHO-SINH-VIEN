/* ============================================================
   Poketto - Biểu đồ SVG thuần (không cần thư viện ngoài, chạy offline)
   - Charts.doughnut(container, items, opts)  biểu đồ tròn + chú thích
   - Charts.bars(container, data, opts)       biểu đồ cột nhóm (thu/chi theo thời gian)
   ============================================================ */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  const money = new Intl.NumberFormat('vi-VN');

  function short(n) {
    const a = Math.abs(n);
    const f = function (v) { return String(Math.round(v * 10) / 10).replace('.', ','); };
    if (a >= 1e9) return f(a / 1e9) + ' tỷ';
    if (a >= 1e6) return f(a / 1e6) + 'tr';
    if (a >= 1e3) return f(a / 1e3) + 'k';
    return String(a);
  }

  function empty(container, message) {
    container.innerHTML = '<div class="empty small"><div class="empty-icon">📭</div><p>' + esc(message || 'Chưa có dữ liệu') + '</p></div>';
  }

  /* ---------- Biểu đồ tròn ---------- */
  /**
   * items: [{label, value, color, icon?}]
   * opts:  {centerTop, centerBottom}
   */
  function doughnut(container, items, opts) {
    opts = opts || {};
    items = (items || []).filter(function (i) { return i.value > 0; });
    const total = items.reduce(function (s, i) { return s + i.value; }, 0);
    if (!total) { empty(container, opts.emptyText || 'Chưa có dữ liệu'); return; }

    const cx = 100, cy = 100, r = 70, sw = 28;
    const C = 2 * Math.PI * r;
    let offset = 0;
    const circles = items.map(function (it) {
      const len = it.value / total * C;
      const pct = (it.value / total * 100).toFixed(1).replace('.', ',');
      const c = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + esc(it.color) +
        '" stroke-width="' + sw + '" stroke-dasharray="' + len.toFixed(3) + ' ' + (C - len).toFixed(3) +
        '" stroke-dashoffset="' + (-offset).toFixed(3) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')">' +
        '<title>' + esc(it.label) + ': ' + money.format(it.value) + ' ₫ (' + pct + '%)</title></circle>';
      offset += len;
      return c;
    }).join('');

    const center =
      (opts.centerTop ? '<text x="100" y="94" text-anchor="middle" class="chart-center-top">' + esc(opts.centerTop) + '</text>' : '') +
      (opts.centerBottom ? '<text x="100" y="116" text-anchor="middle" class="chart-center-bottom">' + esc(opts.centerBottom) + '</text>' : '');

    const legend = items.map(function (it) {
      const pct = (it.value / total * 100).toFixed(1).replace('.', ',');
      return '<li><span class="dot" style="background:' + esc(it.color) + '"></span>' +
        '<span class="legend-name">' + (it.icon ? esc(it.icon) + ' ' : '') + esc(it.label) + '</span>' +
        '<span class="legend-val">' + money.format(it.value) + ' ₫ <em>' + pct + '%</em></span></li>';
    }).join('');

    container.innerHTML =
      '<div class="donut-wrap">' +
      '<svg class="donut" viewBox="0 0 200 200" role="img" aria-label="Biểu đồ tròn">' + circles + center + '</svg>' +
      '<ul class="legend">' + legend + '</ul></div>';
  }

  /* ---------- Biểu đồ cột nhóm ---------- */
  function niceMax(v) {
    if (v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return nice * pow;
  }

  /**
   * data: [{label, values: {income: n, expense: n}}]
   * opts: {series: [{key, name, color}], height}
   */
  function bars(container, data, opts) {
    opts = opts || {};
    const series = opts.series || [
      { key: 'income', name: 'Thu', color: '#3f9d6f' },
      { key: 'expense', name: 'Chi', color: '#e5645b' }
    ];
    const height = opts.height || 260;

    // Hủy observer cũ nếu vẽ lại cùng container
    if (container._chartObserver) { container._chartObserver.disconnect(); container._chartObserver = null; }

    const maxVal = Math.max.apply(null, [0].concat(data.map(function (d) {
      return Math.max.apply(null, series.map(function (s) { return d.values[s.key] || 0; }));
    })));
    if (!data.length || maxVal <= 0) { empty(container, opts.emptyText || 'Chưa có dữ liệu'); return; }

    let lastWidth = 0;

    function render() {
      const W = Math.max(container.clientWidth || 600, 300);
      lastWidth = W;
      const H = height;
      const m = { l: 48, r: 8, t: 12, b: 30 };
      const plotW = W - m.l - m.r;
      const plotH = H - m.t - m.b;
      const top = niceMax(maxVal);
      const ticks = 4;

      let grid = '';
      for (let i = 0; i <= ticks; i++) {
        const v = top / ticks * i;
        const y = m.t + plotH - (v / top) * plotH;
        grid += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="chart-grid"/>' +
          '<text x="' + (m.l - 6) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="chart-axis">' + short(v) + '</text>';
      }

      const groupW = plotW / data.length;
      const barW = Math.max(3, Math.min(28, groupW * 0.72 / series.length));
      const skip = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 44))));

      let rects = '';
      let labels = '';
      data.forEach(function (d, i) {
        const gx = m.l + i * groupW + (groupW - barW * series.length) / 2;
        series.forEach(function (s, si) {
          const v = d.values[s.key] || 0;
          const h = (v / top) * plotH;
          if (v > 0) {
            rects += '<rect x="' + (gx + si * barW).toFixed(1) + '" y="' + (m.t + plotH - h).toFixed(1) +
              '" width="' + barW.toFixed(1) + '" height="' + Math.max(h, 1).toFixed(1) + '" rx="2" fill="' + esc(s.color) + '">' +
              '<title>' + esc(d.label) + ' - ' + esc(s.name) + ': ' + money.format(v) + ' ₫</title></rect>';
          }
        });
        if (i % skip === 0) {
          labels += '<text x="' + (m.l + i * groupW + groupW / 2).toFixed(1) + '" y="' + (H - 10) +
            '" text-anchor="middle" class="chart-axis">' + esc(d.label) + '</text>';
        }
      });

      const legend = '<div class="bar-legend">' + series.map(function (s) {
        return '<span><i class="dot" style="background:' + esc(s.color) + '"></i>' + esc(s.name) + '</span>';
      }).join('') + '</div>';

      container.innerHTML = legend +
        '<svg class="bars" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Biểu đồ cột">' +
        grid + rects + labels + '</svg>';
    }

    render();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(function () {
        if (Math.abs((container.clientWidth || 0) - lastWidth) > 2) render();
      });
      ro.observe(container);
      container._chartObserver = ro;
    }
  }

  global.Charts = { doughnut: doughnut, bars: bars, empty: empty, short: short };
})(window);
