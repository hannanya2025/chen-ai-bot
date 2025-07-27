// script.js – תסריט צד לקוח מלא לסנכרון הקלדה ושליחה

const form = document.getElementById('form');
const input = document.getElementById('input');
const messagesContainer = document.getElementById('messages');

let threadId = null;
let typingTimeout = null;
let isWaiting = false; // משתנה חדש כדי למנוע שליחה כפולה

// עדכון שרת על כך שהמשתמש מקליד
function notifyTyping() {
  if (!threadId) return;
  fetch('/api/typing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId })
  });
}

// בכל פעם שהמשתמש מקליד – תשלח הודעת הקלדה, אבל לא יותר מדי
input.addEventListener('input', () => {
  clearTimeout(typingTimeout);
  notifyTyping();
  typingTimeout = setTimeout(() => {}, 1000);
});

// שליחת ההודעה
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message || isWaiting) return; // מניעת שליחה כפולה

  appendMessage('user', message);
  input.value = '';
  input.disabled = true;
  isWaiting = true; // נועל שליחה

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, threadId })
    });

    const data = await res.json();

    if (data.error) {
      appendMessage('error', `שגיאה: ${data.error}`);
    } else {
      threadId = data.threadId || threadId;
      appendMessage('bot', data.reply);
    }
  } catch (err) {
    appendMessage('error', `שגיאה בתקשורת: ${err.message}`);
  }

  input.disabled = false;
  input.focus();
  isWaiting = false; // משחרר את המנעול
});

// פונקציה להצגת הודעות
function appendMessage(role, text) {
  const msg = document.createElement('div');
  msg.classList.add('msg', role);
  msg.textContent = text;
  messagesContainer.appendChild(msg);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
