// =========================================================================
// CONFIGURACIÓN CENTRALIZADA DE LA TIENDA
// =========================================================================

module.exports = {
    // Datos del Empleado Administrativo (facturación)
    admin: {
        id_empleado: 'EM-0001',
        nombre: 'Administrador General',
        cargo: 'Área Digital y Ventas',
        identificador: 'PER-01'
    },

    // Datos de la Tienda (sucursal)
    tienda: {
        id_tienda: 'L-12432',
        nombre: 'Niñas Shop',
        ubicacion: 'Managua, Nicaragua',
        telefono: '+505 XXXX-XXXX'
    },

    // Cliente por defecto (cuando no hay login)
    cliente_defecto: {
        id_cliente: 1,
        nombre: 'Cliente Visitante'
    },

    // Configuración de la aplicación
    app: {
        puerto: 5000,
        nombre_tienda: 'Ninas Shop',
        recargo_envio: 50.00,  // Recargo fijo por envío (C$)
        moneda: 'C$'
    },

    // Credenciales de Gmail (nodemailer)
    email: {
        usuario: 'arroz@gmail.com',
        contrasena: 'leidubgdznsalfng',
        destinatario_alertas: 'arroz@gmail.com'
    },

    // Base de datos
    database: {
        host: 'localhost',
        user: 'root',
        password: 'arroz234',
        database: 'arroz'
    }
};