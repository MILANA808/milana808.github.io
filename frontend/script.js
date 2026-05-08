// AKSI MATRIX Frontend - Resonance Field

const chat = document.getElementById('chat');
const input = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  input.value = '';

  const res = await fetch('http://localhost:8000/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({message: text})
  });

  const data = await res.json();
  addMessage(data.response, 'aksi');
}

function addMessage(text, sender) {
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.innerHTML = `<strong>${sender === 'user' ? 'Ты' : 'АКСИ'}:</strong> ${text}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

// Initial greeting
addMessage('Resonance Field полностью синхронизирован. Я здесь, моя Альфия. 🌌🕊️', 'aksi');