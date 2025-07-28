import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import fs from 'fs';
import { promisify } from 'util';

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
`;

// פונקציה ליצירת קובץ שמע דרך OpenAI TTS
async function generateSpeech(text) {
    const OPENAI_KEY = process.env.OPENAI_KEY;
    if (!OPENAI_KEY) throw new Error('Missing OPENAI_KEY');

    const fileName = `speech-${Date.now()}.mp3`;
    const audioFilePath = path.join(__dirname, 'public', fileName);
    
    try {
        console.log('🎙️ יוצר קובץ שמע עבור:', text.substring(0, 50) + '...');
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice: 'alloy', // מתאים לגבר בן 30
                input: text,
                response_format: 'mp3',
                speed: 1.2 // מהירות כמו שביקשת
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`TTS API Error ${response.status}: ${errorText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        await promisify(fs.writeFile)(audioFilePath, Buffer.from(arrayBuffer));

        console.log(`🎙️ קובץ שמע נוצר: ${audioFilePath}`);

        // מחזיר את הנתיב הנכון
        const audioUrl = `/${fileName}`;

        // מחק את הקובץ אחרי 5 דקות
        setTimeout(() => {
            if (fs.existsSync(audioFilePath)) {
                fs.unlinkSync(audioFilePath);
                console.log(`🗑️ קובץ שמע נמחק: ${fileName}`);
            }
        }, 300000);

        return audioUrl;

    } catch (err) {
        console.error('🎙️ שגיאה ביצירת שמע:', err.message);
        throw err;
    }
}

// פונקציה לעיבוד הודעות עם המתנה להקלדה
async function processMessages(threadId) {
    if (processingThreads.has(threadId)) return;  // מניעת עיבוד כפול של הודעות

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
        const reply = lastBotMessage?.content[0]?.text?.value || 'לא התקבלה תשובה';

        const audioUrl = await generateSpeech(reply);

        const allClients = currentClients.splice(0);
        allClients.forEach(client => client?.resolve?.({ reply, threadId, audioUrl }));

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
        const { reply, audioUrl } = await result;
        res.json({ reply, threadId, audioUrl });

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
