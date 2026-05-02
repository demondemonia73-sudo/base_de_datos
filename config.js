// =====================================================
// INDUSTRIAL MS - CONFIGURACIÓN
// =====================================================

const SUPABASE_URL = 'https://inghjpgqahmceplasunr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-_MBMDKrs8qfUlwscp9phQ_V9w1TjYv';

// Verificar que Supabase está cargado
if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase no está cargado. Revisa la conexión a internet.');
}

// Inicializar Supabase UNA SOLA VEZ
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Configuración de Supabase cargada');
console.log('🔗 URL:', SUPABASE_URL);
console.log('🔑 Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');

// Función para probar conexión manualmente
window.testSupabaseConnection = async function() {
    console.log('🔄 Probando conexión manual...');
    try {
        const { data, error } = await supabase.from('perfiles').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Conexión exitosa a Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        return false;
    }
};
