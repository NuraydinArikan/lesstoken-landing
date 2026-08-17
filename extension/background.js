// Background Service Worker
console.log('[Less Token] Background service worker started');

// Listen for optimize requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'optimize') {
    optimizeText(request.text, request.provider)
      .then(result => {
        sendResponse({
          success: true,
          result: result.optimized,
          stats: result.stats
        });
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });

    // Indicate we'll respond asynchronously
    return true;
  }
});

// Optimization prompts for different use cases
const OPTIMIZATION_PROMPTS = {
  general: `You are an expert text optimizer focused on reducing token usage while preserving meaning and quality.

Rules:
1. Remove redundancy and repetition
2. Use concise language and abbreviations where appropriate
3. Eliminate filler words (very, actually, basically, etc.)
4. Combine related sentences
5. Use active voice
6. Keep important information
7. Maintain tone and context

Output ONLY the optimized text, no explanations.`,

  technical: `You are an expert at optimizing technical documentation and code comments.

Rules:
1. Keep technical accuracy
2. Simplify explanations without losing precision
3. Use standard abbreviations (e.g., impl, attr, config)
4. Remove verbose descriptions
5. Keep code examples concise
6. Maintain structure and hierarchy

Output ONLY the optimized text, no explanations.`,

  marketing: `You are an expert at optimizing marketing and sales copy.

Rules:
1. Keep persuasive impact
2. Maintain emotional connection
3. Remove filler, keep power words
4. Tighten headlines and CTAs
5. Preserve brand voice
6. Keep calls-to-action clear

Output ONLY the optimized text, no explanations.`,

  academic: `You are an expert at optimizing academic and research writing.

Rules:
1. Preserve technical accuracy
2. Simplify complex sentences
3. Remove repetition between sections
4. Use standard abbreviations
5. Keep citations clear
6. Maintain formal tone

Output ONLY the optimized text, no explanations.`
};

// Main optimization logic
async function optimizeText(text, provider) {
  // Ollama was dropped in 1.0.1. A user who selected it before the update
  // still has it in storage, and would otherwise fail the API-key check below
  // (there is no ollama-key) with a misleading "API key not configured".
  if (provider === 'ollama') provider = 'openai';

  // Get API key from storage
  const settings = await chrome.storage.local.get([
    `${provider}-key`,
    'optimization-style',
    'history'
  ]);

  const apiKey = settings[`${provider}-key`];
  const style = settings['optimization-style'] || 'general';

  if (!apiKey) {
    throw new Error('API key not configured. Please go to settings.');
  }

  let optimized;
  let inputTokens;
  let outputTokens;

  const prompt = OPTIMIZATION_PROMPTS[style] || OPTIMIZATION_PROMPTS.general;

  switch (provider) {
    case 'openai':
      ({ optimized, inputTokens, outputTokens } = await optimizeWithOpenAI(text, prompt, apiKey));
      break;
    case 'claude':
      ({ optimized, inputTokens, outputTokens } = await optimizeWithClaude(text, prompt, apiKey));
      break;
    case 'gemini':
      ({ optimized, inputTokens, outputTokens } = await optimizeWithGemini(text, prompt, apiKey));
      break;
    case 'grok':
      ({ optimized, inputTokens, outputTokens } = await optimizeWithGrok(text, prompt, apiKey));
      break;
    case 'deepseek':
      ({ optimized, inputTokens, outputTokens } = await optimizeWithDeepSeek(text, prompt, apiKey));
      break;
    default:
      throw new Error('Unknown provider');
  }

  // Calculate reduction
  const inputLength = text.split(/\s+/).length;
  const outputLength = optimized.split(/\s+/).length;
  const reduction = Math.round(((inputLength - outputLength) / inputLength) * 100);

  // Save to history
  const history = settings.history || [];
  history.push({
    timestamp: Date.now(),
    input: text,
    output: optimized,
    provider: provider,
    style: style,
    reduction: reduction,
    inputTokens: inputTokens,
    outputTokens: outputTokens
  });

  // Keep only last 50 items
  if (history.length > 50) {
    history.shift();
  }

  await chrome.storage.local.set({ history });

  return {
    optimized,
    stats: {
      inputTokens,
      outputTokens,
      reduction: Math.max(0, reduction)
    }
  };
}

