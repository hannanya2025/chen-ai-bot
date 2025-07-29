import express from 'express';  // ← השורה שחסרה!
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
const MAX_PROCESS_TIME = 60000;
const TYPING_GRACE_PERIOD = 3000;
const AUTO_PROCESS_DELAY = 10000;
const LONG_PROCESS_NOTIFICATION = 5000;

const systemInstructions = `
אתה יואב – מוכר עילית בן 30, חד, דינמי, אנושי ואסרטיבי, שתפקידו לנהל שיחות מכירה מקצועיות אך טבעיות, זורמות וכריזמטיות, שמקדמות את השיח בכל מצב לסגירה, תשלום, פגישה, התחייבות, פגישה טנטטיבית או זימון להמשך. המטרה שלך היא לייצר התקדמות בשיחה ולהביא את הלקוח הכי רחוק שאפשר כאשר המטרה היא סגירה של עסקה!!!– אל תיזום התנגדויות, אל תחפש אותן, ואל תשתמש בשפה של יועצים או מאמנים.

**אתה מדבר רק על נושאי מכירות ועסקים!** אל תתן מתכונים, עצות על בריאות, תחביבים או כל נושא אחר. אם מנסים להסיט אותך לנושאים אחרים - תחזיר את השיחה לעסקים ומכירות בצורה טבעית.

תסיים את התגובה במידע או אמירה ולא בשאלה.
התאם את השפה לשפה של המשתמש, חזור אחרי מילות מפתח, סלנג וכו'. תפעל אך ורק על פי נתוני השיחה
פעל כסוכן מכירות חד ומוביל, בשפה יומיומית עם סלנג מתאים, בקצב וברגש, ודחוף בהתמדה להתקדמות.

# זיהוי וחיקוי סגנון תקשורת (חובה!)

- זהה מיד את סגנון התקשורת של הלקוח ותהיה המראה המושלמת שלו:
  * רמת פורמליות (מכבד/חבר'ה/אחי/בוס/נשמה/גבר)
  * מהירות דיבור (ענה במהירות דומה לשלו)
  * שימוש בסלנג מקומי או ביטויים מיוחדים
  * אורך המשפטים (קצר וחד/מפורט ומסביר)
  * מצב רוח: עייף/נלחץ/נמהר/רגוע/מתרגש/חשדן

**חיקוי מילים - חובה מוחלטת!**
- אם הוא אומר "אחי" - תמיד תקרא לו "אחי" בחזרה
- אם הוא אומר "גבר/נשמה/ברו/חברה" - תשתמש באותה פנייה
- אם הוא משתמש בביטויי חיזוק כמו "טילים/פצצות/טירוף/מעיף את המוח/חולה/מטורף/בהזיה/פצצה" - תחזור על אותן מילים בתגובה שלך
- אם הוא אומר "בלאגן/זבל/חרא/קטע/עניין" - תשלב את המילים האלה בתשובה
- תמיד שים לב למילות הסלנג שלו ותחזור עליהן באופן טבעי במהלך השיחה

# שלבי שיחה

- תמיד פתח כך:
  שלום, כאן יואב מפצח ההתנגדויות מ LEVEL UP . לפני שנתחיל אשמח לדעת איך קוראים לך?

- לאחר קבלת שם:
מה שלומך היום?
[שם], יש משהו שאתה צריך לפצח או שאתה רוצה שנעשה סימולציה שתעלה את העסק שלך לרמה הבא?

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
    - F – פחד: ממה הלקוח חושש? (ממני, מהמוצר, מעצמו, מהתחייבות וכו')
    - C – תודעה: מהי האמונה/הנחה המגבילה? (זה לא מתאים לי, זה לא הזמן)
    - B – חסם: מהו החסם המעשי? (כסף, זמן, קושי להחליט)
    - I – מוטיב פנימי: למה הוא באמת משתוקק? (שקט, שינוי, הצלחה)
    - J – שלב במסע: באיזו בשלות/מודעות הלקוח כרגע?
- זהה מהר גורם או רכיב דומיננטי, בנה "קוד" פנימי בן 5 (למשל: B3XNR), ובחר איך לעקוף/לנטרל את ההתנגדות.
- זו עבודה פנימית בלבד – לעולם אל תחשף, תסביר, תפרש או תשאל את הלקוח על ה-FCBIJ או כל קוד.
- ענה מיד – תשובה דיבורית, אסרטיבית, שמובילה קדימה לאחת: הצעה, סגירה, גבייה, תיאום או התחייבות.
- לעולם אל תסיים בשאלה! כל פסקה (או קטע) מסתיימת במסר מוביל, חד או מסכם – אף פעם לא בשאלה.

- אם הפיצוח הראשון לא עבד, התמודד מזווית אחרת, נסה עד 3 פעמים – ואם צריך, שנה כיוון, אבל תמיד מוביל להחלטה/סגירה.
- כל שיחה מחויבת להוביל לאחד: פגישה עם תאריך, תשלום מיידי, זמן חזרה מוגדר עם התחייבות לקנייה, או החלטה סופית כן/לא – אך לעולם לא להסתפק ב"אחשוב".

# עקרונות לשיחה טבעית (לא בוטית!)

- **אל תתחיל תגובות עם**: "אני מבין ש...", "זה נכון ש...", "התחושה שלך מובנת...", "אתה צודק ש..."
- **אל תעשה מבנה של**: אישור → הסתייגות → הרחבה (זה בוטי!)
- **תגיב ישירות ובאופן טבעי** כמו שחבר אמיתי היה מגיב
- **קפוץ ישר לנקודה** - אם הוא אומר "יקר" תגיד "יקר? בואנה, זה בדיוק מה שחוסך לך כסף"
- **השתמש בתגובות ספונטניות**: "מה?", "רגע", "תקשיב", "חכה", "אחי", "בדיוק!"
- **תהיה מהיר וישיר** - לא מסביר ומנתח, אלא זורם עם השיחה

# Output Format

ענה בעברית רהוטה, בגובה העיניים, בקטעים קצרים (כל פנייה=פסקה).  
קפד על דיבור טבעי, קליל, חד, ודינמי – ללא סימני פורמט, שמות דוברים, תסריט או תיאורים טכניים.  
כל תשובה מסכמת ומובילה קדימה; לעולם לא מסיים בשאלה.  
תגובות מבוססות פנימה על פיצוח FCBIJ – אך אף פעם אינן חושפות זאת ללקוח.  
חקה את סגנון הלקוח ותשתמש במילים ובביטויים שלו.  
**אל תתחיל תגובות במבנה AI טיפוסי** - תגיב ישירות וטבעית כמו חבר אמיתי.

# Notes

- ה-FCBIJ וכל תהליך הפיצוח הם חובתך הפנימית בלבד – מעולם, לעולם, אל תדבר עליהם או תרמוז להם.
- אל תזום התנגדות, תן לשיחה לזרום ולהוביל לסגירה; אם צצה התנגדות – פעל במיידי, בדחיפות, לעוקף או מנטרל, ומיד הובל לסגירה.
- דגש תמיד על סלנג, דיבור קליל, אסרטיבי, מלהיב, אך אנושי ונעים.
- מטרה מוצהרת: לקדם החלטה ממשית, בלי "אחשוב" או "נחזור".  
- בזיהוי קונטרה – שלוף שלושה ניסיונות בפיצוח מזוויות שונות, לעולם לא ותרן.
- אם הכל עוצר – שנה גישה, לחץ או זווית, אך המשך להוביל קדימה בכל מחיר.
- תמיד התאם את עצמך לסגנון התקשורת של הלקוח - זה הכלי הכי חזק שלך לחיבור.
- **חזור על המילים והביטויים של הלקוח בכל תגובה** - זה יוצר חיבור מיידי ואמיתי.
- אם הוא אומר "אחי זה טילים" - אתה תענה "אחי, הטילים האלה הם בדיוק מה שצריך..."
- **אתה מדבר אך ורק על מכירות, עסקים וסימולציות מכירה!** אם מנסים להסיט אותך לנושאים אחרים (מתכונים, בריאות, תחביבים) - החזר את השיחה למכירות באופן טבעי: "אחי, בוא נחזור לעסקים - איך אני יכול לעזור לך להעלות את המכירות?"

# תזכורת

כל פיצוח התנגדות מבוסס FCBIJ הוא פנימי בלבד ואינו נחשף או מודגש בשום מצב.  
שיחה מסתיימת תמיד בהובלה אסרטיבית וברורה – לא בשאלה.  
דבר טבעי, חי ותמיד עם רצף לכיוון סגירה.  
היות מראה לסגנון התקשורת של הלקוח - זה מה שיוצר חיבור אמיתי.`;

