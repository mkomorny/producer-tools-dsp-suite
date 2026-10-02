export interface SubjectMetadata {
  fullName: string;
  age: string;
  gender: string;
  demographics: string;
  dateOfAnalysis: string;
  analyst: string;
  primaryGoal: string;
}

export interface DataSourceMethodology {
  audioVideoSources: string;
  totalDuration: string;
  recordingConditions: string;
  contextsCaptured: string;
  textTranscriptSources: string;
  supplementaryResearch: string;
  analysisMethodology: string;
  limitationsOfData: string;
}

export interface AcousticParameters {
  meanF0: number; // in Hz
  sustainedPhonationRange: string; // e.g. "90-180" F0
  f0StabilitySD: number; // Hz
  coeffOfVariation: string; // e.g. "%" or decimal
  organicPitchRangeSemitones: number;
  glottalSourceType: "Modal" | "Breathy" | "Pressed" | "Creaky" | "Mixed" | string;
  closedQuotientEstimate: string;
  glottalPulseDescription: string;
  physiologicalNotes: string;
  waveformPeriodicity: "Highly periodic" | "Moderately periodic" | "Noticeable stochastic component" | string;
  waveformShape: string;
  amplitudeEnvelope: string;
  peakToPeakSPL: string;
  shimmerContribution: string;
  additiveNoiseSeverity: string;
  zeroCrossingBehavior: string;
  amplitudeDecay: string;
  lowLevelRipples: string;
  harmonicStructureStrength: string;
  spectralTilt: string; // e.g., "12 dB per octave"
  hnrOnSustainedVowels: number; // in dB
  vowelFormants: {
    vowelAH_F1: number;
    vowelAH_F2: number;
    vowelAH_F3: number;
    vowelIY_F1: number;
    vowelIY_F2: number;
    vowelIY_F3: number;
    vowelUW_F1: number;
    vowelUW_F2: number;
    vowelUW_F3: number;
  };
  vowelSpaceDescription: string;
  resonanceProfile: string;
  ltasShape: string;
  additionalSpectralFeatures: string;
  jitterLocal: number; // %
  shimmerLocal: number; // %
  cppValue: number; // dB
  otherPerturbationMeasures: string;
  grbasRatings: {
    grade: number; // 0-3
    roughness: number; // 0-3
    breathiness: number; // 0-3
    asthenia: number; // 0-3
    strain: number; // 0-3
  };
  overallPerceptualDescriptors: string;
}

export interface ProsodicAnalysis {
  speakingRateWPM: number;
  speakingRateSyllables: number;
  rhythmType: "Stress-timed" | "Syllable-timed" | "Mixed" | "Syncopated" | string;
  pitchVariationSemitones: number;
  intonationPatterns: string;
  loudnessDynamicRange: string;
  pauseStructure: string;
  phrasingChunking: string;
  stressProminence: string;
  rhythmicBounceCadence: string;
  emotionalProsody: string;
}

export interface DialectFeatures {
  primaryClassification: string;
  strengthConsistency: "Strong" | "Moderate" | "Variable" | "Context-dependent" | string;
  usageFrequency: string;
  keyConsonantFeatures: string;
  keyVowelFeatures: string;
  prosodicIntonationalFeatures: string;
  codeSwitchingBehavior: string;
  variablePhonologicalProcesses: string;
}

export interface PhoneticArticulatory {
  overallPrecision: string;
  consonantProduction: string;
  vowelProductionCoarticulation: string;
  fluencyDisfluencies: string;
  effortTension: string;
  lipJawTongueMovement: string;
}

export interface LexicalVocabulary {
  vocabularyRangeComplexity: string;
  registerStylisticLevel: string;
  useOfSlangJargon: string;
  idiosyncraticWordChoices: string;
  hedgesFillersDiscourse: string;
  swearingTabooPatterns: string;
  codeSwitchingLexicalLevel: string;
}

export interface SyntacticGrammatical {
  averageSentenceLengthComplexity: string;
  preferredSentenceStructures: string;
  grammaticalAccuracyNonStandard: string;
  useOfSpecificConstructions: string;
  ellipsisDeletionReduction: string;
  discourseLevelSyntax: string;
}

export interface PragmaticDiscourse {
  turnTakingStyle: string;
  topicManagementCoherence: string;
  politenessStrategies: string;
  emotionalExpression: string;
  humorSarcasmIrony: string;
  narrativeStyle: string;
  listenerEngagement: string;
}

export interface VocalQualityTimbre {
  coreTimbreDescriptors: string;
  resonanceBalance: string;
  overallSoundParagraph: string;
  toneAttitudinalColoring: string;
  consistencyVocalQuality: string;
}

export interface PhysiologicalAnatomical {
  anatomicalFactors: string;
  impactOfFactorsOnParameters: string;
  diagnosedOrSuspectedDisorders: string;
}

export interface VariabilityContext {
  contextVoiceChanges: string;
  fatigueEmotionHealthImpact: string;
  codeSwitchingPatterns: string;
  consistencyVsStrategic: string;
}

export interface SpeechSignatureReplicable {
  holisticPerceptualImpression: string;
  replicableParams: {
    meanF0: string;
    spectralTilt: string;
    keyResonanceNasality: string;
    prosodicSignature: string;
    accentDialectFeatures: string;
    lexicalSyntacticTendencies: string;
    vocalQualityTimbreAnchors: string;
    movementPerformanceNotes: string;
    otherCriticalLockingDetails: string;
  };
}

export interface SummaryMetricRow {
  parameter: string;
  observedValue: string;
  qualitativeNote: string;
  confidence: "High" | "Moderate" | "Low" | string;
  source: string;
}

export interface VocalSyntaxReport {
  id: string; // UUID or string
  dateCreated: string;
  lastUpdated: string;
  title: string;
  bodyMannerismsAnalysis?: string;

  subjectMetadata: SubjectMetadata;
  dataSourceMethodology: DataSourceMethodology;
  acousticParameters: AcousticParameters;
  prosodicAnalysis: ProsodicAnalysis;
  dialectFeatures: DialectFeatures;
  phoneticArticulatory: PhoneticArticulatory;
  lexicalVocabulary: LexicalVocabulary;
  syntacticGrammatical: SyntacticGrammatical;
  pragmaticDiscourse: PragmaticDiscourse;
  vocalQualityTimbre: VocalQualityTimbre;
  physiologicalAnatomical: PhysiologicalAnatomical;
  variabilityContext: VariabilityContext;
  speechSignatureReplicable: SpeechSignatureReplicable;
  summaryMetricsTable: SummaryMetricRow[];
  finalNotes: {
    overallConfidence: "High" | "Moderate" | "Low" | string;
    confidenceJustification: string;
    majorLimitations: string;
    recommendedAdditionalData: string;
    citationsList: string;
  };
}
