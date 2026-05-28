const db = require('../config/db');

const productosController = {

    obtenerTodos: async (req, res) => {
        const { estado = "activos" } = req.query;

        let filtro = "WHERE p.activo = true";

        if (estado === "eliminados") {
            filtro = "WHERE p.activo = false";
        }

        if (estado === "todos") {
            filtro = "";
        }

        try {
            const result = await db.query(`
                SELECT 
                    p.*,
                    TO_CHAR(p.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
                    c.nombre_categoria,
                    pr.nombre AS nombre_proveedor
                FROM productos p 
                LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
                LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                ${filtro}
                ORDER BY p.nombre ASC
            `);

            res.json(result.rows);

        } catch (error) {
            res.status(500).json({
                error: "Error al obtener productos",
                details: error.message
            });
        }
    },

    obtenerPorCodigo: async (req, res) => {
        const { codigo } = req.params;

        try {
            const result = await db.query(`
                SELECT 
                    p.*,
                    TO_CHAR(p.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
                    c.nombre_categoria,
                    pr.nombre AS nombre_proveedor
                FROM productos p
                LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
                WHERE p.codigo_barras = $1
            `, [codigo]);

            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    message: "Producto no encontrado" 
                });
            }

            res.json(result.rows[0]);

        } catch (error) {
            res.status(500).json({ 
                error: "Error al buscar producto", 
                details: error.message 
            });
        }
    },

    crear: async (req, res) => {
        let {
            codigo_barras,
            nombre,
            id_categoria,
            id_proveedor,
            precio_costo,
            precio_venta,
            stock,
            stock_minimo,
            es_pesable,
            fecha_vencimiento
        } = req.body;

        try {
            codigo_barras = codigo_barras?.trim();

            if (!codigo_barras) {
                codigo_barras = null;
            }

            fecha_vencimiento = fecha_vencimiento || null;

            if (id_proveedor) {
                const prov = await db.query(
                    `SELECT id_proveedor 
                    FROM proveedores 
                    WHERE id_proveedor = $1 
                    AND activo = true`,
                    [id_proveedor]
                );

                if (prov.rows.length === 0) {
                    return res.status(400).json({
                        error: "Proveedor inválido"
                    });
                }
            }

            const sql = `
                INSERT INTO productos
                (
                    codigo_barras,
                    nombre,
                    id_categoria,
                    id_proveedor,
                    precio_costo,
                    precio_venta,
                    stock,
                    stock_minimo,
                    es_pesable,
                    fecha_vencimiento
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id_producto
            `;

            const result = await db.query(sql, [
                codigo_barras,
                nombre,
                id_categoria,
                id_proveedor || null,
                precio_costo,
                precio_venta,
                stock,
                stock_minimo,
                es_pesable,
                fecha_vencimiento
            ]);

            res.json({
                message: "Producto creado con éxito",
                id: result.rows[0].id_producto
            });

        } catch (error) {
            res.status(500).json({
                error: "Error al crear producto",
                details: error.message
            });
        }
    },

    actualizar: async (req, res) => {
        const { id } = req.params;

        let {
            nombre,
            id_categoria,
            id_proveedor,
            precio_costo,
            precio_venta,
            stock,
            stock_minimo,
            es_pesable,
            fecha_vencimiento
        } = req.body;

        try {
            fecha_vencimiento = fecha_vencimiento || null;

            if (id_proveedor) {
                const prov = await db.query(
                    `SELECT id_proveedor 
                    FROM proveedores 
                    WHERE id_proveedor = $1 
                    AND activo = true`,
                    [id_proveedor]
                );

                if (prov.rows.length === 0) {
                    return res.status(400).json({
                        error: "Proveedor inválido"
                    });
                }
            }

            const sql = `
                UPDATE productos
                SET nombre = $1,
                    id_categoria = $2,
                    id_proveedor = $3,
                    precio_costo = $4,
                    precio_venta = $5,
                    stock = $6,
                    stock_minimo = $7,
                    es_pesable = $8,
                    fecha_vencimiento = $9
                WHERE id_producto = $10
            `;

            await db.query(sql, [
                nombre,
                id_categoria,
                id_proveedor || null,
                precio_costo,
                precio_venta,
                stock,
                stock_minimo,
                es_pesable,
                fecha_vencimiento,
                id
            ]);

            res.json({
                message: "Producto actualizado correctamente"
            });

        } catch (error) {
            res.status(500).json({
                error: "Error al actualizar",
                details: error.message
            });
        }
    },

    eliminar: async (req, res) => {
        const { id } = req.params;

        try {
            await db.query(
                'UPDATE productos SET activo = false WHERE id_producto = $1',
                [id]
            );

            res.json({
                message: "Producto dado de baja correctamente"
            });

        } catch (error) {
            res.status(500).json({
                error: "Error al eliminar",
                details: error.message
            });
        }
    },

    actualizarPreciosMasivo: async (req, res) => {
        const { porcentaje, id_categoria, id_proveedor } = req.body;

        if (!porcentaje || isNaN(porcentaje)) {
            return res.status(400).json({ error: "Porcentaje inválido" });
        }

        try {
            let condiciones = [];
            let params = [];
            let paramIndex = 2; // $1 será porcentaje

            if (id_categoria) {
                condiciones.push(`id_categoria = $${paramIndex}`);
                params.push(id_categoria);
                paramIndex++;
            }

            if (id_proveedor) {
                condiciones.push(`id_proveedor = $${paramIndex}`);
                params.push(id_proveedor);
                paramIndex++;
            }

            const where = condiciones.length
                ? `WHERE ${condiciones.join(" AND ")}`
                : "";

            const sql = `
                UPDATE productos 
                SET precio_venta = precio_venta * (1 + $1 / 100)
                ${where}
            `;

            await db.query(sql, [porcentaje, ...params]);

            res.json({ message: "Precios actualizados correctamente" });

        } catch (error) {
            res.status(500).json({
                error: "Error al actualizar precios",
                details: error.message
            });
        }
    },

    reactivar: async (req, res) => {
        const { id } = req.params;

        try {
            await db.query(
                'UPDATE productos SET activo = true WHERE id_producto = $1',
                [id]
            );

            res.json({
                message: "Producto reactivado correctamente"
            });

        } catch (error) {
            res.status(500).json({
                error: "Error al reactivar producto",
                details: error.message
            });
        }
    },
};

module.exports = productosController;