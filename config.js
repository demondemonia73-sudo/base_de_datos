// =====================================================
// CONFIGURACIÓN GLOBAL — Industrial MS
// =====================================================

const SUPABASE_URL  = 'https://inghjpgqahmceplasunr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-_MBMDKrs8qfUlwscp9phQ_V9w1TjYv';

// Inicializar cliente UNA sola vez en window
if (typeof window._supabaseClient === 'undefined') {
    window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
// NO se declara 'const supabase' aquí — solo en app.js
