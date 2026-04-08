const API_URL = 'http://localhost:3000/api';
let carrito = [];

const token = localStorage.getItem('jwt_token');
const idUsuario = localStorage.getItem('id_usuario'); 
const nombreUsuario = localStorage.getItem('nombre_usuario') || 'Cajero'; 

const inputCodigo = document.getElementById('input-codigo');
const tablaCarrito = document.getElementById('tabla-carrito');
const totalVentaHTML = document.getElementById('total-venta');
const btnEfectivo = document.getElementById('btn-pago-efectivo');
const btnDigital = document.getElementById('btn-pago-digital');
const btnLogout = document.getElementById('btn-logout');
const nombreVendedorSpan = document.getElementById('nombre-vendedor');

nombreVendedorSpan.innerText = `Vendedor: ${nombreUsuario}`;

inputCodigo.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const codigo = inputCodigo.value.trim();
        if (codigo) await buscarProducto(codigo);
        inputCodigo.value = '';
    }
});

async function buscarProducto(codigo) {
    try {
        const response = await fetch(`${API_URL}/productos/${codigo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("No encontrado");
        
        const producto = await response.json();
        agregarAlCarrito(producto);
    } catch (error) {
        alert("Producto no encontrado o error de red");
    }
}

function agregarAlCarrito(prod) {
    const index = carrito.findIndex(item => item.id_producto === prod.id_producto);

    const precioNumerico = parseFloat(prod.precio_venta) || 0;

    if (index !== -1) {
        carrito[index].cantidad++;
    } else {
        carrito.push({
            id_producto: prod.id_producto,
            nombre: prod.nombre,
            precio_unitario: precioNumerico, 
            cantidad: 1
        });
    }
    renderizar();
}

function renderizar() {
    tablaCarrito.innerHTML = '';
    let total = 0;

    carrito.forEach((item, index) => {
        const subtotal = item.precio_unitario * item.cantidad;
        total += subtotal;

        tablaCarrito.innerHTML += `
            <tr>
                <td class="fw-bold">${item.nombre}</td>
                <td>$${item.precio_unitario.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <button class="btn btn-sm btn-light border" onclick="modificarCantidad(${index}, -1)">-</button>
                        <span class="mx-3 fw-bold">${item.cantidad}</span>
                        <button class="btn btn-sm btn-light border" onclick="modificarCantidad(${index}, 1)">+</button>
                    </div>
                </td>
                <td class="fw-bold text-success">$${subtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td>
                    <button class="btn btn-danger btn-sm fw-bold" onclick="eliminar(${index})" title="Eliminar">
                        <i class="bi bi-x-circle"></i> Quitar
                    </button>
                </td>
            </tr>`;
    });

    totalVentaHTML.innerText = `$${total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
}

window.modificarCantidad = (index, valor) => {
    carrito[index].cantidad += valor;

    if (carrito[index].cantidad <= 0) {
        eliminar(index);
    } else {
        renderizar();
    }
};


window.eliminar = (i) => { 
    carrito.splice(i, 1); 
    renderizar(); 
};

async function procesarVenta(metodo) {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const totalCalculado = carrito.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0);
    const imprimirTicket = document.getElementById('check-ticket').checked;

    const datosVenta = {
        id_usuario: parseInt(idUsuario), 
        metodo_pago: metodo,
        total_venta: totalCalculado,
        imprimir_ticket: imprimirTicket, 
        items: carrito 
    };

    try {
        const response = await fetch(`${API_URL}/ventas`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosVenta)
        });

        const res = await response.json();

        if (response.ok) {
            alert(`¡Venta #${res.id_venta} exitosa!`);
            carrito = []; 
            renderizar();
            inputCodigo.focus(); 
        } else {
            alert("Error: " + (res.error || "No se pudo procesar"));
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión con el servidor");
    }
}

btnEfectivo.addEventListener('click', () => procesarVenta('Efectivo'));
btnDigital.addEventListener('click', () => procesarVenta('Digital'));

btnLogout.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});

inputCodigo.focus();

document.addEventListener('keydown', (e) => {
    if (document.activeElement === inputCodigo) return;

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    inputCodigo.focus();
});