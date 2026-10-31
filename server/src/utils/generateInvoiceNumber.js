// INV/000042
export const generateInvoiceNumber = (id) => `INV/${String(id).padStart(6, '0')}`;
