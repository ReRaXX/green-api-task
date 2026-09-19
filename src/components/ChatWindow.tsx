import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Chat, Message } from '../store/chat';
import { formatTime } from '../utils';
import { Avatar } from './Avatar';

interface Props {
  chat: Chat;
  messages: Message[];
  onSend: (text: string) => void;
  onRetry: (message: Message) => void;
}

export const ChatWindow = ({ chat, messages, onSend, onRetry }: Props) => {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, chat.chatId]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <section className="window">
      <header className="window-header">
        <Avatar name={chat.name} size={44} />
        <h2 className="window-name">{chat.name}</h2>
      </header>

      <div className="window-body">
        <div className="messages">
          {messages.length === 0 && <p className="messages-empty">Напишите первое сообщение</p>}
          {messages.map((message) => (
            <div key={message.id} className={message.direction === 'out' ? 'row out' : 'row'}>
              <div className="bubble">
                <span className="bubble-text">{message.text}</span>
                <span className="bubble-meta">
                  {message.status === 'error' && (
                    <button className="retry" type="button" onClick={() => onRetry(message)}>
                      Не отправлено · Повторить
                    </button>
                  )}
                  {formatTime(message.timestamp)}
                  {message.direction === 'out' && message.status === 'sent' && ' ✓'}
                </span>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            className="composer-input"
            rows={1}
            placeholder="Сообщение"
            value={text}
            maxLength={4000}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="send" type="submit" disabled={!text.trim()} aria-label="Отправить">
            ↑
          </button>
        </form>
      </div>
    </section>
  );
};
