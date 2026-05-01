// =====================================================
// INDUSTRIAL MS - FUNCIONES COMPARTIDAS
// =====================================================

// Inicializar Supabase (solo una vez)
let supabase;
let currentUser = null;
let currentUserRol = null;
let currentUserNombre = null;

function initSupabase() {
    if (!supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase inicializado');
    }
    return supabase;
}

// Función para forzar conexión
async function forzarConexion() {
    console.log('🔄 Forzando conexión a Supabase...');
    initSupabase();
    
    try {
        const { data, error } = await supabase.from('perfiles').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Conexión exitosa a Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        return false;
    }
}

async function verificarSesion() {
    initSupabase();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }
    
    const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre, rol')
        .eq('id', session.user.id)
        .single();
    
    currentUser = session.user;
    currentUserRol = perfil?.rol || 'operador';
    currentUserNombre = perfil?.nombre || 'Usuario';
    
    if (document.getElementById('userName')) {
        document.getElementById('userName').textContent = currentUserNombre;
        document.getElementById('userRol').textContent = currentUserRol.toUpperCase();
    }
    
    return currentUser;
}

async function logout() {
    initSupabase();
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target.classList && event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

async function exportarExcel(data, nombreArchivo, nombreHoja = 'Datos') {
    const ws = XLSX.utils.json_to_sheet(data || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

async function exportarPDF(headers, data, nombreArchivo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    doc.autoTable({
        head: [headers],
        body: data,
        theme: 'striped',
        styles: { fontSize: 8, textColor: [255, 255, 255], cellPadding: 3 },
        headStyles: { fillColor: [255, 59, 48], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [30, 30, 30] },
        rowStyles: { fillColor: [20, 20, 20] }
    });
    doc.save(`${nombreArchivo}_${new Date().toISOString().split('T')[0]}.pdf`);
}

function mostrarError(mensaje) {
    const errorDiv = document.getElementById('loginError') || document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = `❌ ${mensaje}`;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 5000);
    } else {
        alert(mensaje);
    }
}

function mostrarExito(mensaje) {
    const successDiv = document.getElementById('loginSuccess') || document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = `✅ ${mensaje}`;
        successDiv.style.display = 'block';
        setTimeout(() => successDiv.style.display = 'none', 3000);
    }
}

// Exponer funciones globales
window.initSupabase = initSupabase;
window.forzarConexion = forzarConexion;
window.supabaseGet = () => supabase;
window.logout = logout;
window.openModal = openModal;
window.closeModal = closeModal;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;
window.mostrarError = mostrarError;
window.mostrarExito = mostrarExito;

console.log('📋 app.js cargado correctamente');
