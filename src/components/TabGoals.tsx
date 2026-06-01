/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Goal, StaffMember } from '../types';
import { Target, Plus, AlertCircle, TrendingUp, CheckCircle, Award, Briefcase, UserCircle, Building2, Minus } from 'lucide-react';

interface TabGoalsProps {
  goals: Goal[];
  staffMembers: StaffMember[];
  activeUser: StaffMember;
  onAddGoal: (goal: Omit<Goal, 'id' | 'startDate' | 'endDate' | 'status'>) => void;
  onUpdateGoalProgress: (goalId: string, value: number) => void;
  onAudit: (action: string, details: string) => void;
}

export default function TabGoals({
  goals,
  staffMembers,
  activeUser,
  onAddGoal,
  onUpdateGoalProgress,
  onAudit,
}: TabGoalsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState(10);
  const [unit, setUnit] = useState('Specs');
  const [assigneeId, setAssigneeId] = useState('');
  
  // Categorization aligned to framework: personal, team, company
  const [category, setCategory] = useState<'personal' | 'team' | 'company'>('team');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || targetValue <= 0) return;

    // Default assignee to active user if category is personal
    const finalAssigneeId = category === 'personal' ? activeUser.id : assigneeId;

    // Map fields back to Goal interface cleanly
    onAddGoal({
      title,
      description,
      category,
      progress: 0,
      ownerId: finalAssigneeId || activeUser.id,
      // Store backup custom values directly on goal for detailed increments
      ...{
        targetValue,
        currentValue: 0,
        unit
      }
    } as any);

    const assignee = staffMembers.find((m) => m.id === finalAssigneeId);
    onAudit(
      'Goal Created',
      `"${title}" strategic objective created under ${category.toUpperCase()} goals. Primary lead: ${assignee?.name || 'Unassigned'}`
    );

    // reset
    setTitle('');
    setDescription('');
    setCategory('team');
    setTargetValue(10);
    setUnit('Specs');
    setAssigneeId('');
    setShowAddForm(false);
  };

  const adjustGoalProgress = (goal: any, amount: number) => {
    // Permission boundary check:
    // If goal is Team or Corporate/Company: Only managers and admins can adjust.
    // If goal is Personal: Only the owner (ownerId or assigneeId) can adjust.
    const isManagerOrAdmin = activeUser.roleType === 'manager' || activeUser.roleType === 'admin';
    const goalOwnerId = goal.ownerId || goal.assigneeId;
    const isOwner = goalOwnerId === activeUser.id;

    if (goal.category === 'personal' && !isOwner) {
      alert('🔒 Access Denied: You cannot adjust another employee’s personal milestone.');
      return;
    }

    if ((goal.category === 'team' || goal.category === 'company') && !isManagerOrAdmin) {
      alert('🔒 Access Denied: Only Managers and Admins can update Team or Corporate strategic metrics.');
      return;
    }

    // Determine current values based on model layout
    const targetVal = goal.targetValue !== undefined ? goal.targetValue : 100;
    const currentVal = goal.currentValue !== undefined ? goal.currentValue : (goal.progress !== undefined ? goal.progress : 0);

    const step = goal.targetValue !== undefined ? amount : (amount * 10); // step by 10% if 0-100 progress
    const newVal = Math.max(0, Math.min(targetVal, currentVal + step));

    onUpdateGoalProgress(goal.id, newVal);

    const unitStr = goal.unit || '%';
    onAudit(
      'Goal Progression',
      `Goal "${goal.title}" progress updated to ${newVal}/${targetVal} ${unitStr} (updated by ${activeUser.name})`
    );
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'personal':
        return <UserCircle className="h-4 w-4 text-purple-650" />;
      case 'team':
        return <Briefcase className="h-4 w-4 text-indigo-650" />;
      case 'company':
        return <Building2 className="h-4 w-4 text-amber-600" />;
      default:
        return <Target className="h-4 w-4 text-slate-500" />;
    }
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'personal':
        return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/25 dark:text-purple-300 dark:border-purple-900/40';
      case 'team':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/25 dark:text-indigo-300 dark:border-indigo-900/40';
      case 'company':
        return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/25 dark:text-amber-300 dark:border-amber-900/40';
      default:
        return 'bg-slate-50 text-slate-705 border-slate-100 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div id="tab-goals-root" className="space-y-6">
      
      {/* HEADER HERO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-905 dark:text-white tracking-tight flex items-center gap-2 uppercase">
            <Target className="h-5 w-5 text-indigo-505" />
            Milestone Metrics
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-semibold leading-relaxed">
            Record company, team, and personal milestones to track alignment.
          </p>
        </div>
        <button
          id="toggle-add-goal-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all self-start lg:self-auto cursor-pointer h-10 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Propose Goal Marker
        </button>
      </div>

      {/* CREATE FORM */}
      {showAddForm && (
        <form
          id="add-goal-form"
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-[2rem] border border-slate-205 shadow-xl space-y-4 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-200 dark:bg-slate-900 dark:border-slate-800"
        >
          <h3 className="font-black text-slate-800 dark:text-white text-lg">Propose New Alignment Goal</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Classification Level</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white h-9.5"
                >
                  <option value="personal">👤 Personal Goal</option>
                  <option value="team">💼 Team Goal</option>
                  <option value="company">🏢 Corporate / Company Goal</option>
                </select>
              </div>

              {category !== 'personal' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Primary strategic Owner</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white h-9.5"
                  >
                    <option value="">Unassigned (General Workspace)</option>
                    {staffMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-100 dark:border-purple-900/35 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-purple-705 dark:text-purple-400">Assigned To Me</span>
                  <span className="text-xs font-bold text-slate-705 dark:text-slate-300">{activeUser.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Goal Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Conduct pilot dashboard onboardings"
                className="w-full px-3 py-2 border border-slate-250 rounded-xl text-sm focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Metric Definition Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail high level metrics, specs, or required outcomes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs h-20 focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Target Threshold value</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Target Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. Pilots completed, Clients, Specs"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-black uppercase text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm cursor-pointer"
            >
              Propose Goal
            </button>
          </div>
        </form>
      )}

      {/* STRATEGIC OBJECTIVES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-dashed border-slate-200 rounded-[2rem] dark:bg-slate-900 dark:border-slate-800">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 font-bold">No active strategic metrics recorded yet.</p>
          </div>
        ) : (
          goals.map((g: any) => {
            const goalOwnerId = g.ownerId || g.assigneeId;
            const assignee = staffMembers.find((m) => m.id === goalOwnerId);
            
            const targetVal = g.targetValue !== undefined ? g.targetValue : 100;
            const currentVal = g.currentValue !== undefined ? g.currentValue : (g.progress !== undefined ? g.progress : 0);
            const unitType = g.unit !== undefined ? g.unit : '%';
            
            const cappedPct = Math.min(100, Math.round((currentVal / targetVal) * 100));
            const isCompleted = currentVal >= targetVal;

            // Security check descriptors
            const isManagerOrAdmin = activeUser.roleType === 'manager' || activeUser.roleType === 'admin';
            const isOwner = goalOwnerId === activeUser.id;
            const canAdjust = g.category === 'personal' ? isOwner : isManagerOrAdmin;

            return (
              <div
                key={g.id}
                className={`bg-white rounded-[2.2rem] border p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] flex flex-col justify-between transition-all dark:bg-slate-900 dark:border-slate-800 ${
                  isCompleted ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/5 dark:bg-emerald-950/5' : 'border-slate-100 dark:border-slate-800/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border-l-2 flex items-center gap-1.5 ${getCategoryTheme(g.category)}`}>
                      {getCategoryIcon(g.category)}
                      {g.category} alignment
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded">
                        Achieved Complete
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-slate-900 dark:text-white text-base leading-snug tracking-tight">
                    {g.title}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1.5 leading-relaxed">
                    {g.description || 'Deliver key strategic increments.'}
                  </p>

                  {/* Meter panel */}
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-indigo-505 dark:text-indigo-400" /> Meter Progress
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {currentVal} / {targetVal} {unitType} ({cappedPct}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-850 h-3 rounded-full overflow-hidden border border-slate-50 dark:border-slate-800">
                      <div
                        style={{ width: `${cappedPct}%` }}
                        className={`h-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-indigo-600 to-indigo-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {assignee ? (
                      <>
                        <div
                          style={{ backgroundColor: assignee.avatarColor }}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-white font-bold text-[8px]"
                        >
                          {assignee.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          Primary lead: {assignee.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-550 italic">Unassigned workspace</span>
                    )}
                  </div>

                  {/* Progress Adjusters - Respect boundaries */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => adjustGoalProgress(g, -1)}
                      disabled={!canAdjust || currentVal === 0}
                      className={`h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 transition-all ${
                        canAdjust ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'
                      }`}
                      title={canAdjust ? 'Decrease threshold' : 'Access Denied: Check permissions'}
                    >
                      <Minus className="h-3 w-3 stroke-[3]" />
                    </button>
                    <button
                      onClick={() => adjustGoalProgress(g, 1)}
                      disabled={!canAdjust || isCompleted}
                      className={`h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 transition-all ${
                        canAdjust ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'
                      }`}
                      title={canAdjust ? 'Increase threshold' : 'Access Denied: Check permissions'}
                    >
                      <Plus className="h-3 w-3 stroke-[3]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
