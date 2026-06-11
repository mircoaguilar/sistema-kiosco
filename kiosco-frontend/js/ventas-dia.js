(function verificarSesion() {
    if (!localStorage.getItem('jwt_token')) {
        window.location.href = 'login.html';
    }
})();

const API_URL = window.APP_CONFIG.API_URL;
const token = localStorage.getItem('jwt_token');
const nombreUsuario = localStorage.getItem('nombre_usuario') || 'Usuario';

document.getElementById('nombre-vendedor').innerText = `Vendedor: ${nombreUsuario}`;

const tabla = document.getElementById('tabla-reporte');
const totalDiaHTML = document.getElementById('total-dia');

let todasLasCategorias = [];
let todosLosProveedores = [];

async function cargarFiltros() {
    try {
        const [catRes, provRes] = await Promise.all([
            fetch(`${API_URL}/categorias`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/proveedores`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        todasLasCategorias = await catRes.json();
        todosLosProveedores = await provRes.json();

        actualizarSelectoresOpciones(todasLasCategorias, todosLosProveedores);

    } catch (error) {
        console.error(error);
    }
}

async function cargarReporte() {
    try {
        const desde = document.getElementById('filtro-desde').value;
        const hasta = document.getElementById('filtro-hasta').value;
        const categoria = document.getElementById('filtro-categoria').value;
        const proveedor = document.getElementById('filtro-proveedor').value;
        const horaDesde = document.getElementById('filtro-hora-desde').value;
        const horaHasta = document.getElementById('filtro-hora-hasta').value;

        let url = `${API_URL}/reportes/productos-dia`;
        const params = [];

        if (categoria) params.push(`categoria=${categoria}`);
        if (proveedor) params.push(`proveedor=${proveedor}`);
        if (desde) params.push(`desde=${desde}`);
        if (hasta) params.push(`hasta=${hasta}`);
        if (horaDesde) params.push(`hora_desde=${horaDesde}`);
        if (horaHasta) params.push(`hora_hasta=${horaHasta}`);

        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error();

        const data = await res.json();

        renderTabla(data.productos);
        renderResumen(data.resumen);
        
        actualizarFiltrosCruzados(data.productos, categoria, proveedor);

    } catch (error) {
        console.error(error);

        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger py-4">
                    Error al cargar el reporte
                </td>
            </tr>
        `;
    }
}

function renderTabla(productos) {
    if (!productos || productos.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    No hay ventas registradas
                </td>
            </tr>
        `;
        return;
    }

    tabla.innerHTML = productos.map(p => `
        <tr>
            <td class="fw-bold">${p.nombre}</td>
            <td><span class="badge bg-light text-dark border">${p.categoria || 'General'}</span></td>
            <td>${p.proveedor || '-'}</td>
            <td>${parseFloat(p.cantidad)}</td>
            <td class="fw-bold text-success">
                $${formatearMoneda(p.total)}
            </td>
        </tr>
    `).join('');
}

function formatearMoneda(valor) {
    return Number(valor).toLocaleString('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function renderResumen(resumen) {
    if (!resumen) return;

    totalDiaHTML.innerText = `$${formatearMoneda(resumen.total_dia || 0)}`;

    const ventasHTML = document.getElementById('cantidad-ventas');
    if (ventasHTML) {
        ventasHTML.innerText = resumen.cantidad_ventas || 0;
    }

    document.getElementById('total-efectivo').innerText = `$${formatearMoneda(resumen.total_efectivo || 0)}`;
    document.getElementById('total-transferencia').innerText = `$${formatearMoneda(resumen.total_transferencia || 0)}`;
    document.getElementById('total-tarjeta').innerText = `$${formatearMoneda(resumen.total_tarjeta || 0)}`;
}

function actualizarFiltrosCruzados(productosTraidos, catSeleccionada, provSeleccionado) {
    let categoriasFiltradas = [...todasLasCategorias];
    let proveedoresFiltrados = [...todosLosProveedores];

    const catsConVentas = new Set();
    const provsConVentas = new Set();
    
    if (productosTraidos && productosTraidos.length > 0) {
        productosTraidos.forEach(p => {
            if (p.categoria) catsConVentas.add(p.categoria.trim().toLowerCase());
            if (p.proveedor) provsConVentas.add(p.proveedor.trim().toLowerCase());
        });
    }

    if (catSeleccionada !== '' && provSeleccionado === '') {
        proveedoresFiltrados = todosLosProveedores.filter(p => {
            const nombreProv = p.nombre.trim().toLowerCase();
            return provsConVentas.has(nombreProv);
        });
    }

    if (provSeleccionado !== '' && catSeleccionada === '') {
        categoriasFiltradas = todasLasCategorias.filter(c => {
            const nombreCat = c.nombre_categoria.trim().toLowerCase();
            return catsConVentas.has(nombreCat);
        });
    }

    if (catSeleccionada !== '' && provSeleccionado !== '') {
        const nombreCatElegida = todasLasCategorias.find(c => Number(c.id_categoria) === Number(catSeleccionada))
                                    ?.nombre_categoria.trim().toLowerCase();
        proveedoresFiltrados = todosLosProveedores.filter(p => {
            const nombreProv = p.nombre.trim().toLowerCase();
            return Number(p.id_proveedor) === Number(provSeleccionado) || provsConVentas.has(nombreProv);
        });
    }

    actualizarSelectoresOpciones(categoriasFiltradas, proveedoresFiltrados, catSeleccionada, provSeleccionado);
}

function actualizarSelectoresOpciones(listaCats, listaProvs, catSel = '', provSel = '') {
    const selectCat = document.getElementById('filtro-categoria');
    const selectProv = document.getElementById('filtro-proveedor');

    let htmlCats = '<option value="">Todas las categorías</option>';
    htmlCats += listaCats.map(c => {
        const selected = Number(c.id_categoria) === Number(catSel) ? 'selected' : '';
        return `<option value="${c.id_categoria}" ${selected}>${c.nombre_categoria}</option>`;
    }).join('');
    selectCat.innerHTML = htmlCats;

    let htmlProvs = '<option value="">Todos los proveedores</option>';
    htmlProvs += listaProvs.map(p => {
        const selected = Number(p.id_proveedor) === Number(provSel) ? 'selected' : '';
        return `<option value="${p.id_proveedor}" ${selected}>${p.nombre}</option>`;
    }).join('');
    selectProv.innerHTML = htmlProvs;

    $('#filtro-categoria, #filtro-proveedor').select2({ 
        width: '100%', 
        theme: 'bootstrap-5' 
    });
}

document.getElementById('btn-limpiar').addEventListener('click', () => {
    const d = new Date();
    const hoy = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

    document.getElementById('filtro-desde').value = hoy;
    document.getElementById('filtro-hasta').value = hoy;
    document.getElementById('filtro-hora-desde').value = '';
    document.getElementById('filtro-hora-hasta').value = '';

    $('#filtro-categoria').val('').trigger('change.select2');
    $('#filtro-proveedor').val('').trigger('change.select2');

    cargarReporte();
});

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});

document.addEventListener('DOMContentLoaded', async () => {
    const d = new Date();
    const hoy = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

    document.getElementById('filtro-desde').value = hoy;
    document.getElementById('filtro-hasta').value = hoy;

    flatpickr("#filtro-hora-desde", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        onChange: cargarReporte
    });

    flatpickr("#filtro-hora-hasta", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        onChange: cargarReporte
    });

    $('#filtro-categoria, #filtro-proveedor').on('change', function (e) {
        if (e.originalEvent || e.target === document.activeElement || $(this).data('select2').isOpen()) {
            cargarReporte();
        }
    });

    document.getElementById('filtro-desde').addEventListener('change', cargarReporte);
    document.getElementById('filtro-hasta').addEventListener('change', cargarReporte);

    await cargarFiltros();
    await cargarReporte();
});