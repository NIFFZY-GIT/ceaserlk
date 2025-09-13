// These types must manually be kept in sync with your database schema.
import { z } from 'zod';

// Zod schemas for runtime validation and type inference
export const UserSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone_number: z.string().nullable(),
  password_hash: z.string(),
});

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  product_name: z.string(),
  variant_color: z.string().nullable(),
  variant_size: z.string().nullable(),
  price_paid: z.number(),
  quantity: z.number(),
  image_url: z.string().nullable(), // We will fetch this via a JOIN
});

export const ShippingAddressSchema = z.object({
    fullName: z.string(),
    line1: z.string(),
    city: z.string(),
    postalCode: z.string(),
    country: z.string(),
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  created_at: z.date(),
  total_amount: z.number(),
  shipping_address_line1: z.string(),
  shipping_city: z.string(),
  shipping_postal_code: z.string(),
  shipping_country: z.string(),
  full_name: z.string().nullable(),
  items: z.array(OrderItemSchema), // Placeholder, will be populated by our query
});

// TypeScript types inferred from Zod schemas
export type DbUser = z.infer<typeof UserSchema>;

// Types for the frontend (slightly different shape)
// This file will hold the data shapes used across your application.

// This file will hold the data shapes used across your application.

export interface OrderItem {
  id: string;
  productName: string;
  // Let's add color and size for more detail
  variantColor: string | null;
  variantSize: string | null;
  pricePaid: string;
  quantity: number;
  imageUrl: string | null; // The image for the specific variant
  product?: {
    name: string;
    images?: string[];
  };
  price: number; // For compatibility with OrderCard component
}

export interface Order {
  id: string;
  status: 'PENDING'|'PAID'|'PROCESSING'|'PACKED'|'SHIPPED'|'DELIVERED'|'CANCELLED'|'REFUNDED';
  totalAmount: string;
  createdAt: string; // Changed from created_at for JS convention
  created_at: string; // Keep both for compatibility
  total_amount: number; // For compatibility with OrderCard component
  shipping_address?: string; // For compatibility with OrderCard component
  shippingAddress: {
    fullName: string;
    line1: string;
    city: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
}

// Database types matching the PostgreSQL schema
export interface DbOrder {
  id: string;
  user_id: string | null;
  status: 'PENDING'|'PAID'|'PROCESSING'|'PACKED'|'SHIPPED'|'DELIVERED'|'CANCELLED'|'REFUNDED';
  customer_email: string;
  shipping_address_line1: string;
  shipping_address_line2?: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  payment_intent_id?: string;
  created_at: string;
  full_name?: string;
  phone_number?: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_name: string;
  variant_color?: string;
  variant_size?: string;
  price_paid: number;
  quantity: number;
  product_id?: string;
  sku_id?: string;
}