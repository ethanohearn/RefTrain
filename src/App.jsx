import React, { useState, useMemo } from 'react';
import { Activity, Calendar as CalendarIcon, ShieldAlert, Timer, TrendingUp, Home, CheckCircle2, Plane, Flag, Thermometer, Dumbbell, Waves, Anchor, Save } from 'lucide-react';

const REGIONS = ['Groin/Adductor', 'Hamstring', 'Calf/Achilles', 'Knee', 'Ankle'];

const REHAB_PROTOCOLS = {
  'Groin/Adductor': ["Modified Progressive Copenhagen Adduction (MPCA) - Isometric holds (Level 1-3).", "Supine isometric ball squeezes between knees (5 x 10s).", "Avoid wide lateral shuffling."],
  'Hamstring': ["Isometric Supine Bridge holds (heel digging into floor) - 4 x 20s.", "Nordic Hamstring Curls (assisted/eccentric only) - 2 x 4 reps.", "Limit running to < 70% max speed."],
  'Calf/Achilles': ["Isometric Calf Raises (hold top and bottom positions for 5s) - 3 x 10.", "Seated soleus raises with moderate weight.", "Avoid plyometrics and the Interval Run test."],
  'Knee': ["Spanish Squats (isometric hold with band behind knees) - 3 x 45s.", "Straight Leg Raises and Quad sets.", "Avoid deep squats and hard deceleration mechanics."],
  'Ankle': ["Single-leg balance on unstable surface (Airex pad) - 3 x 60s/leg.", "Resistance band 4-way ankle strengthening.", "Avoid uneven surfaces and rapid pivoting."]
};

