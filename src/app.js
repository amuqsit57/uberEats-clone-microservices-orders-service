import express from "express";
import cors from "cors";
import ordersRoutes from "./routes/orders.routes.js";
import { verifyToken } from "./middleware/auth.middleware.js";

const maskSensitiveFields = (value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(maskSensitiveFields);
  }

  const masked = {};
  for (const [key, val] of Object.entries(value)) {
    if (["password", "token"].includes(key.toLowerCase())) {
      masked[key] = "***";
    } else {
      masked[key] = maskSensitiveFields(val);
    }
  }

  return masked;
};

const app = express()

app.use(cors({
  origin: ["http://localhost:3002", "http://localhost:5000"],
  credentials: true,
}));

app.use(express.json())

app.use((req, res, next) => {
  const startedAt = Date.now();
  let responsePayload;

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responsePayload = body;
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (responsePayload === undefined) {
      responsePayload = body;
    }
    return originalSend(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    const maskedPayload = maskSensitiveFields(responsePayload);
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === "development" && {
        payload: maskedPayload,
      }),
    });
  });

  next();
});

// Public health check
app.get("/health", (req, res) => {
  res.json({ status: "Orders service is running" });
});

// Protected routes - require authentication
app.use("/api/orders", verifyToken, ordersRoutes);

export default app;
