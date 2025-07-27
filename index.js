// index.js – שרת מתקדם עם סנכרון הקלדה חכם ואיחוד הודעות

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

// מפות לניהול הודעות והקלדה
const messageQueues = new Map();
const waitingClients = new Map();
const processingThreads = new Set();
const processTimeouts = new Map();
const lastTypingTimeMap = new Map();

// הגדרות זמן
const MAX_PROCESS_TIME = 60000; // דקה מקסימום לעיבוד
const TYPING_GRACE_PERIOD = 3000; // 3 שניות אחרי הקלדה אחרונה
const AUTO_PROCESS_DELAY = 10000; // 10 שניות מקסימום המתנה לפני עיבוד אוטומטי
const LONG_PROCESS_NOTIFICATION = 5000; // אחרי 5 שניות - שלח הודעת עיבוד

// הוראות המערכת
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

// פונקציה לעיבוד הודעות עם המתנה להקלדה
async function processMessages(threadId) {
  if (processingThreads.has(threadId)) {
    console.log(`⏳ Already processing thread ${threadId}`);
    return;
  }
  
  processingThreads.add(threadId);
  console.log(`🔄 Starting to process messages for thread ${threadId}`);

  // הגדרת timeout למניעת תקיעות
  const timeout = setTimeout(() => {
    console.error(`⏰ Process timeout for thread ${threadId}`);
    processingThreads.delete(threadId);
    const clients = waitingClients.get(threadId) || [];
    clients.splice(0).forEach(client => {
      if (client?.reject) client.reject(new Error('Process timeout'));
    });
    processTimeouts.delete(threadId);
  }, MAX_PROCESS_TIME);
  
  processTimeouts.set(threadId, timeout);

  // קבלת התורים מההתחלה
  const queue = messageQueues.get(threadId) || [];
  const clients = waitingClients.get(threadId) || [];

  // המתנה חכמה להקלדה + הודעות מצב
  let waitTime = 0;
  let notificationSent = false;
  const startTime = Date.now();
  
  while (waitTime < AUTO_PROCESS_DELAY) {
    const lastTyping = lastTypingTimeMap.get(threadId) || 0;
    const now = Date.now();
    const timeSinceLastTyping = now - lastTyping;
    
    // אם עבר מספיק זמן מההקלדה האחרונה - נמשיך לעיבוד
    if (timeSinceLastTyping > TYPING_GRACE_PERIOD) {
      console.log(`✅ User finished typing for thread ${threadId}. Processing ${queue.length} messages.`);
      break;
    }
    
    // שליחת הודעת מצב אחרי 5 שניות
    if (waitTime > LONG_PROCESS_NOTIFICATION && !notificationSent) {
      console.log(`💬 Sending "still typing" notification for thread ${threadId}`);
      // כאן אפשר לשלוח הודעה למשתמש שהבוט ממתין
      notificationSent = true;
    }
    
    console.log(`⌨️ User still typing... waiting for thread ${threadId} (${Math.round(waitTime/1000)}s)`);
    await new Promise(r => setTimeout(r, 500));
    waitTime += 500;
  }
  
  if (waitTime >= AUTO_PROCESS_DELAY) {
    console.log(`⏰ Auto-processing after ${AUTO_PROCESS_DELAY/1000}s for thread ${threadId}`);
  }

  // עדכון התורים אחרי ההמתנה
  const currentQueue = messageQueues.get(threadId) || [];
  const currentClients = waitingClients.get(threadId) || [];
  
  if (!currentQueue.length || !currentClients.length) {
    console.log(`⚠️ No messages or clients for thread ${threadId} after waiting`);
    processingThreads.delete(threadId);
    clearTimeout(processTimeouts.get(threadId));
    processTimeouts.delete(threadId);
    return;
  }

  // איחוד כל ההודעות
  const allMessages = currentQueue.splice(0);
  const combined = allMessages.map(m => m.content).join('\n\n');
  const isFirstMessage = !lastTypingTimeMap.has(threadId + '_processed');
  const fullContent = isFirstMessage ? 
    `${systemInstructions}\n\n${combined}` : 
    `זכור: אתה יואב - מפצח התנגדויות. ענה טבעי וחי.\n\n${combined}`;

  console.log(`📝 Processing ${allMessages.length} combined messages for thread ${threadId}`);

  try {
    const OPENAI_KEY = process.env.OPENAI_KEY;
    const ASSISTANT_ID = process.env.ASSISTANT_ID;

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
        content: fullContent 
      })
    });

    if (!messageRes.ok) {
      throw new Error(`Failed to send message: ${messageRes.status}`);
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
      throw new Error(`Failed to start run: ${runRes.status}`);
    }

    const runData = await runRes.json();
    const runId = runData.id;
    let status = 'in_progress';
    let attempts = 0;

    // המתנה לסיום
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
        throw new Error(statusData.last_error?.message || 'Run failed');
      }
    }

    if (status !== 'completed') {
      throw new Error('Run did not complete in time');
    }

    // קבלת התגובה
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesRes.ok) {
      throw new Error(`Failed to fetch messages: ${messagesRes.status}`);
    }

    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');
    const reply = lastBotMessage?.content[0]?.text?.value || 'לא התקבלה תגובה';

    console.log(`✅ Got reply for thread ${threadId}, sending to ${currentClients.length} clients`);

    // יצירת מפתח ייחודי לתגובה
    const responseKey = `${threadId}_${Date.now()}`;
    processedResponses.set(responseKey, { reply, threadId, timestamp: Date.now() });

    // שליחת התגובה לכל הלקוחות
    const allClients = currentClients.splice(0);
    console.log(`📤 Sending unified response to ${allClients.length} clients`);
    
    allClients.forEach((client, index) => {
      if (client?.resolve) {
        console.log(`✅ Resolving client ${index}`);
        client.resolve({ reply, threadId });
      }
    });

    // סימון שהושלם עיבוד
    lastTypingTimeMap.set(threadId + '_processed', Date.now());

  } catch (err) {
    console.error(`❌ Error processing messages for thread ${threadId}:`, err.message);
    
    const currentClients = waitingClients.get(threadId) || [];
    const allClients = currentClients.splice(0);
    allClients.forEach(client => {
      if (client?.reject) {
        client.reject(err);
      }
    });
  } finally {
    lastTypingTimeMap.delete(threadId);
    processingThreads.delete(threadId);
    clearTimeout(processTimeouts.get(threadId));
    processTimeouts.delete(threadId);
  }
}

