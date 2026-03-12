// gmail.js — Gmail OAuth2 + API integration

const Gmail = {
  tokenClient: null,
  token: null,

  async login() {
    const cfg = await Storage.getSettings();
    const cid = (cfg.googleClientId || '').trim();
    if (!cid) {
      App.toast('設定でGoogle Client IDを入力してください', 'error');
      return false;
    }
    if (!window.google?.accounts?.oauth2) {
      App.toast('Google認証ライブラリが読み込み中です。少し待って再試行してください', 'error');
      return false;
    }
    return new Promise((resolve) => {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: cid,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: (res) => {
          if (res.access_token) {
            this.token = res.access_token;
            resolve(true);
          } else {
            App.toast('Google認証に失敗しました', 'error');
            resolve(false);
          }
        },
        error_callback: (err) => {
          App.toast('認証エラー: ' + (err.message || err.type || '不明'), 'error');
          resolve(false);
        },
      });
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  },

  async fetchNewEmails() {
    if (!this.token) {
      const ok = await this.login();
      if (!ok) return [];
    }

    const cfg = await Storage.getSettings();
    const q   = encodeURIComponent(cfg.gmailQuery);

    let messages;
    try {
      const data = await this._api(`messages?q=${q}&maxResults=100`);
      messages = data.messages || [];
    } catch (e) {
      if (e.status === 401) {
        this.token = null;
        const ok = await this.login();
        if (!ok) return [];
        const data = await this._api(`messages?q=${q}&maxResults=100`);
        messages = data.messages || [];
      } else {
        throw e;
      }
    }

    // 既取得IDをまとめて確認（Firestoreの読み取り1回）
    const fetchedSet = await Storage.getFetchedIds();
    const newMsgs    = messages.filter(m => !fetchedSet.has(m.id));
    if (newMsgs.length === 0) return [];

    // メールを解析
    const cats = await Storage.getCategories();
    const txs  = [];
    const processedIds = [];

    for (const msg of newMsgs) {
      processedIds.push(msg.id);
      const tx = await this._parseMessage(msg.id, cats);
      if (tx) txs.push(tx);
    }

    // fetchedIds を一括更新（Firestoreへの書き込み1回）
    await Storage.bulkMarkFetched(processedIds);

    return txs;
  },

  async _parseMessage(id, cats) {
    try {
      const data    = await this._api(`messages/${id}?format=full`);
      const dateHdr = data.payload.headers.find(h => h.name === 'Date');
      const fallback = dateHdr
        ? new Date(dateHdr.value).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      const body = this._extractBody(data.payload);
      if (!body) return null;

      const p = Parser.parse(body, fallback);
      if (!p.store || !p.amount) return null;

      return {
        id:        Storage.uid(),
        date:      p.date,
        store:     p.store,
        amount:    p.amount,
        category:  Categorizer.suggest(p.store, cats),
        confirmed: true,
        source:    'gmail',
        emailId:   id,
      };
    } catch (e) {
      console.warn('parseMessage error', id, e);
      return null;
    }
  },

  _extractBody(payload) {
    if (payload.body?.data) return this._b64(payload.body.data);
    const parts = payload.parts || [];
    for (const p of parts) {
      if (p.mimeType === 'text/plain' && p.body?.data) return this._b64(p.body.data);
    }
    for (const p of parts) {
      if (p.mimeType === 'text/html' && p.body?.data) return this._b64(p.body.data);
      if (p.parts) {
        for (const sp of p.parts) {
          if (sp.mimeType === 'text/plain' && sp.body?.data) return this._b64(sp.body.data);
          if (sp.mimeType === 'text/html'  && sp.body?.data) return this._b64(sp.body.data);
        }
      }
    }
    return null;
  },

  _b64(str) {
    const bin   = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  },

  async _api(endpoint) {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    if (!res.ok) {
      const err = new Error(`Gmail API error: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  },
};
