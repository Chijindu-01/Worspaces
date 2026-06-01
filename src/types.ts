/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarColor: string;
  roleType: 'admin' | 'manager' | 'staff'; // Role permission levels
  notificationsPref: {
    dailySummary: boolean;
    taskReminders: boolean;
    meetingReminders: boolean;
    overdueEscalations: boolean;
    missedUpdates: boolean;
  };
  googleCalendarConnected: boolean;
  zoomConnected: boolean;
  joinedWorkspace: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarColor: string;
  text: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  desc: string;
  status: 'todo' | 'in_progress' | 'awaiting_review' | 'completed' | 'reopened';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  assigneeId: string;
  category: 'work' | 'personal';
  isPrivate?: boolean; // private by default for personal tasks
  blocksCalendar?: boolean; // Blocks calendar time as "Busy"
  createdAt: string;
  completedAt?: string;
  comments: Comment[]; // comments on task
  reminderSettings?: 'at_due' | '10min_before' | '1hr_before' | '1day_before' | 'none';
  linkedMeetingId?: string; // meeting id if created from calendar action / past meeting draft
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'weekly_monday' | 'monthly_first_friday';
  goalId?: string; // associated goal target
  streakCounter?: number; // for recurring tasks
}

export interface DraftTask {
  id: string;
  title: string;
  desc: string;
  assigneeId: string;
  meetingId: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  attendeeIds: string[];
  agenda: string[];
  zoomLink?: string; // Zoom links supported
  googleSync: boolean; // Calendar sync state
  reminderAlert: boolean; // Pop-up warning
  notes?: string; 
  zoomAiSummary?: string; // Zoom automated summary
  actionItems?: string[]; // Extractions
  draftTasks?: DraftTask[]; // Manager-reviewed drafts
  googleEventId?: string; // Google Calendar Event ID reference
}

export interface Goal {
  id: string;
  title: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  progress: number; // 0-100
  category: 'personal' | 'team' | 'company';
  status: 'not_started' | 'on_track' | 'at_risk' | 'completed';
  linkedTaskIds?: string[];
}

export interface Reminder {
  id: string;
  text: string;
  dateTime: string;
  isCompleted: boolean;
  category: 'system' | 'meeting' | 'task' | 'escalation';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  details: string;
}

export interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  productivityScore: number;
}
