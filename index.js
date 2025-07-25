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

// בדיקת משתני סביבה בהפעלה
console.log('🔍 בודק משתני סביבה...');
console.log('OPENAI_KEY exists:', !!process.env.OPENAI_KEY);
console.log('ASSISTANT_ID exists:', !!process.env.ASSISTANT_ID);

app.post('/api/chat', async (req, res) => {
  console.log('📩 קיבלתי בקשת צ\'אט');
  
  const { message, threadId: clientThreadId } = req.body;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  // בדיקת משתני סביבה
  if (!OPENAI_KEY || !ASSISTANT_ID) {
    console.error('❌ משתני סביבה חסרים:', { 
      hasKey: !!OPENAI_KEY, 
      hasAssistant: !!ASSISTANT_ID 
    });
    return res.status(500).json({ 
      error: 'Missing OPENAI_KEY or ASSISTANT_ID in environment variables' 
    });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    console.log('💬 מעבד הודעה:', message.substring(0, 50) + '...');
    
    // יצירת או שימוש ב-thread קיים
    let threadId = clientThreadId;
    if (!threadId) {
      console.log('🆕 יוצר thread חדש...');
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
        console.error('❌ כשל ביצירת thread:', threadRes.status, errorText);
        return res.status(500).json({ error: 'Failed to create conversation thread' });
      }
      
      const threadData = await threadRes.json();
      threadId = threadData.id;
      console.log('✅ Thread נוצר:', threadId);
    } else {
      console.log('🔄 משתמש ב-thread קיים:', threadId);
    }

    // הוספת הודעה ל-thread
    console.log('📝 מוסיף הודעה ל-thread...');
    const addMessageRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
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

    if (!addMessageRes.ok) {
      const errorText = await addMessageRes.text();
      console.error('❌ כשל בהוספת הודעה:', addMessageRes.status, errorText);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    console.log('✅ הודעה נוספה בהצלחה');

    // הרצת האסיסטנט
    console.log('🤖 מפעיל אסיסטנט...');
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
      console.error('❌ כשל בהפעלת אסיסטנט:', runRes.status, errorText);
      return res.status(500).json({ error: 'Failed to start assistant' });
    }

    const runData = await runRes.json();
    const runId = runData.id;
    console.log('✅ אסיסטנט הופעל:', runId);

    // המתנה לסיום עם timeout
    let runStatus = 'in_progress';
    let attempts = 0;
    const maxAttempts = 60; // 60 שניות מקסימום

    console.log('⏳ ממתין לתגובת האסיסטנט...');
    while ((runStatus === 'in_progress' || runStatus === 'queued') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!statusRes.ok) {
        console.error('❌ כשל בבדיקת סטטוס:', statusRes.status);
        break;
      }

      const statusData = await statusRes.json();
      runStatus = statusData.status;
      
      if (attempts % 5 === 0) { // לוג כל 5 שניות
        console.log(`⏱️ סטטוס (${attempts}s):`, runStatus);
      }
    }

    if (attempts >= maxAttempts) {
      console.error('⏰ timeout אחרי 60 שניות');
      return res.status(500).json({ error: 'הבוט לקח יותר מדי זמן לענות. נסה שוב.' });
    }

    if (runStatus !== 'completed') {
      console.error('❌ האסיסטנט נכשל עם סטטוס:', runStatus);
      return res.status(500).json({ error: `הבוט לא הצליח לעבד את הבקשה. סטטוס: ${runStatus}` });
    }

    console.log('✅ האסיסטנט סיים בהצלחה');

    // שליפת התגובה
    console.log('📥 שולף הודעות...');
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesRes.ok) {
      const errorText = await messagesRes.text();
      console.error('❌ כשל בשליפת הודעות:', messagesRes.status, errorText);
      return res.status(500).json({ error: 'Failed to get response' });
    }

    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');

    if (!lastBotMessage) {
      console.error('❌ לא נמצאה תגובת אסיסטנט');
      return res.status(500).json({ error: 'הבוט לא החזיר תגובה.' });
    }

    const replyText = lastBotMessage.content[0]?.text?.value || 'הבוט לא ענה.';
    console.log('✅ התקבלה תגובה:', replyText.substring(0, 100) + '...');

    res.json({ reply: replyText, threadId });

  } catch (err) {
    console.error('❌ שגיאה כללית:', err.message);
    console.error('📋 פרטי השגיאה:', err.stack);
    res.status(500).json({ error: 'שגיאה כללית בתקשורת עם הבוט.' });
  }
});

// נתיב בדיקת בריאות
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    hasOpenAI: !!process.env.OPENAI_KEY,
    hasAssistant: !!process.env.ASSISTANT_ID
  });
});

// נתיב ראשי
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 השרת עלה על פורט ${port}`);
  console.log(`🌐 גש לכתובת: http://localhost:${port}`);
});
