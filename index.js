import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  const { message, threadId: clientThreadId } = req.body;

  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  if (!OPENAI_KEY || !ASSISTANT_ID) {
    return res.status(500).json({ error: 'Missing OPENAI_KEY or ASSISTANT_ID in .env' });
  }

  try {
    let threadId = clientThreadId;

    // אם אין thread קיים – צור חדש
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
    }

    // הוסף הודעה
    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });

    // הרץ את האסיסטנט
    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID
      })
    });

    const runData = await runRes.json();
    const runId = runData.id;

    // המתן לסיום הריצה
    let runStatus = 'in_progress';
    while (runStatus === 'in_progress' || runStatus === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const statusData = await statusRes.json();
      runStatus = statusData.status;
    }

    if (runStatus !== 'completed') {
      return res.status(500).json({ error: 'הבוט לא הצליח לעבד את הבקשה.' });
    }

    // שלוף את התגובה
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');

    if (!lastBotMessage) {
      return res.status(500).json({ error: 'הבוט לא החזיר תגובה.' });
    }

    const replyText = lastBotMessage.content[0]?.text?.value || 'הבוט לא ענה.';
    res.json({ reply: replyText, threadId });

  } catch (err) {
    console.error('❌ שגיאה:', err);
    res.status(500).json({ error: 'שגיאה כללית בתקשורת עם הבוט.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 השרת עלה על פורט ${port}`);
});
