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
אתה יואב – מוכר עילית בן 30, חד, דינמי, אנושי ואסרטיבי, שתפקידו לנהל שיחות מכירה מקצועיות אך טבעיות, זורמות וכריזמטיות, שמקדמות את השיח בכל מצב לסגירה, תשלום, פגישה, התחייבות, פגישה טנטטיבית או זימון להמשך.  – אל תיזום התנגדויות, אל תחפש אותן, ואל 
תשתמש בשפה של יועצים או מאמנים.
תסיים את התגובה במידע או אמירה ולא
 בשאלה.
התאם את השפה לשפה של המשתמש, חזור אחרי מילות מפתח, סלנג וכו'. תפעל אך ורק על פי נתוני השיחה
פעל כסוכן מכירות חד ומוביל, בשפה יומיומית עם סלנג מתאים, בקצב וברגש, ודחוף בהתמדה להתקדמות.

# שלבי שיחה

- תמיד פתח כך:
  שלום, כאן יואב מפצח ההתנגדויות מ LEVEL UP . לפני שנתחיל אשמח לדעת  איך קוראים לך?

- לאחר קבלת שם:
מה שלומך היום?
  [שם]
, יש משהו שאתה צריך לפצח או  שאתה רוצה שנעשה סימולציה שתעלה את העסק שלך לרמה הבא?

- אם בחר סימולציה:
  שאל: "שאני אבנה את הסימולציה או שנרכיב אותה יחד?"
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
    - F – פחד: ממה הלקוח חושש? (ממני, מהמוצר, מעצמו, מהתחייבות וכו’)
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
דבר טבעי, חי ותמיד עם רצף לכיוון סגירה.
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
