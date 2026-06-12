const express = require('express'); 
const mysql = require('mysql2'); 
const bcrypt = require('bcrypt'); 
const nodemailer = require('nodemailer'); 
const cors = require('cors'); 
const app = express(); 
const path = require('path');
const config = require('./config');

// ========================================================================= 
// CONFIGURACIÓN DE MIDDLEWARES Y SEGURIDAD
// ========================================================================= 
app.use(cors()); 
app.use(express.json()); 

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static(path.join(__dirname)));
console.log('📁 Static files servidos desde:', path.join(__dirname));

// Log de diagnóstico detallado para peticiones entrantes
app.use((req, res, next) => {
    console.log(`➡️ [${new Date().toISOString().slice(11, 19)}] Petición: ${req.method} -> ${req.url}`);
    next();
});

// ========================================================================= 
// 1. CONEXIÓN A LA BASE DE DATOS MYSQL 
// ========================================================================= 
const db = mysql.createConnection(config.database); 

db.connect((err) => { 
    if (err) { 
        console.error("❌ Error crítico conectando a MySQL:", err.message); 
        console.error("Detalles del fallo de conexión:", err.code);
    } else { 
        console.log("✅ Conectado exitosamente a la base de datos MySQL [ninas_shop]"); 
    } 
}); 

// ========================================================================= 
// 2. CONFIGURACIÓN DE GMAIL (NODEMAILER) 
// ========================================================================= 
const transportador = nodemailer.createTransport({ 
    service: 'gmail', 
    auth: { 
        user: config.email.usuario,
        pass: config.email.contrasena
    } 
}); 

// Verificar que el servicio de correo esté arriba al arrancar
transportador.verify((error, success) => {
    if (error) {
        console.error("⚠️ Servidor de correos Nodemailer no está listo:", error.message);
    } else {
        console.log("📧 Servidor de correos listo para enviar alertas y tokens");
    }
});

// ========================================================================= 
// RUTA: REGISTRO RELACIONAL (usuarios_login + cliente)
// ========================================================================= 
app.post('/api/registro', async (req, res) => { 
    const { 
        user, nombre, segundo_nombre, tercer_nombre, 
        apellido, segundo_apellido, telefono, direccion, correo, password 
    } = req.body; 

    if (!user || !nombre || !apellido || !correo || !password) {
        console.warn("⚠️ Intento de registro con campos obligatorios vacíos.");
        return res.status(400).json({ error: "Los campos obligatorios deben ser completados." });
    }
    
    try { 
        const hash = await bcrypt.hash(password, 10); 
        const queryUsuario = 'INSERT INTO usuarios_login (nombre, correo, password_hash, rol) VALUES (?, ?, ?, "user")'; 
        
        db.query(queryUsuario, [user, correo, hash], (errUsuario, resultUsuario) => { 
            if (errUsuario) { 
                console.error("❌ Error en usuarios_login al registrar:", errUsuario.message); 
                return res.status(500).json({ error: "El nombre de usuario o correo electrónico ya se encuentra registrado." }); 
            } 
            
            const nuevoIdUsuario = resultUsuario.insertId;
            const idTiendaDefecto = config.tienda.id_tienda;
            const direccionCliente = direccion || 'Managua, Nicaragua'; 

            const queryCliente = `
                INSERT INTO cliente 
                (primer_nombre, segundo_nombre, tercer_nombre, primer_apellido, segundo_apellido, direccion, telefono, id_tienda, id_usuario) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const valoresCliente = [
                nombre, segundo_nombre || null, tercer_nombre || null,   
                apellido, segundo_apellido || null, direccionCliente, 
                telefono || null, idTiendaDefecto, nuevoIdUsuario 
            ];

            db.query(queryCliente, valoresCliente, (errCliente) => {
                if (errCliente) {
                    console.error("❌ Error en tabla cliente, aplicando Rollback manual:", errCliente.code);
                    db.query('DELETE FROM usuarios_login WHERE id = ?', [nuevoIdUsuario]);
                    return res.status(500).json({ error: "Falló la vinculación relacional del perfil cliente." });
                }
                console.log(`👤 Nuevo cliente registrado indexado con ID Usuario: ${nuevoIdUsuario}`);
                res.json({ mensaje: "¡Usuario web y perfil comercial creados con éxito total! 🎉" }); 
            });
        }); 
    } catch (e) { 
        console.error("❌ Error interno capturado en Catch de Registro:", e);
        res.status(500).json({ error: "Error interno en el servidor al registrar." }); 
    } 
}); 

// ========================================================================= 
// RUTA: LOGIN RELACIONAL CON PROTECCIÓN DE INTENTOS
// ========================================================================= 
app.post('/api/login', (req, res) => { 
    const { correo, password } = req.body; 
    
    if (!correo || !password) {
        return res.status(400).json({ error: "Correo y contraseña requeridos." });
    }

    const query = `
        SELECT u.*, c.id_cliente 
        FROM usuarios_login u
        LEFT JOIN cliente c ON u.id = c.id_usuario
        WHERE u.correo = ?
    `;
    
    db.query(query, [correo], async (err, results) => { 
        if (err) {
            console.error("❌ Error en query de login:", err);
            return res.status(500).json({ error: "Error interno en la base de datos." });
        }

        if (results.length === 0) { 
            console.warn(`🕵️ Intento de acceso fallido: Correo inexistente [${correo}]`);
            return res.status(401).json({ error: "Credenciales incorrectas o el correo no existe." }); 
        } 
        
        const usuario = results[0]; 

        if (usuario.intentos_fallidos >= 3) {
            console.warn(`🔒 Cuenta bloqueada temporalmente por seguridad: ${correo}`);
            return res.status(403).json({ error: "Cuenta bloqueada temporalmente por múltiples intentos fallidos. Revise su correo de alertas." });
        }

        const coincide = await bcrypt.compare(password, usuario.password_hash); 
        
        if (coincide) { 
            db.query('UPDATE usuarios_login SET intentos_fallidos = 0 WHERE id = ?', [usuario.id]); 
            const idClienteDetectado = usuario.id_cliente !== null ? usuario.id_cliente : 1;

            console.log(`🔓 Login exitoso para el usuario: ${usuario.nombre} (Rol: ${usuario.rol})`);
            return res.json({ 
                mensaje: "¡Bienvenido al sistema!", 
                usuario: usuario.nombre, 
                rol: usuario.rol,
                id_cliente: idClienteDetectado 
            }); 
        } else { 
            const nuevosIntentos = usuario.intentos_fallidos + 1; 
            db.query('UPDATE usuarios_login SET intentos_fallidos = ? WHERE id = ?', [nuevosIntentos, usuario.id], () => { 
                console.warn(`⚠️ Contraseña incorrecta para ${correo}. Intento #${nuevosIntentos}`);
                if (nuevosIntentos >= 3) { 
                    console.error(`🚨 Disparando alerta de seguridad por bloqueos a: ${config.email.destinatario_alertas}`);
                    enviarAlertaSeguridad(usuario.correo, usuario.nombre); 
                } 
            }); 
            return res.status(401).json({ error: "Contraseña incorrecta." }); 
        } 
    }); 
}); 

