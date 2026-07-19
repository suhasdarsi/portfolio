import type { APIRoute } from 'astro';
import { getSearchData } from '../utils/search';

export const GET: APIRoute = async () => {
  const searchData = await getSearchData();

  return new Response(JSON.stringify(searchData), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
