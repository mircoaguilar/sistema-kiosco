const formLogin = document.getElementById('form-login');
const alertContainer = document.getElementById('alert-container');
const btnEntrar = document.getElementById('btn-entrar');

// Función para mostrar alertas de Bootstrap
function mostrarAlerta(mensaje, tipo) {
    alertContainer.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Auto-eliminar la alerta después de 4 segundos
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 4000);
}

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value.trim();

    // Validación manual
    if (!usuario || !password) {
        mostrarAlerta('Por favor, completa todos los campos.', 'warning');
        return;
    }

    // Bloquear botón mientras carga
    btnEntrar.disabled = true;
    btnEntrar.innerText = 'Cargando...';

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('jwt_token', data.token); 
            localStorage.setItem('id_usuario', data.user.id);
            
            mostrarAlerta('¡Éxito! Redirigiendo...', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            mostrarAlerta(data.message || 'Error en las credenciales', 'danger');
            btnEntrar.disabled = false;
            btnEntrar.innerText = 'Entrar';
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('No hay conexión con el servidor.', 'danger');
        btnEntrar.disabled = false;
        btnEntrar.innerText = 'Entrar';
    }
});