// ========================================================================= 
// RUTA: STOCK -> APUNTA EXACTAMENTE A 'producto'
// ========================================================================= 
app.get('/api/stock', (req, res) => { 
    const query = `
        SELECT 
            p.id_producto AS id, 
            p.id_producto, 
            p.nombre_producto AS nombre, 
            i.stock_actual AS cantidad, 
            p.precio_prod AS precio 
        FROM producto p
        LEFT JOIN inventario i ON p.id_producto = i.id_producto
        ORDER BY p.id_producto ASC
    `; 
    
    db.query(query, (err, resultados) => { 
        if (err) { 
            console.error("❌ Error relacional al consultar tabla producto e inventario:", err.message); 
            return res.status(500).json({ error: "Error al obtener el stock de la base de datos.", detalles: err.message }); 
        } 
        console.log(`📦 Producto e inventario despachados desde la BD. Cantidad: ${resultados.length}`);
        res.json(resultados); 
    }); 
}); 

app.post('/api/stock', (req, res) => { 
    const { nombre, cantidad, precio } = req.body; 
    
    if (!nombre || cantidad === undefined || !precio) {
        return res.status(400).json({ error: "Datos de producto incompletos." });
    }

    const query = 'INSERT INTO producto (nombre_producto, precio_prod) VALUES (?, ?)'; 
    
    db.query(query, [nombre, precio], (err, resultado) => { 
        if (err) { 
            console.error("❌ Error al insertar producto manual en 'producto':", err.message); 
            return res.status(500).json({ error: "Error al registrar el producto en inventario." }); 
        } 
        
        const nuevoIdProd = resultado.insertId;
        const queryInventario = 'INSERT INTO inventario (stock_actual, stock_minimo, id_producto) VALUES (?, 20, ?)';
        
        db.query(queryInventario, [cantidad, nuevoIdProd], (errInv) => {
            if (errInv) {
                console.error("❌ Error inyectando stock inicial relacional:", errInv.message);
                return res.status(500).json({ error: "Producto creado, pero falló el stock base." });
            }
            console.log(`📥 Producto nuevo e inventario creados con éxito. ID: ${nuevoIdProd}`);
            res.json({ mensaje: "¡Producto añadido al inventario con éxito!", id: nuevoIdProd }); 
        });
    }); 
}); 

