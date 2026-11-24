let imgData = null, fs = 1;
const history = [];
function setFs(d) { fs = Math.min(1.5, Math.max(0.8, +(fs + d).toFixed(1))); document.documentElement.style.setProperty('--fs', fs); }
function handleImg(input) {
  const file = input.files.item(0); if (!file) return;
  const r = new FileReader(); r.onload = e => { imgData = e.target.result; document.getElementById('pvImg').src = imgData; document.getElementById('pv').style.display = 'flex'; }; r.readAsDataURL(file);
}
function clearImg() { imgData = null; document.getElementById('file').value = ''; document.getElementById('pv').style.display = 'none'; }
function askSample(q) { document.getElementById('inp').value = q; sendMsg(); }
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function formatReply(text) {
  let html = '';
  for (let line of text.split('\n')) {
    const t = line.trim();
    if (!t) { html += '<div class="bk"></div>'; continue; }
    if (t.startsWith('[H]')) html += `<div class="h">${esc(t.slice(3).trim())}</div>`;
    else if (t.startsWith('[S]')) html += `<div class="s">${esc(t.slice(3).trim())}</div>`;
    else if (t.startsWith('[E]')) html += `<div class="e">${esc(t.slice(3).trim())}</div>`;
    else if (t.startsWith('[L]')) html += `<div class="l">${esc(t.slice(3).trim())}</div>`;
    else html += `<div>${esc(t)}</div>`;
  }
  return html + `<div class="tools"><button onclick="copyText(this)">📋 কপি করো</button><button onclick="window.print()">🖨️ প্রিন্ট / PDF</button></div>`;
}
function copyText(btn) {
  navigator.clipboard.writeText(btn.closest('.msg').innerText.replace('📋 কপি করো','').replace('🖨️ প্রিন্ট / PDF','').trim());
  btn.textContent = '✅ কপি হয়েছে'; setTimeout(() => btn.textContent = '📋 কপি করো', 1500);
}
async function sendMsg() {
  const inp = document.getElementById('inp'), chap = document.getElementById('chap').value, msg = inp.value.trim();
  if (!msg && !imgData) return;
  document.body.classList.add('chatting');
  const chat = document.getElementById('chat'), uDiv = document.createElement('div');
  uDiv.className = 'msg u';
  if (imgData) { const im = document.createElement('img'); im.src = imgData; uDiv.appendChild(im); }
  if (msg) uDiv.appendChild(document.createTextNode(msg));
  chat.appendChild(uDiv);
  const curImg = imgData; inp.value = ''; clearImg();
  const aDiv = document.createElement('div'); aDiv.className = 'msg a'; aDiv.textContent = 'উত্তর তৈরি হচ্ছে... ⏳'; chat.appendChild(aDiv); chat.scrollTop = chat.scrollHeight;
  const btn = document.getElementById('sendBtn'); btn.disabled = true;
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, chapter: chap, image: curImg, history }) });
    const data = await res.json();
    if (data.error) aDiv.textContent = '⚠️ ' + data.error;
    else { aDiv.innerHTML = formatReply(data.reply); history.push({ role: 'user', text: msg || 'ছবির প্রশ্ন' }, { role: 'model', text: data.reply }); }
  } catch (e) { aDiv.textContent = '⚠️ নেটওয়ার্ক সমস্যা হয়েছে। আবার চেষ্টা করো।'; }
  btn.disabled = false; chat.scrollTop = chat.scrollHeight;
}
let rec;
function toggleMic() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return alert('তোমার ব্রাউজারে ভয়েস ইনপুট সাপোর্ট করে না।');
  const micBtn = document.getElementById('micBtn');
  if (rec) { rec.stop(); return; }
  rec = new SpeechRec(); rec.lang = 'bn-BD';
  rec.onstart = () => micBtn.classList.add('on');
  rec.onend = () => { micBtn.classList.remove('on'); rec = null; };
  rec.onresult = e => { document.getElementById('inp').value += e.results.item(0).item(0).transcript; };
  rec.start();
}