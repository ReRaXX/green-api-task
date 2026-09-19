import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Credentials } from '../api/greenApi';

interface Props {
  /** Возвращает текст ошибки или null, если вход выполнен. */
  onSubmit: (credentials: Credentials) => Promise<string | null>;
}

export const LoginForm = ({ onSubmit }: Props) => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name)).trim();

    setError(
      await onSubmit({
        idInstance: field('idInstance'),
        apiTokenInstance: field('apiTokenInstance'),
        apiUrl: field('apiUrl'),
      }),
    );
  };

  return (
    <main className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">MAX Chat</h1>
        <p className="login-hint">Введите данные инстанса из личного кабинета GREEN-API</p>

        <label className="field">
          idInstance
          <input className="input" name="idInstance" inputMode="numeric" autoComplete="off" required />
        </label>

        <label className="field">
          apiTokenInstance
          <input className="input" name="apiTokenInstance" type="password" autoComplete="off" required />
        </label>

        <label className="field">
          apiUrl
          <input
            className="input"
            name="apiUrl"
            defaultValue="https://api.green-api.com"
            autoComplete="off"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit">
          Войти
        </button>
      </form>
    </main>
  );
};
