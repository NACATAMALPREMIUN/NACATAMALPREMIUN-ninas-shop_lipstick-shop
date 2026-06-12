import mysql from 'mysql2/promise';

// Configuración de los datos de tu base de datos XAMPP
const configBD = {
    host: 'localhost',
    user: 'root',      // Usuario por defecto de XAMPP
    password: 'arroz234',      // Contraseña configurada
    database: 'arroz' // <-- AQUÍ VA EL NOMBRE REAL DE TU BD
};

async function conectar() {
    try {
        // Crea la conexión con la base de datos
        const conexion = await mysql.createConnection(configBD);
        console.log('🚀 ¡Conectado con éxito a la base de datos MySQL!');
        
        return conexion;
    } catch (error) {
        console.error('❌ Error al intentar conectar a MySQL:', error.message);
    }
}

conectar();