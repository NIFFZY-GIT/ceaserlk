import { db } from './db';
import type { Order } from './types';

const PROFILE_QUERY = `
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
            'customerEmail', o.customer_email,
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
                  'product_id', oi.product_id,
                  'imageUrl', pv.thumbnail_url,
                  'thumbnailUrl', pv.thumbnail_url,
                  'variant_images', COALESCE(vi.images, '[]'::json),
                  'trading_card_image', p.trading_card_image,
                  'product', json_build_object(
                    'name', oi.product_name,
                    'images', COALESCE(vi.images, json_build_array(pv.thumbnail_url))
                  )
                )
              ) FROM order_items oi
              LEFT JOIN stock_keeping_units sku ON oi.sku_id = sku.id
              LEFT JOIN product_variants pv ON sku.variant_id = pv.id
              LEFT JOIN products p ON oi.product_id = p.id
              LEFT JOIN (
                SELECT 
                  variant_id,
                  json_agg(
                    json_build_object(
                      'id', id,
                      'image_url', image_url,
                      'alt_text', alt_text,
                      'display_order', display_order
                    ) ORDER BY display_order ASC
                  ) as images
                FROM variant_images
                GROUP BY variant_id
              ) vi ON pv.id = vi.variant_id
              WHERE oi.order_id = o.id
            )
          ) ORDER BY o.created_at DESC
        )
        FROM orders o
        WHERE o.customer_email = u.email
      ), '[]'::json
    ) as orders
  FROM users u
  WHERE u.id = $1::uuid;
`;

export type ProfileData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  orders: Order[];
};

export async function getProfileWithOrders(userId: string): Promise<ProfileData | null> {
  const { rows } = await db.query(PROFILE_QUERY, [userId]);

  if (rows.length === 0) {
    return null;
  }

  const profileData = rows[0];
  profileData.orders = Array.isArray(profileData.orders) ? profileData.orders : [];

  return profileData as ProfileData;
}
