app.post('/api/chat', async (req, res) => {
  const { message, threadId: clientThreadId } = req.body;

  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  if (!OPENAI_KEY || !ASSISTANT_ID) {
    return res.status(500).json({ error: 'Missing OPENAI_KEY or ASSISTANT_ID in .env' });
  }

  try {
    // אם אין threadId מהלקוח – צור חדש
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
    }

    // הוסף הודעה ל-thread
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

    // הרץ את האסיסטנט
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

    // המתן לסיום
    let runStatus = 'in_progress';
    while (runStatus === 'in_progress' || runStatus === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const statusData = await statusRes.json();
      runStatus = statusData.status;
    }

    if (runStatus !== 'completed') {
      return res.status(500).json({ error: 'הבוט לא הצליח לעבד את הבקשה.' });
    }

    // שלוף תגובה
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');

    if (!lastBotMessage) {
      return res.status(500).json({ error: 'הבוט לא החזיר תגובה.' });
    }

    const replyText = lastBotMessage.content[0]?.text?.value || 'הבוט לא ענה.';

    // 💡 מחזיר גם את threadId ללקוח – כדי שישמור אותו
    res.json({ reply: replyText, threadId });

  } catch (err) {
    console.error('שגיאה בתקשורת עם OpenAI:', err);
    res.status(500).json({ error: 'שגיאה כללית בתקשורת עם הבוט.' });
  }
});
