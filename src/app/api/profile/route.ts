import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // For now, use the hardcoded user from your database
    const userId = '722e9dc0-5b31-41b5-a791-2a8b46a2f062'; // Kotalawalage Dasun

    // This single, powerful query gets the user and all their orders with nested items,
    // including the thumbnail image for each item.
    const query = `
      SELECT
        u.id,
        u.first_name AS "firstName",
        u.last_name AS "lastName",
        u.email,
        u.phone_number AS "phoneNumber",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', o.id,
                'status', o.status,
                'totalAmount', o.total_amount::text,
                'total_amount', o.total_amount,
                'createdAt', o.created_at,
                'created_at', o.created_at,
                'shipping_address', CONCAT(o.full_name, ', ', o.shipping_address_line1, ', ', o.shipping_city, ', ', o.shipping_postal_code, ', ', o.shipping_country),
                'shippingAddress', json_build_object(
                    'fullName', o.full_name,
                    'line1', o.shipping_address_line1,
                    'city', o.shipping_city,
                    'postalCode', o.shipping_postal_code,
                    'country', o.shipping_country
                ),
                'items', (
                  SELECT json_agg(
                    json_build_object(
                      'id', oi.id,
                      'productName', oi.product_name,
                      'variantColor', oi.variant_color,
                      'variantSize', oi.variant_size,
                      'pricePaid', oi.price_paid::text,
                      'price', oi.price_paid,
                      'quantity', oi.quantity,
                      -- Join to get the thumbnail URL for the specific variant ordered
                      'imageUrl', pv.thumbnail_url,
                      'product', json_build_object(
                        'name', oi.product_name,
                        'images', ARRAY[pv.thumbnail_url]
                      )
                    )
                  ) FROM order_items oi
                  LEFT JOIN stock_keeping_units sku ON oi.sku_id = sku.id
                  LEFT JOIN product_variants pv ON sku.variant_id = pv.id
                  WHERE oi.order_id = o.id
                )
              ) ORDER BY o.created_at DESC
            )
            FROM orders o
            WHERE o.customer_email = u.email  -- Match by email since user_id might be null
          ), '[]'::json
        ) as orders
      FROM users u
      WHERE u.id = $1::uuid;
    `;
    const { rows } = await db.query(query, [userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Ensure orders is an array, even if the user has none
    const profileData = rows[0];
    profileData.orders = profileData.orders || [];

    return NextResponse.json(profileData);
  } catch (error) {
    console.error(`API GET Profile Error:`, error);
    return NextResponse.json({ error: "Failed to fetch profile data" }, { status: 500 });
  }
}