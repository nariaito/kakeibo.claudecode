// parser.js — Extract transaction data from email body text

const Parser = {
  parse(raw, fallbackDate) {
    const text = this.clean(raw);
    return {
      date:   this.extractDate(text)   || fallbackDate,
      store:  this.extractStore(text),
      amount: this.extractAmount(text),
    };
  },

  clean(html) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#[0-9]+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  extractDate(t) {
    const pats = [
      /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/,
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
      /(\d{4})-(\d{2})-(\d{2})/,
    ];
    for (const p of pats) {
      const m = t.match(p);
      if (m) {
        return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
      }
    }
    return null;
  },

  extractStore(t) {
    const pats = [
      /(?:ご利用先|利用先)[：:\s　]+([^\n\r、。\t]{2,40})/,
      /(?:ご利用)?加盟店名?[：:\s　]+([^\n\r、。\t]{2,40})/,
      /利用店名[・商品名]*[：:\s　]+([^\n\r、。\t]{2,40})/,
      /利用箇所[：:\s　]+([^\n\r、。\t]{2,40})/,
      /ご利用場所[：:\s　]+([^\n\r、。\t]{2,40})/,
      /店舗名?[：:\s　]+([^\n\r、。\t]{2,40})/,
      /お店[：:\s　]+([^\n\r、。\t]{2,40})/,
    ];
    for (const p of pats) {
      const m = t.match(p);
      if (m) return m[1].trim().replace(/\s{2,}/g, ' ');
    }
    return null;
  },

  extractAmount(t) {
    const pats = [
      /(?:ご利用)?金額[：:\s　]*[¥￥]?\s*([\d,]+)\s*円?/,
      /利用金額[：:\s　]*[¥￥]?\s*([\d,]+)/,
      /お支払金額[：:\s　]*[¥￥]?\s*([\d,]+)/,
      /請求金額[：:\s　]*[¥￥]?\s*([\d,]+)/,
      /[¥￥]([\d,]+)/,
      /([\d,]+)\s*円/,
    ];
    for (const p of pats) {
      const m = t.match(p);
      if (m) {
        const n = parseInt(m[1].replace(/,/g, ''), 10);
        if (n > 0 && n < 10_000_000) return n;
      }
    }
    return null;
  },
};
