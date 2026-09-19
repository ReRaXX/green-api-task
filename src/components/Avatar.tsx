const COLORS = ['#5b8def', '#e0709b', '#f09a4a', '#4fb47f', '#9a72e6', '#3fb5c9'];

// Для чатов, названных по номеру телефона, берём первую цифру, а не «+».
const initial = (name: string) => name.match(/[\p{L}\p{N}]/u)?.[0].toUpperCase() ?? '?';

const colorFor = (seed: string) =>
  COLORS[[...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % COLORS.length];

export const Avatar = ({ name, size = 52 }: { name: string; size?: number }) => (
  <div className="avatar" style={{ width: size, height: size, background: colorFor(name) }}>
    {initial(name)}
  </div>
);
