import jsPDF from 'jspdf';

export interface InvoiceData {
  orderId: string;
  orderDate: Date;
  customerName: string;
  customerEmail: string;
  phoneNumber?: string;
  shippingAddress: {
    line1: string;
    city: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    productName: string;
    variantColor: string;
    variantSize: string;
    quantity: number;
    pricePaid: number;
  }>;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
}

export function generateInvoicePDF(invoiceData: InvoiceData): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Colors
  const primaryColor = '#000000';
  const secondaryColor = '#666666';
  
  let yPosition = 20;
  
  // Header - Company Name
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text('CEASER LK', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(secondaryColor);
  doc.text('Fashion & Lifestyle', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  // Invoice Title
  doc.setFontSize(18);
  doc.setTextColor(primaryColor);
  doc.text('INVOICE', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  
  // Order Information Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 249, 250);
  doc.rect(20, yPosition, pageWidth - 40, 25, 'FD');
  
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text(`Order ID: ${invoiceData.orderId}`, 25, yPosition + 8);
  doc.text(`Date: ${invoiceData.orderDate.toLocaleDateString()}`, 25, yPosition + 16);
  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, pageWidth - 25, yPosition + 8, { align: 'right' });
  
  yPosition += 35;
  
  // Customer Information
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('Bill To:', 25, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.text(invoiceData.customerName, 25, yPosition);
  yPosition += 6;
  doc.text(invoiceData.customerEmail, 25, yPosition);
  if (invoiceData.phoneNumber) {
    yPosition += 6;
    doc.text(invoiceData.phoneNumber, 25, yPosition);
  }
  
  yPosition += 15;
  
  // Shipping Address
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('Ship To:', 25, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.text(invoiceData.shippingAddress.line1, 25, yPosition);
  yPosition += 6;
  doc.text(`${invoiceData.shippingAddress.city}, ${invoiceData.shippingAddress.postalCode}`, 25, yPosition);
  yPosition += 6;
  doc.text(invoiceData.shippingAddress.country, 25, yPosition);
  
  yPosition += 20;
  
  // Items Table Header
  const tableStartY = yPosition;
  const colWidths = [80, 40, 25, 30, 30];
  const colPositions = [25];
  for (let i = 0; i < colWidths.length - 1; i++) {
    colPositions.push(colPositions[i] + colWidths[i]);
  }
  
  // Table header background
  doc.setFillColor(0, 0, 0);
  doc.rect(20, yPosition - 2, pageWidth - 40, 12, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Product', colPositions[0], yPosition + 6);
  doc.text('Variant', colPositions[1], yPosition + 6);
  doc.text('Qty', colPositions[2], yPosition + 6, { align: 'center' });
  doc.text('Price', colPositions[3], yPosition + 6, { align: 'right' });
  doc.text('Total', colPositions[4], yPosition + 6, { align: 'right' });
  
  yPosition += 15;
  
  // Table Items
  doc.setTextColor(primaryColor);
  doc.setFontSize(9);
  
  invoiceData.items.forEach((item, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(20, yPosition - 3, pageWidth - 40, 10, 'F');
    }
    
    // Product name (truncate if too long)
    let productName = item.productName;
    if (productName.length > 25) {
      productName = productName.substring(0, 22) + '...';
    }
    
    doc.text(productName, colPositions[0], yPosition + 3);
    doc.text(`${item.variantColor}/${item.variantSize}`, colPositions[1], yPosition + 3);
    doc.text(item.quantity.toString(), colPositions[2] + 12, yPosition + 3, { align: 'center' });
    doc.text(`LKR ${item.pricePaid.toFixed(2)}`, colPositions[3] + 25, yPosition + 3, { align: 'right' });
    doc.text(`LKR ${(item.pricePaid * item.quantity).toFixed(2)}`, colPositions[4] + 25, yPosition + 3, { align: 'right' });
    
    yPosition += 10;
  });
  
  // Table border
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, tableStartY - 2, pageWidth - 40, yPosition - tableStartY + 2);
  
  yPosition += 10;
  
  // Summary Section
  const summaryStartX = pageWidth - 80;
  
  doc.setFontSize(10);
  doc.text('Subtotal:', summaryStartX, yPosition);
  doc.text(`LKR ${invoiceData.subtotal.toFixed(2)}`, summaryStartX + 50, yPosition, { align: 'right' });
  
  yPosition += 8;
  doc.text('Shipping:', summaryStartX, yPosition);
  doc.text(`LKR ${invoiceData.shippingCost.toFixed(2)}`, summaryStartX + 50, yPosition, { align: 'right' });
  
  yPosition += 12;
  
  // Total line
  doc.setDrawColor(0, 0, 0);
  doc.line(summaryStartX, yPosition - 2, summaryStartX + 50, yPosition - 2);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', summaryStartX, yPosition + 5);
  doc.text(`LKR ${invoiceData.totalAmount.toFixed(2)}`, summaryStartX + 50, yPosition + 5, { align: 'right' });
  
  yPosition += 20;
  
  // Payment Status
  doc.setFillColor(34, 197, 94); // Green background
  doc.rect(20, yPosition, pageWidth - 40, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT STATUS: PAID', pageWidth / 2, yPosition + 7, { align: 'center' });
  
  yPosition += 25;
  
  // Footer
  if (yPosition < pageHeight - 40) {
    doc.setTextColor(secondaryColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    doc.text('For any questions regarding this invoice, please contact us.', pageWidth / 2, yPosition, { align: 'center' });
    
    // Company info at bottom
    yPosition = pageHeight - 20;
    doc.text('Ceaser LK | Fashion & Lifestyle | Sri Lanka', pageWidth / 2, yPosition, { align: 'center' });
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

export function generateInvoiceFilename(orderId: string): string {
  return `invoice-${orderId}.pdf`;
}