import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const REGION = process.env.AWS_REGION || 'ap-south-1';

// AWS Service Clients
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const pollyClient = new PollyClient({ region: REGION });
const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'StoryWeaverSessions';

// Main Orchestrator Endpoint
app.post('/api/story', async (req, res) => {
  try {
    const {
      sessionId,
      userPrompt,
      genre = 'Fantasy',
      language = 'en-US',
      voiceGender = 'Female',
      voiceTone = 'natural'
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // 1. Fetch Session Memory from DynamoDB
    let history = [];
    const getRes = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { sessionId }
    }));

    if (getRes.Item && getRes.Item.history) {
      history = getRes.Item.history;
    }

    // 2. Prepare Context & Invoke Bedrock (Converse API)
    const systemPrompt = `You are a master interactive storyteller guiding an adventure in the ${genre} genre. 
Deliver a compelling narrative continuation in 2 to 3 vivid paragraphs. 
Always conclude with an intriguing cliffhanger decision for the adventurer.`;

    const converseMessages = [
      ...history.map(item => ({
        role: item.role,
        content: [{ text: item.content?.[0]?.text || item.content }]
      })),
      { role: 'user', content: [{ text: userPrompt || 'Begin the adventure!' }] }
    ];

    const converseCmd = new ConverseCommand({
      modelId: 'amazon.nova-micro-v1:0',
      messages: converseMessages,
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 500,
        temperature: 0.7
      }
    });

    const bedrockRes = await bedrockClient.send(converseCmd);
    const storyText = bedrockRes.output.message.content[0].text;

    // 3. Configure Dynamic Voice & Neural-safe SSML (Rate adjustments only)
    const selectedVoiceId = voiceGender === 'Male' ? 'Matthew' : 'Ruth';

    const sanitizedText = storyText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    let ssmlRate = '100%';
    if (voiceTone === 'scary') {
      ssmlRate = '75%'; // Slow, ominous pace
    } else if (voiceTone === 'children') {
      ssmlRate = '115%'; // Lively, energetic pace
    }

    const ssmlText = `<speak><prosody rate="${ssmlRate}">${sanitizedText}</prosody></speak>`;

    const pollyCmd = new SynthesizeSpeechCommand({
      OutputFormat: 'mp3',
      Text: ssmlText,
      TextType: 'ssml',
      VoiceId: selectedVoiceId,
      Engine: 'neural'
    });

    const pollyRes = await pollyClient.send(pollyCmd);
    const audioByteArray = await pollyRes.AudioStream.transformToByteArray();
    const audioBase64 = Buffer.from(audioByteArray).toString('base64');

    // 4. Persist Updated Story History to DynamoDB
    const updatedHistory = [
      ...converseMessages,
      { role: 'assistant', content: [{ text: storyText }] }
    ];

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        sessionId,
        genre,
        language,
        voiceGender,
        voiceTone,
        history: updatedHistory,
        updatedAt: new Date().toISOString()
      }
    }));

    return res.json({
      success: true,
      storyText,
      audioBase64
    });

  } catch (error) {
    console.error('Story Engine Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`StoryWeaver Backend running on port ${PORT}`);
});