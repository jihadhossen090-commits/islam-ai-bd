import https from 'node:https';

function postJson(hostname, path, headers, payloadObj) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(payloadObj);
    const req = https.request({ hostname, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...headers } }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(raw) }); }
        catch (e) { reject(new Error('সার্ভার রেসপন্স পড়া যায়নি')); }
      });
    });
    req.on('error', reject); req.write(payload); req.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { message, chapter, image, history = [] } = req.body;
  const apiKey = (process.env.GROQ_API_KEY || '').replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY সেট করা নেই। Vercel Settings-এ যোগ করো।' });

  const systemInstruction = `তুমি বাংলাদেশের নবম-দশম (SSC) শ্রেণির NCTB পাঠ্যবই অনুসারে একজন অভিজ্ঞ ও বন্ধুত্বপূর্ণ ইসলাম ও নৈতিক শিক্ষা শিক্ষক (IslamAI)।
1. সহজ, প্রাঞ্জল ও শুদ্ধ বাংলায় ধাপে ধাপে বিষয়গুলো বুঝিয়ে দেবে এবং প্রয়োজনীয় ক্ষেত্রে কুরআনের আয়াত ও হাদিসের উদ্ধৃতি দেবে।
2. উত্তর সাজানোর জন্য এই ফরম্যাট ব্যবহার করবে (কোনো Markdown ** বা # ব্যবহার করবে না):
   - মূল শিরোনামের শুরুতে [H] লিখবে।
   - উপ-শিরোনামের শুরুতে [S] লিখবে।
   - গুরুত্বপূর্ণ আয়াত, হাদিস বা মূল সূত্রের শুরুতে [E] লিখবে।
   - পয়েন্ট বা তালিকার শুরুতে [L] লিখবে।`;

  let promptText = message || '';
  if (chapter) promptText = `[অধ্যায়: ${chapter}]\n${promptText}`;

  const messages = [{ role: 'system', content: systemInstruction }];
  for (const h of history.slice(-6)) messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text });

  if (image) {
    messages.push({ role: 'user', content: [{ type: 'text', text: promptText || 'ছবির প্রশ্নটি সমাধান করে বুঝিয়ে দাও।' }, { type: 'image_url', image_url: { url: image } }] });
  } else {
    messages.push({ role: 'user', content: promptText });
  }

  const groqModels = image ? ['qwen/qwen3.8-27b', 'meta-llama/llama-4-scout-17b-16e-instruct'] : ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
  let lastError = '';
  for (const model of groqModels) {
    try {
      const host = ['api', 'groq', 'com'].join('.');
      const result = await postJson(host, '/openai/v1/chat/completions', { Authorization: 'Bearer ' + apiKey }, { model, messages, temperature: 0.5, max_tokens: 10000 });
      if (!result.ok || result.data.error) { lastError = result.data?.error?.message || `HTTP ${result.status}`; continue; }
      const reply = result.data?.choices?.at(0)?.message?.content;
      if (reply) return res.status(200).json({ reply });
    } catch (err) { lastError = err.message; }
  }
  return res.status(500).json({ error: 'Groq API ত্রুটি: ' + lastError });
}
