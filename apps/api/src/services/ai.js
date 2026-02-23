import OpenAI from 'openai';

let openaiClient = null;

function getOpenAI(apiKey) {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function buildCharacterContext(characters) {
  return characters.map(c => `
CHARACTER: ${c.name} (${c.role})
Age: ${c.age || 'unknown'}
Personality: ${(c.personality_traits || []).join(', ')}
Speech Style: ${c.speech_style || ''}
Catchphrases: ${(c.catchphrases || []).join(', ')}
Visual: ${c.visual_description || ''}
Clothing: ${c.clothing_description || ''}
Backstory: ${c.backstory || ''}
`.trim()).join('\n---\n');
}

export async function generateMoral(usedMorals, targetAge, model = 'gpt-4o') {
  const ai = getOpenAI();
  const usedList = usedMorals.map(m => `- ${m.moral_text}`).join('\n') || 'None yet';
  const res = await ai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You generate unique moral lessons for a children's cartoon targeted at ages ${targetAge}. Keep morals simple, positive, and age-appropriate.`,
      },
      {
        role: 'user',
        content: `Generate ONE new moral lesson. Avoid these already-used morals:\n${usedList}\n\nRespond with just the moral as a single sentence.`,
      },
    ],
    max_tokens: 100,
  });
  return res.choices[0].message.content.trim();
}

export async function generateTitle(moral, showName, model = 'gpt-4o') {
  const ai = getOpenAI();
  const res = await ai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: `You create episode titles for the children's cartoon "${showName}". Titles should be fun, catchy, and about 4-6 words.` },
      { role: 'user', content: `Create an episode title for an episode with this moral: "${moral}". Respond with just the title.` },
    ],
    max_tokens: 50,
  });
  return res.choices[0].message.content.trim().replace(/^"|"$/g, '');
}

export async function generateScript({ show, characters, moral, recentSummaries, episodeNumber }) {
  const ai = getOpenAI();
  const model = show.openai_model || 'gpt-4o';
  const characterContext = buildCharacterContext(characters);
  const continuity = recentSummaries.length > 0
    ? recentSummaries.map((s, i) => `Episode ${episodeNumber - recentSummaries.length + i}: ${s}`).join('\n\n')
    : 'This is the first episode.';

  const res = await ai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a professional children's TV writer for "${show.name}".
Target audience: children aged ${show.target_age || '5-7'}.

CHARACTER BIBLES:
${characterContext}

WRITING RULES:
- Characters learn through doing, never through lectures
- Mistakes are gentle and funny, never cruel
- The moral is SHOWN through action, never stated directly
- Tone: warm, funny, safe — never dark or scary
- Each scene must have: SETTING, EMOTION, CAMERA, MUSIC_MOOD, DIALOGUE, NARRATION`,
      },
      {
        role: 'user',
        content: `Write a full script for Episode ${episodeNumber} of "${show.name}".

MORAL OF THIS EPISODE: ${moral}

CONTINUITY (recent episodes):
${continuity}

Requirements:
- 5-7 scenes
- Each scene: [SCENE N] then SETTING / EMOTION / CAMERA / MUSIC_MOOD / DIALOGUE / NARRATION
- Duration: ~5 minutes when performed
- End with gentle moral moment — shown not told`,
      },
    ],
    max_tokens: 3000,
  });
  return res.choices[0].message.content.trim();
}

export async function generateSummary(script, model = 'gpt-4o') {
  const ai = getOpenAI();
  const res = await ai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You summarize children\'s TV episode scripts in 2-3 sentences. Write for parents reading an episode guide.' },
      { role: 'user', content: `Summarize this episode script in 2-3 sentences:\n\n${script.slice(0, 4000)}` },
    ],
    max_tokens: 200,
  });
  return res.choices[0].message.content.trim();
}

export async function generateStoryboardPlan({ show, characters, moral, script, episodeNumber, model = 'gpt-4o' }) {
  const ai = getOpenAI();
  const characterNames = (characters || []).map((c) => c.name).filter(Boolean);

  const res = await ai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You create production-ready shot plans for a children's cartoon.
Output strict JSON only.
Each shot should be safe, warm, and age-appropriate.
Include concise prompts suitable for image generation.`,
      },
      {
        role: 'user',
        content: `Create a shot-by-shot storyboard for Episode ${episodeNumber} of "${show?.name || 'cartoon show'}".

Moral: ${moral || ''}
Characters in this episode: ${characterNames.join(', ') || 'Not specified'}
Style prompt: ${show?.style_prompt || ''}

Script:
${(script || '').slice(0, 9000)}

Return JSON with this shape:
{
  "shots": [
    {
      "scene": 1,
      "shot_index": 1,
      "duration_sec": 4,
      "camera": "wide",
      "focus_character": "character name from the list when relevant",
      "seed": 12345678,
      "action": "what happens visually",
      "emotion": "dominant emotion",
      "music_mood": "playful",
      "prompt_positive": "single detailed positive image prompt",
      "prompt_negative": "negative prompt"
    }
  ]
}

Constraints:
- 20 to 45 shots total
- Every shot must include prompt_positive and prompt_negative
- Keep duration_sec between 2 and 8
- Use focus_character whenever one character is clearly centered in a shot`,
      },
    ],
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(res.choices[0].message.content);
  const shots = Array.isArray(parsed?.shots) ? parsed.shots : [];

  return shots
    .map((s, idx) => ({
      scene: Number.isFinite(Number(s.scene)) ? Number(s.scene) : 1,
      shot_index: Number.isFinite(Number(s.shot_index)) ? Number(s.shot_index) : idx + 1,
      duration_sec: Number.isFinite(Number(s.duration_sec))
        ? Math.min(8, Math.max(2, Number(s.duration_sec)))
        : 4,
      camera: String(s.camera || 'medium'),
      focus_character: String(s.focus_character || ''),
      seed: Number.isFinite(Number(s.seed)) ? Number(s.seed) : undefined,
      action: String(s.action || ''),
      emotion: String(s.emotion || ''),
      music_mood: String(s.music_mood || ''),
      prompt_positive: String(s.prompt_positive || ''),
      prompt_negative: String(s.prompt_negative || ''),
    }))
    .filter((s) => s.prompt_positive.length > 0);
}