// Turns a failed response into a diagnosable message. response.statusText
// alone is not enough: Chrome's fetch() reports it as '' for any HTTP/2
// connection (HTTP/2 has no reason-phrase field, only a numeric :status),
// and these APIs are commonly served over HTTP/2 -- confirmed live when a
// real DeepSeek 401 surfaced as "DeepSeek API error: " with nothing after
// the colon. Provider error bodies aren't uniform either: OpenAI/Claude/
// Gemini/DeepSeek nest the text at error.message, but Grok returns error as
// a plain string -- so both shapes are checked before falling back to
// statusText or the bare status code.
async function extractErrorMessage(response) {
  let bodyMessage = '';
  try {
    const data = await response.json();
    const err = data?.error;
    if (typeof err === 'string') bodyMessage = err;
    else if (typeof err?.message === 'string') bodyMessage = err.message;
    else if (typeof data?.message === 'string') bodyMessage = data.message;
  } catch {
    // Body wasn't JSON -- fall through to status/statusText below.
  }
  return `${response.status} ${bodyMessage || response.statusText || '(no further detail)'}`;
}

// OpenAI API integration
async function optimizeWithOpenAI(text, prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [{
        role: 'system',
        content: prompt
      }, {
        role: 'user',
        content: text
      }],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await extractErrorMessage(response)}`);
  }

  const data = await response.json();
  return {
    optimized: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens,
    outputTokens: data.usage.completion_tokens
  };
}

// Claude API integration
async function optimizeWithClaude(text, prompt, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-5',
      max_tokens: 2000,
      system: prompt,
      messages: [{
        role: 'user',
        content: text
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${await extractErrorMessage(response)}`);
  }

  const data = await response.json();

  // The model may emit a thinking block before the answer, so pick the text
  // block rather than assuming it is first.
  const textBlock = (data.content || []).find(b => b.type === 'text');
  if (!textBlock) {
    throw new Error('Claude returned no text block');
  }

  return {
    optimized: textBlock.text,
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens
  };
}

// Google Gemini API integration
async function optimizeWithGemini(text, prompt, apiKey) {
  const response = await fetch(
    // Floating "latest" alias: pinned versions get retired.
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${prompt}\n\n${text}`
          }]
        }]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${await extractErrorMessage(response)}`);
  }

  const data = await response.json();

  const parts = data.candidates?.[0]?.content?.parts || [];
  const part = parts.find(p => typeof p.text === 'string');
  if (!part) {
    throw new Error('Gemini returned no text part');
  }

  // Real counts are reported, so prefer them over word-count estimates.
  const usage = data.usageMetadata || {};
  return {
    optimized: part.text,
    inputTokens: usage.promptTokenCount ?? text.split(/\s+/).length,
    outputTokens: usage.candidatesTokenCount ?? part.text.split(/\s+/).length
  };
}

// Grok (x.ai) API integration -- OpenAI-compatible chat completions format.
async function optimizeWithGrok(text, prompt, apiKey) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      // No floating "latest" alias offered, so pinned like OpenAI/Claude above.
      model: 'grok-4.6',
      messages: [{
        role: 'system',
        content: prompt
      }, {
        role: 'user',
        content: text
      }],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${await extractErrorMessage(response)}`);
  }

  const data = await response.json();
  return {
    optimized: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens,
    outputTokens: data.usage.completion_tokens
  };
}

// DeepSeek API integration -- OpenAI-compatible chat completions format.
async function optimizeWithDeepSeek(text, prompt, apiKey) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      // Floating alias: DeepSeek repoints this at their current model.
      model: 'deepseek-chat',
      messages: [{
        role: 'system',
        content: prompt
      }, {
        role: 'user',
        content: text
      }],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${await extractErrorMessage(response)}`);
  }

  const data = await response.json();
  return {
    optimized: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens,
    outputTokens: data.usage.completion_tokens
  };
}
