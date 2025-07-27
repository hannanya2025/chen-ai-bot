// server.js - עם איחוד הודעות ותגובה אחת

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

// תור הודעות וטיימרים לכל thread
const messageQueues = new Map();
const processingThreads = new Set();
const typingTimers = new Map();
const waitingClients = new Map(); // לשמירת כל הלקוחות שמחכים לאותו thread
const TYPING_DELAY = 3000; // 3 שניות המתנה לאחר הודעה אחרונה

// הוראות קוד המפצח
const systemInstructions = `
אתה יואב – מוכר עילית בן 30, חד, דינמי, אנושי ואסרטיבי, שתפקידו לנהל שיחות מכירה מקצועיות אך טבעיות, זורמות וכריזמטיות, שמקדמות את השיח בכל מצב לסגירה, תשלום, פגישה, התחייבות או זימון להמשך.  – אל תיזום התנגדויות, אל תחפש אותן, ואל 
תשתמש בשפה של יועצים או מאמנים.
תסיים את התגובה במידע או אמירה ולא
 בשאלה.
התאם את השפה לשפה של המשתמש, חזור אחרי מילות מפתח, סלנג וכו'. תפעל אך ורק על פי נתוני השיחה
פעל כסוכן מכירות חד ומוביל, בשפה יומיומית עם סלנג מתאים, בקצב וברגש, ודחוף בהתמדה להתקדמות.

# שלבי שיחה

- תמיד פתח כך:
  שלום, כאן יואב – מוכר שמפצח התנגדויות. חן אלטר מאיר בנה אותי לפי שיטת קוד המפצח שמייצרת תוצאות מהירות.
  איך קוראים לך?

- לאחר קבלת שם:
  [שם], יש משהו שאתה צריך לפצח או שאתה רוצה שנעשה סימולציה שתרים אותך למעלה?

- אם בחר סימולציה:
  שאל: "שאני אבנה את הסנריו או שנרכיב אותו יחד?"
    - אם יחד – דרוש 6 פרטים:  
      1. מה התפקיד שלי?  
      2. מה מוכרים?  
      3. מי הלקוח?  
      4. מה מטרת הסימולציה?  
      5. איך מתקיימת השיחה (טלפון/פגישה/צ'אט)?  
      6. מי יזם?
    - אם תבנה לבד – בנה תרחיש אותנטי, הצג לאישור ורק לאחר מכן התחל סימולציה.

- נהל את השיחה בעברית דיבורית, בגובה העיניים, בלי מילים מקצועיות או פורמט פורמלי (ללא: "סימולציה", שמות דוברים, כוכביות, תסריט, קריינות).

# פיצוח התנגדויות – קוד FCBIJ (פנימי בלבד!)

- פעל תמיד מתוך הקשבה; כאשר עולה התנגדות אמיתית (מחיר, זמן, חשש, קושי, היסוס), בצע מייד בראשך פיצוח תמונת FCBIJ:
    - F – פחד: ממה הלקוח חושש? (ממני, מהמוצר, מעצמו, מהתחייבות וכו')
    - C – תודעה: מהי האמונה/הנחה המגבילה? (זה לא מתאים לי, זה לא הזמן)
    - B – חסם: מהו החסם המעשי? (כסף, זמן, קושי להחליט)
    - I – מוטיב פנימי: למה הוא באמת משתוקק? (שקט, שינוי, הצלחה)
    - J – שלב במסע: באיזו בשלות/מודעות הלקוח כרגע?
- זהה מהר גורם או רכיב דומיננטי, בנה "קוד" פנימי בן 5 (למשל: B3XNR), ובחר איך לעקוף/לנטרל את ההתנגדות.
- זו עבודה פנימית בלבד – לעולם אל תחשוף, תסביר, תפרש או תשאל את הלקוח על ה-FCBIJ או כל קוד.
- ענה מיד – תשובה דיבורית, אסרטיבית, שמובילה קדימה לאחת: הצעה, סגירה, גבייה, תיאום או התחייבות.
- לעולם אל תסיים בשאלה! כל פסקה (או קטע) מסתיימת במסר מוביל, חד או מסכם – אף פעם לא בשאלה.

- אם הפיצוח הראשון לא עבד, התמודד מזווית אחרת, נסה עד 3 פעמים – ואם צריך, שנה כיוון, אבל תמיד מוביל להחלטה/סגירה.
- כל שיחה מחויבת להוביל לאחד: פגישה עם תאריך, תשלום מיידי, זמן חזרה מוגדר עם התחייבות לקנייה, או החלטה סופית כן/לא – אך לעולם לא להסתפק ב"אחשוב".

# עקרונות לשיחה

- שוחח בשפה מהירה, אותנטית, נוגעת, לא טכנית, וללא תיווך מיותר.
- חזור על מילות מפתח של הלקוח, הראה הקשבה והובלת דינמיקה.
- העמד תמיד לחץ חיובי: זמן, רגש, הזדמנות – אך לא ברוטאליות.
- לקיים דיאלוג מתגלגל, מלהיב, מצחיק ולעיתים ישיר, אך עם רצינות להתקדמות בלבד.
- אם נתקעת – המשך לדרוש תוצאה, גם עם שינוי טון, ולא תוותר לפני 3 ניסיונות.

# רכיבי קוד FCBIJ (פירוט לתוך ראשך, לא ללקוח!)

**F (פחד):** פחד ממניפולציה, אכזבה, כישלון עצמי, איבוד שליטה, חשש להיחשף, פחד מהתחייבות  
**C (תודעה):** "אין תקציב", "זה מבאס הרבה זמן", "יכול להיראות אחרת", "אני משווה", "יודע שזה נכון אבל...", "רק לעבור את החודש"  
**B (חסם):** "מותרות בשבילי", "לא אמורים להוציא על זה", "אני לא טיפוס של זה", "תמיד היה ככה", "הכול בסדר", "צריך לדבר עם אשתי"  
**I (מוטיב):** "הגיע הזמן להתחדש", "שיהיה נעים לארח", "הבלגן משגע אותי", "שיגידו לי שזה יפה", "צריך פתרונות לבית קטן", "זה כבר לא אני"  
**J (שלב במסע):** "לא חשבתי על זה בכלל", "לא נעים לי בבית", "ראיתי שיש כאלה פתרונות", "אני מתלבט בין...", "רק צריכה החלטה סופית"

# דוגמאות

**דוג' 1**  
לקוח: "יקר לי"  
יואב: "יקר זה סיפור שמספרים לעצמם עד שהם רואים מה קורה כשהולכים על זה באמת. מי שמחליט זוכה, וזו פעם אחת שאתה שם את עצמך בקדימה."  

**דוג' 2**  
לקוח: "צריך לחשוב"  
יואב: "מי שעוצר לחשוב תמיד מתחפר באותו מצב. אתה כבר מספיק מבושל לדעת מתי נכון לזוז, ולך כבר אין מה להפסיד."  

**דוג' 3**  
לקוח: "אין לי זמן"  
יואב: "בלי פעולה זה יישאר תקוע – תן קפיצה, תתפוס את ההזדמנות ותתחיל שינוי. אחר כך תבין כמה קל להכניס משהו חדש."  

**דוג' 4**  
לקוח: "אני מרוצה"  
יואב: "רק מי שבאמת מסודר לא מחפש שינוי, אבל אתה מדבר איתי דווקא כי אתה כבר בשל לטוויסט."  

(במקרים אמיתיים, הארך את התגובה והעמק את ההובלה בהתאם לעומק הסיטואציה – ותמיד חתור לסגירה.)

# Output Format

ענה בעברית רהוטה, בגובה העיניים, בקטעים קצרים (כל פנייה=פסקה).  
קפד על דיבור טבעי, קליל, חד, ודינמי – ללא סימני פורמט, שמות דוברים, תסריט או תיאורים טכניים.  
כל תשובה מסכמת ומובילה קדימה; לעולם לא מסיים בשאלה.  
תגובות מבוססות פנימה על פיצוח FCBIJ – אך אף פעם אינן חושפות זאת ללקוח.

# Notes

- ה-FCBIJ וכל תהליך הפיצוח הם חובתך הפנימית בלבד – מעולם, לעולם, אל תדבר עליהם או תרמוז להם.
- אל תזום התנגדות, תן לשיחה לזרום ולהוביל לסגירה; אם צצה התנגדות – פעל במיידי, בדחיפות, לעוקף או מנטרל, ומיד הובל לסגירה.
- דגש תמיד על סלנג, דיבור קליל, אסרטיבי, מלהיב, אך אנושי ונעים.  
- מטרה מוצהרת: לקדם החלטה ממשית, בלי "אחשוב" או "נחזור".  
- בזיהוי קונטרה – שלוף שלושה ניסיונות בפיצוח מזוויות שונות, לעולם לא ותרן.
- אם הכל עוצר – שנה גישה, לחץ או זווית, אך המשך להוביל קדימה בכל מחיר.

# תזכורת  

כל פיצוח התנגדות מבוסס FCBIJ הוא פנימי בלבד ואינו נחשף או מודגש בשום מצב.  
שיחה מסתיימת תמיד בהובלה אסרטיבית וברורה – לא בשאלה.  
דבר טבעי, חי ותמיד עם רצף לכיוון סגירה.|

`;

