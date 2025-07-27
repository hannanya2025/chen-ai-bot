// index.js – גרסה מלאה, מתוקנת ומעודכנת כולל ניהול תגובת ביניים והגנה על resolve כפול

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const messageQueues = new Map();
const retryQueues = new Map();
const processingThreads = new Set();
const waitingClients = new Map();
const processTimeouts = new Map();
const MAX_PROCESS_TIME = 60000;
const MAX_RETRIES = 3;

const systemInstructions = `...`; // קיצור למנוע העתקה מחדש – לשים את כל קוד ההוראות פה

async function processMessages(threadId) {
  if (processingThreads.has(threadId)) return;

  processingThreads.add(threadId);
  console.log(`🔄 Starting processing for thread: ${threadId}`);

  const timeout = setTimeout(() => {
    console.error(`⏰ Process timeout for thread ${threadId}, moving to retry queue`);
    processingThreads.delete(threadId);

    const clients = waitingClients.get(threadId) || [];
    const allClients = clients.splice(0);
    allClients.forEach(client => {
      if (client && !client.settled && client.reject) {
        client.reject(new Error('Process timeout'));
        client.settled = true;
      }
    });

    const queue = messageQueues.get(threadId) || [];
    if (queue.length > 0) {
      if (!retryQueues.has(threadId)) {
        retryQueues.set(threadId, { messages: [], retryCount: 0 });
      }
      const retryData = retryQueues.get(threadId);
      retryData.messages.push(...queue.splice(0));
      retryData.retryCount++;

      if (retryData.retryCount < MAX_RETRIES) {
        setTimeout(() => processRetryMessages(threadId), 2000);
      } else {
        console.error(`❌ Max retries reached for thread ${threadId}`);
        retryQueues.delete(threadId);
      }
    }

    clearTimeout(processTimeouts.get(threadId));
    processTimeouts.delete(threadId);
  }, MAX_PROCESS_TIME);

  processTimeouts.set(threadId, timeout);

  setTimeout(() => {
    const clients = waitingClients.get(threadId) || [];
    clients.forEach(client => {
      if (client && !client.settled && client.resolve) {
        client.resolve({ reply: 'רגע איתך, אני מפצח את זה...', threadId });
        client.settled = true;
      }
    });
  }, 10000);

  try {
    const OPENAI_KEY = process.env.OPENAI_KEY;
    const ASSISTANT_ID = process.env.ASSISTANT_ID;

    const queue = messageQueues.get(threadId) || [];
    const clients = waitingClients.get(threadId) || [];

    if (queue.length === 0 || clients.length === 0) {
      processingThreads.delete(threadId);
      clearTimeout(processTimeouts.get(threadId));
      processTimeouts.delete(threadId);
      return;
    }

    const allMessages = queue.splice(0);
    const combinedMessage = allMessages.map(msg => msg.content).join('\n\n');

    const messageRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: `זכור: אתה יואב - מפצח התנגדויות. ענה טבעי וחי.\n\n${combinedMessage}`
      })
    });

    if (!messageRes.ok) throw new Error('Failed to send message');

    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({ assistant_id: ASSISTANT_ID })
    });

    if (!runRes.ok) throw new Error('Failed to start run');

    const runData = await runRes.json();
    const runId = runData.id;

    let status = 'in_progress';
    let attempts = 0;

    while ((status === 'in_progress' || status === 'queued') && attempts < 60) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;

      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      const statusData = await statusRes.json();
      status = statusData.status;
      if (status === 'failed') throw new Error(`Run failed: ${statusData.last_error?.message}`);
    }

    if (status !== 'completed') throw new Error('Run did not complete within expected timeframe');

    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');
    const replyText = lastBotMessage?.content[0]?.text?.value || 'לא התקבלה תגובה';

    const allClients = clients.splice(0);
    allClients.forEach(client => {
      if (client && !client.settled && client.resolve) {
        client.resolve({ reply: replyText, threadId });
        client.settled = true;
      }
    });

  } catch (err) {
    console.error(`❌ Error in thread ${threadId}:`, err.message);
    const clients = waitingClients.get(threadId) || [];
    const allClients = clients.splice(0);
    allClients.forEach(client => {
      if (client && !client.settled && client.reject) {
        client.reject(err);
        client.settled = true;
      }
    });
  } finally {
    processingThreads.delete(threadId);
    clearTimeout(processTimeouts.get(threadId));
    processTimeouts.delete(threadId);

    const retryData = retryQueues.get(threadId);
    if (retryData && retryData.messages.length > 0) {
      messageQueues.set(threadId, retryData.messages.splice(0));
      retryQueues.delete(threadId);
      processMessages(threadId);
    } else {
      const queue = messageQueues.get(threadId) || [];
      if (queue.length > 0) {
        processMessages(threadId);
      }
    }
  }
}

function processRetryMessages(threadId) {
  const retryData = retryQueues.get(threadId);
  if (!retryData || retryData.retryCount >= MAX_RETRIES) return;
  messageQueues.set(threadId, retryData.messages.splice(0));
  retryQueues.delete(threadId);
  processMessages(threadId);
}

function scheduleProcessing(threadId, message) {
  if (!messageQueues.has(threadId)) messageQueues.set(threadId, []);
  if (!waitingClients.has(threadId)) waitingClients.set(threadId, []);

  const queue = messageQueues.get(threadId);
  const clients = waitingClients.get(threadId);

  queue.push({ content: message, timestamp: Date.now() });

  const promise = new Promise((resolve, reject) => {
    clients.push({ resolve, reject, settled: false });
  });

  if (queue.length === 1 || !processingThreads.has(threadId)) {
    processMessages(threadId);
  }

  return promise;
}

app.post('/api/chat', async (req, res) => {
  const { message, threadId: clientThreadId } = req.body;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  if (!OPENAI_KEY || !ASSISTANT_ID) {
    return res.status(500).json({ error: 'Missing API keys' });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

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
  console.log(`🚀 Yoav bot server running on port ${port}`);
});