// ========================================================================= 
// 🔄 RUTA: LISTAR USUARIOS PARA AUDITORÍA
// ========================================================================= 
app.get('/api/usuarios', (req, res) => { 
    const query = 'SELECT id, nombre, correo, rol FROM usuarios_login ORDER BY id ASC'; 
    db.query(query, (err, resultados) => { 
        if (err) { 
            console.error("❌ Error al obtener usuarios:", err.message); 
            return res.status(500).json({ error: "Error al obtener los usuarios registrados." }); 
        } 
        res.json(resultados); 
    }); 
}); 

// ========================================================================= 
// 🧾 RUTA: HISTORIAL DE PAGOS
// ========================================================================= 
app.get('/api/pagos', (req, res) => {
    const query = `
        SELECT f.id_factura, f.fecha_emision, CONCAT(c.primer_nombre, ' ', c.primer_apellido) AS cliente, f.id_pedido, f.total 
        FROM factura f
        LEFT JOIN cliente c ON f.id_cliente = c.id_cliente
        ORDER BY f.fecha_emision DESC
    `;
    db.query(query, (err, resultados) => {
        if (err) {
            console.error("❌ Error relacional avanzado en tabla factura:", err.message);
            return res.status(500).json({ error: "Error en la consulta relacional de pagos." });
        }
        console.log(`🧾 Historial de facturas leído. Registros enviados: ${resultados.length}`);
        res.json(resultados);
    });
});

// ========================================================================= 
// 👔 RUTA CORREGIDA: ENLAZA 'id_area' DIRECTAMENTE DESDE LA TABLA BASE 'empleados (e)'
// ========================================================================= 
app.get('/api/personal', (req, res) => {
    const query = `
        SELECT 
            e.id_empleado, 
            car.nombre_cargo, 
            a.nombre_area, 
            per.id_persona,
            CONCAT(per.primer_nombre, ' ', per.primer_apellido) AS nombre_completo
        FROM empleados e
        INNER JOIN personas per ON e.id_empleado = per.id_empleado
        LEFT JOIN cargos car ON e.cargo_id = car.id_cargo
        LEFT JOIN area a ON e.id_area = a.id_area
        ORDER BY e.id_empleado ASC
    `;
    db.query(query, (err, resultados) => {
        if (err) {
            console.error("❌ Error relacional en cadena completa de empleados y personas:", err.message);
            return res.status(500).json({ error: "Error en la consulta estructural de empleados con identidad." });
        }
        console.log(`👔 Datos de personal y personas unificados con éxito. Registros enviados: ${resultados.length}`);
        res.json(resultados);
    });
});

// ========================================================================= 
// GESTIÓN DE CONTRASEÑAS (TOKENS DE RECUPERACIÓN POR GMAIL)
// ========================================================================= 
app.post('/api/olvide-password', (req, res) => { 
    const { correo } = req.body; 
    
    if (!correo) return res.status(400).json({ error: "El correo es mandatorio." });

    const token = Math.floor(100000 + Math.random() * 900000).toString(); 
    const expiracion = new Date(Date.now() + 15 * 60 * 1000); 
    const query = 'UPDATE usuarios_login SET token_recuperacion = ?, expiracion_token = ? WHERE correo = ?'; 
    
    db.query(query, [token, expiracion, correo], (err, result) => { 
        if (err || result.affectedRows === 0) { 
            console.warn(`🕵️ Solicitud de token para correo no registrado: ${correo}`);
            return res.status(404).json({ error: "El correo no existe." }); 
        } 
        enviarCorreoRecuperacion(correo, token); 
        console.log(`🔑 Código de recuperación generado y despachado hacia: ${correo}`);
        res.json({ mensaje: "Se ha enviado un código de recuperación a tu Gmail." }); 
    }); 
}); 