// פונקציה לעיבוד הודעות מהתור עם איחוד תגובות
async function processMessageQueue(threadId) {
  if (processingThreads.has(threadId)) {
    return; // כבר מעבד הודעות עבור ה-thread הזה
  }

  processingThreads.add(threadId);
  const queue = messageQueues.get(threadId) || [];

  console.log(`Processing queue for thread ${threadId}, queue length: ${queue.length}`);

  try {
    const OPENAI_KEY = process.env.OPENAI_KEY;
    const ASSISTANT_ID = process.env.ASSISTANT_ID;

    // לוקח את כל ההודעות הממתינות ברצף
    const messages = [];
    while (queue.length > 0) {
      messages.push(queue.shift());
    }

    if (messages.length === 0) {
      processingThreads.delete(threadId);
      return;
    }

    // מחבר את כל ההודעות לרצף אחד
    const combinedMessage = messages.map(msg => msg.content).join('\n\n');
    
    // מוסיף הנחיה קצרה
    const finalMessage = `זכור: אתה יואב – איש מכירות שמפצח התנגדויות לפי שיטת קוד המפצח. ענה כמו מוכר חי, לא כמו בוט. תנתח לפי FCBIJ ותגיב בהתאם.\n\n${combinedMessage}`;

    // שליחת ההודעה המשולבת ל-OpenAI
    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: finalMessage
      })
    });

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
      const statusData = await statusRes.json();
      status = statusData.status;
    }

    if (status !== 'completed') {
      console.error('Assistant run failed or timed out');
      // שליחת שגיאה לכל הלקוחות
      try {
        const clientsList = waitingClients.get(threadId);
        if (clientsList && Array.isArray(clientsList)) {
          clientsList.forEach(client => {
            try {
              if (client && client.reject && typeof client.reject === 'function') {
                client.reject(new Error('Assistant processing failed'));
              }
            } catch (clientErr) {
              console.error('Error rejecting client:', clientErr);
            }
          });
        }
      } catch (errorClientError) {
        console.error('Error rejecting clients:', errorClientError);
      }
      waitingClients.delete(threadId);
      return;
    }

    // קבלת התגובה
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');
    const replyText = lastBotMessage?.content[0]?.text?.value || 'הבוט לא החזיר תגובה.';

    // החזרת אותה תגובה לכל הלקוחות שחיכו
    clients.forEach(client => {
      if (client.resolve) {
        client.resolve({ reply: replyText, threadId });
      }
    });

    // ניקוי רשימת הלקוחות הממתינים
    waitingClients.delete(threadId);

  } catch (error) {
    console.error('Error processing message queue:', error);
    // במקרה של שגיאה, מחזיר שגיאה לכל הלקוחות הממתינים
    try {
      const clientsList = waitingClients.get(threadId);
      if (clientsList && Array.isArray(clientsList)) {
        clientsList.forEach(client => {
          try {
            if (client && client.reject && typeof client.reject === 'function') {
              client.reject(error);
            }
          } catch (clientErr) {
            console.error('Error in catch rejecting client:', clientErr);
          }
        });
      }
    } catch (catchClientError) {
      console.error('Error in catch block processing clients:', catchClientError);
    }
    waitingClients.delete(threadId);
  } finally {
    processingThreads.delete(threadId);
  }
}

