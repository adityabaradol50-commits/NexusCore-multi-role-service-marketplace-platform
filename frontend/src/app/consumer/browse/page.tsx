'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicServices, fetchCategories } from '@/lib/api';
import { Search, Layers, Clock, ShoppingBag, Eye, X, ShieldCheck, MapPin, Sparkles } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import BookingModal from '@/components/consumer/BookingModal';

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
      <div>
        <h1 className="text-2xl font-bold text-white">Browse Services & Offerings</h1>
        <p className="text-xs text-slate-400 mt-1">Discover vetted service providers across wellness, personal consulting, home services, and more.</p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search offerings by keyword or provider name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCat('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !selectedCat ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            All Categories
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCat === c.id ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cleanServices.map((svc: any) => {
            const isSungmo = svc.client_business_name === 'Sungmo Heals';
            const unitPrice = parseFloat(svc.price || '0');

            return (
              <div
                key={svc.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-lg group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {svc.category?.name || 'Service'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {svc.duration_minutes ? `${svc.duration_minutes}m` : 'Flexible'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {svc.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mt-1">
                      {svc.description}
                    </p>
                  </div>

                  {/* Provider Info */}
                  <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/80">
                    {svc.client_logo_url ? (
                      <img
                        src={svc.client_logo_url}
                        alt={svc.client_business_name || 'Provider logo'}
                        className="w-7 h-7 rounded-lg object-contain bg-white/5 p-0.5 border border-slate-700/60"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                        {svc.client_business_name ? svc.client_business_name.charAt(0) : 'P'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-semibold truncate">
                        {svc.client_business_name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {svc.client_service_area || (isSungmo ? 'Online Sessions' : 'Verified Partner')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center gap-2">
                  <span className="text-base font-extrabold text-emerald-400">
                    {unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : 'Inquire for Price'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInspectService(svc)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => handleOpenBooking(svc)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition-all"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Book</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Service Details Modal */}
      {inspectService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-900/90">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                  {inspectService.category?.name || 'Service Offering'}
                </span>
                <h2 className="text-base font-bold text-white mt-1.5">{inspectService.title}</h2>
              </div>
              <button
                onClick={() => setInspectService(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Provider card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                {inspectService.client_logo_url ? (
                  <img
                    src={inspectService.client_logo_url}
                    alt={inspectService.client_business_name}
                    className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1 border border-slate-700/60 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold text-sm flex items-center justify-center border border-indigo-500/30 shrink-0">
                    {inspectService.client_business_name ? inspectService.client_business_name.charAt(0) : 'P'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white text-sm">{inspectService.client_business_name}</h3>
                  <p className="text-[11px] text-slate-400">
                    Delivery: {inspectService.client_service_area || 'Online Sessions'}
                  </p>
                </div>
              </div>

              {/* Service Details */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider">Service Overview</h4>
                <p className="text-slate-300 text-xs leading-relaxed bg-slate-800/40 p-4 rounded-xl border border-slate-800/80 whitespace-pre-line">
                  {inspectService.description}
                </p>
              </div>

              {/* Session Specs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">Session Duration</span>
                  <span className="font-bold text-white text-xs mt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    {inspectService.duration_minutes ? `${inspectService.duration_minutes} Minutes` : 'Flexible Duration'}
                  </span>
                </div>
                <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block font-medium">Service Delivery</span>
                  <span className="font-bold text-emerald-400 text-xs mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {inspectService.client_service_area || 'Online Sessions'}
                  </span>
                </div>
              </div>

              {/* Protection Badge */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2.5 text-[11px] text-indigo-300">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Protected by NexusCore Escrow: Funds released to provider only upon session completion.</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-slate-400 block">Pricing</span>
                <span className="text-base font-extrabold text-emerald-400">
                  {parseFloat(inspectService.price) > 0 ? `$${parseFloat(inspectService.price).toFixed(2)}` : 'Inquire'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectService(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const svc = inspectService;
                    setInspectService(null);
                    handleOpenBooking(svc);
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Book This Service</span>
                </button>
              </div>
            </div>
          </div>
        </div>
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


