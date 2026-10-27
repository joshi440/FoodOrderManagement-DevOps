
const menuGrid = document.getElementById("menu-grid");
const cartItemsContainer = document.getElementById("cart-items");
const cartTotalElement = document.getElementById("cart-total");
const cartCountElement = document.getElementById("cart-count");
const ordersContainer = document.getElementById("orders-list");
const customerNameInput = document.getElementById("customer-name");

const defaultPhoto =
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";

const foodPhotos = {
    burger:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    pizza:
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    fries:
        "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80"
};

let foods = [];
let cart = [];

try {
    cart = JSON.parse(localStorage.getItem("foodCart") || "[]");
    if (!Array.isArray(cart)) cart = [];
} catch {
    cart = [];
}

// Safely display text received from the backend.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Select a photo based on the food name.
// If MongoDB stores an image URL, use that URL.
function getFoodPhoto(food) {
    if (typeof food.image === "string" &&
        /^https?:\/\//i.test(food.image)) {
        return food.image;
    }

    const name = String(food.name || "").toLowerCase();

    if (name.includes("burger")) return foodPhotos.burger;
    if (name.includes("pizza")) return foodPhotos.pizza;
    if (name.includes("fries")) return foodPhotos.fries;

    return defaultPhoto;
}

// Navigation between Home, Cart, and My Orders.
function showPage(pageId) {
    const validPages = ["menu", "cart", "orders"];

    if (!validPages.includes(pageId)) pageId = "menu";

    document.querySelectorAll(".page").forEach((page) => {
        page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
        link.classList.toggle(
            "active",
            link.dataset.page === pageId
        );
    });

    if (pageId === "cart") renderCart();
    if (pageId === "orders") loadOrders();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();
        showPage(link.dataset.page);
        history.replaceState(null, "", `#${link.dataset.page}`);
    });
});

document.getElementById("explore-menu").addEventListener("click", () => {
    document.getElementById("menu-grid").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});

// Load menu items from MongoDB through Express.
async function loadFoods() {
    menuGrid.innerHTML = '<p class="loading">Loading delicious food...</p>';

    try {
        const response = await fetch("/api/foods");

        if (!response.ok) {
            throw new Error("Unable to load menu");
        }

        foods = await response.json();
        renderMenu();
    } catch (error) {
        console.error("Menu error:", error);

        menuGrid.innerHTML = `
            <p class="error-message">
                Could not load the menu. Check that your server is running.
                Refresh the page and try again.
            </p>
        `;
    }
}

// Display the menu cards.
function renderMenu() {
    if (foods.length === 0) {
        menuGrid.innerHTML = `
            <div class="empty-state">
                <h3>No food items yet</h3>
                <p>Add food items to your database to display the menu.</p>
            </div>
        `;
        return;
    }

    menuGrid.innerHTML = foods.map((food) => `
        <article class="food-card">
            <img
                class="food-image"
                src="${escapeHTML(getFoodPhoto(food))}"
                alt="${escapeHTML(food.name)}"
                loading="lazy"
            >

            <div class="food-details">
                <span class="food-category">
                    ${escapeHTML(food.category || "Popular")}
                </span>

                <h3>${escapeHTML(food.name)}</h3>

                <div class="food-card-bottom">
                    <span class="food-price">
                        ₹${Number(food.price).toFixed(2)}
                    </span>

                    <button
                        class="primary-button add-button"
                        type="button"
                        data-id="${escapeHTML(food._id)}"
                    >
                        + Add
                    </button>
                </div>
            </div>
        </article>
    `).join("");

    // Use event listeners rather than inline JavaScript.
    menuGrid.querySelectorAll(".add-button").forEach((button) => {
        button.addEventListener("click", () => {
            addToCart(button.dataset.id);
        });
    });

    // Replace broken external photos with a fallback image.
    menuGrid.querySelectorAll(".food-image").forEach((image) => {
        image.addEventListener("error", () => {
            image.onerror = null;
            image.src = defaultPhoto;
        });
    });
}

// Add a food item to the cart.
function addToCart(foodId) {
    const food = foods.find(
        (item) => String(item._id) === String(foodId)
    );

    if (!food) return;

    const existing = cart.find(
        (item) => String(item._id) === String(foodId)
    );

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            _id: food._id,
            name: food.name,
            price: Number(food.price),
            image: getFoodPhoto(food),
            quantity: 1
        });
    }

    saveCart();
    renderCart();
    showToast(`${food.name} added to cart`);
}

// Store cart data in this browser.
function saveCart() {
    localStorage.setItem("foodCart", JSON.stringify(cart));

    const count = cart.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
    );

    cartCountElement.textContent = count;
}

