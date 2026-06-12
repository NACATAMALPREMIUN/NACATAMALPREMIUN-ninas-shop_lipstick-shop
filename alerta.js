const nodemailer = require('nodemailer');

// 1. Configurar el puente de conexión seguro con Gmail
const transportador = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'arroz@gmail.com',
        pass: 'leidubgdznsalfng' // Recuerda verificar que estas 16 letras sean tu clave de aplicación actual
    }
});

// 2. Capturar las variables enviadas desde el archivo .BAT (Argumentos de consola)
// process.argv[2] recibe %BASE_DATOS% y process.argv[3] recibe %DETALLE_ERROR%
const baseDatos = process.argv[2] || "Ninas_Shop";
const detalleError = process.argv[3] || "No se especificó el detalle técnico del error.";

// Generar fecha y hora exactas del momento del fallo
const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

// 3. Diseño visual estilizado en HTML nativo (Perfecto para Gmail)
const diseñoHTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #dcdcdc; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
    <div style="background-color: #d9534f; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 22px;">⚠️ ALERTA CRÍTICA: RESPALDO FALLIDO</h2>
    </div>
    <div style="padding: 20px; background-color: #f9f9f9; color: #333333; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Hola Administrador,</p>
        <p style="font-size: 15px;">El respaldo automático programado ha detectado un fallo crítico en el sistema.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 140px; color: #555555;">Base de Datos:</td>
                <td style="color: #d9534f; font-weight: bold;">${baseDatos}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #555555;">Fecha del Evento:</td>
                <td>${fecha}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #555555;">Hora del Evento:</td>
                <td>${hora} (Hora del Servidor)</td>
            </tr>
        </table>
        
        <div style="background-color: #ffffff; border-left: 5px solid #d9534f; padding: 15px; margin: 20px 0; font-family: 'Courier New', monospace; font-size: 13px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05); white-space: pre-wrap; word-break: break-all;">
            <strong style="color: #d9534f;">Detalle técnico del error:</strong><br><br>${detalleError}
        </div>
        
        <p style="font-size: 14px; color: #666666; margin-bottom: 0;">Por favor, revise el estado del servicio de MySQL y el espacio de almacenamiento de inmediato.</p>
    </div>
    <div style="background-color: #eaeaea; color: #777777; text-align: center; padding: 12px; font-size: 12px; border-top: 1px solid #dcdcdc;">
        Este es un reporte automático generado por el motor Node.js. No responda a este mensaje.
    </div>
</div>
`;

// 4. Parámetros del envío
const opcionesCorreo = {
    from: 'arroz@gmail.com',
    to: 'arroz@gmail.com',
    subject: `CRITICO: Alerta de Fallo en Base de Datos MySQL (${fecha})`,
    html: diseñoHTML // Habilita la renderización visual en Gmail
};

// 5. Ejecutar el envío hacia los servidores de Google
console.log("[Node.js] Conectando con Gmail...");
transportador.sendMail(opcionesCorreo, (error, info) => {
    if (error) {
        console.error("❌ [Node.js] Error al enviar el correo:", error.message);
        process.exit(1); // Termina con código de error
    }
    console.log("✅ [Node.js] ¡Alerta visual enviada con éxito a Gmail!");
    console.log("ID del mensaje:", info.messageId);
    process.exit(0); // Termina exitosamente
});