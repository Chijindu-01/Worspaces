/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task, StaffMember, Goal, Meeting, Comment } from '../types';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  EyeOff,
  Clock,
  MessageSquare,
  AtSign,
  Award,
  Link,
  Lock,
  Compass
} from 'lucide-react';

interface TabTasksProps {
  tasks: Task[];
  staffMembers: StaffMember[];
  activeUser: StaffMember;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAudit: (action: string, details: string) => void;
  goals: Goal[];
  meetings: Meeting[];
}

export default function TabTasks({
  tasks,
  staffMembers,
  activeUser,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAudit,
  goals,
  meetings
}: TabTasksProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryType, setCategoryType] = useState<'work' | 'personal'>('work');
  const [isPrivate, setIsPrivate] = useState(false);
  const [blocksCalendar, setBlocksCalendar] = useState(true);
  const [reminderSettings, setReminderSettings] = useState<Task['reminderSettings']>('at_due');
  const [recurrence, setRecurrence] = useState<Task['recurrence']>('none');
  const [linkedGoalId, setLinkedGoalId] = useState('');
  const [linkedMeetingId, setLinkedMeetingId] = useState('');

  // Comment input state dictionary mapped by task ID
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showMentionMenu, setShowMentionMenu] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !assigneeId || !dueDate) return;

    onAddTask({
      title,
      desc,
      status: 'todo',
      priority,
      dueDate,
      assigneeId,
      category: categoryType,
      isPrivate: categoryType === 'personal' ? isPrivate : false,
      blocksCalendar: categoryType === 'personal' ? blocksCalendar : true,
      comments: [],
      reminderSettings,
      recurrence,
      goalId: linkedGoalId || undefined,
      linkedMeetingId: linkedMeetingId || undefined,
      streakCounter: recurrence !== 'none' ? 0 : undefined
    });

    const assignee = staffMembers.find((m) => m.id === assigneeId);
    onAudit(
      'Task Created',
      `"${title}" (${categoryType}) directive created by ${activeUser.name} and assigned to ${assignee?.name || 'Unassigned'}`
    );

    // reset fields
    setTitle('');
    setDesc('');
    setPriority('medium');
    setAssigneeId('');
    setDueDate('');
    setCategoryType('work');
    setIsPrivate(false);
    setBlocksCalendar(true);
    setReminderSettings('at_due');
    setRecurrence('none');
    setLinkedGoalId('');
    setLinkedMeetingId('');
    setShowAddForm(false);
  };

  const handlePostComment = (taskId: string) => {
    const text = commentInputs[taskId]?.trim();
    if (!text) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      authorId: activeUser.id,
      authorName: activeUser.name,
      authorAvatarColor: activeUser.avatarColor,
      text,
      timestamp: new Date().toISOString()
    };

    const updatedTask = {
      ...task,
      comments: [...(task.comments || []), newComment]
    };

    onUpdateTask(updatedTask);
    onAudit('Task Commented', `${activeUser.name} posted a review comment on "${task.title}"`);
    
    // Clear comment input
    setCommentInputs({ ...commentInputs, [taskId]: '' });
  };

  const insertMention = (taskId: string, memberName: string) => {
    const currentText = commentInputs[taskId] || '';
    setCommentInputs({
      ...commentInputs,
      [taskId]: `${currentText}@${memberName} `
    });
    setShowMentionMenu(null);
  };

  const highlightMentions = (commentText: string) => {
    if (!commentText.includes('@')) return commentText;
    const parts = commentText.split(/(@[a-zA-Z\s]+?(?=\s|$))/);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-blue-600 font-extrabold bg-blue-50 px-1 rounded border border-blue-105">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getNextOccurrenceDate = (currentDueDateStr: string, recurrenceRule: Task['recurrence']): string => {
    const parts = currentDueDateStr.split('-');
    let currentDue = new Date();
    if (parts.length === 3) {
      currentDue = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    const nextDate = new Date(currentDue);

    if (recurrenceRule === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (recurrenceRule === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (recurrenceRule === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (recurrenceRule === 'weekly_monday') {
      const currentDay = currentDue.getDay();
      const daysUntilMonday = (1 + 7 - currentDay) % 7;
      const addDays = daysUntilMonday === 0 ? 7 : daysUntilMonday;
      nextDate.setDate(nextDate.getDate() + addDays);
    } else if (recurrenceRule === 'monthly_first_friday') {
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(1); // 1st day of next month
      while (nextDate.getDay() !== 5) { // Friday is day 5
        nextDate.setDate(nextDate.getDate() + 1);
      }
    }

    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const recurrenceLabel = (r: Task['recurrence']): string => {
    switch (r) {
      case 'daily': return 'daily';
      case 'weekly': return 'weekly';
      case 'monthly': return 'monthly';
      case 'weekly_monday': return 'Every Monday';
      case 'monthly_first_friday': return 'Every First Friday';
      default: return r || 'none';
    }
  };

  const spawnRecurrence = (task: Task) => {
    if (task.recurrence && task.recurrence !== 'none') {
      const nextDueDateStr = getNextOccurrenceDate(task.dueDate, task.recurrence);
      onAddTask({
        title: task.title,
        desc: task.desc,
        status: 'todo',
        priority: task.priority,
        dueDate: nextDueDateStr,
        assigneeId: task.assigneeId,
        category: task.category,
        isPrivate: task.isPrivate,
        blocksCalendar: task.blocksCalendar,
        comments: [],
        reminderSettings: task.reminderSettings,
        recurrence: task.recurrence,
        goalId: task.goalId,
        linkedMeetingId: task.linkedMeetingId,
        streakCounter: (task.streakCounter || 0) + 1
      });

      const friendlyRec = recurrenceLabel(task.recurrence);
      onAudit(
        'Recurrence Spawned',
        `Completed milestone triggered next ${friendlyRec} sequence for "${task.title}". Streak counter: ${(task.streakCounter || 0) + 1}`
      );
    }
  };

  // Workflow trigger: Staff progress updates
  const handleProgressSlide = (task: Task, percent: number) => {
    let nextStatus: Task['status'] = task.status;
    let completedAt: string | undefined = task.completedAt;

    if (percent === 100) {
      nextStatus = task.category === 'personal' ? 'completed' : 'awaiting_review';
      if (task.category === 'personal') {
        completedAt = new Date().toISOString().split('T')[0];
      }
    } else if (task.status === 'todo') {
      nextStatus = 'in_progress';
    }

    const updatedTask: Task = {
      ...task,
      status: nextStatus,
      completedAt
    };
    onUpdateTask(updatedTask);

    if (percent === 100 && task.category === 'personal') {
      spawnRecurrence(task);
    }
  };

  // Workflow trigger: Submit for Manager Approval
  const handleSubmitForReview = (task: Task) => {
    const updatedTask: Task = {
      ...task,
      status: 'awaiting_review'
    };
    onUpdateTask(updatedTask);
    onAudit('Task Submitted', `"${task.title}" submitted by staff ${activeUser.name} for managerial sign-off`);
  };

  // Workflow trigger: Manager Sign-off Approve
  const handleManagerApprove = (task: Task) => {
    const updatedTask: Task = {
      ...task,
      status: 'completed',
      completedAt: new Date().toISOString().split('T')[0]
    };

    onUpdateTask(updatedTask);
    onAudit('Task Approved', `Manager ${activeUser.name} signed off and completed "${task.title}"`);

    // Spawning recurrence instance if configured
    spawnRecurrence(task);
  };

  // Workflow trigger: Manager Reopen revision request
  const handleManagerReopen = (task: Task) => {
    const updatedTask: Task = {
      ...task,
      status: 'reopened'
    };
    onUpdateTask(updatedTask);
    onAudit('Task Reopened', `Manager ${activeUser.name} requested revision on "${task.title}". Returned to backlog.`);
  };

  // Filter Tasks respecting role permissions, personal category visibility and UI inputs
  const filteredTasks = tasks.filter((task) => {
    // 1. Privacy filter: Personal tasks with isPrivate on are ONLY visible to that creator/assignee.
    if (task.category === 'personal' && task.isPrivate) {
      if (task.assigneeId !== activeUser.id) {
        // If this is not the active user's task, we still return it but we will censor details in rendering!
        // To allow blocking calendar visibility as "Busy" but protect details.
      }
    }

    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.desc.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
    const matchesAssignee = selectedAssignee === 'all' || task.assigneeId === selectedAssignee;
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;

    return matchesSearch && matchesStatus && matchesAssignee && matchesPriority && matchesCategory;
  });

  const getPriorityColor = (p: Task['priority']) => {
    switch (p) {
      case 'high':
        return 'text-rose-950 bg-rose-100 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800';
      case 'medium':
        return 'text-amber-950 bg-amber-100 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
      case 'low':
        return 'text-indigo-900 bg-indigo-100 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800';
    }
  };

  const getStatusBadge = (s: Task['status']) => {
    switch (s) {
      case 'completed':
        return 'text-emerald-950 bg-emerald-100 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
      case 'in_progress':
        return 'text-blue-950 bg-blue-105 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      case 'awaiting_review':
        return 'text-purple-950 bg-purple-100 border-purple-300 animate-pulse font-extrabold dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
      case 'reopened':
        return 'text-orange-950 bg-orange-100 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-850';
      case 'todo':
        return 'text-slate-900 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div id="tab-tasks-root" className="space-y-6">
      {/* HEADER HERO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 uppercase">
            <Compass className="h-5 w-5 text-indigo-500" />
            Task Directives Panel
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-semibold leading-relaxed">
            Create deliverables, manage staff review lifecycles, and isolate personal busy time.
          </p>
        </div>
        
        {/* Only Manager and Admin can spawn work tasks, but anyone can write personal tasks */}
        <button
          id="toggle-add-task-btn"
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (!assigneeId) setAssigneeId(activeUser.id);
          }}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all self-start lg:self-auto cursor-pointer h-10 shadow-sm outline-none"
        >
          <Plus className="h-4 w-4" />
          Create Task Directive
        </button>
      </div>

      {/* DETAILED FORM */}
      {showAddForm && (
        <form
          id="add-task-form"
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-[2rem] border border-slate-150 shadow-xl space-y-4 max-w-3xl animate-in fade-in slide-in-from-top-4 duration-200 dark:bg-slate-900 dark:border-slate-800"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-black text-slate-850 dark:text-white text-lg">Define New Task Accountability</h3>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded">
              Creator Role: {(activeUser.roleType || 'staff').toUpperCase()}
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Classification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryType('work')}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      categoryType === 'work'
                        ? 'bg-indigo-650 border-indigo-700 text-white dark:bg-indigo-600 dark:border-indigo-500 dark:text-white shadow-sm'
                        : 'bg-slate-50 border-slate-300 text-slate-850 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-850 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    💼 Work Directive
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryType('personal')}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      categoryType === 'personal'
                        ? 'bg-purple-700 border-purple-850 text-white dark:bg-purple-600 dark:border-purple-500 dark:text-white shadow-sm'
                        : 'bg-slate-50 border-slate-300 text-slate-850 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-850 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    🔒 Personal Target
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Recurrence Rate</label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as Task['recurrence'])}
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none dark:bg-slate-850 dark:border-slate-700 dark:text-white h-9.5"
                >
                  <option value="none" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">One-off / None</option>
                  <option value="daily" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">🔄 Daily Recurrence</option>
                  <option value="weekly" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">🔄 Weekly Recurrence</option>
                  <option value="monthly" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">🔄 Monthly Recurrence</option>
                  <option value="weekly_monday" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">📆 Every Monday</option>
                  <option value="monthly_first_friday" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">📆 Every First Friday</option>
                </select>
              </div>
            </div>

            {categoryType === 'personal' && (
              <div className="bg-purple-100 p-4 rounded-2xl border border-purple-300 dark:bg-purple-950/40 dark:border-purple-800 flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-purple-950 dark:text-purple-200">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="rounded text-purple-750 h-4 w-4 border-purple-400"
                  />
                  Secure Privacy (Managers cannot audit description details)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-purple-950 dark:text-purple-200">
                  <input
                    type="checkbox"
                    checked={blocksCalendar}
                    onChange={(e) => setBlocksCalendar(e.target.checked)}
                    className="rounded text-purple-750 h-4 w-4 border-purple-400"
                  />
                  Block Calendar time as "Busy"
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Directive Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Redesign database query indexing layers"
                className="w-full px-3 py-2 border border-slate-300 placeholder-slate-500 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-150 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Scope Deliverables Description</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Specify precise metrics, instructions, and outcomes..."
                className="w-full px-3 py-2 border border-slate-300 placeholder-slate-500 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-150 bg-white h-22 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Assignee Accountant</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none dark:bg-slate-850 dark:border-slate-700 dark:text-white h-9.5"
                  required
                >
                  <option value="" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">Select Staff</option>
                  {staffMembers.map((m) => (
                    <option key={m.id} value={m.id} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Priority Weight</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none dark:bg-slate-850 dark:border-slate-700 dark:text-white h-9.5"
                >
                  <option value="low" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">Low Priority</option>
                  <option value="medium" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">Medium Priority</option>
                  <option value="high" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">High Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Target Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none dark:bg-slate-850 dark:border-slate-700 dark:text-white h-9.5"
                  required
                />
              </div>
            </div>

            {categoryType === 'work' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-300 dark:border-slate-800 pt-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Linked Goal Target</label>
                  <select
                    value={linkedGoalId}
                    onChange={(e) => setLinkedGoalId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none dark:bg-slate-850 dark:border-slate-700 dark:text-white h-9.5"
                  >
                    <option value="" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">None (Independent Target)</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">
                        🎯 {g.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Linked Meeting Source</label>
                  <select
                    value={linkedMeetingId}
                    onChange={(e) => setLinkedMeetingId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none dark:bg-slate-850 dark:border-slate-700 dark:text-white h-9.5"
                  >
                    <option value="" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">None (General Backlog)</option>
                    {meetings.map((m) => (
                      <option key={m.id} value={m.id} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">
                        📹 {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Smart Alert Schedule</label>
                  <select
                    value={reminderSettings}
                    onChange={(e) => setReminderSettings(e.target.value as Task['reminderSettings'])}
                    className="w-full px-3 py-2 border border-slate-300 bg-white rounded-xl text-xs font-bold text-slate-900 focus:outline-none dark:bg-slate-850 dark:border-slate-700 dark:text-white h-9.5"
                  >
                    <option value="none" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">No warnings</option>
                    <option value="at_due" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">At Due Date</option>
                    <option value="10min_before" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">10 Minutes Before</option>
                    <option value="1hr_before" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">1 Hour Before</option>
                    <option value="1day_before" className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white font-bold">1 Day Before</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-black uppercase text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-extrabold uppercase bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm cursor-pointer"
            >
              Issue Directive
            </button>
          </div>
        </form>
      )}

      {/* FILTER CONTROLLERS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-200/80 p-4 rounded-[1.5rem] border border-slate-350 dark:bg-slate-850 dark:border-slate-800">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-550 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-white pl-9 pr-3 py-1.5 border border-slate-350 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800 px-3 py-1.5 border border-slate-350 rounded-xl text-xs font-extrabold text-slate-950 focus:outline-none"
          >
            <option value="all" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">All States</option>
            <option value="todo" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">To Do</option>
            <option value="in_progress" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">In Progress</option>
            <option value="awaiting_review" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">Awaiting Review</option>
            <option value="completed" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">Completed</option>
            <option value="reopened" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">Reopened</option>
          </select>
        </div>

        <div>
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800 px-3 py-1.5 border border-slate-350 rounded-xl text-xs font-extrabold text-slate-950 focus:outline-none"
          >
            <option value="all" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">All Staff</option>
            {staffMembers.map((m) => (
              <option key={m.id} value={m.id} className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800 px-3 py-1.5 border border-slate-350 rounded-xl text-xs font-extrabold text-slate-950 focus:outline-none"
          >
            <option value="all" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">All Priorities</option>
            <option value="low" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">Low</option>
            <option value="medium" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">Medium</option>
            <option value="high" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">High</option>
          </select>
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 dark:text-white dark:border-slate-800 px-3 py-1.5 border border-slate-350 rounded-xl text-xs font-extrabold text-slate-950 focus:outline-none"
          >
            <option value="all" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">All Categories</option>
            <option value="work" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">💼 Work Directives</option>
            <option value="personal" className="text-slate-900 bg-white dark:bg-slate-950 dark:text-white font-bold">🔒 Personal Targets</option>
          </select>
        </div>
      </div>

      {/* TASK TILES LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-14 text-center bg-white border border-dashed border-slate-300 rounded-[2rem] dark:bg-slate-900 dark:border-slate-800">
            <AlertCircle className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-slate-805 dark:text-slate-200 text-sm font-bold">No directives match your current criteria.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const assignee = staffMembers.find((m) => m.id === task.assigneeId);
            const isCompleted = task.status === 'completed';
            
            // Check privacy constraint
            const isCensored = task.category === 'personal' && task.isPrivate && task.assigneeId !== activeUser.id;

            return (
              <div
                key={task.id}
                className={`bg-white rounded-[2rem] border p-6 flex flex-col justify-between transition-all shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:border-slate-800 ${
                  isCompleted
                    ? 'border-emerald-300 bg-emerald-50/20 dark:bg-emerald-950/20 dark:border-emerald-800/55'
                    : task.status === 'awaiting_review'
                    ? 'border-purple-300 bg-purple-50/20 dark:bg-purple-950/20 dark:border-purple-800/55'
                    : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      task.category === 'personal'
                        ? 'text-purple-950 bg-purple-100 border-purple-350 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                        : 'text-indigo-950 bg-indigo-100 border-indigo-350 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                    }`}>
                      {task.category === 'personal' ? '🔒 personal' : '💼 work'}
                    </span>
                    
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {task.recurrence && task.recurrence !== 'none' && (
                        <span className="text-[10px] bg-sky-100 text-sky-950 border border-sky-350 px-2.5 py-1 rounded-full font-extrabold flex items-center gap-1 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-850">
                          <RefreshCw className="h-3 w-3 animate-spin duration-3000" /> {recurrenceLabel(task.recurrence)}
                          {task.streakCounter && task.streakCounter > 0 ? (
                            <span className="bg-sky-200 dark:bg-sky-900 px-1 py-0.2 rounded text-[8px]" title="Streak count">
                              🔥 {task.streakCounter}
                            </span>
                          ) : null}
                        </span>
                      )}

                      <span className={`text-[10px] font-extrabold uppercase border px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase border px-2 py-0.5 rounded-full ${getStatusBadge(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <h3 className={`font-black text-slate-950 text-base mt-4 tracking-tight leading-snug dark:text-white ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                    {isCensored ? '🔒 Restricted: Personal Busy Hold' : task.title}
                  </h3>
                  
                  <p className="text-xs text-slate-750 mt-2 leading-relaxed font-bold dark:text-slate-300">
                    {isCensored
                      ? 'Administrative policy secures task item specifics from third-party audits.'
                      : task.desc || 'No further description details added.'}
                  </p>

                  {/* Goal and Meeting links metadata */}
                  {!isCensored && (task.goalId || task.linkedMeetingId) && (
                    <div className="flex gap-2 mt-4 items-center flex-wrap">
                      {task.goalId && (
                        <span className="text-[9.5px] font-bold bg-slate-50 hover:bg-slate-105 border border-slate-150 dark:bg-slate-850 dark:text-slate-350 dark:border-slate-800 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          Goal alignment
                        </span>
                      )}
                      {task.linkedMeetingId && (
                        <span className="text-[9.5px] font-bold bg-slate-50 border border-slate-150 dark:bg-slate-850 dark:text-slate-350 dark:border-slate-850 px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <Link className="h-3 w-3 text-sky-500" />
                          Meeting source
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* SLIDER FOR STAFF TO UPDATE STATUS */}
                {!isCensored && !isCompleted && task.assigneeId === activeUser.id && (
                  <div className="mt-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-600 dark:text-slate-400">Report Progress Value</span>
                      <span className="font-extrabold text-indigo-650 dark:text-indigo-400">
                        {task.status === 'todo' ? '0' : task.status === 'in_progress' ? '50' : '90'}%
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => handleProgressSlide(task, 50)}
                        className={`px-3 py-1 text-[10px] font-black uppercase rounded border transition-all ${
                          task.status === 'in_progress'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-800'
                        }`}
                      >
                        In Progress (50%)
                      </button>
                      <button
                        onClick={() => handleProgressSlide(task, 100)}
                        className="px-3 py-1 text-[10px] font-black uppercase rounded bg-indigo-50 border border-indigo-150 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 transition-all hover:bg-indigo-600 hover:text-white"
                      >
                        Mark Done (100%)
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-300 dark:border-slate-800 flex items-center justify-between gap-4">
                  {/* Assignee Identity */}
                  <div className="flex items-center gap-2">
                    {assignee ? (
                      <>
                        <div
                          style={{ backgroundColor: assignee.avatarColor }}
                          className="h-6 w-6 rounded-lg flex items-center justify-center text-white font-extrabold text-[10px]"
                        >
                          {assignee.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-200">
                          {assignee.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-600 font-extrabold italic">Unassigned</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <span className={new Date(task.dueDate) < new Date() && !isCompleted ? 'text-rose-650 dark:text-rose-450 font-black' : 'font-extrabold'}>
                      {task.dueDate}
                    </span>
                  </div>
                </div>

                {/* WORKFLOW MANAGERIAL ACTION CONTROLS */}
                {!isCensored && (
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* 1. Workflow: Staff triggers submission */}
                      {!isCompleted && task.status !== 'awaiting_review' && task.assigneeId === activeUser.id && (
                        <button
                          onClick={() => handleSubmitForReview(task)}
                          className="text-indigo-700 hover:text-white hover:bg-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 text-xs font-extrabold cursor-pointer transition-all uppercase tracking-wider"
                        >
                          Submit Done
                        </button>
                      )}

                      {/* 2. Workflow: Manager reviews Awaiting Approval items */}
                      {task.status === 'awaiting_review' && (
                        activeUser.roleType === 'manager' || activeUser.roleType === 'admin' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleManagerApprove(task)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1 text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                            >
                              Approve Sign-off
                            </button>
                            <button
                              onClick={() => handleManagerReopen(task)}
                              className="bg-orange-50 hover:bg-orange-600 border border-orange-200 hover:text-white text-orange-700 rounded-lg px-3 py-1 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Reopen & Revise
                            </button>
                          </div>
                        ) : (
                          <span className="text-purple-650 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-150 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider animate-pulse">
                            Awaiting Manager Sign-off
                          </span>
                        )
                      )}

                      {isCompleted && (
                        <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-55 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completed
                        </span>
                      )}

                      {task.status === 'reopened' && (
                        <span className="text-orange-700 dark:text-orange-400 bg-orange-50 border border-orange-150 px-2.5 py-1 rounded text-[10px] font-extrabold uppercase animate-pulse">
                          Reopened for Edits
                        </span>
                      )}
                    </div>

                    {/* Deletion constraint: managers and administrative actors only */}
                    {(activeUser.roleType === 'admin' || activeUser.roleType === 'manager') && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this directive?')) {
                            onDeleteTask(task.id);
                            onAudit('Task Remove', `Removed task "${task.title}" under ${task.category}`);
                          }
                        }}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer border border-transparent hover:border-rose-200"
                        title="Delete Directive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* EXPANSIVE DISCUSSIONS & @MENTIONS LIST SECTION */}
                {!isCensored && (
                  <div className="mt-4 border-t border-slate-300 dark:border-slate-800/60 pt-4 space-y-3">
                    <h4 className="text-[10px] uppercase font-black text-slate-650 dark:text-slate-300 tracking-wider flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> Discussions & Mentions ({task.comments?.length || 0})
                    </h4>

                    {/* Render comments */}
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {(task.comments || []).length === 0 ? (
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-extrabold italic">No notes posted yet. Use the prompt below.</p>
                      ) : (
                        task.comments.map((comm) => (
                          <div key={comm.id} className="bg-slate-105 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-250 dark:border-slate-800 flex items-start gap-2.5">
                            <div
                              style={{ backgroundColor: comm.authorAvatarColor }}
                              className="h-5 w-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8.5px] text-white font-extrabold"
                            >
                              {comm.authorName.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-900 dark:text-white">{comm.authorName}</span>
                                <span className="text-[8px] text-slate-600 dark:text-slate-400 font-bold">
                                  {new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-850 mt-1 dark:text-slate-200 leading-relaxed font-bold">
                                {highlightMentions(comm.text)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add comments panel */}
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={commentInputs[task.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [task.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePostComment(task.id);
                          }}
                          placeholder="Write feedback... Use @ to select staff"
                          className="flex-1 bg-white dark:bg-slate-850 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-950 dark:text-white dark:border-slate-800 focus:outline-none font-bold"
                        />
                        
                        <button
                          type="button"
                          onClick={() => setShowMentionMenu(showMentionMenu === task.id ? null : task.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-all border border-slate-200 bg-white"
                          title="Mention a staff accountant"
                        >
                          <AtSign className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handlePostComment(task.id)}
                          className="bg-slate-900 text-white rounded-xl px-3 py-1.5 text-[10.5px] font-black uppercase hover:bg-slate-800 cursor-pointer"
                        >
                          Send
                        </button>
                      </div>

                      {/* Mention dropdown */}
                      {showMentionMenu === task.id && (
                        <div className="absolute right-0 bottom-10 bg-white border border-slate-250 rounded-xl shadow-xl z-20 w-48 text-left py-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                          <p className="text-[9px] uppercase font-black text-slate-440 px-3 py-1 border-b tracking-wider">Mention Team Colleague</p>
                          {staffMembers
                            .filter((m) => m.id !== activeUser.id)
                            .map((m) => (
                              <button
                                key={m.id}
                                onClick={() => insertMention(task.id, m.name)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 font-semibold text-slate-700 flex items-center gap-2"
                              >
                                <span style={{ backgroundColor: m.avatarColor }} className="h-4 w-4 rounded-full inline-block" />
                                {m.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
