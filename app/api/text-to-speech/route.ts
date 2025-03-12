// 1. First, install the required dependencies:
// npm install elevenlabs stream

// 2. Create an API route file at app/api/text-to-speech/route.js:

import { ElevenLabsClient } from 'elevenlabs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text, voiceId = 'JBFqnCBsd6RMkjVDRZzb' } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY, // Add your API key in .env.local
    });

    const audioStream = await client.textToSpeech.convertAsStream(voiceId, {
      text,
      model_id: 'eleven_multilingual_v2',
    });

    // Convert stream to array buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    
    const audioBuffer = Buffer.concat(chunks);
    
    // Return audio as response
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error during audio conversion:', error);
    return NextResponse.json(
      { error: 'Failed to convert text to speech' },
      { status: 500 }
    );
  }
}