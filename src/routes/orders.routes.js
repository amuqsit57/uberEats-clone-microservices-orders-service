import express from "express";
const router = express.Router();
import { 
  createOrder, 
  getOrders, 
  getOrderById, 
  updateOrder, 
  deleteOrder,
  getUserOrders 
} from "../controllers/orders.controllers.js";

// Create a new order
router.post("/", createOrder);

// Get all orders (admin only, optional)
router.get("/", getOrders);

// Get current user's orders
router.get("/user/my-orders", getUserOrders);

// Get specific order by ID
router.get("/:orderId", getOrderById);

// Update order status
router.put("/:orderId", updateOrder);

// Delete an order
router.delete("/:orderId", deleteOrder);

export default router;
