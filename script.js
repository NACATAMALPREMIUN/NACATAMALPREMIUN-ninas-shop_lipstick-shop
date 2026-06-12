document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ Script.js cargado correctamente");

    // Mapa para almacenar las instancias de Swiper de productos
    const swipers = {};
    const API_URL = 'http://localhost:5000/api';

    // =================================================================
    // 0. CARGAR PRODUCTOS DINÁMICAMENTE DESDE LA API
    // =================================================================
    const cargarProductos = async () => {
        try {
            // Sincronizado con la ruta unificada del backend para jalar stock relacional
            const res = await fetch(`${API_URL}/stock`);
            const productos = await res.json();
            
            console.log("📦 Productos cargados con éxito:", productos);
            
            // Mapear categorías a swipers del HTML
            const categoriasMap = {
                'Labial': 'swiper1',
                'Gloss': 'swiper2',
                'Correctores': 'swiper3',
                'Accesorios': 'swiper3',
                'Skincare': 'swiper4',
                'Paletas': 'swiper4'
            };
            
            // Agrupar productos por categoría
            const productosPorCategoria = {};
            productos.forEach(prod => {
                const categoria = prod.categoria || 'Labial';
                if (!productosPorCategoria[categoria]) {
                    productosPorCategoria[categoria] = [];
                }
                productosPorCategoria[categoria].push(prod);
            });
            
            // Inyectar productos en cada swiper correspondiente
            Object.entries(productosPorCategoria).forEach(([categoria, prods]) => {
                const swiperId = categoriasMap[categoria];
                if (!swiperId) return;
                
                const swiperWrapper = document.querySelector(`#${swiperId} .swiper-wrapper`);
                if (!swiperWrapper) return;
                
                // Limpiar slides existentes
                swiperWrapper.innerHTML = '';
                
                // Inyectar nuevos slides dinámicos con data-attributes intactos
                prods.forEach(prod => {
                    const slide = document.createElement('div');
                    slide.className = 'swiper-slide';
                    slide.innerHTML = `
                        <div class="Producto">
                            <div class="Producto-img">
                                <img src="imagines/imagen1.jpeg" alt="${prod.nombre}" />
                                <div class="Producto-overlay">
                                    <p>${prod.descripcion || 'Producto de calidad'}</p>
                                </div>
                            </div>
                            <div class="Producto-txt">
                                <h3>${prod.nombre}</h3>
                                <p class="descripcion">Detalles delicados y elegantes para complementar tu estilo.</p>
                                <p class="precio">C$${parseFloat(prod.precio).toFixed(2)}</p>
                                <a href="#" class="btn-2" 
                                    data-id="${prod.id_producto || prod.id}"
                                    data-nombre="${prod.nombre}"
                                    data-precio="${prod.precio}"
                                    data-imagen="imagines/imagen1.jpeg">COMPRAR</a>
                            </div>
                        </div>
                    `;
                    swiperWrapper.appendChild(slide);
                });
                
                // Reinicializar o actualizar el comportamiento de Swiper
                if (swipers[swiperId]) {
                    swipers[swiperId].update();
                }
            });
            
            // Reasignar los listeners de compra a los nuevos botones inyectados
            asignarEventosBotones();
        } catch (err) {
            console.error("❌ Error cargando productos en el catálogo:", err);
        }
    };
    
    // Cargar catálogo al iniciar la app
    cargarProductos();

    // =================================================================
    // 1. FUNCIÓN PARA INICIALIZAR/ACTUALIZAR EL SWIPER DE PRODUCTOS
    // =================================================================
    const initProductSwipers = (swiperId) => {
        const swiperContainer = document.getElementById(swiperId);
        
        if (swiperContainer && !swipers[swiperId]) {
            swipers[swiperId] = new Swiper(`#${swiperId}`, {
                slidesPerView: 1,
                spaceBetween: 30, 
                loop: true,
                navigation: {
                    nextEl: `#${swiperId} .swiper-button-next`,
                    prevEl: `#${swiperId} .swiper-button-prev`,
                },
                pagination: {
                    el: `#${swiperId} .swiper-pagination`,
                    clickable: true,
                },
                breakpoints: {
                    576: { slidesPerView: 2, spaceBetween: 40 },
                    992: { slidesPerView: 3, spaceBetween: 50 },
                },
            });
        } else if (swipers[swiperId]) {
            swipers[swiperId].update();
        }
    };

    // =================================================================
    // 2. INICIALIZACIÓN DEL SWIPER PRINCIPAL (HEADER CON EFECTO FADE)
    // =================================================================
    const mainSwiper = new Swiper('.mySwiper-1', {
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        navigation: {
            nextEl: '.mySwiper-1 .swiper-button-next',
            prevEl: '.mySwiper-1 .swiper-button-prev',
        },
        effect: 'fade', 
        fadeEffect: { crossFade: true }
    });

    // =================================================================
    // 3. LÓGICA DE PESTAÑAS (TABS)
    // =================================================================
    const tabInputs = document.querySelectorAll('.tabInput');
    const tabContents = document.querySelectorAll('.tab');

    const handleTabChange = (event) => {
        const selectedTabValue = event.target.value; 
        const swiperId = `swiper${selectedTabValue}`;
        
        tabContents.forEach(content => {
            const innerSwiper = content.querySelector('.mySwiper-2');
            if (innerSwiper) {
                const contentSwiperId = innerSwiper.id;
                if (contentSwiperId !== swiperId) {
                    content.hidden = true;
                }
            }
        });

        const activeTabContent = document.getElementById(swiperId)?.parentNode;
        if (activeTabContent) {
            activeTabContent.hidden = false;
            initProductSwipers(swiperId);
        }
    };
    
    tabInputs.forEach(input => {
        input.addEventListener('change', handleTabChange);
    });
    
    const initialCheckedInput = document.querySelector('.tabInput:checked');
    if (initialCheckedInput) {
        const initialSwiperId = `swiper${initialCheckedInput.value}`;
        initProductSwipers(initialSwiperId);
    }

    // =================================================================
    // 4. LÓGICA DEL CARRITO: Capturar botones "Comprar" y localStorage
    // =================================================================
    const asignarEventosBotones = () => {
        const botonesComprar = document.querySelectorAll('a.btn-2');
        botonesComprar.forEach(boton => {
            boton.removeEventListener('click', manejarCompra);
            boton.addEventListener('click', manejarCompra);
        });
    };
    
    const manejarCompra = (e) => {
        e.preventDefault();

        const boton = e.target;
        
        // 🛡️ CORREGIDO: Eliminamos el parseInt para conservar el código alfanumérico (PROD-00X)
        const productoSeleccionado = {
            id_producto: boton.dataset.id, 
            nombre: boton.dataset.nombre,
            precio: parseFloat(boton.dataset.precio),
            imagen: boton.dataset.imagen,
            cantidad: 1
        };

        if (!productoSeleccionado.id_producto) {
            console.error("❌ Error de mapeo: Este botón no tiene configurado el atributo data-id.");
            return;
        }

        let carrito = JSON.parse(localStorage.getItem('carritoDeCompras')) || [];
        
        // Comparamos directamente como strings relacionales limpios
        const indexExiste = carrito.findIndex(prod => prod.id_producto === productoSeleccionado.id_producto);

        if (indexExiste !== -1) {
            carrito[indexExiste].cantidad++;
        } else {
            carrito.push(productoSeleccionado);
        }

        localStorage.setItem('carritoDeCompras', JSON.stringify(carrito));
        
        alert(`¡${productoSeleccionado.nombre} añadido al carrito con éxito! 💄✨`);
        window.location.href = 'carrito.html';
    };

    // =================================================================
    // 5. LÓGICA DE LOGIN: Sincronizada con tu server.js unificado
    // =================================================================
    const formularioLogin = document.getElementById('form-login');
    
    if (formularioLogin) {
        formularioLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const txtUsuario = document.getElementById('txt-usuario').value; // Tu input de correo electrónico
            const txtPass = document.getElementById('txt-pass').value;

            // 🔄 CORREGIDO: Mapeado al objeto desestructurado exacto de tu backend { correo, password }
            const datos = {
                correo: txtUsuario,
                password: txtPass
            };

            try {
                const respuesta = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(datos)
                });

                const resultado = await respuesta.json();

                if (respuesta.ok) {
                    alert(`¡Bienvenido de nuevo a Niñas Shop! Inicio de sesión correcto. 🌸`);
                    
                    // Almacenamos variables relacionales de sesión para el Admin Guard
                    localStorage.setItem('userRole', resultado.rol);
                    localStorage.setItem('userName', resultado.usuario);
                    localStorage.setItem('id_cliente', resultado.id_cliente);

                    // Redirección inteligente de privilegios
                    if (resultado.rol === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    alert(`❌ Error al ingresar: ${resultado.error || 'Credenciales incorrectas'}.`);
                }
            } catch (error) {
                console.error('❌ Error crítico de red al conectar con el servidor:', error);
                alert('No se pudo conectar con el servidor de la tienda. Asegúrate de tener corriendo node server.js');
            }
        });
    }

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ Script.js cargado correctamente");

    // Mapa para almacenar las instancias de Swiper de productos
    const swipers = {};
    const API_URL = 'http://localhost:5000/api';

    // =================================================================
    // 0. CARGAR PRODUCTOS DINÁMICAMENTE DESDE LA API
    // =================================================================
    const cargarProductos = async () => {
        try {
            // Sincronizado con la ruta unificada del backend para jalar stock relacional
            const res = await fetch(`${API_URL}/stock`);
            const productos = await res.json();
            
            console.log("📦 Productos cargados con éxito:", productos);
            
            // Mapear categorías a swipers del HTML
            const categoriasMap = {
                'Labial': 'swiper1',
                'Gloss': 'swiper2',
                'Correctores': 'swiper3',
                'Accesorios': 'swiper4',
                'Skincare': 'swiper5',
                'Paletas': 'swiper6'
            };
            
            // Agrupar productos por categoría
            const productosPorCategoria = {};
            productos.forEach(prod => {
                const categoria = prod.categoria || 'Labial';
                if (!productosPorCategoria[categoria]) {
                    productosPorCategoria[categoria] = [];
                }
                productosPorCategoria[categoria].push(prod);
            });
            
            // Inyectar productos en cada swiper correspondiente
            Object.entries(productosPorCategoria).forEach(([categoria, prods]) => {
                const swiperId = categoriasMap[categoria];
                if (!swiperId) return;
                
                const swiperWrapper = document.querySelector(`#${swiperId} .swiper-wrapper`);
                if (!swiperWrapper) return;
                
                // Limpiar slides existentes
                swiperWrapper.innerHTML = '';
                
                // Inyectar nuevos slides dinámicos con data-attributes intactos
                prods.forEach(prod => {
                    const slide = document.createElement('div');
                    slide.className = 'swiper-slide';
                    slide.innerHTML = `
                        <div class="Producto">
                            <div class="Producto-img">
                                <img src="imagines/imagen1.jpeg" alt="${prod.nombre}" />
                                <div class="Producto-overlay">
                                    <p>${prod.descripcion || 'Producto de calidad'}</p>
                                </div>
                            </div>
                            <div class="Producto-txt">
                                <h3>${prod.nombre}</h3>
                                <p class="descripcion">Detalles delicados y elegantes para complementar tu estilo.</p>
                                <p class="precio">C$${parseFloat(prod.precio).toFixed(2)}</p>
                                <a href="#" class="btn-2" 
                                    data-id="${prod.id_producto || prod.id}"
                                    data-nombre="${prod.nombre}"
                                    data-precio="${prod.precio}"
                                    data-imagen="imagines/imagen1.jpeg">COMPRAR</a>
                            </div>
                        </div>
                    `;
                    swiperWrapper.appendChild(slide);
                });
                
                // Reinicializar o actualizar el comportamiento de Swiper
                if (swipers[swiperId]) {
                    swipers[swiperId].update();
                }
            });
            
            // Reasignar los listeners de compra a los nuevos botones inyectados
            asignarEventosBotones();
        } catch (err) {
            console.error("❌ Error cargando productos en el catálogo:", err);
        }
    };
    
    // Cargar catálogo al iniciar la app
    cargarProductos();

    // =================================================================
    // 1. FUNCIÓN PARA INICIALIZAR/ACTUALIZAR EL SWIPER DE PRODUCTOS
    // =================================================================
    const initProductSwipers = (swiperId) => {
        const swiperContainer = document.getElementById(swiperId);
        
        if (swiperContainer && !swipers[swiperId]) {
            swipers[swiperId] = new Swiper(`#${swiperId}`, {
                slidesPerView: 1,
                spaceBetween: 30, 
                loop: true,
                navigation: {
                    nextEl: `#${swiperId} .swiper-button-next`,
                    prevEl: `#${swiperId} .swiper-button-prev`,
                },
                pagination: {
                    el: `#${swiperId} .swiper-pagination`,
                    clickable: true,
                },
                breakpoints: {
                    576: { slidesPerView: 2, spaceBetween: 40 },
                    992: { slidesPerView: 3, spaceBetween: 50 },
                },
            });
        } else if (swipers[swiperId]) {
            swipers[swiperId].update();
        }
    };

    // =================================================================
    // 2. INICIALIZACIÓN DEL SWIPER PRINCIPAL (HEADER CON EFECTO FADE)
    // =================================================================
    const mainSwiper = new Swiper('.mySwiper-1', {
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        navigation: {
            nextEl: '.mySwiper-1 .swiper-button-next',
            prevEl: '.mySwiper-1 .swiper-button-prev',
        },
        effect: 'fade', 
        fadeEffect: { crossFade: true }
    });

    // =================================================================
    // 3. LÓGICA DE PESTAÑAS (TABS)
    // =================================================================
    const tabInputs = document.querySelectorAll('.tabInput');
    const tabContents = document.querySelectorAll('.tab');

    const handleTabChange = (event) => {
        const selectedTabValue = event.target.value; 
        const swiperId = `swiper${selectedTabValue}`;
        
        tabContents.forEach(content => {
            const innerSwiper = content.querySelector('.mySwiper-2');
            if (innerSwiper) {
                const contentSwiperId = innerSwiper.id;
                if (contentSwiperId !== swiperId) {
                    content.hidden = true;
                }
            }
        });

        const activeTabContent = document.getElementById(swiperId)?.parentNode;
        if (activeTabContent) {
            activeTabContent.hidden = false;
            initProductSwipers(swiperId);
        }
    };
    
    tabInputs.forEach(input => {
        input.addEventListener('change', handleTabChange);
    });
    
    const initialCheckedInput = document.querySelector('.tabInput:checked');
    if (initialCheckedInput) {
        const initialSwiperId = `swiper${initialCheckedInput.value}`;
        initProductSwipers(initialSwiperId);
    }

    // =================================================================
    // 4. LÓGICA DEL CARRITO: Capturar botones "Comprar" y localStorage
    // =================================================================
    const asignarEventosBotones = () => {
        const botonesComprar = document.querySelectorAll('a.btn-2');
        botonesComprar.forEach(boton => {
            boton.removeEventListener('click', manejarCompra);
            boton.addEventListener('click', manejarCompra);
        });
    };
    
    const manejarCompra = (e) => {
        e.preventDefault();

        const boton = e.target;
        
        // 🛡️ CORREGIDO: Eliminamos el parseInt para conservar el código alfanumérico (PROD-00X)
        const productoSeleccionado = {
            id_producto: boton.dataset.id, 
            nombre: boton.dataset.nombre,
            precio: parseFloat(boton.dataset.precio),
            imagen: boton.dataset.imagen,
            cantidad: 1
        };

        if (!productoSeleccionado.id_producto) {
            console.error("❌ Error de mapeo: Este botón no tiene configurado el atributo data-id.");
            return;
        }

        let carrito = JSON.parse(localStorage.getItem('carritoDeCompras')) || [];
        
        // Comparamos directamente como strings relacionales limpios
        const indexExiste = carrito.findIndex(prod => prod.id_producto === productoSeleccionado.id_producto);

        if (indexExiste !== -1) {
            carrito[indexExiste].cantidad++;
        } else {
            carrito.push(productoSeleccionado);
        }

        localStorage.setItem('carritoDeCompras', JSON.stringify(carrito));
        
        alert(`¡${productoSeleccionado.nombre} añadido al carrito con éxito! 💄✨`);
        window.location.href = 'carrito.html';
    };

    // =================================================================
    // 5. LÓGICA DE LOGIN: Sincronizada con tu server.js unificado
    // =================================================================
    const formularioLogin = document.getElementById('form-login');
    
    if (formularioLogin) {
        formularioLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const txtUsuario = document.getElementById('txt-usuario').value; // Tu input de correo electrónico
            const txtPass = document.getElementById('txt-pass').value;

            // 🔄 CORREGIDO: Mapeado al objeto desestructurado exacto de tu backend { correo, password }
            const datos = {
                correo: txtUsuario,
                password: txtPass
            };

            try {
                const respuesta = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(datos)
                });

                const resultado = await respuesta.json();

                if (respuesta.ok) {
                    alert(`¡Bienvenido de nuevo a Niñas Shop! Inicio de sesión correcto. 🌸`);
                    
                    // Almacenamos variables relacionales de sesión para el Admin Guard
                    localStorage.setItem('userRole', resultado.rol);
                    localStorage.setItem('userName', resultado.usuario);
                    localStorage.setItem('id_cliente', resultado.id_cliente);

                    // Redirección inteligente de privilegios
                    if (resultado.rol === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    alert(`❌ Error al ingresar: ${resultado.error || 'Credenciales incorrectas'}.`);
                }
            } catch (error) {
                console.error('❌ Error crítico de red al conectar con el servidor:', error);
                alert('No se pudo conectar con el servidor de la tienda. Asegúrate de tener corriendo node server.js');
            }
        });
    }   

});
});