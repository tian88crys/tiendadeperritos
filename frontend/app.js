// Variables de estado
let catalog = [];
let cart = [];

// Elementos del DOM
const productsGrid = document.getElementById('productsGrid');
const catalogLoader = document.getElementById('catalogLoader');
const cartBtn = document.getElementById('cartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartModal = document.getElementById('cartModal');
const cartContent = document.getElementById('cartContent');
const cartBadge = document.getElementById('cartBadge');
const cartTotal = document.getElementById('cartTotal');
const proceedToPayBtn = document.getElementById('proceedToPayBtn');

const checkoutModal = document.getElementById('checkoutModal');
const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
const checkoutTotal = document.getElementById('checkoutTotal');
const checkoutForm = document.getElementById('checkoutForm');
const paymentLoader = document.getElementById('paymentLoader');
const paymentSuccessScreen = document.getElementById('paymentSuccessScreen');
const successMessage = document.getElementById('successMessage');
const receiptTxn = document.getElementById('receiptTxn');
const receiptAmount = document.getElementById('receiptAmount');
const paymentDoneBtn = document.getElementById('paymentDoneBtn');

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupEventListeners();
});

// Obtener productos desde el Backend API
async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error('Error al obtener los productos');
        }
        catalog = await response.ok ? await response.json() : [];
        renderCatalog();
    } catch (error) {
        console.error('Error fetching products:', error);
        productsGrid.innerHTML = `
            <div class="loader-container">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 40px; color: var(--error); margin-bottom: 15px;"></i>
                <p>No pudimos cargar los productos en este momento.</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; border-radius: var(--radius-sm); background: var(--secondary); color: white; border: none; cursor: pointer;">Reintentar</button>
            </div>
        `;
    }
}

// Renderizar el catálogo de productos
function renderCatalog() {
    productsGrid.innerHTML = '';
    if (catalog.length === 0) {
        productsGrid.innerHTML = '<p>No hay productos disponibles.</p>';
        return;
    }

    catalog.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-img-wrapper">
                <img class="product-img" src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-body">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <div class="product-footer">
                    <span class="product-price">$${product.price.toLocaleString('es-CL')} CLP</span>
                    <button class="add-to-cart-btn" data-id="${product.id}">
                        <i class="fa-solid fa-cart-plus"></i> Añadir
                    </button>
                </div>
            </div>
        `;
        productsGrid.appendChild(card);
    });

    // Agregar event listeners a los botones de añadir
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = parseInt(e.currentTarget.getAttribute('data-id'));
            addToCart(productId);
        });
    });
}

// Agregar producto al carrito
function addToCart(productId) {
    const product = catalog.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    updateCart();
    // Micro-animación en el badge
    cartBadge.style.transform = 'scale(1.3)';
    setTimeout(() => cartBadge.style.transform = 'scale(1)', 200);
}

// Actualizar cantidad de un producto en el carrito
function updateQuantity(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
    }
    updateCart();
}

// Remover producto del carrito
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
}

// Actualizar UI del carrito
function updateCart() {
    // Actualizar badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalItems;

    // Renderizar items
    cartContent.innerHTML = '';
    if (cart.length === 0) {
        cartContent.innerHTML = `
            <div class="cart-empty-message">
                <i class="fa-solid fa-shopping-cart"></i>
                <p>Tu carrito está vacío.</p>
            </div>
        `;
        proceedToPayBtn.disabled = true;
        cartTotal.textContent = '$0 CLP';
        return;
    }

    cart.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
                <h4 class="cart-item-name">${item.name}</h4>
                <div class="cart-item-price">$${item.price.toLocaleString('es-CL')} CLP</div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
            <button class="remove-item-btn" onclick="removeFromCart(${item.id})">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        `;
        cartContent.appendChild(itemEl);
    });

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `$${total.toLocaleString('es-CL')} CLP`;
    checkoutTotal.textContent = `$${total.toLocaleString('es-CL')} CLP`;
    proceedToPayBtn.disabled = false;
}

// Registrar Listeners
function setupEventListeners() {
    // Abrir / Cerrar Drawer del Carrito
    cartBtn.addEventListener('click', () => cartModal.classList.add('active'));
    closeCartBtn.addEventListener('click', () => cartModal.classList.remove('active'));

    // Cerrar si hace clic fuera del drawer
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) cartModal.classList.remove('active');
    });

    // Abrir Modal de Pago
    proceedToPayBtn.addEventListener('click', () => {
        cartModal.classList.remove('active');
        checkoutModal.classList.add('active');
    });

    // Cerrar Modal de Pago
    closeCheckoutBtn.addEventListener('click', () => {
        if (!paymentLoader.classList.contains('active')) {
            checkoutModal.classList.remove('active');
        }
    });

    checkoutModal.addEventListener('click', (e) => {
        if (e.target === checkoutModal && !paymentLoader.classList.contains('active')) {
            checkoutModal.classList.remove('active');
        }
    });

    // Formatear campo número de tarjeta (4 block spaces)
    const cardNumberInput = document.getElementById('cardNumber');
    cardNumberInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        let formatted = '';
        for (let i = 0; i < val.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += val[i];
        }
        e.target.value = formatted;
    });

    // Formatear vencimiento MM/AA
    const cardExpiryInput = document.getElementById('cardExpiry');
    cardExpiryInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 2) {
            e.target.value = val.slice(0, 2) + '/' + val.slice(2, 4);
        } else {
            e.target.value = val;
        }
    });

    // Enviar formulario de pago simulado
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);

    // Botón terminar transacción exitosa
    paymentDoneBtn.addEventListener('click', () => {
        paymentSuccessScreen.classList.remove('active');
        checkoutModal.classList.remove('active');
    });
}

// Procesar el pago simulado enviándolo al Backend API
async function handleCheckoutSubmit(e) {
    e.preventDefault();

    const cardName = document.getElementById('cardName').value;
    const cardNumber = document.getElementById('cardNumber').value;

    const paymentDetails = { cardName, cardNumber };

    // Activar Loader
    paymentLoader.classList.add('active');

    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cart: cart,
                paymentDetails: paymentDetails
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Éxito de pago
            setTimeout(() => {
                paymentLoader.classList.remove('active');
                
                // Cargar datos del recibo
                successMessage.textContent = data.message;
                receiptTxn.textContent = data.transactionId;
                receiptAmount.textContent = `$${data.amount.toLocaleString('es-CL')} CLP`;
                
                // Mostrar pantalla de éxito
                paymentSuccessScreen.classList.add('active');
                
                // Limpiar carrito
                cart = [];
                updateCart();
                checkoutForm.reset();
            }, 500); // Pequeño delay adicional para suavizar transición
        } else {
            throw new Error(data.message || 'Error al procesar el pago.');
        }
    } catch (error) {
        console.error('Error during checkout:', error);
        alert(error.message || 'Hubo un problema al procesar el pago simulado.');
        paymentLoader.classList.remove('active');
    }
}
