// storage.js — localStorage data layer (Firebaseなし版)

const Storage = {
  _prefix: 'kakeibo_',

  _key(name) { return this._prefix + name; },

  _get(name, def = null) {
    try {
      const v = localStorage.getItem(this._key(name));
      return v !== null ? JSON.parse(v) : def;
    } catch { return def; }
  },

  _set(name, value) {
    localStorage.setItem(this._key(name), JSON.stringify(value));
  },

  // ===== Transactions =====
  async getTxsByMonth(y, m) {
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const end   = `${y}-${String(m).padStart(2, '0')}-31`;
    const all   = this._get('transactions', []);
    return all.filter(t => t.date >= start && t.date <= end);
  },

  async saveTx(tx) {
    const all = this._get('transactions', []);
    const idx = all.findIndex(t => t.id === tx.id);
    if (idx >= 0) all[idx] = tx;
    else all.push(tx);
    this._set('transactions', all);
  },

  async deleteTx(id) {
    const all = this._get('transactions', []);
    this._set('transactions', all.filter(t => t.id !== id));
  },

  // ===== Budgets =====
  async getBudgetForMonth(y, m) {
    const key     = `${y}-${String(m).padStart(2, '0')}`;
    const budgets = this._get('budgets', {});
    if (budgets[key]) return { ...budgets[key] };
    const cfg = await this.getConfig();
    return { ...(cfg.defaultBudget || {}) };
  },

  async setBudgetForMonth(y, m, budget) {
    const key     = `${y}-${String(m).padStart(2, '0')}`;
    const budgets = this._get('budgets', {});
    budgets[key]  = budget;
    this._set('budgets', budgets);
  },

  // ===== Config（設定 ＋ カテゴリ ＋ fetchedIds）=====
  DEFAULT_CATS: [
    {
      name: 'その他',
      color: '#94a3b8',
      keywords: [],
    },
    {
      name: '食費',
      color: '#f87171',
      keywords: [
        'マクドナルド','モスバーガー','ケンタッキー','すき家','吉野家','松屋',
        'スターバックス','スタバ','ドトール','コメダ','タリーズ','サンマルク',
        'サイゼリヤ','ガスト','デニーズ','ジョナサン','バーミヤン',
        'ラーメン','寿司','焼肉','居酒屋','カフェ','ピザ','うどん','そば',
        'ファミレス','バーガー','弁当','惣菜','食堂','レストラン',
        'pizza','cafe','restaurant','food',
      ],
    },
    {
      name: '物品費',
      color: '#60a5fa',
      keywords: [
        'Amazon','アマゾン','ヨドバシ','ビックカメラ','ヤマダ電機','ケーズデンキ',
        'ニトリ','IKEA','イケア','ユニクロ','UNIQLO','ZARA','GU',
        '楽天','ヤフーショッピング','Yahoo','メルカリ','PayPayモール',
        'ドン・キホーテ','ドンキ','ロフト','東急ハンズ','ハンズ','しまむら',
        'コストコ','COSTCO','無印','MUJI','ダイソー','セリア','キャンドゥ',
      ],
    },
  ],

  _defaultConfig() {
    return {
      googleClientId: '',
      gmailQuery: 'subject:(ご利用のお知らせ OR カードご利用 OR ご利用確認 OR 利用確認 OR ご利用代金)',
      defaultBudget: { '食費': 30000, '物品費': 20000 },
      fetchedIds: [],
      categories: this.DEFAULT_CATS,
    };
  },

  async getConfig() {
    const saved = this._get('config');
    if (saved) return { ...this._defaultConfig(), ...saved };
    return this._defaultConfig();
  },

  async saveConfig(cfg) {
    this._set('config', cfg);
  },

  async getCategories() {
    const cfg = await this.getConfig();
    return cfg.categories || this.DEFAULT_CATS;
  },

  async saveCategories(cats) {
    const cfg = await this.getConfig();
    cfg.categories = cats;
    await this.saveConfig(cfg);
  },

  async getSettings() { return this.getConfig(); },
  async saveSettings(s) { await this.saveConfig(s); },

  // fetchedIds の管理（Gmail重複取得防止）
  async bulkMarkFetched(ids) {
    if (ids.length === 0) return;
    const cfg = await this.getConfig();
    const set = new Set(cfg.fetchedIds || []);
    ids.forEach(id => set.add(id));
    cfg.fetchedIds = [...set];
    await this.saveConfig(cfg);
  },

  async getFetchedIds() {
    const cfg = await this.getConfig();
    return new Set(cfg.fetchedIds || []);
  },

  // ===== Util =====
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },
};
