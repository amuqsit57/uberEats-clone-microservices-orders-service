import axios from "axios";
import prisma from "../config/prisma.js";
import { logOrderError } from "../middleware/logger.middleware.js";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:5000";

/**
 * Fetch user details from Auth Service
 * This demonstrates SERVICE-TO-SERVICE communication
 */
const fetchUserDetails = async (userId) => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/users/${userId}`, {
      timeout: 5000,
    });

    const payload = response.data;
    return payload?.user ?? payload;
  } catch (error) {
    console.warn(`Could not fetch user ${userId} from auth service:`, error.message);
    // Return minimal user info from order's cached data
    return null;
  }
};

/**
 * CREATE ORDER
 * When user places an order, we:
 * 1. Validate user (from token)
 * 2. Create order in orders database
 * 3. Publish event to queue for other services
 */
export const createOrder = async (req, res) => {
  const { items, restaurantId, deliveryAddress, totalPrice } = req.body;
  const userId = req.userId; // From JWT token

  if (!items || !restaurantId || !deliveryAddress || !totalPrice) {
    return res.status(400).json({
      message: "items, restaurantId, deliveryAddress, and totalPrice are required",
    });
  }

  try {
    // Fetch user details to store with order (optional but useful)
    const userDetails = await fetchUserDetails(userId);

    // Create order
    const order = await prisma.order.create({
      data: {
        userId,
        restaurantId,
        items: items, // Store as JSON
        deliveryAddress,
        totalPrice,
        status: "PENDING",
        userEmail: userDetails?.email, // Cache user email
        userName: userDetails?.name,
      },
    });

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (err) {
    logOrderError("createOrder", err);
    res.status(500).json({
      message: "Failed to create order",
      error: process.env.NODE_ENV === "development" ? err?.message : undefined,
    });
  }
};

/**
 * GET USER'S ORDERS
 * Fetch all orders for the authenticated user
 */
export const getUserOrders = async (req, res) => {
  const userId = req.userId;

  try {
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      message: "Orders retrieved successfully",
      count: orders.length,
      orders,
    });
  } catch (err) {
    logOrderError("getUserOrders", err);
    res.status(500).json({
      message: "Failed to fetch orders",
      error: process.env.NODE_ENV === "development" ? err?.message : undefined,
    });
  }
};

/**
 * GET ALL ORDERS (with user details)
 * Admin endpoint - returns all orders with enriched user data
 */
export const getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 orders
    });

    res.status(200).json({
      message: "All orders retrieved",
      count: orders.length,
      orders,
    });
  } catch (err) {
    logOrderError("getOrders", err);
    res.status(500).json({
      message: "Failed to fetch orders",
      error: process.env.NODE_ENV === "development" ? err?.message : undefined,
    });
  }
};

/**
 * GET ORDER BY ID
 * Fetch specific order details
 */
export const getOrderById = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.userId;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization - user can only see their own orders
    if (order.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.status(200).json({
      message: "Order retrieved successfully",
      order,
    });
  } catch (err) {
    logOrderError("getOrderById", err);
    res.status(500).json({
      message: "Failed to fetch order",
      error: process.env.NODE_ENV === "development" ? err?.message : undefined,
    });
  }
};

/**
 * UPDATE ORDER STATUS
 * Update order status (PENDING -> CONFIRMED -> PREPARING -> READY -> DELIVERED)
 */
export const updateOrder = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const userId = req.userId;

  const validStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      message: `Status must be one of: ${validStatuses.join(", ")}`,
    });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only owner can update their order status (or admin)
    if (order.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { status },
    });

    res.status(200).json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (err) {
    logOrderError("updateOrder", err);
    res.status(500).json({
      message: "Failed to update order",
      error: process.env.NODE_ENV === "development" ? err?.message : undefined,
    });
  }
};

/**
 * DELETE ORDER
 * Delete an order (only if in PENDING status)
 */
export const deleteOrder = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.userId;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (order.status !== "PENDING") {
      return res.status(400).json({
        message: "Only pending orders can be deleted",
      });
    }

    const deletedOrder = await prisma.order.delete({
      where: { id: parseInt(orderId) },
    });

    res.status(200).json({
      message: "Order deleted successfully",
      order: deletedOrder,
    });
  } catch (err) {
    logOrderError("deleteOrder", err);
    res.status(500).json({
      message: "Failed to delete order",
      error: process.env.NODE_ENV === "development" ? err?.message : undefined,
    });
  }
};
