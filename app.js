// =====================================================
// FUNCIONES GLOBALES - COMPARTIDAS ENTRE TODOS LOS HTML
// =====================================================

// ========== AUTENTICACIÓN ==========
async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }
    const { data: perfil } = await supabase.from('perfiles').select('nombre, rol').eq('id', session.user.id).single();
    return { user: session.user, perfil };
}

async function logout() {
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

async function obtenerRolActual() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', session.user.id).single();
    return perfil?.rol;
}

// ========== MODALES ==========
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// ========== REPORTES ==========
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
        styles: { fontSize: 8, textColor: [255,255,255] },
        headStyles: { fillColor: [255,59,48] },
        alternateRowStyles: { fillColor: [30,30,30] }
    });
    doc.save(`${nombreArchivo}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ========== CARGAR HEADER ==========
async function cargarHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data: perfil } = await supabase.from('perfiles').select('nombre, rol').eq('id', session.user.id).single();
    if (perfil) {
        if (document.getElementById('userName')) document.getElementById('userName').textContent = perfil.nombre;
        if (document.getElementById('userRol')) document.getElementById('userRol').textContent = perfil.rol?.toUpperCase();
        
        // Mostrar botón de usuarios SOLO para admin
        if (perfil.rol === 'admin' && document.getElementById('navUsuarios')) {
            document.getElementById('navUsuarios').style.display = 'block';
        }
    }
    
    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').onclick = logout;
    }
}

// ========== DASHBOARD FUNCTIONS ==========
async function cargarEstadisticasDashboard() {
    const { count: totalEquipos } = await supabase.from('equipos').select('*', { count: 'exact', head: true });
    const { count: equiposCriticos } = await supabase.from('equipos').select('*', { count: 'exact', head: true }).eq('criticidad', 'A');
    const { count: otsPendientes } = await supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('estado', 'Pendiente');
    const inicioMes = new Date(); inicioMes.setDate(1);
    const { count: otsCompletadas } = await supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('estado', 'Completada').gte('created_at', inicioMes.toISOString());
    
    return { totalEquipos, equiposCriticos, otsPendientes, otsCompletadas };
}

// ========== EQUIPOS FUNCTIONS ==========
async function cargarEquipos() {
    const { data } = await supabase.from('equipos').select('*').order('numero', { ascending: true });
    return data || [];
}

// ========== OT FUNCTIONS ==========
async function cargarOTs() {
    const { data } = await supabase.from('ordenes_trabajo').select(`*, equipos(nombre)`).order('id', { ascending: false });
    return data || [];
}

async function crearOT(otData) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No hay sesión');
    const { error } = await supabase.from('ordenes_trabajo').insert([{ ...otData, solicitado_por: session.user.id }]);
    if (error) throw error;
    return true;
}

// ========== ACTIVIDADES FUNCTIONS ==========
async function cargarActividades() {
    const { data } = await supabase.from('actividades_ot').select(`*, ordenes_trabajo(numero_ot, titulo)`).order('id', { ascending: false });
    return data || [];
}

async function crearActividad(actData) {
    const { error } = await supabase.from('actividades_ot').insert([actData]);
    if (error) throw error;
    return true;
}

// ========== USUARIOS FUNCTIONS (SOLO ADMIN) ==========
async function cargarUsuarios() {
    const { data } = await supabase.from('perfiles').select('*').order('created_at', { ascending: false });
    return data || [];
}

async function crearUsuario(email, password, nombre, rol, telefono = '') {
    if (!password || password.length < 6) throw new Error('Contraseña mínimo 6 caracteres');
    const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, password, 
        options: { data: { nombre, rol } } 
    });
    if (authError) throw authError;
    const { error: perfilError } = await supabase.from('perfiles').insert({ 
        id: authData.user.id, email, nombre, rol, telefono, activo: true 
    });
    if (perfilError) throw perfilError;
    return true;
}

async function actualizarUsuario(id, data) {
    const { error } = await supabase.from('perfiles').update(data).eq('id', id);
    if (error) throw error;
    return true;
}

// ========== EXPORTAR FUNCIONES GLOBALES ==========
window.supabase = supabase;
window.verificarSesion = verificarSesion;
window.logout = logout;
window.obtenerRolActual = obtenerRolActual;
window.openModal = openModal;
window.closeModal = closeModal;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;
window.cargarHeader = cargarHeader;
window.cargarEstadisticasDashboard = cargarEstadisticasDashboard;
window.cargarEquipos = cargarEquipos;
window.cargarOTs = cargarOTs;
window.crearOT = crearOT;
window.cargarActividades = cargarActividades;
window.crearActividad = crearActividad;
window.cargarUsuarios = cargarUsuarios;
window.crearUsuario = crearUsuario;
window.actualizarUsuario = actualizarUsuario;

console.log('✅ app.js cargado - Funciones globales disponibles');
