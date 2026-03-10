import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, signIn, logOut } from './firebase';
import { 
  Plus, 
  LogOut, 
  Search, 
  Calendar, 
  Wrench, 
  User as UserIcon, 
  MapPin, 
  Phone, 
  History,
  LayoutDashboard,
  ClipboardList,
  Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Job {
  id: string;
  customerName: string;
  address: string;
  phone?: string;
  acModel?: string;
  jobType: 'Installation' | 'Service' | 'Repair' | 'Maintenance';
  date: string;
  notes?: string;
  engineerId: string;
  createdAt: Timestamp;
}

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setErrorInfo(event.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-xl m-4">
        <h2 className="text-red-800 font-bold mb-2">Something went wrong</h2>
        <p className="text-red-600 text-sm">{errorInfo}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Reload App
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'dashboard' | 'logs' | 'services'>('dashboard');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Jobs Listener
  useEffect(() => {
    if (!user || !isAuthReady) {
      setJobs([]);
      return;
    }

    const q = query(
      collection(db, 'jobs'),
      where('engineerId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      setJobs(jobsData);
    }, (error) => {
      console.error("Firestore Error:", JSON.stringify({
        error: error.message,
        operationType: 'list',
        path: 'jobs',
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email
        }
      }));
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleAddJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const newJob = {
      customerName: formData.get('customerName') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      acModel: formData.get('acModel') as string,
      jobType: formData.get('jobType') as string,
      date: formData.get('date') as string,
      notes: formData.get('notes') as string,
      engineerId: user.uid,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'jobs'), newJob);
      setIsAdding(false);
    } catch (error) {
      console.error("Firestore Error:", JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        operationType: 'create',
        path: 'jobs',
        authInfo: { userId: user.uid }
      }));
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.acModel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthReady) return <div className="flex items-center justify-center h-screen font-mono">INITIALIZING...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-stone-100 p-6 text-center">
        <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
          <Wind className="text-white w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Nipun's Work Diary</h1>
        <p className="text-stone-500 mb-8 max-w-xs">Your professional AC service diary. Secure, organized, and always with you.</p>
        <button 
          onClick={signIn}
          className="bg-stone-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-stone-800 transition-all flex items-center gap-3 shadow-lg hover:shadow-xl active:scale-95"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col md:flex-row bg-stone-100">
        {/* Sidebar - Desktop Only */}
        <nav className="hidden md:flex w-64 bg-stone-900 text-stone-400 p-6 flex-col border-r border-stone-800 h-screen sticky top-0">
          <div className="flex items-center gap-3 text-white mb-10">
            <div className="bg-white/10 p-2 rounded-lg">
              <Wind size={20} />
            </div>
            <span className="font-bold tracking-tight text-lg">Nipun's Work Diary</span>
          </div>

          <div className="space-y-2 flex-1">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}
            >
              <LayoutDashboard size={18} />
              <span className="font-medium">Dashboard</span>
            </button>
            <button 
              onClick={() => setView('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'logs' ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}
            >
              <ClipboardList size={18} />
              <span className="font-medium">Work Logs</span>
            </button>
            <button 
              onClick={() => setView('services')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'services' ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'}`}
            >
              <Wrench size={18} />
              <span className="font-medium">Services</span>
            </button>
          </div>

          <div className="pt-6 border-t border-stone-800">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : user.displayName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.displayName}</p>
                <p className="text-[10px] opacity-50 truncate">AC Engineer</p>
              </div>
            </div>
            <button 
              onClick={logOut}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm"
            >
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </nav>

        {/* Mobile Top Bar */}
        <div className="md:hidden bg-stone-900 text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-2">
            <Wind size={20} />
            <span className="font-bold tracking-tight">Nipun's Work Diary</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-stone-700 overflow-hidden border border-white/20">
            {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : user.displayName?.[0]}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight capitalize">{view}</h2>
              <p className="text-stone-500 text-xs md:text-sm mt-1">Manage your service records and customer history.</p>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-stone-900 text-white px-6 py-4 md:py-3 rounded-2xl md:rounded-xl font-bold md:font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-lg md:shadow-md active:scale-95"
            >
              <Plus size={20} />
              <span>Log New Job</span>
            </button>
          </header>

          {view === 'dashboard' ? (
            <div className="space-y-6 md:space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-200">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Jobs</p>
                  <p className="text-2xl md:text-4xl font-mono font-bold">{jobs.length}</p>
                </div>
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-200">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">This Month</p>
                  <p className="text-2xl md:text-4xl font-mono font-bold">
                    {jobs.filter(j => new Date(j.date).getMonth() === new Date().getMonth()).length}
                  </p>
                </div>
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-200">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">Installations</p>
                  <p className="text-2xl md:text-4xl font-mono font-bold">
                    {jobs.filter(j => j.jobType === 'Installation').length}
                  </p>
                </div>
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-200">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">Services</p>
                  <p className="text-2xl md:text-4xl font-mono font-bold">
                    {jobs.filter(j => j.jobType === 'Service').length}
                  </p>
                </div>
              </div>

              {/* Recent Jobs */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="p-5 md:p-6 border-b border-stone-100 flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
                    <History size={18} className="text-stone-400" />
                    Recent Activity
                  </h3>
                  <button onClick={() => setView('logs')} className="text-[10px] md:text-xs font-bold text-stone-500 hover:text-stone-900">View All</button>
                </div>
                <div className="divide-y divide-stone-100">
                  {jobs.slice(0, 5).map(job => (
                    <div key={job.id} className="p-5 md:p-6 flex items-start justify-between hover:bg-stone-50 transition-colors">
                      <div className="flex gap-3 md:gap-4">
                        <div className={`p-2.5 md:p-3 rounded-xl flex-shrink-0 ${
                          job.jobType === 'Installation' ? 'bg-blue-50 text-blue-600' :
                          job.jobType === 'Repair' ? 'bg-red-50 text-red-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          <Wrench size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 text-sm md:text-base truncate">{job.customerName}</p>
                          <p className="text-xs text-stone-500 flex items-center gap-1 truncate">
                            <MapPin size={10} /> {job.address}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-stone-100 rounded uppercase tracking-wider">{job.jobType}</span>
                            {job.acModel && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-stone-100 rounded uppercase tracking-wider truncate max-w-[100px]">{job.acModel}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-[10px] font-mono text-stone-400">{job.date}</p>
                      </div>
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <div className="p-12 text-center text-stone-400">
                      <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-sm">No jobs logged yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input 
                    type="text" 
                    placeholder={view === 'services' ? "Search services..." : "Search logs..."}
                    className="w-full pl-12 pr-4 py-4 md:py-3 bg-white border border-stone-200 rounded-2xl md:rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Logs Table / List on Mobile */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200">
                        <th className="p-4 col-header">Date</th>
                        <th className="p-4 col-header">Customer</th>
                        <th className="p-4 col-header">Type</th>
                        <th className="p-4 col-header">AC Model</th>
                        <th className="p-4 col-header">Address</th>
                        <th className="p-4 col-header">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(view === 'services' ? filteredJobs.filter(j => j.jobType === 'Service') : filteredJobs).map(job => (
                        <tr key={job.id} className="data-row">
                          <td className="p-4 data-value whitespace-nowrap">{job.date}</td>
                          <td className="p-4 font-bold text-sm">{job.customerName}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                              job.jobType === 'Installation' ? 'bg-blue-100 text-blue-700' :
                              job.jobType === 'Repair' ? 'bg-red-100 text-red-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {job.jobType}
                            </span>
                          </td>
                          <td className="p-4 data-value">{job.acModel || '-'}</td>
                          <td className="p-4 text-sm text-stone-500 max-w-xs truncate">{job.address}</td>
                          <td className="p-4 text-sm text-stone-400 max-w-xs truncate italic">{job.notes || 'No notes'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden divide-y divide-stone-100">
                  {(view === 'services' ? filteredJobs.filter(j => j.jobType === 'Service') : filteredJobs).map(job => (
                    <div key={job.id} className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-mono text-stone-400 mb-1">{job.date}</p>
                          <p className="font-bold text-stone-900">{job.customerName}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                          job.jobType === 'Installation' ? 'bg-blue-100 text-blue-700' :
                          job.jobType === 'Repair' ? 'bg-red-100 text-red-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {job.jobType}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-stone-500 flex items-center gap-1.5">
                          <MapPin size={12} className="text-stone-300" /> {job.address}
                        </p>
                        {job.acModel && (
                          <p className="text-xs text-stone-500 flex items-center gap-1.5">
                            <Wind size={12} className="text-stone-300" /> {job.acModel}
                          </p>
                        )}
                      </div>
                      {job.notes && (
                        <p className="text-xs text-stone-400 bg-stone-50 p-3 rounded-lg italic">
                          "{job.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {(view === 'services' ? filteredJobs.filter(j => j.jobType === 'Service') : filteredJobs).length === 0 && (
                  <div className="p-12 text-center text-stone-400">
                    <p className="text-sm">No {view === 'services' ? 'services' : 'matching logs'} found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-6 py-3 flex justify-around items-center z-40 pb-safe">
          <button 
            onClick={() => setView('dashboard')}
            className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
          </button>
          <button 
            onClick={() => setView('logs')}
            className={`flex flex-col items-center gap-1 ${view === 'logs' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <ClipboardList size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Logs</span>
          </button>
          <button 
            onClick={() => setView('services')}
            className={`flex flex-col items-center gap-1 ${view === 'services' ? 'text-stone-900' : 'text-stone-400'}`}
          >
            <Wrench size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Services</span>
          </button>
          <button 
            onClick={logOut}
            className="flex flex-col items-center gap-1 text-stone-400"
          >
            <LogOut size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Exit</span>
          </button>
        </nav>

        {/* Add Job Modal */}
        <AnimatePresence>
          {isAdding && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdding(false)}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-stone-100 flex items-center justify-between">
                  <h3 className="text-2xl font-bold tracking-tight">Log New Job</h3>
                  <button onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-stone-900 transition-colors">
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>
                <form onSubmit={handleAddJob} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                        <UserIcon size={12} /> Customer Name
                      </label>
                      <input 
                        required
                        name="customerName"
                        type="text" 
                        placeholder="e.g. John Smith"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                        <Phone size={12} /> Phone Number
                      </label>
                      <input 
                        name="phone"
                        type="tel" 
                        placeholder="e.g. 071 234 5678"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                        <MapPin size={12} /> Address
                      </label>
                      <input 
                        required
                        name="address"
                        type="text" 
                        placeholder="Full service location address"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                        <Wind size={12} /> AC Model
                      </label>
                      <input 
                        name="acModel"
                        type="text" 
                        placeholder="e.g. Daikin 1.5HP Inverter"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                        <Wrench size={12} /> Job Type
                      </label>
                      <select 
                        required
                        name="jobType"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 appearance-none"
                      >
                        <option value="Service">Service</option>
                        <option value="Installation">Installation</option>
                        <option value="Repair">Repair</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                        <Calendar size={12} /> Date
                      </label>
                      <input 
                        required
                        name="date"
                        type="date" 
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Notes & Details</label>
                    <textarea 
                      name="notes"
                      rows={3}
                      placeholder="Describe the work done, parts replaced, etc."
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/10 resize-none"
                    />
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="flex-1 px-6 py-4 border border-stone-200 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all shadow-lg active:scale-95"
                    >
                      Save Record
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
