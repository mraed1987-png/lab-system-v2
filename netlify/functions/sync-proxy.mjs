import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Supabase credentials not configured in Netlify environment variables' }),
    };
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const body = event.httpMethod === 'POST' ? JSON.parse(event.body || '{}') : {};

    if (event.httpMethod === 'GET') {
      // Health check
      const { data, error } = await supabase.from('archive').select('id').limit(1);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'connected',
          tables: {
            archive: !error,
            requests: true,
            materials: true,
          }
        }),
      };
    }

    if (event.httpMethod === 'POST' && body.action === 'export') {
      const { table, format } = body;
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Disposition': `attachment; filename="${table}.json"` },
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request' }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
