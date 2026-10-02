import React, { useState, useEffect } from "react";
import { SAMPLE_PROFILES } from "./components/SampleProfiles";
import { VocalSyntaxReport } from "./types";
import { createBlankReport, formatReportToMarkdown, formatReportToVoicePrompt } from "./utils";
import AcousticVisualizer from "./components/AcousticVisualizer";
import ReportForm from "./components/ReportForm";
import { motion } from "motion/react";
import { 
  FileText, 
  Plus, 
  Sparkles, 
  Trash2, 
  Copy, 
  Download, 
  Printer, 
  Check, 
  Layers, 
  SlidersHorizontal, 
  BrainCircuit, 
  Info,
  Activity,
  Globe,
  Music,
  Video,
  UploadCloud,
  X,
  Volume2
} from "lucide-react";

export interface VocalSyntaxToolProps {
  onAIAnalyze?: (args: {
    title: string;
    prompt: string;
    hasVideo: boolean;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  }) => Promise<VocalSyntaxReport>;
  className?: string;
}

export default function VocalSyntaxTool({ onAIAnalyze, className }: VocalSyntaxToolProps) {
  // Force exact theme look on mount
  useEffect(() => {
    const prevTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'vocal-syntax');
    return () => {
      if (prevTheme) {
        document.documentElement.setAttribute('data-theme', prevTheme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };
  }, []);

  const [reports, setReports] = useState<VocalSyntaxReport[]>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("vocal_syntax_reports") : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {}
    return [];
  });

  const [selectedId, setSelectedId] = useState<string>(() => reports[0]?.id || "");
  const [activeTab, setActiveTab] = useState<"visuals" | "document" | "edit">("visuals");

  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [copySuccess, setCopySuccess] = useState(false);
  const [copyPromptSuccess, setCopyPromptSuccess] = useState(false);

  useEffect(() => {
    localStorage.setItem("vocal_syntax_reports", JSON.stringify(reports));
  }, [reports]);

  const saveReportsToStorage = (updatedList: VocalSyntaxReport[]) => {
    setReports(updatedList);
  };

  const selectedReport = reports.find(r => r.id === selectedId) || reports[0] || null;

  const handleCreateBlank = () => {
    const fresh = createBlankReport();
    const updated = [fresh, ...reports];
    saveReportsToStorage(updated);
    setSelectedId(fresh.id);
    setActiveTab("edit");
  };

  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this vocal syntax report profile?")) {
      const remaining = reports.filter(r => r.id !== id);
      saveReportsToStorage(remaining);
      if (remaining.length === 0) {
        setSelectedId("");
      } else if (selectedId === id) {
        setSelectedId(remaining[0].id);
      }
    }
  };

  const handleUpdateReport = (updated: VocalSyntaxReport) => {
    const list = reports.map(r => r.id === updated.id ? updated : r);
    saveReportsToStorage(list);
    alert("Vocal report profile locked & saved successfully!");
    setActiveTab("visuals");
  };

  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTitle.trim()) {
      setAiError("Subject Identifier Label is a required field.");
      return;
    }
    setIsAnalyzingAI(true);
    setAiError(null);
    const hasVideo = !!(uploadedFile && (uploadedFile.type.includes("video") || /\.(mp4|mov|avi|mkv|webm)$/i.test(uploadedFile.name)));
    try {
      let result: VocalSyntaxReport;
      if (onAIAnalyze) {
        result = await onAIAnalyze({
          title: aiTitle,
          prompt: aiPrompt,
          hasVideo,
          fileName: uploadedFile?.name,
          fileType: uploadedFile?.type,
          fileSize: uploadedFile?.size
        });
      } else {
        const fresh = createBlankReport();
        fresh.title = aiTitle;
        result = fresh;
      }
      const updated = [result, ...reports];
      saveReportsToStorage(updated);
      setSelectedId(result.id);
      setIsAnalyzingAI(false);
      setAiPrompt("");
      setAiTitle("");
      setUploadedFile(null);
      setActiveTab("visuals");
    } catch (err: any) {
      setAiError(err.message || "Could not complete vocal syntax analysis.");
      setIsAnalyzingAI(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!selectedReport) return;
    const md = formatReportToMarkdown(selectedReport);
    try {
      await navigator.clipboard.writeText(md);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {}
  };

  const handleDownloadMarkdown = () => {
    if (!selectedReport) return;
    const md = formatReportToMarkdown(selectedReport);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedReport.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-syntax-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPrompt = () => {
    if (!selectedReport) return;
    try {
      const promptText = formatReportToVoicePrompt(selectedReport);
      navigator.clipboard.writeText(promptText);
      setCopyPromptSuccess(true);
      setTimeout(() => setCopyPromptSuccess(false), 2000);
    } catch (err) {}
  };

  return (
    <div className={`min-h-[700px] bg-[#0A0B0E] text-text2 flex flex-col antialiased relative ${className || ''}`}>
      <main className="flex-1 w-full mx-auto pb-12 flex flex-col xl:flex-row gap-6">
        
        {/* SIDEBAR */}
        <section className="w-full xl:w-[320px] flex flex-col gap-6 shrink-0 print:hidden" id="report-repository-sidebar">
          
          {/* DOSSIER REPOSITORY */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden flex flex-col max-h-[420px]">
            <div className="p-4 border-b border-[#1F2937] flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#9CA3AF]">
                Saved Voice<br />Reports
              </span>
              <button onClick={handleCreateBlank} className="px-3 py-1.5 bg-transparent border border-accent/30 hover:border-accent text-accent rounded flex items-center gap-1.5 transition-colors text-[10px] uppercase font-bold tracking-wider">
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
            <div className="divide-y divide-[#1F2937] overflow-y-auto flex-1 p-2">
              {reports.map((rep) => {
                const isActive = rep.id === selectedId;
                return (
                  <div key={rep.id} onClick={() => setSelectedId(rep.id)} className={`p-3 rounded-lg cursor-pointer text-left transition flex justify-between items-start group mb-1 ${isActive ? "bg-[#1F2937]/50 border-l-[3px] border-accent" : "hover:bg-[#1F2937]/30 border-l-[3px] border-transparent"}`}>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#10b981] font-mono text-[10px] font-bold">{rep.acousticParameters.meanF0 || "120"} Hz</span>
                        <span className="text-[#9CA3AF] font-mono text-[10px] uppercase">{rep.subjectMetadata.age || "Unknown"} Y/O</span>
                      </div>
                      <h3 className="text-xs font-bold text-white truncate mb-0.5">{rep.title}</h3>
                      <p className="text-[10px] text-[#9CA3AF] truncate">{rep.subjectMetadata.fullName || "Unknown Subject"}</p>
                    </div>
                    <button onClick={(e) => handleDeleteReport(rep.id, e)} className="p-1 text-[#9CA3AF] hover:text-rose-500 opacity-60 group-hover:opacity-100 transition rounded mt-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI ANALYZER FORM */}
          <div className={`bg-[#111827] border border-[#1F2937] rounded-xl flex flex-col transition-shadow ${!selectedReport ? "shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-2 ring-[#10b981]" : ""}`}>
            <div className="p-4 border-b border-[#1F2937] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#10b981]" />
              <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">AI Voice Analyzer</h2>
            </div>
            
            <div className="p-4">
              <p className="text-[11px] text-[#9CA3AF] mb-5 leading-relaxed">
                Describe a voice, mention specific traits, or paste a transcript. The AI will automatically generate a detailed report for you.
              </p>
              
              <form onSubmit={handleAIGenerate} className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider">Voice Name</label>
                    <span className="text-[9px] uppercase font-bold text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded">Required</span>
                  </div>
                  <input type="text" placeholder="e.g. Morgan Freeman" className="w-full text-xs bg-[#0A0B0E] px-3 py-2.5 rounded border border-[#1F2937] focus:border-[#10b981] text-white outline-none transition-colors placeholder:text-[#4B5563]" value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} required />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider">Audio/Video File</label>
                    <span className="text-[9px] uppercase font-bold text-[#9CA3AF] bg-[#1F2937] px-1.5 py-0.5 rounded">Optional</span>
                  </div>
                  <label 
                    className={`w-full border-2 border-dashed rounded bg-[#0A0B0E] p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      isDragging ? 'border-[#10b981] bg-[#10b981]/10' : 'border-[#4B5563] hover:border-[#10b981] hover:bg-[#10b981]/5'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) setUploadedFile({ name: file.name, size: file.size, type: file.type });
                    }}
                  >
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="audio/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setUploadedFile({ name: file.name, size: file.size, type: file.type });
                      }}
                    />
                    <UploadCloud className="w-5 h-5 text-[#9CA3AF] mb-2" />
                    <span className="text-[11px] font-bold text-white">
                      {uploadedFile ? uploadedFile.name : "Drag & drop or Click to pair"}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      {uploadedFile ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB` : "Audio or Video (MP3, WAV, MP4...)"}
                    </span>
                  </label>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider">Description or Transcript</label>
                    <span className="text-[9px] uppercase font-bold text-[#9CA3AF] bg-[#1F2937] px-1.5 py-0.5 rounded">Optional</span>
                  </div>
                  <textarea 
                    placeholder="Describe the voice or paste what they are saying..."
                    className="w-full h-24 text-xs bg-[#0A0B0E] p-3 rounded border border-[#1F2937] focus:border-[#10b981] text-white outline-none transition-colors resize-none placeholder:text-[#4B5563]"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                </div>

                <div className="border border-[#10b981]/30 bg-[#10b981]/5 rounded p-3 flex gap-3 items-start">
                  <Globe className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#10b981] mb-1">Web Search Active</h4>
                    <p className="text-[9px] text-[#10b981]/70 leading-tight">No media file or transcript attached. The AI will search the web for voice information about <strong>"{aiTitle || 'this person'}"</strong>.</p>
                  </div>
                </div>

                <button type="submit" disabled={isAnalyzingAI} className="w-full py-3 bg-[#10b981] hover:bg-[#059669] text-black font-extrabold uppercase tracking-wider text-xs rounded transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  {isAnalyzingAI ? "Analyzing Voice..." : "Generate Voice Report"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT AREA */}
        {selectedReport ? (
          <section className="flex-1 flex flex-col min-w-0">
            
            {/* DOSSIER HEADER */}
            <div className="bg-[#111827] border border-[#1F2937] p-5 md:p-6 rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-[#10b981] font-mono font-bold text-[10px] uppercase tracking-widest bg-[#10b981]/10 px-2 py-0.5 rounded">Report Selected</span>
                  <span className="text-[#9CA3AF] text-[10px]">Created: {new Date(selectedReport.dateCreated).toLocaleDateString()}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-1">{selectedReport.title}</h2>
                <p className="text-[11px] text-[#9CA3AF]">Analyzed for: <strong className="text-white font-semibold">{selectedReport.subjectMetadata.fullName || "Unknown Person"}</strong>, {selectedReport.subjectMetadata.age || "Unknown"} year old {selectedReport.subjectMetadata.gender || "Unknown"}.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCopyMarkdown} className="px-4 py-2 border border-[#4B5563] hover:border-white text-white text-[11px] font-bold rounded flex items-center gap-2 transition-colors">
                  {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy
                </button>
                <button onClick={handleDownloadMarkdown} className="px-4 py-2 border border-[#4B5563] hover:border-white text-white text-[11px] font-bold rounded flex items-center gap-2 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-[#4B5563] hover:border-white text-white text-[11px] font-bold rounded flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print PDF
                </button>
              </div>
            </div>

            {/* TABS */}
            <div className="flex border-b border-[#1F2937] mb-6 gap-6">
              <button 
                onClick={() => setActiveTab("visuals")} 
                className={`pb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest border-b-[3px] transition-colors ${activeTab === "visuals" ? "border-[#10b981] text-white" : "border-transparent text-[#9CA3AF] hover:text-white"}`}
              >
                <Layers className={`w-4 h-4 ${activeTab === "visuals" ? "text-[#10b981]" : ""}`} /> Voice Breakdown
              </button>
              <button 
                onClick={() => setActiveTab("document")} 
                className={`pb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest border-b-[3px] transition-colors ${activeTab === "document" ? "border-[#10b981] text-white" : "border-transparent text-[#9CA3AF] hover:text-white"}`}
              >
                <FileText className={`w-4 h-4 ${activeTab === "document" ? "text-[#10b981]" : ""}`} /> Full Report
              </button>
              <button 
                onClick={() => setActiveTab("edit")} 
                className={`pb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest border-b-[3px] transition-colors ${activeTab === "edit" ? "border-[#10b981] text-white" : "border-transparent text-[#9CA3AF] hover:text-white"}`}
              >
                <SlidersHorizontal className={`w-4 h-4 ${activeTab === "edit" ? "text-[#10b981]" : ""}`} /> Edit Details
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 w-full">
              {activeTab === "visuals" && <AcousticVisualizer report={selectedReport} onCopyPrompt={handleCopyPrompt} copyPromptSuccess={copyPromptSuccess} />}
              {activeTab === "document" && <div className="p-8 bg-[#111827] border border-[#1F2937] rounded-xl whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#D1D5DB] shadow-lg">{formatReportToMarkdown(selectedReport)}</div>}
              {activeTab === "edit" && <ReportForm report={selectedReport} onSave={handleUpdateReport} />}
            </div>
            
            <div className="mt-12 text-center text-[#4B5563] text-[9px] uppercase tracking-wider mb-6">
              © 2026 Vocal Syntax Report Studio. Designed for Voice Analysis.
            </div>
          </section>
        ) : (
          <section className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-[#1F2937] rounded-xl bg-[#111827]/30 min-h-[400px]">
              <div className="text-center p-8 max-w-sm">
                <Sparkles className="w-10 h-10 text-[#10b981] opacity-50 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No Report Selected</h3>
                <p className="text-[#9CA3AF] text-xs leading-relaxed">
                  Create a new template from the sidebar or use the AI Voice Analyzer to generate a report.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