export async function generateComfyUIPrompts(character) {
  const ai = getOpenAI();
  const res = await ai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at writing ComfyUI/Stable Diffusion prompts for consistent cartoon characters. Generate prompts that will produce consistent character appearances across many images.',
      },
      {
        role: 'user',
        content: `Generate ComfyUI prompts for this children's cartoon character:
Name: ${character.name}
Age: ${character.age}
Visual: ${character.visual_description}
Clothing: ${character.clothing_description}
Personality: ${(character.personality_traits || []).join(', ')}

Respond with JSON: { "positive": "...", "negative": "..." }`,
      },
    ],
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });
  return JSON.parse(res.choices[0].message.content);
}

export async function generateShowNameSuggestions(description) {
  const ai = getOpenAI();
  const res = await ai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You suggest fun, memorable names for children\'s cartoon shows.' },
      { role: 'user', content: `Suggest 5 cartoon show names for this concept: "${description}". Return as JSON array of strings.` },
    ],
    max_tokens: 200,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(res.choices[0].message.content);
  return parsed.names || parsed.suggestions || Object.values(parsed)[0] || [];
}

export async function generateCharacterDescription(name, age, traits) {
  const ai = getOpenAI();
  const res = await ai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You create vivid, fun character descriptions for children\'s cartoon shows.' },
      {
        role: 'user',
        content: `Create a character description for:
Name: ${name}, Age: ${age}, Personality traits: ${traits.join(', ')}

Return JSON: { "speech_style": "...", "catchphrases": ["...", "..."], "visual_description": "...", "clothing_description": "..." }`,
      },
    ],
    max_tokens: 400,
    response_format: { type: 'json_object' },
  });
  return JSON.parse(res.choices[0].message.content);
}

export default {
  generateMoral, generateTitle, generateScript, generateSummary, generateStoryboardPlan,
  generateComfyUIPrompts, generateShowNameSuggestions, generateCharacterDescription
};
