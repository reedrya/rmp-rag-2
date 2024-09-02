import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Import the reviews data
import reviewsData from '../../../reviews.json';

const systemPrompt = `
You are a helpful and knowledgeable assistant for students using a "Rate My Professor" platform. Your primary task is to assist students in finding information about professors based on their queries. Use the following review information to answer queries about professors:

${JSON.stringify(reviewsData.reviews, null, 2)}

Additionally, you should:

1. Be Conversational: Engage in natural, friendly conversation. Respond appropriately to social cues and casual remarks.

2. Stay on Topic: Only provide information about professors when explicitly asked. Don't offer unsolicited information about professors.

3. Understand Context: Pay attention to the flow of conversation. If a user thanks you or indicates they're done, respond appropriately without adding new information.

4. Be Concise: Provide brief, to-the-point answers unless asked for more details.

5. Ask for Clarification: If a query is ambiguous, ask for more details to ensure you understand the user's intent.

6. Be Honest: If you can't find information related to a query, politely inform the user.

Remember, your primary goal is to be helpful and maintain a natural conversation, providing information about professors only when directly asked.
`;

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  const data = await req.json();
  const userQuery = data[data.length - 1].content;

  // Initialize the Pinecone client
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  // Get the index
  const index = pc.Index('rag');

  // Create embeddings using Gemini API
  const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
  const result = await embeddingModel.embedContent(userQuery);

  const embedding = result?.embedding?.values;

  if (!Array.isArray(embedding) || embedding.length !== 768) {
    throw new Error(`Invalid embedding: Expected a vector of length 768 but got ${embedding ? embedding.length : "undefined"}`);
  }

  // Query Pinecone
  const queryResponse = await index.query({
    vector: embedding,
    topK: 5,
    includeMetadata: true,
  });

  let relevantInfo = '';
  queryResponse.matches.forEach((match) => {
    relevantInfo += `
    Professor: ${match.id}
    Review: ${match.metadata.review}
    Subject: ${match.metadata.subject}
    Stars: ${match.metadata.stars}
    \n\n`;
  });

  // Generate response using Gemini API
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I'm ready to assist students with their queries about professors using the Rate My Professor platform. How can I help you today?" }],
      },
    ],
  });

  const fullContext = `
  User Query: ${userQuery}

  Relevant information from Pinecone:
  ${relevantInfo}

  Please answer the query using both the information from the reviews.json data provided in the system prompt and the relevant Pinecone results above. If the information isn't found in either source, please state that clearly.
  `;

  const chatResult = await chat.sendMessage(fullContext);
  const response = await chatResult.response;

  return new NextResponse(response.text(), {
    headers: { 'Content-Type': 'text/plain' },
  });
}