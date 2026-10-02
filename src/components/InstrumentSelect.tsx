import React from 'react';
import { Square, ChevronDown } from 'lucide-react';
import { INSTRUMENT_CATEGORIES } from '../lib/instruments';

export function InstrumentSelect({ 
  current, 
  onSelect, 
  showCustom, 
  customVal, 
  onCustomChange, 
  onCustomSubmit, 
  loading 
}: { 
  current: string, 
  onSelect: (val: string) => void, 
  showCustom: boolean, 
  customVal: string, 
  onCustomChange: (val: string) => void, 
  onCustomSubmit: () => void, 
  loading: boolean 
}) {
  const currentCategory = INSTRUMENT_CATEGORIES.find(c => c.instruments.includes(current))?.name || INSTRUMENT_CATEGORIES[0].name;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <div className="relative">
          <select 
            value={currentCategory} 
            onChange={(e) => {
              const newCat = e.target.value;
              const insts = INSTRUMENT_CATEGORIES.find(c => c.name === newCat)?.instruments || [];
              onSelect(insts[0]);
            }}
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-[11px] font-black uppercase text-accent focus:outline-none focus:border-accent appearance-none pr-6 min-w-[124px]"
          >
            {INSTRUMENT_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <div className="absolute right-2 top-1.5 pointer-events-none">
            <ChevronDown size={12} className="text-accent" />
          </div>
        </div>

        <div className="relative">
          <select 
            value={current} 
            onChange={(e) => onSelect(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-[11px] font-black uppercase text-neutral-400 focus:outline-none focus:border-accent appearance-none pr-6 min-w-[124px]"
          >
             <option value="RANDOM_AI">✨ AI RANDOM</option>
             <option value="RANDOM_LIST">🎲 RANDOM</option>
            {(INSTRUMENT_CATEGORIES.find(c => c.name === currentCategory)?.instruments || []).map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <div className="absolute right-2 top-1.5 pointer-events-none">
            {loading ? <div className="w-2 h-2 rounded-full border border-accent border-t-transparent animate-spin" /> : <ChevronDown size={12} className="text-neutral-400" />}
          </div>
        </div>
      </div>
    </div>
  );
}
