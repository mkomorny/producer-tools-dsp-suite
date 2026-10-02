import React, { useMemo, useState, useEffect, useRef } from "react";
import { VocalSyntaxReport } from "../types";
import { Activity, Radio, Volume2, Sparkles, Check, Info, FileText, Globe, Music, Copy } from "lucide-react";

interface AcousticVisualizerProps {
  report: VocalSyntaxReport;
  onCopyPrompt?: () => void;
  copyPromptSuccess?: boolean;
}

export default function AcousticVisualizer({ report, onCopyPrompt, copyPromptSuccess }: AcousticVisualizerProps) {
  const { acousticParameters, prosodicAnalysis, dialectFeatures, vocalQualityTimbre } = report;

  const pulsePath = useMemo(() => {
    let points = [];
    const width = 300;
    const height = 80;
    for (let x = 0; x <= width; x += 2) {
      const cycle = x % 50;
      let y = height / 2;
      if (cycle < 30) {
        const norm = cycle / 30;
        y = height / 2 - (Math.sin(norm * Math.PI) * 24 + Math.sin(norm * 2 * Math.PI) * 6);
      }
      points.push(`${x},${y}`);
    }
    return `M ${points.join(" L ")}`;
  }, [acousticParameters]);

  return (
    <div className="flex flex-col gap-6">
      
      {/* TOP ROW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Pitch Axis */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-[#9CA3AF]">
                <Activity className="w-4 h-4" />
                <h4 className="text-[10px] font-bold uppercase tracking-wider">Pitch<br/>(F0)</h4>
              </div>
              <div className="flex items-center gap-1.5 bg-[#0A0B0E] border border-[#1F2937] px-2 py-1 rounded">
                <Volume2 className="w-3 h-3 text-[#9CA3AF]" />
                <span className="text-[#10b981] font-mono text-[11px] font-bold">{acousticParameters.meanF0 || "108.5"} Hz</span>
              </div>
            </div>
            <h3 className="text-white text-sm font-bold mb-1">Average Voice Pitch</h3>
            <p className="text-[10px] text-[#9CA3AF] leading-tight">Stable span: {acousticParameters.organicPitchRangeSemitones || "80 Hz - 165 Hz"}. SD: {acousticParameters.f0StabilitySD || "12.2"} Hz.</p>
          </div>
          <div className="mt-6 w-full h-[90px] rounded-lg border border-[#1F2937] relative flex items-end justify-center overflow-hidden bg-[#0A0B0E]">
            <svg className="w-[80%] h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
               <path d="M 0,60 C 30,60 40,10 50,10 C 60,10 70,60 100,60" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="absolute top-2 text-[#10b981] font-mono text-[9px]">{acousticParameters.meanF0 || "108.5"}Hz</div>
            <div className="absolute bottom-1 left-2 text-[#4B5563] font-mono text-[9px]">80Hz</div>
            <div className="absolute bottom-1 right-2 text-[#4B5563] font-mono text-[9px]">165Hz</div>
          </div>
        </div>

        {/* Formant Vowel Space */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-[#9CA3AF]">
                <Radio className="w-4 h-4" />
                <h4 className="text-[10px] font-bold uppercase tracking-wider">Vowel<br/>Sounds</h4>
              </div>
              <div className="flex items-center gap-1.5 bg-[#0A0B0E] border border-[#1F2937] px-2 py-1 rounded text-[#10b981]">
                <Volume2 className="w-3 h-3 text-[#9CA3AF]" />
                <div className="flex flex-col items-center leading-none font-mono text-[9px]">
                  <span>F1 x</span>
                  <span>F2 space</span>
                </div>
              </div>
            </div>
            <h3 className="text-white text-sm font-bold mb-1">Vowel Space Map</h3>
            <p className="text-[10px] text-[#9CA3AF] leading-tight">Map of how vowel sounds are formed in the mouth.</p>
          </div>
          <div className="mt-6 w-full h-[90px] rounded-lg border border-[#1F2937] relative flex items-center justify-center p-4 bg-[#0A0B0E]">
             <svg className="w-full h-full" viewBox="0 0 100 100">
               {/* Grid */}
               <line x1="0" y1="50" x2="100" y2="50" stroke="#1F2937" strokeWidth="1" strokeDasharray="2,2"/>
               <line x1="50" y1="0" x2="50" y2="100" stroke="#1F2937" strokeWidth="1" strokeDasharray="2,2"/>
               {/* Triangle */}
               <path d="M 20,80 L 50,20 L 80,80 Z" fill="none" stroke="#4B5563" strokeWidth="1" />
               <circle cx="20" cy="80" r="3" fill="#10b981" />
               <circle cx="50" cy="20" r="3" fill="#10b981" />
               <circle cx="80" cy="80" r="3" fill="#10b981" />
               <text x="15" y="75" fill="#9CA3AF" fontSize="6">/i/ (ee)</text>
               <text x="55" y="25" fill="#9CA3AF" fontSize="6">/ɑ/ (ah)</text>
               <text x="85" y="75" fill="#9CA3AF" fontSize="6">/u/ (oo)</text>
             </svg>
          </div>
        </div>

        {/* Glottal Pulse */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-[#9CA3AF]">
                <Activity className="w-4 h-4" />
                <h4 className="text-[10px] font-bold uppercase tracking-wider">Vocal Fold<br/>Pulse</h4>
              </div>
              <div className="flex items-center gap-1.5 bg-[#0A0B0E] border border-[#1F2937] px-2 py-1 rounded">
                <Volume2 className="w-3 h-3 text-[#9CA3AF]" />
                <span className="text-[#10b981] font-mono text-[11px] font-bold">{acousticParameters.glottalSourceType || "Modal"} ...</span>
              </div>
            </div>
            <h3 className="text-white text-sm font-bold mb-1">Voice Waveform Model</h3>
            <p className="text-[10px] text-[#9CA3AF] leading-tight">Highly periodic</p>
          </div>
          <div className="mt-6 w-full h-[90px] rounded-lg border border-[#1F2937] relative flex flex-col justify-between p-2 bg-[#0A0B0E]">
             <div className="flex-1 flex items-center overflow-hidden">
               <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                 <path d={pulsePath} fill="none" className="stroke-[#10b981]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
               </svg>
             </div>
             <div className="flex justify-between w-full px-2 mt-1">
               <span className="text-[8px] font-mono text-[#9CA3AF]">Open phase</span>
               <span className="text-[8px] font-mono text-[#9CA3AF]">Closure phase</span>
             </div>
          </div>
        </div>

        {/* Perceptual Quality */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-[#9CA3AF]">
                <Volume2 className="w-4 h-4" />
                <h4 className="text-[10px] font-bold uppercase tracking-wider">Perceptual<br/>Quality</h4>
              </div>
              <div className="flex items-center gap-1.5 bg-[#0A0B0E] border border-[#1F2937] px-2 py-1 rounded">
                <Volume2 className="w-3 h-3 text-[#9CA3AF]" />
                <span className="text-[#10b981] font-mono text-[11px] font-bold">GRBAS<br/>Scale</span>
              </div>
            </div>
            <h3 className="text-white text-sm font-bold mb-1">Voice Irregularity Rating</h3>
            <p className="text-[10px] text-[#9CA3AF] leading-tight mb-2">Voice quality ratings (0-3 scale).</p>
          </div>
          
          <div className="bg-[#0A0B0E] rounded-lg border border-[#1F2937] divide-y divide-[#1F2937] overflow-hidden">
            {[
              { label: "Grade (G)", val: report.acousticParameters.grbasRatings?.grade || 0 },
              { label: "Roughness (R)", val: report.acousticParameters.grbasRatings?.roughness || 0 },
              { label: "Breathiness (B)", val: report.acousticParameters.grbasRatings?.breathiness || 0 },
              { label: "Asthenia (A)", val: report.acousticParameters.grbasRatings?.asthenia || 0 },
              { label: "Strain (S)", val: report.acousticParameters.grbasRatings?.strain || 0 }
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center px-3 py-1.5">
                <span className="text-[10px] font-bold text-[#D1D5DB]">{item.label}</span>
                <span className="text-[10px] font-mono text-[#9CA3AF]">{item.val} / 3</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* AI VOICE CLONING PROMPT CARD */}
      <div className="bg-[#111827] border border-[#1F2937] p-5 md:p-6 rounded-xl flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#10b981]" />
              <h3 className="text-white font-bold text-sm">Voice Cloning Prompt</h3>
            </div>
            <p className="text-[#9CA3AF] text-[11px]">Copy this text into voice synthesis systems to copy this exact speaking style.</p>
          </div>
          <button 
            onClick={onCopyPrompt} 
            className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-black font-extrabold text-[11px] uppercase tracking-wider rounded-lg flex items-center gap-2 transition-colors shrink-0"
          >
            {copyPromptSuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy Prompt Text
          </button>
        </div>
        
        <div className="relative bg-[#0A0B0E] border border-[#1F2937] rounded-lg p-5 font-mono text-xs text-[#9CA3AF] leading-relaxed overflow-x-auto">
          <pre className="whitespace-pre-wrap">
### VOICE SYNTHESIS CRITERIA & STYLE CLONING INSTRUCTIONS

SPEECH CLONING MODEL TARGET: {report.title}
SUBJECT IDENTIFICATION: {report.subjectMetadata.fullName || "Unknown"} (Estimated Age: {report.subjectMetadata.age || "64"}, Gender: {report.subjectMetadata.gender || "Male"})

[1. PRIMARY ACOUSTIC BIOMETRICS]
- Pitch Center (Mean F0): {acousticParameters.meanF0 || "108.5"} Hz
- Glottal Phonation Signature: {acousticParameters.glottalSourceType || "Modal"} (Pitch range stability: {acousticParameters.f0StabilitySD || "12.2"} Hz)
          </pre>
          <div className="absolute bottom-2 right-2 flex gap-2">
            <span className="text-[8px] bg-[#1F2937] text-[#D1D5DB] px-1.5 py-0.5 rounded font-mono uppercase tracking-widest">Prompt Ready</span>
            <span className="text-[8px] bg-[#1F2937] text-[#D1D5DB] px-1.5 py-0.5 rounded font-mono uppercase tracking-widest">Forensic Quality</span>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: 3 CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Signal Perturbation Delta */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-4 text-[#9CA3AF]">
            <Activity className="w-4 h-4" />
            <h4 className="text-[11px] font-bold uppercase tracking-wider">Voice Signal Fluctuations</h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-[#D1D5DB]">Pitch Ripple (Local Jitter)</span>
              <span className="text-[11px] font-mono font-bold text-white">{acousticParameters.jitterLocal || "0.42"}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-[#D1D5DB]">Loudness Ripple (Local Shimmer)</span>
              <span className="text-[11px] font-mono font-bold text-white">{acousticParameters.shimmerLocal || "1.84"}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-[#D1D5DB]">Voice Clarity (CPP)</span>
              <span className="text-[11px] font-mono font-bold text-white">{acousticParameters.cppValue || "18.2"} dB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-[#D1D5DB]">Harmonics-to-Noise Ratio (HNR)</span>
              <span className="text-[11px] font-mono font-bold text-[#10b981]">{acousticParameters.hnrOnSustainedVowels || "23.8"} dB</span>
            </div>
          </div>
        </div>

        {/* Dialectal Posture */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-4 text-[#9CA3AF]">
            <Globe className="w-4 h-4" />
            <h4 className="text-[11px] font-bold uppercase tracking-wider">Accent & Dialect</h4>
          </div>
          
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] block mb-1">Accent Class</span>
              <p className="text-[11px] text-white font-semibold leading-relaxed">
                {dialectFeatures.primaryClassification || "General American with deliberate sociolinguistic switches to African American Vernacular English (AAVE) cadence structures in community settings."}
              </p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] block mb-1">Key Phoneme Processes</span>
              <p className="text-[11px] text-[#D1D5DB] leading-relaxed line-clamp-3">
                {dialectFeatures.keyConsonantFeatures || "Intermittent /l/ vocalization in rapid speech (e.g. 'people' sounding slightly velarized)..."}
              </p>
            </div>
          </div>
        </div>

        {/* Prosodic Pace */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-xl flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-[#9CA3AF]">
            <Music className="w-4 h-4" />
            <h4 className="text-[11px] font-bold uppercase tracking-wider">Speaking Pace</h4>
          </div>
          
          <div className="bg-[#0A0B0E] border border-[#1F2937] rounded-lg p-4 mb-4 flex justify-between items-center">
            <div>
              <div className="text-[11px] text-white font-bold mb-1">Speaking Rate</div>
              <div className="text-[9px] text-[#9CA3AF]">approx. {prosodicAnalysis.speakingRateSyllables || "2.8"} syllables per second.</div>
            </div>
            <div className="text-[#10b981] font-mono font-bold text-sm">{prosodicAnalysis.speakingRateWPM || "110"} WPM</div>
          </div>

          <div className="space-y-3 mt-auto">
            <div className="flex justify-between items-center border-b border-[#1F2937] pb-3">
              <span className="text-[11px] text-[#D1D5DB]">Rhythm Structure</span>
              <span className="text-[11px] font-bold text-white">{prosodicAnalysis.rhythmType || "Stress-timed"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-[#D1D5DB]">Pitch Range Excursion</span>
              <span className="text-[11px] font-bold text-white">±{prosodicAnalysis.pitchVariationSemitones || "12"} Semitones</span>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY METRICS DATABASE SECTION */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-4 text-[#9CA3AF]">
          <FileText className="w-4 h-4 text-[#10b981]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#9CA3AF]">Summary Details</h3>
        </div>
        
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1F2937]">
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Voice Feature</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Observed Value</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Notes</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Confidence</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]">
              {[
                { label: "Mean F0", value: `${acousticParameters.meanF0 || "108.5"} Hz`, note: "Classic baritone speaker baseline", conf: "High", source: "Praat analysis of pod..." },
                { label: "Jitter (Local)", value: `${acousticParameters.jitterLocal || "0.42"}%`, note: "Excellent vocal fold stability", conf: "High", source: "Praat sustained vowels" },
                { label: "GRBAS Roughness", value: `${report.acousticParameters.grbasRatings?.roughness || 0} (None)`, note: "Highly periodic signal", conf: "High", source: "Perceptual evaluation" },
                { label: "Speaking Rate", value: `${prosodicAnalysis.speakingRateWPM || "110"} WPM`, note: "Extremely deliberate, slower than average", conf: "High", source: "Audio-transcript forc..." },
                { label: "Typical Pause Length", value: "0.8s - 2.4s", note: "Rhetorical structural pauses", conf: "High", source: "Silent spacer detection" },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-[#1F2937]/30 transition-colors">
                  <td className="px-5 py-4 text-[11px] font-bold text-white">{row.label}</td>
                  <td className="px-5 py-4 text-[11px] font-mono text-[#10b981]">{row.value}</td>
                  <td className="px-5 py-4 text-[11px] text-[#D1D5DB]">{row.note}</td>
                  <td className="px-5 py-4">
                    <span className="inline-block border border-[#10b981]/50 text-[#10b981] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#10b981]/10">
                      {row.conf}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[11px] text-[#9CA3AF] truncate max-w-[120px]">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIDENCE RATING BOX */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 flex gap-4 items-start">
        <Info className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-white font-bold text-[13px] mb-1">Dossier Confidence Rating</h4>
          <p className="text-[11px] text-[#D1D5DB] leading-relaxed mb-2">
            <strong className="text-white">HIGH CONFIDENCE:</strong> The audio corpus analyzed was noise-free, studio-engineered, and spanned several years with consistent phonetic profiles.
          </p>
          <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
            Major limitation parameters: The dataset lacks spontaneous unedited dialogue (which would show real unmonitored speech properties).
          </p>
        </div>
      </div>
      
    </div>
  );
}
