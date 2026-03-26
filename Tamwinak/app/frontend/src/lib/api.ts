import { createClient } from '@metagptx/web-sdk';

// Use the env var directly at module load time (resolved by Vite at build/dev time).
// This avoids any async race with loadRuntimeConfig.
const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8001';

export const client = createClient({ baseURL: API_BASE_URL });