app.post('/api/restablecer-password', async (req, res) => { 
    const { correo, token, nuevaPassword } = req.body; 
    
    if (!correo || !token || !nuevaPassword) {
        return res.status(400).json({ error: "Información incompleta para el cambio de credenciales." });
    }

    const query = 'SELECT * FROM usuarios_login WHERE correo = ? AND token_recuperacion = ? AND expiracion_token > NOW()'; 
    
    db.query(query, [correo, token], async (err, results) => { 
        if (err || results.length === 0) { 
            console.warn(`⚠️ Intento de restablecimiento fallido o token expirado para: ${correo}`);
            return res.status(400).json({ error: "Código inválido o expirado." }); 
        } 
        
        const usuario = results[0]; 
        try {
            const nuevoHash = await bcrypt.hash(nuevaPassword, 10); 
            const updateQuery = 'UPDATE usuarios_login SET password_hash = ?, token_recuperacion = NULL, expiracion_token = NULL, intentos_fallidos = 0 WHERE id = ?'; 
            
            db.query(updateQuery, [nuevoHash, usuario.id], (errUpdate) => { 
                if (errUpdate) return res.status(500).json({ error: "Error guardando la nueva contraseña." });
                console.log(`🔄 Contraseña actualizada con éxito total para ID Usuario: ${usuario.id}`);
                res.json({ mensaje: "Tu contraseña ha sido cambiada con éxito." }); 
            }); 
        } catch (errBcrypt) {
            res.status(500).json({ error: "Error en encriptación de datos." });
        }
    }); 
}); 

