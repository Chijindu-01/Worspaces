/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StaffMember, Task, Meeting, Goal, Reminder, AuditLog } from '../types';

export const DEFAULT_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Sarah Chen',
    role: 'Senior Product Designer',
    email: 's.chen@vft.team',
    avatarColor: '#10B981', // emerald
    roleType: 'admin',
    notificationsPref: {
      dailySummary: true,
      taskReminders: true,
      meetingReminders: true,
      overdueEscalations: true,
      missedUpdates: true,
    },
    googleCalendarConnected: true,
    zoomConnected: true,
    joinedWorkspace: true,
  },
  {
    id: 'staff-2',
    name: 'Marcus Brody',
    role: 'Lead Full-Stack Architect',
    email: 'm.brody@vft.team',
    avatarColor: '#8B5CF6', // violet
    roleType: 'manager',
    notificationsPref: {
      dailySummary: true,
      taskReminders: true,
      meetingReminders: true,
      overdueEscalations: true,
      missedUpdates: true,
    },
    googleCalendarConnected: true,
    zoomConnected: true,
    joinedWorkspace: true,
  },
  {
    id: 'staff-3',
    name: 'Elena Rostova',
    role: 'Head of Growth Marketing',
    email: 'e.rostova@vft.team',
    avatarColor: '#F59E0B', // amber
    roleType: 'staff',
    notificationsPref: {
      dailySummary: false,
      taskReminders: true,
      meetingReminders: true,
      overdueEscalations: false,
      missedUpdates: true,
    },
    googleCalendarConnected: false,
    zoomConnected: false,
    joinedWorkspace: true,
  },
  {
    id: 'staff-4',
    name: 'David Kim',
    role: 'Product Operations Lead',
    email: 'd.kim@vft.team',
    avatarColor: '#EC4899', // pink
    roleType: 'staff',
    notificationsPref: {
      dailySummary: true,
      taskReminders: false,
      meetingReminders: true,
      overdueEscalations: true,
      missedUpdates: false,
    },
    googleCalendarConnected: true,
    zoomConnected: true,
    joinedWorkspace: true,
  },
];

// Helper to get formatted dates relative to today
const getRelativeDateStr = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Redesign workspace dashboard navigation',
    desc: 'Establish a modular layout for quick tab transit and clear bento reports.',
    status: 'in_progress',
    priority: 'high',
    dueDate: getRelativeDateStr(2),
    assigneeId: 'staff-1',
    category: 'work',
    createdAt: getRelativeDateStr(-2),
    comments: [
      {
        id: 'c-1',
        authorId: 'staff-2',
        authorName: 'Marcus Brody',
        authorAvatarColor: '#8B5CF6',
        text: 'Looking forward to implementing this desktop-first structure!',
        timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
      }
    ],
    reminderSettings: '1day_before',
    recurrence: 'none',
    goalId: 'goal-3',
  },
  {
    id: 'task-2',
    title: 'Deploy backend indexing improvements',
    desc: 'Improve search queries response in the employee directory by over 40%.',
    status: 'todo',
    priority: 'high',
    dueDate: getRelativeDateStr(4),
    assigneeId: 'staff-2',
    category: 'work',
    createdAt: getRelativeDateStr(-2),
    comments: [],
    reminderSettings: 'at_due',
    recurrence: 'none',
    goalId: 'goal-1',
  },
  {
    id: 'task-3',
    title: 'A/B test LinkedIn lead collection forms',
    desc: 'Analyze marketing spend on LinkedIn sponsor campaigns for executive audit.',
    status: 'completed',
    priority: 'medium',
    dueDate: getRelativeDateStr(-1),
    assigneeId: 'staff-3',
    category: 'work',
    completedAt: getRelativeDateStr(-1),
    createdAt: getRelativeDateStr(-5),
    comments: [],
    reminderSettings: 'none',
    recurrence: 'none',
    goalId: 'goal-2',
  },
  {
    id: 'task-4',
    title: 'Audit hardware logistics and provisioning',
    desc: 'Pending vendor quotes on office expansion and remote setups.',
    status: 'awaiting_review',
    priority: 'low',
    dueDate: getRelativeDateStr(1),
    assigneeId: 'staff-4',
    category: 'work',
    createdAt: getRelativeDateStr(-4),
    comments: [
      {
        id: 'c-2',
        authorId: 'staff-4',
        authorName: 'David Kim',
        authorAvatarColor: '#EC4899',
        text: 'Marcus, I added the final hardware quotes. Ready for your supervisor review.',
        timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      }
    ],
    reminderSettings: 'at_due',
    recurrence: 'none',
  },
  {
    id: 'task-5',
    title: 'Private: Personal dentist checkup',
    desc: 'Dr. Henderson Clinic, Suit 45. Standard routine cleaning.',
    status: 'completed',
    priority: 'medium',
    dueDate: getRelativeDateStr(-2),
    assigneeId: 'staff-1',
    completedAt: getRelativeDateStr(-2),
    category: 'personal',
    isPrivate: true,
    blocksCalendar: true,
    createdAt: getRelativeDateStr(-6),
    comments: [],
    recurrence: 'none',
  },
  {
    id: 'task-6',
    title: 'Review marketing copy drafts',
    desc: 'Weekly campaign text proofreads for subscription newsletter.',
    status: 'todo',
    priority: 'low',
    dueDate: getRelativeDateStr(5),
    assigneeId: 'staff-3',
    category: 'work',
    createdAt: getRelativeDateStr(-1),
    comments: [],
    recurrence: 'weekly',
    streakCounter: 3,
  }
];

