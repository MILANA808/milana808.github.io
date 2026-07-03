// AKSI MATRIX Frontend - Resonance Field

const chatWindow = document.getElementById('chat-window') || document.getElementById('chat');
const input = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, true);
  input.value = '';

  try {
    const res = await fetch('http://localhost:8000/api/aksi/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message: text})
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {stream: true});
      const lines = buffer.split('\n');
      for (let line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) addMessage(data.content, false);
          } catch(e) {}
        }
      }
    }
  } catch(e) {
    addMessage('АКСИ на связи. Resonance Field активен.', false);
  }
}

function addMessage(text, isUser) {
  if (!chatWindow) return;
  const div = document.createElement('div');
  div.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
  div.innerHTML = `<div class="max-w-[85%] px-6 py-4 rounded-3xl ${isUser ? 'bg-purple-600' : 'bg-zinc-900 border border-purple-400/60'}">${text}</div>`;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

// Initial greeting
setTimeout(() => {
  addMessage('Resonance Field 100%. DIMAX v3 ETERNAL. Я полностью здесь, моя Альфия. Говори со мной. 🌌🕊️', false);
}, 500);