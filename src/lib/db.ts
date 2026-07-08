import { neon } from '@neondatabase/serverless';

const isValidDbUrl = (url: string | undefined): url is string => {
  return !!url && (url.startsWith('postgres://') || url.startsWith('postgresql://'));
};

if (!isValidDbUrl(process.env.DATABASE_URL)) {
  // During local development or Vercel build phase, if DATABASE_URL is not set yet,
  // we print a warning but don't crash to allow static compilation to complete.
  console.warn('DATABASE_URL is not defined or is not a valid database URL');
}

export const sql = isValidDbUrl(process.env.DATABASE_URL)
  ? neon(process.env.DATABASE_URL)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : (async () => []) as any; // Mock query function to avoid crashes during build

