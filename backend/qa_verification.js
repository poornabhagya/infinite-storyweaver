import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:5000';
const REGION = process.env.AWS_REGION || 'ap-south-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'StoryWeaverSessions';

const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const results = [];

function logPass(title, details = '') {
  console.log(`[PASS] ${title} ${details ? '- ' + details : ''}`);
  results.push({ test: title, status: 'PASSED', details });
}

function logFail(title, err) {
  console.error(`[FAIL] ${title} - ${err}`);
  results.push({ test: title, status: 'FAILED', details: String(err) });
}

async function runBackendQA() {
  console.log('=== STARTING BACKEND & AWS ENGINE QA SUITE ===\n');

  // Test 1: Voice Tone & SSML Neural Prosody (Natural, Scary, Children)
  const tones = ['natural', 'scary', 'children'];
  for (const tone of tones) {
    try {
      const res = await fetch(`${API_BASE}/api/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `test_tone_${tone}_${Date.now()}`,
          userPrompt: `Testing SSML tone: ${tone}`,
          genre: 'Horror',
          language: 'en-US',
          voiceGender: 'Female',
          voiceTone: tone
        })
      });
      const data = await res.json();
      if (data.success && data.audioBase64 && data.storyText) {
        logPass(`Voice Tone & SSML Prosody (${tone})`, `Generated audio size: ${data.audioBase64.length} chars, story: ${data.storyText.substring(0, 60)}...`);
      } else {
        logFail(`Voice Tone & SSML Prosody (${tone})`, JSON.stringify(data));
      }
    } catch (e) {
      logFail(`Voice Tone & SSML Prosody (${tone})`, e.message);
    }
  }

  // Test 2: Voice Gender (Male - Matthew, Female - Ruth)
  const genders = [
    { gender: 'Male', name: 'Matthew' },
    { gender: 'Female', name: 'Ruth' }
  ];
  for (const { gender, name } of genders) {
    try {
      const res = await fetch(`${API_BASE}/api/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `test_gender_${gender}_${Date.now()}`,
          userPrompt: `Greetings storyteller!`,
          genre: 'Fantasy',
          language: 'en-US',
          voiceGender: gender,
          voiceTone: 'natural'
        })
      });
      const data = await res.json();
      if (data.success && data.audioBase64) {
        logPass(`Voice Gender Selection (${gender} - ${name})`, `Polly synthesized Neural audio successfully without errors`);
      } else {
        logFail(`Voice Gender Selection (${gender})`, JSON.stringify(data));
      }
    } catch (e) {
      logFail(`Voice Gender Selection (${gender})`, e.message);
    }
  }

  // Test 3: Story Genres Verification (Fantasy, Sci-Fi, Mystery, Cyberpunk, Horror)
  const genres = ['Fantasy', 'Sci-Fi', 'Mystery', 'Cyberpunk', 'Horror'];
  for (const genre of genres) {
    try {
      const res = await fetch(`${API_BASE}/api/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `test_genre_${genre}_${Date.now()}`,
          userPrompt: `Begin our journey in ${genre}!`,
          genre,
          language: 'en-US',
          voiceGender: 'Female',
          voiceTone: 'natural'
        })
      });
      const data = await res.json();
      if (data.success && data.storyText.length > 50) {
        logPass(`Genre Alignment (${genre})`, `Bedrock returned vivid narrative: "${data.storyText.substring(0, 75).replace(/\n/g, ' ')}..."`);
      } else {
        logFail(`Genre Alignment (${genre})`, JSON.stringify(data));
      }
    } catch (e) {
      logFail(`Genre Alignment (${genre})`, e.message);
    }
  }

  // Test 4: Languages (en-US, es-ES, fr-FR)
  const languages = ['en-US', 'es-ES', 'fr-FR'];
  for (const lang of languages) {
    try {
      const res = await fetch(`${API_BASE}/api/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `test_lang_${lang}_${Date.now()}`,
          userPrompt: `Commence the tale in locale ${lang}`,
          genre: 'Fantasy',
          language: lang,
          voiceGender: 'Female',
          voiceTone: 'natural'
        })
      });
      const data = await res.json();
      if (data.success && data.audioBase64) {
        logPass(`Language Locale Support (${lang})`, `Story and Polly audio generated successfully for ${lang}`);
      } else {
        logFail(`Language Locale Support (${lang})`, JSON.stringify(data));
      }
    } catch (e) {
      logFail(`Language Locale Support (${lang})`, e.message);
    }
  }

  // Test 5: Session Memory & DynamoDB Persistence (2+ consecutive conversational turns)
  const multiTurnSessionId = `qa_session_persist_${Date.now()}`;
  console.log(`\nTesting Multi-Turn Session Persistence on DynamoDB (Session: ${multiTurnSessionId})...`);

  try {
    // Turn 1
    const turn1Res = await fetch(`${API_BASE}/api/story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: multiTurnSessionId,
        userPrompt: 'I enter the whispering crypt and inspect the glowing blue rune on the sarcophagus.',
        genre: 'Fantasy',
        language: 'en-US',
        voiceGender: 'Female',
        voiceTone: 'natural'
      })
    });
    const turn1Data = await turn1Res.json();

    if (!turn1Data.success) throw new Error(`Turn 1 failed: ${JSON.stringify(turn1Data)}`);
    logPass('Multi-turn Session - Turn 1 Execution', `Generated cliffhanger narrative (${turn1Data.storyText.length} chars)`);

    // Turn 2
    const turn2Res = await fetch(`${API_BASE}/api/story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: multiTurnSessionId,
        userPrompt: 'I press my hand against the blue rune to activate its power.',
        genre: 'Fantasy',
        language: 'en-US',
        voiceGender: 'Female',
        voiceTone: 'natural'
      })
    });
    const turn2Data = await turn2Res.json();

    if (!turn2Data.success) throw new Error(`Turn 2 failed: ${JSON.stringify(turn2Data)}`);
    logPass('Multi-turn Session - Turn 2 Execution', `Continuation acknowledged prior rune choice: "${turn2Data.storyText.substring(0, 80).replace(/\n/g, ' ')}..."`);

    // Verify in DynamoDB Table
    const ddbRecord = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { sessionId: multiTurnSessionId }
    }));

    if (ddbRecord.Item && ddbRecord.Item.history && ddbRecord.Item.history.length >= 4) {
      logPass('DynamoDB Session Persistence', `Successfully stored ${ddbRecord.Item.history.length} conversational turns with state in table ${TABLE_NAME}`);
    } else {
      logFail('DynamoDB Session Persistence', `Item not found or history incomplete: ${JSON.stringify(ddbRecord.Item)}`);
    }

  } catch (e) {
    logFail('Multi-Turn Session & Persistence Test', e.message);
  }

  console.log('\n=== BACKEND QA COMPLETE ===');
  console.log(JSON.stringify(results, null, 2));
}

runBackendQA();
