// index.js - שרת עם debugging מפורט

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

app.post('/api/chat', async (req, res) => {
  const { message: originalUserMessage, threadId: clientThreadId } = req.body;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  // DEBUG: בדיקת משתני סביבה
  console.log('=== DEBUG INFO ===');
  console.log('Keys check:', { 
    hasKey: !!OPENAI_KEY, 
    keyStart: OPENAI_KEY?.substring(0, 8),
    keyLength: OPENAI_KEY?.length,
    hasAssistant: !!ASSISTANT_ID,
    assistantStart: ASSISTANT_ID?.substring(0, 8),
    assistantLength: ASSISTANT_ID?.length
  });
  console.log('Message:', originalUserMessage);
  console.log('Thread ID:', clientThreadId);

  if (!OPENAI_KEY || !ASSISTANT_ID) {
    console.error('❌ Missing environment variables');
    return res.status(500).json({ error: 'Missing API keys in environment' });
  }

  if (!originalUserMessage || typeof originalUserMessage !== 'string') {
    console.error('❌ Invalid message');
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
        const errorText = await threadRes.text();
        console.error('❌ Failed to create thread:', threadRes.status, errorText);
        return res.status(500).json({ error: 'Failed to create thread' });
      }

      const threadData = await threadRes.json();
      threadId = threadData.id;
      console.log('✅ Thread created:', threadId);

      // שולח system instructions
      console.log('🔄 Sending system instructions...');
      const systemRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
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

      if (!systemRes.ok) {
        const errorText = await systemRes.text();
        console.error('❌ Failed to send system instructions:', systemRes.status, errorText);
      } else {
        console.log('✅ System instructions sent');
      }
    }

    // תוספת הנחיה קצרה לכל הודעה של המשתמש
    const message = `זכור: אתה יואב – איש מכירות שמפצח התנגדויות. ענה כמו מוכר חי, לא כמו בוט.\n\n${originalUserMessage}`;

    // שליחת הודעת המשתמש
    console.log('🔄 Sending user message...');
    const messageRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
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

    if (!messageRes.ok) {
      const errorText = await messageRes.text();
      console.error('❌ Failed to send message:', messageRes.status, errorText);
      return res.status(500).json({ error: 'Failed to send message' });
    }
    console.log('✅ User message sent');

    // הרצת האסיסטנט
    console.log('🔄 Starting assistant run...');
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
      const errorText = await runRes.text();
      console.error('❌ Failed to start run:', runRes.status, errorText);
      return res.status(500).json({ error: 'Failed to start assistant' });
    }

    const runData = await runRes.json();
    const runId = runData.id;
    console.log('✅ Run started:', runId);

    // המתנה לסיום עם timeout
    let status = 'in_progress';
    let attempts = 0;
    console.log('🔄 Waiting for completion...');
    
    while ((status === 'in_progress' || status === 'queued') && attempts < 60) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;

      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!statusRes.ok) {
        console.error('❌ Failed to check status:', statusRes.status);
        break;
      }

      const statusData = await statusRes.json();
      status = statusData.status;
      
      // הוספת debugging לסטטוס failed
      if (status === 'failed') {
        console.error('❌ Run failed details:', JSON.stringify(statusData, null, 2));
        return res.status(500).json({ 
          error: `Assistant run failed: ${statusData.last_error?.message || 'Unknown error'}` 
        });
      }
      
      if (attempts % 5 === 0) { // לוג כל 5 שניות
        console.log(`⏳ Status (${attempts}s):`, status);
      }
    }

    if (attempts >= 60) {
      console.error('❌ Run timed out after 60 seconds');
      return res.status(500).json({ error: 'Assistant run timed out' });
    }

    if (status !== 'completed') {
      console.error('❌ Run failed with status:', status);
      return res.status(500).json({ error: `Assistant run failed: ${status}` });
    }

    console.log('✅ Run completed successfully');

    // קבלת התגובה
    console.log('🔄 Fetching response...');
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesRes.ok) {
      const errorText = await messagesRes.text();
      console.error('❌ Failed to fetch messages:', messagesRes.status, errorText);
      return res.status(500).json({ error: 'Failed to fetch response' });
    }

    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');

    if (!lastBotMessage) {
      console.error('❌ No assistant message found');
      return res.status(500).json({ error: 'No response from assistant' });
    }

    const replyText = lastBotMessage?.content[0]?.text?.value || 'הבוט לא החזיר תגובה.';
    console.log('✅ Response received, length:', replyText.length);
    console.log('===================');

    res.json({ reply: replyText, threadId });

  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Running on port ${port}`);
  console.log('Environment check:', {
    hasOpenAIKey: !!process.env.OPENAI_KEY,
    hasAssistantID: !!process.env.ASSISTANT_ID
  });
});
