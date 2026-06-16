import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Calendar as CalendarIcon, ShieldAlert, Timer, TrendingUp, Home, CheckCircle2, Plane, Flag, Thermometer, Dumbbell, Waves, Anchor, Save, ClipboardList, Play, RotateCcw } from 'lucide-react';

// --- DATA & CONSTANTS ---
const REGIONS = ['Groin/Adductor', 'Hamstring', 'Calf/Achilles', 'Knee', 'Ankle'];

const REHAB_PROTOCOLS = {
  'Groin/Adductor': [
    "Modified Progressive Copenhagen Adduction (MPCA) - Isometric holds (Level 1-3).",
    "Supine isometric ball squeezes between knees (5 x 10s).",
    "Avoid wide lateral shuffling and explosive changes of direction."
  ],
  'Hamstring': [
    "Isometric Supine Bridge holds (heel digging into floor) - 4 x 20s.",
    "Nordic Hamstring Curls (assisted/eccentric only) - 2 x 4 reps.",
    "Avoid maximal velocity sprinting. Limit running to < 70% max speed."
  ],
  'Calf/Achilles': [
    "Isometric Calf Raises (hold top and bottom positions for 5s) - 3 x 10.",
    "Seated soleus raises with moderate weight.",
    "Avoid plyometrics, bounding, and the Interval Run test."
  ],
  'Knee': [
    "Spanish Squats (isometric hold with band behind knees) - 3 x 45s.",
    "Straight Leg Raises and Quad sets.",
    "Avoid deep squats and hard deceleration mechanics (CODA test)."
  ],
  'Ankle': [
    "Single-leg balance on unstable surface (Airex pad) - 3 x 60s/leg.",
    "Resistance band 4-way ankle strengthening.",
    "Avoid uneven surfaces and rapid pivoting."
  ]
};

