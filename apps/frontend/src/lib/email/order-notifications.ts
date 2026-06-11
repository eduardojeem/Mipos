import { BusinessConfig } from '@/types/business-config';
import { sendEmail } from './resend';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderEmailData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: string;
  status: string;
  notes?: string;
  created_at: string;
  order_items: OrderItem[];
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Genera el template de email para confirmación de pedido
 */
export function generateOrderConfirmationEmail(
  order: OrderEmailData,
  config: BusinessConfig
): EmailTemplate {
  const businessName = config.businessName || 'Mi Negocio';
  const primaryColor = config.branding?.primaryColor || '#ec4899';
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/orders/track?order=${order.order_number}`;
  
  const formatPrice = (amount: number) => {
    const currency = config.storeSettings?.currencySymbol || '₲';
    return `${currency} ${amount.toLocaleString('es-PY')}`;
  };

  const itemsHtml = order.order_items
    .map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${item.product_name}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          ${formatPrice(item.unit_price)}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          <strong>${formatPrice(item.subtotal)}</strong>
        </td>
      </tr>
    `)
    .join('');

  const itemsText = order.order_items
    .map(item => `• ${item.product_name} x${item.quantity} - ${formatPrice(item.subtotal)}`)
    .join('\n');

  const subject = `Confirmación de Pedido ${order.order_number} - ${businessName}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${primaryColor}, #9333ea); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">¡Gracias por tu pedido!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
          Tu pedido ha sido recibido y está siendo procesado
        </p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: ${primaryColor}; margin-top: 0; font-size: 20px;">
            Pedido ${order.order_number}
          </h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
              <p style="margin: 5px 0;"><strong>Cliente:</strong> ${order.customer_name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${order.customer_email}</p>
              <p style="margin: 5px 0;"><strong>Teléfono:</strong> ${order.customer_phone}</p>
              ${order.customer_address ? `<p style="margin: 5px 0;"><strong>Dirección:</strong> ${order.customer_address}</p>` : ''}
            </div>
            <div>
              <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleDateString('es-PY')}</p>
              <p style="margin: 5px 0;"><strong>Estado:</strong> <span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Pendiente</span></p>
              <p style="margin: 5px 0;"><strong>Pago:</strong> ${order.payment_method === 'CASH' ? 'Efectivo' : order.payment_method === 'CARD' ? 'Tarjeta' : 'Transferencia'}</p>
            </div>
          </div>
        </div>

        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: ${primaryColor}; margin-top: 0;">Productos del Pedido</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Producto</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Cant.</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Precio</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Subtotal:</span>
              <span>${formatPrice(order.subtotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Envío:</span>
              <span>${formatPrice(order.shipping_cost)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: ${primaryColor}; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <span>Total:</span>
              <span>${formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        ${order.notes ? `
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: ${primaryColor}; margin-top: 0;">Notas del Pedido</h3>
          <p style="margin: 0; color: #6b7280;">${order.notes}</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px;">
          <a href="${trackingUrl}" 
             style="display: inline-block; background: ${primaryColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Seguir mi Pedido
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p>¿Tienes preguntas sobre tu pedido?</p>
          <p>Contáctanos: 
            ${config.contact?.email ? `<a href="mailto:${config.contact.email}" style="color: ${primaryColor};">${config.contact.email}</a>` : ''}
            ${config.contact?.phone ? ` | <a href="tel:${config.contact.phone}" style="color: ${primaryColor};">${config.contact.phone}</a>` : ''}
          </p>
          <p style="margin-top: 20px;">
            <strong>${businessName}</strong><br>
            ${config.tagline || 'Gracias por confiar en nosotros'}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
¡Gracias por tu pedido!

Tu pedido ${order.order_number} ha sido recibido y está siendo procesado.

DETALLES DEL PEDIDO:
Cliente: ${order.customer_name}
Email: ${order.customer_email}
Teléfono: ${order.customer_phone}
${order.customer_address ? `Dirección: ${order.customer_address}` : ''}
Fecha: ${new Date(order.created_at).toLocaleDateString('es-PY')}
Estado: Pendiente
Pago: ${order.payment_method === 'CASH' ? 'Efectivo' : order.payment_method === 'CARD' ? 'Tarjeta' : 'Transferencia'}

PRODUCTOS:
${itemsText}

TOTALES:
Subtotal: ${formatPrice(order.subtotal)}
Envío: ${formatPrice(order.shipping_cost)}
Total: ${formatPrice(order.total)}

${order.notes ? `NOTAS: ${order.notes}` : ''}

Para seguir tu pedido, visita: ${trackingUrl}

¿Tienes preguntas? Contáctanos:
${config.contact?.email || ''} | ${config.contact?.phone || ''}

