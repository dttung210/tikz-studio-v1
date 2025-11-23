
export enum AppTab {
  TEXT_TO_TIKZ = 'TEXT_TO_TIKZ',
  IMAGE_TO_TIKZ = 'IMAGE_TO_TIKZ',
  VARIATION_TABLE = 'VARIATION_TABLE', // New Tab
  FUNCTION_GRAPH = 'FUNCTION_GRAPH',   // New Tab
  TIKZ_PREVIEW = 'TIKZ_PREVIEW'
}

export interface TikZResponse {
  tikzCode: string;
  svgPreview: string;
  explanation?: string;
}

export interface HistoryItem {
  id: string;
  type: 'user' | 'ai';
  content: string;
  response?: TikZResponse;
  timestamp: number;
}
