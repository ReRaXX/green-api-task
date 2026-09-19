import { useState } from 'react';
import { createApi } from './api/greenApi';
import type { Credentials } from './api/greenApi';
import { ChatApp } from './components/ChatApp';
import { LoginForm } from './components/LoginForm';
import { clearCredentials, loadCredentials, saveCredentials } from './store/chat';

export const App = () => {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials);

  const login = async (next: Credentials): Promise<string | null> => {
    try {
      const state = await createApi(next).getStateInstance();
      if (state !== 'authorized') return `Инстанс не авторизован (статус: ${state})`;
    } catch (error) {
      return error instanceof Error ? error.message : 'Не удалось проверить данные';
    }
    saveCredentials(next);
    setCredentials(next);
    return null;
  };

  const logout = () => {
    clearCredentials();
    setCredentials(null);
  };

  return credentials ? (
    <ChatApp credentials={credentials} onLogout={logout} />
  ) : (
    <LoginForm onSubmit={login} />
  );
};
