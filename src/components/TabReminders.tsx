/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Reminder, StaffMember } from '../types';
import { Bell, Plus, CheckCircle, Trash2, Calendar, Clock, AlertCircle } from 'lucide-react';

interface TabRemindersProps {
  reminders: Reminder[];
  activeUser: StaffMember;
  onAddReminder: (reminder: Omit<Reminder, 'id'>) => void;
  onToggleReminder: (reminderId: string) => void;
  onClearCompletedReminders: () => void;
  onAudit: (action: string, details: string) => void;
}

export default function TabReminders({
  reminders,
  activeUser,
  onAddReminder,
  onToggleReminder,
  onClearCompletedReminders,
  onAudit,
}: TabRemindersProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [text, setText] = useState('');
  const [dateTime, setDateTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || !dateTime) return;

    onAddReminder({
      text,
      dateTime,
      isCompleted: false,
      category: 'task',
    });

    onAudit(
      'Reminder Drafted',
      `"${text}" scheduled for ${dateTime.replace('T', ' ')} (created by ${activeUser.name})`
    );

    setText('');
    setDateTime('');
    setShowAddForm(false);
  };

  const getReminderStatusCount = (completedState: boolean) => {
    return reminders.filter((r) => r.isCompleted === completedState).length;
  };

  return (
    <div id="tab-reminders-root" className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)]">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
            Quick Reminders & Alerts
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-semibold leading-relaxed">
            Store fast reminders, fast checkmarks, and minor tasks for micro-accountability.
          </p>
        </div>
        <div className="flex gap-2">
          {getReminderStatusCount(true) > 0 && (
            <button
              onClick={() => {
                onClearCompletedReminders();
                onAudit('Workspace Cleanup', `Cleared completed workspace reminders.`);
              }}
              className="flex items-center gap-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer h-10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Completed
            </button>
          )}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer h-10"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Reminder
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          id="add-reminder-form"
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-4 max-w-md animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <h3 className="font-bold text-slate-800 text-base">Write Quick Alert</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Reminder Action</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Double-check Server TLS keys"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-501"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Alert Time</label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
            >
              Add Reminder
            </button>
          </div>
        </form>
      )}

      {/* REMINDERS BOARD STATS CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Alerts list */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Workspace Alerts Dashboard</h3>
          
          <div className="divide-y divide-slate-100">
            {reminders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                No active quick reminders. Great job!
              </div>
            ) : (
              reminders.map((rem) => {
                const triggerTime = new Date(rem.dateTime);
                const isOverdue = triggerTime < new Date() && !rem.isCompleted;

                return (
                  <div
                    key={rem.id}
                    className="flex justify-between items-start gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          onToggleReminder(rem.id);
                          onAudit(
                            'Reminder Checked',
                            `Reminder "${rem.text}" toggled to ${!rem.isCompleted ? 'Complete' : 'Pending'}`
                          );
                        }}
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all mt-0.5 cursor-pointer ${
                          rem.isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : isOverdue
                            ? 'border-rose-300 hover:border-rose-500'
                            : 'border-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {rem.isCompleted && <CheckCircle className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>
                      
                      <div>
                        <p className={`text-sm font-bold ${rem.isCompleted ? 'text-slate-400 line-through' : 'text-slate-850'}`}>
                          {rem.text}
                        </p>
                        
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-1 uppercase">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {rem.dateTime.split('T')[0]}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {rem.dateTime.split('T')[1]}
                          </span>
                          {isOverdue && (
                            <span className="text-rose-500 font-extrabold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Accountability Guidelines sidebar */}
        <div className="bg-indigo-600 text-white p-8 rounded-[2rem] border border-indigo-700 space-y-4 shadow-xl">
          <h3 className="font-extrabold text-base flex items-center gap-2 uppercase tracking-wide">
            <Bell className="h-5 w-5 text-amber-300" />
            Execution Guide
          </h3>
          <p className="text-xs text-indigo-100 leading-relaxed font-semibold">
            Quick reminders keep the team agile on minor tasks that don’t require elaborate full Jira-style tracking. Ensure you:
          </p>
          <ul className="space-y-2 text-xs text-indigo-100 list-disc list-inside font-medium leading-relaxed">
            <li>Verify timesheet reporting every Friday.</li>
            <li>Double-check API security keys after deployment.</li>
            <li>Maintain clear communication lines during sprints.</li>
            <li>Close finished reminder cards before client updates.</li>
          </ul>
          <div className="pt-4 border-t border-indigo-500/55">
            <span className="text-[10px] uppercase font-black tracking-widest text-white bg-indigo-750 px-3 py-2 rounded-xl block text-center border border-indigo-700">
              Assigned user: {activeUser.name} ({activeUser.role})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
