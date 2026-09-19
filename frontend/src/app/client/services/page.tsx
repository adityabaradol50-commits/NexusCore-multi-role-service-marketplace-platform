'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Layers, Plus, Clock, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import ServiceModal from '@/components/client/ServiceModal';
import DeleteServiceModal from '@/components/client/DeleteServiceModal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ClientServicesPage() {
  const { user } = useAuth();
  const isApproved = user?.client_profile?.approval_status === 'APPROVED';

  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: services = [], isLoading, refetch } = useQuery({
    queryKey: ['clientServicesList'],
    queryFn: async () => {
      const res = await api.get('/client/services');
      return res.data;
    },
  });

  const handleOpenCreate = () => {
    setSelectedService(null);
    setIsServiceModalOpen(true);
  };

  const handleOpenEdit = (svc: any) => {
    setSelectedService(svc);
    setIsServiceModalOpen(true);
  };

  const handleOpenDelete = (svc: any) => {
    setSelectedService(svc);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Catalog & Offerings"
        description="Manage public catalog listings, pricing schedules, and session durations."
        actions={
          <Button
            onClick={handleOpenCreate}
            disabled={!isApproved}
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Offering
          </Button>
        }
      />

      {!isApproved && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>New service creation is disabled while your business application is in <strong>{user?.client_profile?.approval_status || 'PENDING_APPROVAL'}</strong> status.</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No offerings published"
          description={isApproved ? "You have not listed any services yet. Click 'Add New Offering' to publish your first service." : "Once approved, you will be able to add and configure your service offerings here."}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((svc: any) => (
            <Card
              key={svc.id}
              hoverEffect
              className="flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="success" size="sm">
                    {svc.category?.name || 'Service'}
                  </Badge>
                  <span className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {svc.duration_minutes ? `${svc.duration_minutes}m` : 'N/A'}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 line-clamp-1">{svc.title}</h3>
                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">{svc.description}</p>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-base font-bold text-emerald-400">${parseFloat(svc.price).toFixed(2)}</span>
                
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => handleOpenEdit(svc)}
                    disabled={!isApproved}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    onClick={() => handleOpenDelete(svc)}
                    disabled={!isApproved}
                    variant="danger"
                    size="sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Service Add/Edit Modal */}
      {isServiceModalOpen && (
        <ServiceModal
          service={selectedService}
          isOpen={isServiceModalOpen}
          isApproved={isApproved}
          onClose={() => {
            setIsServiceModalOpen(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {/* Service Delete Modal */}
      {selectedService && isDeleteModalOpen && (
        <DeleteServiceModal
          service={selectedService}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