// --- HELPER FUNCTIONS ---
const getDateStr = (year, monthIndex, day) => {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getTodayStr = () => {
  const d = new Date();
  return getDateStr(d.getFullYear(), d.getMonth(), d.getDate());
};

const addDays = (dateStr, days) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return getDateStr(date.getFullYear(), date.getMonth(), date.getDate());
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'today', 'test-prep'
  
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5, 1));
  const [syncStatus, setSyncStatus] = useState('saved'); 
  
  const defaultSeeds = useMemo(() => ({
    '2026-06-06': { type: 'match', difficulty: 3, injury: false },
    '2026-06-13': { type: 'match', difficulty: 4, injury: false },
    '2026-06-21': { type: 'match', difficulty: 3, injury: false },
    '2026-06-24': { type: 'match', difficulty: 5, injury: false },
  }), []);

  const [events, setEvents] = useState(() => {
    try {
      const local = localStorage.getItem('reftrain_matches_v5');
      if (local) return JSON.parse(local);
    } catch (e) {
      console.error("Local storage read error, falling back to seed matches.", e);
    }
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

  // --- RELATIVE BI-DIRECTIONAL PERIODIZATION ENGINE ---
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
      const checkDate = new Date(startOfWeek);
      checkDate.setDate(checkDate.getDate() + i);
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

    if (targetEvent.injury) {
      return { shortTitle: "Rehab", colorClass: "text-red-400 bg-red-400/10 border-red-500/20", phase: "REHABILITATION PROTOCOL", focus: `Active Recovery & ${targetEvent.injuryRegion} Protection`, details: "Body flagged for injury. Standard periodization suspended. Focus solely on foundational rehab movements.", workout: REHAB_PROTOCOLS[targetEvent.injuryRegion], icon: <Thermometer className="w-6 h-6 text-red-500" /> };
    }

    if (targetEvent.type === 'match') {
      const difficulty = targetEvent.difficulty || 3;
      return { shortTitle: "Match Day", colorClass: "text-white bg-blue-600 border-blue-500 shadow-sm", phase: `MATCH DAY (Load: ${difficulty}/5)`, focus: "Peak Performance Operations", details: difficulty >= 4 ? "High-stress match environment. Optimize hydration and metabolic pacing." : "Standard match operations.", workout: ["Pre-match: Phase 1 & 2 Warm-up (Jogging, AR-specific skipping, side-shuffles).", "Phase 3: 4-6 short, high-velocity linear sprints (neuromuscular priming).", "Post-match: Instant hydration + 20g protein intake within 30 minutes."], icon: <Timer className="w-6 h-6 text-blue-100" /> };
    }

    if (targetEvent.type === 'travel') {
      return { shortTitle: "Travel Flush", colorClass: "text-slate-300 bg-slate-600/20 border-slate-500/30", phase: "TRAVEL DAY FLUSH", focus: "Mobility & Hip Decompression", details: "Sitting and travel restrict lower body circulation. Focus entirely on moving without load.", workout: ["15 mins dynamic stretching (deep lunges, hip flexor maps, glute bridges).", "Spinal decompression (dead hangs from pull-up bar, cat-cows).", "Hydrate aggressively: target 32oz electrolyte water."], icon: <Plane className="w-6 h-6 text-slate-400" /> };
    }

    if (targetEvent.type === '4th') {
      return { shortTitle: "4th Official", colorClass: "text-purple-300 bg-purple-500/20 border-purple-500/30", phase: "4TH OFFICIAL ASSIGNMENT", focus: "Cognitive Load & Baseline Mobility", details: "Low physical running volume but high postural standing fatigue.", workout: ["Participate fully in the crew warm-up (Phase 1 & 2 jogging/stretching).", "Avoid high-speed explosive sprints during Phase 3.", "Post-match: 10 mins structural static stretching focusing on lower back and calves."], icon: <Flag className="w-6 h-6 text-purple-400" /> };
    }

    if (prevMatch && prevMatch.daysSince === 1) {
      const dayBeforeYesterdayStr = addDays(targetDateStr, -2);
      const wasConsecutiveMatch = events[dayBeforeYesterdayStr]?.type === 'match';
      if (wasConsecutiveMatch) {
        const cumulativeLoad = (events[dayBeforeYesterdayStr]?.difficulty || 3) + prevMatch.difficulty;
        if (cumulativeLoad >= 6) {
          return { shortTitle: "Pool Flush", colorClass: "text-cyan-400 bg-cyan-500/20 border-cyan-400/30", phase: "TOURNAMENT SURVIVAL: POOL FLUSH", focus: "Strictly Non-Weightbearing Hydrotherapy", details: `Consecutive match days detected with cumulative difficulty of ${cumulativeLoad}/10. Sparing the musculoskeletal system entirely today.`, workout: ["20-30 minutes swimming pool active recovery: Easy laps or water walking.", "The hydrostatic pressure of water assists in reducing lower-extremity inflammation.", "No structural lifting. No running on concrete or pitch grass today."], icon: <Anchor className="w-6 h-6 text-cyan-400" /> };
        }
      }
    }

    if (prevMatch && prevMatch.daysSince === 2) {
      const threeDaysAgoStr = addDays(targetDateStr, -3);
      const wasConsecutiveMatch = events[threeDaysAgoStr]?.type === 'match';
      if (wasConsecutiveMatch) {
        return { shortTitle: "Low-Impact Z2", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "TOURNAMENT SURVIVAL: MD+2 FLUSH", focus: "Low-Impact Metabolic Clearance", details: "Day 2 post-heavy tournament. Clearing residual deep tissue metabolic waste without joint pounding.", workout: ["40-60 minutes structural Zone 2 cardio restricted to: Stationary Bike, Elliptical, Rower, or Cross-Trainer.", "Maintain strict aerobic heart rate profile (< 70% HRmax)."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
      }
    }

    if (weeklyMatchCount >= 2) {
      if (dayOfWeek === 0) return { shortTitle: "Mod VO2 & Legs", colorClass: "text-red-400 bg-red-500/10 border-red-500/20", phase: "2-MATCH MICROCYCLE: COMBINED DAY", focus: "Moderate VO2 Max & Lower Body Strength", details: "Congested 2-match week. Driving VO2 adaptation & structural strength in a compressed window. Next day is locked to high recovery.", workout: ["Cardio: 15x15 interval protocol (15s run at 90%, 15s walk) x 2 blocks.", "Legs: 2 sets Goblet Squats (10 reps) + 1 set Copenhagen holds.", "Tomorrow is fully dedicated to recovery."], icon: <TrendingUp className="w-6 h-6 text-red-500" /> };
      if (dayOfWeek === 1) return { shortTitle: "Z2 Flush", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "2-MATCH MICROCYCLE: RECOVERY FOCUS", focus: "Low-Impact Aerobic Flush", details: "Following yesterday's combined workout. Spared muscular resistance ahead of Wednesday's match.", workout: ["20-30 minutes effortless stationary bike ride (Zone 2).", "15 minutes deep foam rolling + dynamic adductor sweeps.", "Hydration focus: clear urine target."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
      if (dayOfWeek === 2) return { shortTitle: "Taper & Prime", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", phase: "MD-1: NEUROMUSCULAR PRIMING", focus: "CNS Activation & Upper Body", details: "Legs are fully locked away and protected for tomorrow. Priming CNS to remain explosive.", workout: ["Upper Body (2 sets x 10 reps): Dumbbell overhead presses and light rows.", "Neuromuscular: 3-4 short, crisp 10-meter turf accelerations at 95% effort."], icon: <Activity className="w-6 h-6 text-emerald-500" /> };
      if (dayOfWeek === 4) return { shortTitle: "MD+1 Recovery", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "MD+1: POST-MATCH FLUSH", focus: "Non-Weightbearing Recovery", details: "Flushing out yesterday's match strain without joint loading.", workout: ["25 minutes effortless stationary cycling or pool walking.", "Completely avoid running or high-impact bounding."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
      if (dayOfWeek === 5) return { shortTitle: "Z2 Maintenance", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", phase: "MD-1: PRE-MATCH ACCELERATION FLUSH", focus: "Aerobic Maintenance & Elastic Priming", details: "Preparing the body for the second match of the cycle. Quick clearance.", workout: ["15 minutes light, rhythmic continuous jogging (Zone 2).", "4 sets of progressive strides over 40 meters (building from 60% up to 85% velocity)."], icon: <Activity className="w-6 h-6 text-emerald-500" /> };
      if (dayOfWeek === 6) return { shortTitle: "Active Recovery", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "MD+1: ACTIVE RECOVERY & MOBILITY", focus: "Full Kinetic Chain Decompression", details: "2-match week successfully completed. Dissipating heavy accumulated fatigue.", workout: ["30 minutes of low-impact cardiovascular flush (elliptical/bike).", "Extended passive stretching routine: Hamstrings, adductors, and hip flexors."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
    }

    if (nextMatch && nextMatch.daysUntil === 1) return { shortTitle: "Upper/Prime", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", phase: "MD-1: UPPER BODY & TAPER", focus: "Upper Strength & CNS Priming", details: "Saving leg power for tomorrow's match. Dedicated upper body resistance to stay well-rounded.", workout: ["Upper Body Lift (3x10): Dumbbell Bench Press, Lat Pulldowns, Core Pallof Presses.", "Neuromuscular: 3-4 short explosive 10m sprints from an athletic stance."], icon: <Dumbbell className="w-6 h-6 text-emerald-500" /> };
    if (prevMatch && prevMatch.daysSince === 1) return { shortTitle: "MD+1 Recovery", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "MD+1: ACTIVE RECOVERY", focus: "Non-Weightbearing Flush", details: "Match yesterday. Spontaneous joint pounding is prohibited to spare injuries.", workout: ["25 minutes non-weightbearing aerobic recovery (Bike, Rower, or Pool).", "15 minutes structural foam rolling focusing intensely on the calves, quads, and adductor bands."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
    if (prevMatch && prevMatch.daysSince === 2) return { shortTitle: "Z2 Flush", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "MD+2: ACTIVE FLUSH", focus: "Low-Impact Active Recovery", details: "Clear out metabolic debris from the previous match.", workout: ["25-30 minutes light Zone 2 active recovery (Elliptical, Bike, or conversational jogging).", "Extended joint mobility protocol targeting hips and lower spinal compartments."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
    
    if (nextMatch) {
      const d = nextMatch.daysUntil;
      if (d === 2) return { shortTitle: "Sprints/COD", colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20", phase: "MD-2: SPRINTS & COD MECHANICS", focus: "AR Change of Direction Velocity", details: "High intensity speed & cutting. Simulating rapid lateral offside tracking adjustments.", workout: ["FIFA 11+ Program (Full Protocol - 20 mins).", "CODA Test Simulation: 4 maximal effort repetitions (complete 2-minute recovery between sets).", "Repeated Sprint Ability: 3x30m sprints at 100% capacity."], icon: <Timer className="w-6 h-6 text-blue-400" /> };
      if (d === 3) return { shortTitle: "Z2 + Lower", colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", phase: "MD-3: ZONE 2 & LOWER STRENGTH", focus: "Aerobic Floor & Lower Body Base", details: "Aerobic recovery paired with targeted adductor, hamstring, and quad conditioning.", workout: ["Cardio: 30 minutes conversational Zone 2 jogging or stationary cycling.", "Lower Body Resistance: Goblet Squats (3x8), Romanian Deadlifts (RDLs - 3x8).", "Adductor Base: Copenhagen Adductor holds (Level 1-3) - 2 sets of 15s/side."], icon: <Dumbbell className="w-6 h-6 text-indigo-400" /> };
      if (d === 4) return { shortTitle: "VO2 Max", colorClass: "text-red-500 bg-red-600/10 border-red-500/30", phase: "MD-4: DEDICATED VO2 MAX", focus: "Maximal Cardiorespiratory Stress", details: "Pure cardiovascular threshold conditioning. No lower body lifting today.", workout: ["VO2 Max: Norwegian 4x4 intervals (4 minutes running at 90-95% HRmax, followed by 3 minutes easy jogging recovery). Repeat 4 times.", "Dynamic mobility map focusing strictly on groin, hips, and calf flexibility post-workout."], icon: <TrendingUp className="w-6 h-6 text-red-600" /> };
      if (d === 5) return { shortTitle: "Z2 Cond.", colorClass: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", phase: "MD-5: ZONE 2 CONDITIONING", focus: "Aerobic Engine & Capacity Base", details: "Rhythmic cardiovascular engine building far from match play.", workout: ["45-60 minutes continuous steady-state Zone 2 running or cycling.", "Trunk stabilization: 3 sets of planks (60s) and Bird Dogs (12 reps/side)."], icon: <Activity className="w-6 h-6 text-yellow-500" /> };
    }

    if (dayOfWeek === 1) return { shortTitle: "Z2 Cond.", colorClass: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", phase: "GPP: ZONE 2 CONDITIONING", focus: "Aerobic Capacity Base", details: "No upcoming match constraints. Building your cardiovascular floor with low-intensity steady-state mileage.", workout: ["45-60 mins conversational Zone 2 running or stationary cycling.", "Trunk stability: 3 sets of planks (60s) and Bird Dogs (12 reps/side)."], icon: <Activity className="w-6 h-6 text-yellow-400" /> };
    if (dayOfWeek === 2) return { shortTitle: "VO2 Max", colorClass: "text-red-500 bg-red-600/10 border-red-500/30", phase: "GPP: DEDICATED VO2 MAX", focus: "Maximal Cardiorespiratory Stress", details: "Mid-week anaerobic peak session. Driving VO2 max adaptations without leg resistance load today.", workout: ["VO2 Max: Norwegian 4x4 intervals (4 mins running at 90-95% HRmax, 3 mins easy jog) x 4 sets.", "Active release: 15 mins structural dynamic stretching post-workout."], icon: <TrendingUp className="w-6 h-6 text-red-500" /> };
    if (dayOfWeek === 3) return { shortTitle: "Z2 + Lower", colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", phase: "GPP: Z2 & LOWER STRENGTH", focus: "Lower Kinetic Chain Strength", details: "Dedicated leg strength day paired with conversational aerobic flush.", workout: ["Cardio: 30 mins Zone 2 bike or jog.", "Lower Body Lift: Goblet Squats (3x8), Romanian Deadlifts (3x8).", "Adductors: Copenhagen Adductor holds (Level 1-3) - 2 sets of 15s/side."], icon: <Dumbbell className="w-6 h-6 text-indigo-400" /> };
    if (dayOfWeek === 4) return { shortTitle: "Sprints/COD", colorClass: "text-blue-400 bg-blue-500/10 border-blue-500/20", phase: "GPP: SPRINTS & COD", focus: "Fast-twitch Elastic Priming", details: "Assistant Referee dynamic agility, cutting, and CODA tracking mechanics.", workout: ["FIFA 11+ Program (Full Protocol - 20 mins).", "CODA Test Practice: 4 repetitions (focus on foot planting and rapid acceleration).", "RSA: 3x30m maximum effort sprints (30s recovery)."], icon: <Timer className="w-6 h-6 text-blue-400" /> };
    if (dayOfWeek === 5) return { shortTitle: "Upper Strength", colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", phase: "GPP: UPPER STRENGTH & CORE", focus: "Torso Posture & Dynamic Strength", details: "Upper body conditioning to ensure balanced kinetic chains and posture during late-match fatigue.", workout: ["Upper Body Lift: DB Bench Press (3x10), Pull-ups or Lat Pulldowns (3x10).", "Core: Pallof Presses (3x12/side) and Russian Twists."], icon: <Dumbbell className="w-6 h-6 text-emerald-500" /> };
    if (dayOfWeek === 6) return { shortTitle: "Long Z2 Run", colorClass: "text-yellow-500 bg-yellow-500/5 border-yellow-500/25", phase: "GPP: EXTENDED AEROBIC CAPACITY", focus: "Cardio Endurance Floor", details: "Low-impact endurance base building session to increase capillary density.", workout: ["60-75 mins continuous Zone 2 run, cycle, or elliptical.", "Dynamic stretching mobility flow."], icon: <Activity className="w-6 h-6 text-yellow-500" /> };
    
    return { shortTitle: "Active Rest", colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", phase: "GPP: REST & RECOVERY", focus: "Myofascial Release & Mobility", details: "Full structural recovery and active tissue hydration to prep for the upcoming training week.", workout: ["Light 15-20 mins yoga flow or pool float.", "Full-body foam rolling blueprint.", "Focus on mental decompression and hydration."], icon: <Waves className="w-6 h-6 text-cyan-400" /> };
  };

  // --- HANDLERS ---
  const handleDayClick = (day) => {
    const dateStr = getDateStr(year, month, day); setSelectedDateStr(dateStr);
    const existing = events[dateStr] || { type: 'none', difficulty: 3, injury: false, injuryRegion: 'Groin/Adductor' };
    setEventType(existing.type || 'none'); setMatchDifficulty(existing.difficulty || 3); setIsInjured(existing.injury || false); setInjuryRegion(existing.injuryRegion || 'Groin/Adductor');
    setIsModalOpen(true);
  };

  const saveEvent = () => {
    const updatedEvents = { ...events, [selectedDateStr]: { type: eventType, difficulty: eventType === 'match' ? matchDifficulty : null, injury: isInjured, injuryRegion: isInjured ? injuryRegion : null } };
    setEvents(updatedEvents); setSyncStatus('saving');
    try { localStorage.setItem('reftrain_matches_v5', JSON.stringify(updatedEvents)); setTimeout(() => setSyncStatus('saved'), 400); } catch (e) {}
    setIsModalOpen(false);
  };

  const resetToDefaultBlueprint = () => {
    setEvents(defaultSeeds);
    try { localStorage.removeItem('reftrain_matches_v5'); } catch (e) {}
  };

  // --- RENDERERS ---
  const renderCalendar = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) { days.push(<div key={`empty-${i}`} className="min-h-[6.5rem] bg-slate-900/30 border border-slate-800/50 rounded-lg"></div>); }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = getDateStr(year, month, d); const isToday = dateStr === getTodayStr(); const rx = getPrescription(dateStr); const hasInjury = events[dateStr]?.injury; const isMatch = events[dateStr]?.type === 'match';
      days.push(
        <div key={d} onClick={() => handleDayClick(d)} className={`min-h-[6.5rem] relative border rounded-lg cursor-pointer transition-all hover:bg-slate-700 p-1 flex flex-col justify-between ${isToday ? 'border-blue-500 bg-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-slate-800 bg-slate-800/40'} ${hasInjury ? 'ring-1 ring-red-500/50' : ''}`}>
          <div className="w-full">
            <span className={`text-xs font-bold pl-1 ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>{d}</span>
            {!isMatch && events[dateStr]?.type !== 'travel' && events[dateStr]?.type !== '4th' && <div className={`mt-1 w-full text-[9px] font-bold px-1 py-0.5 rounded border tracking-tight truncate leading-tight ${rx.colorClass}`}>{rx.shortTitle}</div>}
          </div>
          <div className="w-full flex flex-col gap-0.5">
            {hasInjury && <div className="w-full h-1 bg-red-500 rounded-full mb-0.5"></div>}
            {isMatch && <div className="w-full text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded leading-tight text-center shadow">MATCH ({events[dateStr].difficulty})</div>}
            {events[dateStr]?.type === 'travel' && <div className="w-full text-[9px] font-bold bg-slate-600 text-white px-1.5 py-0.5 rounded leading-tight text-center font-semibold">TRAVEL</div>}
            {events[dateStr]?.type === '4th' && <div className="w-full text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.5 rounded leading-tight text-center font-semibold">4TH OFF</div>}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg></button>
          <h2 className="text-white font-black text-lg tracking-wide uppercase">{currentMonth.toLocaleString('default', { month: 'long' })} {year}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg></button>
        </div>
        <div className="bg-slate-900 rounded-xl p-2 border border-slate-800 shadow-inner">
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center text-[10px] uppercase font-bold tracking-wider text-slate-500 pb-2 pt-1">{day}</div>)}
            {days}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={resetToDefaultBlueprint} className="flex-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 p-3 rounded-xl font-bold uppercase tracking-wider">Reset Default Blueprint</button>
        </div>
      </div>
    );
  };

  const renderToday = () => {
    const rx = getPrescription(getTodayStr());
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
          <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Today's Action Plan</h2>
          <div className="flex items-center gap-4 mb-5">
            <div className={`p-3 rounded-xl bg-slate-900 border ${rx.phase.includes('REHAB') ? 'border-red-500' : 'border-slate-700'}`}>{rx.icon}</div>
            <div>
              <h2 className={`font-black text-xl leading-tight ${rx.phase.includes('REHAB') ? 'text-red-400' : 'text-white'}`}>{rx.phase}</h2>
              <p className="text-slate-400 text-sm font-medium">{rx.focus}</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 leading-relaxed">{rx.details}</p>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Protocol Requirements</h3>
          <ul className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
            {rx.workout.map((item, index) => (
              <li key={index} className="flex gap-3 text-sm text-slate-200">
                <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${rx.phase.includes('REHAB') || rx.phase.includes('SURVIVAL') || rx.phase.includes('RECOVERY') ? 'text-cyan-400' : 'text-emerald-400'}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderTestPrep = () => {
    return (
      <div className="space-y-6 animate-fade-in pb-8">
        <div className="bg-gradient-to-br from-blue-900 to-slate-900 p-6 rounded-2xl border border-blue-800/50 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20"><ClipboardList className="w-24 h-24 text-blue-400" /></div>
          <h2 className="text-white font-black text-2xl tracking-wide uppercase relative z-10">USSF National Tests</h2>
          <p className="text-blue-200 text-sm mt-2 relative z-10 font-medium">Official protocols based on Category 1 timings.</p>
        </div>

        {/* High-Intensity Interval Test */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
          <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30"><TrendingUp className="w-5 h-5 text-red-400" /></div>
              <h3 className="font-bold text-white text-lg">FIFA Interval Test</h3>
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">Male Cat 1</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 bg-slate-900 rounded-xl p-4 border border-slate-700 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Run (75m)</p>
                <p className="text-2xl font-black text-emerald-400">15s</p>
              </div>
              <div className="flex-1 bg-slate-900 rounded-xl p-4 border border-slate-700 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Walk (25m)</p>
                <p className="text-2xl font-black text-cyan-400">18s</p>
              </div>
              <div className="flex-1 bg-slate-900 rounded-xl p-4 border border-slate-700 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Reps</p>
                <p className="text-2xl font-black text-white">40</p>
              </div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Protocol Notes</h4>
              <ul className="space-y-2">
                <li className="flex gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Must enter the 3m "walking area" before the whistle.</li>
                <li className="flex gap-2 text-sm text-slate-300"><ShieldAlert className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" /> Second failure to enter the zone results in immediate termination.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CODA Test */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
          <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30"><Timer className="w-5 h-5 text-blue-400" /></div>
              <h3 className="font-bold text-white text-lg">CODA Test</h3>
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">ARs Only</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Time (Male Cat 1)</p>
                <p className="text-2xl font-black text-white">&lt; 9.80 <span className="text-sm text-slate-400 font-medium">seconds</span></p>
              </div>
              <Play className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Execution</h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                Sprint 10m forward, 8m sideways (left), 8m sideways (right), and 10m backward sprint to the finish line. Conducted on turf or grass.
              </p>
            </div>
          </div>
        </div>

        {/* Repeated Sprint Ability (RSA) */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
          <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30"><RotateCcw className="w-5 h-5 text-indigo-400" /></div>
            <h3 className="font-bold text-white text-lg">Repeated Sprint Ability (RSA)</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 bg-slate-900 rounded-xl p-4 border border-slate-700 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Distance</p>
                <p className="text-2xl font-black text-white">40m</p>
              </div>
              <div className="flex-1 bg-slate-900 rounded-xl p-4 border border-slate-700 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reps</p>
                <p className="text-2xl font-black text-white">6</p>
              </div>
              <div className="flex-1 bg-slate-900 rounded-xl p-4 border border-slate-700 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target</p>
                <p className="text-xl font-black text-indigo-400">&lt; 5.80s</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex justify-center font-sans">
      <div className="w-full max-w-md bg-slate-900 shadow-2xl flex flex-col relative overflow-hidden">
        
        <header className="px-6 pt-12 pb-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-10 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">RefTrain</h1>
            <p className="text-[10px] text-slate-400 tracking-[0.2em] uppercase font-bold mt-1">Periodization & Testing</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <svg className={`w-3.5 h-3.5 ${syncStatus === 'saving' ? 'text-yellow-400 animate-spin' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            <span>{syncStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 custom-scrollbar">
          {activeTab === 'calendar' && renderCalendar()}
          {activeTab === 'today' && renderToday()}
          {activeTab === 'test-prep' && renderTestPrep()}
        </main>

        <nav className="absolute bottom-0 w-full bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around p-3 pb-8 z-20">
          <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'calendar' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <CalendarIcon className="w-6 h-6" /><span className="text-[10px] font-bold uppercase tracking-wider">Month</span>
          </button>
          <button onClick={() => setActiveTab('today')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'today' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Home className="w-6 h-6" /><span className="text-[10px] font-bold uppercase tracking-wider">Today</span>
          </button>
          <button onClick={() => setActiveTab('test-prep')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'test-prep' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <ClipboardList className="w-6 h-6" /><span className="text-[10px] font-bold uppercase tracking-wider">Testing</span>
          </button>
        </nav>

        {isModalOpen && selectedDateStr && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-in fade-in">
            <div className="bg-slate-900 w-full h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-700 shadow-2xl flex flex-col">
              
              <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
                <div>
                  <h3 className="text-xl font-black text-white">{new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Day Planner</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full p-2">✕</button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4"/> Scheduled Protocol</h4>
                  {(() => {
                    const rx = getPrescription(selectedDateStr);
                    return (
                      <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2 rounded-lg bg-slate-900 border ${rx.phase.includes('REHAB') ? 'border-red-500' : 'border-slate-700'}`}>{rx.icon}</div>
                          <div><h2 className="font-bold text-white leading-tight">{rx.phase}</h2><p className="text-blue-400 text-xs font-semibold">{rx.focus}</p></div>
                        </div>
                        <ul className="space-y-2 mt-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                          {rx.workout.map((item, index) => <li key={index} className="flex gap-2 text-sm text-slate-300"><span className="text-slate-600 font-bold">•</span><span>{item}</span></li>)}
                        </ul>
                      </div>
                    );
                  })()}
                </div>

                <hr className="border-slate-800" />

                <div className="space-y-6 pb-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> Assignment Settings</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setEventType('none')} className={`p-3 rounded-xl border text-sm font-bold transition-all ${eventType === 'none' ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>Rest / Train</button>
                    <button onClick={() => setEventType('match')} className={`p-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${eventType === 'match' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}><Timer className="w-4 h-4"/> Match</button>
                    <button onClick={() => setEventType('4th')} className={`p-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${eventType === '4th' ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}><Flag className="w-4 h-4"/> 4th Official</button>
                    <button onClick={() => setEventType('travel')} className={`p-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${eventType === 'travel' ? 'bg-slate-600/20 border-slate-400 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}><Plane className="w-4 h-4"/> Travel</button>
                  </div>

                  {eventType === 'match' && (
                    <div className="space-y-3 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-inner">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Anticipated Match Load</label>
                      <input type="range" min="1" max="5" step="1" value={matchDifficulty} onChange={(e) => setMatchDifficulty(Number(e.target.value))} className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                      <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                        <span>1 (Easy)</span><span className="text-blue-400 text-xl font-black bg-blue-900/30 px-3 py-1 rounded-lg">{matchDifficulty}</span><span>5 (Hard)</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2"><Thermometer className="w-4 h-4 text-red-500"/> Report Injury</label>
                        <p className="text-xs text-slate-500 mt-1">Suspends training & initiates rehab.</p>
                      </div>
                      <button onClick={() => setIsInjured(!isInjured)} className={`w-14 h-8 rounded-full transition-colors relative flex items-center shadow-inner ${isInjured ? 'bg-red-500' : 'bg-slate-800 border border-slate-700'}`}>
                        <div className={`w-6 h-6 bg-white rounded-full absolute transition-transform shadow ${isInjured ? 'translate-x-7' : 'translate-x-1'}`}></div>
                      </button>
                    </div>

                    {isInjured && (
                      <div className="bg-red-950/20 p-4 rounded-xl border border-red-900/50">
                        <label className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Affected Body Region</label>
                        <select value={injuryRegion} onChange={(e) => setInjuryRegion(e.target.value)} className="w-full bg-slate-900 text-white border border-red-900/50 rounded-lg p-3 outline-none focus:border-red-500 text-sm font-medium">
                          {REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex gap-2 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-4 rounded-xl transition-colors uppercase tracking-wider text-xs">Cancel</button>
                <button onClick={saveEvent} className="flex-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider py-4 px-8 rounded-xl transition-colors shadow-lg">Save Changes</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
