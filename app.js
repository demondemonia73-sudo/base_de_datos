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

    // Si no tiene @ es un username — buscar email via RPC (sin bloqueo RLS)
    if (!email.includes('@')) {
        const { data: foundEmail, error } = await window.db
            .rpc('get_email_by_username', { p_username: input.trim() });
        if (error || !foundEmail) throw new Error('Usuario no encontrado. Use su username o email.');
        email = foundEmail;
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
    // Traer perfiles
    const { data, error } = await window.db
        .from('perfiles')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];

    // Intentar traer credenciales (solo funciona si es admin)
    const { data: creds } = await window.db
        .from('credenciales_admin')
        .select('usuario_id, password_visible, updated_at');

    // Combinar manualmente
    const credsMap = {};
    (creds || []).forEach(c => { credsMap[c.usuario_id] = c; });

    return data.map(u => ({
        ...u,
        credenciales_admin: credsMap[u.id] ? [credsMap[u.id]] : []
    }));
}

async function crearUsuario(email, password, nombre, rol, telefono = '') {
    if (!password || password.length < 6) throw new Error('Contraseña mínimo 6 caracteres');

    // Usar Edge Function para crear con email confirmado automáticamente
    const { data: { session } } = await window.db.auth.getSession();
    const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'create_user', email, password, nombre, rol, telefono }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al crear usuario');
    return result;
}

async function actualizarUsuario(id, data) {
    const { error } = await window.db.from('perfiles').update(data).eq('id', id);
    if (error) throw error;
    return true;
}

// ========== ELIMINAR USUARIO (via Edge Function) ==========
async function eliminarUsuario(userId) {
    const { data: { session } } = await window.db.auth.getSession();
    const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'delete_user', userId }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al eliminar usuario');
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
        body: JSON.stringify({ action: 'update_password', userId, newPassword }),
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
async function exportarPDF(headers, data, nombreArchivo, tituloReporte = '') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const fecha = new Date();
    const fechaStr = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    const fechaArchivo = fecha.toISOString().split('T')[0];

    // ── Fondo blanco ──────────────────────────────
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, 'F');

    // ── Banda superior roja ────────────────────────
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, pageW, 22, 'F');

    // ── Ícono / logo (cuadrado blanco con 🔧) ─────
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(6, 3, 16, 16, 2, 2, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(12);
    doc.text('MS', 9, 14);

    // ── Nombre empresa ────────────────────────────
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INDUSTRIAL MS', 26, 10);

    // ── Subtítulo sistema ─────────────────────────
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SISTEMA DE GESTIÓN DE MANTENIMIENTO', 26, 16);

    // ── Fecha alineada a la derecha ───────────────
    doc.setFontSize(8);
    doc.setTextColor(255, 220, 220);
    doc.text(fechaStr, pageW - 8, 12, { align: 'right' });

    // ── Título del reporte ────────────────────────
    const titulo = tituloReporte || nombreArchivo.replace(/_/g, ' ').toUpperCase();
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, 8, 32);

    // ── Línea separadora ──────────────────────────
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.line(8, 35, pageW - 8, 35);

    // ── Tabla de datos ────────────────────────────
    doc.autoTable({
        head: [headers],
        body: data,
        startY: 38,
        theme: 'grid',
        styles: {
            fontSize: 8,
            textColor: [40, 40, 40],
            cellPadding: 3,
            lineColor: [220, 220, 220],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [220, 38, 38],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250],
        },
        margin: { left: 8, right: 8 },

        // ── Pie de página en cada hoja ────────────
        didDrawPage: (hookData) => {
            const pY = pageH - 8;
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'normal');

            // Fecha izquierda
            doc.text(`Generado el ${fechaStr}`, 8, pY);

            // Número de página derecha
            const total = doc.internal.getNumberOfPages();
            const current = hookData.pageNumber;
            doc.text(`Página ${current} de ${total}`, pageW - 8, pY, { align: 'right' });

            // Línea separadora del pie
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.2);
            doc.line(8, pY - 3, pageW - 8, pY - 3);
        },
    });

    doc.save(`${nombreArchivo}_${fechaArchivo}.pdf`);
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
    cargarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, cambiarPasswordAdmin,
    exportarExcel, exportarPDF,
    mostrarToast, formatFecha, formatFechaHora,
    badgeEstado, badgePrioridad, badgeCriticidad,
});

console.log('✅ app.js · Industrial MS listo');
