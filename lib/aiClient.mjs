// Browser-side AI client. The visitor's key goes straight from the browser
// to the provider; it never touches our servers.

export const OPERATIONS = [
  { key: 'clean', tr: 'Düzelt / temizle', en: 'Fix / clean up', instruction: 'Clean up spelling, grammar, and clarity.' },
  { key: 'shorten', tr: 'Daha kısa yap', en: 'Make it shorter', instruction: 'Make the text shorter without losing the point.' },
  { key: 'formal', tr: 'Daha resmi yap', en: 'Make it formal', instruction: 'Rewrite the text in a professional formal tone.' },
  { key: 'summarize', tr: 'Özetle', en: 'Summarize', instruction: 'Summarize the text clearly in Turkish.' },
  { key: 'bullets', tr: 'Madde madde yap', en: 'Bullet points', instruction: 'Turn the text into concise bullet points in Turkish.' },
  { key: 'translate_en', tr: 'İngilizceye çevir', en: 'Translate to English', instruction: 'Translate the text into natural English.' },
  { key: 'email', tr: 'E-posta haline getir', en: 'Turn into an email', instruction: 'Turn the text into a polished email draft.' },
];

export const DEFAULT_MODELS = {
  openai: 'gpt-5.6-luna',
  claude: 'claude-haiku-4-5-20251001',
  gemini: 'gemini-3.5-flash-lite',
};

export function buildPrompt(operationKey, text) {
  const op = OPERATIONS.find((o) => o.key === operationKey) || OPERATIONS[0];
  return (
    `${op.instruction}\n` +
    "Return only the final text. Keep the user's language unless translation is requested.\n\n" +
    `Text:\n${text}`
  );
}

export function extractText(provider, data) {
  if (provider === 'openai') return data.choices?.[0]?.message?.content ?? '';
  if (provider === 'claude') return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('') ?? '';
  if (provider === 'gemini') return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  return '';
}

function requestFor(provider, apiKey, prompt) {
  const model = DEFAULT_MODELS[provider];
  if (provider === 'openai') {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
      },
    };
  }
  if (provider === 'claude') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
      },
    };
  }
  // gemini
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  };
}

export async function runOperation({ provider, apiKey, operationKey, text }) {
  const prompt = buildPrompt(operationKey, text);
  const { url, options } = requestFor(provider, apiKey, prompt);

  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    const e = new Error('network');
    e.code = 'network';
    throw e;
  }

  if (response.status === 401 || response.status === 403) {
    const e = new Error('auth');
    e.code = 'auth';
    throw e;
  }
  if (response.status === 429) {
    const e = new Error('rate');
    e.code = 'rate';
    throw e;
  }
  if (!response.ok) {
    const e = new Error(`provider ${response.status}`);
    e.code = 'provider';
    throw e;
  }

  const data = await response.json();
  const result = extractText(provider, data).trim();
  if (!result) {
    const e = new Error('empty result');
    e.code = 'provider';
    throw e;
  }
  return result;
}
