'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface DeleteServiceModalProps {
  service: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteServiceModal({ service, isOpen, onClose, onSuccess }: DeleteServiceModalProps) {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !service) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/client/services/${service.id}`);
      showToast(`Service '${service.title}' deleted successfully`, 'info');
      onClose();
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to delete service.';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Offering Listing"
      description="This action will remove the service from public catalog discovery."
      maxWidth="md"
      footer={
        <>
          <Button onClick={onClose} variant="secondary" size="sm">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="danger"
            size="sm"
            isLoading={isDeleting}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete Offering
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-rose-400 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-xs text-rose-300">
            Are you sure you want to delete <strong className="text-white">"{service.title}"</strong>?
          </p>
        </div>
      </div>
    </Modal>
  );
}
