
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");

        app.listen(process.env.PORT || 3000, () => {
            console.log("Server running at http://localhost:3000");
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });

const foodSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        default: "Other"
    },
    image: {
        type: String,
        default: ""
    }
});

const orderSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true
    },
    items: [{
        name: String,
        price: Number,
        quantity: {
            type: Number,
            min: 1
        }
    }],
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        default: "Placed"
    }
}, { timestamps: true });

const Food = mongoose.model("Food", foodSchema);
const Order = mongoose.model("Order", orderSchema);

// Test the backend
app.get("/api/health", (req, res) => {
    res.json({ message: "FoodOrderManagement API is running" });
});

// Get all food items
app.get("/api/foods", async (req, res) => {
    try {
        const foods = await Food.find();
        res.json(foods);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch foods" });
    }
});

// Add a food item
app.post("/api/foods", async (req, res) => {
    try {
        const food = await Food.create(req.body);
        res.status(201).json(food);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Place an order
app.post("/api/orders", async (req, res) => {
    try {
        const { customerName, items } = req.body;

        if (!customerName || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: "Customer name and at least one item are required"
            });
        }

        const validItems = items.every(item =>
            typeof item.name === "string" &&
            typeof item.price === "number" &&
            Number.isFinite(item.price) &&
            item.price >= 0 &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0
        );

        if (!validItems) {
            return res.status(400).json({ error: "Invalid order items" });
        }

        const total = items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        const order = await Order.create({
            customerName,
            items,
            total
        });

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: "Failed to place order" });
    }
});

// View all orders
app.get("/api/orders", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});
