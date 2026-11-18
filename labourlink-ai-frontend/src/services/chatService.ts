import { request } from './api';

export interface ChatReply {
  message: string;
  action?: string | null;
  actionLabel?: string | null;
  workers: Array<{ workerId: number; name: string; skill: string; location: string; experience: number; availability: boolean; expectedWagePerDay?: number | null }>;
}

export function sendChatMessage(message: string, history: Array<{ role: 'user' | 'assistant'; text: string }>, language: 'en' | 'te'): Promise<ChatReply> {
  return request<ChatReply>('/api/chat', { method: 'POST', body: { message, history: history.slice(-10), language }, auth: true });
}
