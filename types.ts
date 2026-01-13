export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
}

export interface LessonContent {
  title: string;
  explanation: string; // The "ELI3" text
  analogy: string; // A specific analogy used
  imagePrompt: string; // Prompt for the image generator
  keyPoints: string[]; // For summary
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export enum AppState {
  HOME,
  TOPIC_SELECTION,
  LEARNING,
  QUIZ,
  SUMMARY
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
