// types/photext.ts

export type BoxId = string;

export type BoxStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  color: string;
  textAlign: "left" | "center" | "right" | "justify";
  lineHeight: number;
  letterSpacing?: number;
  backgroundColor?: string;
  padding?: number;
};

export type AiActionKind =
  | "rewrite"
  | "grammarFix"
  | "translate"
  | "summarize"
  | "expand";

export type AiHistoryEntry = {
  id: string;
  action: AiActionKind;
  createdAt: string; // ISO timestamp
  previousText: string;
  newText: string;
  meta?: Record<string, unknown>;
};

export type BoxState = {
  id: BoxId;
  text: string;

  // Canvas layout (relative to image)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;

  zIndex: number;
  locked: boolean;
  hidden: boolean;

  // OCR metadata
  ocrConfidence?: number | null; // 0–1
  language?: string | null;

  // Styling
  style: BoxStyle;

  // Optional inline AI history
  aiHistory?: AiHistoryEntry[];
};

export type CanvasState = {
  projectId: string;
  imagePath: string;
  boxes: BoxState[];
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type Platform = "instagram" | "x" | "linkedin" | "tiktok" | "generic";

export type PostStylePreset =
  | "neutral"
  | "friendly"
  | "promotional"
  | "storytelling";

export type PlatformPostBundle = {
  primary: string;
  variants: string[];
};

export type GeneratedPosts = {
  [P in Platform]?: PlatformPostBundle;
};

export type HashtagSet = {
  compact: string[];
  maximal: string[];
};

export type PostsPanelState = {
  selectedPlatforms: Platform[];
  stylePreset: PostStylePreset;
  context: string;
  generatedPosts?: GeneratedPosts;
  hashtags?: HashtagSet;
};

// DTO that mirrors the Prisma Project + expanded boxes JSON
export type ProjectDto = {
  id: string;
  title: string;
  imagePath: string;
  boxes: BoxState[];

  dominantLanguage?: string | null;
  lastPlatforms?: Platform[]; // derived from CSV string in DB

  aiRewriteCount: number;
  aiGrammarFixCount: number;
  aiPostGenerationCount: number;
  aiHashtagSuggestionCount: number;

  lastGeneratedPosts?: GeneratedPosts;
  lastGeneratedHashtags?: HashtagSet;

  createdAt: string;
  updatedAt: string;
};
