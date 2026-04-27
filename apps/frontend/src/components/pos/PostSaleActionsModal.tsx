"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Mail, MessageCircle, Printer } from 'lucide-react';
import {
  INTERNAL_TICKET_DISCLAIMER,
  INTERNAL_TICKET_LABEL,
} from '@/lib/pos/internal-ticket';

interface PostSaleActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onViewReceipt: () => void;
}

export default function PostSaleActionsModal({
  isOpen,
  onClose,
  onPrint,
  onWhatsApp,
  onEmail,
  onViewReceipt,
}: PostSaleActionsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{INTERNAL_TICKET_LABEL} de venta</DialogTitle>
          <DialogDescription>
            La venta se registró correctamente y ahora puedes emitir o compartir el ticket interno.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
          {INTERNAL_TICKET_DISCLAIMER}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <Button className="w-full" onClick={onPrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir ticket
          </Button>
          <Button variant="outline" className="w-full" onClick={onWhatsApp}>
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <Button variant="outline" className="w-full" onClick={onEmail}>
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button variant="ghost" className="w-full" onClick={onViewReceipt}>
            <FileText className="w-4 h-4 mr-2" />
            Ver ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
