// app.js — Main application controller (Firebaseなし版)

const App = {
  year:  new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  page:  'dashboard',
  _toastTimer: null,

  start() {
    this._setup();
    this.updateMonthLabel();
    this.render();
  },

  // ===== イベントの設定 =====
  _setup() {
    this._bindNav();
    this._bindMonthNav();
    this._bindGmailBtn();
    this._bindModalOverlays();
    document.getElementById('add-tx-btn').addEventListener('click', () => this.openTxModal());
    document.getElementById('refresh-btn').addEventListener('click', () => this.render());
  },

  // ===== Navigation =====
  _bindNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.goTo(btn.dataset.page));
    });
  },

  goTo(page) {
    this.page = page;
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.page === page)
    );
    document.querySelectorAll('.page').forEach(p =>
      p.classList.toggle('active', p.id === `page-${page}`)
    );
    this.render();
  },

  async render() {
    try {
      if      (this.page === 'dashboard')    await this.renderDashboard();
      else if (this.page === 'transactions') await this.renderTransactions();
      else if (this.page === 'settings')     await this.renderSettings();
    } catch (e) {
      console.error('render error', e);
      this.toast('データの読み込みに失敗しました', 'error');
    }
  },

  // ===== Month Navigation =====
  _bindMonthNav() {
    document.getElementById('prev-month').addEventListener('click', () => {
      this.month--;
      if (this.month < 1) { this.month = 12; this.year--; }
      this.updateMonthLabel();
      this.render();
    });
    document.getElementById('next-month').addEventListener('click', () => {
      this.month++;
      if (this.month > 12) { this.month = 1; this.year++; }
      this.updateMonthLabel();
      this.render();
    });
  },

  updateMonthLabel() {
    document.getElementById('month-label').textContent =
      `${this.year}年${this.month}月`;
  },

  // ===== Dashboard =====
  async renderDashboard() {
    const [txs, cats, budget] = await Promise.all([
      Storage.getTxsByMonth(this.year, this.month),
      Storage.getCategories(),
      Storage.getBudgetForMonth(this.year, this.month),
    ]);

    const spent = {};
    cats.forEach(c => { spent[c.name] = 0; });
    txs.forEach(t => {
      spent[t.category] = (spent[t.category] || 0) + t.amount;
    });

    this._renderBudgetSummary(cats, spent, budget);
    this._renderPieChart(cats, spent);
    await this._renderBarChart(cats);
  },

  _renderBudgetSummary(cats, spent, budget) {
    const totalSpent  = Object.values(spent).reduce((s, v) => s + v, 0);
    const totalBudget = Object.values(budget).reduce((s, v) => s + v, 0);
    const totalRem    = totalBudget - totalSpent;
    const totalOver   = totalRem < 0;

    let html = `
      <div class="budget-grid">
        <div class="budget-card total-card">
          <div class="budget-header">
            <span class="budget-name">今月の合計</span>
            <span class="budget-remaining ${totalOver ? 'over' : ''}">
              残り ${totalOver ? '-' : ''}¥${Math.abs(totalRem).toLocaleString()}
            </span>
          </div>
          <div class="budget-sub">
            <span>使用 ¥${totalSpent.toLocaleString()}</span>
            <span>予算 ¥${totalBudget.toLocaleString()}</span>
          </div>
        </div>
    `;

    cats.forEach(cat => {
      const s   = spent[cat.name] || 0;
      const b   = budget[cat.name] || 0;
      const rem = b - s;
      const over = rem < 0;
      const pct  = b > 0 ? Math.min(100, (s / b) * 100).toFixed(1) : 0;

      html += `
        <div class="budget-card" style="border-left-color:${cat.color}">
          <div class="budget-header">
            <span class="budget-name" style="color:${cat.color}">${this.esc(cat.name)}</span>
            <span class="budget-remaining ${over ? 'over' : ''}">
              残り ${over ? '-' : ''}¥${Math.abs(rem).toLocaleString()}
            </span>
          </div>
          <div class="budget-sub">
            <span>使用 ¥${s.toLocaleString()}</span>
            <span>予算 ¥${b.toLocaleString()}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${over ? 'over' : ''}"
                 style="width:${pct}%;background:${cat.color}"></div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    document.getElementById('budget-summary').innerHTML = html;
  },

  _renderPieChart(cats, spent) {
    const labels = [], values = [], colors = [];
    cats.forEach(c => {
      if ((spent[c.name] || 0) > 0) {
        labels.push(c.name);
        values.push(spent[c.name]);
        colors.push(c.color);
      }
    });
    Charts.donut('pie-chart', labels, values, colors);
  },

  async _renderBarChart(cats) {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      let mo = this.month - i, yr = this.year;
      if (mo <= 0) { mo += 12; yr--; }
      months.push({ yr, mo, label: `${yr}/${String(mo).padStart(2, '0')}` });
    }
    const allTxs = await Promise.all(months.map(({ yr, mo }) => Storage.getTxsByMonth(yr, mo)));
    const datasets = cats.map(cat => ({
      label: cat.name,
      backgroundColor: cat.color + 'cc',
      data: allTxs.map(txs =>
        txs.filter(t => t.category === cat.name).reduce((s, t) => s + t.amount, 0)
      ),
    }));
    Charts.stacked('bar-chart', months.map(m => m.label), datasets);
  },

  // ===== Transactions =====
  async renderTransactions() {
    const [txs, cats] = await Promise.all([
      Storage.getTxsByMonth(this.year, this.month),
      Storage.getCategories(),
    ]);
    const sorted = txs.sort((a, b) => b.date.localeCompare(a.date));

    const el = document.getElementById('transaction-list');
    if (sorted.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          この月の明細はありません<br>
          右上の「📧 メール同期」でGmailからカード通知を取得できます
        </div>`;
      return;
    }

    el.innerHTML = '<div class="tx-list">' +
      sorted.map(tx => {
        const cat   = cats.find(c => c.name === tx.category);
        const color = cat?.color || '#94a3b8';
        return `
          <div class="tx-item">
            <div class="tx-date">${tx.date.replace(/-/g, '/')}</div>
            <div class="tx-info">
              <div class="tx-store">${this.esc(tx.store)}</div>
              <span class="tx-cat-tag" style="background:${color}22;color:${color}">
                ${this.esc(tx.category)}
              </span>
            </div>
            <div class="tx-amount">¥${tx.amount.toLocaleString()}</div>
            <div class="tx-actions">
              <button class="btn-icon" title="編集"
                      onclick="App.openTxModal('${tx.id}')">✏️</button>
              <button class="btn-icon" title="削除"
                      onclick="App.confirmDeleteTx('${tx.id}')">🗑️</button>
            </div>
          </div>`;
      }).join('') + '</div>';
  },

  // ===== Transaction Modal =====
  async openTxModal(id) {
    const cats   = await Storage.getCategories();
    const catSel = document.getElementById('tx-category');

    catSel.innerHTML =
      cats.map(c => `<option value="${this.esc(c.name)}">${this.esc(c.name)}</option>`).join('') +
      `<option value="その他">その他</option>`;

    if (id) {
      const txs = await Storage.getTxsByMonth(this.year, this.month);
      const tx  = txs.find(t => t.id === id);
      if (!tx) return;
      document.getElementById('tx-modal-title').textContent = '明細を編集';
      document.getElementById('tx-id').value     = tx.id;
      document.getElementById('tx-date').value   = tx.date;
      document.getElementById('tx-store').value  = tx.store;
      document.getElementById('tx-amount').value = tx.amount;
      catSel.value = tx.category;
    } else {
      document.getElementById('tx-modal-title').textContent = '明細を追加';
      document.getElementById('tx-id').value     = '';
      document.getElementById('tx-date').value   = new Date().toISOString().slice(0, 10);
      document.getElementById('tx-store').value  = '';
      document.getElementById('tx-amount').value = '';
      catSel.value = cats[0]?.name || 'その他';
    }

    document.getElementById('tx-modal').style.display = 'flex';
    document.getElementById('tx-store').focus();
  },

  closeTxModal() {
    document.getElementById('tx-modal').style.display = 'none';
  },

  async saveTx() {
    const id       = document.getElementById('tx-id').value;
    const date     = document.getElementById('tx-date').value;
    const store    = document.getElementById('tx-store').value.trim();
    const amount   = parseInt(document.getElementById('tx-amount').value, 10);
    const category = document.getElementById('tx-category').value;

    if (!date || !store || !amount || amount <= 0) {
      this.toast('必須項目をすべて入力してください', 'error');
      return;
    }

    const tx = {
      id: id || Storage.uid(),
      date, store, amount, category,
      confirmed: true,
      source: id ? 'edited' : 'manual',
    };
    await Storage.saveTx(tx);
    this.closeTxModal();
    this.toast('保存しました', 'success');
    await this.render();
  },

  async confirmDeleteTx(id) {
    if (confirm('この明細を削除しますか？')) {
      await Storage.deleteTx(id);
      this.toast('削除しました');
      await this.render();
    }
  },

  // ===== Gmail Sync（手動ボタン） =====
  _bindGmailBtn() {
    document.getElementById('gmail-sync-btn').addEventListener('click', () => this._manualSync());
  },

  async _manualSync() {
    const btn = document.getElementById('gmail-sync-btn');
    btn.disabled = true;
    btn.textContent = '同期中...';
    try {
      const txs = await Gmail.fetchNewEmails();
      if (txs.length > 0) {
        await Promise.all(txs.map(tx => Storage.saveTx(tx)));
        this.toast(`${txs.length}件の明細を自動振り分けしました`, 'success');
        await this.render();
      } else {
        this.toast('新しいカード通知メールはありませんでした');
      }
    } catch (e) {
      this.toast('エラー: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📧 メール同期';
    }
  },

  // ===== Settings =====
  async renderSettings() {
    const s = await Storage.getSettings();
    document.getElementById('client-id-input').value   = s.googleClientId || '';
    document.getElementById('gmail-query-input').value = s.gmailQuery || '';

    await Promise.all([
      this._renderBudgetForm(),
      this._renderCategoryList(),
    ]);

    document.getElementById('save-gmail-btn').onclick = async () => {
      const s = await Storage.getSettings();
      s.googleClientId = document.getElementById('client-id-input').value.trim();
      s.gmailQuery     = document.getElementById('gmail-query-input').value.trim();
      await Storage.saveSettings(s);
      this.toast('Gmail設定を保存しました', 'success');
    };

    document.getElementById('save-budget-btn').onclick = () => this.saveBudget();
    document.getElementById('add-category-btn').onclick = () => this.openCatModal();

    document.getElementById('recategorize-btn').onclick = async () => {
      const all  = Storage._get('transactions', []);
      const cats = await Storage.getCategories();
      const updated = all.map(tx => ({
        ...tx,
        category: Categorizer.suggest(tx.store, cats),
      }));
      Storage._set('transactions', updated);
      this.toast(`${updated.length}件の明細にカテゴリを再適用しました`, 'success');
      await this.render();
    };

    document.getElementById('reset-emails-btn').onclick = async () => {
      if (confirm('メール取得履歴をリセットしますか？\n次回の同期時に全メールを再取得します。')) {
        const s = await Storage.getSettings();
        s.fetchedIds = [];
        await Storage.saveSettings(s);
        this.toast('メール取得履歴をリセットしました');
      }
    };

    document.getElementById('reset-all-btn').onclick = async () => {
      if (confirm('全データをリセットしますか？\nこの操作は取り消せません。')) {
        Object.keys(localStorage)
          .filter(k => k.startsWith('kakeibo_'))
          .forEach(k => localStorage.removeItem(k));
        this.toast('データをリセットしました');
        await this.render();
      }
    };
  },

  async _renderBudgetForm() {
    const [cats, budget] = await Promise.all([
      Storage.getCategories(),
      Storage.getBudgetForMonth(this.year, this.month),
    ]);
    document.getElementById('budget-settings-form').innerHTML =
      cats.map(cat => `
        <div class="budget-setting-row">
          <label class="budget-setting-label">
            <span class="color-dot" style="background:${cat.color}"></span>
            ${this.esc(cat.name)}
          </label>
          <input type="number" class="budget-input" data-cat="${this.esc(cat.name)}"
                 value="${budget[cat.name] || 0}" min="0">
          <span style="color:#94a3b8;font-size:13px">円</span>
        </div>
      `).join('');
  },

  async saveBudget() {
    const budget = {};
    document.querySelectorAll('.budget-input').forEach(inp => {
      budget[inp.dataset.cat] = parseInt(inp.value, 10) || 0;
    });
    await Storage.setBudgetForMonth(this.year, this.month, budget);
    const s = await Storage.getSettings();
    s.defaultBudget = budget;
    await Storage.saveSettings(s);
    this.toast('予算を保存しました', 'success');
  },

  // ===== Category Management =====
  async _renderCategoryList() {
    const cats = await Storage.getCategories();
    document.getElementById('category-list').innerHTML =
      cats.map((cat, i) => `
        <div class="cat-row">
          <span class="cat-dot" style="background:${cat.color}"></span>
          <span class="cat-name">${this.esc(cat.name)}</span>
          <span class="cat-keywords">
            ${(cat.keywords || []).slice(0, 5).join(', ')}${(cat.keywords || []).length > 5 ? '…' : ''}
          </span>
          <button class="btn-icon" title="編集"  onclick="App.openCatModal(${i})">✏️</button>
          <button class="btn-icon" title="削除"  onclick="App.deleteCat(${i})">🗑️</button>
        </div>
      `).join('');
  },

  async openCatModal(idx) {
    if (idx !== undefined) {
      const cats = await Storage.getCategories();
      const cat  = cats[idx];
      document.getElementById('cat-modal-title').textContent = 'カテゴリを編集';
      document.getElementById('cat-idx').value      = idx;
      document.getElementById('cat-name').value     = cat.name;
      document.getElementById('cat-color').value    = cat.color;
      document.getElementById('cat-keywords').value = (cat.keywords || []).join(', ');
    } else {
      document.getElementById('cat-modal-title').textContent = 'カテゴリを追加';
      document.getElementById('cat-idx').value      = '';
      document.getElementById('cat-name').value     = '';
      document.getElementById('cat-color').value    = this._nextColor();
      document.getElementById('cat-keywords').value = '';
    }
    document.getElementById('cat-modal').style.display = 'flex';
    document.getElementById('cat-name').focus();
  },

  closeCatModal() {
    document.getElementById('cat-modal').style.display = 'none';
  },

  async saveCat() {
    const idx      = document.getElementById('cat-idx').value;
    const name     = document.getElementById('cat-name').value.trim();
    const color    = document.getElementById('cat-color').value;
    const keywords = document.getElementById('cat-keywords').value
                       .split(',').map(k => k.trim()).filter(Boolean);

    if (!name) { this.toast('カテゴリ名を入力してください', 'error'); return; }

    const cats = await Storage.getCategories();

    if (idx !== '') {
      cats[parseInt(idx, 10)] = { name, color, keywords };
    } else {
      if (cats.some(c => c.name === name)) {
        this.toast('同じ名前のカテゴリが既に存在します', 'error');
        return;
      }
      cats.push({ name, color, keywords });
    }

    await Storage.saveCategories(cats);
    this.closeCatModal();
    await Promise.all([this._renderCategoryList(), this._renderBudgetForm()]);
    this.toast('カテゴリを保存しました', 'success');
  },

  async deleteCat(idx) {
    const cats = await Storage.getCategories();
    if (cats.length <= 1) { this.toast('最低1つのカテゴリが必要です', 'error'); return; }
    if (!confirm(`「${cats[idx].name}」を削除しますか？`)) return;
    cats.splice(idx, 1);
    await Storage.saveCategories(cats);
    await Promise.all([this._renderCategoryList(), this._renderBudgetForm()]);
    this.toast('削除しました');
  },

  // ===== Modal overlay（外側クリックで閉じる） =====
  _bindModalOverlays() {
    ['tx-modal', 'cat-modal'].forEach(id => {
      document.getElementById(id).addEventListener('click', e => {
        if (e.target.id === id) document.getElementById(id).style.display = 'none';
      });
    });
  },

  // ===== Utilities =====
  _nextColor() {
    const palette = ['#34d399','#fbbf24','#a78bfa','#fb923c','#38bdf8','#f472b6','#4ade80'];
    const cfg = Storage._get('config');
    return palette[(cfg?.categories?.length || 0) % palette.length];
  },

  esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast' + (type ? ' ' + type : '');
    el.style.display = 'block';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3000);
  },
};

document.addEventListener('DOMContentLoaded', () => App.start());

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/kakeibo.claudecode/sw.js');
}
