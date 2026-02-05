import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const nvidiaApiKey = Deno.env.get('NVIDIA_API_KEY');

    if (!nvidiaApiKey) {
      return new Response(
        JSON.stringify({
          error: 'NVIDIA_API_KEY environment variable is not set',
          success: false,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('NVIDIA API Key exists:', nvidiaApiKey ? 'YES' : 'NO');
    console.log('API Key starts with:', nvidiaApiKey.substring(0, 10) + '...');

    // Test call to NVIDIA API
    const testResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nvidiaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-4-maverick-17b-128e-instruct',
        messages: [
          {
            role: 'user',
            content: 'Say "test successful" if you can read this.'
          }
        ],
        max_tokens: 50,
        temperature: 1.0,
        top_p: 1.0,
      }),
    });

    console.log('NVIDIA API Response Status:', testResponse.status);

    const responseText = await testResponse.text();
    console.log('NVIDIA API Response Body:', responseText);

    if (!testResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'NVIDIA API returned an error',
          status: testResponse.status,
          details: responseText,
          apiKeyPrefix: nvidiaApiKey.substring(0, 15) + '...',
          success: false,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const data = JSON.parse(responseText);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'NVIDIA API is working correctly!',
        response: data.choices?.[0]?.message?.content,
        fullResponse: data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Test error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
