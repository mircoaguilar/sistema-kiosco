const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: 'usb', 
    width: 32
});

async function imprimirTicket(venta) {
    try {
        printer.clear();

        printer.alignCenter();
        printer.println("ELI MINI MARKET");

        printer.setTextNormal();
        printer.println("Barrio hipólito Yrigoyen Mz 62 casa 15");
        printer.println("Formosa, Argentina");
        printer.drawLine();

        printer.alignLeft();

        printer.println(`TICKET Nro: ${String(venta.id_venta).padStart(6, '0')}`);
        printer.println(`Fecha: ${new Date().toLocaleString()}`);

        printer.drawLine();

        venta.items.forEach(item => {
            const nombre = (item.descripcion_manual || item.nombre)
                .toUpperCase()
                .substring(0, 31);

            const linea = `${item.cantidad} x $${item.precio_unitario}`;
            const subtotal = `$${(item.cantidad * item.precio_unitario).toFixed(2)}`;

            const espacios = 32 - linea.length - subtotal.length;

            printer.println(linea + " ".repeat(Math.max(1, espacios)) + subtotal);
        });

        printer.drawLine();

        printer.alignRight();
        printer.println(`TOTAL: $${venta.total_venta}`);

        if (venta.monto_pagado && venta.monto_pagado > venta.total_venta) {
            printer.println(`PAGO: $${venta.monto_pagado}`);
            printer.println(`VUELTO: $${(venta.monto_pagado - venta.total_venta).toFixed(2)}`);
        }

        printer.cut();

        await printer.execute();

        console.log("Ticket impreso OK");

    } catch (error) {
        console.error("Error impresión:", error);
    }
}

module.exports = { imprimirTicket };