# UberEats Clone - Orders Microservice

Simple CRUD orders service that demonstrates:
- Microservices architecture
- Inter-service communication (REST API + Message Queue)
- JWT authentication
- Database isolation

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- RabbitMQ (optional)

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update `.env` with your PostgreSQL URL (different database than auth service):

```env
DATABASE_URL="postgresql://user:password@localhost:5433/orders_db"
AUTH_SERVICE_URL="http://localhost:5000"
JWT_SECRET="your_jwt_secret_key_here"
```

### Database Migration

```bash
npm run prisma:migrate
```

### Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5001`

## API Endpoints

All endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

### Create Order
```
POST /api/orders
Body: {
  "items": [{id, name, quantity, price}],
  "restaurantId": 1,
  "deliveryAddress": "123 Main St",
  "totalPrice": 45.99
}
```

### Get User's Orders
```
GET /api/orders/user/my-orders
```

### Get Specific Order
```
GET /api/orders/:orderId
```

### Update Order Status
```
PUT /api/orders/:orderId
Body: { "status": "CONFIRMED" }
```

### Delete Order
```
DELETE /api/orders/:orderId
```

## Service Communication

### 1. REST API (Synchronous) - User Lookup
When order is created, we fetch user details from Auth Service:
```
GET http://localhost:5000/api/users/{userId}
```

### 2. Message Queue (Asynchronous) - Events
When order events happen, we publish to RabbitMQ:
- `order.created` - New order placed
- `order.status_updated` - Order status changed
- `order.cancelled` - Order cancelled

Other services subscribe to these events for:
- Payment processing
- Notifications
- Analytics
