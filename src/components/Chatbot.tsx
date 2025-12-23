import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { geminiService, ChatMessage } from '@/services/geminiService';
import { toast } from 'sonner';

export const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with a welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = getWelcomeMessage();
      setMessages([
        {
          role: 'assistant',
          content: welcomeMessage,
        },
      ]);
    }
  }, [isOpen]);

  const getWelcomeMessage = () => {
    const welcomeMessages: Record<string, string> = {
      en: "Hello! I'm your SymBIoT Care Assistant. How can I help you today?",
      es: "¡Hola! Soy tu SymBIoT Care Assistant. ¿Cómo puedo ayudarte hoy?",
      fr: "Bonjour! Je suis votre SymBIoT Care Assistant. Comment puis-je vous aider aujourd'hui?",
      'fr-CA': "Bonjour! Je suis votre SymBIoT Care Assistant. Comment puis-je vous aider aujourd'hui?",
      de: "Hallo! Ich bin Ihr SymBIoT Care Assistant. Wie kann ich Ihnen heute helfen?",
      hi: "नमस्ते! मैं आपका SymBIoT Care Assistant हूं। आज मैं आपकी कैसे मदद कर सकता हूं?",
    };
    return welcomeMessages[i18n.language] || welcomeMessages.en;
  };

  const getPlaceholder = () => {
    const placeholders: Record<string, string> = {
      en: "Type your message...",
      es: "Escribe tu mensaje...",
      fr: "Tapez votre message...",
      'fr-CA': "Tapez votre message...",
      de: "Geben Sie Ihre Nachricht ein...",
      hi: "अपना संदेश टाइप करें...",
    };
    return placeholders[i18n.language] || placeholders.en;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check if API key is configured
    if (!geminiService.isConfigured()) {
      toast.error('Chatbot is not configured. Please add your Gemini API key to continue.');
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
    };

    // Add user message to chat
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get response from Gemini
      const response = await geminiService.sendMessage(updatedMessages, i18n.language);

      // Add assistant response to chat
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: response,
        },
      ]);
    } catch (error) {
      console.error('Error getting chatbot response:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';

      // Add error message to chat
      const errorMessages: Record<string, string> = {
        en: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        es: `Lo siento, encontré un error: ${errorMessage}. Por favor, inténtalo de nuevo.`,
        fr: `Désolé, j'ai rencontré une erreur: ${errorMessage}. Veuillez réessayer.`,
        'fr-CA': `Désolé, j'ai rencontré une erreur: ${errorMessage}. Veuillez réessayer.`,
        de: `Entschuldigung, es ist ein Fehler aufgetreten: ${errorMessage}. Bitte versuchen Sie es erneut.`,
        hi: `क्षमा करें, मुझे एक त्रुटि का सामना करना पड़ा: ${errorMessage}। कृपया पुनः प्रयास करें।`,
      };

      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: errorMessages[i18n.language] || errorMessages.en,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">SymBIoT Care Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={getPlaceholder()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};
