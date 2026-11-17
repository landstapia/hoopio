/* datatable.js - a small jQuery table plugin with the main DataTables features:
   global search, a filter box under every column header, click-to-sort, page length and paging.
   (The real DataTables library could not be downloaded when this app was built, so this file does the same job offline.)

   Use:  $('#mytable').dataTableLite({ pageLength: 25 });
   The table needs <thead> and <tbody>. A cell can carry data-sort="123" to sort by a different value than its text.
   A <tfoot> (for example a totals row) is never sorted or filtered.

   Options
     pageLength  rows per page (0 = all)                         default 25
     search      show the search box + page length selector      default true
     filters     show a filter box under every column title     default true
     paging      show the page buttons                           default true
     order       first sort, e.g. [3, 'desc'] (column index)     default none
     stateKey    remember sort / search / page under this name   default: the table's data-dtkey attribute
                 (so a page that redraws itself keeps the sorting - used by the live scoresheet rosters)

   Clicking a column title sorts ascending; clicking it again reverses the order. */

const DT_STATE = {};   // remembered state per stateKey: { sortCol, sortDir, page, pageLength, search, filters }

(function ($) {
  $.fn.dataTableLite = function (options) {
    const opts = $.extend({ pageLength: 25, search: true, filters: true, paging: true, order: null, stateKey: null,
      placeholder: 'Search name (Last, First) or number…' }, options);

    return this.each(function () {
      const $table = $(this);
      const key = opts.stateKey || $table.attr('data-dtkey') || null;
      const $tbody = $table.find('tbody');
      const rows = $tbody.find('> tr').get();
      const heads = $table.find('thead tr').first().find('th');
      const saved = (key && DT_STATE[key]) || {};

      let sortCol = saved.sortCol ?? (opts.order ? opts.order[0] : -1);
      let sortDir = saved.sortDir ?? (opts.order ? (opts.order[1] == 'desc' ? -1 : 1) : 1);
      let page = saved.page || 0;
      let pageLength = saved.pageLength ?? opts.pageLength;

      const cell = (row, i) => $(row).children('td').eq(i);
      const textOf = (row, i) => cell(row, i).text().trim().toLowerCase();
      const sortKey = (row, i) => {
        const c = cell(row, i), v = String(c.attr('data-sort') ?? c.text()).trim();
        return /^-?\d+(\.\d+)?$/.test(v) ? parseFloat(v) : v.toLowerCase();
      };
      // numbers sort before text; text sorts "naturally" (2 before 10)
      const compare = (x, y) => {
        const nx = typeof x == 'number', ny = typeof y == 'number';
        if (nx && ny) return x - y;
        if (nx) return -1;
        if (ny) return 1;
        return String(x).localeCompare(String(y), undefined, { numeric: true });
      };

      // Controls: search box + page length above, info + pager below (each one is optional)
      let $bar = $(), $pager = $();
      if (opts.search) {
        $bar = $(`<div class="dt-bar">
            <label class="fl xl"><input class="dt-search" placeholder=" "><span>${opts.placeholder}</span></label>
            <label class="fl on xs"><select class="dt-len"><option>10</option><option>25</option><option>50</option><option value="0">All</option></select><span>Rows</span></label>
            <span class="dt-info"></span></div>`).insertBefore($table.parent('.dt-wrap').length ? $table.parent() : $table);
        $bar.find('.dt-len').val(String(pageLength));
        $bar.find('.dt-search').val(saved.search || '');
      }
      if (opts.paging) $pager = $('<div class="dt-pager"></div>').insertAfter($table.parent('.dt-wrap').length ? $table.parent() : $table);

      // A filter input under every column title
      let $filters = $();
      if (opts.filters) {
        $filters = $('<tr class="dt-filters"></tr>');
        heads.each((i) => $filters.append(`<th><input data-col="${i}" placeholder="filter" value="${((saved.filters || [])[i] || '').replace(/"/g, '&quot;')}"></th>`));
        $table.find('thead').append($filters);
      }
      heads.css('cursor', 'pointer').attr('title', 'Click to sort');

      const remember = () => {
        if (!key) return;
        DT_STATE[key] = { sortCol, sortDir, page, pageLength,
          search: opts.search ? $bar.find('.dt-search').val() : '',
          filters: opts.filters ? $filters.find('input').map((i, el) => $(el).val()).get() : [] };
      };

      function draw() {
        const words = opts.search ? $bar.find('.dt-search').val().toLowerCase().split(/\s+/).filter(Boolean) : [];
        const colFilters = opts.filters ? $filters.find('input').map((i, el) => $(el).val().toLowerCase().trim()).get() : [];
        let list = rows.filter(row => {
          if (!words.length && !colFilters.some(Boolean)) return true;
          const all = $(row).children('td').map((i, c) => $(c).text()).get().join(' | ').toLowerCase();
          return words.every(w => all.includes(w)) && colFilters.every((v, i) => !v || textOf(row, i).includes(v));
        });
        if (sortCol >= 0) list = list.map(r => [r, sortKey(r, sortCol)]).sort((a, b) => compare(a[1], b[1]) * sortDir).map(x => x[0]);
        const size = pageLength || list.length || 1;
        const pages = Math.max(1, Math.ceil(list.length / size));
        page = Math.min(page, pages - 1);
        const shown = list.slice(page * size, page * size + size);
        $tbody.children().detach();
        $tbody.append(shown);
        if (opts.search) $bar.find('.dt-info').text(list.length ? `Showing ${page * size + 1}–${page * size + shown.length} of ${list.length}` : 'No matching rows');
        if (opts.paging) {
          $pager.empty();
          if (pages > 1) for (let p = 0; p < pages; p++)
            $(`<button class="${p == page ? 'cur' : ''}">${p + 1}</button>`).on('click', () => { page = p; draw(); }).appendTo($pager);
        }
        heads.each((i, th) => $(th).attr('data-dir', i == sortCol ? (sortDir > 0 ? '▲' : '▼') : ''));
        remember();
      }

      if (opts.search) {
        $bar.on('input', '.dt-search', () => { page = 0; draw(); });
        $bar.on('change', '.dt-len', function () { pageLength = +this.value; page = 0; draw(); });
      }
      $filters.on('input', 'input', () => { page = 0; draw(); });
      $filters.on('click', e => e.stopPropagation());
      heads.on('click', function () {
        const i = heads.index(this);
        if (sortCol != i) { sortCol = i; sortDir = 1; }
        else sortDir = -sortDir;                 // same column again: ascending <-> descending
        draw();
      });
      draw();
    });
  };
})(jQuery);
