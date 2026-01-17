export interface TimelineMeta {
  appName: string;
  version: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  content: string; // Markdown supported
  images: string[]; // Base64 strings
  tags: string[];
  children?: TimelineEvent[]; // Support nesting
}

export interface TimelineData {
  meta: TimelineMeta;
  events: TimelineEvent[];
}

export interface EventFormData {
  date: string;
  title: string;
  content: string;
  tags: string; // Comma separated for input
}