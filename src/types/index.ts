export type Mode = 'editor' | 'hypebeast' | 'boho';

export interface AnalysisResult {
  score: number;
  title: string;
  critique: string;
  improvement_tip: string;
  highlights: {
    type: 'good' | 'bad';
    label: string;
    box_2d?: [number, number, number, number];
    point_2d?: [number, number]; // [y, x] scaled 0-1000
    point?: [number, number];
  }[];
}

export interface PersonaAnalysisResult extends AnalysisResult {
  persona: Mode;
}

export interface StyleResult {
  user_analysis: string;
  outfit_name: string;
  items: string[];
  reasoning: string;
  visual_prompt: string;
  image?: string;
  dos?: string[];
  donts?: string[];
}

export interface ScanHistoryItem {
  type: 'scan';
  id: string;
  image_url: string;
  data: PersonaAnalysisResult[];
  created_at: string;
  occasion: string;
}

export interface StyleHistoryItem {
  type: 'style';
  id: string;
  image_url: string;
  generated_image_url?: string;
  data: StyleResult;
  created_at: string;
}

export type HistoryItem = ScanHistoryItem | StyleHistoryItem;
