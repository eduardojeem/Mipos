import { useMemo, useState, useCallback } from 'react';
import { type Customer } from '@/types';

export function usePOSCustomers(initialCustomers: Customer[] = []) {
  const customersList = useMemo(() => Array.isArray(initialCustomers) ? initialCustomers : [], [initialCustomers]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const openCustomerModal = useCallback(() => setShowCustomerModal(true), []);
  const closeCustomerModal = useCallback(() => setShowCustomerModal(false), []);

  const selectCustomer = useCallback((customer: Customer | null) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
  }, []);

  return {
    customersList,
    selectedCustomer,
    setSelectedCustomer,
    showCustomerModal,
    openCustomerModal,
    closeCustomerModal,
    selectCustomer,
  };
}