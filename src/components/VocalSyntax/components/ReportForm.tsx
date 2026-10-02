import React, { useState } from "react";
import { VocalSyntaxReport } from "../types";
import { 
  ChevronDown, 
  ChevronUp, 
  User, 
  FileText, 
  Activity, 
  Music, 
  Globe, 
  Smile, 
  MessageSquare, 
  Lightbulb, 
  HeartHandshake
} from "lucide-react";

interface ReportFormProps {
  report: VocalSyntaxReport;
  onSave: (updated: VocalSyntaxReport) => void;
}

export default function ReportForm({ report, onSave }: ReportFormProps) {
  const [edited, setEdited] = useState<VocalSyntaxReport>({ ...report });
  const [openSection, setOpenSection] = useState<string>("metadata");

  React.useEffect(() => {
    setEdited({ ...report });
  }, [report]);

  const toggleSection = (sec: string) => {
    setOpenSection(openSection === sec ? "" : sec);
  };

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEdited(prev => ({
      ...prev,
      subjectMetadata: {
        ...prev.subjectMetadata,
        [name]: value
      }
    }));
  };

  const handleDataSourceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEdited(prev => ({
      ...prev,
      dataSourceMethodology: {
        ...prev.dataSourceMethodology,
        [name]: value
      }
    }));
  };

  const handleAcousticChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Check if nested vowel formants
    if (name.startsWith("vowel_")) {
      const formantKey = name.replace("vowel_", "");
      setEdited(prev => ({
        ...prev,
        acousticParameters: {
          ...prev.acousticParameters,
          vowelFormants: {
            ...prev.acousticParameters.vowelFormants,
            [formantKey]: Number(value)
          }
        }
      }));
      return;
    }

    // Check if nested GRBAS
    if (name.startsWith("grbas_")) {
      const gKey = name.replace("grbas_", "");
      setEdited(prev => ({
        ...prev,
        acousticParameters: {
          ...prev.acousticParameters,
          grbasRatings: {
            ...prev.acousticParameters.grbasRatings,
            [gKey]: Number(value)
          }
        }
      }));
      return;
    }

    // Map base numeric or text fields
    const parsedVal = type === "number" || name === "meanF0" || name === "f0StabilitySD" || name === "jitterLocal" || name === "shimmerLocal" || name === "cppValue" || name === "organicPitchRangeSemitones" || name === "hnrOnSustainedVowels"
      ? Number(value)
      : value;

    setEdited(prev => ({
      ...prev,
      acousticParameters: {
        ...prev.acousticParameters,
        [name]: parsedVal
      }
    }));
  };

  const handleProsodicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const parsedVal = type === "number" || name === "speakingRateWPM" || name === "speakingRateSyllables" || name === "pitchVariationSemitones"
      ? Number(value)
      : value;

    setEdited(prev => ({
      ...prev,
      prosodicAnalysis: {
        ...prev.prosodicAnalysis,
        [name]: parsedVal
      }
    }));
  };

  const handleNestedFieldChange = (
    sectionKey: keyof VocalSyntaxReport,
    fieldKey: string,
    value: string | number
  ) => {
    setEdited(prev => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] as any),
        [fieldKey]: value
      }
    }));
  };

  const handleReplicableFieldChange = (fieldKey: string, value: string) => {
    setEdited(prev => ({
      ...prev,
      speechSignatureReplicable: {
        ...prev.speechSignatureReplicable,
        replicableParams: {
          ...prev.speechSignatureReplicable.replicableParams,
          [fieldKey]: value
        }
      }
    }));
  };

  const handleFinalNotesChange = (fieldKey: string, value: string) => {
    setEdited(prev => ({
      ...prev,
      finalNotes: {
        ...prev.finalNotes,
        [fieldKey]: value
      }
    }));
  };

  const submitChanges = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...edited,
      lastUpdated: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={submitChanges} className="space-y-4" id="vocal-syntax-report-form">
      {/* Title block */}
      <div className="bg-bg2 border border-border p-5 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="w-full md:w-2/3">
          <label className="block text-xs font-mono font-medium text-text3 mb-1 uppercase tracking-wider">
            Report Title
          </label>
          <input
            type="text"
            className="w-full text-lg font-bold bg-bg px-3 py-1.5 rounded-lg border border-border text-text focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none"
            value={edited.title}
            onChange={(e) => setEdited(prev => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full md:w-auto px-6 py-2.5 bg-accent hover:bg-accent active:bg-accent text-bg font-black rounded-lg text-sm transition shadow-lg shadow-accent/15 whitespace-nowrap cursor-pointer"
        >
          Save Changes
        </button>
      </div>

      {/* SECTION 1: SUBJECT IDENTIFICATION & METADATA */}
      <div className="border border-border  rounded-xl bg-bg2  overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("metadata")}
          className="w-full px-5 py-4 flex items-center justify-between text-left font-semibold text-text  bg-bg/50 /20 hover:bg-bg :bg-bg2/40"
        >
          <span className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" />
            Person Details
          </span>
          {openSection === "metadata" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {openSection === "metadata" && (
          <div className="p-5 border-t border-border  grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text3  mb-1">Full Name / Pseudonym</label>
              <input
                type="text"
                name="fullName"
                className="w-full text-sm bg-bg  px-3 py-2 rounded-lg border border-border "
                value={edited.subjectMetadata.fullName}
                onChange={handleMetadataChange}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text3  mb-1">Age / Apparent Age</label>
              <input
                type="text"
                name="age"
                className="w-full text-sm bg-bg  px-3 py-2 rounded-lg border border-border "
                value={edited.subjectMetadata.age}
                onChange={handleMetadataChange}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text3  mb-1">Gender / Presentation</label>
              <input
                type="text"
                name="gender"
                className="w-full text-sm bg-bg  px-3 py-2 rounded-lg border border-border "
                value={edited.subjectMetadata.gender}
                onChange={handleMetadataChange}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text3  mb-1">Date of Analysis</label>
              <input
                type="text"
                name="dateOfAnalysis"
                className="w-full text-sm bg-bg  px-3 py-2 rounded-lg border border-border "
                value={edited.subjectMetadata.dateOfAnalysis}
                onChange={handleMetadataChange}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-text3  mb-1">Analyst Name(s)</label>
              <input
                type="text"
                name="analyst"
                className="w-full text-sm bg-bg  px-3 py-2 rounded-lg border border-border "
                value={edited.subjectMetadata.analyst}
                onChange={handleMetadataChange}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-text3  mb-1">Relevant Demographics & Sociolinguistic Background</label>
              <textarea
                name="demographics"
                rows={3}
                className="w-full text-sm bg-bg  px-3 py-2 rounded-lg border border-border "
                value={edited.subjectMetadata.demographics}
                onChange={handleMetadataChange}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-text3  mb-1">Primary Goal of Analysis</label>
              <textarea
                name="primaryGoal"
                rows={2}
                className="w-full text-sm bg-bg  px-3 py-2 rounded-lg border border-border "
                value={edited.subjectMetadata.primaryGoal}
                onChange={handleMetadataChange}
              />
            </div>
          </div>
        )}
      </div>

      {/* Button to submit at bottom */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-8 py-3 bg-accent hover:bg-accent2 active:bg-accent3 text-bg font-medium rounded-lg text-sm transition shadow-md"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
