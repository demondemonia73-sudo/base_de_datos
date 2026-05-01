// =====================================================
// APLICACIÓN PRINCIPAL - SISTEMA DE MANTENIMIENTO
// =====================================================

let supabase;
let currentUser = null;
let currentUserRol = null;
let currentUserNombre = null;

// Variables globales para datos
let equiposData = [];
let otsData = [];
let actividadesData = [];
let chart = null;

// =====================================================
// INICIALIZACIÓN
// =====================================================

async function init() {
    // Inicializar Supabase
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Verificar si hay sesión activa
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        await cargarPerfilUsuario(session.user.id);
        mostrarDashboard();
    } else {
        mostrarLogin();
    }
}

async function cargarPerfilUsuario(userId) {
    const { data: perfil } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    currentUser = { id: userId };
    currentUserRol = perfil?.rol || 'operador';
    currentUserNombre = perfil?.nombre || 'Usuario';
}

// =====================================================
// NAVEGACIÓN ENTRE PÁGINAS
// =====================================================

function mostrarLogin() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboardPage').style.display = 'none';
}

function mostrarDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'block';
    document.getElementById('userName').textContent = currentUserNombre;
    cargarDashboard();
    cargarEquipos();
    cargarOTs();
    cargarActividades();
    cargarSelectEquipos();
}

function showSection(section) {
    // Ocultar todas las secciones
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('equiposSection').style.display = 'none';
    document.getElementById('ordenesSection').style.display = 'none';
    document.getElementById('actividadesSection').style.display = 'none';
    document.getElementById('reportesSection').style.display = 'none';
    
    // Mostrar la sección seleccionada
    document.getElementById(section + 'Section').style.display = 'block';
    
    // Recargar datos según la sección
    if (section === 'equipos') cargarEquipos();
    if (section === 'ordenes') cargarOTs();
    if (section === 'actividades') cargarActividades();
    
    // Actualizar botón activo
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(getSectionTitle(section))) {
            btn.classList.add('active');
        }
    });
}

function getSectionTitle(section) {
    const titles = {
        'dashboard': 'Dashboard',
        'equipos': 'Equipos',
        'ordenes': 'Órdenes',
        'actividades': 'Actividades',
        'reportes': 'Reportes'
    };
    return titles[section] || section;
}

// =====================================================
// LOGIN / LOGOUT
// =====================================================

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!email || !password) {
        errorDiv.textContent = 'Ingrese email y contraseña';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        await cargarPerfilUsuario(data.user.id);
        mostrarDashboard();

    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    currentUserRol = null;
    mostrarLogin();
}

// =====================================================
// DASHBOARD
// =====================================================

