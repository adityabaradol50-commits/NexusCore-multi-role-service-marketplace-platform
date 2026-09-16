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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Services & Products</h1>
          <p className="text-xs text-slate-400 mt-1">Manage public catalog listings, rates, and fulfillment parameters.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          disabled={!isApproved}
          title={!isApproved ? 'Approval required to publish services' : 'Create new offering'}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition-all ${
            isApproved
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Add New Offering</span>
        </button>
      </div>

      {!isApproved && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>New service creation is disabled while your business application is in <strong>{user?.client_profile?.approval_status || 'PENDING_APPROVAL'}</strong> status.</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div
              key={svc.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg hover:border-slate-700 transition-all"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {svc.category?.name || 'Service'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {svc.duration_minutes ? `${svc.duration_minutes}m` : 'N/A'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white line-clamp-1">{svc.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{svc.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-lg font-black text-emerald-400">${parseFloat(svc.price).toFixed(2)}</span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(svc)}
                    disabled={!isApproved}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors disabled:opacity-50"
                    title="Edit Offering"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(svc)}
                    disabled={!isApproved}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs transition-colors disabled:opacity-50"
                    title="Delete Offering"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
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

