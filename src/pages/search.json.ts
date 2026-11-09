import type { APIRoute } from 'astro';
import { noteEntries } from '../search/index';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await noteEntries()), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
