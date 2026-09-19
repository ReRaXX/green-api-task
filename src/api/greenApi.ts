export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  /** Хост инстанса, например https://api.green-api.com */
  apiUrl: string;
}

export interface NotificationBody {
  typeWebhook: string;
  idMessage?: string;
  /** Unix-время в секундах */
  timestamp?: number;
  senderData?: { chatId: string; chatName?: string; senderName?: string };
  messageData?: {
    typeMessage: string;
    textMessageData?: { textMessage: string };
  };
}

export interface Notification {
  receiptId: number;
  body: NotificationBody;
}

const RECEIVE_TIMEOUT_SEC = 5;

export const createApi = ({ apiUrl, idInstance, apiTokenInstance }: Credentials) => {
  const request = async <T>(method: string, init: RequestInit = {}, suffix = ''): Promise<T> => {
    const url = `${apiUrl.replace(/\/+$/, '')}/waInstance${idInstance}/${method}/${apiTokenInstance}${suffix}`;

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new Error('Нет соединения с GREEN-API. Проверьте интернет, apiUrl, idInstance и токен');
    }
    if (!response.ok) {
      throw new Error(
        response.status === 401 || response.status === 403
          ? 'Неверные idInstance или apiTokenInstance'
          : `Ошибка GREEN-API (${response.status})`,
      );
    }
    // При пустой очереди receiveNotification отвечает пустым телом, а не JSON.
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  };

  const post = <T>(method: string, body: unknown) =>
    request<T>(method, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  return {
    async getStateInstance() {
      const { stateInstance } = await request<{ stateInstance: string }>('getStateInstance');
      return stateInstance;
    },

    /** Возвращает chatId аккаунта MAX или null, если аккаунта с таким номером нет. */
    async checkAccount(phone: string) {
      const { exist, chatId } = await post<{ exist: boolean; chatId: string }>('checkAccount', {
        phoneNumber: Number(phone),
      });
      return exist && chatId ? chatId : null;
    },

    async sendMessage(chatId: string, text: string) {
      const { idMessage } = await post<{ idMessage: string }>('sendMessage', {
        chatId,
        message: text,
      });
      return idMessage;
    },

    /** Ждёт следующее уведомление из очереди; null, если за время ожидания ничего не пришло. */
    receiveNotification: (signal: AbortSignal) =>
      request<Notification | null>('receiveNotification', { signal }, `?receiveTimeout=${RECEIVE_TIMEOUT_SEC}`),

    async deleteNotification(receiptId: number) {
      await request('deleteNotification', { method: 'DELETE' }, `/${receiptId}`);
    },
  };
};

export type MaxApi = ReturnType<typeof createApi>;