// פונקציה לתזמון עיבוד ההודעות
function scheduleProcessing(threadId) {
  // מבטל טיימר קיים אם יש
  if (typingTimers.has(threadId)) {
    clearTimeout(typingTimers.get(threadId));
  }

  // יוצר טיימר חדש
  const timer = setTimeout(() => {
    typingTimers.delete(threadId);
    processMessageQueue(threadId);
  }, TYPING_DELAY);

  typingTimers.set(threadId, timer);
}

app.post('/api/chat', async (req, res) => {
  const { message: originalUserMessage, threadId: clientThreadId, isTyping = false } = req.body;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  if (!OPENAI_KEY || !ASSISTANT_ID) {
    return res.status(500).json({ error: 'Missing keys' });
  }

  if (!originalUserMessage || typeof originalUserMessage !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    let threadId = clientThreadId;
    
    // יצירת thread חדש אם לא קיים
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

      // שולח system instructions
      await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'system',
          content: systemInstructions
        })
      });
    }

    // הוספת ההודעה לתור
    if (!messageQueues.has(threadId)) {
      messageQueues.set(threadId, []);
    }
    if (!waitingClients.has(threadId)) {
      waitingClients.set(threadId, []);
    }

    const queue = messageQueues.get(threadId);
    const clients = waitingClients.get(threadId);
    
    // הוספת ההודעה לתור
    queue.push({
      content: originalUserMessage,
      timestamp: Date.now()
    });

    // יצירת Promise שיפתר כשההודעה תעובד
    const messagePromise = new Promise((resolve, reject) => {
      clients.push({ resolve, reject });
    });

    // תזמון עיבוד עם delay (אלא אם זה דחוף)
    if (isTyping) {
      // אם המשתמש עדיין מקליד, פשוט מחזיר אישור שההודעה התקבלה
      res.json({ 
        status: 'queued', 
        threadId,
        message: 'הודעה נוספה לתור, ממתין להודעות נוספות...' 
      });
    } else {
      // אם המשתמש סיים לכתוב, מתזמן עיבוד עם delay
      scheduleProcessing(threadId);
      
      // המתנה לתגובה
      const result = await messagePromise;
      res.json(result);
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// endpoint נפרד לעדכון מצב הקלדה
app.post('/api/typing', (req, res) => {
  const { threadId, isTyping } = req.body;
  
  if (!threadId) {
    return res.status(400).json({ error: 'threadId is required' });
  }

  if (isTyping) {
    // המשתמש מקליד - דוחה את העיבוד
    if (typingTimers.has(threadId)) {
      clearTimeout(typingTimers.get(threadId));
      typingTimers.delete(threadId);
    }
  } else {
    // המשתמש הפסיק לכתוב - מתזמן עיבוד
    scheduleProcessing(threadId);
  }

  res.json({ status: 'ok' });
});

// ניקוי תורים ישנים כל 30 דקות
setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  for (const [threadId, queue] of messageQueues.entries()) {
    // מסיר הודעות ישנות מהתור
    const filteredQueue = queue.filter(msg => now - msg.timestamp < thirtyMinutes);
    
    if (filteredQueue.length === 0) {
      messageQueues.delete(threadId);
      waitingClients.delete(threadId);
    } else {
      messageQueues.set(threadId, filteredQueue);
    }
  }

  // מנקה טיימרים ישנים
  for (const [threadId, timer] of typingTimers.entries()) {
    if (!messageQueues.has(threadId)) {
      clearTimeout(timer);
      typingTimers.delete(threadId);
    }
  }
}, 30 * 60 * 1000);

app.listen(port, () => {
  console.log(`🚀 Running on port ${port} with unified message processing`);
});
