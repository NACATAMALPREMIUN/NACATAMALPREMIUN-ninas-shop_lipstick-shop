const API_URL = 'http://localhost:5000/api';

// ========================================================================= 
// 0. SEGURIDAD: Expulsar inmediatamente si no es administrador antes de procesar nada
// ========================================================================= 
if (localStorage.getItem('userRole') !== 'admin') {
    window.location.href = "login.html";
}

// ========================================================================= 
// 1. NAVEGACIÓN MODULAR: Intercambiar pestañas e iluminar botón activo
// ========================================================================= 
function cambiarSeccion(nombreModulo, botonActivo) {
    document.querySelectorAll('.modulo').forEach(mod => mod.classList.remove('activo'));
    
    const moduloSeleccionado = document.getElementById(`mod-${nombreModulo}`);
    if (moduloSeleccionado) {
        moduloSeleccionado.classList.add('activo');
    }

    document.querySelectorAll('.sidebar button').forEach(btn => btn.classList.remove('active'));

    if (botonActivo) {
        botonActivo.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("📊 Admin.js cargado correctamente en sincronía relacional");

    // Selectores ajustados milimétricamente al nuevo HTML premium
    const tableStockBody = document.querySelector('#tabla-stock tbody');
    const tableUsersBody = document.querySelector('#tabla-usuarios tbody');
    const tablePagosBody = document.querySelector('#tabla-pagos tbody');
    const tablePersonalBody = document.querySelector('#tabla-personal tbody');
    const formProducto = document.getElementById('form-nuevo-producto');

    // =========================================================================
    // 2. INVENTARIO: Cargar Stock desde el Backend con Alertas Críticas (Min-Prod)
    // =========================================================================
    const cargarInventario = async () => {
        try {
            const res = await fetch(`${API_URL}/stock`);
            const productos = await res.json();

            if (!tableStockBody) return; // Validation anti-caídas por pestañas
            tableStockBody.innerHTML = ''; 

            let contadorAlertas = 0;

            productos.forEach((prod, index) => {
                // Generamos el ID correlativo de tu cuaderno iniciando estrictamente en ST-001
                const idInventarioCorrelativo = `ST-${(index + 1).toString().padStart(3, '0')}`;
                
                // Forzamos los parámetros estrictos de tu negocio
                const stockActual = prod.cantidad > 120 ? 120 : prod.cantidad;
                const stockMinimo = 20; // Piso base de reabastecimiento

                const esCritico = stockActual <= stockMinimo;
                if (esCritico) contadorAlertas++;

                const row = document.createElement('tr');
                if (esCritico) row.className = 'stock-critico-row'; // Iluminación rosa neón suave

                row.innerHTML = `
                    <td><span class="badge badge-id">${idInventarioCorrelativo}</span></td>
                    <td>${esCritico ? `<strong>${prod.nombre}</strong>` : prod.nombre}</td>
                    <td>${stockActual} uds</td>
                    <td>${stockMinimo} uds</td>
                    <td>C$${parseFloat(prod.precio).toFixed(2)}</td>
                    <td>
                        <span class="badge ${esCritico ? 'badge-alert' : 'badge-ok'}">
                            ${esCritico ? '⚠️ REABASTECER' : '✅ ESTABLE'}
                        </span>
                    </td>
                `;
                tableStockBody.appendChild(row);
            });

            // Inyección dinámica de datos reales en las tarjetas KPI superiores
            if(document.getElementById('kpi-alertas')) {
                document.getElementById('kpi-alertas').innerText = `${contadorAlertas} Alertas`;
                const alertaBox = document.getElementById('kpi-alerta-box');
                if (alertaBox) {
                    if (contadorAlertas > 0) {
                        alertaBox.classList.add('warning');
                    } else {
                        alertaBox.classList.remove('warning');
                    }
                }
            }
        } catch (err) {
            console.error("❌ Error cargando inventario en panel de administración:", err);
        }
    };

    // =========================================================================
    // 3. AUDITORÍA: Cargar lista de Usuarios registrados
    // =========================================================================
    const cargarUsuarios = async () => {
        try {
            const res = await fetch(`${API_URL}/usuarios`);
            const usuarios = await res.json();

            if (!tableUsersBody) return;
            tableUsersBody.innerHTML = '';

            usuarios.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="badge badge-id">USR-${user.id}</span></td>
                    <td>${user.nombre}</td>
                    <td>${user.correo}</td>
                    <td>
                        <span class="badge badge-ok">
                            ${user.rol.toUpperCase()}
                        </span>
                    </td>
                `;
                tableUsersBody.appendChild(row);
            });

            if(document.getElementById('kpi-clientes')) {
                document.getElementById('kpi-clientes').innerText = usuarios.length;
            }
        } catch (err) {
            console.error("❌ Error cargando usuarios en panel de administración:", err);
        }
    };

    // =========================================================================
    // 4. FACTURACIÓN: Cargar Historial de Pagos y calcular ingresos en vivo
    // =========================================================================
    const cargarPagos = async () => {
        try {
            const res = await fetch(`${API_URL}/pagos`);
            const pagos = await res.json();

            if (!tablePagosBody) return;
            tablePagosBody.innerHTML = '';

            let totalIngresosDia = 0;

            pagos.forEach(p => {
                const totalFactura = parseFloat(p.total || 0);
                totalIngresosDia += totalFactura;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="badge badge-id">${p.id_factura}</span></td>
                    <td>${p.fecha_emision.slice(0, 10)}</td>
                    <td>${p.cliente || 'Cliente Web'}</td>
                    <td><span class="badge badge-id">${p.id_pedido}</span></td>
                    <td>C$${totalFactura.toFixed(2)}</td>
                    <td><span class="badge badge-ok">✅ ENVIADA</span></td>
                `;
                tablePagosBody.appendChild(row);
            });

            // Inyección real de la suma acumulada de facturas en la tarjeta KPI superior
            if(document.getElementById('kpi-dia')) {
                document.getElementById('kpi-dia').textContent = `C$${totalIngresosDia.toFixed(2)}`;
            }
        } catch (err) {
            console.error("❌ Error cargando historial de pagos admin:", err);
        }
    };

    // =========================================================================
    // 5. MUESTRA NOMBRE COMPLETO CRUZANDO EMPLEADOS + PERSONAS
    // =========================================================================
    const cargarPersonal = async () => {
        try {
            const res = await fetch(`${API_URL}/personal`);
            const personal = await res.json();

            if (!tablePersonalBody) return;
            tablePersonalBody.innerHTML = '';

            personal.forEach(emp => {
                const idEmpleado = emp.id_empleado || 'EM-000';
                const nombreTrabajador = emp.nombre_completo || 'Sin Nombre Registrado';
                const cargo = emp.nombre_cargo || 'No Asignado';
                const area = emp.nombre_area || 'General';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span class="badge badge-id">${idEmpleado}</span></td>
                    <td><strong>${nombreTrabajador}</strong></td>
                    <td>${cargo}</td>
                    <td>${area}</td>
                `;
                tablePersonalBody.appendChild(row);
            });
        } catch (err) {
            console.error("❌ Error cargando personal unificado en admin:", err);
        }
    };

    // =========================================================================
    // 6. FORMULARIO: Registrar nuevo producto al Inventario Manual
    // =========================================================================
    if (formProducto) {
        formProducto.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombre = document.getElementById('prod-nombre').value;
            const cantidad = parseInt(document.getElementById('prod-cantidad').value, 10);
            const precio = parseFloat(document.getElementById('prod-precio').value);

            const nuevoProducto = { nombre, cantidad, precio };

            try {
                const response = await fetch(`${API_URL}/stock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoProducto)
                });

                const resultado = await response.json();

                if (response.ok) {
                    alert(resultado.mensaje || '¡Producto añadido correctamente! 🎉');
                    formProducto.reset();
                    cargarInventario(); // Refrescar la tabla en caliente automáticamente
                } else {
                    alert(`❌ Error: ${resultado.error}`);
                }
            } catch (error) {
                console.error("❌ Error de red al registrar producto:", error);
                alert("No se pudo conectar con el servidor para guardar el producto.");
            }
        });
    }

    // Ejecuciones iniciales en bloque al levantar la interfaz
    cargarInventario();
    cargarUsuarios();
    cargarPagos();
    cargarPersonal();
});

// ========================================================================= 
// 7. DESTRUCCIÓN DE SESIÓN (Logout seguro)
// ========================================================================= 
function cerrarSesion() {
    localStorage.clear();
    window.location.href = "login.html";
}

// Funciones Skins para evitar roturas visuales al oprimir botones de reportes de tu cuaderno
function exportarExcel() { alert("Generando reporte maestro Excel compatible con tu cuaderno..."); }
function guardarGrafica() { alert("Renderizando captura estadística de porcentajes comerciales..."); }
function cargarDatosGrafico() { console.log("Cambiando filtro temporal de estadísticas."); }