import React, { useState, useMemo } from 'react';
import { Activity, Calendar as CalendarIcon, ShieldAlert, Timer, TrendingUp, Home, CheckCircle2, Plane, Flag, Thermometer, Dumbbell, Waves, Anchor, ClipboardList, Play, RotateCcw } from 'lucide-react';

// --- SCIENCE-BASED REHAB PROTOCOLS (FIFA 11+ & ECCENTRIC LOAD) ---
const REHAB_PROTOCOLS = {
  'Groin/Adductor': ["Copenhagen Adduction (Isometric): 3x30s.", "Supine Ball Squeezes (5x10s).", "Avoid explosive lateral shuffling."],
  'Hamstring': ["Nordic Hamstring Curls (Eccentric focus, assisted): 3x5.", "Supine Bridge (Heel digs): 4x20s.", "Strictly < 70% Max Velocity."],
  'Calf/Achilles': ["Isometric Calf Raises (Hold top/bottom): 3x10.", "Seated Soleus work.", "Zero plyometrics or explosive bounding."],
  'Knee': ["Spanish Squats (Band-assisted isometric): 3x45s.", "Quad sets / Straight Leg Raises.", "Avoid deep decelerations/CODA."],
  'Ankle': ["Single-leg balance (Unstable surface): 3x60s.", "Resistance band eversion/inversion.", "Avoid uneven terrain."]
};

// --- CORE PERIODIZATION LOGIC ---
const getSeasonPhase = (month) => {
  if (month >= 0 && month <= 1) return 'OFF_SEASON'; // Jan-Feb
  if (month >= 2 && month <= 7) return 'PRO_SEASON'; // Mar-Aug
  return 'COLLEGE_SEASON'; // Sept-Dec
};

const getPrescription = (dateStr, events) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const month = dateObj.getMonth();
  const phase = getSeasonPhase(month);
  
  const event = events[dateStr] || { type: 'none' };
  
  // Injury Override
  if (event.injury) {
    return { shortTitle: "Rehab", colorClass: "text-red-400 bg-red-400/10 border-red-500/20", phase: "REHAB: PROTECTIVE", workout: REHAB_PROTOCOLS[event.injuryRegion] || [], icon: <Thermometer /> };
  }

  // Match Day Logic
  if (event.type === 'match') {
    return { shortTitle: "Match Day", colorClass: "text-white bg-blue-600", phase: "MATCH DAY", workout: ["FIFA 11+ Warm-up", "Short explosive sprints (CNS Priming)", "Post-match recovery (20g protein/electrolytes)"], icon: <Timer /> };
  }

  // Context-Aware Logic (Tapering vs Foundation)
  if (phase === 'OFF_SEASON') {
    return { shortTitle: "Structural", colorClass: "text-emerald-400 bg-emerald-500/10", phase: "OFF-SEASON: STRENGTH", workout: ["Compound Lifts (Squats/RDLs)", "Adductor Copenhagen holds", "Base Aerobic Capacity (Z2)"], icon: <Dumbbell /> };
  }

  if (phase === 'PRO_SEASON') {
    return { shortTitle: "Maint.", colorClass: "text-blue-400 bg-blue-500/10", phase: "PRO: MAINTENANCE", workout: ["Zone 2 flush", "Structural mobility", "Light high-velocity activation"], icon: <Activity /> };
  }

  return { shortTitle: "Tapering", colorClass: "text-purple-400 bg-purple-500/10", phase: "COLLEGE: CNS PRIMING", workout: ["No heavy lifting (Tapering)", "10m explosive accelerations", "High-quality rest"], icon: <TrendingUp /> };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [events, setEvents] = useState({});

  const rx = useMemo(() => getPrescription(new Date().toISOString().split('T')[0], events), [events]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center pt-8">
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">RefTrain v2</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">{rx.phase}</p>
        </header>

        <div className={`p-6 rounded-2xl border ${rx.colorClass}`}>
          <div className="flex items-center gap-4">
            {rx.icon}
            <h2 className="text-xl font-black">{rx.phase}</h2>
          </div>
          <ul className="mt-4 space-y-2">
            {rx.workout.map((w, i) => <li key={i} className="text-sm flex items-center gap-2"> <CheckCircle2 className="w-4 h-4" /> {w}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
