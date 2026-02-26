export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class OllamaClient {
    private baseURL: string;
    private model: string;

    constructor(baseURL: string = 'http://localhost:11434/v1', model: string = 'llama3:latest') {
        this.baseURL = baseURL;
        this.model = model;
    }

    /**
     * Non-streaming chat completion for simple tasks like keyword extraction
     */
    async chat(messages: OllamaMessage[]): Promise<string> {
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    stream: false,
                    temperature: 0.1 // Low temp for deterministic tasks
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Ollama API Error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('Ollama Chat Error:', error);
            throw error;
        }
    }

    /**
     * Streaming chat completion for the main assistant response
     */
    async *streamChat(messages: OllamaMessage[], systemPrompt?: string): AsyncGenerator<string, void, unknown> {
        const fullMessages = systemPrompt
            ? [{ role: 'system', content: systemPrompt } as OllamaMessage, ...messages]
            : messages;

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: fullMessages,
                    stream: true,
                    temperature: 0.7,
                    presence_penalty: 0.6 // Reduce repetition
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Ollama Stream Error: ${response.status} - ${error}`);
            }

            if (!response.body) throw new Error('Response body is null');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') continue;

                    if (trimmed.startsWith('data: ')) {
                        try {
                            const json = JSON.parse(trimmed.slice(6));
                            const content = json.choices[0]?.delta?.content;
                            if (content) yield content;
                        } catch (e) {
                            // ignore parse errors for partial chunks
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Ollama Stream Error:', error);
            throw error;
        }
    }
}

export const ollamaClient = new OllamaClient();
