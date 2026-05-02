// =====================================================
// INDUSTRIAL MS - CONFIGURACIÓN
// =====================================================

const SUPABASE_URL = 'https://inghjpgqahmceplasunr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-_MBMDKrs8qfUlwscp9phQ_V9w1TjYv';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Configuración cargada');
