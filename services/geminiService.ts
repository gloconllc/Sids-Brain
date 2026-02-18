
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { StrategicHint, AiResponse, ThemeType, ImageSize } from "../types";

// Helper for base64 decoding to Uint8Array
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode raw PCM data from Gemini TTS
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Generates an elite visualization based on shoutout text.
 */
export const generateSidImage = async (prompt: string, size: ImageSize): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            text: `Create a futuristic, retro-arcade style digital art piece celebrating BI leadership and team mentorship. 
            The visual should represent 'Sid The Brain' and this specific message: "${prompt}". 
            Style: High-tech cyberpunk with glowing data nodes, neon circuits, and a heroic data-driven atmosphere.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: size
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};

/**
 * Generates and plays "alien voice" text-to-speech.
 * Includes a robust Web Speech API fallback for zero-latency/offline support.
 */
export const speakAlien = async (text: string, audioContext: AudioContext): Promise<void> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Act as a helpful, slightly eccentric alien co-pilot for a retro arcade game. Say this in a futuristic, robotic-yet-friendly way: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        audioContext,
        24000,
        1,
      );
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      return;
    }
  } catch (error) {
    console.debug("Gemini TTS bypass/fallback active.");
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.8;
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const robotVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Robot'));
    if (robotVoice) utterance.voice = robotVoice;
    window.speechSynthesis.speak(utterance);
  }
};

const LOCAL_BRAIN_INSIGHTS = [
  { message: "SID-SYNC ESTABLISHED", rationale: "Sid's mentorship has successfully aligned the team's technical architecture with long-term strategic goals.", winTier: "Elite Navigator" },
  { message: "COACHING FLOW ACTIVE", rationale: "Through dedicated knowledge sharing, Sid has expanded the team's collective capacity to solve complex challenges.", winTier: "Culture Catalyst" },
  { message: "ELITE DATA ARCHITECTURE", rationale: "The legacy of Sid's work is a robust and scalable data environment that continues to power team innovations.", winTier: "System Architect" },
  { message: "SID-TASTIC SUCCESS", rationale: "The BI team has reached a state of pure efficiency. Sid's guidance is visible in every dashboard.", winTier: "Data Deity" },
  { message: "TEAM VIBE OVERLOAD", rationale: "Sid doesn't just build data, he builds people. The team morale is at an all-time high.", winTier: "Vibe Master" }
];

const NEW_BRAIN_SYMBOLS = [
  { id: 'INSIGHT_NODE', label: 'ELITE NODE', icon: '⚡', color: '#00f2ff' },
];

export const analyzeSpin = async (
  symbolsLanded: string[],
  recentFeedback: string[],
  theme: ThemeType,
  selectedStrategy?: string
): Promise<AiResponse> => {
  const startTime = Date.now();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const apiCall = ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are the "Sid-Sight" AI co-pilot. Celebrates Sid Bartake. landed: ${symbolsLanded.join(', ')}. Mode: ${selectedStrategy}. feedback: ${recentFeedback.join(' | ')}. Generate high-energy JSON output.`,
    config: {
      systemInstruction: "Appreciative Sid-Sight co-pilot. JSON only: message, rationale, winTier, newSymbol (id, label, icon, color). High energy, fun, Sid-focused.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING },
          rationale: { type: Type.STRING },
          winTier: { type: Type.STRING },
          newSymbol: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              icon: { type: Type.STRING },
              color: { type: Type.STRING }
            },
            required: ['id', 'label', 'icon', 'color']
          }
        },
        required: ['message', 'rationale', 'winTier', 'newSymbol']
      }
    }
  });

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

  try {
    const result = await Promise.race([apiCall, timeout]);
    if (!result) throw new Error("API too slow");

    const data = JSON.parse(result.text || '{}');
    return {
      hint: data,
      debug: { latency: Date.now() - startTime, timestamp: new Date().toLocaleTimeString() }
    };
  } catch (error) {
    const randomIndex = Math.floor(Math.random() * LOCAL_BRAIN_INSIGHTS.length);
    const insight = LOCAL_BRAIN_INSIGHTS[randomIndex];
    return {
      hint: {
        message: insight.message,
        rationale: insight.rationale,
        winTier: insight.winTier,
        newSymbol: NEW_BRAIN_SYMBOLS[0]
      },
      debug: { latency: 0, timestamp: new Date().toLocaleTimeString() }
    };
  }
};

export const polishFeedback = async (rawFeedback: string): Promise<{ shortText: string; longText: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Polish this team shoutout for Sid Bartake: ${rawFeedback}`,
      config: {
        systemInstruction: "Sid-Sight enhancer. JSON: shortText (25 chars), longText. High energy!",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shortText: { type: Type.STRING },
            longText: { type: Type.STRING }
          },
          required: ['shortText', 'longText']
        }
      }
    });
    const data = JSON.parse(response.text || '{}');
    return {
      shortText: data.shortText || "ELITE LOG",
      longText: data.longText || rawFeedback
    };
  } catch (error) {
    return { shortText: "ELITE LOG", longText: rawFeedback };
  }
};
