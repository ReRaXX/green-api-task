import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Chat, Message } from '../store/chat';
import { formatTime, isValidPhone, normalizePhone } from '../utils';
import { Avatar } from './Avatar';

interface Props {
  chats: Chat[];
  messages: Record<string, Message[]>;
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
  /** Возвращает текст ошибки или null, если чат создан. */
  onCreateChat: (phone: string) => Promise<string | null>;
}

export const Sidebar = ({ chats, messages, activeChatId, onSelect, onCreateChat }: Props) => {
  const [creating, setCreating] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      setError('Введите номер в формате 79991234567');
      return;
    }

    setLoading(true);
    const failure = await onCreateChat(normalized);
    setLoading(false);
    setError(failure);
    if (!failure) {
      setPhone('');
      setCreating(false);
    }
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h2 className="sidebar-title">Чаты</h2>
        <button
          className="add"
          type="button"
          aria-label="Новый чат"
          aria-expanded={creating}
          onClick={() => setCreating((value) => !value)}
        >
          +
        </button>
      </header>

      {creating && (
        <form className="new-chat" onSubmit={handleCreate}>
          <div className="new-chat-row">
            <input
              className="input"
              type="tel"
              placeholder="Номер получателя, 79991234567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <button className="btn" type="submit" disabled={loading || !phone.trim()}>
              {loading ? '…' : 'Создать'}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      )}

      <ul className="chat-list">
        {chats.length === 0 && (
          <li className="chat-list-empty">Нажмите «+», чтобы создать чат по номеру телефона</li>
        )}
        {chats.map((chat) => {
          const last = messages[chat.chatId]?.at(-1);
          return (
            <li key={chat.chatId}>
              <button
                type="button"
                className={chat.chatId === activeChatId ? 'chat-item active' : 'chat-item'}
                onClick={() => onSelect(chat.chatId)}
              >
                <Avatar name={chat.name} />
                <span className="chat-text">
                  <span className="chat-name">{chat.name}</span>
                  <span className="chat-preview">{last?.text ?? 'Нет сообщений'}</span>
                </span>
                {last && <span className="chat-time">{formatTime(last.timestamp)}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
