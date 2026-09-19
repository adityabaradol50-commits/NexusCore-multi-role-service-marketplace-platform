'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicServices, fetchCategories } from '@/lib/api';
import { Search, Layers, Clock, ShoppingBag, Eye, ShieldCheck, MapPin, Sparkles } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import BookingModal from '@/components/consumer/BookingModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';

export default function ConsumerBrowsePage() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [inspectService, setInspectService] = useState<any | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['browseCategories'],
    queryFn: fetchCategories,
  });

  const { data: services = [], isLoading, refetch } = useQuery({
    queryKey: ['browseServices', search, selectedCat],
    queryFn: () => fetchPublicServices({ q: search || undefined, category_id: selectedCat || undefined }),
  });

  // Filter out any internal development/test fixtures from the normal marketplace experience
  const isDevFixture = (s: any) =>
    s.is_test_fixture ||
    /^(IDOR|Review Target|Notification Target|Governance Test|Test Service|Full Refundable)/i.test(s.title);

  const cleanServices = services.filter((s: any) => !isDevFixture(s));

  const handleOpenBooking = (svc: any) => {
    setSelectedService(svc);
    setIsBookingOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace Service Catalog"
        description="Discover vetted service providers across wellness, personal consulting, home services, and more."
        badgeText="Escrow Protected"
        badgeVariant="primary"
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search offerings by keyword or provider name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-zinc-400" />}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin shrink-0">
          <button
            type="button"
            onClick={() => setSelectedCat('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              !selectedCat
                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedCat === c.id
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : cleanServices.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No services available"
          description="There are currently no active listings matching your search or category criteria."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {cleanServices.map((svc: any) => {
            const isSungmo = svc.client_business_name === 'Sungmo Heals';
            const unitPrice = parseFloat(svc.price || '0');

            return (
              <Card
                key={svc.id}
                hoverEffect
                className="flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="primary" size="sm">
                      {svc.category?.name || 'Service'}
                    </Badge>
                    <span className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {svc.duration_minutes ? `${svc.duration_minutes}m` : 'Flexible'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {svc.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                      {svc.description}
                    </p>
                  </div>

                  {/* Provider Info (SERVICE → OWNER → PRICE → BOOKING) */}
                  <div className="flex items-center gap-2.5 pt-2.5 border-t border-zinc-800/80">
                    {svc.client_logo_url ? (
                      <img
                        src={svc.client_logo_url}
                        alt={svc.client_business_name || 'Provider logo'}
                        className="w-7 h-7 rounded-md object-contain bg-zinc-800 p-0.5 border border-zinc-700/60"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center border border-zinc-700/60">
                        {svc.client_business_name ? svc.client_business_name.charAt(0) : 'P'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 font-medium truncate">
                        {svc.client_business_name}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {svc.client_service_area || (isSungmo ? 'Online Sessions' : 'Verified Partner')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex justify-between items-center gap-2">
                  <span className="text-base font-bold text-emerald-400">
                    {unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : 'Inquire'}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setInspectService(svc)}
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Details
                    </Button>
                    <Button
                      onClick={() => handleOpenBooking(svc)}
                      variant="primary"
                      size="sm"
                      leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
                    >
                      Book
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Service Details Modal */}
      {inspectService && (
        <Modal
          isOpen={!!inspectService}
          onClose={() => setInspectService(null)}
          title={inspectService.title}
          description={`Offered by ${inspectService.client_business_name}`}
          footer={
            <>
              <Button onClick={() => setInspectService(null)} variant="secondary" size="sm">
                Close
              </Button>
              <Button
                onClick={() => {
                  const svc = inspectService;
                  setInspectService(null);
                  handleOpenBooking(svc);
                }}
                variant="primary"
                size="sm"
                leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
              >
                Book This Service (${parseFloat(inspectService.price).toFixed(2)})
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Provider Header */}
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-3">
              {inspectService.client_logo_url ? (
                <img
                  src={inspectService.client_logo_url}
                  alt={inspectService.client_business_name}
                  className="w-9 h-9 rounded-lg object-contain bg-zinc-800 p-1 border border-zinc-700/60 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-200 font-bold text-sm flex items-center justify-center border border-zinc-700/60 shrink-0">
                  {inspectService.client_business_name ? inspectService.client_business_name.charAt(0) : 'P'}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-zinc-100 text-xs">{inspectService.client_business_name}</h3>
                <p className="text-[11px] text-zinc-400">
                  Delivery: {inspectService.client_service_area || 'Online Sessions'}
                </p>
              </div>
            </div>

            {/* Overview */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Service Overview</span>
              <p className="text-zinc-300 text-xs leading-relaxed bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80 whitespace-pre-line">
                {inspectService.description}
              </p>
            </div>

            {/* Session Specs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <span className="text-[11px] text-zinc-400 block font-medium">Session Duration</span>
                <span className="font-semibold text-zinc-200 text-xs mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  {inspectService.duration_minutes ? `${inspectService.duration_minutes} Minutes` : 'Flexible Duration'}
                </span>
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <span className="text-[11px] text-zinc-400 block font-medium">Service Delivery</span>
                <span className="font-semibold text-emerald-400 text-xs mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {inspectService.client_service_area || 'Online Sessions'}
                </span>
              </div>
            </div>

            {/* Escrow Banner */}
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2.5 text-[11px] text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Protected by NexusCore Escrow: Funds released to provider upon service completion.</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Booking Modal */}
      {selectedService && isBookingOpen && (
        <BookingModal
          service={selectedService}
          isOpen={isBookingOpen}
          onClose={() => {
            setIsBookingOpen(false);
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
