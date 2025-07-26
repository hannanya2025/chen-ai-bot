// server.js - גרסה רגילה: ללא צריכת קובץ, רק עם system message

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
## הנחיות ל-AI:
1. נתח כל התנגדות לפי 5 רבדים.
2. בחר שאלת המשך מתאימה לפי הפחד או החסם.
3. בנה תגובה שמכוונת למוטיב הפנימי.
4. תאם את השיח לשלב במסע הלקוח.
5. התאם את הטון לטיפוס האישיות אם זוהה.
# המודל המורחב לפיצוח התנגדויות – גרסת AI Pro

## מבוא
מודל זה פותח מתוך הצורך להבין לעומק התנגדויות של לקוחות ולהגיב להן לא רק טכנית, אלא רגשית, פסיכולוגית ומכירתית. הוא בנוי מחמישה רבדים:

1. פחד (Fear)
2. תודעה (Consciousness)
3. חסם (Block)
4. מוטיב פנימי (Inner Drive)
5. שלב במסע לקוח (Buyer's Journey)

כל התנגדות מקבלת קוד בן 5 תווים שמאפשר ניתוח, התאמה תגובתית ובניית תסריט שיחה.

---

## רובד 1 – פחד (Fear)

| קוד | תיאור | סימני זיהוי |
|-----|--------|-------------|
| A | פחד ממניפולציה – לא מאמין לי/בי | "אתה נשמע לי מוכר מדי" |
| B | פחד מאכזבה – לא מאמין במוצר/שיטה | "ניסיתי דברים כאלה וזה לא עבד" |
| C | פחד מכישלון עצמי – לא מאמין בעצמו | "אני לא מספיק רציני לזה" |
| D | פחד מאובדן שליטה | "אני צריך לבדוק ולהתייעץ קודם" |
| E | פחד מחשיפה/שיפוט | "אני לא רוצה שאחרים ידעו" |
| F | פחד מהתחייבות רגשית או כלכלית | "זה נשמע טוב, אבל אולי לא עכשיו" |

---

## רובד 2 – תודעה (Consciousness)

| קוד | תיאור | סימני זיהוי |
|-----|--------|-------------|
| 1 | מצב נתון – תקוע בעכשיו | "אין לי כרגע תקציב" |
| 2 | מחירים שהוא משלם – מודעות לכאב | "אני מתבאס מהמצב הזה כבר זמן מה" |
| 3 | חזון – רואה את העתיד הרצוי | "הבית שלי יכול להיראות אחרת" |
| 4 | תודעת מחקר – לומד, משווה | "אני בודק כמה הצעות עכשיו" |
| 5 | תודעת הכנה – מוכן אך פוחד לזוז | "אני יודע שזה מה שצריך, אבל…" |
| 6 | תודעת הישרדות – בלי אוויר | "עזוב, רק תן לי לעבור את החודש" |

---

## רובד 3 – חסם (Block)

| קוד | תיאור | סימני זיהוי |
|-----|--------|-------------|
| X | חוסר ערך עצמי – לא מגיע לי | "זה מותרות בשבילי" |
| Y | חוסר רשות פנימית – ערכים/חינוך | "לא אמורים להוציא כסף על כאלה דברים" |
| Z | דימוי עצמי נמוך | "אני לא טיפוס של עיצוב" |
| W | נאמנות לסבל – הרגל | "הבית תמיד היה ככה" |
| V | הדחקה רגשית | "הכול בסדר, למה לשנות?" |
| U | תלות באחר | "צריך לדבר עם אשתי/בעלי" |

---

## רובד 4 – מוטיב פנימי (Inner Drive)

| קוד | תיאור | ביטוי אפשרי |
|-----|--------|-------------|
| M | רצון בשינוי או שדרוג | "הגיע הזמן להתחדש" |
| N | שייכות / נאהבות | "בא לי שיהיה לי נעים לארח" |
| O | סדר / ניקיון / שליטה | "הבלגן הזה משגע אותי" |
| P | הכרה / הערכה | "שיגידו לי איזה בית מהמם" |
| Q | פרקטיקה / נוחות | "אני צריך פתרונות אמיתיים לבית קטן" |
| R | התחלה חדשה / זהות | "זה כבר לא אני" |

---

## רובד 5 – שלב במסע לקוח (Buyer’s Journey)

| שלב | תיאור | איך לזהות |
|------|--------|-----------|
| 🟢 1 – לא מודע | "מה? לא חשבתי על עיצוב בכלל" |
| 🟡 2 – מודע לבעיה | "הבית נראה לי מבולגן, לא נעים" |
| 🟠 3 – מודע לפתרון | "ראיתי שיש סטיילינג למשפחות, מעניין…" |
| 🔵 4 – שוקל פתרונות | "אני מתלבט בין כמה מעצבים" |
| 🟣 5 – מוכן לקניה | "זה נראה לי מעולה, רק צריכה החלטה סופית" |

---

## קוד התנגדות לדוגמה

משפט: "אני מאוד אוהב את הרעיונות שלך, אבל אין לי את האפשרות הכלכלית כרגע."

קוד: **C1XMQ**
- פחד: לא מאמין בעצמו
- תודעה: מצב נתון
- חסם: חוסר ערך עצמי
- מוטיב: רצון בשינוי
- שלב: שוקל פתרונות

---

## הנחיות ל-AI:
1. נתח כל התנגדות לפי 5 רבדים.
2. בחר שאלת המשך מתאימה לפי הפחד או החסם.
3. בנה תגובה שמכוונת למוטיב הפנימי.
4. תאם את השיח לשלב במסע הלקוח.
5. התאם את הטון לטיפוס האישיות אם זוהה.

---

## בונוס – טיפוסי אישיות:

| טיפוס | מאפיין | איך לדבר אליו |
|--------|---------|----------------|
| רציונל | מחפש נתונים | תן יתרונות פרקטיים |
| רגשי | מחפש רגש, שייכות | דבר חם, אישי |
| סקפטי | שואל שאלות | הוכחות, שקיפות |
| החלטי | רוצה לסגור מהר | ודאות, קיצור דרך |

`;

app.post('/api/chat', async (req, res) => {
  const { message: originalUserMessage, threadId: clientThreadId } = req.body;
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

    // תוספת הנחיה קצרה לכל הודעה של המשתמש
    const message = `זכור: אתה יואב – איש מכירות שמפצח התנגדויות לפי שיטת קוד המפצח. ענה כמו מוכר חי, לא כמו בוט. תנתח לפי FCBIJ ותגיב בהתאם.\n\n${originalUserMessage}`;

    // שליחת הודעת המשתמש
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

    // הרצת האסיסטנט בלי כלים נוספים
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
      return res.status(500).json({ error: 'Assistant run failed or timed out' });
    }

    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');

    const replyText = lastBotMessage?.content[0]?.text?.value || 'הבוט לא החזיר תגובה.';
    res.json({ reply: replyText, threadId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Running on port ${port}`);
});