const getDateStr = (year, monthIndex, day) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const getTodayStr = () => { const d = new Date(); return getDateStr(d.getFullYear(), d.getMonth(), d.getDate()); };
const addDays = (dateStr, days) => { const [y, m, d] = dateStr.split('-').map(Number); const date = new Date(y, m - 1, d + days); return getDateStr(date.getFullYear(), date.getMonth(), date.getDate()); };

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5, 1)); // Default to June 2026
  const [syncStatus, setSyncStatus] = useState('saved'); 
  
  const defaultSeeds = useMemo(() => ({
    '2026-06-06': { type: 'match', difficulty: 3, injury: false },
    '2026-06-13': { type: 'match', difficulty: 4, injury: false },
    '2026-06-21': { type: 'match', difficulty: 3, injury: false },
    '2026-06-24': { type: 'match', difficulty: 5, injury: false },
  }), []);

  const [events, setEvents] = useState(() => {
    try { const local = localStorage.getItem('reftrain_matches'); if (local) return JSON.parse(local); } catch (e) {}
    return defaultSeeds;
  });

  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventType, setEventType] = useState('none');
  const [matchDifficulty, setMatchDifficulty] = useState(3);
  const [isInjured, setIsInjured] = useState(false);
  const [injuryRegion, setInjuryRegion] = useState('Groin/Adductor');

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const getNextMatchDate = (targetDateStr) => {
    for(let i=1; i<=30; i++) {
      const checkStr = addDays(targetDateStr, i);
      if (events[checkStr]?.type === 'match') return { dateStr: checkStr, daysUntil: i, difficulty: events[checkStr].difficulty };
    }
    return null;
  };

  const getPrevMatchDate = (targetDateStr) => {
    for(let i=1; i<=14; i++) {
      const checkStr = addDays(targetDateStr, -i);
      if (events[checkStr]?.type === 'match') return { dateStr: checkStr, daysSince: i, difficulty: events[checkStr].difficulty };
    }
    return null;
  };

  const getWeeklyMatchCount = (targetDateStr) => {
    let count = 0;
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const centerDate = new Date(y, m - 1, d);
    const startOfWeek = new Date(centerDate.setDate(centerDate.getDate() - centerDate.getDay()));
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startOfWeek); checkDate.setDate(checkDate.getDate() + i);
      const checkStr = getDateStr(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      if (events[checkStr]?.type === 'match') count++;
    }
    return count;
  };

  const getPrescription = (targetDateStr) => {
    const targetEvent = events[targetDateStr] || { type: 'none', injury: false };
    const nextMatch = getNextMatchDate(targetDateStr);
    const prevMatch = getPrevMatchDate(targetDateStr);
    const dayOfWeek = new Date(targetDateStr + 'T00:00:00').getDay();

    // 1. Injury & Rehabilitation Override (IP Category)
    if (targetEvent.injury) {
      return { 
        shortTitle: "Rehab (IP)", 
        colorClass: "text-red-400 bg-red-400/10 border-red-500/20", 
        phase: "INJURY PREVENTION & REHAB", 
        focus: `Active Recovery & ${targetEvent.injuryRegion} Protection`, 
        details: "USSF Protocol: Standard periodization suspended for tissue protection.", 
        workout: REHAB_PROTOCOLS[targetEvent.injuryRegion] || ["12-Min Core Circuit (modified)", "Stationary bike flush"], 
        icon: <Thermometer className="w-6 h-6 text-red-500" /> 
      };
    }

    // 2. Match Day (MD)
    if (targetEvent.type === 'match') {
      return { 
        shortTitle: "Match Day (MD)", 
        colorClass: "text-white bg-blue-600 border-blue-500 shadow-sm", 
        phase: "MATCH DAY OPERATIONS", 
        focus: "Peak Performance & Hydration", 
        details: "USSF Protocol: Complete 15-25 min warm-up (Jogging, Mobility, Dynamic Stretching, Agility, Short Accels). Post-match rehydrate immediately.", 
        workout: ["Pre-Match Phase 1-5 Warm-up", "Match Officiating Duty", "Post-Match Hydration + 20g Protein within 30m"], 
        icon: <Timer className="w-6 h-6 text-blue-100" /> 
      };
    }

    // 3. MD+1: Active Recovery (LI Active Recovery)
    if (prevMatch && prevMatch.daysSince === 1) {
      return { 
        shortTitle: "MD+1 Recovery", 
        colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", 
        phase: "MD+1: LOW INTENSITY ACTIVE RECOVERY", 
        focus: "Flush Metabolic Waste & Leg Turnover", 
        details: "USSF Standard: 30 min continuous jog at 5.0-7.5 mph on soft surface, OR 60 min cycling / 45 min cross-trainer.", 
        workout: ["Option A: 30-min recovery jog (accelerate 100m every 5 min)", "Option B: 60-min Cycling (HR < 70% HRmax)", "Post-session static stretching"], 
        icon: <Activity className="w-6 h-6 text-cyan-400" /> 
      };
    }

    // 4. MD-1: Sharpen / Taper (CNS Activation)
    if (nextMatch && nextMatch.daysUntil === 1) {
      return { 
        shortTitle: "MD-1 Sharpen", 
        colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", 
        phase: "MD-1: SHARPEN & CNS PRIMING", 
        focus: "Explosive Activation without Fatigue", 
        details: "USSF Standard: Keep distance short, intensity high. Upper body strength or short acceleration bursts.", 
        workout: ["Running Technique: A-skips & B-skips (2x16yd)", "4 short acceleration bursts (10m-15m) at 100%", "12-Minute Core Circuit (20s work / 10s rest)"], 
        icon: <TrendingUp className="w-6 h-6 text-emerald-500" /> 
      };
    }

    // 5. MD-2: Intensity Load (HII / SE / St SP)
    if (nextMatch && nextMatch.daysUntil === 2) {
      return { 
        shortTitle: "MD-2 Intensity", 
        colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20", 
        phase: "MD-2: INTENSITY LOAD & SPEED ENDURANCE", 
        focus: "High-Speed Running & Match Simulation", 
        details: "USSF Standard: High intensity and speed, short distances. Field-run interval training.", 
        workout: ["Endurance Interval High Intensity (HII): 3 sets of 5 laps", "Speed Endurance (SE) or Starting Speed drills", "Stretching & Foam rolling"], 
        icon: <Timer className="w-6 h-6 text-blue-400" /> 
      };
    }

    // 6. MD-3: RSA & Agility
    if (nextMatch && nextMatch.daysUntil === 3) {
      return { 
        shortTitle: "MD-3 RSA/Agi", 
        colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", 
        phase: "MD-3: REPEATED SPRINT ABILITY & AGILITY", 
        focus: "Incomplete Recovery Sprints & CODA Drills", 
        details: "USSF Standard: Repeated Sprint Ability (RSA) 3 sets of 5 laps, plus Ladder agility or Star drills.", 
        workout: ["RSA: Relaxed-jog recovery sprints (3 x 5 laps)", "Coordination & Agility: Ladder 4 exercises into sprint", "12-Minute Core Circuit"], 
        icon: <Activity className="w-6 h-6 text-indigo-400" /> 
      };
    }

    // Default General Weekly Fallback (GPP / Off-Season)
    return { 
      shortTitle: "GPP Maintenance", 
      colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", 
      phase: "GENERAL PHYSICAL PREPARATION (GPP)", 
      focus: "Base Strength & Aerobic Efficiency", 
      details: "USSF Standard: Maintain 4 sessions/week balancing endurance, strength, and core stability.", 
      workout: ["Endurance Duration (HID): 30-45 min continuous run or interval blocks", "Strength (STR): Basic strength circuit (4 sets of 6 reps)", "12-Minute Core Circuit"], 
      icon: <Dumbbell className="w-6 h-6 text-emerald-400" /> 
    };
  };


  const handleDayClick = (day) => {
    const dateStr = getDateStr(year, month, day); setSelectedDateStr(dateStr);
    const existing = events[dateStr] || { type: 'none', difficulty: 3, injury: false, injuryRegion: 'Groin/Adductor' };
    setEventType(existing.type); setMatchDifficulty(existing.difficulty || 3); setIsInjured(existing.injury); setInjuryRegion(existing.injuryRegion || 'Groin/Adductor');
    setIsModalOpen(true);
  };

  const saveEvent = () => {
    const updatedEvents = { ...events, [selectedDateStr]: { type: eventType, difficulty: eventType === 'match' ? matchDifficulty : null, injury: isInjured, injuryRegion: isInjured ? injuryRegion : null } };
    setEvents(updatedEvents); setSyncStatus('saving');
    try { localStorage.setItem('reftrain_matches', JSON.stringify(updatedEvents)); setTimeout(() => setSyncStatus('saved'), 400); } catch (e) {}
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex justify-center font-sans">
      <div className="w-full max-w-md bg-slate-900 shadow-2xl flex flex-col relative overflow-hidden">
        <header className="px-6 pt-12 pb-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-10 flex justify-between items-center">
          <div><h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">RefTrain</h1><p className="text-[10px] text-slate-400 tracking-[0.2em] uppercase font-bold mt-1">Periodization Hub</p></div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <Save className={`w-3.5 h-3.5 ${syncStatus === 'saving' ? 'text-yellow-400 animate-spin' : 'text-emerald-400'}`} />
            <span>{syncStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 custom-scrollbar">
          {activeTab === 'calendar' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg></button>
                <h2 className="text-white font-black text-lg tracking-wide uppercase">{currentMonth.toLocaleString('default', { month: 'long' })} {year}</h2>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg></button>
              </div>
              <div className="bg-slate-900 rounded-xl p-2 border border-slate-800 shadow-inner">
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-500 pb-2 pt-1">{day}</div>)}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="min-h-[6.5rem] bg-slate-900/30 border border-slate-800/50 rounded-lg"></div>)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1; const dateStr = getDateStr(year, month, d); const isToday = dateStr === getTodayStr(); const rx = getPrescription(dateStr); const hasInj = events[dateStr]?.injury; const isM = events[dateStr]?.type === 'match';
                    return (
                      <div key={d} onClick={() => handleDayClick(d)} className={`min-h-[6.5rem] relative border rounded-lg cursor-pointer hover:bg-slate-700 p-1 flex flex-col justify-between ${isToday ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-slate-800 bg-slate-800/40'} ${hasInj ? 'ring-1 ring-red-500/50' : ''}`}>
                        <div className="w-full">
                          <span className={`text-xs font-bold pl-1 ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>{d}</span>
                          {!isM && events[dateStr]?.type !== 'travel' && events[dateStr]?.type !== '4th' && <div className={`mt-1 w-full text-[9px] font-bold px-1 py-0.5 rounded border truncate leading-tight ${rx.colorClass}`}>{rx.shortTitle}</div>}
                        </div>
                        <div className="w-full flex flex-col gap-0.5">
                          {hasInj && <div className="w-full h-1 bg-red-500 rounded-full mb-0.5"></div>}
                          {isM && <div className="w-full text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded leading-tight text-center shadow">MATCH ({events[dateStr].difficulty})</div>}
                          {events[dateStr]?.type === 'travel' && <div className="w-full text-[9px] font-bold bg-slate-600 text-white px-1.5 py-0.5 rounded leading-tight text-center">TRAVEL</div>}
                          {events[dateStr]?.type === '4th' && <div className="w-full text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.5 rounded leading-tight text-center">4TH OFF</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'today' && (
            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
              <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Today's Action Plan</h2>
              {(() => { const rx = getPrescription(getTodayStr()); return (
                <>
                  <div className="flex items-center gap-4 mb-5"><div className={`p-3 rounded-xl bg-slate-900 border ${rx.phase.includes('REHAB') ? 'border-red-500' : 'border-slate-700'}`}>{rx.icon}</div><div><h2 className={`font-black text-xl leading-tight ${rx.phase.includes('REHAB') ? 'text-red-400' : 'text-white'}`}>{rx.phase}</h2><p className="text-slate-400 text-sm font-medium">{rx.focus}</p></div></div>
                  <p className="text-sm text-slate-300 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">{rx.details}</p>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Protocol Requirements</h3>
                  <ul className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">{rx.workout.map((item, index) => <li key={index} className="flex gap-3 text-sm text-slate-200"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /><span>{item}</span></li>)}</ul>
                </>
              );})()}
            </div>
          )}
        </main>

        <nav className="absolute bottom-0 w-full bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around p-4 pb-8 z-20">
          <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 ${activeTab === 'calendar' ? 'text-blue-400' : 'text-slate-500'}`}><CalendarIcon className="w-6 h-6" /><span className="text-[10px] font-bold uppercase tracking-wider">Month</span></button>
          <button onClick={() => setActiveTab('today')} className={`flex flex-col items-center gap-1 ${activeTab === 'today' ? 'text-blue-400' : 'text-slate-500'}`}><Home className="w-6 h-6" /><span className="text-[10px] font-bold uppercase tracking-wider">Today</span></button>
        </nav>

        {isModalOpen && selectedDateStr && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end p-0 sm:p-4 animate-in fade-in">
            <div className="bg-slate-900 w-full h-[90vh] sm:h-auto rounded-t-3xl sm:rounded-2xl border-t border-slate-700 shadow-2xl flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
                <div><h3 className="text-xl font-black text-white">{new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}</h3><p className="text-slate-400 text-xs font-bold uppercase mt-1">Day Planner</p></div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full">✕</button>
              </div>
              <div className="p-6 overflow-y-auto space-y-8">
                {(() => { const rx = getPrescription(selectedDateStr); return (
                  <div className="space-y-4"><h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Activity className="w-4 h-4"/> Scheduled Protocol</h4><div className="bg-slate-800 p-5 rounded-2xl border border-slate-700"><div className="flex items-center gap-3 mb-3"><div className="p-2 rounded-lg bg-slate-900 border border-slate-700">{rx.icon}</div><div><h2 className="font-bold text-white">{rx.phase}</h2><p className="text-blue-400 text-xs font-semibold">{rx.focus}</p></div></div><ul className="space-y-2 mt-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">{rx.workout.map((item, i) => <li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-slate-600 font-bold">•</span><span>{item}</span></li>)}</ul></div></div>
                );})()}
                <div className="space-y-6 pb-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> Settings</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setEventType('none')} className={`p-3 rounded-xl border text-sm font-bold ${eventType === 'none' ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>Rest/Train</button>
                    <button onClick={() => setEventType('match')} className={`p-3 rounded-xl border text-sm font-bold flex gap-2 justify-center ${eventType === 'match' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}><Timer className="w-4 h-4"/> Match</button>
                    <button onClick={() => setEventType('4th')} className={`p-3 rounded-xl border text-sm font-bold flex gap-2 justify-center ${eventType === '4th' ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}><Flag className="w-4 h-4"/> 4th Off</button>
                    <button onClick={() => setEventType('travel')} className={`p-3 rounded-xl border text-sm font-bold flex gap-2 justify-center ${eventType === 'travel' ? 'bg-slate-600/20 border-slate-400 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}><Plane className="w-4 h-4"/> Travel</button>
                  </div>
                  {eventType === 'match' && (
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Match Load</label>
                      <input type="range" min="1" max="5" value={matchDifficulty} onChange={(e) => setMatchDifficulty(Number(e.target.value))} className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none" />
                      <div className="flex justify-between text-xs font-medium text-slate-500 mt-2"><span>1 (Easy)</span><span className="text-blue-400 text-xl font-black">{matchDifficulty}</span><span>5 (Hard)</span></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex gap-2 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-4 rounded-xl text-xs uppercase">Cancel</button>
                <button onClick={saveEvent} className="flex-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase py-4 px-8 rounded-xl shadow-lg">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
