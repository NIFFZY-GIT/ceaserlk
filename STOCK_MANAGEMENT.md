# Cart Stock Management Implementation

This document explains how the shopping cart system manages inventory stock to prevent overselling and ensure accurate stock tracking.

## How It Works

### 1. **Adding Items to Cart (POST /api/cart)**
- ✅ Checks if enough stock is available before adding
- ✅ Reserves stock by reducing `stock_quantity` in the database
- ✅ Uses database transactions to prevent race conditions
- ✅ Returns 409 Conflict status if insufficient stock

```sql
-- Stock is reduced when item is added to cart
UPDATE stock_keeping_units 
SET stock_quantity = stock_quantity - $1 
WHERE id = $2
```

### 2. **Updating Cart Quantity (PUT /api/cart)**
- ✅ Calculates the difference between old and new quantities
- ✅ If increasing: Checks stock availability and reserves additional stock
- ✅ If decreasing: Restores stock back to available inventory
- ✅ Handles edge cases like setting quantity to 0 (removes item)

```sql
-- When increasing quantity (e.g., 2 → 5, difference = +3)
UPDATE stock_keeping_units 
SET stock_quantity = stock_quantity - 3 
WHERE id = $1

-- When decreasing quantity (e.g., 5 → 2, difference = -3) 
UPDATE stock_keeping_units 
SET stock_quantity = stock_quantity + 3 
WHERE id = $1
```

### 3. **Removing Items from Cart (DELETE /api/cart)**
- ✅ Restores the full quantity back to available stock
- ✅ Deletes the cart item from the database

```sql
-- Stock is restored when item is removed
UPDATE stock_keeping_units 
SET stock_quantity = stock_quantity + $1 
WHERE id = $2
```

### 4. **Expired Cart Cleanup**
- ✅ Automatically runs when accessing cart endpoints
- ✅ Finds all expired carts (older than 30 minutes)
- ✅ Restores stock for all items in expired carts
- ✅ Deletes expired carts and their items

```sql
-- Find expired cart items and restore their stock
SELECT ci.sku_id, ci.quantity
FROM carts c
JOIN cart_items ci ON c.id = ci.cart_id  
WHERE c.expires_at < NOW()
```

## Database Schema

### Key Tables
- `carts` - Shopping cart sessions with expiration
- `cart_items` - Items in each cart with quantities  
- `stock_keeping_units` - Product variants with stock quantities
- `product_variants` - Product color/variant information
- `products` - Base product information

### Stock Flow
1. **Available Stock** → Stock in `stock_keeping_units.stock_quantity`
2. **Reserved Stock** → Stock held in active cart items
3. **Expired Cleanup** → Automatic restoration of abandoned cart stock

## Frontend Integration

### CartContext Updates
- ✅ Returns boolean success/failure from cart operations
- ✅ Provides error messages for stock issues
- ✅ Handles 409 Conflict responses for insufficient stock

### Product Page
- ✅ Shows stock-related error messages to users
- ✅ Provides visual feedback for stock issues
- ✅ Handles both success and failure states

## Error Handling

### Stock Validation Errors
- **409 Conflict**: Not enough stock available
- **500 Error**: Database or server issues
- **400 Bad Request**: Missing required parameters

### User Experience
- Clear error messages for stock issues
- Visual animations for feedback
- Automatic error dismissal options

## Benefits

1. **Prevents Overselling**: Stock is reserved when added to cart
2. **Accurate Inventory**: Real-time stock tracking with database updates
3. **Automatic Cleanup**: Expired carts don't permanently hold stock
4. **Race Condition Safe**: Database transactions and FOR UPDATE locks
5. **User Friendly**: Clear error messages and visual feedback

## Testing

Use the provided `test-stock-management.js` file to verify:
1. Stock reduction when adding to cart
2. Stock adjustment when changing quantities  
3. Stock restoration when removing items
4. Error handling for insufficient stock

## Next Steps

- Implement order completion to permanently reduce stock
- Add stock reservation timeout warnings
- Create admin dashboard for stock monitoring
- Add webhook notifications for low stock alerts