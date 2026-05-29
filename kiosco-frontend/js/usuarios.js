(function verificarSesion() {
    if (!localStorage.getItem('jwt_token')) {
        window.location.href = 'login.html';
    }
})();

const API_URL = window.APP_CONFIG.API_URL;
const token = localStorage.getItem('jwt_token');
const nombreUsuario = localStorage.getItem('nombre_usuario') || 'Administrador';
const rolUsuario = localStorage.getItem('rol');
if (rolUsuario !== 'administrador') {
    document.getElementById('menu-usuarios')?.remove();
}

if (rolUsuario !== 'administrador') {
    window.location.href = 'index.html';
}

document.getElementById('nombre-vendedor').innerText = `Administrador: ${nombreUsuario}`;

const tablaUsuarios = document.getElementById('tabla-usuarios-body');

let usuariosCache = [];
let accionPendiente = null;

const modalUsuario = new bootstrap.Modal(document.getElementById('modalUsuario'));
const modalConfirm = new bootstrap.Modal(document.getElementById('modalConfirm'));

async function cargarUsuarios() {
    try {
        const res = await fetch(`${API_URL}/usuarios`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error();

        const usuarios = await res.json();

        usuariosCache = usuarios;

        renderUsuarios(usuarios);

    } catch (error) {
        console.error(error);

        tablaUsuarios.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-4">
                    Error al cargar usuarios
                </td>
            </tr>
        `;
    }
}

function renderUsuarios(usuarios) {
    if (!usuarios || usuarios.length === 0) {
        tablaUsuarios.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    No hay usuarios registrados
                </td>
            </tr>
        `;
        return;
    }

    tablaUsuarios.innerHTML = usuarios.map(usuario => `
        <tr>
            <td>${usuario.id_usuario}</td>
            <td class="fw-bold">${usuario.nombre_completo}</td>
            <td>${usuario.usuario}</td>
            <td>
                <span class="badge ${usuario.rol === 'administrador' ? 'bg-dark' : 'bg-primary'}">
                    ${usuario.rol}
                </span>
            </td>
            <td>
               <span class="badge ${usuario.estado ? 'bg-success' : 'bg-danger'}">
                    ${usuario.estado ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>${new Date(usuario.fecha_creacion).toLocaleDateString()}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1"
                    onclick="abrirEditarUsuario(${usuario.id_usuario})">
                    <i class="bi bi-pencil-fill"></i>
                </button>

                <button class="btn btn-sm btn-outline-${usuario.estado ? 'danger' : 'success'}"
                    onclick="confirmarCambioEstado(${usuario.id_usuario}, ${usuario.estado})">
                    <i class="bi ${usuario.estado ? 'bi-person-x-fill' : 'bi-person-check-fill'}"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function abrirModalNuevo() {
    document.getElementById('modalTitulo').innerText = 'Nuevo Usuario';
    document.getElementById('form-usuario').reset();
    document.getElementById('id-usuario').value = '';
    document.getElementById('grupoEstado').style.display = 'none';

    modalUsuario.show();
}

async function abrirEditarUsuario(id) {
    try {
        const res = await fetch(`${API_URL}/usuarios/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error();

        const usuario = await res.json();

        document.getElementById('modalTitulo').innerText = 'Editar Usuario';
        document.getElementById('id-usuario').value = usuario.id_usuario;
        document.getElementById('nombre_completo').value = usuario.nombre_completo;
        document.getElementById('usuario').value = usuario.usuario;
        document.getElementById('password').value = '';
        document.getElementById('rol').value = usuario.rol;
        document.getElementById('estado').value = usuario.estado;

        document.getElementById('grupoEstado').style.display = 'block';

        modalUsuario.show();

    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar usuario', 'danger');
    }
}

async function guardarUsuario(e) {
    e.preventDefault();

    const id = document.getElementById('id-usuario').value;

    const payload = {
        nombre_completo: document.getElementById('nombre_completo').value,
        usuario: document.getElementById('usuario').value,
        password: document.getElementById('password').value,
        rol: document.getElementById('rol').value
    };

    if (id) {
        payload.estado = parseInt(document.getElementById('estado').value);
    }

    try {
        const res = await fetch(
            `${API_URL}/usuarios${id ? `/${id}` : ''}`,
            {
                method: id ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            }
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Error al guardar usuario');
        }

        mostrarToast(data.message, 'success');

        modalUsuario.hide();

        await cargarUsuarios();

    } catch (error) {
        console.error(error);
        mostrarToast(error.message, 'danger');
    }
}

function confirmarCambioEstado(id, estadoActual) {
    const nuevoEstado = estadoActual == 1 ? 0 : 1;

    document.getElementById('modalConfirmMsg').innerText =
        `¿Seguro que deseas ${nuevoEstado === 1 ? 'activar' : 'desactivar'} este usuario?`;

    accionPendiente = async () => {
        try {
            const res = await fetch(`${API_URL}/usuarios/${id}/estado`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    estado: nuevoEstado
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al cambiar estado');
            }

            mostrarToast(data.message, 'success');

            modalConfirm.hide();

            await cargarUsuarios();

        } catch (error) {
            console.error(error);
            mostrarToast(error.message, 'danger');
        }
    };

    modalConfirm.show();
}

function ejecutarAccionPendiente() {
    if (accionPendiente) {
        accionPendiente();
    }
}

function filtrarUsuarios() {
    const texto = document.getElementById('buscar-usuario').value.toLowerCase();
    const rol = document.getElementById('filtro-rol').value;
    const estado = document.getElementById('filtro-estado').value;

    const filtrados = usuariosCache.filter(usuario => {
        const coincideTexto =
            usuario.nombre_completo.toLowerCase().includes(texto) ||
            usuario.usuario.toLowerCase().includes(texto);

        const coincideRol = !rol || usuario.rol === rol;
        const coincideEstado =
        estado === '' ||
        usuario.estado.toString() === (estado === '1' ? 'true' : 'false');

        return coincideTexto && coincideRol && coincideEstado;
    });

    renderUsuarios(filtrados);
}

function mostrarToast(mensaje, tipo = 'success') {
    const toastContainer = document.getElementById('toastContainer');

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${tipo} border-0 show mb-2`;

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${mensaje}
            </div>
            <button type="button"
                class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast">
            </button>
        </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

document.getElementById('btnNuevoUsuario').addEventListener('click', abrirModalNuevo);
document.getElementById('form-usuario').addEventListener('submit', guardarUsuario);
document.getElementById('btnConfirmarAccion').addEventListener('click', ejecutarAccionPendiente);

document.getElementById('buscar-usuario').addEventListener('input', filtrarUsuarios);
document.getElementById('filtro-rol').addEventListener('change', filtrarUsuarios);
document.getElementById('filtro-estado').addEventListener('change', filtrarUsuarios);

document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});

document.addEventListener('DOMContentLoaded', async () => {
    await cargarUsuarios();
});