async function cargarDashboard() {
    try {
        // Contar equipos
        const { count: totalEquipos } = await supabase
            .from('equipos')
            .select('*', { count: 'exact', head: true });
        
        // Contar equipos críticos
        const { count: equiposCriticos } = await supabase
            .from('equipos')
            .select('*', { count: 'exact', head: true })
            .eq('criticidad', 'A');
        
        // Contar OT pendientes
        const { count: otsPendientes } = await supabase
            .from('ordenes_trabajo')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'Pendiente');
        
        // Contar OT completadas en el mes
        const inicioMes = new Date();
        inicioMes.setDate(1);
        const { count: otsCompletadas } = await supabase
            .from('ordenes_trabajo')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'Completada')
            .gte('created_at', inicioMes.toISOString());
        
        document.getElementById('totalEquipos').textContent = totalEquipos || 0;
        document.getElementById('equiposCriticos').textContent = equiposCriticos || 0;
        document.getElementById('otsPendientes').textContent = otsPendientes || 0;
        document.getElementById('otsCompletadas').textContent = otsCompletadas || 0;
        
        // Gráfico de estados
        const { data: estados } = await supabase
            .from('ordenes_trabajo')
            .select('estado');
        
        const estadosCount = { Pendiente: 0, 'En Progreso': 0, Completada: 0, Cancelada: 0 };
        estados?.forEach(ot => {
            estadosCount[ot.estado] = (estadosCount[ot.estado] || 0) + 1;
        });
        
        if (chart) chart.destroy();
        const ctx = document.getElementById('estadosChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pendiente', 'En Progreso', 'Completada', 'Cancelada'],
                datasets: [{
                    label: 'Órdenes de Trabajo',
                    data: [estadosCount.Pendiente, estadosCount['En Progreso'], estadosCount.Completada, estadosCount.Cancelada],
                    backgroundColor: ['#ffc107', '#17a2b8', '#28a745', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
        
        // Equipos críticos
        const { data: criticos } = await supabase
            .from('equipos')
            .select('nombre, codigo_completo, criticidad')
            .eq('criticidad', 'A')
            .limit(10);
        
        let html = '<table><thead><tr><th>Equipo</th><th>Código</th><th>Criticidad</th></tr></thead><tbody>';
        criticos?.forEach(e => {
            html += `<tr><td>${e.nombre}</td><td>${e.codigo_completo}</td><td><span class="badge badge-A">A</span></td></tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('equiposCriticosList').innerHTML = html || '<p>No hay equipos críticos</p>';
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

// =====================================================
// EQUIPOS
// =====================================================

async function cargarEquipos() {
    try {
        const { data, error } = await supabase
            .from('equipos')
            .select('*')
            .order('numero', { ascending: true });
        
        if (error) throw error;
        equiposData = data || [];
        renderizarEquipos(equiposData);
    } catch (error) {
        console.error('Error cargando equipos:', error);
    }
}

function renderizarEquipos(equipos) {
    let html = `
        <table>
            <thead>
                <tr><th>N°</th><th>Nombre del Equipo</th><th>Código</th><th>Centro Costo</th><th>Proceso</th><th>Criticidad</th></tr>
            </thead>
            <tbody>
    `;
    
    equipos.forEach(e => {
        html += `
            <tr>
                <td>${e.numero || '-'}</td>
                <td>${e.nombre || '-'}</td>
                <td>${e.codigo_completo || '-'}</td>
                <td>${e.centro_costo || '-'}</td>
                <td>${e.proceso || '-'}</td>
                <td><span class="badge badge-${e.criticidad}">${e.criticidad || '-'}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('equiposTable').innerHTML = html || '<p>No hay equipos cargados</p>';
}

function filtrarEquipos() {
    const search = document.getElementById('searchEquipo').value.toLowerCase();
    const criticidad = document.getElementById('filterCriticidad').value;
    
    let filtered = equiposData;
    if (search) {
        filtered = filtered.filter(e => 
            e.nombre?.toLowerCase().includes(search) || 
            e.codigo_completo?.toLowerCase().includes(search)
        );
    }
    if (criticidad) {
        filtered = filtered.filter(e => e.criticidad === criticidad);
    }
    renderizarEquipos(filtered);
}

// =====================================================
// ÓRDENES DE TRABAJO
// =====================================================

async function cargarOTs() {
    try {
        const { data, error } = await supabase
            .from('ordenes_trabajo')
            .select(`
                *,
                equipos (nombre, codigo_completo)
            `)
            .order('id', { ascending: false });
        
        if (error) throw error;
        otsData = data || [];
        renderizarOTs(otsData);
    } catch (error) {
        console.error('Error cargando OTs:', error);
    }
}

function renderizarOTs(ots) {
    let html = `
        <table>
            <thead>
                <tr><th>N° OT</th><th>Equipo</th><th>Título</th><th>Prioridad</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr>
            </thead>
            <tbody>
    `;
    
    ots.forEach(ot => {
        let estadoClass = '';
        if (ot.estado === 'Pendiente') estadoClass = 'badge-pendiente';
        else if (ot.estado === 'En Progreso') estadoClass = 'badge-progreso';
        else if (ot.estado === 'Completada') estadoClass = 'badge-completada';
        else if (ot.estado === 'Cancelada') estadoClass = 'badge-cancelada';
        
        let prioridadClass = '';
        if (ot.prioridad === 'Baja') prioridadClass = 'badge-baja';
        else if (ot.prioridad === 'Normal') prioridadClass = 'badge-normal';
        else if (ot.prioridad === 'Alta') prioridadClass = 'badge-alta';
        else if (ot.prioridad === 'Urgente') prioridadClass = 'badge-urgente';
        
        html += `
            <tr>
                <td>${ot.numero_ot || '-'}</td>
                <td>${ot.equipos?.nombre || ot.equipo_nombre || '-'}</td>
                <td>${ot.titulo || '-'}</td>
                <td><span class="badge ${prioridadClass}">${ot.prioridad || '-'}</span></td>
                <td><span class="badge ${estadoClass}">${ot.estado || '-'}</span></td>
                <td>${ot.created_at ? new Date(ot.created_at).toLocaleDateString() : '-'}</td>
                <td class="action-buttons">
                    <button class="btn-icon btn-view" onclick="verOT(${ot.id})">👁️</button>
                    ${(currentUserRol === 'admin' || currentUserRol === 'supervisor') ? `<button class="btn-icon btn-edit" onclick="editarOT(${ot.id})">✏️</button>` : ''}
                    ${currentUserRol === 'admin' ? `<button class="btn-icon btn-delete" onclick="eliminarOT(${ot.id})">🗑️</button>` : ''}
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('otsTable').innerHTML = html || '<p>No hay órdenes de trabajo</p>';
}

function filtrarOTs() {
    const search = document.getElementById('searchOT').value.toLowerCase();
    const estado = document.getElementById('filterEstadoOT').value;
    
    let filtered = otsData;
    if (search) {
        filtered = filtered.filter(ot => 
            ot.numero_ot?.toLowerCase().includes(search) || 
            ot.titulo?.toLowerCase().includes(search)
        );
    }
    if (estado) {
        filtered = filtered.filter(ot => ot.estado === estado);
    }
    renderizarOTs(filtered);
}

async function cargarSelectEquipos() {
    const { data } = await supabase
        .from('equipos')
        .select('id, nombre, codigo_completo')
        .order('nombre');
    
    const select = document.getElementById('otEquipoId');
    select.innerHTML = '<option value="">Seleccione un equipo</option>';
    data?.forEach(e => {
        select.innerHTML += `<option value="${e.id}">${e.nombre} (${e.codigo_completo})</option>`;
    });
}

async function crearOT() {
    const nuevaOT = {
        titulo: document.getElementById('otTitulo').value,
        equipo_id: document.getElementById('otEquipoId').value || null,
        descripcion: document.getElementById('otDescripcion').value,
        prioridad: document.getElementById('otPrioridad').value,
        tipo_mantenimiento: document.getElementById('otTipo').value,
        estado: 'Pendiente',
        solicitado_por: currentUser?.id
    };
    
    if (!nuevaOT.titulo) {
        alert('El título es obligatorio');
        return;
    }
    
    const { error } = await supabase.from('ordenes_trabajo').insert([nuevaOT]);
    
    if (error) {
        alert('Error al crear OT: ' + error.message);
    } else {
        alert('OT creada exitosamente');
        closeModal('otModal');
        document.getElementById('otForm').reset();
        cargarOTs();
        cargarDashboard();
    }
}

async function verOT(id) {
    // Obtener detalles de la OT
    const { data: ot } = await supabase
        .from('ordenes_trabajo')
        .select('*, equipos(*)')
        .eq('id', id)
        .single();
    
    // Obtener actividades
    const { data: actividades } = await supabase
        .from('actividades_ot')
        .select('*')
        .eq('orden_trabajo_id', id)
        .order('orden', { ascending: true });
    
    let actividadesHtml = '';
    actividades?.forEach(act => {
        actividadesHtml += `
            <tr>
                <td>${act.descripcion || '-'}</td>
                <td>${act.tecnico || '-'}</td>
                <td>${act.inicio ? new Date(act.inicio).toLocaleString() : '-'}</td>
                <td>${act.fin ? new Date(act.fin).toLocaleString() : '-'}</td>
                <td>${act.total_horas || '-'}</td>
            </tr>
        `;
    });
    
    const modalContent = `
        <div style="max-height: 500px; overflow-y: auto;">
            <h3>${ot.numero_ot} - ${ot.titulo}</h3>
            <p><strong>Equipo:</strong> ${ot.equipos?.nombre || '-'}</p>
            <p><strong>Prioridad:</strong> ${ot.prioridad}</p>
            <p><strong>Estado:</strong> ${ot.estado}</p>
            <p><strong>Descripción:</strong> ${ot.descripcion || '-'}</p>
            <h4>Actividades</h4>
            <table>
                <thead><tr><th>Descripción</th><th>Técnico</th><th>Inicio</th><th>Fin</th><th>Horas</th></tr></thead>
                <tbody>${actividadesHtml || '<tr><td colspan="5">No hay actividades</td></tr>'}</tbody>
            </table>
            <div style="margin-top: 20px;">
                <button class="btn" onclick="closeModal('viewOTModal')">Cerrar</button>
            </div>
        </div>
    `;
    
    document.getElementById('viewOTContent').innerHTML = modalContent;
    openModal('viewOTModal');
}

async function editarOT(id) {
    const { data: ot } = await supabase
        .from('ordenes_trabajo')
        .select('*')
        .eq('id', id)
        .single();
    
    document.getElementById('editOtId').value = ot.id;
    document.getElementById('editOtTitulo').value = ot.titulo || '';
    document.getElementById('editOtDescripcion').value = ot.descripcion || '';
    document.getElementById('editOtPrioridad').value = ot.prioridad || 'Normal';
    document.getElementById('editOtEstado').value = ot.estado || 'Pendiente';
    
    openModal('editOTModal');
}

async function actualizarOT() {
    const id = document.getElementById('editOtId').value;
    const updates = {
        titulo: document.getElementById('editOtTitulo').value,
        descripcion: document.getElementById('editOtDescripcion').value,
        prioridad: document.getElementById('editOtPrioridad').value,
        estado: document.getElementById('editOtEstado').value,
        updated_at: new Date()
    };
    
    const { error } = await supabase
        .from('ordenes_trabajo')
        .update(updates)
        .eq('id', id);
    
    if (error) {
        alert('Error al actualizar: ' + error.message);
    } else {
        alert('OT actualizada exitosamente');
        closeModal('editOTModal');
        cargarOTs();
        cargarDashboard();
    }
}

async function eliminarOT(id) {
    if (!confirm('¿Está seguro de eliminar esta OT? Se eliminarán también todas las actividades asociadas.')) return;
    
    const { error } = await supabase
        .from('ordenes_trabajo')
        .delete()
        .eq('id', id);
    
    if (error) {
        alert('Error al eliminar: ' + error.message);
    } else {
        alert('OT eliminada exitosamente');
        cargarOTs();
        cargarDashboard();
    }
}

// =====================================================
// ACTIVIDADES
// =====================================================

async function cargarActividades() {
    try {
        const { data, error } = await supabase
            .from('actividades_ot')
            .select(`
                *,
                ordenes_trabajo (numero_ot, titulo)
            `)
            .order('id', { ascending: false });
        
        if (error) throw error;
        actividadesData = data || [];
        renderizarActividades(actividadesData);
        cargarSelectOTParaActividad();
    } catch (error) {
        console.error('Error cargando actividades:', error);
    }
}

function renderizarActividades(actividades) {
    let html = `
        <table>
            <thead>
                <tr><th>OT</th><th>Descripción</th><th>Técnico</th><th>Inicio</th><th>Fin</th><th>Horas</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
    `;
    
    actividades.forEach(act => {
        html += `
            <tr>
                <td>${act.ordenes_trabajo?.numero_ot || '-'}</td>
                <td>${act.descripcion || '-'}</td>
                <td>${act.tecnico || '-'}</td>
                <td>${act.inicio ? new Date(act.inicio).toLocaleString() : '-'}</td>
                <td>${act.fin ? new Date(act.fin).toLocaleString() : '-'}</td>
                <td>${act.total_horas || '-'}</td>
                <td><span class="badge">${act.estado || 'Pendiente'}</span></td>
                <td class="action-buttons">
                    ${(currentUserRol === 'admin' || currentUserRol === 'supervisor' || currentUserRol === 'tecnico') ? `<button class="btn-icon btn-edit" onclick="editarActividad(${act.id})">✏️</button>` : ''}
                    ${currentUserRol === 'admin' ? `<button class="btn-icon btn-delete" onclick="eliminarActividad(${act.id})">🗑️</button>` : ''}
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    document.getElementById('actividadesTable').innerHTML = html || '<p>No hay actividades</p>';
}

async function cargarSelectOTParaActividad() {
    const { data } = await supabase
        .from('ordenes_trabajo')
        .select('id, numero_ot, titulo')
        .order('id', { ascending: false });
    
    const select = document.getElementById('actividadOtId');
    select.innerHTML = '<option value="">Seleccione una OT</option>';
    data?.forEach(ot => {
        select.innerHTML += `<option value="${ot.id}">${ot.numero_ot} - ${ot.titulo}</option>`;
    });
}

async function crearActividad() {
    const inicio = document.getElementById('actividadInicio').value;
    const fin = document.getElementById('actividadFin').value;
    let totalHoras = null;
    
    if (inicio && fin) {
        const inicioDate = new Date(inicio);
        const finDate = new Date(fin);
        const diffHoras = (finDate - inicioDate) / (1000 * 60 * 60);
        totalHoras = diffHoras.toFixed(2);
    }
    
    const nuevaActividad = {
        orden_trabajo_id: document.getElementById('actividadOtId').value || null,
        descripcion: document.getElementById('actividadDescripcion').value,
        tecnico: document.getElementById('actividadTecnico').value,
        inicio: inicio || null,
        fin: fin || null,
        total_horas_numeric: totalHoras,
        estado: document.getElementById('actividadEstado').value,
        orden: 0
    };
    
    if (!nuevaActividad.descripcion) {
        alert('La descripción es obligatoria');
        return;
    }
    
    const { error } = await supabase.from('actividades_ot').insert([nuevaActividad]);
    
    if (error) {
        alert('Error al crear actividad: ' + error.message);
    } else {
        alert('Actividad creada exitosamente');
        closeModal('actividadModal');
        document.getElementById('actividadForm').reset();
        cargarActividades();
        cargarDashboard();
    }
}

async function editarActividad(id) {
    const { data: act } = await supabase
        .from('actividades_ot')
        .select('*')
        .eq('id', id)
        .single();
    
    document.getElementById('editActividadId').value = act.id;
    document.getElementById('editActividadDescripcion').value = act.descripcion || '';
    document.getElementById('editActividadTecnico').value = act.tecnico || '';
    document.getElementById('editActividadEstado').value = act.estado || 'Pendiente';
    
    if (act.inicio) {
        document.getElementById('editActividadInicio').value = act.inicio.slice(0, 16);
    }
    if (act.fin) {
        document.getElementById('editActividadFin').value = act.fin.slice(0, 16);
    }
    
    openModal('editActividadModal');
}

async function actualizarActividad() {
    const id = document.getElementById('editActividadId').value;
    const inicio = document.getElementById('editActividadInicio').value;
    const fin = document.getElementById('editActividadFin').value;
    let totalHoras = null;
    
    if (inicio && fin) {
        const inicioDate = new Date(inicio);
        const finDate = new Date(fin);
        const diffHoras = (finDate - inicioDate) / (1000 * 60 * 60);
        totalHoras = diffHoras.toFixed(2);
    }
    
    const updates = {
        descripcion: document.getElementById('editActividadDescripcion').value,
        tecnico: document.getElementById('editActividadTecnico').value,
        inicio: inicio || null,
        fin: fin || null,
        total_horas_numeric: totalHoras,
        estado: document.getElementById('editActividadEstado').value,
        updated_at: new Date()
    };
    
    const { error } = await supabase
        .from('actividades_ot')
        .update(updates)
        .eq('id', id);
    
    if (error) {
        alert('Error al actualizar: ' + error.message);
    } else {
        alert('Actividad actualizada exitosamente');
        closeModal('editActividadModal');
        cargarActividades();
        cargarDashboard();
    }
}

async function eliminarActividad(id) {
    if (!confirm('¿Está seguro de eliminar esta actividad?')) return;
    
    const { error } = await supabase
        .from('actividades_ot')
        .delete()
        .eq('id', id);
    
    if (error) {
        alert('Error al eliminar: ' + error.message);
    } else {
        alert('Actividad eliminada exitosamente');
        cargarActividades();
        cargarDashboard();
    }
}

// =====================================================
// REPORTES
// =====================================================

async function exportarEquiposExcel() {
    const { data } = await supabase.from('equipos').select('*');
    const ws = XLSX.utils.json_to_sheet(data || []);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
    XLSX.writeFile(wb, `equipos_${new Date().toISOString().split('T')[0]}.xlsx`);
}

async function exportarEquiposPDF() {
    const { data } = await supabase.from('equipos').select('numero, nombre, codigo_completo, criticidad');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    doc.autoTable({
        head: [['N°', 'Equipo', 'Código', 'Criticidad']],
        body: (data || []).map(e => [e.numero, e.nombre, e.codigo_completo, e.criticidad]),
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [102, 126, 234] }
    });
    doc.save(`equipos_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function exportarOTsExcel() {
    const { data } = await supabase.from('ordenes_trabajo').select('*, equipos(nombre)');
    const exportData = (data || []).map(ot => ({
        'N° OT': ot.numero_ot,
        'Equipo': ot.equipos?.nombre || ot.equipo_nombre,
        'Título': ot.titulo,
        'Prioridad': ot.prioridad,
        'Estado': ot.estado,
        'Fecha Creación': new Date(ot.created_at).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ordenes_Trabajo');
    XLSX.writeFile(wb, `ots_${new Date().toISOString().split('T')[0]}.xlsx`);
}

async function exportarOTsPDF() {
    const { data } = await supabase.from('ordenes_trabajo').select('numero_ot, titulo, prioridad, estado');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    doc.autoTable({
        head: [['N° OT', 'Título', 'Prioridad', 'Estado']],
        body: (data || []).map(ot => [ot.numero_ot, ot.titulo, ot.prioridad, ot.estado]),
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [102, 126, 234] }
    });
    doc.save(`ots_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function exportarActividadesExcel() {
    const { data } = await supabase
        .from('actividades_ot')
        .select('*, ordenes_trabajo(numero_ot)');
    
    const exportData = (data || []).map(act => ({
        'OT': act.ordenes_trabajo?.numero_ot,
        'Descripción': act.descripcion,
        'Técnico': act.tecnico,
        'Inicio': act.inicio ? new Date(act.inicio).toLocaleString() : '-',
        'Fin': act.fin ? new Date(act.fin).toLocaleString() : '-',
        'Horas': act.total_horas,
        'Estado': act.estado
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Actividades');
    XLSX.writeFile(wb, `actividades_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// =====================================================
// MODALES
// =====================================================

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// =====================================================
// INICIALIZAR APLICACIÓN
// =====================================================

document.addEventListener('DOMContentLoaded', init);
