// =====================================================
// APP.JS — Funciones globales · Industrial MS
// =====================================================

// Referencia al cliente — sin redeclarar 'supabase' que ya usa la librería CDN
window.db = window._supabaseClient;

// ========== AUTENTICACIÓN ==========
async function verificarSesion() {
    try {
        const { data: { session } } = await window.db.auth.getSession();
        if (!session) { window.location.href = 'index.html'; return null; }
        const { data: perfil } = await window.db
            .from('perfiles').select('nombre, rol, apellido')
            .eq('id', session.user.id).single();
        return { user: session.user, perfil };
    } catch (e) {
        console.error('Error verificando sesión:', e);
        window.location.href = 'index.html';
        return null;
    }
}

async function logout() {
    localStorage.clear();
    sessionStorage.clear();
    await window.db.auth.signOut();
    window.location.href = 'index.html';
}

async function obtenerRolActual() {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) return null;
    const { data: perfil } = await window.db
        .from('perfiles').select('rol').eq('id', session.user.id).single();
    return perfil?.rol || null;
}

// ========== MODALES ==========
function openModal(id) {
    const m = document.getElementById(id);
    if (m) { m.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
    const m = document.getElementById(id);
    if (m) { m.style.display = 'none'; document.body.style.overflow = ''; }
}

// Cerrar modal al hacer click fuera
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModal(e.target.id);
});

// ========== HEADER DINÁMICO ==========
async function cargarHeader(paginaActiva) {
    const result = await verificarSesion();
    if (!result) return null;
    const { perfil } = result;

    const el = (id) => document.getElementById(id);
    if (el('userName')) el('userName').textContent = perfil?.nombre || 'Usuario';
    if (el('userRol'))  el('userRol').textContent  = (perfil?.rol || 'ROL').toUpperCase();

    // Mostrar nav de usuarios solo si es admin
    if (perfil?.rol === 'admin' && el('navUsuarios')) {
        el('navUsuarios').style.display = 'inline-flex';
    }

    // Marcar nav activo
    if (paginaActiva) {
        const btn = document.getElementById('nav-' + paginaActiva);
        if (btn) btn.classList.add('active');
    }

    if (el('logoutBtn')) el('logoutBtn').onclick = logout;

    return result;
}

// ========== ESTADÍSTICAS DASHBOARD ==========
async function cargarEstadisticasDashboard() {
    const [
        { count: totalEquipos },
        { count: equiposCriticos },
        { count: otsPendientes },
        { count: otsProgreso },
    ] = await Promise.all([
        window.db.from('equipos').select('*', { count: 'exact', head: true }).eq('activo', true),
        window.db.from('equipos').select('*', { count: 'exact', head: true }).eq('criticidad', 'A'),
        window.db.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('estado', 'Pendiente'),
        window.db.from('ordenes_trabajo').select('*', { count: 'exact', head: true }).eq('estado', 'En Progreso'),
    ]);
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
    const { count: otsCompletadas } = await window.db
        .from('ordenes_trabajo').select('*', { count: 'exact', head: true })
        .eq('estado', 'Completada').gte('created_at', inicioMes.toISOString());

    return { totalEquipos, equiposCriticos, otsPendientes, otsProgreso, otsCompletadas };
}

