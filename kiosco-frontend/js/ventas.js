const API_URL = 'http://localhost:3000/api';
let carrito = [];
const token = localStorage.getItem('jwt_token');
const idUsuario = localStorage.getItem('id_usuario'); // Asegurate de guardarlo en el login

// Referencias al DOM
const inputCodigo = document.getElementById('input-codigo');
const tablaCarrito = document.getElementById('tabla-carrito');
const totalVentaHTML = document.getElementById('total-venta');
const btnEfectivo = document.getElementById('btn-pago-efectivo');
const btnDigital = document.getElementById('btn-pago-digital');

// --- 1. Lógica de Escaneo ---
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
        alert("Producto no encontrado");
    }
}

// --- 2. Manejo del Carrito ---
function agregarAlCarrito(prod) {
    // IMPORTANTE: El backend usa 'id_producto', mapeamos los datos aquí
    const index = carrito.findIndex(item => item.id_producto === prod.id_producto);

    if (index !== -1) {
        carrito[index].cantidad++;
    } else {
        carrito.push({
            id_producto: prod.id_producto,
            nombre: prod.nombre,
            precio_unitario: parseFloat(prod.precio), // El backend espera precio_unitario
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
                <td>${item.nombre}</td>
                <td>$${item.precio_unitario.toFixed(2)}</td>
                <td>${item.cantidad}</td>
                <td class="fw-bold">$${subtotal.toFixed(2)}</td>
                <td><button class="btn btn-sm btn-danger" onclick="eliminar(${index})">X</button></td>
            </tr>`;
    });
    totalVentaHTML.innerText = `$${total.toFixed(2)}`;
}

window.eliminar = (i) => { carrito.splice(i, 1); renderizar(); };

// --- 3. Lógica de Finalizar Venta (Checkout) ---

// Función genérica para enviar la venta
async function procesarVenta(metodo) {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const totalCalculado = carrito.reduce((acc, item) => acc + (item.precio_unitario * item.cantidad), 0);

    // Armamos el objeto exacto que pide el controlador
    const datosVenta = {
        id_usuario: parseInt(idUsuario), 
        metodo_pago: metodo,
        total_venta: totalCalculado,
        items: carrito // El array ya tiene id_producto, cantidad y precio_unitario
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
            carrito = []; // Limpiamos carrito
            renderizar();
            inputCodigo.focus();
        } else {
            alert("Error: " + res.error);
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión con el servidor");
    }
}

// Eventos de los botones de pago
btnEfectivo.addEventListener('click', () => procesarVenta('Efectivo'));
btnDigital.addEventListener('click', () => procesarVenta('Digital'));

// Mantener el foco
document.addEventListener('click', () => inputCodigo.focus());