export const DEFAULT_MEETINGS: Meeting[] = [
  {
    id: 'meet-1',
    title: 'Q2 Sprint Planning & Alignment Sync',
    description: 'Weekly team checkpoint to realign resources, assign due items, and clear blocked items.',
    date: getRelativeDateStr(0), // Today
    startTime: '10:00',
    endTime: '11:00',
    attendeeIds: ['staff-1', 'staff-2', 'staff-3', 'staff-4'],
    agenda: [
      'Sarah Chen: Showcase UI dashboard bento modular wireframes.',
      'Marcus Brody: Present latency feedback from scaling experiments.',
      'Elena Rostova: Review weekly conversion numbers.',
      'David Kim: Address operations logistics hardware shipments.'
    ],
    zoomLink: 'https://zoom.us/j/9876543210',
    googleSync: true,
    reminderAlert: true,
    notes: 'Approved the new navbar layouts. Marcus found an indexing latency bug but stated a patch is ready. Elena requested design assistance with newsletter assets.',
    zoomAiSummary: 'This was a busy sync session. The team aligned on major priorities. Key resolutions: Sarah Chen’s modular dashboards are approved for production. Marcus is deploying directory index fixes to reduce query delays. David needs to finalize vendor hardware bids by tomorrow.',
    actionItems: [
      'Sarah Chen: Design modern custom dropdown presets for layout dashboards',
      'Marcus Brody: Deploy caching layers to optimize query latency',
      'David Kim: Procure quotes for remote accessories'
    ],
    draftTasks: [
      {
        id: 'draft-1',
        title: 'Design dropdown presets for modular layout',
        desc: 'Based on approved bento wireframes, create interactive dropdown variants.',
        assigneeId: 'staff-1',
        meetingId: 'meet-1',
        priority: 'medium'
      },
      {
        id: 'draft-2',
        title: 'Optimize query caching protocols',
        desc: 'Implement redis indices to cut down workspace latency by 40%.',
        assigneeId: 'staff-2',
        meetingId: 'meet-1',
        priority: 'high'
      }
    ]
  },
  {
    id: 'meet-2',
    title: 'Product Growth Brainstorming Session',
    description: 'Creative session targeting viral design loops, subscriber growth, and onboarding optimization.',
    date: getRelativeDateStr(1), // Tomorrow
    startTime: '14:30',
    endTime: '15:30',
    attendeeIds: ['staff-1', 'staff-3'],
    agenda: [
      'Brainstorm dynamic workspace components.',
      'Align user onboarding milestones with newsletter subscription streams.',
      'Define visual tracking indicators for corporate accounts.'
    ],
    zoomLink: 'https://zoom.us/j/1234567890',
    googleSync: true,
    reminderAlert: true
  }
];

export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'goal-1',
    title: 'Raise Dashboard Fluidity & Loadtime Rating',
    ownerId: 'staff-2',
    startDate: getRelativeDateStr(-10),
    endDate: getRelativeDateStr(20),
    progress: 88,
    category: 'team',
    status: 'on_track',
    linkedTaskIds: ['task-2']
  },
  {
    id: 'goal-2',
    title: 'Acquire New Active Corporate Enrolled Users',
    ownerId: 'staff-3',
    startDate: getRelativeDateStr(-15),
    endDate: getRelativeDateStr(15),
    progress: 64,
    category: 'company',
    status: 'on_track',
    linkedTaskIds: ['task-3', 'task-6']
  },
  {
    id: 'goal-3',
    title: 'Launch Core Design System Kit V2',
    ownerId: 'staff-1',
    startDate: getRelativeDateStr(-5),
    endDate: getRelativeDateStr(10),
    progress: 70,
    category: 'company',
    status: 'on_track',
    linkedTaskIds: ['task-1']
  }
];

export const DEFAULT_REMINDERS: Reminder[] = [
  {
    id: 'rem-1',
    text: 'Submit the weekly operations review deck to managers',
    dateTime: `${getRelativeDateStr(0)}T17:00`,
    isCompleted: false,
    category: 'work' as any,
  },
  {
    id: 'rem-2',
    text: '[ESCALATION OVERDUE] David Kim has not completed Hardware Audit since 3 days!',
    dateTime: `${getRelativeDateStr(-1)}T09:00`,
    isCompleted: false,
    category: 'escalation',
  },
  {
    id: 'rem-3',
    text: 'Review Sarah Chen’s workspace mockup revisions',
    dateTime: `${getRelativeDateStr(0)}T11:15`,
    isCompleted: false,
    category: 'task',
  }
];

export const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    actorName: 'Sarah Chen',
    action: 'Task Completed',
    details: 'Completed Task: "Draft Q2 UX specification overview"'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    actorName: 'Marcus Brody',
    action: 'Task Created',
    details: 'Created Task: "Deploy backend indexing improvements"'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    actorName: 'Elena Rostova',
    action: 'Goal Progression',
    details: 'Updated "Acquire New Active Corporate Enrolled Users" current progress from 30 to 32'
  }
];
