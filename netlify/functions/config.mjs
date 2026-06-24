export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      app: 'نظام السجل المخبري اليومي',
      version: '2.0',
      environment: process.env.CONTEXT || 'dev',
      supabaseUrl: process.env.SUPABASE_URL || null,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      functions: [
        { name: 'config', path: '/api/config', description: 'بيانات الإعدادات' },
        { name: 'sync',   path: '/api/sync',   description: 'مزامنة البيانات (تحت التطوير)' },
      ]
    }),
  };
};