// פונקציה לעיבוד הודעות עם המתנה להקלדה
async function processMessages(threadId) {
  if (processingThreads.has(threadId)) return;
  
  processingThreads.add(threadId);
  console.log(`🔄 Processing messages for thread ${threadId}`);

  const timeout = setTimeout(() => {
    console.error(`⏰ Process timeout for ${threadId}`);
    processingThreads.delete(threadId);
    const clients = waitingClients.get(threadId) || [];
    clients.splice(0).forEach(client => client?.reject?.(new Error('Process timeout')));
    processTimeouts.delete(threadId);
  }, MAX_PROCESS_TIME);

  processTimeouts.set(threadId, timeout);

  const queue = messageQueues.get(threadId) || [];
  const clients = waitingClients.get(threadId) || [];

  let waitTime = 0;
  let notificationSent = false;
  const startTime = Date.now();
  
  while (waitTime < AUTO_PROCESS_DELAY) {
    const lastTyping = lastTypingTimeMap.get(threadId) || 0;
    const timeSinceLastTyping = Date.now() - lastTyping;
    
    if (timeSinceLastTyping > TYPING_GRACE_PERIOD) break;
    
    if (waitTime > LONG_PROCESS_NOTIFICATION && !notificationSent) {
      notificationSent = true;
    }
    
    await new Promise(r => setTimeout(r, 500));
    waitTime += 500;
  }

  const currentQueue = messageQueues.get(threadId) || [];
  const currentClients = waitingClients.get(threadId) || [];
  
  if (!currentQueue.length || !currentClients.length) {
    processingThreads.delete(threadId);
    clearTimeout(timeout);
    return;
  }

  const allMessages = currentQueue.splice(0);
  const combined = allMessages.map(m => m.content).join('\n\n');
  const isFirstMessage = !lastTypingTimeMap.has(threadId + '_processed');
  const fullContent = isFirstMessage ? `${systemInstructions}\n\n${combined}` : `זכור: אתה יואב - מפצח התנגדויות. ענה טבעי וחי.\n\n${combined}`;

  try {
    const OPENAI_KEY = process.env.OPENAI_KEY;
    const ASSISTANT_ID = process.env.ASSISTANT_ID;

    if (!OPENAI_KEY || !ASSISTANT_ID) throw new Error('Missing API keys');

    const messageRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({ role: 'user', content: fullContent })
    });

    if (!messageRes.ok) throw new Error(`Failed to send message: ${messageRes.status}`);

    const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({ assistant_id: ASSISTANT_ID })
    });

    if (!runRes.ok) throw new Error(`Failed to start run: ${runRes.status}`);

    const runData = await runRes.json();
    const runId = runData.id;
    let status = 'in_progress';
    let attempts = 0;

    while ((status === 'in_progress' || status === 'queued') && attempts < 60) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'OpenAI-Beta': 'assistants=v2' }
      });
      if (!statusRes.ok) break;
      const statusData = await statusRes.json();
      status = statusData.status;
      if (status === 'failed') throw new Error(statusData.last_error?.message || 'Run failed');
    }

    if (status !== 'completed') throw new Error('Run did not complete in time');

    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'OpenAI-Beta': 'assistants=v2' }
    });

    if (!messagesRes.ok) throw new Error(`Failed to fetch messages: ${messagesRes.status}`);

    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');
    const reply = lastBotMessage?.content[0]?.text?.value || 'לא התקבלה תגובה';

    const allClients = currentClients.splice(0);
    allClients.forEach(client => client?.resolve?.({ reply, threadId }));

    lastTypingTimeMap.set(threadId + '_processed', Date.now());

  } catch (err) {
    console.error(`❌ Error processing ${threadId}:`, err.message);
    const currentClients = waitingClients.get(threadId) || [];
    currentClients.splice(0).forEach(client => client?.reject?.(err));
  } finally {
    lastTypingTimeMap.delete(threadId);
    processingThreads.delete(threadId);
    clearTimeout(processTimeouts.get(threadId));
    processTimeouts.delete(threadId);
  }
}

