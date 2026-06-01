/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StaffMember, Task } from '../types';
import { User, ShieldCheck, Mail, Briefcase, Plus, CheckCircle, Radio } from 'lucide-react';

interface TabMembersProps {
  staffMembers: StaffMember[];
  tasks: Task[];
  activeUser: StaffMember;
  onSetActiveUser: (member: StaffMember) => void;
  onAddMember: (member: Omit<StaffMember, 'id'>) => void;
  onAudit: (action: string, details: string) => void;
  isCloudSynced?: boolean;
}

export default function TabMembers({
  staffMembers,
  tasks,
  activeUser,
  onSetActiveUser,
  onAddMember,
  onAudit,
  isCloudSynced = false,
}: TabMembersProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !email) return;

    onAddMember({
      name,
      role,
      email,
      avatarColor: color,
      roleType: 'staff',
      notificationsPref: {
        dailySummary: true,
        taskReminders: true,
        meetingReminders: true,
        overdueEscalations: false,
        missedUpdates: false,
      },
      googleCalendarConnected: false,
      zoomConnected: false,
      joinedWorkspace: true,
    });

    onAudit('System Administration', `Added new team member: ${name} (${role})`);
    
    // reset form
    setName('');
    setRole('');
    setEmail('');
    setShowAddForm(false);
  };

  const getTaskCount = (memberId: string, status?: string) => {
    return tasks.filter((t) => {
      const isAssignee = t.assigneeId === memberId;
      if (!isAssignee) return false;
      if (status) return t.status === status;
      return true;
    }).length;
  };

  const colors = [
    { value: '#10B981', label: 'Emerald' },
    { value: '#8B5CF6', label: 'Violet' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#3B82F6', label: 'Blue' },
    { value: '#EF4444', label: 'Candy Red' },
  ];

  return (
    <div id="tab-members-root" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-105 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 dark:text-white">
            <ShieldCheck className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            ValueFlow Team Identity System
          </h2>
          <p className="text-sm text-slate-400 mt-1 dark:text-slate-500 font-semibold">
            Simulate or administer roles, configure workloads, and coordinate team accountabilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/30">
            <Radio className="h-4 w-4 text-indigo-500 animate-pulse dark:text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-305">
              Active: {activeUser.name}
            </span>
          </div>
          <button
            id="toggle-add-member-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-sm font-medium transition-all cursor-pointer dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Staff Member
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          id="add-member-form"
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 max-w-xl animate-in fade-in slide-in-from-top-4 duration-200 dark:bg-slate-900 dark:border-slate-800"
        >
          <h3 className="font-bold text-slate-800 dark:text-white text-lg">Onboard New Team Member</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-850 dark:border-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. j.doe@vft.team"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-850 dark:border-slate-800 dark:text-white"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Job Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Quality Engineer"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-850 dark:border-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Corporate Palette Color</label>
              <div className="flex gap-2 items-center h-[38px] flex-wrap">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`h-6 w-6 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                      color === c.value
                        ? 'ring-2 ring-slate-805 ring-offset-2 scale-110'
                        : 'hover:scale-105'
                    }`}
                    title={c.label}
                  >
                    {color === c.value && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl cursor-pointer"
            >
              Confirm Enrollment
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {staffMembers.map((member) => {
          const totalTasks = getTaskCount(member.id);
          const completedTasks = getTaskCount(member.id, 'completed');
          const inProgressTasks = getTaskCount(member.id, 'in_progress');
          const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 100;
          const isCurrentActive = activeUser.id === member.id;

          return (
            <div
              key={member.id}
              className={`bg-white p-6 rounded-2xl border transition-all dark:bg-slate-900 ${
                isCurrentActive
                  ? 'border-indigo-505 ring-2 ring-indigo-50 dark:border-indigo-500 dark:ring-indigo-950/40'
                  : 'border-slate-101 hover:border-slate-205 hover:shadow-md dark:border-slate-800 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    style={{ backgroundColor: member.avatarColor }}
                    className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                  >
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{member.name}</h3>
                    <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-0.5 dark:text-slate-500">
                      <Briefcase className="h-3 w-3 text-slate-400 dark:text-slate-500" /> {member.role}
                    </p>
                    <p className="text-xs text-slate-400 font-semibold flex items-center gap-1 dark:text-slate-500 font-mono">
                      <Mail className="h-3 w-3 text-slate-400 dark:text-slate-500" /> {member.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isCloudSynced && !isCurrentActive}
                  onClick={() => {
                    if (isCloudSynced && !isCurrentActive) return;
                    onSetActiveUser(member);
                    onAudit('User Swapped', `Simulated login changed to ${member.name}`);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    isCurrentActive
                      ? 'bg-indigo-650 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-550 shadow-sm'
                      : isCloudSynced
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-dotted border-slate-205 dark:bg-slate-805 dark:text-slate-500'
                      : 'bg-slate-50 text-slate-650 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 border border-transparent dark:border-slate-850'
                  }`}
                >
                  {isCurrentActive
                    ? 'Active Identity'
                    : isCloudSynced
                    ? 'Cloud Locked'
                    : 'Simulate Login'}
                </button>
              </div>

              {/* Delivery analytics inside member card */}
              <div className="mt-6 border-t border-slate-55 pt-4 space-y-3 dark:border-slate-800/80">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">Execution Velocity</span>
                  <span className="text-slate-900 dark:text-slate-205 font-extrabold">{completionRate}% Completion</span>
                </div>
                
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden dark:bg-slate-800">
                  <div
                    style={{
                      width: `${completionRate}%`,
                      backgroundColor: member.avatarColor,
                    }}
                    className="h-full transition-all duration-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 mt-2">
                  <div className="bg-slate-50 rounded-xl px-3 py-1.5 flex-1 text-center dark:bg-slate-850 border border-transparent dark:border-slate-800/40">
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-wider dark:text-slate-400">Active Tasks</p>
                    <p className="text-slate-800 font-bold text-base mt-0.5 dark:text-white">
                      {inProgressTasks} <span className="text-xs font-medium text-slate-400 dark:text-slate-500">/ {totalTasks}</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-1.5 flex-1 text-center dark:bg-slate-850 border border-transparent dark:border-slate-800/40">
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-wider dark:text-slate-400">Completed</p>
                    <p className="text-emerald-700 font-bold text-base mt-0.5 dark:text-emerald-400">{completedTasks}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
