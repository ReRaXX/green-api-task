import type { Credentials } from '../api/greenApi';

export type MessageStatus = 'sending' | 'sent' | 'error';

export interface Message {
  id: string;
  chatId: string;
  text: string;
  direction: 'in' | 'out';
  /** Unix-время в миллисекундах */
  timestamp: number;
  status: MessageStatus;
}

export interface Chat {
  chatId: string;
  name: string;
}

export interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
}

export type ChatAction =
  | { type: 'chatOpened'; chat: Chat }
  | { type: 'chatSelected'; chatId: string }
  | { type: 'messageAdded'; message: Message; chatName?: string }
  | { type: 'messageUpdated'; chatId: string; id: string; status: MessageStatus; newId?: string };

export const initialState: ChatState = { chats: [], messages: {}, activeChatId: null };

const hasMessage = (state: ChatState, chatId: string, id: string) =>
  (state.messages[chatId] ?? []).some((message) => message.id === id);

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'chatOpened': {
      const exists = state.chats.some((chat) => chat.chatId === action.chat.chatId);
      return {
        ...state,
        chats: exists ? state.chats : [action.chat, ...state.chats],
        activeChatId: action.chat.chatId,
      };
    }

    case 'chatSelected':
      return { ...state, activeChatId: action.chatId };

    case 'messageAdded': {
      const { message, chatName } = action;
      // Уведомление могло прийти повторно (например, после обрыва связи).
      if (hasMessage(state, message.chatId, message.id)) return state;

      const known = state.chats.some((chat) => chat.chatId === message.chatId);
      const chats = known
        ? state.chats
        : [{ chatId: message.chatId, name: chatName || message.chatId }, ...state.chats];
      return {
        ...state,
        chats,
        messages: {
          ...state.messages,
          [message.chatId]: [...(state.messages[message.chatId] ?? []), message],
        },
      };
    }

    case 'messageUpdated': {
      const { chatId, id, status, newId } = action;
      const list = state.messages[chatId];
      if (!list) return state;
      // Если id уже занят (уведомление опередило ответ на отправку), оставляем прежний.
      const nextId = newId && !hasMessage(state, chatId, newId) ? newId : id;
      return {
        ...state,
        messages: {
          ...state.messages,
          [chatId]: list.map((message) =>
            message.id === id ? { ...message, id: nextId, status } : message,
          ),
        },
      };
    }
  }
};

const CREDENTIALS_KEY = 'max-chat:credentials';
const historyKey = (idInstance: string) => `max-chat:history:${idInstance}`;

const read = <T>(storage: Storage, key: string): T | null => {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (storage: Storage, key: string, value: unknown) => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Хранилище недоступно или переполнено — чат продолжит работать без сохранения.
  }
};

/** Токен хранится только в sessionStorage: он исчезает при закрытии вкладки. */
export const loadCredentials = () => read<Credentials>(sessionStorage, CREDENTIALS_KEY);
export const saveCredentials = (credentials: Credentials) =>
  write(sessionStorage, CREDENTIALS_KEY, credentials);
export const clearCredentials = () => sessionStorage.removeItem(CREDENTIALS_KEY);

/** История чатов сохраняется отдельно для каждого инстанса и не содержит токена. */
export const loadHistory = (idInstance: string): ChatState => {
  const saved = read<ChatState>(localStorage, historyKey(idInstance));
  if (!saved) return initialState;

  // Сообщения, которые не успели отправиться до закрытия страницы, помечаем ошибкой.
  const messages = Object.fromEntries(
    Object.entries(saved.messages).map(([chatId, list]) => [
      chatId,
      list.map((message) =>
        message.status === 'sending' ? { ...message, status: 'error' as const } : message,
      ),
    ]),
  );
  return { ...saved, messages };
};

export const saveHistory = (idInstance: string, state: ChatState) =>
  write(localStorage, historyKey(idInstance), state);
