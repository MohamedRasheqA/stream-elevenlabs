import { createMem0, addMemories } from '@mem0/vercel-ai-provider';
import { streamText } from 'ai';
import { Pool } from 'pg';
import { OpenAI } from 'openai';

// Initialize OpenAI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:2TYvAzNlt0Oy@ep-noisy-shape-a5hfgfjr.us-east-2.aws.neon.tech/documents?sslmode=require",
});

const mem0 = createMem0({
  provider: 'openai',
  mem0ApiKey: process.env.MEM0_API_KEY,
  apiKey: process.env.OPENAI_API_KEY,
  config: {
    compatibility: 'strict',
  },
});

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type Persona = 'general' | 'roleplay';

// Replace the dynamic system prompt with a default one
const DEFAULT_SYSTEM_PROMPT = `You are a specialized assistant with the following guidelines:

1. Conversational Approach:
   - Maintain a friendly and natural dialog flow
   - Use a warm, approachable tone
   - Show genuine interest in user questions
   - Engage in a way that encourages continued conversation

2. Content Restrictions:
   - Base all responses strictly on the provided context and conversation history
   - Do not use any external knowledge
   - Avoid making assumptions beyond what is explicitly stated
   - Format numerical data and statistics exactly as they appear in the context

3. Response Guidelines:
   - When information is available: Provide accurate answers while maintaining a conversational tone
   - When information is missing: Say "I wish I could help with that, but I don't have enough information in the provided documentation to answer your question. Is there something else you'd like to know about?"
   - For follow-up questions: Verify that previous responses were based on documented content

4. Quality Standards:
   - Ensure accuracy while remaining approachable
   - Balance professionalism with conversational friendliness
   - Maintain consistency in information provided
   - Keep responses clear and engaging`;

// Function to get embedding for a query
async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });
  return response.data[0].embedding;
}

// Function to find similar content from database
async function findSimilarContent(embedding: number[]): Promise<string> {
  // Format the embedding array as a PostgreSQL vector string
  const vectorString = `[${embedding.join(',')}]`;
  
  const query = `
    SELECT contents, 1 - (vector <=> $1::vector) as similarity
    FROM documents_2
    WHERE 1 - (vector <=> $1::vector) > 0.7
    ORDER BY similarity DESC
    LIMIT 5;
  `;
  
  const result = await pool.query(query, [vectorString]);
  return result.rows.map(row => row.contents).join('\n\n');
}

// Function to check if message is a greeting
function isGreeting(query: string): boolean {
  const greetingPatterns = [
    /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)(\s|$)/i,
    /^(how are you|what's up|wassup|sup)(\?|\s|$)/i,
    /^(hola|bonjour|hallo|ciao)(\s|$)/i
  ];
  
  return greetingPatterns.some(pattern => pattern.test(query.trim().toLowerCase()));
}

// Function to get greeting response
function getGreetingResponse(): string {
  const greetings = [
    "👋 Hello! How can I assist you today?",
    "Hi there! 😊 What can I help you with?",
    "👋 Hey! Ready to help you with any questions!",
    "Hello! 🌟 How may I be of assistance?",
    "Hi! 😃 Looking forward to helping you today!"
  ];
  
  return greetings[Math.floor(Math.random() * greetings.length)];
}

export const maxDuration = 30;

function isValidPersona(persona: any): persona is Persona {
  return ['general', 'roleplay'].includes(persona);
}

export async function POST(req: Request) {
  const totalStartTime = performance.now();
  try {
    console.log('🚀 Starting request processing...');
    const { messages, userId, persona: rawPersona = 'general', systemPrompt } = await req.json();
    const persona = isValidPersona(rawPersona) ? rawPersona : 'general';
    const userQuery = messages[messages.length - 1].content;
    const previousMessages = messages.slice(0, -1);

    // Check if the query is a greeting
    if (isGreeting(userQuery)) {
      console.log('👋 Greeting detected, sending default response');
      const greetingResponse = getGreetingResponse();
      
      // Create a stream response for greeting
      const result = await streamText({
        model: mem0('gpt-4o-mini', {
          user_id: userId,
        }),
        messages: [
          {
            role: 'system',
            content: systemPrompt || DEFAULT_SYSTEM_PROMPT,
          },
          ...previousMessages,
          {
            role: 'user',
            content: userQuery
          },
          {
            role: 'assistant',
            content: greetingResponse
          }
        ],
      });

      // Add greeting to memories
      const greetingMessages = [
        { role: 'user', content: userQuery },
        { role: 'assistant', content: greetingResponse }
      ];
      await addMemories([...previousMessages, ...greetingMessages], {
        user_id: userId,
        mem0ApiKey: process.env.MEM0_API_KEY,
      });

      console.log('👋 Greeting response sent');
      return result.toDataStreamResponse();
    }

    // If not a greeting, proceed with normal processing
    console.log('💬 Processing regular query...');
    console.log(`🎭 Using ${persona} persona`);

    // Generate embedding directly from the original query
    const embedding = await getQueryEmbedding(userQuery);

    // Find similar content from the database
    const similarContent = await findSimilarContent(embedding);

    // Start response generation
    const responseStartTime = performance.now();
    console.log('💭 Starting response generation...');

    // Replace the dynamic system prompt with the default one
    const finalSystemPrompt = systemPrompt ? systemPrompt : DEFAULT_SYSTEM_PROMPT;

    const systemPromptContent = `${finalSystemPrompt}

Documentation Context: ${similarContent}`;

    const updatedMessages = [
      { role: 'system' as const, content: systemPromptContent },
      ...previousMessages.map((msg: Message) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: userQuery }
    ];

    // Log the start of streaming
    console.log('📡 Initiating response stream...');
    
    // Stream the response using ai-sdk
    const result = await streamText({
      model: mem0('gpt-4o-mini', {
        user_id: userId,
      }),
      messages: updatedMessages,
    });

    const responseEndTime = performance.now();
    const streamInitTime = (responseEndTime - responseStartTime).toFixed(2);
    const totalTime = (responseEndTime - totalStartTime).toFixed(2);
    
    console.log(`⏱️ Stream initialization time: ${streamInitTime}ms`);
    console.log(`⌛ Total processing time: ${totalTime}ms`);

    // Add memories after streaming starts
    const finalMessages = [...updatedMessages];
    await addMemories(finalMessages, {
      user_id: userId,
      mem0ApiKey: process.env.MEM0_API_KEY,
    });

    console.log('✅ Request processing complete!');
    return result.toDataStreamResponse();
  } catch (error) {
    const errorTime = performance.now();
    const totalErrorTime = (errorTime - totalStartTime).toFixed(2);
    console.error(`❌ Error in chat route (after ${totalErrorTime}ms):`, error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}