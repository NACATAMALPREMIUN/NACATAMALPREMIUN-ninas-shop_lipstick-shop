document.addEventListener('DOMContentLoaded', () => {
    // Selectores del DOM principales
    const productosListContainer = document.getElementById('productos-list');
    const subtotalDisplay = document.getElementById('subtotal');
    const totalFinalDisplay = document.getElementById('total-final');
    const carritoVacioMsg = document.getElementById('carrito-vacio-msg');
    const btnConfirmar = document.getElementById('btn-confirmar');

    // Costo de envío fijo
    const shippingCost = 50.00;
    const currency = 'C$';

    /**
     * Lee la lista de productos guardados en el almacenamiento del navegador.
     * @returns {Array} Arreglo de objetos de productos.
     */
    const obtenerCarrito = () => {
        const datosLocal = localStorage.getItem('carritoDeCompras');
        return datosLocal ? JSON.parse(datosLocal) : [];
    };

    /**
     * Guarda el estado del carrito en el almacenamiento local.
     * @param {Array} carrito - El arreglo de productos actualizado.
     */
    const guardarCarrito = (carrito) => {
        localStorage.setItem('carritoDeCompras', JSON.stringify(carrito));
    };

    /**
     * Calcula el subtotal para un producto individual y actualiza su display.
     * @param {HTMLElement} item - El contenedor div.item-carrito.
     * @returns {number} El subtotal calculado para ese ítem.
     */
    const calculateItemSubtotal = (item) => {
        const price = parseFloat(item.dataset.price);
        const quantityInput = item.querySelector('.item-quantity');
        
        let quantity = parseInt(quantityInput.value, 10) || 1;
        
        if (quantity < 1) {
            quantity = 1;
            quantityInput.value = 1;
        }

        const subtotal = price * quantity;
        
        // Actualiza el precio total visible de ese ítem
        item.querySelector('.item-total-price').textContent = subtotal.toFixed(2);
        return subtotal;
    };

    /**
     * Función principal que suma todos los productos y actualiza los totales.
     */
    const updateCartTotals = () => {
        const itemsDinamicos = document.querySelectorAll('.item-carrito');
        let currentSubtotal = 0;

        itemsDinamicos.forEach(item => {
            currentSubtotal += calculateItemSubtotal(item);
        });

        if (subtotalDisplay) {
            subtotalDisplay.textContent = `${currency}${currentSubtotal.toFixed(2)}`;
        }

        const finalTotal = currentSubtotal + shippingCost;
        if (totalFinalDisplay) {
            totalFinalDisplay.textContent = `${currency}${finalTotal.toFixed(2)}`;
        }
    };

    /**
     * Conecta la interactividad a los inputs numéricos y botones de eliminación inyectados.
     */
    const asignarEventosControles = () => {
        const itemsDinamicos = document.querySelectorAll('.item-carrito');
        
        itemsDinamicos.forEach(item => {
            const quantityInput = item.querySelector('.item-quantity');
            const btnEliminar = item.querySelector('.btn-eliminar-item');
            const indice = parseInt(quantityInput.dataset.index, 10);

            // Manejador único unificado para cambios de entrada e inputs manuales
            const actualizarCantidadManejador = (e) => {
                const nuevaCantidad = parseInt(e.target.value, 10) || 1;
                const carrito = obtenerCarrito();
                if (carrito[indice]) {
                    carrito[indice].cantidad = nuevaCantidad;
                    guardarCarrito(carrito);
                    calculateItemSubtotal(item);
                    updateCartTotals();
                }
            };

            quantityInput.addEventListener('change', actualizarCantidadManejador);
            quantityInput.addEventListener('input', actualizarCantidadManejador);

            // Escuchador para remover el artículo del carrito por completo
            btnEliminar.addEventListener('click', () => {
                const carrito = obtenerCarrito();
                carrito.splice(indice, 1);
                guardarCarrito(carrito);
                pintarCarrito(); // Re-renderiza de forma limpia actualizando los data-index reales
            });
        });
    };

    /**
     * Dibuja los productos en pantalla leyendo el almacenamiento local.
     */
    const pintarCarrito = () => {
        const carrito = obtenerCarrito();
        
        // Remueve los elementos de productos anteriores para refrescar la lista limpia de duplicados
        if (productosListContainer) {
            const itemsExistentes = productosListContainer.querySelectorAll('.item-carrito');
            itemsExistentes.forEach(item => item.remove());
        }

        // Estado si no hay productos amigos
        if (carrito.length === 0) {
            if (carritoVacioMsg) carritoVacioMsg.style.display = 'block';
            if (subtotalDisplay) subtotalDisplay.textContent = `${currency}0.00`;
            if (document.getElementById('shipping')) document.getElementById('shipping').textContent = `${currency}0.00`;
            if (totalFinalDisplay) totalFinalDisplay.textContent = `${currency}0.00`;
            if (btnConfirmar) btnConfirmar.disabled = true;
            return;
        }

        if (carritoVacioMsg) carritoVacioMsg.style.display = 'none';
        if (btnConfirmar) btnConfirmar.disabled = false;
        if (document.getElementById('shipping')) {
            document.getElementById('shipping').textContent = `${currency}${shippingCost.toFixed(2)}`;
        }

        // Ciclo iterativo para inyectar el HTML de cada artículo guardado
        carrito.forEach((producto, indice) => {
            const divItem = document.createElement('div');
            divItem.className = 'item-carrito';
            divItem.dataset.price = producto.precio; 
            divItem.innerHTML = `
                <img src="${producto.imagen}" alt="${producto.nombre}" class="item-img" onerror="this.onerror=null;this.src='https://placehold.co/100';">
                <div class="item-details">
                    <h4>${producto.nombre}</h4>
                    <p>${currency}${parseFloat(producto.precio).toFixed(2)} c/u</p>
                    <button class="btn-eliminar-item" style="background:none; border:none; color:#ff4d94; cursor:pointer; font-size:0.85em; padding:0; margin-top:5px;">❌ Eliminar</button>
                </div>
                <div class="item-controls">
                    <input type="number" class="item-quantity" value="${producto.cantidad}" min="1" data-index="${indice}" aria-label="Cantidad de ${producto.nombre}">
                </div>
                <div class="item-subtotal">
                    ${currency}<span class="item-total-price">0.00</span>
                </div>
            `;
            if (productosListContainer) {
                productosListContainer.appendChild(divItem);
            }
        });

        // Ejecutar funciones de cálculo iniciales vinculadas
        updateCartTotals();
        asignarEventosControles();
    };

    // Procesamiento y envío definitivo del formulario de pago conectado a la API de Node.js (Puerto 5000)
    const formPago = document.getElementById('form-pago');
    if (formPago) {
        formPago.addEventListener('submit', async (e) => {
            e.preventDefault();

            const carrito = obtenerCarrito();
            if (carrito.length === 0) {
                alert("Tu carrito está vacío.");
                return;
            }
            
            // Mapeamos el arreglo asegurando que lea las propiedades correctas e incluya el precio
            const productosParaEnviar = carrito.map(prod => ({
                id_producto: prod.id_producto, 
                cantidad: prod.cantidad,
                precio: parseFloat(prod.precio)
            }));

            // 🌟 DINÁMICO: Recuperamos el id_cliente que guardó el login.html en el almacenamiento local al iniciar sesión
            const idClienteSesion = localStorage.getItem('id_cliente');

            const datosPedido = {
                id_cliente: idClienteSesion ? parseInt(idClienteSesion, 10) : 1, // Fallback a 1 por seguridad en desarrollo local
                id_producto: productosParaEnviar[0].id_producto, 
                productos: productosParaEnviar
            };

            try {
                // Enviamos la información por FETCH al backend (Puerto 5000)
                const response = await fetch('http://localhost:5000/api/pedidos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(datosPedido)
                });

                const resultado = await response.json();

                if (resultado.success) {
                    // Muestra en pantalla el resultado dinámico calculado por el servidor relacional
                    alert(`¡Tu compra ha sido procesada con éxito en Niñas Shop! 🛍️✨\n\n📦 Código de Pedido: ${resultado.id_pedido}\n🧾 Número de Factura: ${resultado.id_factura}`);
                    localStorage.removeItem('carritoDeCompras');
                    pintarCarrito();
                } else {
                    alert(`Error devuelto por la base de datos: ${resultado.error}`);
                }

            } catch (error) {
                console.error("Error crítico de red al conectar con la API:", error);
                alert("No se pudo establecer conexión con el backend de la tienda. Asegúrate de tener encendido tu servidor local Node.js en el puerto 5000.");
            }
        });
    }

    // Identificación inicial al cargar el carrito en pantalla
    pintarCarrito();
});