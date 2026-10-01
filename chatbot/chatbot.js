/* Trợ lý chi tiêu Poketto: ưu tiên OpenAI API phía server, dự phòng theo quy tắc cục bộ. */
(function () {
  'use strict';
  const user = UI.initShell({ active: 'chatbot', title: 'Trợ lý AI' });
  if (!user) return;

  const root = document.getElementById('content');
  const key = 'poketto_chat_' + user.id;
  const fold = function (value) { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd'); };
  const money = function (value) { return UI.formatMoney(Math.round(Number(value) || 0)); };
  const now = new Date();
  const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const monthLabel = 'tháng ' + (now.getMonth() + 1) + '/' + now.getFullYear();

  root.innerHTML = '<section class="assistant-page">' +
    '<header class="assistant-heading"><div><h1>Trợ lý chi tiêu Poketto</h1><p>Hỏi về ngân sách, cách tiết kiệm hoặc xem nhanh tình hình chi tiêu của bạn.</p></div><span class="assistant-badge" id="aiMode"><i></i> Đang kiểm tra AI</span></header>' +
    '<div class="assistant-layout"><section class="chat-card" aria-label="Trò chuyện với trợ lý">' +
    '<div class="chat-top"><div class="bot-avatar">✨</div><div class="bot-title"><strong>Poketto Assistant</strong><small>Đang sẵn sàng hỗ trợ bạn</small></div><button type="button" class="clear-chat" id="clearChat" title="Xóa lịch sử">Xóa lịch sử</button></div>' +
    '<div class="chat-messages" id="messages" aria-live="polite"></div>' +
    '<div class="suggestions" id="suggestions"><button class="suggestion" type="button">Tháng này mình đã chi bao nhiêu?</button><button class="suggestion" type="button">Gợi ý cách tiết kiệm tiền</button><button class="suggestion" type="button">Giúp mình lập kế hoạch chi tiêu</button></div>' +
    '<form class="chat-compose" id="chatForm"><textarea id="chatInput" rows="1" maxlength="1000" aria-label="Tin nhắn" placeholder="Nhập câu hỏi của bạn..."></textarea><button class="send-button" id="sendButton" aria-label="Gửi tin nhắn">➤</button></form>' +
    '<div class="privacy-note" id="privacyNote">Đang kiểm tra cấu hình trợ lý.</div></section>' +
    '<aside class="tips-card"><h2>Chi tiêu thông minh</h2><div class="tip-item"><strong>📌 Lập ngân sách trước</strong><p>Chia tiền theo nhu cầu thiết yếu, mục tiêu tiết kiệm và khoản linh hoạt.</p></div><div class="tip-item"><strong>🧾 Ghi lại mọi khoản</strong><p>Giao dịch được ghi đầy đủ giúp bạn nhận ra những khoản nhỏ đang cộng dồn.</p></div><div class="tip-item"><strong>⏳ Quy tắc 24 giờ</strong><p>Với món đồ không thiết yếu, hãy chờ một ngày trước khi quyết định mua.</p></div><div class="tips-foot" id="aiPrivacy">Gợi ý chỉ mang tính tham khảo, không thay thế tư vấn tài chính chuyên nghiệp.</div></aside></div></section>';

  const messages = document.getElementById('messages');
  const input = document.getElementById('chatInput');
  const sendButton = document.getElementById('sendButton');
  const aiMode = document.getElementById('aiMode');
  const privacyNote = document.getElementById('privacyNote');
  const aiPrivacy = document.getElementById('aiPrivacy');
  let history = loadHistory();
  let apiEnabled = null;

  function loadHistory() {
    try { const data = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(data) ? data.slice(-60) : []; }
    catch (e) { return []; }
  }
  function saveHistory() { try { localStorage.setItem(key, JSON.stringify(history.slice(-60))); } catch (e) { /* tiếp tục hội thoại trong bộ nhớ */ } }
  function appendMessage(role, text, persist) {
    const item = { role: role, text: String(text), time: new Date().toISOString() };
    history.push(item);
    const row = document.createElement('div'); row.className = 'message ' + role;
    const avatar = document.createElement('span'); avatar.className = 'message-avatar'; avatar.textContent = role === 'user' ? '🙂' : '✨';
    const bubble = document.createElement('div'); bubble.className = 'message-bubble'; bubble.appendChild(document.createTextNode(item.text));
    const time = document.createElement('small'); time.className = 'message-time'; time.textContent = new Date(item.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); bubble.appendChild(time);
    row.appendChild(avatar); row.appendChild(bubble); messages.appendChild(row); messages.scrollTop = messages.scrollHeight;
    if (persist !== false) saveHistory();
  }
  function renderHistory() {
    messages.innerHTML = '';
    if (!history.length) appendMessage('bot', 'Xin chào ' + (user.fullName || 'bạn') + '! Mình có thể giúp bạn xem tình hình chi tiêu, lên ngân sách và tìm cách tiết kiệm. Bạn muốn bắt đầu từ đâu?', false);
    else history.forEach(function (m) { appendMessage(m.role === 'user' ? 'user' : 'bot', m.text, false); });
  }
  function getFinanceSnapshot() {
    return Promise.all([Store.transactions.list({ from: month + '-01', to: month + '-31' }), Store.categories.list(), Store.budgets.list(month)]).then(function (all) {
      const txns = all[0], categories = all[1], budgets = all[2];
      const categoryMap = {}; categories.forEach(function (c) { categoryMap[c.id] = c.name; });
      const expense = txns.filter(function (t) { return t.type === 'expense'; });
      const income = txns.filter(function (t) { return t.type === 'income'; });
      const byCategory = {};
      expense.forEach(function (t) { const name = categoryMap[t.categoryId] || 'Khác'; byCategory[name] = (byCategory[name] || 0) + Number(t.amount || 0); });
      const top = Object.keys(byCategory).sort(function (a,b) { return byCategory[b] - byCategory[a]; }).slice(0,3);
      return {
        month: month,
        expenses: expense.reduce(function (s,t) { return s + Number(t.amount || 0); },0),
        income: income.reduce(function(s,t){return s+Number(t.amount||0);},0),
        count: expense.length,
        top: top.map(function(n){return n+': '+money(byCategory[n]);}),
        topCategories: top.map(function(n){return { name: n, amount: byCategory[n] };}),
        budgets: budgets.map(function(b){return { categoryName: b.categoryName, limit: b.limit, spent: b.spent, remaining: b.remaining, percent: b.percent };})
      };
    }).catch(function () { return null; });
  }

  async function checkAiStatus() {
    try {
      const response = await fetch('/api/chat/status', { cache: 'no-store' });
      const data = await response.json();
      apiEnabled = response.ok && data.enabled === true;
    } catch (e) { apiEnabled = null; }
    if (apiEnabled) {
      aiMode.lastChild.textContent = ' OpenAI API';
      privacyNote.textContent = 'Câu hỏi, tối đa 8 tin nhắn gần nhất và tổng hợp thu chi/ngân sách sẽ được gửi tới OpenAI. Không gửi họ tên, email, số điện thoại, ghi chú giao dịch hoặc mã tài khoản; tránh nhập thông tin nhạy cảm.';
      aiPrivacy.textContent = 'Kết nối OpenAI API đang bật. Tránh nhập thông tin cá nhân hoặc bí mật; lời khuyên chỉ mang tính tham khảo.';
    } else if (apiEnabled === false) {
      aiMode.lastChild.textContent = ' Chế độ mẫu';
      privacyNote.textContent = 'Chưa cấu hình API key. Trợ lý đang dùng quy tắc cục bộ; câu trả lời có thể ít linh hoạt hơn.';
      aiPrivacy.textContent = 'Đang dùng câu trả lời theo quy tắc cục bộ. Gợi ý chỉ mang tính tham khảo, không thay thế tư vấn tài chính chuyên nghiệp.';
    } else {
      aiMode.lastChild.textContent = ' Chế độ ngoại tuyến';
      privacyNote.textContent = 'Không kết nối được máy chủ AI. Trợ lý sẽ thử trả lời bằng các quy tắc cục bộ.';
      aiPrivacy.textContent = 'Chưa liên lạc được máy chủ; trợ lý sẽ thử dùng quy tắc cục bộ. Gợi ý chỉ mang tính tham khảo.';
    }
  }

  async function askOpenAi(question) {
    const snapshot = await getFinanceSnapshot();
    const conversation = history.slice(0, -1).slice(-8).map(function (item) {
      return { role: item.role === 'bot' ? 'assistant' : 'user', content: String(item.text || '').slice(0, 1000) };
    });
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: question,
        conversation: conversation,
        finance: snapshot ? {
          month: snapshot.month,
          totalExpense: snapshot.expenses,
          totalIncome: snapshot.income,
          balance: snapshot.income - snapshot.expenses,
          topCategories: snapshot.topCategories,
          budgets: snapshot.budgets
        } : {}
      })
    });
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      const err = new Error(data.error || 'Không gọi được API AI.');
      err.status = response.status;
      throw err;
    }
    return data.reply;
  }
  async function answer(question) {
    const q = fold(question);
    if (/(xin chao|chao ban|hello|hi\b)/.test(q)) return 'Chào bạn! Mình có thể giúp bạn xem chi tiêu ' + monthLabel + ', lập ngân sách hoặc gợi ý tiết kiệm. Bạn đang muốn giải quyết điều gì?';
    if (/(thang nay|chi bao nhieu|da chi|tinh hinh chi|tong chi|chi tieu thang)/.test(q)) {
      const s = await getFinanceSnapshot();
      if (!s) return 'Mình chưa đọc được số liệu lúc này. Bạn hãy thử tải lại trang hoặc xem mục Giao dịch nhé.';
      return 'Tóm tắt ' + monthLabel + ':\n• Tổng chi: ' + money(s.expenses) + ' (' + s.count + ' giao dịch)\n• Tổng thu: ' + money(s.income) + '\n• Chênh lệch thu – chi: ' + money(s.income - s.expenses) + (s.top.length ? '\n• Khoản chi lớn: ' + s.top.join('; ') : '\n• Chưa có khoản chi nào được ghi nhận.') + (s.budgets.length ? '\n• Ngân sách: ' + s.budgets.map(function(b){return b.categoryName+' dùng '+b.percent+'%';}).join('; ') : '\n• Bạn chưa đặt ngân sách cho tháng này.');
    }
    if (/(ngan sach|vuot|han muc)/.test(q)) {
      const s = await getFinanceSnapshot();
      if (s && s.budgets.length) return 'Tình hình hạn mức ' + monthLabel + ':\n' + s.budgets.map(function(b){return '• '+b.categoryName+': đã dùng '+money(b.spent)+' / '+money(b.limit)+' ('+b.percent+'%), còn '+money(b.remaining);}).join('\n') + '\n\nKhi gần chạm hạn mức, hãy xem lại các giao dịch sắp tới và ưu tiên nhu cầu cần thiết.';
      return 'Bạn chưa có hạn mức tháng này. Vào mục Ngân sách, chọn danh mục chi tiêu và đặt số tiền tối đa phù hợp với thu nhập sau các khoản cố định.';
    }
    if (/(ngan sach|ke hoach|lap ke hoach|phan bo)/.test(q)) return 'Bạn có thể thử cách chia ngân sách theo thứ tự ưu tiên:\n1. Tính tổng thu nhập thực nhận trong tháng.\n2. Trừ khoản cố định như học phí, tiền trọ, điện nước và đi lại.\n3. Đặt trước một mục tiêu tiết kiệm phù hợp (ví dụ 10–20% nếu khả thi).\n4. Chia phần còn lại theo tuần cho ăn uống và chi tiêu linh hoạt.\n5. Đặt hạn mức cho từng danh mục trong mục Ngân sách của Poketto, rồi rà soát mỗi tuần.\n\nNếu bạn cho mình biết thu nhập và các khoản cố định, mình có thể giúp chia thử một kế hoạch cụ thể.';
    if (/(tiet kiem|tiet kiem|cat giam|bot chi|de danh)/.test(q)) return 'Một vài cách tiết kiệm thực tế cho sinh viên:\n• Theo dõi chi tiêu 1–2 tuần để tìm khoản có thể giảm mà không ảnh hưởng nhu cầu thiết yếu.\n• Lên thực đơn, mang nước hoặc đồ ăn nhẹ và tận dụng ưu đãi phù hợp.\n• Đặt hạn mức theo tuần cho ăn uống, mua sắm và giải trí.\n• Chờ 24 giờ trước các món mua không thiết yếu.\n• Chuyển khoản tiết kiệm ngay khi nhận thu nhập, dù chỉ là số tiền nhỏ.\n\nHãy ưu tiên giảm khoản ít giá trị với bạn thay vì cắt tiền ăn, học tập hoặc chăm sóc sức khỏe.';
    if (/(50.?30.?20|quy tac 50)/.test(q)) return 'Quy tắc 50/30/20 là khung tham khảo: khoảng 50% thu nhập cho nhu cầu thiết yếu, 30% cho mong muốn cá nhân và 20% cho tiết kiệm hoặc trả nợ. Với sinh viên có tiền trọ/học phí cao, bạn có thể điều chỉnh tỷ lệ; hãy đảm bảo nhu cầu thiết yếu trước và đặt mục tiêu tiết kiệm khả thi.';
    if (/(cam on|thanks)/.test(q)) return 'Rất vui được hỗ trợ bạn! Nếu muốn, hãy hỏi mình về ngân sách, tiết kiệm hoặc chi tiêu trong tháng.';
    return 'Mình có thể tư vấn về lập kế hoạch chi tiêu, tiết kiệm và ngân sách. Bạn cũng có thể hỏi “Tháng này mình đã chi bao nhiêu?” để xem số liệu thực tế trong Poketto.\n\nĐể tư vấn sát hơn, hãy cho biết mục tiêu hoặc ngân sách bạn đang cân nhắc.';
  }
  async function submit(text) {
    const question = String(text || '').trim();
    if (!question || sendButton.disabled) return;
    appendMessage('user', question); input.value = ''; input.style.height = 'auto'; sendButton.disabled = true;
    const row = document.createElement('div'); row.className = 'message typing'; row.id = 'typing';
    const av = document.createElement('span'); av.className = 'message-avatar'; av.textContent = '✨';
    const b = document.createElement('div'); b.className = 'message-bubble'; b.textContent = 'Đang suy nghĩ…'; row.appendChild(av); row.appendChild(b); messages.appendChild(row); messages.scrollTop = messages.scrollHeight;
    try {
      let response;
      if (apiEnabled === false) {
        response = 'ℹ️ Đang dùng chế độ mẫu vì máy chủ chưa được cấu hình API key.\n\n' + await answer(question);
      } else {
        try {
          response = await askOpenAi(question);
          apiEnabled = true;
          aiMode.lastChild.textContent = ' OpenAI API';
        } catch (e) {
          apiEnabled = e.status === 503 ? false : apiEnabled;
          response = (apiEnabled === false
            ? 'ℹ️ Máy chủ chưa cấu hình API key; đây là câu trả lời theo quy tắc cục bộ.\n\n'
            : '⚠️ Chưa gọi được AI; đây là câu trả lời dự phòng theo quy tắc cục bộ.\n\n') + await answer(question);
          if (apiEnabled === false) {
            aiMode.lastChild.textContent = ' Chế độ mẫu';
            privacyNote.textContent = 'Chưa cấu hình API key. Trợ lý đang dùng quy tắc cục bộ; câu trả lời có thể ít linh hoạt hơn.';
            aiPrivacy.textContent = 'Đang dùng câu trả lời theo quy tắc cục bộ. Gợi ý chỉ mang tính tham khảo, không thay thế tư vấn tài chính chuyên nghiệp.';
          } else {
            aiMode.lastChild.textContent = ' Dự phòng cục bộ';
            privacyNote.textContent = 'Yêu cầu AI chưa thành công; câu trả lời này dùng quy tắc cục bộ. Câu hỏi và tóm tắt có thể đã được gửi tới dịch vụ AI.';
            aiPrivacy.textContent = 'Kết nối AI đang gặp sự cố. Câu trả lời dự phòng theo quy tắc; gợi ý chỉ mang tính tham khảo.';
          }
        }
      }
      row.remove(); appendMessage('bot', response);
    }
    catch (e) { row.remove(); appendMessage('bot', 'Mình chưa xử lý được câu hỏi này. Bạn thử lại sau nhé.'); }
    finally { sendButton.disabled = false; input.focus(); }
  }
  document.getElementById('chatForm').addEventListener('submit', function (e) { e.preventDefault(); submit(input.value); });
  input.addEventListener('input', function () { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 130) + 'px'; });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input.value); } });
  document.getElementById('suggestions').addEventListener('click', function (e) { if (e.target.classList.contains('suggestion')) submit(e.target.textContent); });
  document.getElementById('clearChat').addEventListener('click', function () { history = []; saveHistory(); renderHistory(); });
  renderHistory();
  checkAiStatus();
})();
