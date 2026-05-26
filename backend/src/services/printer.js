const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("=== INICIANDO SISTEMA DE IMPRESIÓN ===");

const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: '\\\\127.0.0.1\\POS',
    width: 32
});

async function imprimirTicket(venta) {

    console.log("====================================");
    console.log("INICIANDO IMPRESIÓN DE TICKET");
    console.log("====================================");

    try {

        console.log("Venta recibida:");
        console.log(JSON.stringify(venta, null, 2));

        printer.clear();
        console.log("Buffer limpiado");

        printer.alignCenter();
        printer.setTextDoubleHeight();
        printer.println("ELI MINI MARKET");

        printer.setTextNormal();
        printer.println("Barrio hipólito Yrigoyen Mzn 62 casa 15");
        printer.println("Formosa, Argentina");

        printer.drawLine();

        console.log("Cabecera agregada");

        printer.alignLeft();

        const ahora = new Date();

        const fecha = new Date().toLocaleString('es-AR', {
            hour12: false
        });

        console.log("Fecha generada:", fecha);

        printer.println(`Fecha: ${fecha}`);

        printer.println(
            `TICKET Nro: ${String(venta.id_venta).padStart(6, '0')}`
        );

        printer.drawLine();

        console.log("Procesando items...");

        venta.items.forEach((item, index) => {

            console.log(`ITEM ${index + 1}:`);
            console.log(item);

            const nombreProducto = (
                item.descripcion_manual || item.nombre
            ).toUpperCase().substring(0, 31);

            printer.println(nombreProducto);

            const cantYPrecio =
                `${item.cantidad} x $${item.precio_unitario}`;

            const subtotal =
                `$${(item.cantidad * item.precio_unitario).toFixed(2)}`;

            const espacios =
                32 - cantYPrecio.length - subtotal.length;

            printer.println(
                cantYPrecio +
                " ".repeat(Math.max(1, espacios)) +
                subtotal
            );
        });

        console.log("Items procesados correctamente");

        printer.drawLine();

        printer.alignRight();

        printer.setTextDoubleHeight();
        printer.setTextDoubleWidth();

        console.log("TOTAL:", venta.total_venta);

        printer.println(`TOTAL: $${venta.total_venta}`);

        printer.setTextNormal();

        if (
            venta.monto_pagado &&
            venta.monto_pagado > venta.total_venta
        ) {

            console.log("Monto pagado:", venta.monto_pagado);

            const vuelto =
                venta.monto_pagado - venta.total_venta;

            console.log("Vuelto:", vuelto);

            printer.println(`PAGO CON: $${venta.monto_pagado}`);
            printer.println(`VUELTO: $${vuelto.toFixed(2)}`);
        }

        printer.alignCenter();

        printer.newLine();
        printer.println("¡GRACIAS POR SU COMPRA!");

        printer.newLine();
        printer.newLine();
        printer.newLine();

        printer.cut();

        console.log("Ticket generado");

        const buffer = printer.getBuffer();

        console.log("Buffer generado");
        console.log("Tamaño buffer:", buffer.length);

        const tempFile = path.join(__dirname, 'ticket.bin');

        console.log("Archivo temporal:");
        console.log(tempFile);

        fs.writeFileSync(tempFile, buffer);

        console.log("Archivo ticket.bin creado");

        console.log("Verificando existencia archivo:");

        if (fs.existsSync(tempFile)) {
            console.log("OK -> archivo existe");
        } else {
            console.log("ERROR -> archivo NO existe");
        }

        const printerSharedName = "POS";

        const command =
            `cmd /c copy /b "${tempFile}" "\\\\127.0.0.1\\${printerSharedName}"`;

        console.log("Comando de impresión:");
        console.log(command);

        exec(command, (error, stdout, stderr) => {

            console.log("====================================");
            console.log("RESPUESTA DEL COMANDO");
            console.log("====================================");

            console.log("STDOUT:");
            console.log(stdout);

            console.log("STDERR:");
            console.log(stderr);

            if (error) {

                console.log("====================================");
                console.log("ERROR DE IMPRESIÓN");
                console.log("====================================");

                console.error(error);

                console.log("CODE:");
                console.log(error.code);

                console.log("MESSAGE:");
                console.log(error.message);

                console.log("STACK:");
                console.log(error.stack);

            } else {

                console.log("====================================");
                console.log("IMPRESIÓN EXITOSA");
                console.log("====================================");

                console.log(
                    "Ticket enviado correctamente a la impresora."
                );

                setTimeout(() => {

                    console.log("Eliminando archivo temporal...");

                    if (fs.existsSync(tempFile)) {

                        fs.unlinkSync(tempFile);

                        console.log("Archivo eliminado");
                    }

                }, 2000);
            }
        });

        printer.clear();

        console.log("Proceso finalizado");

    } catch (error) {

        console.log("====================================");
        console.log("ERROR GENERAL");
        console.log("====================================");

        console.error(error);

        console.log("MESSAGE:");
        console.log(error.message);

        console.log("STACK:");
        console.log(error.stack);
    }
}

module.exports = { imprimirTicket };