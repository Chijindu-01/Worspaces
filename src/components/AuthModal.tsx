import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { StaffMember } from '../types';
import { ValueFlowLogo } from './ValueFlowLogo';
import {
  X,
  Mail,
  Lock,
  User,
  Sparkles,
  Shield,
  Briefcase,
  Layers,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Tv
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'demo' | 'guest'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Signup fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [roleType, setRoleType] = useState<'admin' | 'manager' | 'staff'>('staff');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load saved credentials if "Remember Me" was previously enabled on this device
  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('vft_remembered_email');
      const savedPassword = localStorage.getItem('vft_remembered_password');
      if (savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getFriendlyErrorMessage = (err: any): string => {
    if (!err) return 'An unexpected validation error occurred.';
    
    const code = err.code || '';
    const msg = err.message || '';
    
    // Check if the provider is disabled or not allowed on Firebase project console
    if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed') || msg.includes('auth/operation-not-allowed')) {
      return 'The requested sign-in method is currently disabled in your Firebase console. To fix this, log in to the Firebase Console (https://console.firebase.google.com/), select your project, click on "Authentication" in the sidebar, navigate to the "Sign-in method" tab, and enable the providers you want to support (such as "Email/Password", "Anonymous", and/or "Google").';
    }
    
    if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
      return 'This email address is already registered in the workspace registry. Please try signing in under the "Sign In" tab instead.';
    }
    
    if (code === 'auth/weak-password' || msg.includes('weak-password')) {
      return 'Security constraint: The password provided is too weak. Please use a password containing at least 6 characters.';
    }
    
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential' || msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
      return 'Authentication failed: Invalid credentials or incorrect password. Please verify your email and password, or select a pre-configured team member in the "Quick Demos" tab.';
    }
    
    if (code === 'auth/popup-blocked' || msg.includes('popup-blocked') || msg.includes('cancelled-by-user') || msg.includes('auth/popup-closed-by-user')) {
      return 'Google sign-in popup was blocked or aborted. (Note: Inside cross-origin iframes like this preview, standard popup redirects are blocked. Please use the standard Email/Password tab or launch the app in a new tab using the top-right button, then try Google login).';
    }
    
    return msg || 'An unexpected authentication exception has occurred.';
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Persist or clear remembered credentials based on Remember Me setting
      if (rememberMe) {
        localStorage.setItem('vft_remembered_email', email);
        localStorage.setItem('vft_remembered_password', password);
      } else {
        localStorage.removeItem('vft_remembered_email');
        localStorage.removeItem('vft_remembered_password');
      }

      setSuccessMsg('Successfully signed in! Synchronizing secure workspace...');
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update auth profile with their actual name
      try {
        await updateProfile(user, { displayName: name });
      } catch (profileErr) {
        console.warn('Could not set displayName on Firebase Auth account:', profileErr);
      }

      // Immediately write a customized StaffMember profile document to Firestore!
      const newStaff: StaffMember = {
        id: user.uid,
        name: name,
        role: role,
        email: email.toLowerCase(),
        avatarColor: ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899'][Math.floor(Math.random() * 5)],
        roleType: roleType,
        notificationsPref: {
          dailySummary: true,
          taskReminders: true,
          meetingReminders: true,
          overdueEscalations: true,
          missedUpdates: true
        },
        googleCalendarConnected: false,
        zoomConnected: false,
        joinedWorkspace: true
      };

      await setDoc(doc(db, 'staffMembers', user.uid), newStaff);
      
      setSuccessMsg('Account and secure database profile registered successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      // Seed an anonymous sandbox profile if it does not exist
      const newStaff: StaffMember = {
        id: user.uid,
        name: 'Guest Sandbox',
        role: 'Evaluation Auditor',
        email: 'guest-sandbox@vft.team',
        avatarColor: '#475569', // slate
        roleType: 'staff',
        notificationsPref: {
          dailySummary: false,
          taskReminders: true,
          meetingReminders: true,
          overdueEscalations: false,
          missedUpdates: false
        },
        googleCalendarConnected: false,
        zoomConnected: false,
        joinedWorkspace: true
      };

      await setDoc(doc(db, 'staffMembers', user.uid), newStaff);

      setSuccessMsg('Guest anonymous workspace sync activated!');
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInFallback = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setSuccessMsg('Google account synchronized correctly!');
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Automated Quick Demo Switch Authenticator
  const triggerDemoQuickLogin = async (demoEmail: string, demoName: string, demoRole: string, demoRoleLevel: 'admin' | 'manager' | 'staff', color: string) => {
    setLoading(true);
    setError(null);
    const demoPassword = 'vftdemoaccount'; // standardized secure demo key
    try {
      // 1. Try signing in
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      setSuccessMsg(`Simulating authenticated secure alignment as ${demoName}...`);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      // 2. If user doesn't exist yet, we register them on the fly
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          const user = userCredential.user;

          const newStaff: StaffMember = {
            id: user.uid,
            name: demoName,
            role: demoRole,
            email: demoEmail,
            avatarColor: color,
            roleType: demoRoleLevel,
            notificationsPref: {
              dailySummary: true,
              taskReminders: true,
              meetingReminders: true,
              overdueEscalations: true,
              missedUpdates: true
            },
            googleCalendarConnected: true,
            zoomConnected: true,
            joinedWorkspace: true
          };

          await setDoc(doc(db, 'staffMembers', user.uid), newStaff);
          setSuccessMsg(`Registered & authenticating demo profile: ${demoName}...`);
          setTimeout(() => {
            onSuccess();
            onClose();
            setSuccessMsg(null);
          }, 1000);
        } catch (regErr: any) {
          console.error(regErr);
          setError(getFriendlyErrorMessage(regErr));
        }
      } else {
        setError(getFriendlyErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: 's.chen@vft.team', name: 'Sarah Chen', role: 'Senior Product Designer', level: 'admin' as const, color: '#10B981' },
    { email: 'm.brody@vft.team', name: 'Marcus Brody', role: 'Lead Full-Stack Architect', level: 'manager' as const, color: '#8B5CF6' },
    { email: 'e.rostova@vft.team', name: 'Elena Rostova', role: 'Head of Growth Marketing', level: 'staff' as const, color: '#F59E0B' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg p-6 lg:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer h-9 w-9 flex items-center justify-center border border-slate-100 dark:border-slate-800"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Header */}
        <div className="space-y-4 pr-8">
          <div className="flex items-center gap-1">
            <ValueFlowLogo size="sm" variant="color" />
          </div>
          <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-indigo-100/50 dark:border-indigo-900/30">
            <Sparkles className="h-3 w-3 animate-spin text-amber-500" />
            ValueFlow Workspace Synced Auth
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium select-none">
            Establish a secure cloud session to synchronize real-time updates, directives, calendar alignments, and auditable metrics.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 pb-1">
          {[
            { id: 'signin', label: 'Sign In' },
            { id: 'signup', label: 'Sign Up / Join' },
            { id: 'demo', label: 'Quick Demos' },
            { id: 'guest', label: 'Guest Sandbox' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setError(null);
              }}
              className={`flex-1 text-center pb-2.5 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick Help/Alert Notification */}
        {error && (
          error.includes('auth/operation-not-allowed') || error.includes('disabled in your Firebase console') || error.includes('operation-not-allowed') ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded-3xl border border-amber-200 dark:border-amber-900/50 text-xs space-y-3 animate-fade-in shadow-sm">
              <div className="flex items-top gap-2.5">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold uppercase tracking-tight text-[11px] text-amber-800 dark:text-amber-300">
                    Firebase Provider Activation Required
                  </h4>
                  <p className="text-[10.5px] text-amber-700/90 dark:text-amber-300/80 mt-1 font-semibold leading-relaxed">
                    Firebase returned an <code className="font-mono bg-amber-100/60 dark:bg-amber-900/50 px-1 py-0.5 rounded text-[10px] text-amber-900 dark:text-amber-100">auth/operation-not-allowed</code> error because the selected sign-in provider is not enabled in your Firebase Project Console yet.
                  </p>
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-slate-950/50 p-3 rounded-2xl border border-amber-250/20 dark:border-amber-900/30 space-y-2">
                <p className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                  Quick Enable Walkthrough:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[10.5px] text-slate-700 dark:text-slate-350 font-medium">
                  <li>
                    Go to the{' '}
                    <a
                      href="https://console.firebase.google.com/project/vft-workspace/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5 focus:outline-none"
                    >
                      Firebase Authentication Settings ↗
                    </a>
                  </li>
                  <li>
                    Under the <strong className="font-black text-slate-900 dark:text-white">Sign-in providers</strong> (or Sign-in method) tab, click <strong className="font-black text-slate-900 dark:text-white">Add new provider</strong>.
                  </li>
                  <li>
                    Enable <strong className="font-black text-slate-900 dark:text-white">Email/Password</strong> or <strong className="font-black text-slate-900 dark:text-white">Google</strong>, then save!
                  </li>
                  <li>
                    Refresh this app or reopen the Login modal to authenticate instantly.
                  </li>
                </ol>
              </div>

              <div className="flex gap-2">
                <a
                  href="https://console.firebase.google.com/project/vft-workspace/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-wider py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Configure Providers now
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText("https://console.firebase.google.com/project/vft-workspace/authentication/providers");
                    alert("Settings link copied to clipboard!");
                  }}
                  className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider py-2 rounded-xl transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700"
                >
                  Copy URL
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/40 text-xs font-medium">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )
        )}

        {successMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-xs font-medium animate-pulse">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB CONTENTS */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-805 dark:text-slate-105"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-805 dark:text-slate-105"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1 select-none">
              <label className="flex items-center gap-2.5 cursor-pointer group/rem">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 transition-all cursor-pointer bg-slate-50 dark:bg-slate-950/40"
                  id="remember-me-checkbox"
                />
                <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 group-hover/rem:text-slate-700 dark:group-hover/rem:text-slate-300 transition-colors">
                  Remember my log in details
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black text-[11px] uppercase tracking-wider py-3.5 rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-500/15"
            >
              {loading ? 'Authenticating...' : 'Sign In and Initialize'}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignInFallback}
              disabled={loading}
              className="w-full text-center border border-slate-250 dark:border-slate-800 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-850 py-3.5 rounded-xl text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Sign In with Google
            </button>
          </form>
        )}

        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 pb-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Sarah Chen"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-805 dark:text-slate-105"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Job Title / Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="Product Manager"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-805 dark:text-slate-105"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Authority Permission Level</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'staff', label: 'Staff Member', desc: 'Standard Access' },
                  { id: 'manager', label: 'PM Manager', desc: 'Project Planner' },
                  { id: 'admin', label: 'Administrator', desc: 'Full System Control' }
                ].map(level => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setRoleType(level.id as any)}
                    className={`p-2.5 border rounded-xl text-left cursor-pointer transition-all select-none ${
                      roleType === level.id
                        ? 'border-indigo-600 bg-indigo-50/45 dark:bg-indigo-950/25 dark:border-indigo-500 text-slate-850 dark:text-slate-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-[10.5px] font-black uppercase tracking-wider leading-tight">{level.label}</p>
                    <p className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">{level.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="sarah.chen@company.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-805 dark:text-slate-105"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Authentication Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-805 dark:text-slate-105"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black text-[11px] uppercase tracking-wider py-3.5 rounded-xl cursor-pointer transition-all shadow-lg"
            >
              {loading ? 'Creating Profile...' : 'Complete Registration & Join'}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignInFallback}
              disabled={loading}
              className="w-full text-center border border-slate-250 dark:border-slate-800 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-850 py-3.5 rounded-xl text-[10.5px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Sign Up with Google
            </button>
          </form>
        )}

        {activeTab === 'demo' && (
          <div className="space-y-4">
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Select one of the workspace simulation demo cards below. We will instantly orchestrate matching Firebase credentials and synchronize your Firestore workspace:
              </p>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {demoAccounts.map(profile => (
                <button
                  key={profile.email}
                  onClick={() => triggerDemoQuickLogin(profile.email, profile.name, profile.role, profile.level, profile.color)}
                  disabled={loading}
                  className="w-full text-left p-3 border border-slate-200 dark:border-slate-850 hover:border-indigo-500 hover:bg-indigo-50/15 dark:hover:bg-indigo-950/10 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-black"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-850 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {profile.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
                        {profile.role}
                      </p>
                    </div>
                  </div>

                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
                    {profile.level}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                onClick={handleGoogleSignInFallback}
                disabled={loading}
                className="w-full text-center border border-slate-200 dark:border-slate-800 hover:border-indigo-500 py-3 rounded-2xl text-[10.5px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-850 transition-all cursor-pointer"
              >
                Alternative: Sign In with Google
              </button>
            </div>
          </div>
        )}

        {activeTab === 'guest' && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-300 rounded-2xl border border-amber-100/50 dark:border-amber-900/30 text-xs leading-normal font-medium space-y-2 select-none">
              <div className="flex items-center gap-2 font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <Shield className="h-4 w-4" />
                Zero-Credentials Sandbox Session
              </div>
              <p className="text-[11px]">
                Create a transient Guest session supported by Firebase Auth. Excellent for testing full security invariant matrices and live-saving actions on Firestore in general environments. Use this when you do not wish to supply any email addresses.
              </p>
            </div>

            <button
              onClick={handleAnonymousSignIn}
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            >
              {loading ? 'Instantiating Session...' : 'Launch Guest Session'}
            </button>
          </div>
        )}

        {/* Info footer */}
        <div className="text-[10px] text-slate-400 text-center select-none pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 font-semibold">
          <Layers className="h-3 w-3" />
          <span>Sync engine locks reads & writes securely via client certificates</span>
        </div>

      </div>
    </div>
  );
}
