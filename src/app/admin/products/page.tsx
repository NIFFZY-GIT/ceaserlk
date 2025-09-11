"use client"; // <-- Add this at the top of the file

import { useState, useEffect } from 'react'; // Import useState and useEffect
import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/app/components/ui/Modal'; // <-- Import the new Modal component

// Define the shape of a product
interface Product {
  product_id: number;
  name: string;
  image_url: string;
  total_stock: number;
  price: number;
  sale_price?: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for controlling the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      setProducts(data);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeDeleteModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(false);
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      const response = await fetch(`/api/admin/products/${selectedProduct.product_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      // Remove the deleted product from the state
      setProducts(products.filter(p => p.product_id !== selectedProduct.product_id));
      
      // Close modal and reset state
      closeDeleteModal();
      
      // Show success message (you might want to add a toast notification here)
      console.log('Product deleted successfully');
      
    } catch (error) {
      console.error('Error deleting product:', error);
      // You might want to show an error toast here
      alert('Failed to delete product. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin"/></div>;
  }

  return (
    <>
      {/* The Modal component is here, ready to be triggered */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeDeleteModal} 
        title="Confirm Deletion"
      >
        <p className="text-gray-600">
          Are you sure you want to delete the product: <span className="font-semibold">{selectedProduct?.name}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={closeDeleteModal} className="px-4 py-2 font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancel
          </button>
          <button onClick={handleDeleteProduct} className="px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">
            Delete Product
          </button>
        </div>
      </Modal>

      {/* Your existing page content */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Products</h1>
          <Link href="/admin/products/new" className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-primary hover:bg-primary/90">
            <PlusCircle size={20} />
            <span>Add New</span>
          </Link>
        </div>

        <div className="overflow-hidden bg-white rounded-lg shadow">
          <table className="w-full text-left">
            {/* ... table head ... */}
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Image</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Stock</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.product_id}>
                  {/* ... other table cells ... */}
                  <td className="px-6 py-4"><Image src={product.image_url || '/placeholder.png'} alt={product.name} width={50} height={50} className="object-cover rounded-md"/></td>
                  <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4">{product.total_stock || 0}</td>
                  <td className="px-6 py-4">${product.sale_price ? product.sale_price : product.price}</td>
                  <td className="px-6 py-4 space-x-4">
                    <Link href={`/admin/products/${product.product_id}/edit`} className="font-medium text-primary hover:underline">
                      Edit
                    </Link>
                    <button onClick={() => openDeleteModal(product)} className="font-medium text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}