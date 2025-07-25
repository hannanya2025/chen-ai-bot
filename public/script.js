app.post('/api/chat', async (req, res) => {
  const { message, threadId: clientThreadId } = req.body;
  const OPENAI_KEY = process.env.OPENAI_KEY;
  const ASSISTANT_ID = process.env.ASSISTANT_ID;

  // בדיקת משתני סביבה
  if (!OPENAI_KEY || !ASSISTANT_ID) {
    console.error('Missing environment variables:', { 
      hasKey: !!OPENAI_KEY, 
      hasAssistant: !!ASSISTANT_ID 
    });
    return res.status(500).json({ error: 'Missing OPENAI_KEY or ASSISTANT_ID in environment variables' });
  }

  try {
    console.log('Starting chat request for message:', message);
    
    // יצירת או שימוש ב-thread קיים
    let threadId = clientThreadId;
    if (!threadId) {
      console.log('Creating new thread...');
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
        console.error('Failed to create thread:', errorText);
        return res.status(500).json({ error: 'Failed to create conversation thread' });
      }
      
      const threadData = await threadRes.json();
      threadId = threadData.id;
      console.log('Created thread:', threadId);
    }

    // הוספת הודעה ל-thread
    console.log('Adding message to thread...');
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
      console.error('Failed to add message:', errorText);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // הרצת האסיסטנט
    console.log('Starting assistant run...');
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
      console.error('Failed to start run:', errorText);
      return res.status(500).json({ error: 'Failed to start assistant' });
    }

    const runData = await runRes.json();
    const runId = runData.id;
    console.log('Started run:', runId);

    // המתנה לסיום עם timeout
    let runStatus = 'in_progress';
    let attempts = 0;
    const maxAttempts = 30; // 30 שניות מקסימום

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
        console.error('Failed to check run status');
        break;
      }

      const statusData = await statusRes.json();
      runStatus = statusData.status;
      console.log(`Run status (attempt ${attempts}):`, runStatus);
    }

    if (attempts >= maxAttempts) {
      console.error('Run timed out after 30 seconds');
      return res.status(500).json({ error: 'הבוט לקח יותר מדי זמן לענות. נסה שוב.' });
    }

    if (runStatus !== 'completed') {
      console.error('Run failed with status:', runStatus);
      return res.status(500).json({ error: `הבוט לא הצליח לעבד את הבקשה. סטטוס: ${runStatus}` });
    }

    // שליפת התגובה
    console.log('Fetching messages...');
    const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesRes.ok) {
      const errorText = await messagesRes.text();
      console.error('Failed to fetch messages:', errorText);
      return res.status(500).json({ error: 'Failed to get response' });
    }

    const messagesData = await messagesRes.json();
    const lastBotMessage = messagesData.data.find(m => m.role === 'assistant');

    if (!lastBotMessage) {
      console.error('No assistant message found');
      return res.status(500).json({ error: 'הבוט לא החזיר תגובה.' });
    }

    const replyText = lastBotMessage.content[0]?.text?.value || 'הבוט לא ענה.';
    console.log('Successfully got reply, length:', replyText.length);

    res.json({ reply: replyText, threadId });

  } catch (err) {
    console.error('שגיאה בתקשורת עם OpenAI:', err);
    res.status(500).json({ error: 'שגיאה כללית בתקשורת עם הבוט.' });
  }
});
