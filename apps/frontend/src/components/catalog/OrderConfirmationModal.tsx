'use client';

import React from 'react';
import { CheckCircle, X, Package, User, CreditCard, Calendar, Copy } from 'lucide-react';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  orderDate: string;
}

const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  onClose,
  orderId,
  customerName,
  customerEmail,
  total,
  paymentMethod,
  orderDate
}) => {
  if (!isOpen) return null;

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    // You could add a toast notification here
  };

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      'CASH': 'Efectivo',
      'CARD': 'Tarjeta',
      'TRANSFER': 'Transferencia'
    };
    return methods[method] || method;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-2 mr-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">¡Pedido Confirmado!</h2>
                <p className="text-gray-600 text-sm">Tu orden ha sido procesada exitosamente</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Order Details */}
          <div className="space-y-4 mb-6">
            {/* Order ID */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Número de Orden</p>
                  <p className="font-mono text-sm font-medium text-gray-900">{orderId}</p>
                </div>
                <button
                  onClick={copyOrderId}
                  className="text-[hsl(var(--primary))] hover:brightness-95 transition-colors"
                  title="Copiar número de orden"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Customer Info */}
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{customerName}</p>
                <p className="text-sm text-gray-600">{customerEmail}</p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Método de Pago</p>
                <p className="font-medium text-gray-900">{formatPaymentMethod(paymentMethod)}</p>
              </div>
            </div>

            {/* Order Date */}
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Fecha del Pedido</p>
                <p className="font-medium text-gray-900">{formatDate(orderDate)}</p>
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-green-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: 'hsla(var(--primary), 0.08)' }}>
            <div className="flex items-start space-x-3">
              <Package className="w-5 h-5 text-[hsl(var(--primary))] mt-0.5" />
              <div>
                <h4 className="font-medium text-[hsl(var(--primary))] mb-1">¿Qué sigue?</h4>
                <ul className="text-sm text-[hsl(var(--primary))] space-y-1">
                  <li>• Recibirás un email de confirmación</li>
                  <li>• Te contactaremos para coordinar la entrega</li>
                  <li>• Puedes consultar el estado con tu número de orden</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:brightness-95 transition-colors font-medium"
            >
              Continuar Comprando
            </button>
          </div>

          {/* Contact Info */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              ¿Tienes preguntas? Contáctanos o guarda tu número de orden para futuras consultas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;