'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CreditCard, 
  Truck, 
  User, 
  ShoppingBag, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Package,
  Shield,
  Clock,
  Star
} from 'lucide-react';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { getFreeShippingThreshold } from '@/lib/pos/calculations';
import { formatPrice } from '@/utils/formatters';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface OrderConfirmationData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  orderDate: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  cartTotal?: number;
  onOrderSuccess: (orderData: OrderConfirmationData) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  cartTotal,
  onOrderSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [shippingRegion, setShippingRegion] = useState<string>('General');
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});
  const { config } = useBusinessConfig();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 0);
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [isOpen]);

  // Cargar datos del cliente guardados
  useEffect(() => {
    if (isOpen) {
      const savedCustomer = localStorage.getItem('customer_info');
      if (savedCustomer) {
        try {
          const parsed = JSON.parse(savedCustomer);
          setCustomerInfo(parsed);
        } catch (error) {
          console.error('Error loading customer info:', error);
        }
      }
      // Focus en el primer input al abrir
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Manejar tecla Escape para cerrar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const getComputedTotal = () => {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return total;
  };
  const headerTotal = formatPrice(typeof cartTotal === 'number' ? cartTotal : getComputedTotal(), config);

  const validateCustomerInfo = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {};
    
    if (!customerInfo.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    if (!customerInfo.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!customerInfo.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCustomerInfoChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
    
    // Validación en tiempo real para email
    if (field === 'email' && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setErrors(prev => ({ ...prev, email: 'Email inválido' }));
      } else {
        setErrors(prev => ({ ...prev, email: undefined }));
      }
    } else if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateCustomerInfo()) {
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const formatPaymentMethod = (method: 'CASH' | 'CARD' | 'TRANSFER') => {
    const methods: Record<string, string> = {
      CASH: 'Efectivo',
      CARD: 'Tarjeta',
      TRANSFER: 'Transferencia',
    };
    return methods[method] || method;
  };


  const getFinalTotals = () => {
    const subtotal = typeof cartTotal === 'number' ? cartTotal : getComputedTotal();
    const threshold = getFreeShippingThreshold(config, shippingRegion);
    const isFreeShipping = threshold > 0 && subtotal >= threshold;
    const appliedShipping = isFreeShipping ? 0 : Math.max(0, Number(shippingCost) || 0);
    const finalTotal = subtotal + appliedShipping;
    return { subtotal, appliedShipping, finalTotal, isFreeShipping, threshold };
  };

  const handleSubmitOrder = async () => {
    if (!validateCustomerInfo()) return;

    setIsLoading(true);
    setSubmitError(null);
    
    // Guardar datos del cliente para futuros pedidos
    try {
      localStorage.setItem('customer_info', JSON.stringify(customerInfo));
    } catch (error) {
      console.error('Error saving customer info:', error);
    }

    try {
      // 🔒 VALIDAR PRECIOS EN EL SERVIDOR ANTES DE PROCESAR
      const validationResponse = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        })
      });

      const validation = await validationResponse.json().catch(() => null);
      if (!validationResponse.ok) {
        const message = validation?.errors?.length
          ? `Errores en el carrito:\n${validation.errors.join('\n')}`
          : validation?.error || 'Error al validar el carrito';
        setSubmitError(message);
        toast({ title: 'Validación del carrito', description: message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Verificar si hay errores de validación
      if (validation && validation.valid === false) {
        const message = validation.errors?.length
          ? `Errores en el carrito:\n${validation.errors.join('\n')}`
          : 'Carrito inválido';
        setSubmitError(message);
        toast({ title: 'Validación del carrito', description: message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Usar el total validado del servidor
      const validatedTotal = validation.total;
      const { appliedShipping, isFreeShipping } = getFinalTotals();
      const finalTotal = validatedTotal + appliedShipping;
      
      const businessWhatsApp = (config?.contact?.whatsapp || config?.contact?.phone || '').replace(/\D/g, '');

      if (businessWhatsApp) {
        // Build WhatsApp message
        const itemsText = cartItems
          .map(item => `• ${item.name} x${item.quantity} — $${(item.price * item.quantity).toFixed(2)}`)
          .join('\n');

        const message =
          `Hola, quiero confirmar mi pedido desde el catálogo.\n\n` +
          `Productos:\n${itemsText}\n` +
          `Subtotal: ${formatPrice(validatedTotal, config)}\n` +
          `Envío: ${isFreeShipping ? 'Gratis' : formatPrice(appliedShipping, config)}\n` +
          `Total: ${formatPrice(finalTotal, config)}\n\n` +
          `Datos del cliente:\n` +
          `Nombre: ${customerInfo.name}\n` +
          `Teléfono: ${customerInfo.phone}\n` +
          `Email: ${customerInfo.email}\n` +
          `Dirección: ${customerInfo.address || '—'}\n` +
          `Pago: ${formatPaymentMethod(paymentMethod)}\n` +
          `Notas: ${notes.trim() || '—'}`;

        const waUrl = `https://wa.me/${businessWhatsApp}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');

        // Trigger local confirmation and clear cart via parent
        onOrderSuccess({
          orderId: `WA-${Date.now()}`,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          total: finalTotal,
          paymentMethod,
          orderDate: new Date().toISOString(),
        });
        onClose();
      } else {
        // Fallback to server order processing if WhatsApp number not configured
        const { appliedShipping } = getFinalTotals();
        const orderData = {
          items: cartItems.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          customerInfo,
          paymentMethod,
          shippingCost: appliedShipping,
          shippingRegion,
          notes: (() => {
            const base = notes.trim();
            const { isFreeShipping } = getFinalTotals();
            const shippingLine = isFreeShipping ? 'Envío: Gratis' : `Envío: ${formatPrice(appliedShipping, config)}`;
            return [base, shippingLine].filter(Boolean).join(' • ');
          })(),
        };

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al procesar la orden');
        }

        const result = await response.json();
        onOrderSuccess({
          orderId: result.data.order.id,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          total: getFinalTotals().finalTotal,
          paymentMethod,
          orderDate: new Date().toISOString(),
        });
        onClose();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al procesar la orden';
      console.error('Error submitting order:', error);
      setSubmitError(message);
      toast({ title: 'No se pudo completar el pedido', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={2} aria-label={`Paso ${currentStep} de 2`}>
      <div className="flex items-center space-x-4">
        <motion.div 
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
            currentStep >= 1 ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          aria-label="Paso 1: Información del cliente"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {currentStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </motion.div>
        
        <div className="flex flex-col items-center">
          <div className={`h-1 w-16 rounded-full transition-all duration-500 ${currentStep >= 2 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {currentStep === 1 ? 'Datos' : currentStep === 2 ? 'Pago' : 'Completado'}
          </span>
        </div>
        
        <motion.div 
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
            currentStep >= 2 ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
          aria-label="Paso 2: Método de pago"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <CreditCard className="w-5 h-5" />
        </motion.div>
      </div>
    </div>
  );

  const renderCustomerInfoStep = () => (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100" id="customer-info-heading">
          ¡Casi listo!
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Solo necesitamos algunos datos para procesar tu pedido
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-5" role="group" aria-labelledby="customer-info-heading">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label htmlFor="customer-name" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-red-500" />
            Nombre completo *
          </label>
          <div className="relative">
            <input
              ref={firstInputRef}
              id="customer-name"
              type="text"
              value={customerInfo.name}
              onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
              className={`w-full px-4 py-3 text-sm border-2 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200 dark:bg-gray-800 dark:text-gray-100 ${
                errors.name ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              placeholder="Ej: Juan Pérez"
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {customerInfo.name && !errors.name && (
              <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
          </div>
          {errors.name && (
            <motion.p 
              id="name-error" 
              className="text-red-500 text-xs mt-2 flex items-center gap-1" 
              role="alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <X className="w-3 h-3" />
              {errors.name}
            </motion.p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label htmlFor="customer-email" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4 text-red-500" />
            Email *
          </label>
          <div className="relative">
            <input
              id="customer-email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
              className={`w-full px-4 py-3 text-sm border-2 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200 dark:bg-gray-800 dark:text-gray-100 ${
                errors.email ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              placeholder="tu@email.com"
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {customerInfo.email && !errors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email) && (
              <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
          </div>
          {errors.email && (
            <motion.p 
              id="email-error" 
              className="text-red-500 text-xs mt-2 flex items-center gap-1" 
              role="alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <X className="w-3 h-3" />
              {errors.email}
            </motion.p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label htmlFor="customer-phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Phone className="w-4 h-4 text-red-500" />
            Teléfono *
          </label>
          <div className="relative">
            <input
              id="customer-phone"
              type="tel"
              value={customerInfo.phone}
              onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
              className={`w-full px-4 py-3 text-sm border-2 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200 dark:bg-gray-800 dark:text-gray-100 ${
                errors.phone ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              placeholder="Ej: +595 21 123 4567"
              aria-required="true"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
            />
            {customerInfo.phone && !errors.phone && (
              <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
          </div>
          {errors.phone && (
            <motion.p 
              id="phone-error" 
              className="text-red-500 text-xs mt-2 flex items-center gap-1" 
              role="alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <X className="w-3 h-3" />
              {errors.phone}
            </motion.p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <label htmlFor="customer-address" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            Dirección de entrega
            <span className="text-xs text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <input
              id="customer-address"
              type="text"
              value={customerInfo.address}
              onChange={(e) => handleCustomerInfoChange('address', e.target.value)}
              className="w-full px-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200 dark:bg-gray-800 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-500"
              placeholder="Ej: Av. España 123, Asunción"
              aria-required="false"
            />
            {customerInfo.address && (
              <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
            <Truck className="w-3 h-3" />
            Nos ayuda a calcular mejor el costo de envío
          </p>
        </motion.div>
      </div>

      {/* Trust indicators */}
      <motion.div 
        className="mt-8 grid grid-cols-3 gap-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Datos seguros</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Envío rápido</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Calidad garantizada</span>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderPaymentStep = () => (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full mb-4">
          <CreditCard className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100" id="payment-heading">
          ¡Último paso!
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Elige tu método de pago preferido y confirma tu pedido
        </p>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-red-500" />
          Método de Pago
        </label>
        <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby="payment-heading">
        {[
          { 
            value: 'CASH', 
            label: 'Efectivo', 
            icon: '💵',
            description: 'Pago contra entrega',
            popular: false
          },
          { 
            value: 'CARD', 
            label: 'Tarjeta de Crédito/Débito', 
            icon: '💳',
            description: 'Visa, Mastercard, etc.',
            popular: true
          },
          { 
            value: 'TRANSFER', 
            label: 'Transferencia Bancaria', 
            icon: '🏦',
            description: 'Banco a banco',
            popular: false
          }
        ].map((method, index) => (
          <motion.label
            key={method.value}
            className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
              paymentMethod === method.value
                ? 'border-red-500 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-400 hover:shadow-md'
            }`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setPaymentMethod(method.value as typeof paymentMethod);
              }
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {method.popular && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                Popular
              </div>
            )}
            <input
              type="radio"
              name="paymentMethod"
              value={method.value}
              checked={paymentMethod === method.value}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className="sr-only"
              aria-label={method.label}
            />
            <div className="flex items-center flex-1">
              <div className="text-2xl mr-4" aria-hidden="true">{method.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  {method.label}
                  {paymentMethod === method.value && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{method.description}</div>
              </div>
            </div>
          </motion.label>
        ))}
        </div>
      </motion.div>

      {/* Shipping region and cost */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-red-500" /> Información de Envío
        </label>
        {(() => {
          const { subtotal, isFreeShipping, threshold } = getFinalTotals();
          return (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                    Región de envío
                  </label>
                  <select
                    value={shippingRegion}
                    onChange={(e) => setShippingRegion(e.target.value)}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 transition-all duration-200"
                  >
                    <option value="General">General</option>
                    {(config?.storeSettings?.freeShippingRegions || []).map((r) => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                    Costo de envío
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(Number(e.target.value))}
                      disabled={isFreeShipping}
                      className={`w-full px-4 py-3 text-sm border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                        isFreeShipping 
                          ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' 
                          : 'border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
                      }`}
                      placeholder="0.00"
                      aria-describedby="shipping-help"
                    />
                    {isFreeShipping && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className={`mt-4 p-3 rounded-lg ${
                isFreeShipping 
                  ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' 
                  : 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700'
              }`}>
                <p id="shipping-help" className={`text-sm font-medium ${
                  isFreeShipping 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-yellow-700 dark:text-yellow-300'
                }`}>
                  {(() => {
                    const msg = config?.storeSettings?.freeShippingMessage || '';
                    const amt = formatPrice(threshold, config);
                    const base = threshold > 0 ? (msg ? msg.replace('{amount}', amt) : `Envío gratis a partir de ${amt}`) : 'Ingresa el costo de envío si aplica.';
                    if (threshold <= 0) return base;
                    if (isFreeShipping) return `🎉 ¡${base}! Tu envío es completamente gratis.`;
                    const { subtotal } = getFinalTotals();
                    const diff = Math.max(0, threshold - subtotal);
                    return `💡 ${base} Te faltan solo ${formatPrice(diff, config)} para obtener envío gratis.`;
                  })()}
                </p>
              </div>
            </div>
          );
        })()}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label htmlFor="order-notes" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-red-500" />
          Notas Adicionales
          <span className="text-xs text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          id="order-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200 dark:bg-gray-800 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-500 resize-none"
          placeholder="Ej: Entregar entre 2-4 PM, tocar timbre dos veces, etc."
          aria-label="Notas adicionales para el pedido"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Cualquier instrucción especial para la entrega o el pedido
        </p>
      </motion.div>
    </motion.div>
  );

  const renderOrderSummary = () => {
    const { subtotal, appliedShipping, finalTotal, isFreeShipping } = getFinalTotals();
    return (
      <motion.div 
        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg" 
        role="region" 
        aria-label="Resumen del pedido"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-red-500" aria-hidden="true" />
            Resumen del Pedido
          </h4>
          <div className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-medium">
            {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
          </div>
        </div>

        <div className="space-y-3 max-h-40 overflow-y-auto mb-4 pr-2" aria-live="polite">
          {cartItems.map((item, index) => (
            <motion.div 
              key={item.id} 
              className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                  {item.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatPrice(item.price, config)} × {item.quantity}
                </span>
              </div>
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100 ml-2">
                {formatPrice(item.price * item.quantity, config)}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300 font-medium">Subtotal</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPrice(subtotal, config)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <Truck className="w-4 h-4" aria-hidden="true" /> 
              Envío
            </span>
            <span className={`font-semibold ${isFreeShipping ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {isFreeShipping ? (
                <span className="flex items-center gap-1">
                  Gratis <CheckCircle2 className="w-4 h-4" />
                </span>
              ) : (
                formatPrice(appliedShipping, config)
              )}
            </span>
          </div>

          <motion.div 
            className="flex justify-between items-center bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl px-4 py-4 mt-4 shadow-lg" 
            aria-live="polite" 
            aria-atomic="true"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="font-bold text-lg">Total a Pagar</span>
            <span className="font-bold text-2xl">{formatPrice(finalTotal, config)}</span>
          </motion.div>

          {isFreeShipping && (
            <motion.div 
              className="text-center text-sm text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 rounded-lg p-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              🎉 ¡Felicidades! Tu envío es completamente gratis
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 bg-white dark:bg-gray-900 overflow-hidden">
        <div className={`bg-red-600 text-white px-4 py-3 flex items-center justify-between ${scrolled ? 'shadow-md shadow-black/20' : ''}`}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <div>
              <h2 id="checkout-title" className="text-base font-bold">Finalizar Compra</h2>
              <p className="text-xs opacity-90">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-90">Total</p>
            <p className="text-xl font-bold">{headerTotal}</p>
          </div>
        </div>
        <ScrollArea ref={contentRef} className="max-h-[70vh]">
          <div className="p-4 space-y-4">
            {renderStepIndicator()}
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step1">
                  {renderCustomerInfoStep()}
                </motion.div>
              )}
              {currentStep === 2 && (
                <motion.div key="step2" className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-6">
                    {renderPaymentStep()}
                  </div>
                  <div className="space-y-6">
                    {renderOrderSummary()}
                    {submitError && (
                      <motion.div 
                        className="p-4 rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm flex items-center gap-2" 
                        role="alert"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <X className="w-4 h-4 flex-shrink-0" />
                        {submitError}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
        <motion.div 
          className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between gap-4">
            <motion.button
              onClick={currentStep === 1 ? onClose : handlePreviousStep}
              className="flex items-center gap-2 px-6 py-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 rounded-xl hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-600 font-medium"
              disabled={isLoading}
              aria-label={currentStep === 1 ? 'Cancelar checkout' : 'Volver al paso anterior'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {currentStep === 1 ? (
                <>
                  <X className="w-4 h-4" />
                  Cancelar
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </>
              )}
            </motion.button>
            {currentStep === 1 ? (
              <motion.button
                onClick={handleNextStep}
                className="flex items-center gap-2 px-8 py-3 text-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Continuar al método de pago"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleSubmitOrder}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-3 text-sm bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
                aria-label="Confirmar y enviar pedido"
                aria-busy={isLoading}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <>
                    <motion.div 
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      aria-hidden="true"
                    />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Pedido
                  </>
                )}
              </motion.button>
            )}
          </div>
          <motion.div 
            className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Shield className="w-3 h-3" />
            Tus datos están protegidos y seguros
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
