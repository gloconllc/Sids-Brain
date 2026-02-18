
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type ThemeType = 'CYBERPUNK' | 'VEGAS' | 'MINIMALIST';
export type ImageSize = '1K' | '2K' | '4K';

export interface SymbolType {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface StrategicHint {
  message: string;
  rationale: string;
  winTier: string;
  newSymbol?: SymbolType;
}

export interface AiResponse {
  hint: StrategicHint;
  debug: DebugInfo;
}

export interface DebugInfo {
  latency: number;
  promptContext?: string;
  rawResponse?: string;
  timestamp: string;
  error?: string;
}

export interface FeedbackMessage {
  firstName: string;
  lastInitial: string;
  msg: string;
  longText?: string;
  timestamp: string;
  imageUrl?: string;
}
