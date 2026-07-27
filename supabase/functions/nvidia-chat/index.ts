import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  userLanguage?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get NVIDIA API key from environment
    const nvidiaApiKey = Deno.env.get('NVIDIA_API_KEY');
    if (!nvidiaApiKey) {
      throw new Error('NVIDIA API key not configured');
    }

    // Parse request body
    const { messages, userLanguage = 'en' }: RequestBody = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid messages format');
    }

    // Log API key info (first 15 chars only for security)
    console.log('API Key configured:', nvidiaApiKey ? 'YES' : 'NO');
    console.log('API Key prefix:', nvidiaApiKey.substring(0, 15) + '...');
    console.log('Messages count:', messages.length);

    // Call NVIDIA API
    const nvidiaResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaApiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-4-maverick-17b-128e-instruct',
        messages: messages,
        max_tokens: 512,
        temperature: 1.0,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stream: false,
      }),
    });

    console.log('NVIDIA API Response Status:', nvidiaResponse.status);
    console.log('NVIDIA API Response Headers:', JSON.stringify(Object.fromEntries(nvidiaResponse.headers.entries())));

    if (!nvidiaResponse.ok) {
      const errorData = await nvidiaResponse.text();
      console.error('NVIDIA API error response:', errorData);
      console.error('NVIDIA API status:', nvidiaResponse.status);
      throw new Error(`NVIDIA API error: ${nvidiaResponse.status} - ${errorData}`);
    }

    const data = await nvidiaResponse.json();

    // Extract the response text
    const responseText = data.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error('No response received from NVIDIA API');
    }

    return new Response(
      JSON.stringify({
        response: responseText.trim(),
        success: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in nvidia-chat function:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
