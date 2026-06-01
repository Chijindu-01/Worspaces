/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to prevent server crashes if the API key is not yet set up
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required for AI features.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// AI Endpoint: Analyze team productivity and workspace accountability
app.post('/api/ai/analyze-productivity', async (req, res) => {
  try {
    const { tasks, meetings, goals, staffMembers } = req.body;

    const ai = getGeminiClient();

    const systemPrompt = `You are an elite, highly professional organizational psychologist and agile productivity consultant.
Analyze the current workplace data (tasks, meetings, goals, staff members) and construct a concise, high-impact, professional analysis report.
No fluffy introductions, no generic templates, and no self-reference.
Format the output strictly as clear, readable Markdown with structured sections:
1. Executive Accountability Rating (Assign a Grade A-F, with a 2-sentence rationale on current delivery rhythm)
2. Strategic Bottlenecks (Identify specific unassigned tasks, overdue items, blocked items, or overloaded/underutilized members if any exist)
3. Actionable Coaching Recommendation (Give a highly targeted coaching strategy to scale delivery velocity)
4. Key Goals Alignment (Review whether current tasks directly map to the listed high-level Goals)`;

    const contextPrompt = `
Current Staff Members:
${JSON.stringify(staffMembers, null, 2)}

Current Goal List:
${JSON.stringify(goals, null, 2)}

Current Tasks:
${JSON.stringify(tasks, null, 2)}

Current Scheduled Meetings:
${JSON.stringify(meetings, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contextPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });

    res.json({ report: response.text });
  } catch (error: any) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while generating reports' });
  }
});

// AI Endpoint: Generate highly crisp meeting summaries & action items
app.post('/api/ai/meeting-summary', async (req, res) => {
  try {
    const { title, date, agenda, notes, attendees } = req.body;

    const ai = getGeminiClient();

    const systemPrompt = `You are a professional administrative lead. Summarize the meetings notes and agendas into structured Minutes of Meeting.
Provide three clear sections in markdown:
1. Short Summary (What was discussed)
2. Key Decisions (What was finalized)
3. Assigned Accountability (Who is holding the action items, and by when)`;

    const contextPrompt = `
Meeting: ${title}
Date: ${date}
Attendees: ${JSON.stringify(attendees)}
Agenda Items:
${agenda.map((a: string) => `- ${a}`).join('\n')}

Raw Notes taken during meeting:
${notes || 'No raw notes provided.'}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contextPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
      },
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error('Gemini meeting summary error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while generating meeting summaries' });
  }
});

// Start server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VFT Workspace] Server running on http://localhost:${PORT}`);
  });
}

startServer();
