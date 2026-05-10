import { readFile } from '../services/storage.service';

export interface ParsedCV {
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  workExperiences: { title: string; employer: string; startDate: string | null; endDate: string | null; description: string | null }[];
  education: string | null;
  summary: string | null;
  source: 'ai' | 'rule';
}

function ruleBasedParse(text: string): ParsedCV {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+?233[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{4}|\d{3}[\s\-]?\d{3}[\s\-]?\d{4})/);
  const nameMatch = lines.find(l => /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(l.trim()));

  const skillKeywords = [
    'blasting', 'drilling', 'excavation', 'haul truck', 'excavator', 'loader',
    'forklift', 'crane', 'scaffolding', 'welding', 'mining', 'safety', 'pump',
    'generator', 'surveying', 'geology', 'ventilation', 'ground support',
    'maintenance', 'mechanic', 'electrical', 'first aid', 'cctv', 'surveillance',
    'security', 'crushing', 'conveyor', 'crane operation', 'rigging',
  ];

  const foundSkills = skillKeywords.filter(k => lower.includes(k));

  const expBlocks: ParsedCV['workExperiences'] = [];
  const expPatterns = [
    /(?:underground|surface|opencast|open.pit)\s+mine/i,
    /(?:gold|minerals|diamonds|copper|iron)\s+mine/i,
    /(?:site|plant|mill|processing)/i,
  ];

  const lines2 = text.split('\n');
  for (let i = 0; i < lines2.length; i++) {
    const l = lines2[i].trim();
    if (!l) continue;
    const isExpLine = expPatterns.some(p => p.test(l)) || /\d{4}\s*[-–]\s*(\d{4}|present|current)/i.test(l);
    if (isExpLine || /\b(mine|mining|site|plant|mill|operator|engineer|technician|supervisor|foreman)\b/i.test(l)) {
      expBlocks.push({
        title: l,
        employer: '',
        startDate: null,
        endDate: null,
        description: null,
      });
      if (expBlocks.length > 5) break;
    }
  }

  const eduKeywords = ['university', 'college', 'diploma', 'certificate', 'degree', 'bsc', 'hnd', 'btc', 'wassce', 'ssce'];
  const eduLine = lines.find(l => eduKeywords.some(k => l.toLowerCase().includes(k)));

  return {
    name: nameMatch?.trim() || null,
    email: emailMatch?.[0] || null,
    phone: phoneMatch?.[0] || null,
    skills: foundSkills,
    workExperiences: expBlocks,
    education: eduLine || null,
    summary: null,
    source: 'rule',
  };
}

export async function parseCV(storagePath: string, mimeType: string): Promise<ParsedCV> {
  try {
    const buffer = await readFile(storagePath);
    const text = buffer.toString('utf-8');

    try {
      const geminiKey = process.env.GEMINI_API_KEY || '';
      if (geminiKey && !geminiKey.includes('replace-with-')) {
        const prompt = `You are an expert CV/Resume parser. Extract structured information from this resume/CV text.
        
Return ONLY a valid JSON object with EXACTLY these fields (null if not found):
{
  "name": "Full name string",
  "email": "Email address",
  "phone": "Phone number",
  "skills": ["skill1", "skill2"],
  "workExperiences": [{"title": "Job title", "employer": "Employer name", "startDate": "YYYY or null", "endDate": "YYYY or null", "description": "Brief description or null"}],
  "education": "Highest education qualification string",
  "summary": "Brief professional summary or null"
}

STRICT RULES:
- Return ONLY the JSON. No markdown, no preamble, no explanation.
- skills array: only mining, safety, and heavy equipment operation skills found in the resume.
- workExperiences: up to 5 most relevant entries. Extract dates if visible.
- education: the highest qualification mentioned.

RESUME TEXT:
${text.slice(0, 8000)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 1500, temperature: 0.3, responseMimeType: 'application/json' },
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
          const cleaned = rawText.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          console.log('[CV Parser] AI parsed successfully');
          return { ...parsed, source: 'ai' as const };
        }
      }
    } catch (aiErr) {
      console.warn('[CV Parser] AI parsing failed, falling back to rule-based:', aiErr);
    }

    return ruleBasedParse(text);
  } catch (err) {
    console.error('[CV Parser] Failed to read file:', err);
    return ruleBasedParse('');
  }
}
