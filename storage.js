/* ============================================================
   Poketto - Lớp dữ liệu (giả lập database bằng localStorage)
   ------------------------------------------------------------
   Mọi trang KHÔNG đụng trực tiếp vào localStorage mà chỉ gọi Store.*
   Tất cả hàm đều async + luôn lọc theo người dùng đang đăng nhập,
   nên sau này chỉ cần viết lại file này để gọi API/MySQL thật
   (fetch('/api/...')) mà không phải sửa giao diện.

   "Bảng" (mỗi bảng là 1 mảng JSON trong localStorage):
     poketto_categories   {id, userId, name, type: 'income'|'expense', icon, color}
     poketto_transactions {id, userId, categoryId, amount, date 'YYYY-MM-DD', note, createdAt}
     poketto_budgets      {id, userId, categoryId, month 'YYYY-MM', limit}
     poketto_goals        {id, userId, name, target, saved, deadline|null, createdAt}
   (loại thu/chi của giao dịch được suy ra từ danh mục, giống thiết kế SQL)
   ============================================================ */
(function (global) {
  'use strict';

  const KEYS = {
    categories: 'poketto_categories',
    transactions: 'poketto_transactions',
    budgets: 'poketto_budgets',
    goals: 'poketto_goals',
    users: 'poketto_users',
    seeded: 'poketto_categories_seeded'
  };

  const MAX_AMOUNT = 999999999999; // < 1.000 tỷ, khớp DECIMAL(15,2) trong SQL

  // Cùng quy tắc với trang đăng ký
  const NAME_REGEX = /^[\p{L}\s]{2,50}$/u;
  const PHONE_REGEX = /^(0|\+84)\d{9}$/;
  const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

  class StoreError extends Error {}
  function fail(message) { throw new StoreError(message); }

  /* ---------- Tiện ích đọc/ghi ---------- */
  function read(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function write(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {
      fail('Không thể lưu dữ liệu (bộ nhớ trình duyệt đầy hoặc bị chặn).');
    }
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function uid() {
    const u = global.Auth && global.Auth.current();
    if (!u) fail('Bạn chưa đăng nhập.');
    return u.id;
  }

  /* ---------- Tiện ích ngày tháng (ngày dạng 'YYYY-MM-DD', tháng 'YYYY-MM') ---------- */
  const pad = function (n) { return String(n).padStart(2, '0'); };
  const toDateStr = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const today = function () { return toDateStr(new Date()); };
  const monthOf = function (dateStr) { return dateStr.slice(0, 7); };

  function isValidDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const p = s.split('-').map(Number);
    const dt = new Date(p[0], p[1] - 1, p[2]);
    return dt.getFullYear() === p[0] && dt.getMonth() === p[1] - 1 && dt.getDate() === p[2]
      && p[0] >= 2000 && p[0] <= 2100;
  }

  function isValidMonth(s) {
    return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
  }

  function monthRange(month) {
    const p = month.split('-').map(Number);
    const last = new Date(p[0], p[1], 0).getDate();
    return { from: month + '-01', to: month + '-' + pad(last) };
  }

  function addMonths(month, n) {
    const p = month.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1 + n, 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }

  function addDays(dateStr, n) {
    const p = dateStr.split('-').map(Number);
    return toDateStr(new Date(p[0], p[1] - 1, p[2] + n));
  }

  function diffDays(from, to) { // số ngày từ 'from' đến 'to' (to - from)
    const a = from.split('-').map(Number);
    const b = to.split('-').map(Number);
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
  }

  /** Bỏ dấu tiếng Việt để tìm kiếm "an uong" ra "Ăn uống". */
  function fold(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }

  /* ============================================================
     DANH MỤC
     ============================================================ */
  const DEFAULT_CATEGORIES = [
    { name: 'Ăn uống', type: 'expense', icon: '🍜', color: '#f4a261' },
    { name: 'Đi lại', type: 'expense', icon: '🚌', color: '#4dabf7' },
    { name: 'Học tập', type: 'expense', icon: '📚', color: '#7c6fe0' },
    { name: 'Nhà trọ', type: 'expense', icon: '🏠', color: '#e5645b' },
    { name: 'Điện nước', type: 'expense', icon: '💡', color: '#f2c94c' },
    { name: 'Điện thoại & Internet', type: 'expense', icon: '📱', color: '#2bb3c0' },
    { name: 'Mua sắm', type: 'expense', icon: '🛍️', color: '#e879a6' },
    { name: 'Giải trí', type: 'expense', icon: '🎮', color: '#a066d3' },
    { name: 'Sức khỏe', type: 'expense', icon: '💊', color: '#3f9d6f' },
    { name: 'Chi khác', type: 'expense', icon: '🧾', color: '#8d99ae' },
    { name: 'Trợ cấp gia đình', type: 'income', icon: '👪', color: '#3f9d6f' },
    { name: 'Học bổng', type: 'income', icon: '🎓', color: '#4dabf7' },
    { name: 'Làm thêm', type: 'income', icon: '💼', color: '#f4a261' },
    { name: 'Thu khác', type: 'income', icon: '💰', color: '#8d99ae' }
  ];

  /** Tạo bộ danh mục mặc định cho người dùng ở lần dùng đầu tiên (kể cả tài khoản cũ). */
  function ensureDefaults(userId) {
    const seeded = read(KEYS.seeded);
    if (seeded.indexOf(userId) !== -1) return;
    const all = read(KEYS.categories);
    DEFAULT_CATEGORIES.forEach(function (c) {
      all.push({ id: newId(), userId: userId, name: c.name, type: c.type, icon: c.icon, color: c.color });
    });
    write(KEYS.categories, all);
    seeded.push(userId);
    write(KEYS.seeded, seeded);
  }

  function userCategories(userId) {
    ensureDefaults(userId);
    return read(KEYS.categories).filter(function (c) { return c.userId === userId; });
  }

  function validateCategory(data, userId, excludeId) {
    const name = String(data.name || '').trim();
    if (!name) fail('Vui lòng nhập tên danh mục.');
    if (name.length > 100) fail('Tên danh mục tối đa 100 ký tự.');
    if (data.type !== 'income' && data.type !== 'expense') fail('Loại danh mục không hợp lệ.');
    const dup = userCategories(userId).some(function (c) {
      return c.id !== excludeId && c.type === data.type && c.name.toLowerCase() === name.toLowerCase();
    });
    if (dup) fail('Đã có danh mục "' + name + '" trong loại này.');
    return {
      name: name,
      type: data.type,
      icon: data.icon || '🏷️',
      color: /^#[0-9a-fA-F]{6}$/.test(data.color || '') ? data.color : '#8d99ae'
    };
  }

  const categories = {
    async list(type) {
      let list = userCategories(uid());
      if (type) list = list.filter(function (c) { return c.type === type; });
      return list;
    },
    async add(data) {
      const userId = uid();
      const clean = validateCategory(data, userId);
      const all = read(KEYS.categories);
      const item = Object.assign({ id: newId(), userId: userId }, clean);
      all.push(item);
      write(KEYS.categories, all);
      return item;
    },
    async update(id, data) {
      const userId = uid();
      const all = read(KEYS.categories);
      const item = all.find(function (c) { return c.id === id && c.userId === userId; });
      if (!item) fail('Không tìm thấy danh mục.');
      // Không cho đổi loại (thu <-> chi) để không làm sai lệch các giao dịch cũ
      const clean = validateCategory({ name: data.name, type: item.type, icon: data.icon, color: data.color }, userId, id);
      Object.assign(item, clean);
      write(KEYS.categories, all);
      return item;
    },
    async remove(id) {
      const userId = uid();
      const all = read(KEYS.categories);
      const item = all.find(function (c) { return c.id === id && c.userId === userId; });
      if (!item) fail('Không tìm thấy danh mục.');
      const used = read(KEYS.transactions).filter(function (t) { return t.userId === userId && t.categoryId === id; }).length;
      if (used > 0) {
        fail('Danh mục "' + item.name + '" đang có ' + used + ' giao dịch nên chưa thể xóa. Hãy sửa hoặc xóa các giao dịch đó trước.');
      }
      write(KEYS.categories, all.filter(function (c) { return c.id !== id; }));
      // Xóa luôn ngân sách gắn với danh mục này
      write(KEYS.budgets, read(KEYS.budgets).filter(function (b) { return !(b.userId === userId && b.categoryId === id); }));
      return true;
    },
    /** Số giao dịch của từng danh mục: {categoryId: count} */
    async usage() {
      const userId = uid();
      const map = {};
      read(KEYS.transactions).forEach(function (t) {
        if (t.userId === userId) map[t.categoryId] = (map[t.categoryId] || 0) + 1;
      });
      return map;
    }
  };

  /* ============================================================
     GIAO DỊCH
     ============================================================ */
  function validateTxn(data, userId) {
    const amount = Number(data.amount);
    if (!Number.isFinite(amount)) fail('Vui lòng nhập số tiền.');
    if (!Number.isInteger(amount)) fail('Số tiền phải là số nguyên (đơn vị đồng).');
    if (amount <= 0) fail('Số tiền phải lớn hơn 0.');
    if (amount > MAX_AMOUNT) fail('Số tiền quá lớn.');
    if (!data.categoryId) fail('Vui lòng chọn danh mục.');
    const cat = userCategories(userId).find(function (c) { return c.id === data.categoryId; });
    if (!cat) fail('Danh mục không tồn tại.');
    if (!isValidDate(data.date)) fail('Ngày không hợp lệ.');
    const note = String(data.note || '').trim();
    if (note.length > 200) fail('Ghi chú tối đa 200 ký tự.');
    return { categoryId: cat.id, amount: amount, date: data.date, note: note };
  }

  /** Danh sách giao dịch (đã gắn thông tin danh mục), mới nhất trước. */
  function listTxns(userId, f) {
    f = f || {};
    const cats = {};
    userCategories(userId).forEach(function (c) { cats[c.id] = c; });
    const q = f.q ? fold(f.q.trim()) : '';
    const out = [];
    read(KEYS.transactions).forEach(function (t) {
      if (t.userId !== userId) return;
      const c = cats[t.categoryId];
      const type = c ? c.type : 'expense';
      if (f.type && type !== f.type) return;
      if (f.categoryId && t.categoryId !== f.categoryId) return;
      if (f.from && t.date < f.from) return;
      if (f.to && t.date > f.to) return;
      if (q && fold(t.note).indexOf(q) === -1 && fold(c ? c.name : '').indexOf(q) === -1) return;
      out.push(Object.assign({}, t, {
        type: type,
        categoryName: c ? c.name : '(đã xóa)',
        categoryIcon: c ? c.icon : '❓',
        categoryColor: c ? c.color : '#8d99ae'
      }));
    });
    out.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return out;
  }

  const transactions = {
    async list(filters) { return listTxns(uid(), filters); },
    async get(id) {
      const t = listTxns(uid()).find(function (x) { return x.id === id; });
      return t || null;
    },
    async add(data) {
      const userId = uid();
      const clean = validateTxn(data, userId);
      const all = read(KEYS.transactions);
      const item = Object.assign({ id: newId(), userId: userId, createdAt: Date.now() }, clean);
      all.push(item);
      write(KEYS.transactions, all);
      return item;
    },
    async update(id, data) {
      const userId = uid();
      const all = read(KEYS.transactions);
      const item = all.find(function (t) { return t.id === id && t.userId === userId; });
      if (!item) fail('Không tìm thấy giao dịch.');
      Object.assign(item, validateTxn(data, userId));
      write(KEYS.transactions, all);
      return item;
    },
    async remove(id) {
      const userId = uid();
      const all = read(KEYS.transactions);
      if (!all.some(function (t) { return t.id === id && t.userId === userId; })) fail('Không tìm thấy giao dịch.');
      write(KEYS.transactions, all.filter(function (t) { return t.id !== id; }));
      return true;
    },
    /** Có giao dịch giống hệt (danh mục, số tiền, ngày, ghi chú) chưa? */
    async findDuplicate(data, excludeId) {
      const userId = uid();
      const note = String(data.note || '').trim().toLowerCase();
      return read(KEYS.transactions).find(function (t) {
        return t.userId === userId && t.id !== excludeId
          && t.categoryId === data.categoryId
          && t.amount === Number(data.amount)
          && t.date === data.date
          && String(t.note || '').trim().toLowerCase() === note;
      }) || null;
    }
  };

  /* ============================================================
     NGÂN SÁCH (hạn mức chi theo danh mục, theo tháng)
     ============================================================ */
  function budgetStatus(percent) {
    if (percent > 100) return 'over';
    if (percent >= 80) return 'warn';
    return 'ok';
  }

  function spentByCategory(userId, month) {
    const r = monthRange(month);
    const map = {};
    listTxns(userId, { type: 'expense', from: r.from, to: r.to }).forEach(function (t) {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });
    return map;
  }

  function enrichBudget(b, cats, spentMap) {
    const c = cats[b.categoryId];
    const spent = spentMap[b.categoryId] || 0;
    const percent = b.limit > 0 ? Math.round(spent / b.limit * 100) : 0;
    return Object.assign({}, b, {
      categoryName: c ? c.name : '(đã xóa)',
      categoryIcon: c ? c.icon : '❓',
      categoryColor: c ? c.color : '#8d99ae',
      spent: spent,
      remaining: b.limit - spent,
      percent: percent,
      status: budgetStatus(percent)
    });
  }

  function validateBudgetLimit(limit) {
    limit = Number(limit);
    if (!Number.isFinite(limit) || limit <= 0) fail('Hạn mức phải lớn hơn 0.');
    if (!Number.isInteger(limit)) fail('Hạn mức phải là số nguyên.');
    if (limit > MAX_AMOUNT) fail('Hạn mức quá lớn.');
    return limit;
  }

  const budgets = {
    async list(month) {
      if (!isValidMonth(month)) fail('Tháng không hợp lệ.');
      const userId = uid();
      const cats = {};
      userCategories(userId).forEach(function (c) { cats[c.id] = c; });
      const spentMap = spentByCategory(userId, month);
      return read(KEYS.budgets)
        .filter(function (b) { return b.userId === userId && b.month === month; })
        .map(function (b) { return enrichBudget(b, cats, spentMap); })
        .sort(function (a, b) { return b.percent - a.percent; });
    },
    async add(data) {
      const userId = uid();
      if (!isValidMonth(data.month)) fail('Tháng không hợp lệ.');
      const cat = userCategories(userId).find(function (c) { return c.id === data.categoryId; });
      if (!cat) fail('Vui lòng chọn danh mục.');
      if (cat.type !== 'expense') fail('Chỉ đặt ngân sách cho danh mục chi tiêu.');
      const limit = validateBudgetLimit(data.limit);
      const all = read(KEYS.budgets);
      const exists = all.some(function (b) {
        return b.userId === userId && b.categoryId === cat.id && b.month === data.month;
      });
      if (exists) fail('Danh mục "' + cat.name + '" đã có ngân sách trong tháng này. Hãy sửa ngân sách cũ.');
      const item = { id: newId(), userId: userId, categoryId: cat.id, month: data.month, limit: limit };
      all.push(item);
      write(KEYS.budgets, all);
      return item;
    },
    async update(id, data) {
      const userId = uid();
      const all = read(KEYS.budgets);
      const item = all.find(function (b) { return b.id === id && b.userId === userId; });
      if (!item) fail('Không tìm thấy ngân sách.');
      item.limit = validateBudgetLimit(data.limit);
      write(KEYS.budgets, all);
      return item;
    },
    async remove(id) {
      const userId = uid();
      const all = read(KEYS.budgets);
      if (!all.some(function (b) { return b.id === id && b.userId === userId; })) fail('Không tìm thấy ngân sách.');
      write(KEYS.budgets, all.filter(function (b) { return b.id !== id; }));
      return true;
    },
    /** Sao chép ngân sách từ tháng này sang tháng khác (bỏ qua danh mục đã có). Trả về số dòng đã thêm. */
    async copyMonth(fromMonth, toMonth) {
      const userId = uid();
      if (!isValidMonth(fromMonth) || !isValidMonth(toMonth)) fail('Tháng không hợp lệ.');
      const all = read(KEYS.budgets);
      const source = all.filter(function (b) { return b.userId === userId && b.month === fromMonth; });
      let added = 0;
      source.forEach(function (b) {
        const exists = all.some(function (x) {
          return x.userId === userId && x.month === toMonth && x.categoryId === b.categoryId;
        });
        if (!exists) {
          all.push({ id: newId(), userId: userId, categoryId: b.categoryId, month: toMonth, limit: b.limit });
          added++;
        }
      });
      write(KEYS.budgets, all);
      return added;
    },
    /** Trạng thái ngân sách của 1 danh mục trong tháng (null nếu chưa đặt) - dùng để cảnh báo. */
    async statusFor(categoryId, month) {
      const userId = uid();
      const b = read(KEYS.budgets).find(function (x) {
        return x.userId === userId && x.categoryId === categoryId && x.month === month;
      });
      if (!b) return null;
      const cats = {};
      userCategories(userId).forEach(function (c) { cats[c.id] = c; });
      return enrichBudget(b, cats, spentByCategory(userId, month));
    }
  };

  /* ============================================================
     MỤC TIÊU TIẾT KIỆM
     ============================================================ */
  function validateGoal(data) {
    const name = String(data.name || '').trim();
    if (!name) fail('Vui lòng nhập tên mục tiêu.');
    if (name.length > 100) fail('Tên mục tiêu tối đa 100 ký tự.');
    const target = Number(data.target);
    if (!Number.isFinite(target) || target <= 0) fail('Số tiền cần đạt phải lớn hơn 0.');
    if (!Number.isInteger(target) || target > MAX_AMOUNT) fail('Số tiền cần đạt không hợp lệ.');
    const saved = data.saved === '' || data.saved == null ? 0 : Number(data.saved);
    if (!Number.isFinite(saved) || saved < 0) fail('Số tiền đã tiết kiệm không được âm.');
    if (!Number.isInteger(saved) || saved > MAX_AMOUNT) fail('Số tiền đã tiết kiệm không hợp lệ.');
    let deadline = data.deadline || null;
    if (deadline && !isValidDate(deadline)) fail('Hạn hoàn thành không hợp lệ.');
    return { name: name, target: target, saved: saved, deadline: deadline };
  }

  function enrichGoal(g) {
    const percent = g.target > 0 ? Math.min(100, Math.floor(g.saved / g.target * 100)) : 0;
    const t = today();
    return Object.assign({}, g, {
      percent: percent,
      remaining: Math.max(0, g.target - g.saved),
      done: g.saved >= g.target,
      daysLeft: g.deadline ? diffDays(t, g.deadline) : null
    });
  }

  const goals = {
    async list() {
      const userId = uid();
      return read(KEYS.goals)
        .filter(function (g) { return g.userId === userId; })
        .map(enrichGoal)
        .sort(function (a, b) { return (a.done - b.done) || ((a.createdAt || 0) - (b.createdAt || 0)); });
    },
    async add(data) {
      const userId = uid();
      const all = read(KEYS.goals);
      const item = Object.assign({ id: newId(), userId: userId, createdAt: Date.now() }, validateGoal(data));
      all.push(item);
      write(KEYS.goals, all);
      return item;
    },
    async update(id, data) {
      const userId = uid();
      const all = read(KEYS.goals);
      const item = all.find(function (g) { return g.id === id && g.userId === userId; });
      if (!item) fail('Không tìm thấy mục tiêu.');
      Object.assign(item, validateGoal(data));
      write(KEYS.goals, all);
      return item;
    },
    async remove(id) {
      const userId = uid();
      const all = read(KEYS.goals);
      if (!all.some(function (g) { return g.id === id && g.userId === userId; })) fail('Không tìm thấy mục tiêu.');
      write(KEYS.goals, all.filter(function (g) { return g.id !== id; }));
      return true;
    },
    async deposit(id, amount) {
      const userId = uid();
      amount = Number(amount);
      if (!Number.isFinite(amount) || amount <= 0) fail('Số tiền nạp phải lớn hơn 0.');
      if (!Number.isInteger(amount) || amount > MAX_AMOUNT) fail('Số tiền nạp không hợp lệ.');
      const all = read(KEYS.goals);
      const item = all.find(function (g) { return g.id === id && g.userId === userId; });
      if (!item) fail('Không tìm thấy mục tiêu.');
      if (item.saved + amount > MAX_AMOUNT) fail('Tổng số tiền tiết kiệm quá lớn.');
      item.saved += amount;
      write(KEYS.goals, all);
      return enrichGoal(item);
    }
  };

  /* ============================================================
     THỐNG KÊ
     ============================================================ */
  const stats = {
    /** Tổng thu / chi trong khoảng ngày. */
    async summary(from, to) {
      let income = 0, expense = 0, count = 0;
      listTxns(uid(), { from: from, to: to }).forEach(function (t) {
        count++;
        if (t.type === 'income') income += t.amount; else expense += t.amount;
      });
      return { income: income, expense: expense, net: income - expense, count: count };
    },
    /** Số dư = tổng thu - tổng chi của toàn bộ thời gian. */
    async balance() {
      let sum = 0;
      listTxns(uid()).forEach(function (t) { sum += t.type === 'income' ? t.amount : -t.amount; });
      return sum;
    },
    /** Gộp theo danh mục (type: 'expense' | 'income'), sắp xếp giảm dần. */
    async byCategory(from, to, type) {
      const map = {};
      let total = 0;
      listTxns(uid(), { from: from, to: to, type: type }).forEach(function (t) {
        if (!map[t.categoryId]) {
          map[t.categoryId] = { categoryId: t.categoryId, name: t.categoryName, icon: t.categoryIcon, color: t.categoryColor, total: 0, count: 0 };
        }
        map[t.categoryId].total += t.amount;
        map[t.categoryId].count += 1;
        total += t.amount;
      });
      return Object.keys(map).map(function (k) {
        const r = map[k];
        r.percent = total > 0 ? r.total / total * 100 : 0;
        return r;
      }).sort(function (a, b) { return b.total - a.total; });
    },
    /** Thu/chi theo từng ngày hoặc từng tháng (unit: 'day' | 'month'), có điền đủ các mốc rỗng. */
    async byPeriod(from, to, unit) {
      const rows = {};
      const keys = [];
      if (unit === 'month') {
        let m = monthOf(from);
        const end = monthOf(to);
        while (m <= end) { keys.push(m); m = addMonths(m, 1); }
      } else {
        let d = from;
        while (d <= to) { keys.push(d); d = addDays(d, 1); }
      }
      keys.forEach(function (k) { rows[k] = { key: k, income: 0, expense: 0 }; });
      listTxns(uid(), { from: from, to: to }).forEach(function (t) {
        const k = unit === 'month' ? monthOf(t.date) : t.date;
        if (!rows[k]) return;
        if (t.type === 'income') rows[k].income += t.amount; else rows[k].expense += t.amount;
      });
      return keys.map(function (k) { return rows[k]; });
    },
    /** Thu/chi của n tháng liên tiếp kết thúc ở endMonth. */
    async lastMonths(endMonth, n) {
      const start = addMonths(endMonth, -(n - 1));
      return stats.byPeriod(monthRange(start).from, monthRange(endMonth).to, 'month');
    },
    async topExpenses(from, to, limit) {
      return listTxns(uid(), { from: from, to: to, type: 'expense' })
        .sort(function (a, b) { return b.amount - a.amount; })
        .slice(0, limit || 5);
    }
  };

  /* ============================================================
     HỒ SƠ
     ============================================================ */
  const profile = {
    async get() {
      const userId = uid();
      const u = global.Auth.getUsers().find(function (x) { return x.id === userId; });
      if (!u) fail('Không tìm thấy tài khoản.');
      return { id: u.id, fullName: u.fullName, email: u.email, phone: u.phone || '' };
    },
    async update(data) {
      const userId = uid();
      const fullName = String(data.fullName || '').trim();
      const phone = String(data.phone || '').trim();
      if (!fullName) fail('Vui lòng nhập họ và tên.');
      if (!NAME_REGEX.test(fullName)) fail('Họ và tên chỉ được chứa chữ cái và khoảng trắng.');
      if (!phone) fail('Vui lòng nhập số điện thoại.');
      if (!PHONE_REGEX.test(phone)) fail('Số điện thoại không hợp lệ (vd: 0912345678).');
      const users = global.Auth.getUsers();
      const u = users.find(function (x) { return x.id === userId; });
      if (!u) fail('Không tìm thấy tài khoản.');
      u.fullName = fullName;
      u.phone = phone;
      global.Auth.saveUsers(users);
      global.Auth.updateSession({ fullName: fullName });
      return true;
    },
    async changePassword(current, next, confirm) {
      const userId = uid();
      const users = global.Auth.getUsers();
      const u = users.find(function (x) { return x.id === userId; });
      if (!u) fail('Không tìm thấy tài khoản.');
      if (!current) fail('Vui lòng nhập mật khẩu hiện tại.');
      if (u.password !== current) fail('Mật khẩu hiện tại không đúng.');
      if (!PASSWORD_REGEX.test(next || '')) fail('Mật khẩu mới tối thiểu 6 ký tự, gồm cả chữ và số.');
      if (next === current) fail('Mật khẩu mới phải khác mật khẩu hiện tại.');
      if (next !== confirm) fail('Mật khẩu nhập lại không khớp.');
      u.password = next;
      global.Auth.saveUsers(users);
      return true;
    }
  };

  /* ============================================================
     DỮ LIỆU MẪU (để thử biểu đồ/báo cáo nhanh)
     ============================================================ */
  const demo = {
    /** Thêm ~3 tháng giao dịch mẫu + vài ngân sách + mục tiêu. Trả về số giao dịch đã thêm. */
    async seed() {
      const userId = uid();
      const cats = userCategories(userId);
      const byName = {};
      cats.forEach(function (c) { byName[c.name] = c; });
      const need = ['Ăn uống', 'Đi lại', 'Học tập', 'Nhà trọ', 'Điện nước', 'Điện thoại & Internet',
        'Mua sắm', 'Giải trí', 'Sức khỏe', 'Trợ cấp gia đình', 'Học bổng', 'Làm thêm'];
      need.forEach(function (n) { if (!byName[n]) fail('Thiếu danh mục "' + n + '" nên không tạo được dữ liệu mẫu. Hãy tạo lại danh mục này rồi thử lại.'); });

      // Sinh số giả ngẫu nhiên cố định để mỗi lần nạp cho kết quả ổn định
      let seedNum = 20260913;
      const rnd = function () {
        seedNum = (seedNum * 1664525 + 1013904223) % 4294967296;
        return seedNum / 4294967296;
      };
      const between = function (a, b, step) {
        const v = a + Math.floor(rnd() * ((b - a) / step + 1)) * step;
        return v;
      };

      const todayStr = today();
      const thisMonth = monthOf(todayStr);
      const rows = [];
      const push = function (date, catName, amount, note) {
        if (date > todayStr) return;
        rows.push({ date: date, categoryId: byName[catName].id, amount: amount, note: note });
      };

      for (let i = -2; i <= 0; i++) {
        const m = addMonths(thisMonth, i);
        const last = Number(monthRange(m).to.slice(8));
        push(m + '-01', 'Trợ cấp gia đình', 3000000, 'Bố mẹ gửi tiền tháng');
        push(m + '-05', 'Nhà trọ', 1200000, 'Tiền trọ tháng');
        push(m + '-06', 'Điện nước', between(150000, 260000, 10000), 'Điện nước');
        push(m + '-08', 'Điện thoại & Internet', 120000, 'Gói data + wifi');
        if (i === -1) push(m + '-15', 'Học bổng', 2000000, 'Học bổng học kỳ');
        for (let d = 1; d <= last; d++) {
          const day = m + '-' + pad(d);
          push(day, 'Ăn uống', between(25000, 65000, 5000), d % 2 ? 'Cơm trưa' : 'Ăn tối');
          if (rnd() < 0.35) push(day, 'Ăn uống', between(15000, 40000, 5000), 'Trà sữa / cà phê');
          if (rnd() < 0.5) push(day, 'Đi lại', between(10000, 40000, 5000), 'Xe buýt / grab');
          if (rnd() < 0.08) push(day, 'Học tập', between(50000, 300000, 10000), 'Photo tài liệu / sách');
          if (rnd() < 0.1) push(day, 'Giải trí', between(50000, 200000, 10000), 'Xem phim / đi chơi');
          if (rnd() < 0.05) push(day, 'Mua sắm', between(100000, 400000, 10000), 'Mua đồ dùng');
          if (rnd() < 0.03) push(day, 'Sức khỏe', between(50000, 150000, 10000), 'Mua thuốc');
          if (rnd() < 0.15) push(day, 'Làm thêm', between(150000, 400000, 10000), 'Ca làm thêm');
        }
      }

      const all = read(KEYS.transactions);
      rows.forEach(function (r) {
        all.push({ id: newId(), userId: userId, categoryId: r.categoryId, amount: r.amount, date: r.date, note: r.note, createdAt: Date.now() });
      });
      write(KEYS.transactions, all);

      // Ngân sách tháng hiện tại (bỏ qua nếu đã có)
      const bAll = read(KEYS.budgets);
      [['Ăn uống', 1500000], ['Đi lại', 400000], ['Giải trí', 300000], ['Mua sắm', 400000]].forEach(function (p) {
        const exists = bAll.some(function (b) { return b.userId === userId && b.month === thisMonth && b.categoryId === byName[p[0]].id; });
        if (!exists) bAll.push({ id: newId(), userId: userId, categoryId: byName[p[0]].id, month: thisMonth, limit: p[1] });
      });
      write(KEYS.budgets, bAll);

      // Mục tiêu tiết kiệm mẫu (chỉ thêm nếu chưa có mục tiêu nào)
      const gAll = read(KEYS.goals);
      if (!gAll.some(function (g) { return g.userId === userId; })) {
        gAll.push({ id: newId(), userId: userId, name: 'Mua laptop', target: 15000000, saved: 4500000, deadline: addDays(todayStr, 150), createdAt: Date.now() });
        gAll.push({ id: newId(), userId: userId, name: 'Du lịch hè cùng bạn', target: 3000000, saved: 800000, deadline: addDays(todayStr, 90), createdAt: Date.now() + 1 });
        write(KEYS.goals, gAll);
      }
      return rows.length;
    },
    /** Xóa toàn bộ giao dịch, ngân sách, mục tiêu của người dùng (giữ danh mục & tài khoản). */
    async clearAll() {
      const userId = uid();
      write(KEYS.transactions, read(KEYS.transactions).filter(function (t) { return t.userId !== userId; }));
      write(KEYS.budgets, read(KEYS.budgets).filter(function (b) { return b.userId !== userId; }));
      write(KEYS.goals, read(KEYS.goals).filter(function (g) { return g.userId !== userId; }));
      return true;
    }
  };

  global.Store = {
    StoreError: StoreError,
    MAX_AMOUNT: MAX_AMOUNT,
    categories: categories,
    transactions: transactions,
    budgets: budgets,
    goals: goals,
    stats: stats,
    profile: profile,
    demo: demo,
    util: {
      today: today,
      monthOf: monthOf,
      monthRange: monthRange,
      addMonths: addMonths,
      addDays: addDays,
      diffDays: diffDays,
      isValidDate: isValidDate,
      toDateStr: toDateStr,
      fold: fold
    }
  };
})(window);
