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

export interface HistoryItem {
  id: string;
  image_url: string;
  ai_results: PersonaAnalysisResult[];
  created_at: string;
  occasion: string;
}
