import axios from 'axios';
import { getPromptForCategory } from './prompts';
import { AnalysisResult, LeadData } from '@/types';

// Helper to clean JSON from AI responses (strips markdown code fences)
const cleanAIResponse = (text: string): string => {
  return text.replace(/```json|```/g, '').trim();
};

// Builds the user message, injecting lead information + category context if available
const buildUserMessage = (transcript: string, leadData?: Partial<LeadData>): string => {
  const categoryContext = leadData?.category
    ? `\nCampaign Category: ${leadData.category}\n`
    : '';

  const leadInfoContext = leadData
    ? `
Lead Information (from Database):
- First Name: ${leadData.firstName || 'N/A'}
- Last Name: ${leadData.lastName || 'N/A'}
- Email: ${leadData.email || 'N/A'}
- Job Title: ${leadData.jobTitle || 'N/A'}
- Employee Size: ${leadData.employeeCount || 'N/A'}
- Phone Number: ${leadData.phone || 'N/A'}

Use this lead information to inform the Authority and ICP Fit scores. Higher titles (e.g. Partner, Director, CHRO, HR Manager, etc.) should score higher on authority.
`
    : '';

  return `${categoryContext}${leadInfoContext}\nAnalyze this call transcript:\n\n${transcript}`;
};

export const scoreWithGroq = async (transcript: string, leadData?: Partial<LeadData>): Promise<AnalysisResult> => {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error('Groq API Key missing');

  const systemPrompt = getPromptForCategory(leadData?.category);

  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserMessage(transcript, leadData) }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  });

  return JSON.parse(response.data.choices[0].message.content);
};

export const scoreWithGemini = async (transcript: string, leadData?: Partial<LeadData>): Promise<AnalysisResult> => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('Gemini API Key missing');

  const systemPrompt = getPromptForCategory(leadData?.category);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const response = await axios.post(url, {
    contents: [{ parts: [{ text: `${systemPrompt}\n\n${buildUserMessage(transcript, leadData)}` }] }],
    generationConfig: { temperature: 0.1 }
  });

  const content = response.data.candidates[0].content.parts[0].text;
  return JSON.parse(cleanAIResponse(content));
};

export const scoreWithOpenAI = async (transcript: string, leadData?: Partial<LeadData>): Promise<AnalysisResult> => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OpenAI API Key missing');

  const systemPrompt = getPromptForCategory(leadData?.category);

  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserMessage(transcript, leadData) }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  });

  return JSON.parse(response.data.choices[0].message.content);
};

export const scoreWithClaude = async (transcript: string, leadData?: Partial<LeadData>): Promise<AnalysisResult> => {
  const apiKey = process.env.CLAUDE_API_KEY?.trim();
  if (!apiKey) throw new Error('Claude API Key missing');

  const systemPrompt = getPromptForCategory(leadData?.category);

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: buildUserMessage(transcript, leadData) }],
      temperature: 0.1
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.content[0].text;
    return JSON.parse(cleanAIResponse(content));
  } catch (error: any) {
    if (error.response) {
      console.error('Claude API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};
