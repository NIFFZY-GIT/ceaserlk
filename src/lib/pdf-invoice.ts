import jsPDF from 'jspdf';

export interface InvoiceData {
  orderId: string;
  orderDate: Date;
  customerName: string;
  customerEmail:string;
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
  
  // --- Reusable Layout Constants ---
  const leftMargin = 20;
  const rightMargin = pageWidth - leftMargin;
  const contentWidth = pageWidth - (leftMargin * 2);
  const textPadding = 5; // Padding inside boxes and table cells

  // Colors
  const primaryColor = '#000000';
  const secondaryColor = '#666666';
  
  let yPosition = 20;
  
  // Header - Company Name
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text('CEASAR.COM', pageWidth / 2, yPosition, { align: 'center' });
  
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
  doc.rect(leftMargin, yPosition, contentWidth, 25, 'FD');
  
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text(`Order ID: ${invoiceData.orderId}`, leftMargin + textPadding, yPosition + 8);
  doc.text(`Date: ${invoiceData.orderDate.toLocaleDateString()}`, leftMargin + textPadding, yPosition + 16);
  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, rightMargin - textPadding, yPosition + 8, { align: 'right' });
  
  yPosition += 35;
  
  // Customer Information & Shipping side-by-side (optional improvement for space)
  const infoBlockY = yPosition;
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('Bill To:', leftMargin, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.text(invoiceData.customerName, leftMargin, yPosition);
  yPosition += 6;
  doc.text(invoiceData.customerEmail, leftMargin, yPosition);
  if (invoiceData.phoneNumber) {
    yPosition += 6;
    doc.text(invoiceData.phoneNumber, leftMargin, yPosition);
  }
  
  // Shipping Address
  yPosition = infoBlockY; // Reset Y to align with "Bill To"
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text('Ship To:', rightMargin, yPosition, { align: 'right' });
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.text(invoiceData.shippingAddress.line1, rightMargin, yPosition, { align: 'right' });
  yPosition += 6;
  doc.text(`${invoiceData.shippingAddress.city}, ${invoiceData.shippingAddress.postalCode}`, rightMargin, yPosition, { align: 'right' });
  yPosition += 6;
  doc.text(invoiceData.shippingAddress.country, rightMargin, yPosition, { align: 'right' });
  
  yPosition += 20;
  
  // Items Table Header
  const tableStartY = yPosition;
  // --- DYNAMIC COLUMN WIDTHS ---
  const colWidths = [
    contentWidth * 0.40, // Product
    contentWidth * 0.20, // Variant
    contentWidth * 0.10, // Qty
    contentWidth * 0.15, // Price
    contentWidth * 0.15, // Total
  ];
  const colPositions = [leftMargin];
  for (let i = 0; i < colWidths.length - 1; i++) {
    colPositions.push(colPositions[i] + colWidths[i]);
  }
  
  // Table header background
  doc.setFillColor(0, 0, 0);
  doc.rect(leftMargin, yPosition - 2, contentWidth, 12, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Product', colPositions[0] + textPadding, yPosition + 6);
  doc.text('Variant', colPositions[1] + textPadding, yPosition + 6);
  doc.text('Qty', colPositions[2] + colWidths[2] / 2, yPosition + 6, { align: 'center' });
  doc.text('Price', colPositions[3] + colWidths[3] - textPadding, yPosition + 6, { align: 'right' });
  doc.text('Total', colPositions[4] + colWidths[4] - textPadding, yPosition + 6, { align: 'right' });
  
  yPosition += 15;
  
  // Table Items
  doc.setTextColor(primaryColor);
  doc.setFontSize(9);
  
  invoiceData.items.forEach((item, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(leftMargin, yPosition - 3, contentWidth, 10, 'F');
    }
    
    // Use splitTextToSize for long product names to handle wrapping gracefully
    const productNameLines = doc.splitTextToSize(item.productName, colWidths[0] - (textPadding * 2));
    const variantText = `${item.variantColor}/${item.variantSize}`;

    doc.text(productNameLines, colPositions[0] + textPadding, yPosition + 3);
    doc.text(variantText, colPositions[1] + textPadding, yPosition + 3);
    doc.text(item.quantity.toString(), colPositions[2] + colWidths[2] / 2, yPosition + 3, { align: 'center' });
    doc.text(`LKR ${item.pricePaid.toFixed(2)}`, colPositions[3] + colWidths[3] - textPadding, yPosition + 3, { align: 'right' });
    doc.text(`LKR ${(item.pricePaid * item.quantity).toFixed(2)}`, colPositions[4] + colWidths[4] - textPadding, yPosition + 3, { align: 'right' });
    
    yPosition += 10;
  });
  
  // Table border
  doc.setDrawColor(200, 200, 200);
  doc.rect(leftMargin, tableStartY - 2, contentWidth, yPosition - tableStartY + 2);
  
  yPosition += 10;
  
  // --- CORRECTED SUMMARY SECTION ---
  const summaryLabelX = rightMargin - 50; // Position for labels like "Subtotal:"
  const summaryValueX = rightMargin;     // Position for values, right-aligned
  
  doc.setFontSize(10);
  doc.text('Subtotal:', summaryLabelX, yPosition);
  doc.text(`LKR ${invoiceData.subtotal.toFixed(2)}`, summaryValueX, yPosition, { align: 'right' });
  
  yPosition += 8;
  doc.text('Shipping:', summaryLabelX, yPosition);
  doc.text(`LKR ${invoiceData.shippingCost.toFixed(2)}`, summaryValueX, yPosition, { align: 'right' });
  
  yPosition += 12;
  
  // Total line
  doc.setDrawColor(0, 0, 0);
  doc.line(summaryLabelX, yPosition - 2, summaryValueX, yPosition - 2);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', summaryLabelX, yPosition + 5);
  doc.text(`LKR ${invoiceData.totalAmount.toFixed(2)}`, summaryValueX, yPosition + 5, { align: 'right' });
  
  yPosition += 20;
  
  // Payment Status
  doc.setFillColor(34, 197, 94); // Green background
  doc.rect(leftMargin, yPosition, contentWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT STATUS: PAID', pageWidth / 2, yPosition + 7, { align: 'center' });
  
  yPosition += 25;
  
  // Footer
  doc.setTextColor(secondaryColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Ensure footer is always at the bottom, even on short invoices
  const footerY = pageHeight - 30;
  if (yPosition > footerY) {
    yPosition = footerY; // Prevent footer from overlapping content if page is full
  } else {
    yPosition = footerY; // Move to the bottom for short invoices
  }

  doc.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.text('For any questions regarding this invoice, please contact us.', pageWidth / 2, yPosition, { align: 'center' });
  
  // Company info at bottom
  yPosition = pageHeight - 15;
  doc.text('CEASAR.COM | Fashion & Lifestyle | Sri Lanka', pageWidth / 2, yPosition, { align: 'center' });
  
  return Buffer.from(doc.output('arraybuffer'));
}

export function generateInvoiceFilename(orderId: string): string {
  return `invoice-${orderId}.pdf`;
}