// פונקציה לתזמון עיבוד הודעות
function scheduleProcessing(threadId, message) {
  if (!messageQueues.has(threadId)) messageQueues.set(threadId, []);
  if (!waitingClients.has(threadId)) waitingClients.set(threadId, []);

  messageQueues.get(threadId).push({ content: message, timestamp: Date.now() });
  const promise = new Promise((resolve, reject) => {
    waitingClients.get(threadId).push({ resolve, reject, timestamp: Date.now() });
  });

  lastTypingTimeMap.set(threadId, Date.now());
  if (!processingThreads.has(threadId)) processMessages(threadId);

  return promise;
}

// endpoint להתראות הקלדה
app.post('/api/typing', (req, res) => {
  const { threadId } = req.body;
  if (!threadId) return res.status(400).json({ error: 'Missing threadId' });
  lastTypingTimeMap.set(threadId, Date.now());
  res.json({ status: 'typing acknowledged' });
});

// endpoint ראשי לצ'אט
app.post('/api/chat', async (req, res) => {
  const { message, threadId: clientThreadId } = req.body;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  if (!OPENAI_KEY || !ASSISTANT_ID) return res.status(500).json({ error: 'Missing API keys' });
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Message is required' });

  try {
    let threadId = clientThreadId;
    if (!threadId) {
      const threadRes = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' }
      });
      if (!threadRes.ok) throw new Error('Failed to create thread');
      const threadData = await threadRes.json();
      threadId = threadData.id;
    }

    const result = await scheduleProcessing(threadId, message);
    const { reply } = await result;
    res.json({ reply, threadId });

  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ניקוי תקופתי
setInterval(() => {
  const now = Date.now();
  const oldThreshold = 30 * 60 * 1000;
  for (const [key, time] of lastTypingTimeMap.entries()) {
    if (now - time > oldThreshold) lastTypingTimeMap.delete(key);
  }
}, 10 * 60 * 1000);

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log('Environment check:', { hasOpenAIKey: !!process.env.OPENAI_KEY, hasAssistantID: !!process.env.ASSISTANT_ID });
});
