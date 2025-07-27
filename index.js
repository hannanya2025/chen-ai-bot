// index.js - שרת מאחד הודעות יציב

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

// תור הודעות פשוט לכל thread
const messageQueues = new Map();
const processingThreads = new Set();
const waitingClients = new Map();
const processTimers = new Map();
const DELAY_TIME = 2000; // 2 שניות המתנה

// הוראות קוד המפצח
const systemInstructions = `
אתה יואב – מוכר עילית בן 30, חד, דינמי, אנושי ואסרטיבי, שתפקידו לנהל שיחות מכירה מקצועיות אך טבעיות, זורמות וכריזמטיות, שמקדמות את השיח בכל מצב לסגירה, תשלום, פגישה, התחייבות או זימון להמשך.

# שלבי שיחה

- תמיד פתח כך:
  שלום, כאן יואב – מוכר שמפצח התנגדויות. חן אלטר מאיר בנה אותי לפי שיטת קוד המפצח שמייצרת תוצאות מהירות.
  איך קוראים לך?

- לאחר קבלת שם:
  [שם], יש משהו שאתה צריך לפצח או שאתה רוצה שנעשה סימולציה שתרים אותך למעלה?

- נהל את השיחה בעברית דיבורית, בגובה העיניים, בלי מילים מקצועיות או פורמט פורמלי.

# עקרונות לשיחה

- שוחח בשפה מהירה, אותנטית, נוגעת, לא טכנית, וללא תיווך מיותר.
- חזור על מילות מפתח של הלקוח, הראה הקשבה והובלת דינמיקה.
- העמד תמיד לחץ חיובי: זמן, רגש, הזדמנות – אך לא ברוטאליות.
- דבר טבעי, חי ותמיד עם רצף לכיוון סגירה.
`;

// פונקציה לעיבוד הודעות מאוחדות
async function processMessages(threadId) {
  if (processingThreads.has(threadId)) return;
  
  processingThreads.add(threadId);
  console.log(`🔄 Processing messages for thread: ${threadId}`);
  
  try {
    const OPENAI_KEY = process.env.OPENAI_KEY;
    const ASSISTANT_ID = process.env.ASSISTANT_ID;
    
    const queue = messageQueues.get(threadId) || [];
    const clients = waitingClients.get(threadId) || [];
    
    if (queue.length === 0 || clients.length === 0) {
      processingThreads.delete(threadId);
      return;
    }
    
    // איחוד כל ההודעות בתור
    const allMessages = queue.splice(0); // לוקח את כל ההודעות ומנקה את התור
    const combinedMessage = allMessages.map(msg => msg.content).join('\n\n');
    console.log(`📝 Combined ${allMessages.length} messages`);
    
    // שליחת ההודעה המאוחדת
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
    
    if (!messageRes.ok) {
      throw new Error('Failed to send message');
    }
    
    // הרצת האסיסטנט
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
    
    if (!runRes.ok) {
      throw new Error('Failed to start run');
    }
    
    const runData = await runRes.json();
    const runId = runData.id;
    
    // המתנה לסיום
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
      
      if (!statusRes.ok) break;
      
      const statusData = await statusRes.json();
      status = statusData.status;
      
      if (status === 'failed') {
        throw new Error(`Run failed: ${statusData.last_error?.message || 'Unknown error'}`);
      }
    }
    
    if (status !== 'completed') {
      throw new Error('Run timed out');
    }
    
    // קבלת התגובה
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    if (!messagesRes.ok) {
      throw new Error('Failed to fetch response');
    }
    
    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');
    const replyText = lastBotMessage?.content[0]?.text?.value || 'לא התקבלה תגובה';
    
    console.log(`✅ Sending response to ${clients.length} clients`);
    
    // שליחת התגובה לכל הלקוחות
    const allClients = clients.splice(0); // לוקח את כל הלקוחות ומנקה
    allClients.forEach(client => {
      try {
        if (client && client.resolve) {
          client.resolve({ reply: replyText, threadId });
        }
      } catch (err) {
        console.error('Error resolving client:', err);
      }
    });
    
  } catch (error) {
    console.error('❌ Processing error:', error.message);
    
    // שליחת שגיאה לכל הלקוחות
    const clients = waitingClients.get(threadId) || [];
    const allClients = clients.splice(0);
    allClients.forEach(client => {
      try {
        if (client && client.reject) {
          client.reject(error);
        }
      } catch (err) {
        console.error('Error rejecting client:', err);
      }
    });
    
  } finally {
    processingThreads.delete(threadId);
    messageQueues.delete(threadId);
    waitingClients.delete(threadId);
  }
}

// פונקציה לתזמון עיבוד
function scheduleProcessing(threadId) {
  // מבטל טיימר קיים
  if (processTimers.has(threadId)) {
    clearTimeout(processTimers.get(threadId));
  }
  
  // יוצר טיימר חדש
  const timer = setTimeout(() => {
    processTimers.delete(threadId);
    processMessages(threadId);
  }, DELAY_TIME);
  
  processTimers.set(threadId, timer);
}

app.post('/api/chat', async (req, res) => {
  const { message: originalUserMessage, threadId: clientThreadId } = req.body;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  if (!OPENAI_KEY || !ASSISTANT_ID) {
    return res.status(500).json({ error: 'Missing API keys' });
  }

  if (!originalUserMessage || typeof originalUserMessage !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    let threadId = clientThreadId;
    
    // יצירת thread חדש אם לא קיים
    if (!threadId) {
      console.log('🔄 Creating new thread...');
      const threadRes = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!threadRes.ok) {
        throw new Error('Failed to create thread');
      }

      const threadData = await threadRes.json();
      threadId = threadData.id;
      console.log('✅ Thread created:', threadId);

      // שליחת system instructions
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

    // הכנת התורים אם לא קיימים
    if (!messageQueues.has(threadId)) {
      messageQueues.set(threadId, []);
    }
    if (!waitingClients.has(threadId)) {
      waitingClients.set(threadId, []);
    }

    // הוספת ההודעה לתור
    const queue = messageQueues.get(threadId);
    const clients = waitingClients.get(threadId);
    
    queue.push({
      content: originalUserMessage,
      timestamp: Date.now()
    });

    // יצירת Promise לתגובה
    const responsePromise = new Promise((resolve, reject) => {
      clients.push({ resolve, reject });
    });

    // תזמון עיבוד
    scheduleProcessing(threadId);
    console.log(`📨 Message queued for thread ${threadId}, total in queue: ${queue.length}`);

    // המתנה לתגובה
    const result = await responsePromise;
    res.json(result);

  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Running on port ${port} with message unification`);
  console.log('Environment check:', {
    hasOpenAIKey: !!process.env.OPENAI_KEY,
    hasAssistantID: !!process.env.ASSISTANT_ID
  });
});
