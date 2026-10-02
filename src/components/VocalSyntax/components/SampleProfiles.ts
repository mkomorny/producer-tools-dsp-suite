import { VocalSyntaxReport } from "../types";

export const SAMPLE_PROFILES: VocalSyntaxReport[] = [
  {
    id: "barack-obama-profile",
    title: "Barack Obama (Podcasts & Public Addresses)",
    dateCreated: "2026-05-21T00:00:00Z",
    lastUpdated: "2026-05-21T12:00:00Z",
    subjectMetadata: {
      fullName: "Barack Hussein Obama II",
      age: "64",
      gender: "Male",
      demographics: "African American, raised in Hawaii and Indonesia.",
      dateOfAnalysis: "2026-05-21",
      analyst: "Dr. L. Vance",
      primaryGoal: "AI speech synthesis styling."
    },
    dataSourceMethodology: {
      audioVideoSources: "High-resolution audio loops from podcasts",
      totalDuration: "45 minutes",
      recordingConditions: "Studio broadcast microphones",
      contextsCaptured: "Casual dialog, declamatory performance",
      textTranscriptSources: "Orthographic manually-transcribed texts",
      supplementaryResearch: "Sociolinguistic studies",
      analysisMethodology: "Conducted multiple passes in Praat",
      limitationsOfData: "Highly polished vocal production."
    },
    acousticParameters: {
      meanF0: 108.5,
      sustainedPhonationRange: "80-165",
      f0StabilitySD: 12.2,
      coeffOfVariation: "11.2%",
      organicPitchRangeSemitones: 12.4,
      glottalSourceType: "Modal with transition to Creaky",
      closedQuotientEstimate: "0.48",
      glottalPulseDescription: "Gradual open phase, steep closure pattern",
      physiologicalNotes: "Relatively large laryngeal frame",
      waveformPeriodicity: "Highly periodic",
      waveformShape: "Rounded with steep closure",
      amplitudeEnvelope: "Dynamic range is wide.",
      peakToPeakSPL: "72 dB average at 1 meter",
      shimmerContribution: "Minor",
      additiveNoiseSeverity: "Low.",
      zeroCrossingBehavior: "Stable",
      amplitudeDecay: "Exponential decay",
      lowLevelRipples: "Absent",
      harmonicStructureStrength: "Harmonics clear up to 4.8 kHz",
      spectralTilt: "-11.4",
      hnrOnSustainedVowels: 23.8,
      vowelFormants: {
        vowelAH_F1: 650,
        vowelAH_F2: 1210,
        vowelAH_F3: 2420,
        vowelIY_F1: 290,
        vowelIY_F2: 2190,
        vowelIY_F3: 2940,
        vowelUW_F1: 340,
        vowelUW_F2: 910,
        vowelUW_F3: 2280
      },
      vowelSpaceDescription: "Slightly raise-shifted /ɑ/.",
      resonanceProfile: "Chest-weighted oral",
      ltasShape: "Smooth roll-off",
      additionalSpectralFeatures: "Clean oral formants list.",
      jitterLocal: 0.42,
      shimmerLocal: 1.84,
      cppValue: 18.2,
      otherPerturbationMeasures: "H1-H2 difference = 1.2 dB",
      grbasRatings: { grade: 0, roughness: 0, breathiness: 0, asthenia: 0, strain: 0 },
      overallPerceptualDescriptors: "Warm, resonant, authoritative."
    },
    prosodicAnalysis: {
      speakingRateWPM: 110,
      speakingRateSyllables: 2.8,
      rhythmType: "Stress-timed",
      pitchVariationSemitones: 12.0,
      intonationPatterns: "Deliberate terminal falls",
      loudnessDynamicRange: "Highly dynamic",
      pauseStructure: "Exceptionally high frequency of deliberate pauses.",
      phrasingChunking: "Short, deliberate clause blocks",
      stressProminence: "Strong lexical contrast.",
      rhythmicBounceCadence: "Slightly syncopated",
      emotionalProsody: "Conveys calm reassurance."
    },
    dialectFeatures: {
      primaryClassification: "General American",
      strengthConsistency: "Variable",
      usageFrequency: "Approx 15-20%",
      keyConsonantFeatures: "Intermittent /l/ vocalization",
      keyVowelFeatures: "Monophthongization of /aɪ/",
      prosodicIntonationalFeatures: "High-rising terminals are rare.",
      codeSwitchingBehavior: "Smooth transitions.",
      variablePhonologicalProcesses: "Selective cluster reduction"
    },
    phoneticArticulatory: {
      overallPrecision: "Clear",
      consonantProduction: "Crisp bilabial stops",
      vowelProductionCoarticulation: "Smooth formant transitions",
      fluencyDisfluencies: "Extremely low rate of standard stutter",
      effortTension: "Relaxed but precise.",
      lipJawTongueMovement: "Excellent jaw excursion"
    },
    lexicalVocabulary: {
      vocabularyRangeComplexity: "Sophisticated",
      registerStylisticLevel: "Formal, academic",
      useOfSlangJargon: "Highly controlled use of political jargon",
      idiosyncraticWordChoices: "Repetitive use of discourse markers",
      hedgesFillersDiscourse: "Hedges: 'arguably'",
      swearingTabooPatterns: "Absent in recorded public speeches",
      codeSwitchingLexicalLevel: "Selective use of conversational community phrases."
    },
    syntacticGrammatical: {
      averageSentenceLengthComplexity: "Complex embedded structure",
      preferredSentenceStructures: "Frequent use of parallel syntax structures",
      grammaticalAccuracyNonStandard: "Standard grammatical configurations",
      useOfSpecificConstructions: "Highly structured conditional frames",
      ellipsisDeletionReduction: "Occasional omission of pronouns",
      discourseLevelSyntax: "Cohesive paragraphs"
    },
    pragmaticDiscourse: {
      turnTakingStyle: "Patient, dominant but non-interruptive.",
      topicManagementCoherence: "Strong logical coherence.",
      politenessStrategies: "Substantial positive politeness markers",
      emotionalExpression: "Indirect expression of irritation",
      humorSarcasmIrony: "Dry, deadpan ironies",
      narrativeStyle: "Anecdotal",
      listenerEngagement: "Frequent direct address"
    },
    vocalQualityTimbre: {
      coreTimbreDescriptors: "Warm, resonant, chesty",
      resonanceBalance: "Well-balanced oral-chest axis",
      overallSoundParagraph: "Highly resonant baritone register",
      toneAttitudinalColoring: "Inherent confidence",
      consistencyVocalQuality: "Highly stable"
    },
    physiologicalAnatomical: {
      anatomicalFactors: "Large vocal tract length",
      impactOfFactorsOnParameters: "Contributes directly to low fundamental frequency",
      diagnosedOrSuspectedDisorders: "None whatsoever."
    },
    variabilityContext: {
      contextVoiceChanges: "Public addresses feature higher mean F0",
      fatigueEmotionHealthImpact: "Acoustic signs of physical exhaustion",
      codeSwitchingPatterns: "Vowel centralization decreases",
      consistencyVsStrategic: "Strategic shifts are subtle"
    },
    speechSignatureReplicable: {
      holisticPerceptualImpression: "A warm, slow, highly structured baritone voice.",
      replicableParams: {
        meanF0: "108.5 Hz",
        spectralTilt: "-11.4 dB/octave",
        keyResonanceNasality: "Oral-chest balanced",
        prosodicSignature: "Rate of 110 WPM",
        accentDialectFeatures: "General American",
        lexicalSyntacticTendencies: "Use of triads",
        vocalQualityTimbreAnchors: "Warm chest resonance",
        movementPerformanceNotes: "Rhythmic head nodding",
        otherCriticalLockingDetails: "None"
      }
    },
    summaryMetricsTable: [
      {
        parameter: "Mean F0",
        observedValue: "108.5 Hz",
        qualitativeNote: "Classic baritone speaker baseline",
        confidence: "High",
        source: "Praat analysis"
      }
    ],
    finalNotes: {
      overallConfidence: "High",
      confidenceJustification: "The audio corpus analyzed was noise-free.",
      majorLimitations: "The dataset lacks spontaneous unedited dialogue.",
      recommendedAdditionalData: "Unfiltered phone recording streams.",
      citationsList: "Vance, L. (2024)."
    }
  }
];
