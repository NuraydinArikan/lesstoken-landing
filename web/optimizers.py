"""
AI text optimization providers
Integrates with OpenAI, Claude, Google Gemini, and Ollama
"""

import requests
from packaging import version

# Optimization prompts for different use cases
OPTIMIZATION_PROMPTS = {
    'general': '''You are an expert text optimizer focused on reducing token usage while preserving meaning and quality.

Rules:
1. Remove redundancy and repetition
2. Use concise language and abbreviations where appropriate
3. Eliminate filler words (very, actually, basically, etc.)
4. Combine related sentences
5. Use active voice
6. Keep important information
7. Maintain tone and context

Output ONLY the optimized text, no explanations.''',

    'technical': '''You are an expert at optimizing technical documentation and code comments.

Rules:
1. Keep technical accuracy
2. Simplify explanations without losing precision
3. Use standard abbreviations (e.g., impl, attr, config)
4. Remove verbose descriptions
5. Keep code examples concise
6. Maintain structure and hierarchy

Output ONLY the optimized text, no explanations.''',

    'marketing': '''You are an expert at optimizing marketing and sales copy.

Rules:
1. Keep persuasive impact
2. Maintain emotional connection
3. Remove filler, keep power words
4. Tighten headlines and CTAs
5. Preserve brand voice
6. Keep calls-to-action clear

Output ONLY the optimized text, no explanations.''',

    'academic': '''You are an expert at optimizing academic and research writing.

Rules:
1. Preserve technical accuracy
2. Simplify complex sentences
3. Remove repetition between sections
4. Use standard abbreviations
5. Keep citations clear
6. Maintain formal tone

Output ONLY the optimized text, no explanations.'''
}


def optimize_text_with_provider(text, provider, style, api_key=None, ollama_url=None):
    """
    Optimize text using specified AI provider

    Args:
        text: Input text to optimize
        provider: AI provider (openai, claude, gemini, ollama)
        style: Optimization style (general, technical, marketing, academic)
        api_key: API key for provider (if needed)
        ollama_url: URL for Ollama local server

    Returns:
        dict with 'optimized' text and 'stats' (tokens, reduction%)
    """

    prompt = OPTIMIZATION_PROMPTS.get(style, OPTIMIZATION_PROMPTS['general'])

    if provider == 'openai':
        return optimize_with_openai(text, prompt, api_key)
    elif provider == 'claude':
        return optimize_with_claude(text, prompt, api_key)
    elif provider == 'gemini':
        return optimize_with_gemini(text, prompt, api_key)
    elif provider == 'ollama':
        return optimize_with_ollama(text, prompt, ollama_url)
    else:
        raise ValueError(f'Unknown provider: {provider}')


# ============================================================================
# OpenAI GPT-4
# ============================================================================

def optimize_with_openai(text, prompt, api_key):
    """Optimize text using OpenAI GPT-4 Turbo"""
    if not api_key:
        raise ValueError('OpenAI API key not provided')

    try:
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            },
            json={
                'model': 'gpt-4-turbo-preview',
                'messages': [
                    {'role': 'system', 'content': prompt},
                    {'role': 'user', 'content': text}
                ],
                'temperature': 0.7,
                'max_tokens': 2000
            },
            timeout=30
        )

        if response.status_code != 200:
            raise Exception(f'OpenAI API error: {response.text}')

        data = response.json()
        optimized = data['choices'][0]['message']['content']
        input_tokens = data['usage']['prompt_tokens']
        output_tokens = data['usage']['completion_tokens']

        return {
            'optimized': optimized,
            'stats': {
                'inputTokens': input_tokens,
                'outputTokens': output_tokens,
                'reduction': calculate_reduction(text, optimized)
            }
        }

    except Exception as e:
        raise Exception(f'OpenAI optimization failed: {str(e)}')


# ============================================================================
# Claude (Anthropic)
# ============================================================================

def optimize_with_claude(text, prompt, api_key):
    """Optimize text using Claude Opus"""
    if not api_key:
        raise ValueError('Claude API key not provided')

    try:
        response = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'Content-Type': 'application/json',
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01'
            },
            json={
                'model': 'claude-opus-4',
                'max_tokens': 2000,
                'system': prompt,
                'messages': [
                    {'role': 'user', 'content': text}
                ]
            },
            timeout=30
        )

        if response.status_code != 200:
            raise Exception(f'Claude API error: {response.text}')

        data = response.json()
        optimized = data['content'][0]['text']
        input_tokens = data['usage']['input_tokens']
        output_tokens = data['usage']['output_tokens']

        return {
            'optimized': optimized,
            'stats': {
                'inputTokens': input_tokens,
                'outputTokens': output_tokens,
                'reduction': calculate_reduction(text, optimized)
            }
        }

    except Exception as e:
        raise Exception(f'Claude optimization failed: {str(e)}')


# ============================================================================
# Google Gemini
# ============================================================================

def optimize_with_gemini(text, prompt, api_key):
    """Optimize text using Google Gemini Pro"""
    if not api_key:
        raise ValueError('Gemini API key not provided')

    try:
        response = requests.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}',
            headers={'Content-Type': 'application/json'},
            json={
                'contents': [{
                    'parts': [{
                        'text': f'{prompt}\n\n{text}'
                    }]
                }]
            },
            timeout=30
        )

        if response.status_code != 200:
            raise Exception(f'Gemini API error: {response.text}')

        data = response.json()
        optimized = data['candidates'][0]['content']['parts'][0]['text']

        # Gemini doesn't return token counts, estimate from text
        input_tokens = len(text.split())
        output_tokens = len(optimized.split())

        return {
            'optimized': optimized,
            'stats': {
                'inputTokens': input_tokens,
                'outputTokens': output_tokens,
                'reduction': calculate_reduction(text, optimized)
            }
        }

    except Exception as e:
        raise Exception(f'Gemini optimization failed: {str(e)}')


# ============================================================================
# Ollama (Local)
# ============================================================================

def optimize_with_ollama(text, prompt, ollama_url=None):
    """Optimize text using local Ollama instance"""
    url = ollama_url or 'http://localhost:11434'

    try:
        response = requests.post(
            f'{url}/api/generate',
            headers={'Content-Type': 'application/json'},
            json={
                'model': 'mistral',
                'prompt': f'{prompt}\n\n{text}',
                'stream': False
            },
            timeout=60
        )

        if response.status_code != 200:
            raise Exception(f'Ollama error: {response.text}')

        data = response.json()
        optimized = data['response']

        # Estimate token counts
        input_tokens = len(text.split())
        output_tokens = len(optimized.split())

        return {
            'optimized': optimized,
            'stats': {
                'inputTokens': input_tokens,
                'outputTokens': output_tokens,
                'reduction': calculate_reduction(text, optimized)
            }
        }

    except requests.exceptions.ConnectionError:
        raise Exception('Ollama server not running. Start it with: ollama serve')
    except Exception as e:
        raise Exception(f'Ollama optimization failed: {str(e)}')


# ============================================================================
# Utility Functions
# ============================================================================

def calculate_reduction(original_text, optimized_text):
    """Calculate token reduction percentage"""
    # Simple word-based estimation
    original_words = len(original_text.split())
    optimized_words = len(optimized_text.split())

    if original_words == 0:
        return 0

    reduction = ((original_words - optimized_words) / original_words) * 100
    return max(0, round(reduction, 1))
