import { useEffect, useMemo, useReducer, useState } from 'react';
import { createApi } from '../api/greenApi';
import type { Credentials } from '../api/greenApi';
import { useReceiver } from '../hooks/useReceiver';
import { chatReducer, loadHistory, saveHistory } from '../store/chat';
import type { Message } from '../store/chat';
import { ChatWindow } from './ChatWindow';
import { Sidebar } from './Sidebar';

interface Props {
  credentials: Credentials;
  onLogout: () => void;
}

export const ChatApp = ({ credentials, onLogout }: Props) => {
  const api = useMemo(() => createApi(credentials), [credentials]);
  const [state, dispatch] = useReducer(chatReducer, credentials.idInstance, loadHistory);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  useReceiver(api, dispatch, setReceiveError);

  useEffect(() => saveHistory(credentials.idInstance, state), [credentials.idInstance, state]);

  const activeChat = state.chats.find((chat) => chat.chatId === state.activeChatId);

  const createChat = async (phone: string) => {
    try {
      const chatId = await api.checkAccount(phone);
      if (!chatId) return 'Аккаунт MAX с таким номером не найден';
      dispatch({ type: 'chatOpened', chat: { chatId, name: `+${phone}` } });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Неизвестная ошибка';
    }
  };

  const deliver = async (chatId: string, id: string, text: string) => {
    try {
      const newId = await api.sendMessage(chatId, text);
      dispatch({ type: 'messageUpdated', chatId, id, status: 'sent', newId });
    } catch {
      dispatch({ type: 'messageUpdated', chatId, id, status: 'error' });
    }
  };

  const send = (text: string) => {
    if (!activeChat) return;
    const message: Message = {
      id: `local-${crypto.randomUUID()}`,
      chatId: activeChat.chatId,
      text,
      direction: 'out',
      timestamp: Date.now(),
      status: 'sending',
    };
    dispatch({ type: 'messageAdded', message });
    void deliver(message.chatId, message.id, text);
  };

  const retry = (message: Message) => {
    dispatch({ type: 'messageUpdated', chatId: message.chatId, id: message.id, status: 'sending' });
    void deliver(message.chatId, message.id, message.text);
  };

  return (
    <div className="app">
      {receiveError && (
        <div className="banner" role="alert">
          Не удаётся получать сообщения: {receiveError}
        </div>
      )}
      <div className="layout">
        <nav className="rail">
          <span className="rail-item active">Чаты</span>
          <button className="rail-item logout" type="button" onClick={onLogout}>
            Выйти
          </button>
        </nav>
        <Sidebar
          chats={state.chats}
          messages={state.messages}
          activeChatId={state.activeChatId}
          onSelect={(chatId) => dispatch({ type: 'chatSelected', chatId })}
          onCreateChat={createChat}
        />
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            messages={state.messages[activeChat.chatId] ?? []}
            onSend={send}
            onRetry={retry}
          />
        ) : (
          <div className="placeholder">Выберите чат или создайте новый</div>
        )}
      </div>
    </div>
  );
};