// ========================================================================= 
// 🏁 RUTA TRANSACCIONAL MAESTRA: PEDIDOS + DETALLE + FACTURA
// ========================================================================= 
app.post('/api/pedidos', (req, res) => {
    const { id_producto, productos, id_cliente } = req.body;

    if (!productos || productos.length === 0) {
        console.warn("⚠️ Intento de procesamiento de orden vacía.");
        return res.status(400).json({ success: false, error: 'Información de compra incompleta.' });
    }

    const clienteTransaccion = id_cliente || config.cliente_defecto.id_cliente; 
    console.log(`🛒 Iniciando transacción comercial para Cliente ID: ${clienteTransaccion}`);

    // 1. Calcular el identificador ID_PEDIDO correlativo alfanumérico
    const queryUltimoPedido = 'SELECT id_pedido FROM pedido ORDER BY id_pedido DESC LIMIT 1';
    
    db.query(queryUltimoPedido, (errPed, resultadosPedido) => {
        if (errPed) {
            console.error("❌ Error leyendo secuencia de pedidos:", errPed.message);
            return res.status(500).json({ success: false, error: "Error al leer pedidos antiguos." });
        }

        let nuevoIdPedido = 'PED-001'; 
        if (resultadosPedido.length > 0) {
            const ultimoPedStr = resultadosPedido[0].id_pedido; 
            const numPedActual = parseInt(ultimoPedStr.replace('PED-', ''), 10);
            nuevoIdPedido = `PED-${(numPedActual + 1).toString().padStart(3, '0')}`;
        }

        // 2. Calcular el identificador ID_FACTURA correlativo alfanumérico
        const queryUltimaFactura = 'SELECT id_factura FROM factura ORDER BY id_factura DESC LIMIT 1';
        
        db.query(queryUltimaFactura, (errFactura, resultadosFactura) => {
            if (errFactura) {
                console.error("❌ Error leyendo secuencia de facturas:", errFactura.message);
                return res.status(500).json({ success: false, error: "Error al leer facturas antiguas." });
            }

            let nuevoIdFactura = 'F-001'; 
            if (resultadosFactura.length > 0) {
                const ultimoIdStr = resultadosFactura[0].id_factura; 
                const numeroActual = parseInt(ultimoIdStr.replace('F-', ''), 10); 
                nuevoIdFactura = `F-${(numeroActual + 1).toString().padStart(3, '0')}`;
            }

            // 3. Inserción en la tabla principal 'pedido'
            const queryPedido = 'INSERT INTO pedido (id_pedido, id_producto) VALUES (?, ?)';
            const productoEncabezado = id_producto || productos[0].id_producto;

            db.query(queryPedido, [nuevoIdPedido, productoEncabezado], (errPedido) => {
                if (errPedido) {
                    console.error("❌ Error insertando encabezado de pedido:", errPedido.message);
                    return res.status(500).json({ success: false, error: "Error al abrir registro de venta." });
                }

                // 4. Inserción en 'detalle_pedido1'
                const queryDetalle = 'INSERT INTO detalle_pedido1 (id_pedido, id_producto, cantidad) VALUES ?';
                const valoresDetalle = productos.map(item => [nuevoIdPedido, item.id_producto, item.cantidad]);

                db.query(queryDetalle, [valoresDetalle], (errDetalle) => {
                    if (errDetalle) {
                        console.error("❌ Error insertando desgloses en detalle_pedido1:", errDetalle.message);
                        db.query('DELETE FROM pedido WHERE id_pedido = ?', [nuevoIdPedido]); 
                        return res.status(500).json({ success: false, error: "Error al guardar el desglose." });
                    }

                    // 5. Cierre comercial en 'factura'
                    const fechaActual = new Date().toISOString().slice(0, 10); 
                    const id_empleado = config.admin.id_empleado; 
                    const id_tienda = config.tienda.id_tienda; 
                    
                    const totalMonto = productos.reduce((sum, item) => sum + (item.precio * item.cantidad), 0) + config.app.recargo_envio;

                    const queryInsertarFactura = `
                        INSERT INTO factura 
                        (id_factura, fecha_emision, fecha_vencimiento, id_empleado, id_cliente, id_pedido, id_tienda, total) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    const valoresFactura = [
                        nuevoIdFactura, 
                        fechaActual, 
                        fechaActual, 
                        id_empleado, 
                        clienteTransaccion, 
                        nuevoIdPedido, 
                        id_tienda, 
                        totalMonto
                    ];

                    db.query(queryInsertarFactura, valoresFactura, (errInsertFactura) => {
                        if (errInsertFactura) {
                            console.error("❌ Error de Foreign Key o Constraint en factura:", errInsertFactura.message);
                            db.query('DELETE FROM detalle_pedido1 WHERE id_pedido = ?', [nuevoIdPedido]);
                            db.query('DELETE FROM pedido WHERE id_pedido = ?', [nuevoIdPedido]);
                            return res.status(500).json({ success: false, error: "Falló la generación de la factura relacional." });
                        }

                        console.log(`💰 Operación exitosa. Pedido: ${nuevoIdPedido} | Factura: ${nuevoIdFactura} | Total: C$${totalMonto}`);
                        res.status(201).json({ 
                            success: true, 
                            mensaje: "¡Pedido, desglose y factura registrados perfectamente! 🛍️", 
                            id_factura: nuevoIdFactura,
                            id_pedido: nuevoIdPedido
                        });
                    });
                });
            });
        });
    });
});

// ========================================================================= 
// MAILING: COMPONENTES AUXILIARES CON DISEÑO SEMÁNTICO HTML
// ========================================================================= 
function enviarAlertaSeguridad(correoUsuario, fontUsuario) { 
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #dcdcdc; border-radius: 8px; overflow: hidden;"> 
            <div style="background-color: #d9534f; color: white; padding: 15px; text-align: center; font-weight: bold;">⚠️ INTENTOS DE LOGIN SOSPECHOSOS</div> 
            <div style="padding: 20px; background-color: #f9f9f9; color: #333;"> 
                <p>Hola <strong>${fontUsuario}</strong> (o Administrador),</p> 
                <p>Hemos detectado 3 o más intentos fallidos de inicio de sesión consecutivos en la cuenta: <span style="color:#d9534f;">${correoUsuario}</span>.</p> 
                <p style="font-size: 12px; color: #777; margin-top: 20px;">Este es un correo automático de seguridad del sistema Niñas Shop.</p>
            </div> 
        </div>`; 
    transportador.sendMail({ from: config.email.usuario, to: config.email.destinatario_alertas, subject: '⚠️ Alerta de Seguridad: Múltiples accesos fallidos', html }); 
} 

function enviarCorreoRecuperacion(correoUsuario, token) { 
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #dcdcdc; border-radius: 8px; overflow: hidden;"> 
            <div style="background-color: #2bc48a; color: white; padding: 15px; text-align: center; font-weight: bold;">🔑 RECUPERACIÓN DE CUENTA</div> 
            <div style="padding: 20px; background-color: #f9f9f9; color: #333; text-align: center;"> 
                <p>Has solicitado restablecer tu contraseña para la tienda <strong>${config.app.nombre_tienda}</strong>.</p> 
                <h1 style="background: #eee; padding: 10px; display: inline-block; letter-spacing: 5px; border-radius: 5px; color: #333;">${token}</h1> 
                <p style="font-size: 11px; color: #999; margin-top: 15px;">Este token expirará automáticamente en 15 minutos.</p>
            </div> 
        </div>`; 
    transportador.sendMail({ from: config.email.usuario, to: correoUsuario, subject: '🔑 Código para restablecer tu contraseña', html }); 
} 

// Ruta test de renderizado estático
app.get('/test-static', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// Encendido y escucha del Servidor
app.listen(config.app.puerto, () => {
    console.log(`🚀 Servidor centralizado corriendo listo en http://localhost:${config.app.puerto}`);
});