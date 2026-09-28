import type { Request, Response } from 'express';
import { createApp } from '../src/main';

let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(req: Request, res: Response) {
  try {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost');
    const forwardedPath = requestUrl.searchParams.get('__vercel_path');

    if (forwardedPath !== null) {
      requestUrl.searchParams.delete('__vercel_path');
      const query = requestUrl.searchParams.toString();
      req.url = `/${forwardedPath.replace(/^\/+/, '')}${query ? `?${query}` : ''}`;
    }

    if (!appPromise) {
      appPromise = createApp().then(async (app) => {
        await app.init();
        return app;
      }).catch((error: unknown) => {
        appPromise = undefined;
        throw error;
      });
    }

    const app = await appPromise;
    app.getHttpAdapter().getInstance()(req, res);
  } catch (error) {
    console.error('Vercel function failed to initialize or handle a request', error);
    if (!res.headersSent) {
      res.status(500).json({ statusCode: 500, message: 'Internal server error' });
    }
  }
}