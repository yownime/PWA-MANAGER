import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  // During local development or Vercel build phase, if DATABASE_URL is not set yet,
  // we print a warning but don't crash to allow static compilation to complete.
  console.warn('DATABASE_URL is not defined in environment variables');
}

export const sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : (async () => []) as any; // Mock query function to avoid crashes during build
