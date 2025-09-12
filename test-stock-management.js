// Simple test to verify stock management functionality
// Run this manually in your browser console or create a proper test file

// Test Stock Management Flow
const testStockManagement = async () => {
  console.log('🧪 Testing Stock Management Flow...');
  
  // Simulate adding item to cart
  console.log('1. Adding item to cart...');
  const addResponse = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      skuId: 'your-sku-id-here', // Replace with actual SKU ID
      quantity: 2, 
      sessionId: 'test-session-' + Date.now()
    }),
  });
  
  const addResult = await addResponse.json();
  console.log('Add result:', addResult);
  
  if (addResponse.ok) {
    console.log('✅ Item added to cart - stock should be reduced');
  } else {
    console.log('❌ Failed to add item:', addResult.error);
    return;
  }
  
  // Get the cart to find cart item ID
  console.log('2. Getting cart details...');
  const sessionId = JSON.parse(localStorage.getItem('cart_session_id') || '""');
  const cartResponse = await fetch(`/api/cart?sessionId=${sessionId}`);
  const cartData = await cartResponse.json();
  console.log('Cart data:', cartData);
  
  if (cartData.items && cartData.items.length > 0) {
    const cartItemId = cartData.items[0].id;
    
    // Update quantity (increase)
    console.log('3. Increasing quantity...');
    const updateResponse = await fetch('/api/cart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cartItemId, 
        newQuantity: 3 
      }),
    });
    
    const updateResult = await updateResponse.json();
    console.log('Update result:', updateResult);
    
    if (updateResponse.ok) {
      console.log('✅ Quantity updated - stock should be further reduced');
    } else {
      console.log('❌ Failed to update quantity:', updateResult.error);
    }
    
    // Remove item (should restore stock)
    console.log('4. Removing item...');
    const removeResponse = await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartItemId }),
    });
    
    const removeResult = await removeResponse.json();
    console.log('Remove result:', removeResult);
    
    if (removeResponse.ok) {
      console.log('✅ Item removed - stock should be restored');
    } else {
      console.log('❌ Failed to remove item:', removeResult.error);
    }
  }
  
  console.log('🏁 Stock management test completed!');
  console.log('💡 Check your database to verify stock quantities were properly managed.');
};

// To run the test:
// testStockManagement();

export { testStockManagement };