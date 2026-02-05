import { applicationContext, chatbotInstructions } from '@/data/chatbot-context';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * NVIDIA AI Service for chatbot functionality
 * Uses NVIDIA's Llama 4 Maverick model via Supabase Edge Function
 */
class NvidiaService {
  private edgeFunctionUrl: string;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/nvidia-chat`;
  }

  /**
   * Send a chat message to NVIDIA API and get a response
   */
  async sendMessage(messages: ChatMessage[], userLanguage: string = 'en'): Promise<string> {
    try {
      // Get the Supabase anon key for the request
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

      // Build the system message with context and instructions
      const systemMessage = `${chatbotInstructions}

Application Context:
${applicationContext}

User's Language Preference: ${this.getLanguageName(userLanguage)}

Instructions:
- Respond to the user's questions in their preferred language (${this.getLanguageName(userLanguage)})
- Use the application context provided above
- Stay on topic about the SymbiotCare Peace application
- If the question is off-topic, politely redirect to app-related topics
- Be concise, helpful, and friendly`;

      // Format messages for NVIDIA API (OpenAI-compatible format)
      const apiMessages = [
        {
          role: 'system',
          content: systemMessage
        },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Call the Supabase Edge Function
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          userLanguage: userLanguage
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`AI service error: ${response.status} - ${errorData.error || JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      if (!data.success || !data.response) {
        throw new Error('No response received from AI service');
      }

      return data.response;
    } catch (error) {
      console.error('Error calling NVIDIA AI service:', error);
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
   * Check if service is configured (always true for Edge Function)
   */
  isConfigured(): boolean {
    return true;
  }
}

export const nvidiaService = new NvidiaService();
