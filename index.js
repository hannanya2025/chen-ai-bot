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

// תור הודעות ונתונים לכל thread
const messageQueues = new Map();
const processingThreads = new Set();
const waitingClients = new Map();
const processTimers = new Map();
const processTimeouts = new Map(); // טיימר הגנה לעיבוד
const DELAY_TIME = 1500; // 1.5 שניות לאיסוף הודעות
const MAX_PROCESS_TIME = 10000; // 10 שניות מקסימום לעיבוד

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

// פונקציה לעיבוד הודעות מאוחדות
async function processMessages(threadId) {
    if (processingThreads.has(threadId)) return;
    
    processingThreads.add(threadId);
    console.log(`🔄 Processing messages for thread: ${threadId}`);
    
    // טיימר הגנה לעיבוד
    const timeout = setTimeout(() => {
        console.error(`⏰ Process timeout for thread ${threadId}, resetting`);
        processingThreads.delete(threadId);
        const clients = waitingClients.get(threadId) || [];
        const allClients = clients.splice(0);
        allClients.forEach(client => {
            if (client && client.reject) {
                client.reject(new Error('Process timeout'));
            }
        });
        messageQueues.delete(threadId);
        processTimeouts.delete(threadId);
    }, MAX_PROCESS_TIME);

    processTimeouts.set(threadId, timeout);

    try {
        const OPENAI_KEY = process.env.OPENAI_KEY;
        const ASSISTANT_ID = process.env.ASSISTANT_ID;
        
        const queue = messageQueues.get(threadId) || [];
        const clients = waitingClients.get(threadId) || [];
        
        if (queue.length === 0 || clients.length === 0) {
            processingThreads.delete(threadId);
            clearTimeout(processTimeouts.get(threadId));
            processTimeouts.delete(threadId);
            return;
        }

        // איחוד כל ההודעות בתור לאחר שהטיימר הסתיים
        const allMessages = queue.splice(0); // לוקח את כל ההודעות ומנקה את התור
        const combinedMessage = allMessages.map(msg => msg.content).join('\n\n');
        console.log(`📝 Combined ${allMessages.length} messages: ${combinedMessage}`);

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

        console.log(`✅ Sending response to ${clients.length} clients: ${replyText}`);
        
        // שליחת התגובה לכל הלקוחות
        const allClients = clients.splice(0);
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
        clearTimeout(processTimeouts.get(threadId));
        processTimeouts.delete(threadId);
    }
}

// פונקציה לתזמון עיבוד עם דחייה קצרה
function scheduleProcessing(threadId) {
    if (processingThreads.has(threadId)) {
        console.log(`⏳ Delaying processing for thread ${threadId} due to active process`);
        return; // דוחה אם כבר בעיבוד
    }

    if (!processTimers.has(threadId)) {
        const timer = setTimeout(async () => {
            const queue = messageQueues.get(threadId) || [];
            if (queue.length > 0) {
                await processMessages(threadId);
            }
            processTimers.delete(threadId);
        }, DELAY_TIME);
        processTimers.set(threadId, timer);
    }
}

// Endpoints עבור התראות הקלדה (מיותר כאן אבל נשאיר לתאימות)
app.post('/api/typing', (req, res) => {
    const { threadId } = req.body;
    if (!threadId) {
        return res.status(400).json({ error: 'ThreadId is required' });
    }
    res.json({ status: 'typing received' });
});

app.post('/api/typing-stop', (req, res) => {
    const { threadId } = req.body;
    if (!threadId) {
        return res.status(400).json({ error: 'ThreadId is required' });
    }
    res.json({ status: 'typing stopped' });
});

// Endpoint לטיפול בשיחה
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

        if (!messageQueues.has(threadId)) {
            messageQueues.set(threadId, []);
        }
        if (!waitingClients.has(threadId)) {
            waitingClients.set(threadId, []);
        }

        const queue = messageQueues.get(threadId);
        const clients = waitingClients.get(threadId);
        
        queue.push({
            content: originalUserMessage,
            timestamp: Date.now()
        });

        const responsePromise = new Promise((resolve, reject) => {
            clients.push({ resolve, reject });
        });

        scheduleProcessing(threadId);
        console.log(`📨 Message queued for thread ${threadId}, total in queue: ${queue.length}`);

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