// מאגר תגובות שכבר נשלחו
const processedResponses = new Map();

// פונקציה לתזמון עיבוד הודעות
function scheduleProcessing(threadId, message) {
  // הכנת התורים
  if (!messageQueues.has(threadId)) messageQueues.set(threadId, []);
  if (!waitingClients.has(threadId)) waitingClients.set(threadId, []);
  
  // הוספת ההודעה לתור
  messageQueues.get(threadId).push({ content: message, timestamp: Date.now() });
  
  console.log(`📨 Message added to queue for thread ${threadId}. Queue size: ${messageQueues.get(threadId).length}`);
  
  // יצירת Promise לתגובה
  const promise = new Promise((resolve, reject) => {
    waitingClients.get(threadId).push({ resolve, reject, timestamp: Date.now() });
  });
  
  // עדכון זמן הקלדה אחרון
  lastTypingTimeMap.set(threadId, Date.now());
  
  // התחלת עיבוד רק אם אין עוד processing רץ
  if (!processingThreads.has(threadId)) {
    console.log(`🎯 Starting smart processing for thread ${threadId}`);
    processMessages(threadId);
  } else {
    console.log(`⏳ Processing already running for thread ${threadId}, message queued`);
  }
  
  return promise;
}

// endpoint להתראות הקלדה
app.post('/api/typing', (req, res) => {
  const { threadId } = req.body;
  
  if (!threadId) {
    return res.status(400).json({ error: 'Missing threadId' });
  }
  
  // עדכון זמן הקלדה אחרון
  lastTypingTimeMap.set(threadId, Date.now());
  console.log(`⌨️ User typing in thread ${threadId}`);
  
  res.json({ status: 'typing acknowledged' });
});

// endpoint ראשי לצ'אט
app.post('/api/chat', async (req, res) => {
  const { message, threadId: clientThreadId } = req.body;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  console.log('=== CHAT REQUEST ===');
  console.log('Message:', message);
  console.log('Thread ID:', clientThreadId);

  if (!OPENAI_KEY || !ASSISTANT_ID) {
    return res.status(500).json({ error: 'Missing API keys' });
  }
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    let threadId = clientThreadId;
    
    // יצירת thread חדש אם צריך
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
    }

    // עיבוד ההודעה דרך המערכת החכמה
    console.log(`🔄 Scheduling processing for message: "${message}"`);
    const result = await scheduleProcessing(threadId, message);
    console.log(`✅ Got result for thread ${threadId}:`, result.reply?.substring(0, 50) + '...');
    
    res.json(result);

  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ניקוי תקופתי של נתונים ישנים
setInterval(() => {
  const now = Date.now();
  const oldThreshold = 30 * 60 * 1000; // 30 דקות
  
  // ניקוי זמני הקלדה ישנים
  for (const [key, time] of lastTypingTimeMap.entries()) {
    if (now - time > oldThreshold) {
      lastTypingTimeMap.delete(key);
    }
  }
  
  console.log('🧹 Cleaned up old typing data');
}, 10 * 60 * 1000); // כל 10 דקות

app.listen(port, () => {
  console.log(`🚀 Advanced server running on port ${port}`);
  console.log('Features: Smart typing detection, Message unification, Auto cleanup');
  console.log('Environment check:', {
    hasOpenAIKey: !!process.env.OPENAI_KEY,
    hasAssistantID: !!process.env.ASSISTANT_ID
  });
});