${businessName}
${config.tagline || 'Gracias por confiar en nosotros'}
  `;

  return { subject, html, text };
}

/**
 * Genera el template de email para actualización de estado
 */
export function generateOrderStatusUpdateEmail(
  order: OrderEmailData,
  newStatus: string,
  config: BusinessConfig
): EmailTemplate {
  const businessName = config.businessName || 'Mi Negocio';
  const primaryColor = config.branding?.primaryColor || '#ec4899';
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/orders/track?order=${order.order_number}`;

  const statusMessages = {
    CONFIRMED: {
      title: '¡Tu pedido ha sido confirmado!',
      message: 'Hemos confirmado tu pedido y comenzaremos a prepararlo pronto.',
      color: '#3b82f6'
    },
    PREPARING: {
      title: 'Estamos preparando tu pedido',
      message: 'Tu pedido está siendo preparado con mucho cuidado.',
      color: '#f59e0b'
    },
    READY: {
      title: '¡Tu pedido está listo!',
      message: 'Tu pedido está listo para ser enviado.',
      color: '#10b981'
    },
    SHIPPED: {
      title: '¡Tu pedido está en camino!',
      message: 'Tu pedido ha sido enviado y está en camino hacia ti.',
      color: '#8b5cf6'
    },
    DELIVERED: {
      title: '¡Tu pedido ha sido entregado!',
      message: 'Tu pedido ha sido entregado exitosamente. ¡Esperamos que lo disfrutes!',
      color: '#10b981'
    },
    CANCELLED: {
      title: 'Tu pedido ha sido cancelado',
      message: 'Lamentamos informarte que tu pedido ha sido cancelado.',
      color: '#ef4444'
    }
  };

  const statusInfo = statusMessages[newStatus as keyof typeof statusMessages] || statusMessages.CONFIRMED;
  const subject = `${statusInfo.title} - Pedido ${order.order_number}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${statusInfo.color}, ${primaryColor}); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">${statusInfo.title}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
          Pedido ${order.order_number}
        </p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
          <p style="font-size: 18px; color: #374151; margin: 0;">
            ${statusInfo.message}
          </p>
        </div>

        <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="color: ${primaryColor}; margin-top: 0;">Detalles del Pedido</h3>
          <p><strong>Cliente:</strong> ${order.customer_name}</p>
          <p><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleDateString('es-PY')}</p>
          <p><strong>Total:</strong> ${config.storeSettings?.currencySymbol || '₲'} ${order.total.toLocaleString('es-PY')}</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${trackingUrl}" 
             style="display: inline-block; background: ${primaryColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Ver Estado del Pedido
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p><strong>${businessName}</strong></p>
          <p>${config.tagline || 'Gracias por confiar en nosotros'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${statusInfo.title}

${statusInfo.message}

DETALLES DEL PEDIDO:
Pedido: ${order.order_number}
Cliente: ${order.customer_name}
Fecha: ${new Date(order.created_at).toLocaleDateString('es-PY')}
Total: ${config.storeSettings?.currencySymbol || '₲'} ${order.total.toLocaleString('es-PY')}

Para ver el estado completo de tu pedido, visita: ${trackingUrl}

${businessName}
${config.tagline || 'Gracias por confiar en nosotros'}
  `;

  return { subject, html, text };
}

/**
 * Envía email transaccional vía Resend. El `from` siempre es EMAIL_FROM
 * (dominio verificado en Resend); el email del negocio va como reply-to.
 */
export async function sendOrderEmail(
  to: string,
  template: EmailTemplate,
  config: BusinessConfig
): Promise<boolean> {
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo: config.contact?.email || undefined,
  });
}

/**
 * Genera y envía el email de confirmación de pedido.
 * Nunca lanza: el envío de email no debe bloquear la creación del pedido.
 */
export async function notifyOrderConfirmation(
  order: OrderEmailData,
  config: BusinessConfig
): Promise<boolean> {
  try {
    const template = generateOrderConfirmationEmail(order, config);
    return await sendOrderEmail(order.customer_email, template, config);
  } catch (error) {
    console.error('[email] error en confirmación de pedido:', error);
    return false;
  }
}

/**
 * Genera y envía el email de cambio de estado de pedido.
 * Nunca lanza: el envío de email no debe bloquear la actualización.
 */
export async function notifyOrderStatusUpdate(
  order: OrderEmailData,
  newStatus: string,
  config: BusinessConfig
): Promise<boolean> {
  try {
    const template = generateOrderStatusUpdateEmail(order, newStatus, config);
    return await sendOrderEmail(order.customer_email, template, config);
  } catch (error) {
    console.error('[email] error en actualización de estado:', error);
    return false;
  }
}