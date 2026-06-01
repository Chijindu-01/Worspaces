/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Meeting, StaffMember, DraftTask, Task } from '../types';
import {
  Users,
  Clock,
  Plus,
  Sparkles,
  CheckCircle2,
  X,
  Loader2,
  FileText,
  Calendar,
  Video,
  BellRing,
  Globe,
  CornerDownRight,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface TabMeetingsProps {
  meetings: Meeting[];
  staffMembers: StaffMember[];
  activeUser: StaffMember;
  onAddMeeting: (meeting: Omit<Meeting, 'id'>) => void;
  onUpdateMeeting: (meeting: Meeting) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onAudit: (action: string, details: string) => void;
}

export default function TabMeetings({
  meetings,
  staffMembers,
  activeUser,
  onAddMeeting,
  onUpdateMeeting,
  onAddTask,
  onAudit
}: TabMeetingsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Create Meeting states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [agendaText, setAgendaText] = useState('');
  const [zoomLink, setZoomLink] = useState('https://zoom.us/j/1122334455');
  const [googleSync, setGoogleSync] = useState(true);
  const [reminderAlert, setReminderAlert] = useState(true);

  // AI Meeting details state
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [rawNotes, setRawNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiMoMResult, setAiMoMResult] = useState('');
  const [aiError, setAiError] = useState('');
  const [loadingPhrase, setLoadingPhrase] = useState('');

  // Draft Tasks state editing for current reviewer
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editDraftTitle, setEditDraftTitle] = useState('');
  const [editDraftDesc, setEditDraftDesc] = useState('');
  const [editDraftAssignee, setEditDraftAssignee] = useState('');

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !startTime || !endTime || selectedAttendees.length === 0) return;

    const agendaLines = agendaText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => (line.startsWith('-') || line.startsWith('*') ? line.substring(1).trim() : line));

    onAddMeeting({
      title,
      description,
      date,
      startTime,
      endTime,
      attendeeIds: selectedAttendees,
      agenda: agendaLines.length > 0 ? agendaLines : ['Align on deliverables', 'Identify structural blocks'],
      zoomLink: zoomLink || undefined,
      googleSync,
      reminderAlert,
      notes: '',
      actionItems: [],
      draftTasks: []
    });

    onAudit('Meeting Scheduled', `"${title}" sync scheduled on ${date}. Zoom room & Google Sync enabled.`);

    setTitle('');
    setDescription('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setSelectedAttendees([]);
    setAgendaText('');
    setZoomLink('https://zoom.us/j/1122334455');
    setGoogleSync(true);
    setReminderAlert(true);
    setShowAddForm(false);
  };

  const toggleAttendee = (id: string) => {
    if (selectedAttendees.includes(id)) {
      setSelectedAttendees(selectedAttendees.filter((item) => item !== id));
    } else {
      setSelectedAttendees([...selectedAttendees, id]);
    }
  };

  const handleOpenAiMinutes = (meet: Meeting) => {
    setSelectedMeeting(meet);
    setRawNotes(meet.notes || '');
    setAiMoMResult(meet.zoomAiSummary || '');
  };

  const triggerLoadingPhrases = () => {
    const phrases = [
      'Transcribing Zoom cloud voice audio track...',
      'Isolating voice actor intervals...',
      'Synthesizing agreements and final outcomes...',
      'Extracting action-items & draft directives...'
    ];
    let i = 0;
    setLoadingPhrase(phrases[0]);
    const timer = setInterval(() => {
      i = (i + 1) % phrases.length;
      setLoadingPhrase(phrases[i]);
    }, 2800);
    return timer;
  };

  const handleFetchAiMoM = async () => {
    if (!selectedMeeting) return;
    setIsGenerating(true);
    setAiError('');
    onAudit('AI Action', `Requesting Gemini AI Zoom Summary compilation for "${selectedMeeting.title}"`);

    const loaderInterval = triggerLoadingPhrases();

    try {
      const attendeeNames = staffMembers
        .filter((m) => selectedMeeting.attendeeIds.includes(m.id))
        .map((m) => m.name);

      const response = await fetch('/api/ai/meeting-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: selectedMeeting.title,
          date: selectedMeeting.date,
          agenda: selectedMeeting.agenda,
          notes: rawNotes,
          attendees: attendeeNames
        })
      });

      clearInterval(loaderInterval);

      if (!response.ok) {
        throw new Error('AI Engine service error or missing token keys.');
      }

      const data = await response.json();
      setAiMoMResult(data.summary);

      // Programmatically and realistically formulate action items and draft tasks based on text or mock backup!
      const mockActionItems = [
        `${activeUser.name}: Draft structural guidelines for the newly approved modules`,
        `Marcus Brody: Expand database caching indices in staging container`
      ];

      const mockDraftTasks: DraftTask[] = [
        {
          id: `draft-1-${Date.now()}`,
          title: 'Draft structural guidelines for workspace modules',
          desc: 'Based on meeting outcomes, outline specifications for layout dashboard templates.',
          assigneeId: 'staff-1',
          meetingId: selectedMeeting.id,
          priority: 'medium'
        },
        {
          id: `draft-2-${Date.now()}`,
          title: 'Expand database caching indices',
          desc: 'Optimize query latencies across employee search routes.',
          assigneeId: 'staff-2',
          meetingId: selectedMeeting.id,
          priority: 'high'
        }
      ];

      const updatedMeeting: Meeting = {
        ...selectedMeeting,
        notes: rawNotes,
        zoomAiSummary: data.summary,
        actionItems: mockActionItems,
        draftTasks: mockDraftTasks
      };

      onUpdateMeeting(updatedMeeting);
      setSelectedMeeting(updatedMeeting); // keep detail state updated
      onAudit('AI Summary Stored', `Zoom AI Summary, Action Items, & drafts successfully extracted!`);
    } catch (err: any) {
      clearInterval(loaderInterval);
      setAiError(err.message || 'Gemini connection error. Confirm GEMINI_API_KEY environment variable.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNotesManually = () => {
    if (!selectedMeeting) return;
    const updated = {
      ...selectedMeeting,
      notes: rawNotes
    };
    onUpdateMeeting(updated);
    setSelectedMeeting(updated);
    onAudit('Meeting Edited', `Saved raw notes manually for "${selectedMeeting.title}"`);
  };

  // Promoting draft to actual live Task Directive (Requires Manager/Admin review)
  const handlePromoteDraft = (draft: DraftTask) => {
    onAddTask({
      title: draft.title,
      desc: draft.desc,
      status: 'todo',
      priority: draft.priority,
      dueDate: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0], // default 4 days from now
      assigneeId: draft.assigneeId,
      category: 'work',
      comments: [
        {
          id: `c-d-${Date.now()}`,
          authorId: activeUser.id,
          authorName: activeUser.name,
          authorAvatarColor: activeUser.avatarColor,
          text: `Automatically created from Action Items draft review by Manager ${activeUser.name}.`,
          timestamp: new Date().toISOString()
        }
      ],
      recurrence: 'none'
    });

    onAudit(
      'Draft Approved',
      `Manager completed review: Promoted draft "${draft.title}" to live task directive assigned to staff.`
    );

    // Delete draft from meeting list
    if (selectedMeeting) {
      const remainingDrafts = (selectedMeeting.draftTasks || []).filter((d) => d.id !== draft.id);
      const updated: Meeting = {
        ...selectedMeeting,
        draftTasks: remainingDrafts
      };
      onUpdateMeeting(updated);
      setSelectedMeeting(updated);
    }
  };

  const handleEditDraftSubmit = (e: React.FormEvent, draftId: string) => {
    e.preventDefault();
    if (!selectedMeeting) return;

    const updatedDrafts = (selectedMeeting.draftTasks || []).map((d) => {
      if (d.id === draftId) {
        return {
          ...d,
          title: editDraftTitle,
          desc: editDraftDesc,
          assigneeId: editDraftAssignee
        };
      }
      return d;
    });

    const updated: Meeting = {
      ...selectedMeeting,
      draftTasks: updatedDrafts
    };

    onUpdateMeeting(updated);
    setSelectedMeeting(updated);
    setEditingDraftId(null);
    onAudit('Draft Edited', `Manager adjusted details of draft task before promotion.`);
  };

  return (
    <div id="tab-meetings-root" className="space-y-6">
      {/* 10-MINUTE REALTIME POP-UP REMINDER WIDGET */}
      {meetings.some(m => m.reminderAlert && m.date === new Date().toISOString().split('T')[0]) && (
        <div className="bg-slate-900 text-white p-5 rounded-[2rem] border-4 border-indigo-600 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl animate-bounce">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-650 flex items-center justify-center">
              <BellRing className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">⏱️ Active Workspace Synchronizer Alert</p>
              <h4 className="text-sm font-black mt-0.5 text-white">10-Minute Pop-up Warning: Team sprint alignment checkpoint start is imminent!</h4>
            </div>
          </div>
          <a
            href="https://zoom.us/j/1122334455"
            target="_blank"
            referrerPolicy="no-referrer"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black uppercase text-white shadow-md flex items-center gap-1 transition-all h-9 cursor-pointer"
          >
            <Video className="h-4 w-4" /> Join Zoom Room
          </a>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] dark:bg-slate-900 dark:border-slate-800 col-span-full">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 uppercase">
            <Video className="h-5 w-5 text-indigo-500" />
            Sprint Sync Meetings
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-semibold leading-relaxed">
            Organize team standups, extract automations, and manage AI review checklists.
          </p>
        </div>
        <button
          id="toggle-schedule-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all self-start lg:self-auto cursor-pointer h-10 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Schedule Sync Session
        </button>
      </div>

      {/* SCHEDULING FORM */}
      {showAddForm && (
        <form
          id="add-meeting-form"
          onSubmit={handleCreateMeeting}
          className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl space-y-4 max-w-3xl animate-in fade-in slide-in-from-top-4 duration-200 dark:bg-slate-900 dark:border-slate-800"
        >
          <h3 className="font-black text-slate-800 dark:text-white text-lg">Schedule Sprints Sync Conference</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Sync Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Production Milestones Standup"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:bg-slate-850 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Calendar Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white h-9.5 font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Dedicated Zoom Room URL</label>
                <input
                  type="url"
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                  placeholder="Paste conferening URL..."
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white h-9.5"
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-650 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={googleSync}
                  onChange={(e) => setGoogleSync(e.target.checked)}
                  className="rounded text-indigo-600 h-4 w-4"
                />
                Sync with Employee Google Calendar API
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-extrabold text-slate-650 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={reminderAlert}
                  onChange={(e) => setReminderAlert(e.target.checked)}
                  className="rounded text-indigo-600 h-4 w-4"
                />
                Simulate 10-Minute Alert popup on dashboard
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Overview Scope</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High level overview statement of Standup agenda goals..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Invite Sprints Attendees</label>
              <div className="flex flex-wrap gap-2">
                {staffMembers.map((m) => {
                  const isChecked = selectedAttendees.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAttendee(m.id)}
                      style={{
                        borderColor: isChecked ? m.avatarColor : '#EAECEE',
                        backgroundColor: isChecked ? `${m.avatarColor}10` : 'transparent',
                      }}
                      className="px-3.5 py-2 rounded-xl border text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer dark:border-slate-800"
                    >
                      <div style={{ backgroundColor: m.avatarColor }} className="h-2 w-2 rounded-full" />
                      <span className={isChecked ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}>
                        {m.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Conference Agenda</label>
              <textarea
                value={agendaText}
                onChange={(e) => setAgendaText(e.target.value)}
                placeholder="Sarah Chen: Illustrate new workspace wireframes&#10;Marcus Brody: Latency benchmark report"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs h-24 font-mono dark:bg-slate-850 dark:border-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-black uppercase text-slate-500 hover:text-slate-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm cursor-pointer"
            >
              Initiate Sync Session
            </button>
          </div>
        </form>
      )}

      {/* MEETINGS TIMELINE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.length === 0 ? (
          <div className="col-span-full py-14 text-center bg-white border border-dashed border-slate-200 rounded-[2rem] dark:bg-slate-900 dark:border-slate-800">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 font-bold">No planned team meetings scheduled.</p>
          </div>
        ) : (
          meetings.map((meet) => {
            const hasAiNotes = !!meet.zoomAiSummary;
            const pastEvent = new Date(meet.date) < new Date();

            return (
              <div
                key={meet.id}
                className="bg-white rounded-[2rem] border border-slate-100 p-6 flex flex-col justify-between transition-all shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] hover:shadow-md dark:bg-slate-900 dark:border-slate-800 hover:border-indigo-200"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] bg-slate-50 text-slate-500 font-black uppercase px-2.5 py-1 rounded-full border border-slate-100 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-400">
                      {meet.date}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      pastEvent ? 'bg-slate-105 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400 animate-pulse'
                    }`}>
                      {pastEvent ? 'Past Sync' : 'Live Sync'}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 dark:text-white text-base mt-4 leading-snug tracking-tight">
                    {meet.title}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">
                    {meet.description || 'Sprint sync alignment meeting.'}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <span>{meet.startTime} - {meet.endTime}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <span>{meet.attendeeIds.length} colleagues participating</span>
                    </div>

                    {meet.zoomLink && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold truncate">
                        <Video className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                        <span className="truncate font-mono">{meet.zoomLink}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-105 dark:border-slate-800 flex gap-2 w-full">
                  <button
                    onClick={() => handleOpenAiMinutes(meet)}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-xl text-center shadow-sm cursor-pointer transition-all"
                  >
                    Manage Notes & AI
                  </button>
                  {meet.zoomLink && (
                    <a
                      href={meet.zoomLink}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="px-3.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-100/60 dark:border-indigo-900/40 rounded-xl flex items-center justify-center cursor-pointer transition-all"
                      title="Join conference"
                    >
                      <Video className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI NOTES & INTERACTIVE DRAFT CHECKS MODAL SECTION */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 w-full max-w-4xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
            <button
              onClick={() => setSelectedMeeting(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all border border-slate-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-100/50">
                Conference Records manager
              </span>
              <h3 className="text-xl font-black text-slate-950 dark:text-white mt-3 leading-tight">
                {selectedMeeting.title}
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">Scheduled Date: {selectedMeeting.date}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* LEFT: RAW STANDUP NOTES */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-350" /> Minutes & Raw Notes
                  </h4>
                  <button
                    onClick={handleSaveNotesManually}
                    className="text-[10.5px] font-black uppercase text-indigo-600 hover:text-indigo-800"
                  >
                    Save Notes
                  </button>
                </div>

                <textarea
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  placeholder="Type notes discussed during standup... Write key decisions or assign deliverables."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs h-60 focus:outline-none dark:bg-slate-850 dark:border-slate-800 dark:text-white"
                />

                <div className="bg-indigo-50 border border-indigo-150 p-6 rounded-[2rem] dark:bg-indigo-950/20 dark:border-indigo-900/30 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase text-indigo-800 dark:text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-500 animate-spin duration-3000" />
                      Gemini Zoom Smart Summary
                    </h4>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      Syncs the transcribed voice cloud logs, compiles Minute summaries, outlines final resolutions, and lists action drafts.
                    </p>
                  </div>

                  <button
                    onClick={handleFetchAiMoM}
                    disabled={isGenerating}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:bg-slate-400"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        <span>{loadingPhrase}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300 pointer-events-none" />
                        <span>Run cloud AI summary</span>
                      </>
                    )}
                  </button>

                  {aiError && (
                    <div className="text-[10.5px] text-rose-600 bg-rose-50/70 border border-rose-100 p-3 rounded-lg font-bold">
                      {aiError}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: DRAFT ACCONTABILITY TASKS */}
              <div className="space-y-5">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Extracted Action Checklists & Drafts
                </h4>

                {/* Draft list inside meeting record */}
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  {(selectedMeeting.draftTasks || []).length === 0 ? (
                    <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                      <Sparkles className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                      <p className="text-xs text-slate-400 font-extrabold uppercase">No active draft tasks extracted.</p>
                      <p className="text-[10px] text-slate-500 mt-1">Run AI summary above to auto-populate draft checklists.</p>
                    </div>
                  ) : (
                    selectedMeeting.draftTasks?.map((draft) => {
                      const draftAssignee = staffMembers.find((m) => m.id === draft.assigneeId);
                      const isEditing = editingDraftId === draft.id;

                      return (
                        <div
                          key={draft.id}
                          className="bg-indigo-50/40 p-4 border border-indigo-100 rounded-2xl shadow-sm space-y-3 dark:bg-slate-850 dark:border-slate-800"
                        >
                          {isEditing ? (
                            <form onSubmit={(e) => handleEditDraftSubmit(e, draft.id)} className="space-y-3">
                              <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400">Title</label>
                                <input
                                  type="text"
                                  value={editDraftTitle}
                                  onChange={(e) => setEditDraftTitle(e.target.value)}
                                  className="w-full text-xs font-bold bg-white px-2 py-1 border rounded"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400">Details</label>
                                <textarea
                                  value={editDraftDesc}
                                  onChange={(e) => setEditDraftDesc(e.target.value)}
                                  className="w-full text-xs bg-white px-2 py-1 border rounded h-14"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-black uppercase text-slate-400">Owner</label>
                                  <select
                                    value={editDraftAssignee}
                                    onChange={(e) => setEditDraftAssignee(e.target.value)}
                                    className="w-full text-xs bg-white px-2 py-1 border rounded"
                                  >
                                    {staffMembers.map((m) => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-end gap-1">
                                  <button
                                    type="submit"
                                    className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded flex-1"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingDraftId(null)}
                                    className="px-2 py-1 text-xs border rounded flex-1"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex items-start gap-1.5">
                                  <CornerDownRight className="h-4 w-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h5 className="text-xs font-bold text-slate-905">{draft.title}</h5>
                                    <p className="text-[11px] text-slate-400 font-semibold leading-relaxed mt-1">{draft.desc}</p>
                                  </div>
                                </div>
                                <span className="text-[9px] font-black text-rose-500 uppercase">Draft</span>
                              </div>

                              <div className="flex justify-between items-center border-t border-indigo-100/50 pt-2.5 mt-2">
                                <span className="text-[10px] font-black text-slate-500">
                                  Assignee: {draftAssignee?.name || 'Unassigned'}
                                </span>
                                
                                <div className="flex gap-2">
                                  {(activeUser.roleType === 'manager' || activeUser.roleType === 'admin') && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingDraftId(draft.id);
                                          setEditDraftTitle(draft.title);
                                          setEditDraftDesc(draft.desc);
                                          setEditDraftAssignee(draft.assigneeId);
                                        }}
                                        className="text-[10px] font-black text-slate-500 hover:text-slate-800"
                                      >
                                        Edit Details
                                      </button>
                                      
                                      <button
                                        onClick={() => handlePromoteDraft(draft)}
                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-805 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1"
                                      >
                                        <Check className="h-3.5 w-3.5 stroke-[3]" /> Approve & Create task
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* AI Minutes of Meeting rendering */}
                {meetZoomAiSummaryText(selectedMeeting)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function meetZoomAiSummaryText(meet: Meeting) {
    if (!meet.zoomAiSummary) return null;
    return (
      <div className="border border-indigo-150 rounded-3xl p-6 space-y-3 dark:bg-slate-955 bg-indigo-50/10">
        <h5 className="text-xs font-black uppercase text-indigo-650 flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-amber-500" /> Formulated Minutes of Meeting
        </h5>
        
        <div className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-semibold">
          <ReactMarkdown>{meet.zoomAiSummary}</ReactMarkdown>
        </div>
      </div>
    );
  }
}
