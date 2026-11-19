import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Plus,
  RefreshCw,
  GitMerge,
  FileText,
  MessageSquare,
  Lock,
  Building,
  Radio,
  Search,
} from 'lucide-react';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ORG_ADMIN' | 'DESK_STAFF' | 'TECHNICIAN' | 'RESIDENT';
  unitId?: string | null;
}

const PRESET_USERS: Record<string, { email: string; name: string; role: any }> = {
  admin: { email: 'admin@lumenhatch.com', name: 'Ananya Deshpande (Org Admin)', role: 'ORG_ADMIN' },
  staff: { email: 'staff@lumenhatch.com', name: 'Devin DeskStaff', role: 'DESK_STAFF' },
  tech: { email: 'tech1@lumenhatch.com', name: 'Alex Technician', role: 'TECHNICIAN' },
  resident: { email: 'resident@lumenhatch.com', name: 'Rohan Member (Suite 101)', role: 'RESIDENT' },
};

export default function App() {
  const [currentUserKey, setCurrentUserKey] = useState<string>('staff');
  const [token, setToken] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tickets' | 'rooms' | 'admin'>('tickets');
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketEvents, setTicketEvents] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('room-alpha');
  const [bookings, setBookings] = useState<any[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);
  const [dlqJobs, setDlqJobs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTargetDupId, setMergeTargetDupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New ticket form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('HVAC');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newRoomId, setNewRoomId] = useState('');
  const [newRepairStart, setNewRepairStart] = useState('');
  const [newRepairEnd, setNewRepairEnd] = useState('');

  // 1. Authenticate when user switches
  useEffect(() => {
    loginAs(currentUserKey);
  }, [currentUserKey]);

  const loginAs = async (key: string) => {
    setLoading(true);
    setActionError(null);
    try {
      const preset = PRESET_USERS[key];
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: preset.email, password: 'Password@123' }),
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.accessToken);
      } else {
        setActionError(data.error?.message || 'Login failed');
      }
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch data once token is present
  useEffect(() => {
    if (!token) return;
    fetchTickets();
    fetchRooms();
    fetchBookings(selectedRoomId);
    fetchGaps(selectedRoomId);
    if (PRESET_USERS[currentUserKey].role === 'ORG_ADMIN') {
      fetchAdminData();
    }
  }, [token, statusFilter, searchQuery]);

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      const res = await fetch(`/api/v1/tickets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
        if (selectedTicket) {
          const updated = data.data.find((t: any) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTicketDetails = async (ticket: any) => {
    setSelectedTicket(ticket);
    setActionError(null);
    setActionSuccess(null);
    try {
      // Events
      const evRes = await fetch(`/api/v1/tickets/${ticket.id}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const evData = await evRes.json();
      if (evData.success) setTicketEvents(evData.data);

      // Comments
      const commRes = await fetch(`/api/v1/tickets/${ticket.id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const commData = await commRes.json();
      if (commData.success) setComments(commData.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/v1/rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setRooms(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBookings = async (roomId: string) => {
    try {
      const res = await fetch(`/api/v1/rooms/${roomId}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setBookings(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGaps = async (roomId: string) => {
    try {
      const res = await fetch(`/api/v1/rooms/${roomId}/gaps`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setGaps(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminData = async () => {
    try {
      const dlqRes = await fetch('/api/v1/admin/dlq', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dlqData = await dlqRes.json();
      if (dlqData.success) setDlqJobs(dlqData.data);

      const audRes = await fetch('/api/v1/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const audData = await audRes.json();
      if (audData.success) setAuditLogs(audData.data);
    } catch (e) {
      console.error(e);
    }
  };

  // State machine transition helper
  const handleTransition = async (toStatus: string, reason?: string) => {
    if (!selectedTicket) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/v1/tickets/${selectedTicket.id}/transitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toStatus, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Ticket transitioned to ${toStatus} successfully.`);
        fetchTickets();
        fetchTicketDetails(data.data);
      } else {
        setActionError(data.error?.message || 'Transition failed');
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleTriage = async () => {
    if (!selectedTicket) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/tickets/${selectedTicket.id}/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ priority: selectedTicket.priority }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess('Ticket successfully marked as TRIAGED');
        fetchTickets();
        fetchTicketDetails(data.data);
      } else {
        setActionError(data.error?.message);
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleAssign = async (techId: string) => {
    if (!selectedTicket) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/tickets/${selectedTicket.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ technicianId: techId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess('Technician assigned successfully (Atomic concurrency checked).');
        fetchTickets();
        fetchTicketDetails(data.data);
      } else {
        setActionError(data.error?.message);
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleMergeDuplicate = async () => {
    if (!selectedTicket || !mergeTargetDupId) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/tickets/${selectedTicket.id}/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ duplicateTicketId: mergeTargetDupId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccess('CR-1 Merge Complete: Duplicate ticket closed and comments moved to this ticket.');
        setShowMergeModal(false);
        fetchTickets();
        fetchTicketDetails(selectedTicket);
      } else {
        setActionError(data.error?.message);
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;
    try {
      const res = await fetch(`/api/v1/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment, isInternal: isInternalComment }),
      });
      const data = await res.json();
      if (data.success) {
        setNewComment('');
        fetchTicketDetails(selectedTicket);
      } else {
        setActionError(data.error?.message);
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      const payload: any = {
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
        propertyId: 'prop-1',
      };
      if (newRoomId) {
        payload.meetingRoomId = newRoomId;
        if (newRepairStart) payload.scheduledStart = new Date(newRepairStart).toISOString();
        if (newRepairEnd) payload.scheduledEnd = new Date(newRepairEnd).toISOString();
      }
      const res = await fetch('/api/v1/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDesc('');
        setNewRoomId('');
        fetchTickets();
        fetchTicketDetails(data.data);
      } else {
        setActionError(data.error?.message);
      }
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const userObj = PRESET_USERS[currentUserKey];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header & Role Switcher */}
      <header className="bg-slate-800/90 border-b border-slate-700/60 sticky top-0 z-30 px-6 py-3 backdrop-blur flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">DeskOps</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Phase 1 v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              Tenant: <span className="text-slate-200 font-medium">Lumen Hatch Workspaces</span>
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'tickets' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tickets Inbox
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
              activeTab === 'rooms' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Lumen Hatch Room Gaps
          </button>
          {userObj.role === 'ORG_ADMIN' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'admin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admin & DLQ
            </button>
          )}
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <User className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-400 font-medium">Simulate Role:</span>
            <select
              value={currentUserKey}
              onChange={(e) => setCurrentUserKey(e.target.value)}
              className="bg-transparent text-xs font-semibold text-indigo-300 focus:outline-none cursor-pointer"
            >
              <option value="staff" className="bg-slate-800 text-slate-200">Staff (Devin)</option>
              <option value="admin" className="bg-slate-800 text-slate-200">Admin (Ananya Deshpande)</option>
              <option value="tech" className="bg-slate-800 text-slate-200">Technician (Alex)</option>
              <option value="resident" className="bg-slate-800 text-slate-200">Resident (Rohan, 101)</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Radio className="w-3 h-3 animate-pulse" /> Live Socket
          </div>
        </div>
      </header>

      {/* Global Toast Alerts */}
      {actionError && (
        <div className="bg-rose-500/15 border-l-4 border-rose-500 text-rose-300 px-6 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}
      {actionSuccess && (
        <div className="bg-emerald-500/15 border-l-4 border-emerald-500 text-emerald-300 px-6 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Tickets Left List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Tickets</h2>
                  <p className="text-xs text-slate-400">Scoped to {userObj.role} in Lumen Hatch</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
                >
                  <Plus className="w-4 h-4" /> New Ticket
                </button>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap gap-1.5">
                {['', 'NEW', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                      statusFilter === s
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    {s || 'All Statuses'}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by ticket title, description, #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/60 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Ticket Cards List */}
              <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {tickets.length === 0 ? (
                  <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
                    No tickets found matching filters.
                  </div>
                ) : (
                  tickets.map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    const statusColors: Record<string, string> = {
                      NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                      TRIAGED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                      ASSIGNED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                      IN_PROGRESS: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                      ON_HOLD: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                      RESOLVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                      CLOSED: 'bg-slate-600/30 text-slate-400 border-slate-600/30',
                    };

                    return (
                      <div
                        key={t.id}
                        onClick={() => fetchTicketDetails(t)}
                        className={`p-4 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'bg-slate-800/90 border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg'
                            : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{t.ticketNumber}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {t.isDuplicate && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Duplicate
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                statusColors[t.status] || 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <h3 className="font-semibold text-sm text-slate-100 line-clamp-1">{t.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{t.description}</p>
                        <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                          <span className="bg-slate-700/60 px-2 py-0.5 rounded text-slate-300">
                            {t.category}
                          </span>
                          <span className="font-mono text-slate-400">v{t.version}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Ticket Detail Right Pane */}
            <div className="lg:col-span-7 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 flex flex-col min-h-[600px]">
              {selectedTicket ? (
                <div className="space-y-6">
                  {/* Top Bar of Detail */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700/70 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-indigo-400">
                          #{selectedTicket.ticketNumber}
                        </span>
                        <h2 className="text-xl font-bold text-white">{selectedTicket.title}</h2>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Category: <strong className="text-slate-300">{selectedTicket.category}</strong> | Priority:{' '}
                        <strong className="text-slate-300">{selectedTicket.priority}</strong> | Version:{' '}
                        <strong className="text-indigo-300">{selectedTicket.version}</strong>
                      </p>
                      {selectedTicket.meetingRoomId && (
                        <div className="mt-2 text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Lumen Hatch Scheduled Room Repair: {selectedTicket.meetingRoomId}
                        </div>
                      )}
                    </div>

                    {/* CR-1 Merge Duplicate button */}
                    {['ORG_ADMIN', 'DESK_STAFF'].includes(userObj.role) && !selectedTicket.isDuplicate && (
                      <button
                        onClick={() => setShowMergeModal(true)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-600 transition"
                      >
                        <GitMerge className="w-3.5 h-3.5 text-indigo-400" />
                        Merge Duplicate (CR-1)
                      </button>
                    )}
                  </div>

                  {/* Description & Hold Reason */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h4>
                    <p className="text-sm text-slate-200 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/40">
                      {selectedTicket.description}
                    </p>
                    {selectedTicket.holdReason && (
                      <div className="text-xs bg-orange-500/10 border border-orange-500/30 text-orange-300 p-3 rounded-lg">
                        <strong>On Hold Reason:</strong> {selectedTicket.holdReason}
                      </div>
                    )}
                  </div>

                  {/* Guarded State Machine Transition Controls */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-400" /> State Machine Action Guard (Current:{' '}
                      <span className="text-indigo-300">{selectedTicket.status}</span>)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {/* NEW -> TRIAGED */}
                      {selectedTicket.status === 'NEW' && ['ORG_ADMIN', 'DESK_STAFF'].includes(userObj.role) && (
                        <button
                          onClick={handleTriage}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                        >
                          Triage Ticket
                        </button>
                      )}

                      {/* TRIAGED -> ASSIGNED */}
                      {selectedTicket.status === 'TRIAGED' && ['ORG_ADMIN', 'DESK_STAFF'].includes(userObj.role) && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAssign('usr-tech-1')}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                          >
                            Assign Alex (Tech 1)
                          </button>
                          <button
                            onClick={() => handleAssign('usr-tech-2')}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                          >
                            Assign Sam (Tech 2)
                          </button>
                        </div>
                      )}

                      {/* ASSIGNED -> IN_PROGRESS */}
                      {selectedTicket.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleTransition('IN_PROGRESS')}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                        >
                          Start Work (In Progress)
                        </button>
                      )}

                      {/* IN_PROGRESS -> ON_HOLD */}
                      {['ASSIGNED', 'IN_PROGRESS'].includes(selectedTicket.status) && (
                        <button
                          onClick={() => handleTransition('ON_HOLD', 'Waiting for replacement parts')}
                          className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                        >
                          Put On Hold
                        </button>
                      )}

                      {/* ON_HOLD -> IN_PROGRESS */}
                      {selectedTicket.status === 'ON_HOLD' && (
                        <button
                          onClick={() => handleTransition('IN_PROGRESS')}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                        >
                          Resume Work
                        </button>
                      )}

                      {/* IN_PROGRESS -> RESOLVED */}
                      {selectedTicket.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleTransition('RESOLVED')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                        >
                          Resolve Ticket
                        </button>
                      )}

                      {/* RESOLVED -> CLOSED */}
                      {selectedTicket.status === 'RESOLVED' && ['ORG_ADMIN', 'DESK_STAFF'].includes(userObj.role) && (
                        <button
                          onClick={() => handleTransition('CLOSED')}
                          className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                        >
                          Close Ticket
                        </button>
                      )}

                      {/* Reopen inside window */}
                      {['RESOLVED', 'CLOSED'].includes(selectedTicket.status) && (
                        <button
                          onClick={() => handleTransition('TRIAGED', 'Reopened by resident within 7-day window')}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
                        >
                          Reopen Ticket (Window Active)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comments & Conversation Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      Comments (FR-1.07 Public vs Staff-Only)
                    </h4>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {comments.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No comments posted yet.</p>
                      ) : (
                        comments.map((c) => (
                          <div
                            key={c.id}
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              c.isInternal
                                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                                : 'bg-slate-900/60 border-slate-700/40 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-indigo-300">
                                {c.authorName} ({c.authorRole})
                              </span>
                              {c.isInternal && (
                                <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-500/30">
                                  Staff Only Memo
                                </span>
                              )}
                            </div>
                            <p className="text-slate-300">{c.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Form */}
                    <form onSubmit={handleAddComment} className="flex flex-col gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="Write a comment or update..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex items-center justify-between">
                        {userObj.role !== 'RESIDENT' ? (
                          <label className="flex items-center gap-1.5 text-xs text-amber-300/80 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isInternalComment}
                              onChange={(e) => setIsInternalComment(e.target.checked)}
                              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                            />
                            Internal comment (visible to staff only)
                          </label>
                        ) : (
                          <span className="text-[11px] text-slate-500">Residents post public comments</span>
                        )}
                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition"
                        >
                          Post Comment
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Immutable Event Timeline (FR-1.03) */}
                  <div className="space-y-3 pt-4 border-t border-slate-700/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Immutable Event History Timeline (FR-1.03)
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {ticketEvents.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between text-xs bg-slate-900/40 p-2.5 rounded-lg border border-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-400">{e.action}</span>
                            {e.fromStatus && e.toStatus && (
                              <span className="text-slate-400">
                                {e.fromStatus} &rarr; <strong className="text-slate-200">{e.toStatus}</strong>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(e.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <FileText className="w-12 h-12 text-slate-700" />
                  <p className="text-sm">Select a ticket from the left to view details and lifecycle controls.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Lumen Hatch Workspaces: Room Booking & Conflict Protection */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-900/40 to-slate-800 p-6 rounded-2xl border border-indigo-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-xl">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Client Rule: Lumen Hatch Meeting Room Booking Protection
                  </h2>
                  <p className="text-xs text-indigo-200/80 mt-1 max-w-3xl">
                    "When a repair ticket is raised for a room, it must be scheduled into a gap that does not
                    overlap any booking. Please make sure the system never places a repair on top of a member's
                    booking." &mdash; Ananya Deshpande, Head of Facilities
                  </p>
                </div>
              </div>
            </div>

            {/* Room Selector */}
            <div className="flex items-center gap-3">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRoomId(r.id);
                    fetchBookings(r.id);
                    fetchGaps(r.id);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                    selectedRoomId === r.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {r.name} (Hours: {r.dailyWindowStart} - {r.dailyWindowEnd})
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Existing Member Bookings */}
              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400" />
                  Confirmed Member Bookings (Protected from Overlap)
                </h3>
                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 bg-slate-900/80 rounded-xl border border-rose-500/30 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-rose-200">{b.memberName}</h4>
                        <p className="text-xs text-slate-400">{b.memberEmail}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/10 px-2 py-1 rounded">
                          {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculated Available Gaps */}
              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Available Repair Gaps (Safe to Schedule)
                </h3>
                <div className="space-y-3">
                  {gaps.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No open gaps available today.</p>
                  ) : (
                    gaps.map((g, i) => (
                      <div
                        key={i}
                        className="p-3.5 bg-slate-900/80 rounded-xl border border-emerald-500/30 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-emerald-300">Open Maintenance Slot #{i + 1}</h4>
                          <p className="text-xs text-slate-400">Duration: {g.durationMinutes} mins</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">
                            {new Date(g.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(g.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Admin & Observability (DLQ & Audit) */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Platform Observability & Audit Log</h2>
              <p className="text-xs text-slate-400">NFR-06 (Dead-Letter Queue) & NFR-09 (Audit Events)</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dead-Letter Queue */}
              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-400" />
                  Dead-Letter Queue (BullMQ Failed Jobs)
                </h3>
                {dlqJobs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No failed background jobs in DLQ.</p>
                ) : (
                  dlqJobs.map((j) => (
                    <div key={j.id} className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-700/60 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-indigo-300 font-bold">{j.jobName}</span>
                        <span className="text-rose-400 font-semibold">{j.errorReason}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Queue: {j.queueName} | Failed at: {new Date(j.failedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Audit Events */}
              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Tenant Audit Trail (NFR-09)
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No recorded audit events.</p>
                  ) : (
                    auditLogs.map((a) => (
                      <div key={a.id} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-xs">
                        <span className="font-bold text-indigo-400">{a.action}</span> &mdash; {a.entityType} ({a.entityId})
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Create Ticket */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Raise Maintenance Request</h3>
            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Broken projector in Boardroom A"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe the issue..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="GENERAL">General</option>
                    <option value="HVAC">HVAC</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ROOM_REPAIR">Room Repair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Lumen Hatch Meeting Room Scheduling Option */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-indigo-500/30 space-y-2">
                <label className="block text-indigo-300 font-semibold">
                  Lumen Hatch Meeting Room Repair (Optional)
                </label>
                <select
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None (Standard Unit / Property)</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Window: {r.dailyWindowStart} - {r.dailyWindowEnd})
                    </option>
                  ))}
                </select>
                {newRoomId && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400">Scheduled Start</span>
                      <input
                        type="datetime-local"
                        value={newRepairStart}
                        onChange={(e) => setNewRepairStart(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Scheduled End</span>
                      <input
                        type="datetime-local"
                        value={newRepairEnd}
                        onChange={(e) => setNewRepairEnd(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: CR-1 Merge Duplicate */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-indigo-400" />
              Merge Duplicate Ticket (CR-1)
            </h3>
            <p className="text-xs text-slate-400">
              Select a duplicate ticket to merge into canonical ticket #{selectedTicket?.ticketNumber}. The
              duplicate will close, and its comments and watchers will move here.
            </p>
            <div className="space-y-3 text-xs">
              <label className="block text-slate-300 font-semibold">Select Duplicate Ticket</label>
              <select
                value={mergeTargetDupId}
                onChange={(e) => setMergeTargetDupId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              >
                <option value="">Choose ticket to close as duplicate...</option>
                {tickets
                  .filter((t) => t.id !== selectedTicket?.id && !t.isDuplicate && t.status !== 'CLOSED')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.ticketNumber}: {t.title} ({t.status})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMergeDuplicate}
                disabled={!mergeTargetDupId}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 disabled:opacity-50"
              >
                Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
