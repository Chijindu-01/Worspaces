/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Meeting, Task, Goal } from '../types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Filter,
  Eye,
  Video,
  Target,
  Award,
  Globe2,
  Lock,
  Compass
} from 'lucide-react';

interface TabCalendarProps {
  meetings: Meeting[];
  tasks: Task[];
  goals: Goal[];
  activeUser: any;
  onSyncMeetingToGoogleCalendar?: (meeting: Meeting) => Promise<void>;
  calendarSyncError?: string | null;
  calendarSyncSuccess?: string | null;
}

export default function TabCalendar({
  meetings,
  tasks,
  goals,
  activeUser,
  onSyncMeetingToGoogleCalendar,
  calendarSyncError,
  calendarSyncSuccess
}: TabCalendarProps) {
  // Use May 2026 as default reference from user logs metadata
  const [currentDate, setCurrentDate] = useState(new Date('2026-05-29'));
  const [selectedDay, setSelectedDay] = useState<number | null>(29);

  // Filter Toggles State
  const [showMeetings, setShowMeetings] = useState(true);
  const [showPersonal, setShowPersonal] = useState(true);
  const [showWorkDirectives, setShowWorkDirectives] = useState(true);
  const [showGoals, setShowGoals] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const getFormatDateStrString = (day: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    return `${year}-${formattedMonth}-${formattedDay}`;
  };

  // Get items matching and filter configurations
  const getItemsForDate = (day: number) => {
    const dateStr = getFormatDateStrString(day);

    const dayMeetings = showMeetings ? meetings.filter((m) => m.date === dateStr) : [];
    
    // Filter tasks
    const dayTasks = tasks.filter((t) => {
      if (t.dueDate !== dateStr) return false;
      if (t.category === 'personal') return showPersonal;
      if (t.category === 'work') return showWorkDirectives;
      return true;
    });

    const dayGoals = showGoals ? goals.filter((g) => g.endDate === dateStr) : [];

    return {
      meetings: dayMeetings,
      tasks: dayTasks,
      goals: dayGoals,
      totalCount: dayMeetings.length + dayTasks.length + dayGoals.length
    };
  };

  const renderDaysHeader = () => {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayLabels.map((lbl) => (
      <div key={lbl} className="text-center text-xs font-black text-slate-600 dark:text-slate-300 py-3 uppercase tracking-wider">
        {lbl}
      </div>
    ));
  };

  const renderCells = () => {
    const cells = [];

    // Prior Month Fill
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(
        <div key={`empty-${i}`} className="bg-slate-50 border border-slate-200 min-h-[100px] p-2 text-slate-400 dark:bg-slate-900/45 dark:border-slate-800" />
      );
    }

    // Days fill
    for (let day = 1; day <= daysInMonth; day++) {
      const { meetings: dMeets, tasks: dTasks, goals: dGoals, totalCount } = getItemsForDate(day);
      const isToday = day === 29 && month === 4 && year === 2026;
      const isSelected = day === selectedDay;

      cells.push(
        <div
          key={`day-${day}`}
          onClick={() => setSelectedDay(day)}
          className={`border border-slate-200 min-h-[100px] p-2.5 flex flex-col justify-between transition-all cursor-pointer relative dark:border-slate-800 ${
            isSelected
              ? 'bg-indigo-50/70 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800'
              : isToday
              ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-md font-bold'
              : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-xs font-black ${isToday && !isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
              {day}
            </span>
            {totalCount > 0 && (
              <span className={`text-[9.5px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500'
                  : isToday
                  ? 'bg-amber-400 text-slate-955 border-amber-400'
                  : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
              }`}>
                {totalCount}
              </span>
            )}
          </div>

          <div className="space-y-1.5 mt-2">
            {dMeets.slice(0, 1).map((m) => (
              <div
                key={m.id}
                className={`text-[8px] font-black uppercase truncate px-1.5 py-0.5 rounded border-l-2 leading-none cursor-pointer ${
                  isToday && !isSelected
                    ? 'bg-slate-900 text-amber-400 border-amber-400'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-500 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-500'
                }`}
                title={`Sync: ${m.title}`}
              >
                📹 Sync
              </div>
            ))}
            {dTasks.slice(0, 1).map((t) => {
              const belongsToActiveUser = t.assigneeId === activeUser.id;
              const isPrivateAndBlocked = t.category === 'personal' && t.isPrivate && !belongsToActiveUser;
              return (
                <div
                  key={t.id}
                  className={`text-[8.5px] font-bold truncate px-1 rounded border-l-2 leading-none ${
                    isToday && !isSelected
                      ? 'bg-slate-800 text-emerald-400 border-emerald-400'
                      : t.category === 'personal'
                      ? 'bg-purple-50 text-purple-700 border-purple-500 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-500'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-500 dark:bg-emerald-955 dark:text-emerald-300 dark:border-emerald-500'
                  }`}
                  title={isPrivateAndBlocked ? '🔒 Private block' : `Task: ${t.title}`}
                >
                  {isPrivateAndBlocked ? '🔒 Private Busy' : `${t.category === 'personal' ? '👤' : '🎯'} ${t.category}`}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return cells;
  };

  const selectedDayDateStr = selectedDay ? getFormatDateStrString(selectedDay) : '';
  const selectedDayItems = selectedDay ? getItemsForDate(selectedDay) : { meetings: [], tasks: [], goals: [] };

  return (
    <div id="tab-calendar-root" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {(calendarSyncSuccess || calendarSyncError) && (
        <div className="col-span-1 lg:col-span-3 space-y-2 animate-in fade-in duration-200">
          {calendarSyncSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-205 dark:border-emerald-800/40 px-5 py-3.5 rounded-2xl text-xs font-bold shadow-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
              <span>{calendarSyncSuccess}</span>
            </div>
          )}
          {calendarSyncError && (
            <div className="bg-rose-50 dark:bg-rose-955/40 text-rose-800 dark:text-rose-300 border border-rose-205 dark:border-rose-800/40 px-5 py-3.5 rounded-2xl text-xs font-bold shadow-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              <span>{calendarSyncError}</span>
            </div>
          )}
        </div>
      )}
      
      {/* LEFT 2 COLS: CALENDAR BOARD */}
      <div className="col-span-1 lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] space-y-6 dark:bg-slate-900 dark:border-slate-800">
        
        {/* CALENDAR BAR DIRECTIVE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {monthNames[month]} {year}
            </h2>
          </div>

          {/* CALENDAR GOOGLE STATUS INDICATOR */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-green-50 dark:bg-green-950/35 border border-green-200 dark:border-green-800/40 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-black text-green-800 dark:text-green-300 uppercase tracking-widest flex items-center gap-1">
                <Globe2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                {activeUser.googleCalendarConnected ? 'Google Calendar Sync Active' : 'Offline Mode'}
              </p>
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CALENDAR FILTER SYSTEM */}
        <div className="bg-slate-55 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Unified Filters:
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-805 dark:text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showMeetings}
                onChange={(e) => setShowMeetings(e.target.checked)}
                className="rounded text-indigo-600 h-4 w-4"
              />
              📹 sync Meetings
            </label>

            <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-805 dark:text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showWorkDirectives}
                onChange={(e) => setShowWorkDirectives(e.target.checked)}
                className="rounded text-emerald-600 h-4 w-4"
              />
              💼 work Directives
            </label>

            <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-805 dark:text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPersonal}
                onChange={(e) => setShowPersonal(e.target.checked)}
                className="rounded text-purple-600 h-4 w-4"
              />
              🔒 personal Targets
            </label>

            <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-805 dark:text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showGoals}
                onChange={(e) => setShowGoals(e.target.checked)}
                className="rounded text-amber-600 h-4 w-4"
              />
              🎯 goal Milestones
            </label>
          </div>
        </div>

        {/* CORE GRID */}
        <div className="grid grid-cols-7 gap-1">
          {renderDaysHeader()}
          {renderCells()}
        </div>
      </div>

      {/* RIGHT 1 COL: DAY SELECTOR AGENDA PANEL */}
      <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-900 flex flex-col justify-between text-white shadow-2xl">
        <div className="space-y-6">
          <span className="text-[9.5px] bg-slate-900 border border-slate-800 text-indigo-305 px-3 py-1 rounded-full font-black uppercase tracking-wider">
            Consolidated Agenda Planner
          </span>

          <h3 className="font-extrabold text-white text-lg mt-4 flex items-center gap-1.5">
            <List className="h-5 w-5 text-indigo-400" />
            {selectedDay ? `${monthNames[month]} ${selectedDay}, ${year}` : 'Select a date'}
          </h3>
          <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
            Summary agenda block targeting scheduled deliverables.
          </p>

          <div className="border-t border-slate-850 pt-4 space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {/* Meetings listed */}
            {selectedDayItems.meetings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1 bg-slate-900/50 p-2 rounded-lg">
                  📅 Scheduled Sync standups
                </h4>
                {selectedDayItems.meetings.map((m) => (
                  <div key={m.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-850 space-y-1">
                    <p className="font-bold text-xs text-white leading-tight">{m.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 leading-none mt-1">
                      <Clock className="h-3 w-3 text-indigo-400" /> {m.startTime} - {m.endTime}
                    </p>
                    {m.zoomLink && (
                      <span className="text-[9.5px] text-indigo-300 truncate block pt-1 font-bold">📹 {m.zoomLink}</span>
                    )}
                    
                    {/* Google Calendar Sync Action */}
                    {activeUser.googleCalendarConnected && onSyncMeetingToGoogleCalendar && (
                      <div className="flex justify-end pt-2 mt-1 border-t border-slate-850/50">
                        <button
                          type="button"
                          onClick={() => onSyncMeetingToGoogleCalendar(m)}
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                            m.googleEventId 
                              ? 'bg-emerald-950/45 text-emerald-405 border border-emerald-800/30 hover:bg-emerald-900/30' 
                              : 'bg-indigo-600 text-white border border-indigo-650 hover:bg-indigo-550 shadow-sm'
                          }`}
                        >
                          <svg className="h-2.5 w-2.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
                          </svg>
                          {m.googleEventId ? 'Update Google Cal' : 'Push to Google Cal'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tasks listed */}
            {selectedDayItems.tasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1 bg-slate-900/50 p-2 rounded-lg">
                  🎯 Deadlines Pending
                </h4>
                {selectedDayItems.tasks.map((t) => {
                  const belongsToActiveUser = t.assigneeId === activeUser.id;
                  const isCensored = t.category === 'personal' && t.isPrivate && !belongsToActiveUser;

                  return (
                    <div key={t.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-850 space-y-1">
                      <p className="font-bold text-xs text-white leading-tight">
                        {isCensored ? '🔒 Private Personal busy block' : t.title}
                      </p>
                      
                      <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-850/50">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider border ${
                          t.category === 'personal'
                            ? 'bg-purple-950/40 text-purple-300 border-purple-900/30'
                            : 'bg-emerald-950/40 text-emerald-300 border-emerald-900/30'
                        }`}>
                          {t.category}
                        </span>
                        
                        <span className="text-[9px] uppercase font-black text-indigo-300">
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedDayItems.meetings.length === 0 && selectedDayItems.tasks.length === 0 && (
              <div className="py-14 text-center text-xs text-slate-400 italic font-medium leading-relaxed">
                No items scheduled. Perfect opportunity for focused deep-work blocks.
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-slate-850 pt-4 text-[10px] font-bold uppercase text-slate-400 grid grid-cols-2 gap-2 mt-6">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> sync standups
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> work directives
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> personal block
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> milestones
          </span>
        </div>
      </div>
    </div>
  );
}