// ========== EQUIPOS ==========
async function cargarEquipos(filtros = {}) {
    let q = window.db.from('equipos').select('*').order('numero', { ascending: true });
    if (filtros.criticidad) q = q.eq('criticidad', filtros.criticidad);
    if (filtros.activo !== undefined) q = q.eq('activo', filtros.activo);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

// ========== ÓRDENES DE TRABAJO ==========
async function cargarOTs(filtros = {}) {
    let q = window.db.from('ordenes_trabajo')
        .select('*, equipos(nombre, codigo_completo)')
        .order('id', { ascending: false });
    if (filtros.estado) q = q.eq('estado', filtros.estado);
    if (filtros.prioridad) q = q.eq('prioridad', filtros.prioridad);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

async function crearOT(otData) {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) throw new Error('No hay sesión activa');
    const { error } = await window.db.from('ordenes_trabajo')
        .insert([{ ...otData, solicitado_por: session.user.id }]);
    if (error) throw error;
    return true;
}

async function actualizarOT(id, data) {
    const { error } = await window.db.from('ordenes_trabajo').update(data).eq('id', id);
    if (error) throw error;
    return true;
}

async function eliminarOT(id) {
    await window.db.from('actividades_ot').delete().eq('orden_trabajo_id', id);
    const { error } = await window.db.from('ordenes_trabajo').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// ========== ACTIVIDADES ==========
async function cargarActividades(filtros = {}) {
    let q = window.db.from('actividades_ot')
        .select('*, ordenes_trabajo(numero_ot, titulo)')
        .order('id', { ascending: false });
    if (filtros.orden_trabajo_id) q = q.eq('orden_trabajo_id', filtros.orden_trabajo_id);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

async function crearActividad(actData) {
    const { error } = await window.db.from('actividades_ot').insert([actData]);
    if (error) throw error;
    return true;
}

async function actualizarActividad(id, data) {
    const { error } = await window.db.from('actividades_ot').update(data).eq('id', id);
    if (error) throw error;
    return true;
}

async function eliminarActividad(id) {
    const { error } = await window.db.from('actividades_ot').delete().eq('id', id);
    if (error) throw error;
    return true;
}

// ========== LOGIN POR NOMBRE O EMAIL ==========
async function loginConNombreOEmail(input, password) {
    let email = input.trim();

    // Si no tiene @ es un nombre de usuario — buscar el email en perfiles
    if (!email.includes('@')) {
        const { data: perfil, error } = await window.db
            .from('perfiles')
            .select('email')
            .ilike('nombre', input.trim())
            .eq('activo', true)
            .single();
        if (error || !perfil) throw new Error('Usuario no encontrado. Verifique el nombre o use su email.');
        email = perfil.email;
    }

    const { data, error } = await window.db.auth.signInWithPassword({ email, password });
    if (error) {
        if (error.message === 'Invalid login credentials') throw new Error('Credenciales incorrectas.');
        if (error.message.includes('Email not confirmed')) throw new Error('Email no confirmado. Contacte al administrador.');
        throw error;
    }

    const { data: perfil } = await window.db
        .from('perfiles').select('nombre, rol').eq('id', data.user.id).single();
    if (!perfil) throw new Error('Perfil no encontrado. Contacte al administrador.');

    return { user: data.user, perfil };
}

// ========== USUARIOS (solo admin) ==========
async function cargarUsuarios() {
    // Traer perfiles junto con su credencial visible si existe
    const { data, error } = await window.db
        .from('perfiles')
        .select('*, credenciales_admin(password_visible, updated_at)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function crearUsuario(email, password, nombre, rol, telefono = '') {
    if (!password || password.length < 6) throw new Error('Contraseña mínimo 6 caracteres');

    // 1. Crear en Authentication
    const { data: authData, error: authError } = await window.db.auth.signUp({
        email, password, options: { data: { nombre, rol } }
    });
    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Crear perfil
    const { error: perfilError } = await window.db.from('perfiles')
        .insert({ id: userId, email, nombre, rol, telefono: telefono || null, activo: true });
    if (perfilError) throw perfilError;

    // 3. Guardar contraseña visible para el admin
    const { error: credError } = await window.db.from('credenciales_admin')
        .insert({ usuario_id: userId, email, password_visible: password });
    if (credError) console.warn('No se pudo guardar credencial visible:', credError.message);

    return { userId, email, nombre, password };
}

async function actualizarUsuario(id, data) {
    const { error } = await window.db.from('perfiles').update(data).eq('id', id);
    if (error) throw error;
    return true;
}

// ========== CAMBIAR CONTRASEÑA (via Edge Function) ==========
const EDGE_URL = 'https://inghjpgqahmceplasunr.supabase.co/functions/v1/admin-update-password';

async function cambiarPasswordAdmin(userId, newPassword) {
    if (!newPassword || newPassword.length < 6) throw new Error('Contraseña mínimo 6 caracteres');

    // 1. Llamar Edge Function para cambiar en Authentication
    const { data: { session } } = await window.db.auth.getSession();
    const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, newPassword }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al cambiar contraseña');

    // 2. Actualizar contraseña visible en credenciales_admin
    const { error } = await window.db.from('credenciales_admin')
        .update({ password_visible: newPassword, updated_at: new Date().toISOString() })
        .eq('usuario_id', userId);
    if (error) console.warn('No se actualizó credencial visible:', error.message);

    return true;
}

// ========== EXPORTAR EXCEL ==========
async function exportarExcel(data, nombreArchivo, nombreHoja = 'Datos') {
    if (!data || data.length === 0) { mostrarToast('No hay datos para exportar', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ========== EXPORTAR PDF ==========
async function exportarPDF(headers, data, nombreArchivo) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 297, 210, 'F');
    doc.autoTable({
        head: [headers],
        body: data,
        theme: 'striped',
        styles: { fontSize: 8, textColor: [220, 220, 220], fillColor: [18, 18, 18] },
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [26, 26, 26] },
        margin: { top: 20 },
    });
    doc.save(`${nombreArchivo}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ========== TOAST NOTIFICATIONS ==========
function mostrarToast(mensaje, tipo = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const colors = { success: '#16a34a', error: '#dc2626', warning: '#d97706', info: '#2563eb' };
    const icons  = { success: '✓', error: '✕', warning: '⚠', info: 'i' };
    toast.style.cssText = `
        background:#1a1a1a; border:1px solid ${colors[tipo]}; color:#fff;
        padding:12px 18px; border-radius:10px; font-size:13px;
        display:flex; align-items:center; gap:10px;
        box-shadow:0 4px 20px rgba(0,0,0,0.5);
        animation: slideIn 0.3s ease; min-width:260px;
    `;
    toast.innerHTML = `<span style="color:${colors[tipo]};font-weight:700;">${icons[tipo]}</span> ${mensaje}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ========== HELPERS ==========
function formatFecha(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFechaHora(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function badgeEstado(estado) {
    const map = {
        'Pendiente':   'badge-pending',
        'En Progreso': 'badge-progress',
        'Completada':  'badge-completed',
        'Cancelada':   'badge-cancelled',
    };
    return `<span class="badge ${map[estado] || 'badge-pending'}">${estado}</span>`;
}

function badgePrioridad(p) {
    const map = { 'Urgente': 'badge-critical', 'Alta': 'badge-moderate', 'Normal': 'badge-low', 'Baja': 'badge-inactive' };
    return `<span class="badge ${map[p] || 'badge-low'}">${p}</span>`;
}

function badgeCriticidad(c) {
    const map = { 'A': 'badge-critical', 'B': 'badge-moderate', 'C': 'badge-low' };
    const label = { 'A': 'A · CRÍTICO', 'B': 'B · MODERADO', 'C': 'C · BAJO' };
    return `<span class="badge ${map[c] || 'badge-low'}">${label[c] || c || '—'}</span>`;
}

// ========== EXPONER GLOBALES ==========
Object.assign(window, {
    verificarSesion, logout, obtenerRolActual,
    loginConNombreOEmail,
    openModal, closeModal, cargarHeader,
    cargarEstadisticasDashboard,
    cargarEquipos, cargarOTs, crearOT, actualizarOT, eliminarOT,
    cargarActividades, crearActividad, actualizarActividad, eliminarActividad,
    cargarUsuarios, crearUsuario, actualizarUsuario, cambiarPasswordAdmin,
    exportarExcel, exportarPDF,
    mostrarToast, formatFecha, formatFechaHora,
    badgeEstado, badgePrioridad, badgeCriticidad,
});

console.log('✅ app.js · Industrial MS listo');
