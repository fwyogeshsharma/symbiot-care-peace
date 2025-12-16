import { applicationContext, chatbotInstructions } from '@/data/chatbot-context';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Gemini AI Service for chatbot functionality
 */
class GeminiService {
  private apiKey: string;
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!this.apiKey || this.apiKey === 'your-gemini-api-key-here') {
      console.warn('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file');
    }
  }

  /**
   * Send a chat message to Gemini API and get a response
   */
  async sendMessage(messages: ChatMessage[], userLanguage: string = 'en'): Promise<string> {
    if (!this.apiKey || this.apiKey === 'your-gemini-api-key-here') {
      throw new Error('Gemini API key is not configured. Please add your API key to the .env file.');
    }

    try {
      // Build conversation history
      const conversationHistory = messages.map(msg => {
        return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
      }).join('\n\n');

      // Get the last user message
      const lastUserMessage = messages[messages.length - 1]?.content || '';

      // Create the prompt with context
      const prompt = `${chatbotInstructions}

Application Context:
${applicationContext}

User's Language Preference: ${this.getLanguageName(userLanguage)}

Conversation History:
${conversationHistory}

Instructions:
- Respond to the user's latest question in their preferred language (${this.getLanguageName(userLanguage)})
- Use the application context provided above
- Stay on topic about the SymbiotCare Peace application
- If the question is off-topic, politely redirect

User's Latest Question: ${lastUserMessage}

Your Response:`;

      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      // Extract the response text
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error('No response received from Gemini API');
      }

      return responseText.trim();
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get response from AI chatbot');
    }
  }

  /**
   * Get language name from code
   */
  private getLanguageName(code: string): string {
    const languageMap: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      'fr-CA': 'French Canadian',
      de: 'German',
      hi: 'Hindi',
    };
    return languageMap[code] || 'English';
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey !== 'your-gemini-api-key-here');
  }
}

export const geminiService = new GeminiService();
