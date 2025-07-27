// index.js – גרסה מלאה עם סנכרון הקלדה חכם, איחוד הודעות והגנה מכפלות
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 10000;

const _filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(_filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const messageQueues = new Map();
const retryQueues = new Map();
const processingThreads = new Set();
const waitingClients = new Map();
const processTimeouts = new Map();
const lastTypingTimeMap = new Map();

const MAX_PROCESS_TIME = 60000;
const MAX_RETRIES = 3;
const TYPING_GRACE_PERIOD = 1500;

const systemInstructions = `זכור: אתה יואב - מפצח התנגדויות. ענה טבעי וחי.`;

// הגנה גלובלית מפני שליחה כפולה
if (!global._sentThreads) global._sentThreads = new Set();

async function processMessages(threadId) {
  if (processingThreads.has(threadId)) return;
  processingThreads.add(threadId);

  const timeout = setTimeout(() => {
    console.error(`⏰ Process timeout for thread ${threadId}`);
    processingThreads.delete(threadId);
    const clients = waitingClients.get(threadId) || [];
    clients.splice(0).forEach(client => client?.reject?.(new Error('Process timeout')));
    processTimeouts.delete(threadId);
  }, MAX_PROCESS_TIME);
  processTimeouts.set(threadId, timeout);

  while (true) {
    const lastTyping = lastTypingTimeMap.get(threadId) || 0;
    const now = Date.now();
    if (now - lastTyping > TYPING_GRACE_PERIOD) break;
    await new Promise(r => setTimeout(r, 500));
  }

  const queue = messageQueues.get(threadId) || [];
  const clients = waitingClients.get(threadId) || [];
  if (!queue.length || !clients.length) {
    processingThreads.delete(threadId);
    clearTimeout(processTimeouts.get(threadId));
    processTimeouts.delete(threadId);
    return;
  }

  const allMessages = queue.splice(0);
  const combined = allMessages.map(m => m.content).join('\n\n');
  const isFirstMessage = allMessages.length > 0 && !lastTypingTimeMap.has(threadId);
  const fullContent = isFirstMessage ? `${systemInstructions}\n\n${combined}` : combined;

  try {
    const OPENAI_KEY = process.env.OPENAI_KEY;
    const ASSISTANT_ID = process.env.ASSISTANT_ID;

    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({ role: 'user', content: fullContent })
    });

    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({ assistant_id: ASSISTANT_ID })
    });

    const runData = await runRes.json();
    const runId = runData.id;

    let status = 'in_progress';
    let attempts = 0;

    while ((status === 'in_progress' || status === 'queued') && attempts < 60) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      const res = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const statusData = await res.json();
      status = statusData.status;
      if (status === 'failed') throw new Error(statusData.last_error?.message || 'Run failed');
    }

    if (status !== 'completed') throw new Error('Run did not complete in time');

    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');
    const reply = lastBotMessage?.content[0]?.text?.value || 'לא התקבלה תגובה';

    const uniqueKey = `sent-${threadId}`;
    if (!global._sentThreads.has(uniqueKey)) {
      global._sentThreads.add(uniqueKey);
      const allClients = clients.splice(0);
      allClients.forEach(c => c?.resolve?.({ reply, threadId }));
    }

  } catch (err) {
    const allClients = clients.splice(0);
    allClients.forEach(c => c?.reject?.(err));
  } finally {
    lastTypingTimeMap.delete(threadId);
    processingThreads.delete(threadId);
    clearTimeout(processTimeouts.get(threadId));
    processTimeouts.delete(threadId);
    global._sentThreads?.delete?.(`sent-${threadId}`);

    const retryData = retryQueues.get(threadId);
    if (retryData?.messages.length) {
      messageQueues.set(threadId, retryData.messages.splice(0));
      retryQueues.delete(threadId);
    }
  }
}

function scheduleProcessing(threadId, message) {
  if (!messageQueues.has(threadId)) messageQueues.set(threadId, []);
  if (!waitingClients.has(threadId)) waitingClients.set(threadId, []);
  messageQueues.get(threadId).push({ content: message });
  const promise = new Promise((resolve, reject) => {
    waitingClients.get(threadId).push({ resolve, reject });
  });
  if (!processingThreads.has(threadId)) processMessages(threadId);
  return promise;
}

app.post('/api/typing', (req, res) => {
  const { threadId } = req.body;
  if (!threadId) return res.status(400).json({ error: 'Missing threadId' });
  lastTypingTimeMap.set(threadId, Date.now());
  res.json({ status: 'typing acknowledged' });
});

app.post('/api/chat', async (req, res) => {
  const { message, threadId: clientThreadId } = req.body;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  if (!OPENAI_KEY || !ASSISTANT_ID)
    return res.status(500).json({ error: 'Missing API keys' });

  if (!message || typeof message !== 'string')
    return res.status(400).json({ error: 'Message is required' });

  try {
    let threadId = clientThreadId;
    if (!threadId) {
      const threadRes = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const threadData = await threadRes.json();
      threadId = threadData.id;

      await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: systemInstructions
        })
      });
    }

    const result = await scheduleProcessing(threadId, message);
    res.json(result);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
