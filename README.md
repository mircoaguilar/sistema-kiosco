# Sistema de Gestión Comercial

Sistema web de gestión comercial desarrollado para un comercio minorista. Permite administrar ventas, stock, productos, proveedores, usuarios y sesiones de caja, integrando además reportes de ventas e impresión de tickets.

El proyecto fue construido como una solución orientada a un caso de uso real, con foco en la organización del flujo de ventas, el control operativo diario y la administración de información comercial.

## Demo

* **Demo:** [Abrir sistema](https://sistema-kiosco-web-tasting.onrender.com/login.html)
* **Usuario:** `demo.vendedor`
* **Contraseña:** `demo123`

> La cuenta de demostración tiene permisos limitados para recorrer las principales funcionalidades del sistema sin acceso a configuraciones administrativas ni modificaciones críticas de datos.

## Funcionalidades principales

* Autenticación de usuarios.
* Sistema de autorización con roles y permisos.
* Punto de venta (POS) para registrar ventas.
* Control de stock de productos en tiempo real.
* Gestión de productos y proveedores.
* Registro de ventas con distintos métodos de pago.
* Historial de ventas con detalle de operaciones.
* Corrección y anulación de ventas.
* Gestión de sesiones de caja.
* Reportes de ventas y ranking de productos más vendidos.
* Impresión de tickets.

## Stack tecnológico

### Backend

* Node.js
* Express.js

### Frontend

* HTML
* CSS
* JavaScript
* Bootstrap

### Base de datos

* PostgreSQL

### Herramientas

* Git
* GitHub
* Postman
* Render

## Estructura del proyecto

```bash
sistema-kiosco/
├── backend/
└── kiosco-frontend/
```

* **backend/**: API REST, lógica de negocio, autenticación, gestión de ventas, stock, usuarios, caja y reportes.
* **kiosco-frontend/**: interfaz web del sistema y consumo de la API.

## Estado del proyecto

Proyecto funcional desarrollado sobre un caso de uso real y utilizado como base para seguir incorporando mejoras vinculadas a experiencia de usuario, validaciones, reportes y robustez general del sistema.
