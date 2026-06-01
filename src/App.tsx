/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { StaffMember, Task, Meeting, Goal, Reminder, AuditLog } from './types';
import {
  DEFAULT_STAFF,
  DEFAULT_TASKS,
  DEFAULT_MEETINGS,
  DEFAULT_GOALS,
  DEFAULT_REMINDERS,
  DEFAULT_AUDIT_LOGS,
} from './components/mockData';

// Firebase integrations
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

// Tab components
import TabReports from './components/TabReports';
import TabTasks from './components/TabTasks';
import TabMeetings from './components/TabMeetings';
import TabGoals from './components/TabGoals';
import TabReminders from './components/TabReminders';
import TabCalendar from './components/TabCalendar';
import TabMembers from './components/TabMembers';
import AuthModal from './components/AuthModal';
import { ValueFlowLogo } from './components/ValueFlowLogo';
import { syncEventToGoogleCalendar, deleteEventFromGoogleCalendar } from './googleCalendar';

// Lucide Icons
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Layers,
  Bell,
  Users,
  Settings,
  Activity,
  Globe2,
  Video,
  Database,
  Sparkles,
  ClipboardList,
  Flame,
  CheckCircle2,
  Moon,
  Sun,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Briefcase,
  LogOut,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'reports' | 'tasks' | 'calendar' | 'meetings' | 'goals' | 'reminders' | 'settings' | 'members'>('reports');

  const navScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollNav = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
      const scrollAmount = 180;
      navScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Unified State Core
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeUser, setActiveUser] = useState<StaffMember | null>(null);

  // Google Calendar Integration states
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null);
  const [calendarSyncSuccess, setCalendarSyncSuccess] = useState<string | null>(null);

  // Appearance theme state: 'light' | 'dark'
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // Workspace logo / image settings
  const [workspaceLogo, setWorkspaceLogo] = useState<string>(() => {
    return localStorage.getItem('vft_workspace_logo') || '';
  });
  const [showWorkspaceLogoModal, setShowWorkspaceLogoModal] = useState<boolean>(false);

  // Firebase integration status
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [greetingMessage, setGreetingMessage] = useState<string>('');

  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        // Immediately set a local activeUser representing the logged in user to avoid delayed load
        const emailPrefix = user.email ? user.email.split('@')[0] : 'user';
        const capitalizedPrefix = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        setActiveUser({
          id: user.uid,
          name: user.displayName || capitalizedPrefix || 'Authorized User',
          role: 'Unified Workspace Collaborator',
          email: user.email || 'authenticated-sync@vft.team',
          avatarColor: '#5046e5',
          roleType: 'staff',
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
        });
      } else {
        setFirebaseUser(null);
        setIsCloudSynced(false);
        setGoogleAccessToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Seeding check on Firebase connection
  useEffect(() => {
    if (!firebaseUser) {
      setIsCloudSynced(false);
      return;
    }

    const checkAndSeed = async () => {
      try {
        let retries = 3;
        let snap;
        while (retries > 0) {
          try {
            snap = await getDocs(collection(db, 'staffMembers'));
            break;
          } catch (err: any) {
            retries--;
            if (retries === 0) {
              throw err;
            }
            console.warn(`Transient Firestore read error during seeding, retrying in 500ms... (${retries} attempts left)`, err);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        const isDbNew = snap ? snap.empty : true;
        
        // Retrieve synchronous snapshot of current offline localStorage to prevent asynchronous state closure stale values
        const storedStaff = localStorage.getItem('vft_staff');
        const storedTasks = localStorage.getItem('vft_tasks');
        const storedMeetings = localStorage.getItem('vft_meetings');
        const storedGoals = localStorage.getItem('vft_goals');
        const storedReminders = localStorage.getItem('vft_reminders');
        const storedLogs = localStorage.getItem('vft_logs');

        const localStaff: StaffMember[] = storedStaff ? JSON.parse(storedStaff) : DEFAULT_STAFF;
        const localTasks: Task[] = storedTasks ? JSON.parse(storedTasks) : DEFAULT_TASKS;
        const localMeetings: Meeting[] = storedMeetings ? JSON.parse(storedMeetings) : DEFAULT_MEETINGS;
        const localGoals: Goal[] = storedGoals ? JSON.parse(storedGoals) : DEFAULT_GOALS;
        const localReminders: Reminder[] = storedReminders ? JSON.parse(storedReminders) : DEFAULT_REMINDERS;
        const localLogs: AuditLog[] = storedLogs ? JSON.parse(storedLogs) : DEFAULT_AUDIT_LOGS;

        console.log('Synchronizing local workspace entities with Firebase Cloud Storage (No-Clobber Reconciliation)...');

        // 1. Reconcile staffMembers
        try {
          const cloudStaffIds = new Set(snap ? snap.docs.map(doc => doc.id) : []);
          const batch = writeBatch(db);
          let writeNeeded = false;
          const staffToSync = isDbNew ? localStaff : localStaff.filter(m => !cloudStaffIds.has(m.id));
          staffToSync.forEach(item => {
            batch.set(doc(db, 'staffMembers', item.id), item);
            writeNeeded = true;
          });
          if (writeNeeded) {
            await batch.commit();
            console.log('Seeded/synchronized staffMembers successfully.');
          }
        } catch (e) {
          console.error('Error reconciling staffMembers:', e);
        }

        // 2. Reconcile tasks/directives
        try {
          const tasksCollection = await getDocs(collection(db, 'tasks'));
          const cloudTaskIds = new Set(tasksCollection.docs.map(doc => doc.id));
          const batch = writeBatch(db);
          let writeNeeded = false;
          const tasksToSync = isDbNew ? localTasks : localTasks.filter(t => !cloudTaskIds.has(t.id));
          tasksToSync.forEach(item => {
            const enriched = { ...item, isPrivate: item.isPrivate ?? false };
            batch.set(doc(db, 'tasks', item.id), enriched);
            writeNeeded = true;
          });
          if (writeNeeded) {
            await batch.commit();
            console.log('Seeded/synchronized tasks successfully.');
          }
        } catch (e) {
          console.error('Error reconciling tasks:', e);
        }

        // 3. Reconcile meetings
        try {
          const meetingsCollection = await getDocs(collection(db, 'meetings'));
          const cloudMeetingIds = new Set(meetingsCollection.docs.map(doc => doc.id));
          const batch = writeBatch(db);
          let writeNeeded = false;
          const meetingsToSync = isDbNew ? localMeetings : localMeetings.filter(m => !cloudMeetingIds.has(m.id));
          meetingsToSync.forEach(item => {
            batch.set(doc(db, 'meetings', item.id), item);
            writeNeeded = true;
          });
          if (writeNeeded) {
            await batch.commit();
            console.log('Seeded/synchronized meetings successfully.');
          }
        } catch (e) {
          console.error('Error reconciling meetings:', e);
        }

        // 4. Reconcile goals
        try {
          const goalsCollection = await getDocs(collection(db, 'goals'));
          const cloudGoalIds = new Set(goalsCollection.docs.map(doc => doc.id));
          const batch = writeBatch(db);
          let writeNeeded = false;
          const goalsToSync = isDbNew ? localGoals : localGoals.filter(g => !cloudGoalIds.has(g.id));
          goalsToSync.forEach(item => {
            batch.set(doc(db, 'goals', item.id), item);
            writeNeeded = true;
          });
          if (writeNeeded) {
            await batch.commit();
            console.log('Seeded/synchronized goals successfully.');
          }
        } catch (e) {
          console.error('Error reconciling goals:', e);
        }

        // 5. Reconcile reminders
        try {
          const remindersCollection = await getDocs(collection(db, 'reminders'));
          const cloudReminderIds = new Set(remindersCollection.docs.map(doc => doc.id));
          const batch = writeBatch(db);
          let writeNeeded = false;
          const remindersToSync = isDbNew ? localReminders : localReminders.filter(r => !cloudReminderIds.has(r.id));
          remindersToSync.forEach(item => {
            batch.set(doc(db, 'reminders', item.id), item);
            writeNeeded = true;
          });
          if (writeNeeded) {
            await batch.commit();
            console.log('Seeded/synchronized reminders successfully.');
          }
        } catch (e) {
          console.error('Error reconciling reminders:', e);
        }

        // 6. Reconcile auditLogs
        try {
          const logsCollection = await getDocs(collection(db, 'auditLogs'));
          const cloudLogIds = new Set(logsCollection.docs.map(doc => doc.id));
          const batch = writeBatch(db);
          let writeNeeded = false;
          const logsToSync = isDbNew ? localLogs : localLogs.filter(l => !cloudLogIds.has(l.id));
          logsToSync.forEach(item => {
            batch.set(doc(db, 'auditLogs', item.id), item);
            writeNeeded = true;
          });
          if (writeNeeded) {
            await batch.commit();
            console.log('Seeded/synchronized auditLogs successfully.');
          }
        } catch (e) {
          console.error('Error reconciling auditLogs:', e);
        }

        console.log('Database synced with offline local workspace entries successfully!');
        setIsCloudSynced(true);
      } catch (e) {
        console.error('Error syncing initial Firestore items:', e);
        // Resilient recovery: mark cloud synced as true to allow subscription attempts
        setIsCloudSynced(true);
      }
    };

    checkAndSeed();
  }, [firebaseUser]);

  // Set real-time matching profile
  useEffect(() => {
    if (!isCloudSynced || !firebaseUser) return;

    const matchAndEnsureProfile = async () => {
      try {
        const snap = await getDocs(collection(db, 'staffMembers'));
        const staffList = snap.docs.map(d => d.data() as StaffMember);
        
        // 1. Try to find by direct UID match
        let found = staffList.find(m => m.id === firebaseUser.uid);
        
        // 2. Try to find by Email match if not found by UID
        if (!found && firebaseUser.email) {
          found = staffList.find(m => m.email?.toLowerCase() === firebaseUser.email.toLowerCase());
          if (found) {
            // Profile found with same email but old placeholder ID
            const updated = { ...found, id: firebaseUser.uid };
            await setDoc(doc(db, 'staffMembers', firebaseUser.uid), updated);
            // Optionally remove the old placeholder id doc
            try {
              if (found.id !== firebaseUser.uid) {
                await deleteDoc(doc(db, 'staffMembers', found.id));
              }
            } catch (delErr) {
              console.error('Could not clean up duplicate placeholder profile:', delErr);
            }
            found = updated;
          }
        }
        
        // 3. If still not found, create a new profile for this authenticated user!
        if (!found) {
          const emailPrefix = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'user';
          const capitalizedPrefix = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          const newStaff: StaffMember = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || capitalizedPrefix || 'New Colleague',
            role: 'Unified Workspace Collaborator',
            email: firebaseUser.email || 'authenticated-sync@vft.team',
            avatarColor: ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899'][Math.floor(Math.random() * 5)],
            roleType: 'staff',
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
          await setDoc(doc(db, 'staffMembers', firebaseUser.uid), newStaff);
          found = newStaff;
        }

        // Set the activeUser
        if (found) {
          setActiveUser(found);
          handleAudit('Identity Synchronized', `Connected session as authenticated user ${found.name}`);
        }
      } catch (err) {
        console.error('Error synchronizing active user profile:', err);
      }
    };
    
    matchAndEnsureProfile();
  }, [isCloudSynced, firebaseUser]);

  // Real-time synchronization subscription
  useEffect(() => {
    if (!isCloudSynced || !firebaseUser) return;

    const unsubStaff = onSnapshot(collection(db, 'staffMembers'), (snap) => {
      const data = snap.docs.map(doc => doc.data() as StaffMember);
      if (data.length > 0) {
        // Enforce uniqueness of staffMembers by id to prevent duplicate rendering keys
        const unique = Array.from(new Map(data.map(item => [item.id, item])).values());
        setStaffMembers(unique);
        // Ensure activeUser reference is updated correctly without stale closures
        setActiveUser((currentActive) => {
          const targetId = firebaseUser?.uid || currentActive?.id || 'staff-1';
          const matched = unique.find(m => m.id === targetId);
          return matched || currentActive;
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'staffMembers');
    });

    // We split tasks into public and private queries to satisfy zero-trust security rules and support rules as not filters
    let publicTasks: Task[] = [];
    let privateTasks: Task[] = [];

    const handleTasksUpdate = () => {
      const merged = [...publicTasks, ...privateTasks];
      const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
      setTasks(unique);
    };

    const qPublic = query(collection(db, 'tasks'), where('isPrivate', '==', false));
    const unsubPublicTasks = onSnapshot(qPublic, (snap) => {
      publicTasks = snap.docs.map(doc => doc.data() as Task);
      handleTasksUpdate();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tasks/public');
    });

    const qPrivate = query(collection(db, 'tasks'), where('isPrivate', '==', true));
    const unsubPrivateTasks = onSnapshot(qPrivate, (snap) => {
      privateTasks = snap.docs.map(doc => doc.data() as Task);
      handleTasksUpdate();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tasks/private');
    });

    const unsubMeetings = onSnapshot(collection(db, 'meetings'), (snap) => {
      const data = snap.docs.map(doc => doc.data() as Meeting);
      setMeetings(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'meetings');
    });

    const unsubGoals = onSnapshot(collection(db, 'goals'), (snap) => {
      const data = snap.docs.map(doc => doc.data() as Goal);
      setGoals(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'goals');
    });

    const unsubReminders = onSnapshot(collection(db, 'reminders'), (snap) => {
      const data = snap.docs.map(doc => doc.data() as Reminder);
      setReminders(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reminders');
    });

    const unsubLogs = onSnapshot(collection(db, 'auditLogs'), (snap) => {
      const data = snap.docs.map(doc => doc.data() as AuditLog);
      const sortedData = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(sortedData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'auditLogs');
    });

    return () => {
      unsubStaff();
      unsubPublicTasks();
      unsubPrivateTasks();
      unsubMeetings();
      unsubGoals();
      unsubReminders();
      unsubLogs();
    };
  }, [isCloudSynced, firebaseUser]);

  // Initialize data on mount
  useEffect(() => {
    try {
      const storedStaff = localStorage.getItem('vft_staff');
      const storedTasks = localStorage.getItem('vft_tasks');
      const storedMeetings = localStorage.getItem('vft_meetings');
      const storedGoals = localStorage.getItem('vft_goals');
      const storedReminders = localStorage.getItem('vft_reminders');
      const storedLogs = localStorage.getItem('vft_logs');
      const storedActiveUserId = localStorage.getItem('vft_active_user_id');
      const storedTheme = localStorage.getItem('vft_theme') as 'light' | 'dark' | null;

      const resolvedStaffRaw = storedStaff ? JSON.parse(storedStaff) : DEFAULT_STAFF;
      const resolvedStaff = Array.isArray(resolvedStaffRaw)
        ? resolvedStaffRaw.map((m: any) => ({ ...m, roleType: m.roleType || 'staff' }))
        : DEFAULT_STAFF;
      // Enforce unique items from storage/defaults to guard against duplicate key errors on mount
      const resolvedStaffUnique = Array.from(new Map(resolvedStaff.map((item) => [item.id, item])).values()) as StaffMember[];
      const resolvedTasks = storedTasks ? JSON.parse(storedTasks) : DEFAULT_TASKS;
      const resolvedMeetings = storedMeetings ? JSON.parse(storedMeetings) : DEFAULT_MEETINGS;
      const resolvedGoals = storedGoals ? JSON.parse(storedGoals) : DEFAULT_GOALS;
      const resolvedReminders = storedReminders ? JSON.parse(storedReminders) : DEFAULT_REMINDERS;
      const resolvedLogs = storedLogs ? JSON.parse(storedLogs) : DEFAULT_AUDIT_LOGS;

      setStaffMembers(resolvedStaffUnique);
      setTasks(resolvedTasks);
      setMeetings(resolvedMeetings);
      setGoals(resolvedGoals);
      setReminders(resolvedReminders);
      setAuditLogs(resolvedLogs);
      
      if (storedTheme) {
        setThemeMode(storedTheme);
      }

      if (resolvedStaff && resolvedStaff.length > 0) {
        let defaultActive = resolvedStaff[0];
        if (storedActiveUserId) {
          const matched = resolvedStaff.find((m: StaffMember) => m.id === storedActiveUserId);
          if (matched) defaultActive = matched;
        }
        setActiveUser(defaultActive);
      }
    } catch (e) {
      console.error('Error reading localStorage. Proceeding with defaults.', e);
      setStaffMembers(DEFAULT_STAFF);
      setTasks(DEFAULT_TASKS);
      setMeetings(DEFAULT_MEETINGS);
      setGoals(DEFAULT_GOALS);
      setReminders(DEFAULT_REMINDERS);
      setAuditLogs(DEFAULT_AUDIT_LOGS);
      if (DEFAULT_STAFF.length > 0) {
        setActiveUser(DEFAULT_STAFF[0]);
      }
    }
  }, []);

  // Save to localStorage helpers as a resilient real-time offline-first cache
  useEffect(() => {
    if (staffMembers.length > 0) localStorage.setItem('vft_staff', JSON.stringify(staffMembers));
  }, [staffMembers]);

  useEffect(() => {
    if (tasks.length > 0) localStorage.setItem('vft_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (meetings.length > 0) localStorage.setItem('vft_meetings', JSON.stringify(meetings));
  }, [meetings]);

  useEffect(() => {
    if (goals.length > 0) localStorage.setItem('vft_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    if (reminders.length > 0) localStorage.setItem('vft_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    if (auditLogs.length > 0) localStorage.setItem('vft_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('vft_active_user_id', activeUser.id);
      if (isCloudSynced && firebaseUser) {
        try {
          setDoc(doc(db, 'staffMembers', activeUser.id), activeUser);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `staffMembers/${activeUser.id}`);
        }
      } else {
        setStaffMembers((prev) =>
          prev.map((m) => (m.id === activeUser.id ? activeUser : m))
        );
      }
    }
  }, [activeUser, isCloudSynced, firebaseUser]);

  useEffect(() => {
    localStorage.setItem('vft_theme', themeMode);
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);

  useEffect(() => {
    if (activeUser) {
      const name = activeUser.name || 'Cjay';
      const firstName = name.split(' ')[0];
      const greetings = [
        `Welcome to the Office ${firstName}, Seize the day!!!`,
        `Welcome back to the Office ${firstName}, productivity is in you!!!`
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      setGreetingMessage(randomGreeting);
    }
  }, [activeUser]);

  // CLOUD CONNECTIONS

  const handleConnectFirebase = async () => {
    setShowAuthModal(true);
  };

  const handleDisconnectFirebase = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setIsCloudSynced(false);
      handleAudit('Sync Disconnected', 'Graceful disconnect. Local sandbox datasets restored.');
      
      const storedStaff = localStorage.getItem('vft_staff');
      const storedTasks = localStorage.getItem('vft_tasks');
      const storedMeetings = localStorage.getItem('vft_meetings');
      const storedGoals = localStorage.getItem('vft_goals');
      const storedReminders = localStorage.getItem('vft_reminders');
      const storedLogs = localStorage.getItem('vft_logs');
      
      if (storedStaff) setStaffMembers(JSON.parse(storedStaff));
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      if (storedMeetings) setMeetings(JSON.parse(storedMeetings));
      if (storedGoals) setGoals(JSON.parse(storedGoals));
      if (storedReminders) setReminders(JSON.parse(storedReminders));
      if (storedLogs) setAuditLogs(JSON.parse(storedLogs));
    } catch (e) {
      console.error('Firebase Auth sign out failed:', e);
    }
  };

  // STATE ACTIONS

  const handleAudit = async (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: activeUser ? activeUser.name : 'VFT System',
      action,
      details,
    };
    
    // Always update local state immediately for instant feedback and backup caching
    setAuditLogs((prev) => [newLog, ...prev].slice(0, 50));

    if (isCloudSynced && firebaseUser) {
      try {
        await setDoc(doc(db, 'auditLogs', newLog.id), newLog);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `auditLogs/${newLog.id}`);
      }
    }
  };

  const handleAddTask = async (taskInput: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskInput,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      comments: taskInput.comments || [],
      isPrivate: taskInput.isPrivate ?? false
    };

    // Always update local state immediately for instant feedback and backup caching
    setTasks((prev) => [newTask, ...prev]);

    if (isCloudSynced && firebaseUser) {
      try {
        await setDoc(doc(db, 'tasks', newTask.id), newTask);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `tasks/${newTask.id}`);
      }
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    const enrichedTask: Task = {
      ...updatedTask,
      isPrivate: updatedTask.isPrivate ?? false
    };

    // Always update local state immediately for instant feedback and backup caching
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? enrichedTask : t)));

    if (isCloudSynced && firebaseUser) {
      try {
        await setDoc(doc(db, 'tasks', enrichedTask.id), enrichedTask);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `tasks/${enrichedTask.id}`);
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Always update local state immediately for instant feedback and backup caching
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    if (isCloudSynced && firebaseUser) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
      }
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setCalendarSyncError(null);
      setCalendarSyncSuccess(null);
      
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to obtain Google OAuth access token.');
      }
      
      const token = credential.accessToken;
      setGoogleAccessToken(token);
      
      let updatedUserObj: StaffMember | null = null;
      setActiveUser((current) => {
        if (!current) return null;
        updatedUserObj = {
          ...current,
          googleCalendarConnected: true
        };
        return updatedUserObj;
      });
      
      if (isCloudSynced && firebaseUser) {
        setTimeout(async () => {
          if (updatedUserObj) {
            await setDoc(doc(db, 'staffMembers', firebaseUser.uid), updatedUserObj, { merge: true });
          }
        }, 100);
      }
      
      setCalendarSyncSuccess('Successfully authorized & connected Google Calendar API!');
      handleAudit('API Integration Change', `Google Calendar API status on ${activeUser?.name || 'Active User'} enabled and authenticated.`);
    } catch (err: any) {
      console.error('Error connecting Google Calendar:', err);
      let errMsg = err.message || 'Error occurred during Google Calendar authentication.';
      if (err.code === 'auth/popup-blocked') {
        errMsg = 'Google authorization popup was blocked. Please enable popups or open this workspace in a new tab first!';
      }
      setCalendarSyncError(errMsg);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    const confirmed = window.confirm('Are you sure you want to decouple Google Calendar sync? Live events won\'t be pushed to Google Calendar.');
    if (!confirmed) return;
    
    setGoogleAccessToken(null);
    setCalendarSyncSuccess(null);
    setCalendarSyncError(null);
    
    let updatedUserObj: StaffMember | null = null;
    setActiveUser((current) => {
      if (!current) return null;
      updatedUserObj = {
        ...current,
        googleCalendarConnected: false
      };
      return updatedUserObj;
    });
    
    if (isCloudSynced && firebaseUser) {
      setTimeout(async () => {
        if (updatedUserObj) {
          await setDoc(doc(db, 'staffMembers', firebaseUser.uid), updatedUserObj, { merge: true });
        }
      }, 100);
    }
    
    setCalendarSyncSuccess('Decoupled Google Calendar connection.');
    handleAudit('API Integration Change', `Google Calendar API status on ${activeUser?.name || 'Active User'} decoupled.`);
  };

  const handleSyncMeetingToGoogleCalendar = async (meeting: Meeting) => {
    if (!googleAccessToken) {
      setCalendarSyncError('Google Calendar account is connected, but your current session token has expired. Please re-connect Google Calendar in the Settings/API tab to authenticate.');
      return;
    }
    
    try {
      setCalendarSyncError(null);
      setCalendarSyncSuccess('Contacting Google Calendar API...');
      
      const onConfirmDialog = async (msg: string) => {
        return window.confirm(msg);
      };
      
      const newGoogleEventId = await syncEventToGoogleCalendar(googleAccessToken, meeting, onConfirmDialog);
      
      // Update meeting in state & db
      const updatedMeeting = { ...meeting, googleEventId: newGoogleEventId };
      
      if (isCloudSynced && firebaseUser) {
        await setDoc(doc(db, 'meetings', meeting.id), updatedMeeting, { merge: true });
      } else {
        setMeetings(prev => prev.map(m => m.id === meeting.id ? updatedMeeting : m));
      }
      
      setCalendarSyncSuccess(`"${meeting.title}" successfully synced with Google Calendar!`);
      handleAudit('Google Calendar Synced', `"${meeting.title}" pushed successfully. Event ID: ${newGoogleEventId}`);
    } catch (err: any) {
      console.error('Google Calendar Sync Error:', err);
      if (!err.message?.includes('cancelled')) {
        setCalendarSyncError(err.message || 'Failed to sync meeting to Google Calendar.');
      } else {
        setCalendarSyncSuccess('Sync cancelled by user. No calendar changes were made.');
      }
    }
  };

  const handleAddMeeting = async (meetingInput: Omit<Meeting, 'id'>) => {
    const newMeeting: Meeting = {
      ...meetingInput,
      id: `meet-${Date.now()}`,
    };

    // Always update local state immediately for instant feedback and backup caching
    setMeetings((prev) => [newMeeting, ...prev]);

    if (isCloudSynced && firebaseUser) {
      try {
        await setDoc(doc(db, 'meetings', newMeeting.id), newMeeting);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `meetings/${newMeeting.id}`);
      }
    }

    // Auto sync to Google Calendar if checked and authenticated
    if (newMeeting.googleSync && googleAccessToken) {
      setTimeout(() => {
        handleSyncMeetingToGoogleCalendar(newMeeting);
      }, 500);
    }
  };

  const handleUpdateMeeting = async (updatedMeeting: Meeting) => {
    // Always update local state immediately for instant feedback and backup caching
    setMeetings((prev) => prev.map((m) => (m.id === updatedMeeting.id ? updatedMeeting : m)));

    if (isCloudSynced && firebaseUser) {
      try {
        await setDoc(doc(db, 'meetings', updatedMeeting.id), updatedMeeting);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `meetings/${updatedMeeting.id}`);
      }
    }
  };

  const handleAddGoal = async (goalInput: Omit<Goal, 'id' | 'startDate' | 'endDate' | 'status'>) => {
    const newGoal: Goal = {
      ...goalInput,
      id: `goal-${Date.now()}`,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0], // 30 days window
      status: 'on_track'
    } as any;

    // Always update local state immediately for instant feedback and backup caching
    setGoals((prev) => [newGoal, ...prev]);

    if (isCloudSynced && firebaseUser) {
      try {
        await setDoc(doc(db, 'goals', newGoal.id), newGoal);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `goals/${newGoal.id}`);
      }
    }
  };

  const handleUpdateGoalProgress = async (goalId: string, value: number) => {
    const updateProgressLocally = (prev: Goal[]) =>
      prev.map((g: any) => {
        if (g.id === goalId) {
          const isCompletedNow = value >= (g.targetValue !== undefined ? g.targetValue : 100);
          return {
            ...g,
            currentValue: value,
            progress: g.targetValue !== undefined ? Math.min(100, Math.round((value / g.targetValue) * 100)) : value,
            status: isCompletedNow ? 'completed' : 'on_track'
          };
        }
        return g;
      });

    // Always update local state immediately for instant feedback and backup caching
    setGoals((prev) => updateProgressLocally(prev));

    if (isCloudSynced && firebaseUser) {
      try {
        const matched = goals.find(g => g.id === goalId);
        if (matched) {
          const updated = updateProgressLocally([matched])[0];
          await setDoc(doc(db, 'goals', goalId), updated);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `goals/${goalId}`);
      }
    }
  };

  const handleAddReminder = async (reminderInput: Omit<Reminder, 'id'>) => {
    const newReminder: Reminder = {
      ...reminderInput,
      id: `rem-${Date.now()}`,
    };

    // Always update local state immediately for instant feedback and backup caching
    setReminders((prev) => [newReminder, ...prev]);

    if (isCloudSynced && firebaseUser) {
      try {
        await setDoc(doc(db, 'reminders', newReminder.id), newReminder);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `reminders/${newReminder.id}`);
      }
    }
  };

  const handleToggleReminder = async (reminderId: string) => {
    const getUpdatedReminders = (prev: Reminder[]) =>
      prev.map((r) => (r.id === reminderId ? { ...r, isCompleted: !r.isCompleted } : r));

    // Always update local state immediately for instant feedback and backup caching
    setReminders((prev) => getUpdatedReminders(prev));

    if (isCloudSynced && firebaseUser) {
      try {
        const matched = reminders.find(r => r.id === reminderId);
        if (matched) {
          const updated = { ...matched, isCompleted: !matched.isCompleted };
          await setDoc(doc(db, 'reminders', reminderId), updated);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `reminders/${reminderId}`);
      }
    }
  };

  const handleClearCompletedReminders = async () => {
    // Always update local state immediately for instant feedback and backup caching
    setReminders((prev) => prev.filter((r) => !r.isCompleted));

    if (isCloudSynced && firebaseUser) {
      try {
        const completed = reminders.filter(r => r.isCompleted);
        const promises = completed.map(r => deleteDoc(doc(db, 'reminders', r.id)));
        await Promise.all(promises);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'reminders/multiple');
      }
    }
  };

  const handleAddMember = async (memberInput: Omit<StaffMember, 'id'>) => {
    const newMember: StaffMember = {
      ...memberInput,
      id: `staff-${Date.now()}`,
    };

    // Always update local state immediately for instant feedback and backup caching
    setStaffMembers((prev) => [...prev, newMember]);

    if (isCloudSynced && firebaseUser) {
      try {
        await setDoc(doc(db, 'staffMembers', newMember.id), newMember);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `staffMembers/${newMember.id}`);
      }
    }
  };

  const handleResetWorkspace = async () => {
    if (confirm('Are you sure you want to restore default template settings? Current entries will be lost.')) {
      if (isCloudSynced && firebaseUser) {
        try {
          const batch = writeBatch(db);
          const staffSnap = await getDocs(collection(db, 'staffMembers'));
          staffSnap.docs.forEach(d => batch.delete(d.ref));
          
          // Clean up tasks in chunks to satisfy strict multi-tenant list query rules
          const tasksDeleted = new Set<string>();
          const publicTasksSnap = await getDocs(query(collection(db, 'tasks'), where('isPrivate', '==', false)));
          publicTasksSnap.docs.forEach(d => {
            batch.delete(d.ref);
            tasksDeleted.add(d.id);
          });
          const privateTasksSnap = await getDocs(query(collection(db, 'tasks'), where('isPrivate', '==', true)));
          privateTasksSnap.docs.forEach(d => {
            if (!tasksDeleted.has(d.id)) {
              batch.delete(d.ref);
            }
          });

          const meetingsSnap = await getDocs(collection(db, 'meetings'));
          meetingsSnap.docs.forEach(d => batch.delete(d.ref));

          const goalsSnap = await getDocs(collection(db, 'goals'));
          goalsSnap.docs.forEach(d => batch.delete(d.ref));

          const remindersSnap = await getDocs(collection(db, 'reminders'));
          remindersSnap.docs.forEach(d => batch.delete(d.ref));

          const logsSnap = await getDocs(collection(db, 'auditLogs'));
          logsSnap.docs.forEach(d => batch.delete(d.ref));

          DEFAULT_STAFF.forEach(item => batch.set(doc(db, 'staffMembers', item.id), item));
          DEFAULT_TASKS.forEach(item => batch.set(doc(db, 'tasks', item.id), item));
          DEFAULT_MEETINGS.forEach(item => batch.set(doc(db, 'meetings', item.id), item));
          DEFAULT_GOALS.forEach(item => batch.set(doc(db, 'goals', item.id), item));
          DEFAULT_REMINDERS.forEach(item => batch.set(doc(db, 'reminders', item.id), item));
          DEFAULT_AUDIT_LOGS.forEach(item => batch.set(doc(db, 'auditLogs', item.id), item));

          await batch.commit();
          setActiveUser(DEFAULT_STAFF[0]);
          setActiveTab('reports');
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'resetSandbox');
        }
      } else {
        localStorage.clear();
        setStaffMembers(DEFAULT_STAFF);
        setTasks(DEFAULT_TASKS);
        setMeetings(DEFAULT_MEETINGS);
        setGoals(DEFAULT_GOALS);
        setReminders(DEFAULT_REMINDERS);
        setAuditLogs(DEFAULT_AUDIT_LOGS);
        setActiveUser(DEFAULT_STAFF[0]);
        setActiveTab('reports');
      }
    }
  };

  // Walkthrough Checklist State tracking (Reactive + Clickable overrides)
  const [manualWalkthroughStatus, setManualWalkthroughStatus] = useState<Record<number, boolean>>({});

  const isRoleSwapped = activeUser && (activeUser.id !== 'staff-1');
  const hasCreatedTask = tasks.length > DEFAULT_TASKS.length;
  const hasNotesRun = meetings.some(m => !!m.zoomAiSummary);
  const hasGoalAdjusted = goals.some((g: any) => g.currentValue !== undefined && g.currentValue > 0);
  const hasReminderEntered = reminders.length > DEFAULT_REMINDERS.length;
  const hasSyncDone = activeUser && (activeUser.googleCalendarConnected || activeUser.zoomConnected);

  const walkthroughProgress = [
    { label: 'Switch roles to view Managers/Admin panels', checked: isRoleSwapped || !!manualWalkthroughStatus[0], tab: 'members' as const },
    { label: 'Issue a task directive with custom recurrence', checked: hasCreatedTask || !!manualWalkthroughStatus[1], tab: 'tasks' as const },
    { label: 'Review past Zoom voice memo AI summary', checked: hasNotesRun || !!manualWalkthroughStatus[2], tab: 'meetings' as const },
    { label: 'Adjust goalStrategic progress value', checked: hasGoalAdjusted || !!manualWalkthroughStatus[3], tab: 'goals' as const },
    { label: 'Schedule quick reminder alert', checked: hasReminderEntered || !!manualWalkthroughStatus[4], tab: 'reminders' as const },
    { label: 'Sync external integrations in Settings', checked: hasSyncDone || !!manualWalkthroughStatus[5], tab: 'settings' as const }
  ];

  const handleToggleWalkthrough = (index: number) => {
    const isCurrentlyChecked = walkthroughProgress[index].checked;
    setManualWalkthroughStatus(prev => ({
      ...prev,
      [index]: !isCurrentlyChecked
    }));
    handleAudit('Walkthrough Audit', `${!isCurrentlyChecked ? 'Completed' : 'Reset'} walkthrough checkpoint: "${walkthroughProgress[index].label}"`);
  };

  const walkthroughScore = walkthroughProgress.filter(p => p.checked).length;
  const walkthroughPercent = Math.round((walkthroughScore / walkthroughProgress.length) * 100);

  const uncheckedAlertsCount = reminders.filter((r) => !r.isCompleted).length;

  // Helper to determine display name for the logged-in/simulated user
  const getDisplayName = () => {
    if (firebaseUser) {
      if (activeUser && activeUser.id === firebaseUser.uid) {
        return activeUser.name;
      }
      if (firebaseUser.displayName) {
        return firebaseUser.displayName;
      }
      if (firebaseUser.email) {
        const prefix = firebaseUser.email.split('@')[0];
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
      return 'Authorized User';
    }
    return activeUser?.name || 'Guest User';
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const cleanName = name.replace(/[^\w\s-]/g, '').trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (!activeUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center dark:bg-slate-950">
        <div className="text-center space-y-6">
          <div className="animate-pulse">
            <ValueFlowLogo size="lg" variant="color" />
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-550 dark:text-silver font-medium">
            <Clock className="h-4.5 w-4.5 text-indigo-505 animate-spin" />
            <span className="text-xs uppercase tracking-wider font-semibold">Assembling ValueFlow Workspace environment...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans select-none antialiased text-slate-800 dark:text-slate-200 transition-colors duration-150 ${themeMode === 'dark' ? 'bg-[#0b0f19]' : 'bg-[#f8fafc]'}`}>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setIsCloudSynced(true)}
      />
      
      {/* GLOBAL HUD HEADER */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-40 dark:bg-slate-900/90 dark:border-slate-800/80">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Clickable Workspace Image Placeholder */}
            <button
              onClick={() => setShowWorkspaceLogoModal(true)}
              title="Click to customize top-left workspace logo image"
              className="group/logo relative cursor-pointer outline-none transition-transform active:scale-95 text-left shrink-0"
              id="workspace-logo-btn"
            >
              <div className="h-11 w-11 rounded-[14px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 flex items-center justify-center overflow-hidden shadow-inner group-hover/logo:border-indigo-400 dark:group-hover/logo:border-indigo-500 transition-all">
                {workspaceLogo ? (
                  <img src={workspaceLogo} alt="Workspace Logo" className="h-full w-full object-cover rounded-[10px]" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full rounded-[10px] bg-gradient-to-br from-indigo-50 to-indigo-100/45 dark:from-indigo-950/40 dark:to-indigo-900/15 flex items-center justify-center border border-indigo-100/50 dark:border-indigo-900/30">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tighter">VFT</span>
                  </div>
                )}
                {/* Micro-interactive hover overlay */}
                <div className="absolute inset-x-0 bottom-x bg-slate-950/70 py-0.5 text-center text-[7px] font-black text-white uppercase tracking-wider opacity-0 group-hover/logo:opacity-100 transition-opacity rounded-b-[14px]">
                  EDIT
                </div>
              </div>
            </button>

            <ValueFlowLogo size="sm" variant={themeMode === 'dark' ? 'dark' : 'color'} />
            <span className="text-[10px] font-black bg-indigo-50 border border-indigo-120 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-850 px-2.5 py-1 rounded-full uppercase tracking-wider relative bottom-0.5">
              {currentDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {currentDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">System Live • Team Accountability Hub</p>
          </div>
        </div>

        {/* Dynamic simulator identity pill & controls */}
        <div className="flex items-center gap-6 flex-wrap">
          {/* Always display the name of the user as the identity */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Identity:</span>
            <div className="flex items-center gap-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl px-3 py-1.5 text-xs font-black shadow-sm animate-fade-in shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse mr-1" />
              <span className="text-indigo-600 dark:text-indigo-300 font-extrabold">{getDisplayName()}</span>
              <span className="text-[9px] text-indigo-400 dark:text-indigo-500 font-black tracking-wide uppercase ml-0.5">
                ({(activeUser?.roleType || 'staff').toUpperCase()})
              </span>
            </div>
            {isCloudSynced && firebaseUser && (
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1.5 rounded-lg border border-emerald-100/60 dark:border-emerald-900/40 shrink-0">
                🔑 {firebaseUser.isAnonymous ? 'Sandbox Guest' : 'Connected'}
              </span>
            )}
          </div>

          {/* Authentic Core Auth Interface */}
          {isCloudSynced && firebaseUser ? (
            <div className="relative group/auth select-none shrink-0">
              <button
                type="button"
                className="flex items-center gap-2.5 border border-slate-200 dark:border-slate-800 rounded-full pl-2 pr-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 cursor-pointer shadow-sm transition-all text-left"
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10.5px] font-black tracking-tight shrink-0 border border-white/20 shadow-inner relative"
                  style={{ backgroundColor: activeUser?.avatarColor || '#6366f1' }}
                >
                  {getInitials(getDisplayName())}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10.5px] font-black text-slate-850 dark:text-white leading-tight uppercase tracking-tight">
                    {getDisplayName()}
                  </p>
                  <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">
                    {activeUser?.role || 'Contributor'}
                  </p>
                </div>
              </button>
              
              {/* Dropdown Menu on relative hover with seamless bridge wrapper */}
              <div className="absolute right-0 top-full pt-2 w-60 opacity-0 pointer-events-none group-hover/auth:opacity-100 group-hover/auth:pointer-events-auto z-50 transform scale-95 origin-top-right group-hover/auth:scale-100 transition-all duration-200">
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-[1.25rem] p-3 shadow-2xl space-y-2.5">
                  <div className="px-1.5 py-1 border-b border-slate-100 dark:border-slate-800 select-none pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8.5px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 rounded-md">
                        ACTIVE SECURE SESSION
                      </span>
                    </div>
                    <p className="text-[11px] font-black text-slate-800 dark:text-white leading-normal mt-1.5 break-all">
                      {firebaseUser.email || 'Sandbox Guest Account'}
                    </p>
                    <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">
                      Authenticated via Cloud Credentials
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleDisconnectFirebase}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-xl text-left font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer border border-transparent hover:border-rose-100/50 dark:hover:border-rose-900/40"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out / Disconnect
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnectFirebase}
              className="flex items-center gap-1.5 h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-500/15 group shrink-0"
            >
              <User className="h-3.5 w-3.5 stroke-[2.5]" />
              Log In
            </button>
          )}

          {/* Theme switcher */}
          <button
            onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
            title="Toggle theme mode"
          >
            {themeMode === 'light' ? <Moon className="h-4 w-4 text-indigo-600" /> : <Sun className="h-4 w-4 text-amber-400" />}
          </button>

          <button
            onClick={handleResetWorkspace}
            className="text-[10px] font-black text-slate-400 hover:text-rose-600 tracking-wider uppercase border border-slate-200 dark:border-slate-800 hover:border-rose-200 bg-white hover:bg-rose-50 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all h-10 flex items-center dark:bg-slate-900"
          >
            Reset
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col lg:flex-row gap-6 items-start">
        
        {/* CONTROL CENTER SIDEBAR (LEFT) */}
        <aside className="w-full lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-24 space-y-6">
          <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] space-y-3 dark:bg-slate-900 dark:border-slate-800/80">
            <h3 className="hidden lg:block text-[10.5px] uppercase font-black text-slate-400 px-3 pb-2 border-b border-slate-100 dark:border-slate-800 tracking-wider">
              Control Center
            </h3>            <div className="relative flex items-center w-full gap-2 lg:block">
              <button
                type="button"
                onClick={() => scrollNav('left')}
                className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex-shrink-0"
                aria-label="Scroll left"
                title="Scroll Left"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
              </button>

              <div
                ref={navScrollRef}
                className="flex-1 flex flex-row overflow-x-auto lg:overflow-x-visible lg:flex-col gap-2 pb-1 lg:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x whitespace-nowrap lg:whitespace-normal"
              >
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-4.5 py-3 lg:w-full lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl text-[10.5px] lg:text-[11.5px] font-black uppercase tracking-wider transition-all cursor-pointer snap-start ${
                    activeTab === 'reports'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10'
                      : 'text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white lg:bg-transparent border border-slate-200 lg:border-transparent dark:bg-slate-900'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Reports
                </button>

                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-4.5 py-3 lg:w-full lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl text-[10.5px] lg:text-[11.5px] font-black uppercase tracking-wider transition-all cursor-pointer snap-start ${
                    activeTab === 'tasks'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10'
                      : 'text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white lg:bg-transparent border border-slate-200 lg:border-transparent dark:bg-slate-900'
                  }`}
                >
                  <CheckSquare className="h-4 w-4" />
                  Directives
                </button>

                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-4.5 py-3 lg:w-full lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl text-[10.5px] lg:text-[11.5px] font-black uppercase tracking-wider transition-all cursor-pointer snap-start ${
                    activeTab === 'calendar'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10'
                      : 'text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white lg:bg-transparent border border-slate-200 lg:border-transparent dark:bg-slate-900'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  Calendar
                </button>

                <button
                  onClick={() => setActiveTab('meetings')}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-4.5 py-3 lg:w-full lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl text-[10.5px] lg:text-[11.5px] font-black uppercase tracking-wider transition-all cursor-pointer snap-start ${
                    activeTab === 'meetings'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10'
                      : 'text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white lg:bg-transparent border border-slate-200 lg:border-transparent dark:bg-slate-900'
                  }`}
                >
                  <Video className="h-4 w-4" />
                  Meetings
                </button>

                <button
                  onClick={() => setActiveTab('goals')}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-4.5 py-3 lg:w-full lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl text-[10.5px] lg:text-[11.5px] font-black uppercase tracking-wider transition-all cursor-pointer snap-start ${
                    activeTab === 'goals'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10'
                      : 'text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white lg:bg-transparent border border-slate-200 lg:border-transparent dark:bg-slate-900'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  Milestones
                </button>

                <button
                  onClick={() => setActiveTab('reminders')}
                  className={`relative flex-shrink-0 flex items-center justify-between gap-2.5 px-4.5 py-3 lg:w-full lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl text-[10.5px] lg:text-[11.5px] font-black uppercase tracking-wider transition-all cursor-pointer snap-start ${
                    activeTab === 'reminders'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10'
                      : 'text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white lg:bg-transparent border border-slate-200 lg:border-transparent dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Bell className="h-4 w-4" />
                      {uncheckedAlertsCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                      )}
                    </div>
                    <span>Alerts</span>
                  </div>
                  {uncheckedAlertsCount > 0 && (
                    <span className="bg-rose-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full leading-none shrink-0 min-w-[14px] text-center shadow-sm animate-pulse-subtle">
                      {uncheckedAlertsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-4.5 py-3 lg:w-full lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl text-[10.5px] lg:text-[11.5px] font-black uppercase tracking-wider transition-all cursor-pointer snap-start ${
                    activeTab === 'settings'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10'
                      : 'text-slate-705 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white lg:bg-transparent border border-slate-200 lg:border-transparent dark:bg-slate-900'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>

                <button
                  onClick={() => setActiveTab('members')}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-4.5 py-3 lg:w-full lg:px-4 lg:py-3 rounded-xl lg:rounded-2xl text-[10.5px] lg:text-[11.5px] font-black uppercase tracking-wider transition-all cursor-pointer snap-start ${
                    activeTab === 'members'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10'
                      : 'text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white lg:bg-transparent border border-slate-200 lg:border-transparent dark:bg-slate-900'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Simulator
                </button>
              </div>

              <button
                type="button"
                onClick={() => scrollNav('right')}
                className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex-shrink-0"
                aria-label="Scroll right"
                title="Scroll Right"
              >
                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* ACTIVE ACCOUNTABILITY FEED LOGS */}
          <div className="hidden lg:block bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl space-y-4">
            <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              Accountability Feed
            </h4>
            
            <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">No events recorded.</p>
              ) : (
                auditLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="text-[11px] border-l-2 border-indigo-505 pl-3 leading-relaxed">
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>{log.actorName}</span>
                      <span className="text-[9px] font-semibold text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-slate-400 block mt-0.5 font-semibold text-[10.5px] leading-tight">{log.details}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          
          {/* Dynamic Welcome Greeting Banner */}
          {greetingMessage && (
            <div id="welcome-greeting-banner" className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white p-6 rounded-[2rem] shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 border-2 border-indigo-500">
              <div className="flex items-center gap-4 relative z-10">
                <div className="h-12 w-12 bg-indigo-900 rounded-2xl flex items-center justify-center border border-indigo-400 shrink-0">
                  <Sparkles className="h-6 w-6 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h2 id="welcome-message-title" className="text-xl md:text-2xl font-black tracking-tight">{greetingMessage}</h2>
                  <p className="text-indigo-100 text-xs font-semibold mt-0.5 opacity-100">
                    You are currently signed in. Your productivity metrics and milestones are active and fully operational.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10 self-stretch sm:self-auto justify-end">
                <div className="bg-emerald-600 text-white border border-emerald-500 transition-all rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider">
                  ⚡ LIVE WORKSPACE
                </div>
              </div>
            </div>
          )}
          
          {/* INTERACTIVE WALKTHROUGH CHECKLIST FOR SANDBOX AUDIT */}
          {(activeTab === 'reports' || activeTab === 'settings') && (
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-7 rounded-[2.2rem] border border-indigo-850 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-800/40 pb-3.5">
                <div className="space-y-1">
                  <span className="text-[9.5px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-900/60 px-2.5 py-1 rounded inline-block">
                    Interactive Workspace Sandbox Walkthrough
                  </span>
                  <h3 className="text-base font-black text-white flex items-center gap-1.5 mt-2">
                    <ClipboardList className="h-5 w-5 text-indigo-400" />
                    Simulated Day 1 Setup & Audit Guide
                  </h3>
                </div>
                
                <div className="flex items-center gap-2 bg-indigo-900/60 border border-indigo-800 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-bold whitespace-nowrap">{walkthroughPercent}% Sync</span>
                </div>
              </div>

              {/* Checklist list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {walkthroughProgress.map((item, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between gap-2 text-xs text-indigo-100 font-semibold bg-indigo-900/10 hover:bg-indigo-900/20 p-2.5 rounded-xl border border-indigo-800/20 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleWalkthrough(index)}
                        className={`h-5.5 w-5.5 rounded-md border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                          item.checked 
                            ? 'bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600 hover:border-indigo-600' 
                            : 'border-indigo-700 bg-indigo-950/30 hover:border-indigo-600/50'
                        }`}
                        title="Toggle Checkpoint Mode"
                        aria-label={`Toggle checkpoint: ${item.label}`}
                      >
                        {item.checked && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (item.tab) {
                            setActiveTab(item.tab as any);
                            handleAudit('Navigation', `Guided to ${item.tab} panel from walkthrough helper`);
                          }
                        }}
                        className={`text-left text-xs text-indigo-100 group-hover:text-white transition-all font-semibold truncate hover:underline cursor-pointer ${
                          item.checked ? 'line-through text-indigo-305 font-medium' : ''
                        }`}
                        title={`Go to ${item.tab} tab`}
                      >
                        {item.label}
                      </button>
                    </div>
                    {item.tab && (
                      <span className="text-[8.5px] uppercase tracking-wider text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-800/30 opacity-60 group-hover:opacity-100 transition-all ml-1 shrink-0">
                        Go
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {walkthroughScore === walkthroughProgress.length && (
                <div className="bg-emerald-500 text-white p-3.5 rounded-2xl border border-emerald-400 shadow-md text-xs font-black uppercase text-center animate-bounce flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 animate-spin text-amber-300" /> All sandbox checkpoints cleared! Ready for live deployment audits.
                </div>
              )}
            </div>
          )}

          {/* TAB RENDER SWITCHER */}
          {activeTab === 'reports' && (
            <TabReports
              tasks={tasks}
              meetings={meetings}
              goals={goals}
              staffMembers={staffMembers}
              activeUser={activeUser}
              onAudit={handleAudit}
            />
          )}

          {activeTab === 'tasks' && (
            <TabTasks
              tasks={tasks}
              staffMembers={staffMembers}
              activeUser={activeUser}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAudit={handleAudit}
              goals={goals}
              meetings={meetings}
            />
          )}

          {activeTab === 'calendar' && (
            <TabCalendar
              meetings={meetings}
              tasks={tasks}
              goals={goals}
              activeUser={activeUser}
              onSyncMeetingToGoogleCalendar={handleSyncMeetingToGoogleCalendar}
              calendarSyncError={calendarSyncError}
              calendarSyncSuccess={calendarSyncSuccess}
            />
          )}

          {activeTab === 'meetings' && (
            <TabMeetings
              meetings={meetings}
              staffMembers={staffMembers}
              activeUser={activeUser}
              onAddMeeting={handleAddMeeting}
              onUpdateMeeting={handleUpdateMeeting}
              onAddTask={handleAddTask}
              onAudit={handleAudit}
            />
          )}

          {activeTab === 'goals' && (
            <TabGoals
              goals={goals}
              staffMembers={staffMembers}
              activeUser={activeUser}
              onAddGoal={handleAddGoal}
              onUpdateGoalProgress={handleUpdateGoalProgress}
              onAudit={handleAudit}
            />
          )}

          {activeTab === 'reminders' && (
            <TabReminders
              reminders={reminders}
              activeUser={activeUser}
              onAddReminder={handleAddReminder}
              onToggleReminder={handleToggleReminder}
              onClearCompletedReminders={handleClearCompletedReminders}
              onAudit={handleAudit}
            />
          )}

          {activeTab === 'settings' && renderSettingsTab()}

          {activeTab === 'members' && (
            <TabMembers
              staffMembers={staffMembers}
              tasks={tasks}
              activeUser={activeUser}
              onSetActiveUser={setActiveUser}
              onAddMember={handleAddMember}
              onAudit={handleAudit}
              isCloudSynced={isCloudSynced}
            />
          )}
        </main>
      </div>

      {/* WORKSPACE LOGO/IMAGE PLACEHOLDER CUSTOMIZATION MODAL */}
      {showWorkspaceLogoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in" id="workspace-logo-modal-overlay">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] max-w-lg w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200" id="workspace-logo-modal">
            <div className="h-2 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />
            
            <div className="p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/40 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-sans">
                    Workspace Branding
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold leading-relaxed">
                    Personalize the image placeholder on the top-left of your VFT Workspace dashboard header.
                  </p>
                </div>
              </div>

              {/* Present state preview */}
              <div className="mt-6 flex items-center gap-4 bg-slate-50 dark:bg-slate-950/55 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                  {workspaceLogo ? (
                    <img src={workspaceLogo} alt="Preview Logo" className="h-full w-full object-cover rounded-[12px]" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full rounded-[12px] bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
                      <span className="text-xs font-black text-indigo-500 font-mono">VFT</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Logo Image Preview</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                    {workspaceLogo ? 'Custom brand image is configured' : 'Using default VFT letters text fallback'}
                  </p>
                  {workspaceLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspaceLogo('');
                        localStorage.removeItem('vft_workspace_logo');
                      }}
                      className="text-[10px] text-rose-500 hover:text-rose-600 font-bold underline mt-1 block cursor-pointer"
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              </div>

              {/* Selection options wrapper */}
              <div className="mt-6 space-y-5">
                {/* 1. File Uploader */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Option A: Upload Image File</label>
                  <div className="relative border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-505 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/20">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1.5 * 1024 * 1024) {
                            alert('Image size is too large for local caching. Please select an image under 1.5MB.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result && typeof event.target.result === 'string') {
                              setWorkspaceLogo(event.target.result);
                              localStorage.setItem('vft_workspace_logo', event.target.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-left"
                    />
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Click to upload brand logo</p>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider text-center">Supports JPEG, PNG, SVG (Max 1.5MB)</p>
                    </div>
                  </div>
                </div>

                {/* 2. Direct Web URL */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Option B: Set Custom Image Web URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png"
                      id="custom-logo-url-input"
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-505 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const inputEl = document.getElementById('custom-logo-url-input') as HTMLInputElement;
                        if (inputEl && inputEl.value.trim()) {
                          const url = inputEl.value.trim();
                          setWorkspaceLogo(url);
                          localStorage.setItem('vft_workspace_logo', url);
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* 3. Preset choices */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Option C: Choose Premium Curated Presets</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {
                        name: 'Velocity',
                        color: 'bg-gradient-to-br from-indigo-500 to-pink-500',
                        value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%236366f1"/><stop offset="100%" stop-color="%23ec4899"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g1)"/><circle cx="50" cy="50" r="25" fill="none" stroke="white" stroke-width="8"/><rect x="40" y="40" width="20" height="20" fill="white" transform="rotate(45 50 50)"/></svg>'
                      },
                      {
                        name: 'Cyber',
                        color: 'bg-gradient-to-br from-cyan-500 to-blue-600',
                        value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2306b6d4"/><stop offset="100%" stop-color="%233b82f6"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g2)"/><rect x="30" y="30" width="40" height="40" rx="8" fill="white" fill-opacity="0.25"/><circle cx="50" cy="50" r="12" fill="white"/></svg>'
                      },
                      {
                        name: 'Solstice',
                        color: 'bg-gradient-to-br from-rose-500 to-amber-500',
                        value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f43f5e"/><stop offset="100%" stop-color="%23eab308"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g3)"/><circle cx="50" cy="50" r="20" fill="white"/></svg>'
                      },
                      {
                        name: 'Zenith',
                        color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
                        value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%230d9488"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g4)"/><polygon points="50,25 75,68 25,68" fill="white"/></svg>'
                      }
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => {
                          setWorkspaceLogo(preset.value);
                          localStorage.setItem('vft_workspace_logo', preset.value);
                        }}
                        className="group/p flex flex-col items-center gap-1 cursor-pointer outline-none"
                      >
                        <div className={`h-11 w-11 rounded-[12px] ${preset.color} border border-white/20 group-hover/p:scale-105 active:scale-95 transition-all shadow-sm flex items-center justify-center`} />
                        <span className="text-[9px] font-black text-slate-450 uppercase tracking-tight">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer controls */}
              <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-850 pt-5">
                <button
                  type="button"
                  onClick={() => setShowWorkspaceLogoModal(false)}
                  className="bg-indigo-605 hover:bg-indigo-500 text-white rounded-xl px-6 py-3 text-xs font-bold shadow-lg shadow-indigo-600/10 transition-all cursor-pointer bg-indigo-600"
                >
                  Save & Secure Layout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // SETTINGS SUBVIEW COMPONENT
  function renderSettingsTab() {
    return (
      <div className="space-y-6">
        {/* SETTINGS CARD MAIN */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 uppercase">
              <Settings className="h-5 w-5 text-indigo-500 animate-spin duration-5000" />
              Workspace Settings & Integrations
            </h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-semibold leading-relaxed">
              Configure simulated profile keys, authorize external standup APIs, and manage escalation simulators.
            </p>
          </div>
        </div>

        {/* ACTIVE USER PROFILE MANAGEMENT */}
        {activeUser && (
          <div className="bg-white p-8 rounded-[2.2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:border-slate-800 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-ping" />
                My Active Profile Setup
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                Your name and role are displayed across all tasks, reports, standup records, and logs. Changes are synchronized in real-time.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={activeUser.name || ''}
                    onChange={(e) => {
                      setActiveUser({
                        ...activeUser,
                        name: e.target.value
                      });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 placeholder-slate-400"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Job Title / Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={activeUser.role || ''}
                    onChange={(e) => {
                      setActiveUser({
                        ...activeUser,
                        role: e.target.value
                      });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 placeholder-slate-400"
                    placeholder="e.g. Senior Developer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Avatar Accent Color</label>
                <div className="flex items-center gap-2 h-10">
                  {['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899', '#475569', '#6366f1'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setActiveUser({
                          ...activeUser,
                          avatarColor: color
                        });
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                        activeUser.avatarColor === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* GOOGLE CALENDAR & ZOOM SIM CONNECTORS */}
          <div className="bg-white p-8 rounded-[2.2rem] border border-slate-105 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 dark:border-slate-800">API Sync Authorizations</h3>
            
            {calendarSyncSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-955/35 text-emerald-850 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 p-3.5 rounded-2xl text-[11px] font-bold">
                🎉 {calendarSyncSuccess}
              </div>
            )}
            {calendarSyncError && (
              <div className="bg-rose-50 dark:bg-rose-955/35 text-rose-850 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 p-3.5 rounded-2xl text-[11px] font-bold">
                ⚠️ {calendarSyncError}
              </div>
            )}

            <div className="space-y-4">
              {/* Google Cal */}
              <div className="p-4 rounded-2xl border border-slate-150 bg-slate-50 dark:bg-slate-850 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Globe2 className="h-4 w-4 text-indigo-500" /> Google Calendar API
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Toggles unified workspace agenda logs indicators.</p>
                </div>
                
                <button
                  onClick={activeUser.googleCalendarConnected ? handleDisconnectGoogleCalendar : handleConnectGoogleCalendar}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                    activeUser.googleCalendarConnected
                      ? 'bg-green-105 border-green-200 text-green-700 hover:bg-green-200'
                      : 'bg-indigo-600 border-indigo-650 text-white hover:bg-indigo-550'
                  }`}
                >
                  {activeUser.googleCalendarConnected ? '✔️ Connected' : 'Connect Google Cal'}
                </button>
              </div>

              {/* Zoom Connect */}
              <div className="p-4 rounded-2xl border border-slate-150 bg-slate-50 dark:bg-slate-850 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Video className="h-4 w-4 text-indigo-500" /> Zoom Sprints Video API
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Enables live link conferencing triggers on meetings.</p>
                </div>

                <button
                  onClick={() => {
                    const isConnected = !activeUser.zoomConnected;
                    setActiveUser({
                      ...activeUser,
                      zoomConnected: isConnected
                    });
                    handleAudit('API Integration Change', `Zoom Video API status on ${activeUser.name} toggled to ${isConnected ? 'Connected' : 'Disconnected'}`);
                  }}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                    activeUser.zoomConnected
                      ? 'bg-blue-105 border-blue-200 text-blue-700'
                      : 'bg-white text-slate-605 border-slate-205 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700'
                  }`}
                >
                  {activeUser.zoomConnected ? '✔️ Connected' : 'Connect api'}
                </button>
              </div>
            </div>

            {/* Sandbox Overdue escalation button trigger */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Escalation Alert Simulators</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                Manually trigger automated workspace system audits (e.g., quiet standups or tasks overdue by over 3 days).
              </p>
              
              <button
                onClick={() => {
                  const targetName = staffMembers[2]?.name || 'Elena Rostova';
                  const alertText = `[ESCALATION OVERDUE] ${targetName} has not updated "Review marketing copy drafts" task for over 3 days!`;
                  
                  const newReminder: Reminder = {
                    id: `rem-escalation-${Date.now()}`,
                    text: alertText,
                    dateTime: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0] + 'T09:00',
                    isCompleted: false,
                    category: 'escalation'
                  };

                  setReminders((prev) => [newReminder, ...prev]);
                  handleAudit('Escalation Warning Triggered', `Simulated workspace 3-day overdue escalation log successfully pushed to dashboard alerts.`);
                  alert('🔔 Reminder alert simulation injected! Check the "Alerts" tab.');
                }}
                className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-850 cursor-pointer text-center"
              >
                Inject 3-Day Overdue Warning
              </button>
            </div>
          </div>

          {/* CUSTOMIZABLE STATE NOTIFICATION BOUNDS */}
          <div className="bg-white p-8 rounded-[2.2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:border-slate-800 space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 dark:border-slate-800">Dynamic Notification Preferences</h3>

            <div className="space-y-4 font-bold text-xs text-slate-650 dark:text-slate-350">
              <label className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-905 cursor-pointer selection:bg-transparent">
                <input
                  type="checkbox"
                  checked={activeUser.notificationsPref?.dailySummary || false}
                  onChange={(e) => {
                    setActiveUser({
                      ...activeUser,
                      notificationsPref: {
                        ...activeUser.notificationsPref,
                        dailySummary: e.target.checked
                      }
                    });
                  }}
                  className="rounded text-indigo-600 h-4.5 w-4.5"
                />
                <div className="space-y-0.2 select-none">
                  <p className="text-slate-850 dark:text-slate-205">Enable Daily Email Summary Digests</p>
                  <p className="text-[10px] text-slate-400 font-medium">Delivers chronological log activities every Friday.</p>
                </div>
              </label>

              <label className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-905 cursor-pointer selection:bg-transparent">
                <input
                  type="checkbox"
                  checked={activeUser.notificationsPref?.taskReminders || false}
                  onChange={(e) => {
                    setActiveUser({
                      ...activeUser,
                      notificationsPref: {
                        ...activeUser.notificationsPref,
                        taskReminders: e.target.checked
                      }
                    });
                  }}
                  className="rounded text-indigo-600 h-4.5 w-4.5"
                />
                <div className="space-y-0.2 select-none">
                  <p className="text-slate-850 dark:text-slate-205">Enable Task Deadline Reminders Alerts</p>
                  <p className="text-[10px] text-slate-400 font-medium">Triggers pop-ups based on selected alarm settings.</p>
                </div>
              </label>

              <label className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-905 cursor-pointer selection:bg-transparent">
                <input
                  type="checkbox"
                  checked={activeUser.notificationsPref?.meetingReminders || false}
                  onChange={(e) => {
                    setActiveUser({
                      ...activeUser,
                      notificationsPref: {
                        ...activeUser.notificationsPref,
                        meetingReminders: e.target.checked
                      }
                    });
                  }}
                  className="rounded text-indigo-600 h-4.5 w-4.5"
                />
                <div className="space-y-0.2 select-none">
                  <p className="text-slate-850 dark:text-slate-205">Enable 10-Minute Sprints Pop-up Warning</p>
                  <p className="text-[10px] text-slate-400 font-medium">Highlights scheduled Zoom alignments imminent start.</p>
                </div>
              </label>

              <label className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-905 cursor-pointer selection:bg-transparent">
                <input
                  type="checkbox"
                  checked={activeUser.notificationsPref?.overdueEscalations || false}
                  onChange={(e) => {
                    setActiveUser({
                      ...activeUser,
                      notificationsPref: {
                        ...activeUser.notificationsPref,
                        overdueEscalations: e.target.checked
                      }
                    });
                  }}
                  className="rounded text-indigo-600 h-4.5 w-4.5"
                />
                <div className="space-y-0.2 select-none">
                  <p className="text-slate-850 dark:text-slate-205">Enable Overdue Escalation checks</p>
                  <p className="text-[10px] text-slate-400 font-medium">Manager warning when items sit unchecked longer than 3 days.</p>
                </div>
              </label>

              <label className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-905 cursor-pointer selection:bg-transparent">
                <input
                  type="checkbox"
                  checked={activeUser.notificationsPref?.missedUpdates || false}
                  onChange={(e) => {
                    setActiveUser({
                      ...activeUser,
                      notificationsPref: {
                        ...activeUser.notificationsPref,
                        missedUpdates: e.target.checked
                      }
                    });
                  }}
                  className="rounded text-indigo-600 h-4.5 w-4.5"
                />
                <div className="space-y-0.2 select-none">
                  <p className="text-slate-850 dark:text-slate-205">Flag Missed Standup Progress warnings</p>
                  <p className="text-[10px] text-slate-400 font-medium">Automatic system markers if staff doesn't log notes regularly.</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
