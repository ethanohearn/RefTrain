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
    const weeklyMatchCount = getWeeklyMatchCount(targetDateStr);
    const dayOfWeek = new Date(targetDateStr + 'T00:00:00').getDay();

    if (targetEvent.injury) return { shortTitle: "Rehab", colorClass: "text-red-400 bg-red-400/10 border-red-500/20", phase: "REHABILITATION PROTOCOL", focus: `${targetEvent.injuryRegion} Protection`, details: "Standard periodization suspended. Focus on rehab.", workout: REHAB_PROTOCOLS[targetEvent.injuryRegion], icon: <Thermometer className="w-6 h-6 text-red-500" /> };
    if (targetEvent.type === 'match') return { shortTitle: "Match Day", colorClass: "text-white bg-blue-600 border-blue-500 shadow-sm", phase: `MATCH DAY (Load: ${targetEvent.difficulty || 3}/5)`, focus: "Peak Performance", details: "High-stress match environment. Optimize hydration.", workout: ["Pre-match: Phase 1 & 2 Warm-up.", "Phase 3: 4-6 short linear sprints.", "Post-match: Instant hydration + 20g protein."], icon: <Timer className="w-6 h-6 text-blue-100" /> };
    if (targetEvent.type === 'travel') return { shortTitle: "Travel Flush", colorClass: "text-slate-300 bg-slate-600/20 border-slate-500/30", phase: "TRAVEL DAY FLUSH", focus: "Mobility & Decompression", details: "Sitting restricts blood flow. Move without load.", workout: ["15 mins dynamic stretching.", "Spinal decompression (dead hangs).", "Hydrate aggressively: 32oz electrolyte water."], icon: <Plane className="w-6 h-6 text-slate-400" /> };
    if (targetEvent.type === '4th') return { shortTitle: "4th Official", colorClass: "text-purple-300 bg-purple-500/20 border-purple-500/30", phase: "4TH OFFICIAL", focus: "Baseline Mobility", details: "Low running volume, high standing fatigue.", workout: ["Participate fully in crew warm-up.", "Avoid Phase 3 sprints.", "Post-match: 10 mins lower back stretching."], icon: <Flag className="w-6 h-6 text-purple-400" /> };

    if (prevMatch && prevMatch.daysSince === 1 && events[addDays(targetDateStr, -2)]?.type === 'match') {
      const load = (events[addDays(targetDateStr, -2)]?.difficulty || 3) + prevMatch.difficulty;
      if (load >= 6) return { shortTitle: "Pool Flush", colorClass: "text-cyan-400 bg-cyan-500/20 border-cyan-400/30", phase: "TOURNAMENT: POOL FLUSH", focus: "Non-Weightbearing", details: "Consecutive match days. Spare joints entirely.", workout: ["20-30 mins pool recovery.", "No structural lifting or running."], icon: <Anchor className="w-6 h-6 text-cyan-400" /> };
    }
    if (prevMatch && prevMatch.daysSince === 2 && events[addDays(targetDateStr, -3)]?.type === 'match') {
      return { shortTitle: "Low-Impact Z2", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "TOURNAMENT: MD+2 FLUSH", focus: "Metabolic Clearance", details: "Day 2 post-tournament. Clear residual waste.", workout: ["40-60 mins structural Zone 2 cardio (Bike/Elliptical)."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
    }

    if (weeklyMatchCount >= 2) {
      if (dayOfWeek === 0) return { shortTitle: "Mod VO2 & Legs", colorClass: "text-red-400 bg-red-500/10 border-red-500/20", phase: "2-MATCH: COMBINED", focus: "Mod VO2 & Lower Strength", details: "Congested week. Combined load.", workout: ["15x15 intervals x 2 blocks.", "2 sets Goblet Squats + Copenhagen holds."], icon: <TrendingUp className="w-6 h-6 text-red-500" /> };
      if (dayOfWeek === 1) return { shortTitle: "Z2 Flush", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "2-MATCH: RECOVERY", focus: "Low-Impact Flush", details: "Following combined workout. Spare resistance.", workout: ["20-30 mins easy bike ride.", "15 mins deep foam rolling."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
      if (dayOfWeek === 2) return { shortTitle: "Taper & Prime", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", phase: "MD-1: PRIMING", focus: "CNS & Upper Body", details: "Protect legs. Prime CNS.", workout: ["Upper Body Lift (2x10).", "3-4 crisp 10m turf accelerations."], icon: <Activity className="w-6 h-6 text-emerald-500" /> };
      if (dayOfWeek === 4) return { shortTitle: "MD+1 Recovery", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "MD+1: POST-MATCH", focus: "Non-Weightbearing", details: "Flush strain without joint loading.", workout: ["25 mins stationary cycling or pool.", "Avoid running."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
      if (dayOfWeek === 5) return { shortTitle: "Z2 Maintenance", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", phase: "MD-1: PRE-MATCH FLUSH", focus: "Elastic Priming", details: "Prep for second match.", workout: ["15 mins light Zone 2 jog.", "4 sets progressive 40m strides."], icon: <Activity className="w-6 h-6 text-emerald-500" /> };
      if (dayOfWeek === 6) return { shortTitle: "Active Recovery", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "MD+1: ACTIVE RECOVERY", focus: "Decompression", details: "2-match week complete. Dissipate fatigue.", workout: ["30 mins low-impact cardio.", "Extended passive stretching."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
    }

    if (prevMatch && prevMatch.daysSince === 1) return { shortTitle: "MD+1 Recovery", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "MD+1: ACTIVE RECOVERY", focus: "Non-Weightbearing Flush", details: "Spontaneous joint pounding prohibited.", workout: ["25 mins Bike, Rower, or Pool.", "15 mins foam rolling calves/quads."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };

    if (nextMatch) {
      const d = nextMatch.daysUntil;
      if (d === 1) return { shortTitle: "Upper/Prime", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", phase: "MD-1: UPPER & TAPER", focus: "Strength & CNS", details: "Save leg power.", workout: ["Upper Body Lift (3x10).", "3-4 short 10m sprints."], icon: <Dumbbell className="w-6 h-6 text-emerald-500" /> };
      if (d === 2) return { shortTitle: "Sprints/COD", colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20", phase: "MD-2: SPRINTS & COD", focus: "Change of Direction", details: "High intensity speed & cutting.", workout: ["FIFA 11+ Protocol.", "CODA Test Practice.", "3x30m maximum sprints."], icon: <Timer className="w-6 h-6 text-blue-400" /> };
      if (d === 3) return { shortTitle: "Z2 + Lower", colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", phase: "MD-3: Z2 & LOWER", focus: "Aerobic Floor & Base", details: "Targeted conditioning.", workout: ["30 mins Zone 2 jogging/cycling.", "Goblet Squats & RDLs (3x8).", "Copenhagen holds."], icon: <Dumbbell className="w-6 h-6 text-indigo-400" /> };
      if (d === 4) return { shortTitle: "VO2 Max", colorClass: "text-red-500 bg-red-600/10 border-red-500/30", phase: "MD-4: VO2 MAX", focus: "Maximal Stress", details: "Pure cardiovascular threshold. No legs lifting.", workout: ["Norwegian 4x4 intervals.", "Dynamic mobility map."], icon: <TrendingUp className="w-6 h-6 text-red-600" /> };
      if (d === 5) return { shortTitle: "Z2 Cond.", colorClass: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", phase: "MD-5: Z2 CONDITIONING", focus: "Engine Building", details: "Continuous steady-state base.", workout: ["45-60 mins Zone 2 running.", "Trunk stabilization (Planks)."], icon: <Activity className="w-6 h-6 text-yellow-500" /> };
    }

    if (dayOfWeek === 1) return { shortTitle: "Z2 Cond.", colorClass: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", phase: "GPP: Z2 CONDITIONING", focus: "Aerobic Base", details: "Build cardiovascular floor.", workout: ["45-60 mins Zone 2 run/bike.", "Planks & Bird Dogs."], icon: <Activity className="w-6 h-6 text-yellow-400" /> };
    if (dayOfWeek === 2) return { shortTitle: "VO2 Max", colorClass: "text-red-500 bg-red-600/10 border-red-500/30", phase: "GPP: VO2 MAX", focus: "Cardiorespiratory Peak", details: "Mid-week anaerobic peak.", workout: ["Norwegian 4x4 intervals.", "Structural stretching."], icon: <TrendingUp className="w-6 h-6 text-red-500" /> };
    if (dayOfWeek === 3) return { shortTitle: "Z2 + Lower", colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", phase: "GPP: Z2 & LOWER", focus: "Kinetic Chain", details: "Leg strength & aerobic flush.", workout: ["30 mins Zone 2.", "Squats & RDLs (3x8).", "Copenhagen holds."], icon: <Dumbbell className="w-6 h-6 text-indigo-400" /> };
    if (dayOfWeek === 4) return { shortTitle: "Sprints/COD", colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20", phase: "GPP: SPRINTS & COD", focus: "Elastic Priming", details: "Agility tracking mechanics.", workout: ["FIFA 11+ Protocol.", "CODA Test Practice.", "3x30m maximum sprints."], icon: <Timer className="w-6 h-6 text-blue-400" /> };
    if (dayOfWeek === 5) return { shortTitle: "Upper", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", phase: "GPP: UPPER STRENGTH", focus: "Posture & Dynamics", details: "Ensure balanced kinetic chains.", workout: ["Bench Press & Pull-ups (3x10).", "Pallof Presses."], icon: <Dumbbell className="w-6 h-6 text-emerald-500" /> };
    if (dayOfWeek === 6) return { shortTitle: "Long Z2", colorClass: "text-yellow-500 bg-yellow-500/5 border-yellow-500/25", phase: "GPP: EXTENDED AEROBIC", focus: "Endurance Floor", details: "Low-impact endurance base.", workout: ["60-75 mins continuous Zone 2.", "Mobility flow."], icon: <Activity className="w-6 h-6 text-yellow-500" /> };
    
    return { shortTitle: "Active Rest", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "GPP: REST & RECOVERY", focus: "Myofascial Release", details: "Active tissue hydration.", workout: ["15-20 mins yoga flow.", "Full-body foam rolling."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
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
