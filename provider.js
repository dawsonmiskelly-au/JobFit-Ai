/**
 * LLM Provider Abstraction
 *
 * Wraps Anthropic and OpenAI behind a common interface so the agent
 * pipeline doesn't need to know which provider it's talking to.
 * Both providers receive the same prompts and return plain text.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENAI_MODEL = "gpt-4o";

export function createProvider(providerName, apiKey) {
  if (providerName === "anthropic") {
    return new AnthropicProvider(apiKey);
  }
  if (providerName === "openai") {
    return new OpenAIProvider(apiKey);
  }
  throw new Error(`Unknown provider: ${providerName}. Use "anthropic" or "openai".`);
}

export async function validateProvider(provider) {
  try {
    await provider.complete("hi", "Respond with 'ok'.", 1);
    return { valid: true };
  } catch (err) {
    if (err.status === 401 || err.message?.includes("auth") || err.message?.includes("API key")) {
      return { valid: false, error: "Invalid API key. Please check your key and try again." };
    }
    return { valid: false, error: `Connection failed: ${err.message}` };
  }
}

class AnthropicProvider {
  constructor(apiKey) {
    this.name = "anthropic";
    this.client = new Anthropic({ apiKey });
  }

  async complete(userMessage, systemPrompt, maxTokens = 4096) {
    const response = await this.client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = response.content?.[0];
    if (!block?.text) {
      throw new Error("Anthropic returned an empty or unexpected response");
    }
    return block.text;
  }
}

class OpenAIProvider {
  constructor(apiKey) {
    this.name = "openai";
    this.client = new OpenAI({ apiKey });
  }

  async complete(userMessage, systemPrompt, maxTokens = 4096) {
    const response = await this.client.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    const text = response.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("OpenAI returned an empty or unexpected response");
    }
    return text;
  }
}
