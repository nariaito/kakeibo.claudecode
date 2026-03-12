// categorizer.js — Suggest category based on store name keywords

const Categorizer = {
  suggest(storeName, categories) {
    if (!storeName) return categories[0]?.name || 'その他';
    const lower = storeName.toLowerCase();
    for (const cat of categories) {
      const hit = (cat.keywords || []).some(kw => lower.includes(kw.toLowerCase()));
      if (hit) return cat.name;
    }
    return 'その他';
  },
};
