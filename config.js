// =====================================================
// INDUSTRIAL MS - CONFIGURACIÓN
// =====================================================

const SUPABASE_URL = 'https://inghjpgqahmceplasunr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-_MBMDKrs8qfUlwscp9phQ_V9w1TjYv';

// Inicializar Supabase SOLO UNA VEZ
if (typeof window._supabase === 'undefined') {
    window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase inicializado');
}

// Exportar para uso global
const supabase = window._supabase;
