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
const processingThreads = new Set(); // מעקב אחרי threads בעיבוד
const waitingClients = new Map();
const processTimers = new Map();
const typingStatus = new Map();
const activeRuns = new Map(); // מעקב אחרי ריצות פעילות לכל thread
const DELAY_TIME = 3000; // 3 שניות המתנה

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
    console.log(`🔄 Starting processing for thread: ${threadId}`);
    
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
        activeRuns.set(threadId, runId); // רושם את הריצה הפעילה

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

            // בדיקה אם התווספו הודעות חדשות במהלך ההמתנה
            if (messageQueues.get(threadId)?.length > 0) {
                // מבטל את הריצה הנוכחית אם אפשר (כרגע לא ניתן לבטל ישירות, אז ממתין לסיום)
                console.log(`⚠️ New message detected, waiting to combine: ${threadId}`);
                break;
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

        // שליחת התגובה רק אם אין הודעות חדשות
        if (messageQueues.get(threadId)?.length === 0) {
            console.log(`✅ Sending response to ${clients.length} clients: ${replyText}`);
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
        } else {
            console.log(`⏳ Delaying response due to new messages in queue: ${threadId}`);
            // מוסיף את הלקוחות חזרה לתור אם יש הודעות חדשות
            clients.push(...allClients);
            scheduleProcessing(threadId); // ממשיך לעבד עם ההודעות החדשות
        }

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
        activeRuns.delete(threadId); // מסיר את הריצה מהרשימה
        if (messageQueues.get(threadId)?.length > 0) {
            scheduleProcessing(threadId); // ממשיך לעבד אם יש הודעות נוספות
        }
    }
}

// פונקציה לתזמון עיבוד משופרת
function scheduleProcessing(threadId) {
    if (processTimers.has(threadId) || processingThreads.has(threadId) || activeRuns.has(threadId)) {
        console.log(`⏳ Delaying processing for thread ${threadId} due to active run or timer`);
        return; // דוחה את העיבוד אם יש ריצה או טיימר פעיל
    }

    const timer = setTimeout(async () => {
        const queue = messageQueues.get(threadId) || [];
        if (typingStatus.has(threadId)) {
            const lastTyping = typingStatus.get(threadId);
            const timeSinceTyping = Date.now() - lastTyping;
            if (timeSinceTyping < DELAY_TIME) {
                scheduleProcessing(threadId); // דחה שוב אם עדיין מקלידים
                return;
            }
        }
        if (queue.length === 0) {
            processTimers.delete(threadId);
            return;
        }
        processTimers.delete(threadId);
        await processMessages(threadId);
    }, DELAY_TIME);

    processTimers.set(threadId, timer);
}

// Endpoints עבור התראות הקלדה
app.post('/api/typing', (req, res) => {
    const { threadId } = req.body;
    if (!threadId) {
        return res.status(400).json({ error: 'ThreadId is required' });
    }
    typingStatus.set(threadId, Date.now());
    scheduleProcessing(threadId);
    res.json({ status: 'typing received' });
});

app.post('/api/typing-stop', (req, res) => {
    const { threadId } = req.body;
    if (!threadId) {
        return res.status(400).json({ error: 'ThreadId is required' });
    }
    typingStatus.delete(threadId);
    scheduleProcessing(threadId);
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
