export interface ClassSession {
    topicContext?: string;
    fullTranscription: string;
    fullLsm: string;
}

// Store in-memory
export const classStore: Record<string, ClassSession> = {};
