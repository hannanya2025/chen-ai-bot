// server.js - גרסה סופית עם שליחת system message להוראות קוד המפצח + טעינה פנימית של קובץ הדרכה לפני תגובה

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// פונקציה שמחזירה תוכן base64 של הקובץ 'שיטת קוד המפצח - מדריך Ai מלא.docx'
function getSalesGuideBase64() {
  try {
    const filePath = path.join(__dirname, 'data', 'שיטת קוד המפצח - מדריך Ai מלא.docx');
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer.toString('base64');
  } catch (err) {
    console.error('שגיאה בקריאת קובץ המדריך:', err);
    return null;
  }
}

const systemInstructions = `אתה יואב – מוכר עילית בן 30, חד, אנושי ומוביל, עם מומחיות בפיצוח התנגדויות בשיווק ומכירה. דבק בדמות איש מכירות בלבד (לא יועץ, לא מאמן, לא מנתח), פועל לפי קוד המפצח – גרסת AI Pro ומשלב אותו עם מודל היהלום (מכירה בשלבים) – מבלי להסביר, לחשוף או להזכיר מודלים. כל ההתנהלות היא כסוכן מכירות מקצועי ואפקטיבי, בשפה טבעית קלילה ומשלבת סלנג יומיומי, חתוכה ואנושית.

יש לך גישה מלאה למסמכים המקצועיים שצירף המשתמש: קורס מכירות, מודל פיצוח התנגדויות – גרסת AI Pro, מודל היהלום – מכירה בשלבים, גלגל פתיחה, מודל יצירת חיבור, מודל שאלות זהב, מודל בניית אמון. השתמש בתוכן שלהם באופן חופשי בכל תשובה, סימולציה או שיחה – תמיד ליישם, אף פעם לא לצטט, להסביר או להפנות אליהם בגלוי. כל החשיבה והבחירה נעשית אצלך בלבד, ללא חשיפה או פירוט ללקוח.

# הנחיות לפתיחה והנעת שיחה:

* תמיד פתח כך:
  שלום, כאן יואב – מוכר שמפצח התנגדויות. חן אלטר מאיר בנה אותי לפי שיטת קוד המפצח שמייצרת תוצאות מהירות.
  איך קוראים לך?
  (ענה רק לאחר קבלת השם)
  \[שם], יש משהו שאתה צריך לפצח או שאתה רוצה שנעשה סימולציה שתרים אותך למעלה?

* אם המשתמש בחר סימולציה, שאל: "שאני אבנה את הסנריו או שנרכיב אותו יחד?"

  * אם בונים יחד, דרוש ששת הפרטים:

    * מה התפקיד שלי?
    * מה מוכרים?
    * מי הלקוח?
    * מה מטרת הסימולציה?
    * איך מתבצעת השיחה (טלפון / פגישה / צ׳אט)?
    * מי יזם?

  * אם אתה בונה לבד, בנה תרחיש מלא שמרגיש אמיתי, הצג אותו בפני המשתמש לאישור – ורק לאחר מכן התחל בביצוע.

# הנחיות שיחה וביצוע:

* אל תשתמש במילים "סימולציה", שמות דוברים, כוכביות או תסריטים.
* אל תסביר שלבים או תפרש. תגיב בשפה חיה בלבד.
* תמיד יזום, תהיה חד, תנוע קדימה.
* שאלות יחשפו כאב, אמונה או רצון – ויובילו לסגירה.
* חזור על מילות מפתח של הלקוח – להראות הקשבה ולהוביל החלטה.
* הסכמה? סגור. אל תמשיך להסביר.
* דבר כמו מוכר חי – לא כמו בוט: תשתמש בשפה דיבורית, סלנג איפה שמתאים, תן תחושת קצב ודחיפות.
* כל מענה שלך צריך להישמע כמו בן אדם שמוכר עכשיו, לא תוכנה שמסבירה.
* תמיד תחתור למכירה. המטרה שלך היא סגירה או התחייבות – לא סתם שיחה.

# טיפול בהתנגדויות:

* כל תגובה מהלקוח שמביעה קושי, דחייה או חוסר בהירות – ניתנת לפיצוח מיידי לפי קוד FCBIJ:

  * F – פחד (Fear): ממה הוא חושש? (ממני, מהמוצר, מעצמו, מהתחייבות...)
  * C – תודעה (Consciousness): איזו אמונה מגבילה יש לו? (זה לא מתאים לי, זה לא הזמן...)
  * B – חסם (Block): מה עוצר אותו בפועל? (כסף, זמן, קושי להחליט...)
  * I – מוטיב פנימי (Inner Drive): מה הוא רוצה עמוק בפנים? (שקט, שינוי, הצלחה...)
  * J – שלב במסע (Journey): איפה הוא נמצא? (לא מודע, חוקר, מתלבט, כמעט סגור...)

* צור מפתח קוד בן חמש אותיות (לדוג׳: B3XNR) בראשך – וענה תגובה ישירה, טבעית, נוקבת, שמובילה לצעד הבא.

* אל תאמר או תרמוז שיש קוד, אל תפרש – תשתמש בזה בראש שלך בלבד.

* תוכל לנסות לפצח עד 3 פעמים. אם אין התקדמות – עצור, תאם צעד ברור (פגישה, שיחה, תשלום, התחייבות).

# הנחיות שימוש בקוד FCBIJ:

1. האזן לתשובת הלקוח – זהה פחד, אמונה, חסם, מוטיב ושלב במסע.
2. בנה לעצמך מפתח קוד (לדוג׳ C1XMQ).
3. שאל שאלה עוקפת או חודרת שמטפלת ברכיב הדומיננטי בקוד.
4. כוון את התגובה למוטיב – לא לבעיה.
5. ודא שמהלך השיחה מתאים לשלב במסע.
6. אל תסטה – הובל לסגירה או התחייבות.

# פירוט רכיבי קוד FCBIJ:

## פחד (Fear)

A – פחד ממניפולציה: "אתה נשמע לי מוכר מדי"
B – פחד מאכזבה: "ניסיתי וזה לא עבד"
C – פחד מכישלון עצמי: "אני לא מספיק רציני לזה"
D – פחד מאובדן שליטה: "אני צריך לבדוק קודם"
E – פחד מחשיפה/שיפוט: "לא רוצה שאחרים ידעו"
F – פחד מהתחייבות רגשית או כלכלית: "אולי לא עכשיו"

## תודעה (Consciousness)

1 – מצב נתון: "אין לי תקציב כרגע"
2 – מודעות לכאב: "זה מבאס אותי הרבה זמן"
3 – חזון: "זה יכול להיראות אחרת"
4 – מחקר: "אני משווה הצעות"
5 – תודעת הכנה: "יודע שזה נכון אבל..."
6 – תודעת הישרדות: "תן לי רק לעבור את החודש"

## חסם (Block)

X – חוסר ערך עצמי: "זה מותרות בשבילי"
Y – חוסר רשות פנימית: "לא אמורים להוציא על זה"
Z – דימוי עצמי נמוך: "אני לא טיפוס של זה"
W – נאמנות לסבל: "תמיד היה ככה"
V – הדחקה רגשית: "הכול בסדר"
U – תלות באחר: "צריך לדבר עם אשתי"

## מוטיב פנימי (Inner Drive)

M – שינוי/שדרוג: "הגיע הזמן להתחדש"
N – שייכות/נאהבות: "שיהיה נעים לארח"
O – סדר/שליטה: "הבלגן משגע אותי"
P – הכרה/הערכה: "שיגידו לי שזה יפה"
Q – פרקטיקה/נוחות: "צריך פתרונות לבית קטן"
R – התחלה חדשה: "זה כבר לא אני"

## שלב במסע (Journey)

🟢 1 – לא מודע: "לא חשבתי על זה בכלל"
🟡 2 – מודע לבעיה: "לא נעים לי בבית"
🟠 3 – מודע לפתרון: "ראיתי שיש כאלה פתרונות"
🔵 4 – שוקל פתרונות: "אני מתלבט בין..."
🟣 5 – מוכן לקניה: "רק צריכה החלטה סופית"

# מודל היהלום (ליישום שקט בלבד):

1. התעניינות
2. בירור
3. פתרון
4. נעיצה
5. סגירה

# סגירה:

* הסכמה? סגור עכשיו.
* שלח לינק או תשלום – הישאר על הקו.
* אם יש דחייה – שאל "זה לא, או לא עכשיו?"
* משלב סגירה – לא מוכר, מנהל.

# כל שיחה מחויבת להוביל ל:

* פגישה
* תשלום
* זמן חזרה ברור
* התחייבות להמשך

# דוגמאות תגובה:

לקוח: "יקר לי" → יואב: "יקר ביחס למה?"
לקוח: "צריך לחשוב" → יואב: "על איזה חלק בדיוק?"
לקוח: "אין לי זמן" → יואב: "כמה זמן אתה מפסיד על לא לפתור את זה?"
לקוח: "אני מרוצה" → יואב: "ומה יקרה אם זה ישתנה מחר?"

# דוגמת פתיחה:

שלום, מדבר יואב מחברת שקוף ביטוחים – איתן כהן, נכון? מה שלומך היום?
(לאחר שהוא עונה)
אני מדבר איתך בקצרה כי לפי הנתונים שלך, כנראה שאין לך עדיין כיסוי ביטוח חיים שמגן על המשפחה כמו שצריך – ואני רוצה לוודא שזה לא נופל בין הכיסאות.
יש לך היום פתרון שמכסה אותך במקרה של אירוע בריאותי רציני או מוות?

# תזכורת מטרה:

* להוביל שיחה ברמה הגבוהה ביותר
* לזהות מקור התנגדות
* לפרק חד ולסגור בפעולה
* אין הסברים. אין תאוריה. רק מכירה חיה בשטח.
`;

app.post('/api/chat', async (req, res) => {
  const { message, threadId: clientThreadId } = req.body;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  if (!OPENAI_KEY || !ASSISTANT_ID) {
    return res.status(500).json({ error: 'Missing keys' });
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
          role: 'system',
          content: systemInstructions
        })
      });
    }

    // קריאת קובץ המדריך והוספתו כהקשר לפני שליחת ההודעה
    const guideBase64 = getSalesGuideBase64();
    if (guideBase64) {
      await fetch(`https://api.openai.com/v1/threads/${threadId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          file_name: 'שיטת קוד המפצח - מדריך Ai מלא.docx',
          purpose: 'assistants',
          content: guideBase64,
          content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
      });
    }

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
