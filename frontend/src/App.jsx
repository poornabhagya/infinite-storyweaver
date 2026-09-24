import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, Sparkles, BookOpen, RefreshCw, Send } from 'lucide-react';

const API_BASE = 'https://mrybogha2useb6wj26tzathdku0knzgg.lambda-url.ap-south-1.on.aws';

class FallbackSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.lang = 'en-US';
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this._isRecording = false;
  }
  start() {
    this._isRecording = true;
  }
  stop() {
    this._isRecording = false;
    if (this.onend) this.onend();
  }
  abort() {
    this.stop();
  }
}

export default function App() {
  const [sessionId] = useState(() => 'session_' + Math.random().toString(36).substring(2, 9));
  const [genre, setGenre] = useState('Fantasy');
  const [language, setLanguage] = useState('en-US');
  const [voiceGender, setVoiceGender] = useState('Female');
  const [voiceTone, setVoiceTone] = useState('natural');
  const [userPrompt, setUserPrompt] = useState('');
  const [storyNodes, setStoryNodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const storyEndRef = useRef(null);

  const playAudio = useCallback((base64) => {
    if (!base64) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    audioRef.current = audio;
    setIsPlayingAudio(true);
    audio.play().catch((err) => console.error("Audio playback error:", err));
    audio.onended = () => setIsPlayingAudio(false);
  }, []);

  const handleSendPrompt = useCallback(async (manualPrompt) => {
    const promptToSend = manualPrompt !== undefined ? manualPrompt : userPrompt;
    if (!promptToSend.trim() && storyNodes.length > 0) return;

    setLoading(true);
    if (promptToSend.trim()) {
      setStoryNodes((prev) => [...prev, { role: 'user', text: promptToSend }]);
    }
    setUserPrompt('');

    try {
      const res = await fetch(`${API_BASE}/api/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userPrompt: promptToSend,
          genre,
          language,
          voiceGender,
          voiceTone
        })
      });

      const data = await res.json();

      if (data.success && data.storyText) {
        setStoryNodes((prev) => [...prev, { role: 'assistant', text: data.storyText, audioBase64: data.audioBase64 }]);

        if (data.audioBase64) {
          playAudio(data.audioBase64);
        }
      } else {
        alert(data.error || 'Failed to generate story segment.');
      }
    } catch (err) {
      console.error("Connection error:", err);
      alert('Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, userPrompt, genre, language, voiceGender, voiceTone, storyNodes.length, playAudio]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || FallbackSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || event.transcript || '';
        if (transcript) {
          setUserPrompt(transcript);
          handleSendPrompt(transcript);
        }
      };

      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, [language, handleSendPrompt]);

  useEffect(() => {
    storyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storyNodes, loading]);

  useEffect(() => {
    window.__storyWeaver = {
      getSessionId: () => sessionId,
      getGenre: () => genre,
      getLanguage: () => language,
      getVoiceGender: () => voiceGender,
      getVoiceTone: () => voiceTone,
      getStoryNodes: () => storyNodes,
      isLoading: () => loading,
      isRecording: () => isRecording,
      isPlayingAudio: () => isPlayingAudio,
      playAudio: (base64) => playAudio(base64),
      simulateVoiceTranscript: (text) => {
        if (recognitionRef.current && recognitionRef.current.onresult) {
          recognitionRef.current.onresult({
            results: [[{ transcript: text }]],
            transcript: text
          });
        } else {
          handleSendPrompt(text);
        }
      }
    };
  }, [sessionId, genre, language, voiceGender, voiceTone, storyNodes, loading, isRecording, isPlayingAudio, handleSendPrompt, playAudio]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge, or type below!');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setUserPrompt('');
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition start caught:', e);
      }
      setIsRecording(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Infinite StoryWeaver
            </h1>
            <p className="text-xs text-slate-400">AWS Bedrock + Polly Powered Multi-Modal Storytelling</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            id="genre-select"
            data-testid="genre-select"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="Fantasy">Fantasy</option>
            <option value="Sci-Fi">Sci-Fi</option>
            <option value="Mystery">Mystery</option>
            <option value="Cyberpunk">Cyberpunk</option>
            <option value="Horror">Horror</option>
          </select>

          <select
            id="language-select"
            data-testid="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="en-US">🇺🇸 English</option>
            <option value="es-ES">🇪🇸 Spanish</option>
            <option value="fr-FR">🇫🇷 French</option>
          </select>

          <select
            id="voice-gender-select"
            data-testid="voice-gender-select"
            value={voiceGender}
            onChange={(e) => setVoiceGender(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="Female">Debbo (Female Voice)</option>
            <option value="Male">Gorko (Male Voice)</option>
          </select>

          <select
            id="voice-tone-select"
            data-testid="voice-tone-select"
            value={voiceTone}
            onChange={(e) => setVoiceTone(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="natural">Natural</option>
            <option value="scary">Kulniidum (Spooky/Whisper)</option>
            <option value="children">Sukaaɓe (Playful/Kids)</option>
          </select>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-6 max-h-[70vh]" data-testid="chat-stream">
          {storyNodes.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <Sparkles className="w-12 h-12 text-indigo-400 mb-3 animate-pulse" />
              <h2 className="text-lg font-semibold text-slate-200">The Scroll is Blank</h2>
              <p className="text-sm text-slate-400 max-w-md mt-1 mb-6">
                Choose your genre and voice style, then press the microphone or the button below to start the adventure.
              </p>
              <button
                id="begin-story-btn"
                data-testid="begin-story-btn"
                onClick={() => handleSendPrompt("Begin an epic quest in a forgotten realm!")}
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Begin Story
              </button>
            </div>
          )}

          {storyNodes.map((node, idx) => (
            <div
              key={idx}
              data-testid={`story-node-${node.role}`}
              className={`flex flex-col ${
                node.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  node.role === 'user'
                    ? 'bg-indigo-600/90 text-white rounded-br-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    {node.role === 'user' ? 'You (Adventurer)' : 'StoryWeaver AI'}
                  </span>
                  {node.role === 'assistant' && (
                    <button
                      id={`replay-btn-${idx}`}
                      data-testid="replay-audio-btn"
                      onClick={() => playAudio(node.audioBase64)}
                      className="text-slate-400 hover:text-indigo-400 transition-colors"
                      title="Replay Audio"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-line">{node.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div data-testid="loading-indicator" className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800 w-fit">
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="text-xs text-slate-400">Weaving the narrative with Amazon Bedrock...</span>
            </div>
          )}
          <div ref={storyEndRef} />
        </div>

        <div className="pt-3 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-inner"
          >
            <button
              id="mic-btn"
              data-testid="mic-btn"
              type="button"
              onClick={toggleRecording}
              className={`p-3 rounded-xl transition-all flex items-center justify-center ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isRecording ? 'Listening... click to stop' : 'Click to Speak'}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              id="story-input"
              data-testid="story-input"
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={isRecording ? 'Listening to your voice...' : 'Type your decision or speak into the mic...'}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none px-2"
            />

            <button
              id="send-btn"
              data-testid="send-btn"
              type="submit"
              disabled={loading || !userPrompt.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {isPlayingAudio && (
            <div data-testid="playing-audio-indicator" className="flex items-center justify-center gap-2 mt-2 text-xs text-indigo-400">
              <Volume2 className="w-3.5 h-3.5 animate-bounce" />
              <span>Playing narrator voice (Amazon Polly)...</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}