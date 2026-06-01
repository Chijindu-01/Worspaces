/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task, Meeting, Goal, StaffMember } from '../types';
import { Sparkles, TrendingUp, AlertTriangle, CheckSquare, Award, Loader2, RefreshCw, BarChart2, ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface TabReportsProps {
  tasks: Task[];
  meetings: Meeting[];
  goals: Goal[];
  staffMembers: StaffMember[];
  activeUser: StaffMember;
  onAudit: (action: string, details: string) => void;
}

export default function TabReports({
  tasks,
  meetings,
  goals,
  staffMembers,
  activeUser,
  onAudit,
}: TabReportsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingPhrase, setLoadingPhrase] = useState('Collating staff output records...');

  // Programmatic KPI formulations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const blockedTasks = tasks.filter((t) => t.status === 'awaiting_review').length;
  const pendingTasks = tasks.filter((t) => t.status === 'todo').length;

  const taskCompletionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 100;

  // Goals completion rate
  const totalGoals = goals.length;
  const accomplishedGoals = goals.filter((g) => g.progress >= 100).length;
  const goalAchievementRate = totalGoals ? Math.round((accomplishedGoals / totalGoals) * 105) : 100;

  // Scientific Productivity Score (Base execution + goals velocity minus blockers weight)
  const baseScore = taskCompletionRate * 0.7 + goalAchievementRate * 0.3;
  const blockerDeduction = blockedTasks * 5;
  const productivityScore = Math.max(10, Math.min(100, Math.round(baseScore - blockerDeduction)));

  // Work distribution by priorities
  const highPriorityCount = tasks.filter((t) => t.priority === 'high').length;
  const mediumPriorityCount = tasks.filter((t) => t.priority === 'medium').length;
  const lowPriorityCount = tasks.filter((t) => t.priority === 'low').length;

  const triggerLoadingPhrases = () => {
    const phrases = [
      'Scanning team backlog directories...',
      'Synthesizing staff accountability structures...',
      'Analyzing alignment with overarching milestone goals...',
      'Formulating actionable strategic coaching advisory templates...',
      'Generating Workplace Performance Assessment report...'
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % phrases.length;
      setLoadingPhrase(phrases[index]);
    }, 2800);
    return interval;
  };

  const handleFetchAiReport = async () => {
    setIsGenerating(true);
    setErrorMessage('');
    setAiReport('');
    onAudit('AI Action', 'Requesting Workplace Productivity report from Gemini AI Workspace Advisor');

    const loadingInterval = triggerLoadingPhrases();

    try {
      const response = await fetch('/api/ai/analyze-productivity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks,
          meetings,
          goals,
          staffMembers,
        }),
      });

      clearInterval(loadingInterval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error formulation failure.');
      }

      const data = await response.json();
      setAiReport(data.report);
      onAudit('AI Success', 'Gemini AI Advisor generated Workspace Productivity report card');
    } catch (err: any) {
      clearInterval(loadingInterval);
      console.error(err);
      setErrorMessage(err.message || 'Could not fetch credentials. Confirm GEMINI_API_KEY presence.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="tab-reports-root" className="space-y-6">
      {/* EXEGESIS KPI BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Productivity Score Card */}
        <div className="bg-slate-900 text-white p-8 rounded-[2rem] border border-slate-950 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[200px]">
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">
              Workspace Health Index
            </span>
            <h3 className="text-4xl font-black mt-2 tracking-tighter">
              {productivityScore}%
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase mt-1">
              AGGREGATE EXECUTION INDEX
            </p>
          </div>
          <div className="mt-6 flex justify-between items-center z-10 border-t border-slate-800/80 pt-3">
            <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase">Live Sync Update</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
        </div>

        {/* Task Completion Card */}
        <div className="bg-white dark:bg-slate-900 dark:border-slate-800 p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-between shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] min-h-[200px]">
          <div className="space-y-1">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">Task Completion</span>
              <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-4xl font-black text-slate-900 dark:text-white mt-2 tracking-tighter">
              {taskCompletionRate}%
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mt-1">
              {completedTasks} / {totalTasks} DIRECTIVES CLOSED
            </p>
          </div>
          <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${taskCompletionRate}%` }}
              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Goal Success Card - STYLED IN LUXURIOUS INTUITIVE INDIGO FROM THE BENTO SPEC! */}
        <div className="bg-indigo-600 text-white p-8 rounded-[2rem] flex flex-col justify-between shadow-xl shadow-indigo-150 dark:shadow-indigo-950/55 min-h-[200px]">
          <div className="space-y-1">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-indigo-200 font-extrabold uppercase tracking-widest">Strategic Milestones</span>
              <Award className="h-4 w-4 text-amber-300" />
            </div>
            <h3 className="text-4xl font-black text-white mt-2 tracking-tighter">
              {goalAchievementRate}%
            </h3>
            <p className="text-indigo-200 text-xs font-bold uppercase mt-1">
              {accomplishedGoals} / {totalGoals} MILESTONES SECURED
            </p>
          </div>
          <div className="mt-4 w-full bg-indigo-700/60 h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${goalAchievementRate}%` }}
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Blocked and delays Card */}
        <div className="bg-white dark:bg-slate-900 dark:border-slate-800 p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-between shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] min-h-[200px]">
          <div className="space-y-1">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">Active Blockers</span>
              <AlertTriangle className={`h-4 w-4 ${blockedTasks > 0 ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600'}`} />
            </div>
            <h3 className={`text-4xl font-black mt-2 tracking-tighter ${blockedTasks > 0 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-900 dark:text-white'}`}>
              {blockedTasks}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mt-1">
              URGENT INTERVENTION QUEUED
            </p>
          </div>
          <div className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            {pendingTasks} Backlog items on shelf
          </div>
        </div>
      </div>

      {/* MID PANEL: WORK DISTRIBUTION METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Priorities distribution */}
        <div className="bg-white dark:bg-slate-900 dark:border-slate-800 p-8 rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] space-y-5">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <BarChart2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Task Priority Distribution
          </h3>
 
          <div className="space-y-5 pt-2">
            {/* High Priority bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-slate-600 dark:text-slate-300">High Urgency Tasks</span>
                <span className="text-rose-600 dark:text-rose-400 font-black">{highPriorityCount}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  style={{ width: `${totalTasks ? (highPriorityCount / totalTasks) * 100 : 0}%` }}
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                />
              </div>
            </div>
 
            {/* Medium Priority bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-slate-600 dark:text-slate-300">Medium Priority Tasks</span>
                <span className="text-amber-600 dark:text-amber-400 font-black">{mediumPriorityCount}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  style={{ width: `${totalTasks ? (mediumPriorityCount / totalTasks) * 100 : 0}%` }}
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                />
              </div>
            </div>
 
            {/* Low Priority bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-slate-600 dark:text-slate-300">Low Priority Tasks</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-black">{lowPriorityCount}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  style={{ width: `${totalTasks ? (lowPriorityCount / totalTasks) * 100 : 0}%` }}
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </div>
 
        {/* Staff Delivery Velocity summary */}
        <div className="bg-white dark:bg-slate-900 dark:border-slate-800 p-8 rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] space-y-5">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Executive Task Delivery Velocity
          </h3>
 
          <div className="space-y-4 pt-1">
            {staffMembers.map((member) => {
              const personalTasks = tasks.filter((t) => t.assigneeId === member.id);
              const personalCompleted = personalTasks.filter((t) => t.status === 'completed').length;
              const rate = personalTasks.length ? Math.round((personalCompleted / personalTasks.length) * 100) : 100;
 
              return (
                <div key={member.id} className="flex items-center gap-4 justify-between">
                  {/* Left avatar pill */}
                  <div className="flex items-center gap-2.5 w-32 flex-shrink-0">
                    <div
                      style={{ backgroundColor: member.avatarColor }}
                      className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black"
                    >
                      {member.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate tracking-tight">{member.name}</span>
                  </div>
 
                  {/* Centered progress slider row */}
                  <div className="flex-1">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${rate}%`, backgroundColor: member.avatarColor }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
 
                  {/* Righthand metrics info */}
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 w-20 text-right flex-shrink-0">
                    {rate}% <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold lowercase">({personalCompleted}d)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AUTOGENERATE PERFORMANCE REPORT: STYLED PRECISELY AS THE AMBER DEEP BENTO CONTAINER INSIDE DESIGN SPEC! */}
      <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/80 dark:border-amber-900/30 p-8 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-amber-200/40 dark:border-amber-900/20 pb-5">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Strategic Productivity Advisory (AI Automated)
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">On-Demand Workplace Accountability Audit</h3>
            <p className="text-amber-800/80 dark:text-amber-300 text-xs font-medium max-w-2xl leading-relaxed">
              Synthesizes staff outputs, identifies delayed milestone items, measures collective velocities, and delivers strategic corrective coaching guides using Gemini.
            </p>
          </div>
 
          <button
            id="audit-productivity-btn"
            onClick={handleFetchAiReport}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-150 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl transition-all shadow-md disabled:bg-slate-400 disabled:opacity-50 flex-shrink-0 cursor-pointer h-12"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white dark:text-slate-950" />
                {loadingPhrase}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300 dark:text-amber-500" />
                Run Performance Advisory Audit
              </>
            )}
          </button>
        </div>
 
        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs p-4 rounded-2xl font-semibold">
            {errorMessage}
          </div>
        )}
 
        {/* COMPILATION OUTLINE GRID */}
        {aiReport ? (
          <div className="border border-indigo-150 dark:border-indigo-900/50 bg-white/75 dark:bg-slate-900/80 rounded-3xl p-8 space-y-4 animate-in fade-in duration-300 shadow-md">
            <h4 className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Organizational Assessment: Gemini AI Workspace Report Card
            </h4>
            <div className="text-slate-850 dark:text-slate-200 text-sm prose max-w-none prose-slate dark:prose-invert leading-relaxed">
              <ReactMarkdown>{aiReport}</ReactMarkdown>
            </div>
          </div>
        ) : (
          !isGenerating && (
            <div className="py-14 text-center bg-white/50 dark:bg-slate-900/50 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-[2rem] transition-all">
              <Sparkles className="h-10 w-10 text-amber-500 mx-auto mb-3 animate-bounce" />
              <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm tracking-tight uppercase">AI Workplace Advisor ready for executive prompt.</p>
              <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto text-xs font-medium">
                Click the button to direct Gemini to query current logs, score goals, and output structural recommendations.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
