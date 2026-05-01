// =====================================================
// INDUSTRIAL MS - FUNCIONES COMPARTIDAS
// Sistema de Gestión de Mantenimiento
// =====================================================

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let currentUser = null;
let currentUserRol = null;
let currentUserNombre = null;

// =====================================================
// FUNCIONES DE AUTENTICACIÓN
// =====================================================

async function verificarSesion() {
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
    
    // Actualizar UI si existe
    if (document.getElementById('userName')) {
        document.getElementById('userName').textContent = currentUserNombre;
        document.getElementById('userRol').textContent = currentUserRol.toUpperCase();
    }
    
    return currentUser;
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// =====================================================
// FUNCIONES DE MODALES
// =====================================================

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    if (event.target.classList && event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// =====================================================
// FUNCIONES DE REPORTES (Compartidas)
// =====================================================

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

// =====================================================
// FUNCIONES DE NOTIFICACIONES
// =====================================================

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

// =====================================================
// FUNCIONES DE CARGA DE DATOS
// =====================================================

function mostrarLoading(mostrar) {
    const loadingDiv = document.getElementById('loadingMessage');
    if (loadingDiv) {
        loadingDiv.style.display = mostrar ? 'block' : 'none';
    }
}

// =====================================================
// EXPORTAR FUNCIONES GLOBALES
// =====================================================

window.supabase = supabase;
window.logout = logout;
window.openModal = openModal;
window.closeModal = closeModal;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;
window.mostrarError = mostrarError;
window.mostrarExito = mostrarExito;
window.mostrarLoading = mostrarLoading;
