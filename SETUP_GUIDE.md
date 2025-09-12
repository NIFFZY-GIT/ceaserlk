# CEASER.LK E-commerce Setup Guide

## 🚀 Quick Start

### 1. Database Setup

First, ensure you have PostgreSQL running and create the required tables:

```bash
# Run the database setup script
psql -d your_database_name -f database_setup.sql

# Add sample data for testing
psql -d your_database_name -f sample_data.sql
```

### 2. Environment Configuration

Create a `.env.local` file with your database connection:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
NEXTAUTH_SECRET=your-random-secret-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` (or the port shown in terminal)

## 🧪 Testing the Complete E-commerce Flow

### Step 1: Browse Products
- Go to `/shop` to see all products
- Products should load from your database
- Use filters and search functionality

### Step 2: View Product Details
- Click on any product card
- You'll be taken to `/product/[id]` 
- Select color and size
- Adjust quantity
- Click "Add to Cart"

### Step 3: Manage Cart
- Open cart drawer (cart icon in navbar)
- Update quantities
- Remove items
- Proceed to checkout

### Step 4: Complete Checkout
- Fill in shipping information
- Select payment method (Stripe/PayPal/COD)
- Review order summary
- Place order

### Step 5: Order Confirmation
- View order details
- Download invoice PDF
- Track order status

## 🗄️ Database Schema

### Required Tables:
- `products` - Product information
- `product_sizes` - Size options with stock
- `product_colors` - Available colors
- `categories` - Product categories
- `Cart` - Shopping cart sessions
- `CartItem` - Items in shopping carts
- `orders` - Order information
- `order_items` - Items in orders

## 🔧 API Endpoints

### Products
- `GET /api/products` - List all products with filters
- `GET /api/products/[id]` - Get single product with sizes/colors
- `GET /api/products/price-range` - Get min/max prices for filtering

### Cart Management
- `GET /api/cart` - Get cart contents
- `POST /api/cart/items` - Add item to cart
- `PATCH /api/cart/items` - Update cart item
- `DELETE /api/cart/items` - Remove cart item

### Checkout & Orders
- `POST /api/checkout` - Process order
- `GET /api/orders/[id]` - Get order details
- `GET /api/orders/[id]/invoice` - Download invoice

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

## 🎯 Features Implemented

### ✅ Product Management
- [x] Dynamic product pages with real database data
- [x] Size and color selection with stock management
- [x] Sale price handling and discount display
- [x] Product filtering and search
- [x] Price range filtering with dynamic min/max values

### ✅ Shopping Cart
- [x] Add/update/remove cart items
- [x] Cart persistence across sessions
- [x] Stock validation and reservation
- [x] Cart expiration handling
- [x] Foreign key constraint fixes

### ✅ Authentication System
- [x] JWT-based authentication
- [x] Role-based access (User/Admin)
- [x] Conditional navbar navigation
- [x] Profile and dashboard routing

### ✅ Checkout System
- [x] Multi-step checkout form
- [x] Multiple payment methods (Stripe/PayPal/COD)
- [x] Order processing and confirmation
- [x] Invoice generation and PDF download
- [x] Email notifications (ready for SMTP)

### ✅ Admin Features
- [x] Product management
- [x] Order management
- [x] Customer management
- [x] Dashboard with statistics

## 🧹 Troubleshooting

### Product Pages Not Loading?
1. Check if `product_colors` table exists:
   ```sql
   SELECT * FROM product_colors;
   ```
2. Ensure products have `is_active = true`
3. Check browser console for API errors

### Cart Issues?
1. Check if `Cart` and `CartItem` tables exist
2. Verify cart ID is being stored in cookies
3. Check for foreign key constraint errors in logs

### Checkout Failing?
1. Ensure `orders` and `order_items` tables exist
2. Check form validation in browser console
3. Verify all required fields are filled

### Database Connection Issues?
1. Check `DATABASE_URL` in `.env.local`
2. Ensure PostgreSQL is running
3. Verify database exists and user has permissions

## 🔐 Security Notes

- Input validation with Zod schemas
- Parameterized SQL queries prevent injection
- JWT tokens for authentication
- CORS protection enabled
- Environment variables for sensitive data

## 📈 Performance Optimization

- Database indexing on frequently queried columns
- Connection pooling for database
- Image optimization with Next.js Image component
- Lazy loading and code splitting
- Efficient cart state management

## 🚀 Production Deployment

### Environment Variables for Production:
```env
DATABASE_URL=your_production_database_url
NEXTAUTH_SECRET=your_production_secret
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
PAYPAL_CLIENT_ID=your_paypal_client_id
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

### Deployment Checklist:
- [ ] Database tables created and populated
- [ ] Environment variables configured
- [ ] Payment gateways configured
- [ ] SMTP for email notifications
- [ ] SSL certificates installed
- [ ] Domain configured
- [ ] Error monitoring setup

## 📞 Support

If you encounter any issues:

1. Check the browser console for errors
2. Verify database connection and schema
3. Ensure all environment variables are set
4. Check the terminal for server-side errors

Happy coding! 🎉
