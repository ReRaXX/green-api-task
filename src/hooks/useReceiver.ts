import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { MaxApi, NotificationBody } from '../api/greenApi';
import type { ChatAction, Message } from '../store/chat';

const RETRY_DELAY_MS = 3000;

/** Превращает входящее текстовое уведомление GREEN-API в сообщение чата, остальные пропускает. */
const parseNotification = (
  body: NotificationBody,
): { message: Message; chatName?: string } | null => {
  const text = body.messageData?.textMessageData?.textMessage;

  if (
    body.typeWebhook !== 'incomingMessageReceived' ||
    body.messageData?.typeMessage !== 'textMessage' ||
    !body.senderData ||
    !body.idMessage ||
    !text
  ) {
    return null;
  }

  return {
    chatName: body.senderData.chatName || body.senderData.senderName,
    message: {
      id: body.idMessage,
      chatId: body.senderData.chatId,
      text,
      direction: 'in',
      timestamp: (body.timestamp ?? Date.now() / 1000) * 1000,
      status: 'sent',
    },
  };
};

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(timer), resolve()), { once: true });
  });

export const useReceiver = (
  api: MaxApi,
  dispatch: Dispatch<ChatAction>,
  onError: (message: string | null) => void,
) => {
  // Колбэк не должен перезапускать цикл при каждом рендере.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const run = async () => {
      while (!signal.aborted) {
        try {
          const notification = await api.receiveNotification(signal);
          if (notification) {
            const parsed = parseNotification(notification.body);
            if (parsed) dispatch({ type: 'messageAdded', ...parsed });
            // Удаляем любое обработанное уведомление, иначе очередь встанет.
            await api.deleteNotification(notification.receiptId);
          }
          onErrorRef.current(null);
        } catch (error) {
          if (signal.aborted) return;
          onErrorRef.current(error instanceof Error ? error.message : 'Ошибка получения сообщений');
          await wait(RETRY_DELAY_MS, signal);
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [api, dispatch]);
};