// Display cart items and calculate the total.
function renderCart() {
    saveCart();

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-cart-icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p>Choose something delicious from our menu.</p>
                <button class="primary-button" id="browse-menu" type="button">
                    Browse Menu
                </button>
            </div>
        `;

        document.getElementById("browse-menu").addEventListener("click", () => {
            showPage("menu");
        });

        cartTotalElement.textContent = "₹0.00";
        return;
    }

    cartItemsContainer.innerHTML = cart.map((item) => `
        <div class="cart-item">
            <img
                class="cart-item-image"
                src="${escapeHTML(item.image || defaultPhoto)}"
                alt="${escapeHTML(item.name)}"
            >

            <div class="cart-item-details">
                <h3>${escapeHTML(item.name)}</h3>
                <p>₹${Number(item.price).toFixed(2)} each</p>

                <div class="quantity-controls">
                    <button
                        class="quantity-button"
                        data-action="decrease"
                        data-id="${escapeHTML(item._id)}"
                        type="button"
                        aria-label="Decrease quantity"
                    >−</button>

                    <span>${Number(item.quantity)}</span>

                    <button
                        class="quantity-button"
                        data-action="increase"
                        data-id="${escapeHTML(item._id)}"
                        type="button"
                        aria-label="Increase quantity"
                    >+</button>
                </div>
            </div>

            <div class="cart-item-end">
                <strong>
                    ₹${(Number(item.price) * Number(item.quantity)).toFixed(2)}
                </strong>

                <button
                    class="remove-button"
                    data-action="remove"
                    data-id="${escapeHTML(item._id)}"
                    type="button"
                >
                    Remove
                </button>
            </div>
        </div>
    `).join("");

    const total = cart.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0
    );

    cartTotalElement.textContent = `₹${total.toFixed(2)}`;

    cartItemsContainer.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", () => {
            updateCartItem(button.dataset.id, button.dataset.action);
        });
    });

    cartItemsContainer.querySelectorAll(".cart-item-image").forEach((image) => {
        image.addEventListener("error", () => {
            image.onerror = null;
            image.src = defaultPhoto;
        });
    });
}

// Increase, decrease, or remove an item.
function updateCartItem(foodId, action) {
    const item = cart.find(
        (product) => String(product._id) === String(foodId)
    );

    if (!item) return;

    if (action === "increase") {
        item.quantity += 1;
    } else if (action === "decrease") {
        item.quantity -= 1;

        if (item.quantity <= 0) {
            cart = cart.filter(
                (product) => String(product._id) !== String(foodId)
            );
        }
    } else if (action === "remove") {
        cart = cart.filter(
            (product) => String(product._id) !== String(foodId)
        );
    }

    saveCart();
    renderCart();
}

// Place an order through the existing Express API.
async function placeOrder() {
    const customerName = customerNameInput.value.trim();

    if (!customerName) {
        showToast("Please enter your name.");
        customerNameInput.focus();
        return;
    }

    if (cart.length === 0) {
        showToast("Add food to your cart first.");
        return;
    }

    const checkoutButton = document.getElementById("checkout-button");
    checkoutButton.disabled = true;
    checkoutButton.textContent = "Placing order...";

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                customerName,
                items: cart.map((item) => ({
                    name: item.name,
                    price: Number(item.price),
                    quantity: Number(item.quantity)
                }))
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not place order.");
        }

        cart = [];
        saveCart();
        renderCart();
        customerNameInput.value = "";

        showToast("Your order was placed successfully!");
        showPage("orders");
    } catch (error) {
        console.error("Order error:", error);
        showToast(error.message || "Could not place order.");
    } finally {
        checkoutButton.disabled = false;
        checkoutButton.textContent = "Place Order";
    }
}

document.getElementById("checkout-button").addEventListener(
    "click",
    placeOrder
);

// Load all saved orders.
async function loadOrders() {
    ordersContainer.innerHTML = '<p class="loading">Loading your orders...</p>';

    try {
        const response = await fetch("/api/orders");

        if (!response.ok) {
            throw new Error("Unable to load orders.");
        }

        const orders = await response.json();

        if (orders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No orders yet</h3>
                    <p>Your completed checkout orders will appear here.</p>
                </div>
            `;
            return;
        }

        ordersContainer.innerHTML = orders.map((order) => `
            <article class="order-card">
                <div class="order-card-header">
                    <div>
                        <h3>Order #${escapeHTML(String(order._id).slice(-6))}</h3>
                        <p>Customer: ${escapeHTML(order.customerName)}</p>
                    </div>

                    <span class="order-status">
                        ${escapeHTML(order.status || "Placed")}
                    </span>
                </div>

                <div class="order-food-list">
                    ${(order.items || []).map((item) => `
                        <div class="order-food-row">
                            <span>
                                ${escapeHTML(item.name)} × ${Number(item.quantity)}
                            </span>
                            <span>
                                ₹${(
                                    Number(item.price) * Number(item.quantity)
                                ).toFixed(2)}
                            </span>
                        </div>
                    `).join("")}
                </div>

                <div class="order-card-footer">
                    <span>
                        ${order.createdAt
                            ? new Date(order.createdAt).toLocaleString()
                            : "Date unavailable"}
                    </span>

                    <strong>Total: ₹${Number(order.total).toFixed(2)}</strong>
                </div>
            </article>
        `).join("");
    } catch (error) {
        console.error("Orders error:", error);

        ordersContainer.innerHTML = `
            <p class="error-message">
                Unable to load orders. Please refresh and try again.
            </p>
        `;
    }
}

// Display a temporary notification.
function showToast(message) {
    let toast = document.getElementById("toast-message");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-message";
        toast.className = "toast-message";
        toast.setAttribute("role", "status");
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// Start the application.
saveCart();
renderCart();

const initialPage = window.location.hash.replace("#", "");
showPage(["menu", "cart", "orders"].includes(initialPage) ? initialPage : "menu");
loadFoods();
