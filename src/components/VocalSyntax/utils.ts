import { VocalSyntaxReport } from "./types";

/**
 * Formats a VocalSyntaxReport object into the exact Markdown template requested by the user.
 */
export function formatReportToMarkdown(report: VocalSyntaxReport): string {
  const smList = report.summaryMetricsTable || [];
  const smTableText = smList.length > 0 
    ? smList.map(r => `| ${r.parameter} | ${r.observedValue} | ${r.qualitativeNote} | ${r.confidence} | ${r.source} |`).join("\n")
    : "| Parameter | Measured / Observed Value | Qualitative Note | Confidence | Source |\n| --- | --- | --- | --- | --- |\n| Mean F0 | [ ] | [ ] | [ ] | [ ] |";

  return `**COMPREHENSIVE SPEECH & VOCAL SYNTAX PROFILE PROFILE**  
**Version 1.0 – Maximum Detail Edition**  
**Purpose:** Forensic-level, replicable analysis representing of reference person’s speech profile.

---

### SUBJECT IDENTIFICATION & METADATA

**Full Name / Identifier:**  
${report.subjectMetadata.fullName || "[ ]"}

**Age / Apparent Age:**  
${report.subjectMetadata.age || "[ ]"}

**Gender / Gender Presentation:**  
${report.subjectMetadata.gender || "[ ]"}

**Relevant Demographics & Background:**  
${report.subjectMetadata.demographics || "[ ]"}

**Date(s) of Analysis:**  
${report.subjectMetadata.dateOfAnalysis || "[ ]"}

**Analyst(s):**  
${report.subjectMetadata.analyst || "[ ]"}

**Primary Goal of Analysis:**  
${report.subjectMetadata.primaryGoal || "[ ]"}

---

### DATA SOURCES & METHODOLOGY

**Audio / Video Sources Analyzed:**  
${report.dataSourceMethodology.audioVideoSources || "[ ]"}

**Total Duration Analyzed:**  
${report.dataSourceMethodology.totalDuration || "[ ]"}

**Recording Conditions:**  
${report.dataSourceMethodology.recordingConditions || "[ ]"}

**Contexts Captured:**  
${report.dataSourceMethodology.contextsCaptured || "[ ]"}

**Text / Transcript Sources:**  
${report.dataSourceMethodology.textTranscriptSources || "[ ]"}

**Supplementary Research Sources:**  
${report.dataSourceMethodology.supplementaryResearch || "[ ]"}

**Analysis Methodology:**  
${report.dataSourceMethodology.analysisMethodology || "[ ]"}

**Limitations of Available Data:**  
${report.dataSourceMethodology.limitationsOfData || "[ ]"}

---

### SECTION 1: VOICE SOUND CHARACTERISTICS

#### 1.1 Fundamental Frequency (F0) & Glottal Source
- **Mean F0 (conversational):** ${report.acousticParameters.meanF0 || "[ ]"} Hz  
- **Sustained phonation range:** ${report.acousticParameters.sustainedPhonationRange || "[ ]"} Hz  
- **F0 stability / standard deviation:** ${report.acousticParameters.f0StabilitySD || "[ ]"} Hz  
- **Coefficient of variation:** ${report.acousticParameters.coeffOfVariation || "[ ]"}  
- **Organic pitch range (total excursion in connected speech):** ${report.acousticParameters.organicPitchRangeSemitones || "[ ]"} semitones  
- **Glottal source type:** ${report.acousticParameters.glottalSourceType || "[ ]"}  
- **Closed quotient estimate:** ${report.acousticParameters.closedQuotientEstimate || "[ ]"}  
- **Glottal pulse description (abrupt vs. gradual closure, open phase characteristics):**  
  ${report.acousticParameters.glottalPulseDescription || "[ ]"}  
- **Physiological notes (laryngeal size, vocal fold characteristics):**  
  ${report.acousticParameters.physiologicalNotes || "[ ]"}  
- **Waveform periodicity rating:** ${report.acousticParameters.waveformPeriodicity || "[ ]"}

#### 1.2 Time-Domain Waveform Properties
- **Overall waveform shape:** ${report.acousticParameters.waveformShape || "[ ]"}  
- **Amplitude envelope characteristics:** ${report.acousticParameters.amplitudeEnvelope || "[ ]"}  
- **Peak-to-peak amplitude / typical conversational SPL:** ${report.acousticParameters.peakToPeakSPL || "[ ]"}  
- **Micro-variations (shimmer contribution to texture):** ${report.acousticParameters.shimmerContribution || "[ ]"}  
- **Additive noise / aspiration / turbulent airflow throughout voiced segments:**  
  ${report.acousticParameters.additiveNoiseSeverity || "[ ]"}  
- **Zero-crossing behavior:** ${report.acousticParameters.zeroCrossingBehavior || "[ ]"}  
- **Amplitude decay in longer utterances:** ${report.acousticParameters.amplitudeDecay || "[ ]"}  
- **Presence and nature of low-level ripples or turbulence:** ${report.acousticParameters.lowLevelRipples || "[ ]"}

#### 1.3 Frequency-Domain & Spectral Characteristics
- **Harmonic structure strength and extent:** ${report.acousticParameters.harmonicStructureStrength || "[ ]"}  
- **Spectral tilt / slope:** ${report.acousticParameters.spectralTilt || "[ ]"}  
- **Harmonics-to-Noise Ratio (HNR) on sustained vowels:** ${report.acousticParameters.hnrOnSustainedVowels || "[ ]"} dB  
- **Formant frequencies (F1, F2, F3) for key vowels (e.g., /ɑ/, /i/, /u/):**  
  - /ɑ/: F1: ${report.acousticParameters.vowelFormants.vowelAH_F1 || "[ ]"} Hz, F2: ${report.acousticParameters.vowelFormants.vowelAH_F2 || "[ ]"} Hz, F3: ${report.acousticParameters.vowelFormants.vowelAH_F3 || "[ ]"} Hz  
  - /i/: F1: ${report.acousticParameters.vowelFormants.vowelIY_F1 || "[ ]"} Hz, F2: ${report.acousticParameters.vowelFormants.vowelIY_F2 || "[ ]"} Hz, F3: ${report.acousticParameters.vowelFormants.vowelIY_F3 || "[ ]"} Hz  
  - /u/: F1: ${report.acousticParameters.vowelFormants.vowelUW_F1 || "[ ]"} Hz, F2: ${report.acousticParameters.vowelFormants.vowelUW_F2 || "[ ]"} Hz, F3: ${report.acousticParameters.vowelFormants.vowelUW_F3 || "[ ]"} Hz  
- **Vowel space description (centralized, expanded, compressed, raised/lowered):**  
  ${report.acousticParameters.vowelSpaceDescription || "[ ]"}  
- **Resonance profile (oral, nasal, pharyngeal, cul-de-sac, mixed):**  
  ${report.acousticParameters.resonanceProfile || "[ ]"}  
- **Long-term average spectrum (LTAS) shape:** ${report.acousticParameters.ltasShape || "[ ]"}  
- **Additional spectral features (nasal formants/anti-formants, spectral moments, center of gravity):**  
  ${report.acousticParameters.additionalSpectralFeatures || "[ ]"}

#### 1.4 Perturbation & Voice Quality Metrics
- **Jitter (local, cycle-to-cycle F0 variation):** ${report.acousticParameters.jitterLocal || "[ ]"}%  
- **Shimmer (local, cycle-to-cycle amplitude variation):** ${report.acousticParameters.shimmerLocal || "[ ]"}%  
- **Cepstral Peak Prominence (CPP):** ${report.acousticParameters.cppValue || "[ ]"} dB  
- **Other perturbation or noise measures (if available):** ${report.acousticParameters.otherPerturbationMeasures || "[ ]"}  
- **GRBAS perceptual voice quality rating:**  
  Grade: ${report.acousticParameters.grbasRatings.grade || 0} | Roughness: ${report.acousticParameters.grbasRatings.roughness || 0} | Breathiness: ${report.acousticParameters.grbasRatings.breathiness || 0} | Asthenia: ${report.acousticParameters.grbasRatings.asthenia || 0} | Strain: ${report.acousticParameters.grbasRatings.strain || 0}  
- **Overall perceptual voice quality descriptors:** ${report.acousticParameters.overallPerceptualDescriptors || "[ ]"}

---

### SECTION 2: TONE & RHYTHM

- **Speaking rate:** ${report.prosodicAnalysis.speakingRateWPM || "[ ]"} words per minute / ${report.prosodicAnalysis.speakingRateSyllables || "[ ]"} syllables per second  
- **Rhythm type:** ${report.prosodicAnalysis.rhythmType || "[ ]"}  
- **Pitch variation & range in connected speech:** ${report.prosodicAnalysis.pitchVariationSemitones || "[ ]"} semitones; description: ${report.prosodicAnalysis.intonationPatterns || "[ ]"}  
- **Intonation patterns:** ${report.prosodicAnalysis.intonationPatterns || "[ ]"}  
- **Loudness & dynamic range:** ${report.prosodicAnalysis.loudnessDynamicRange || "[ ]"}  
- **Pause structure:** ${report.prosodicAnalysis.pauseStructure || "[ ]"}  
- **Phrasing & chunking:** ${report.prosodicAnalysis.phrasingChunking || "[ ]"}  
- **Stress & prominence:** ${report.prosodicAnalysis.stressProminence || "[ ]"}  
- **Rhythmic feel / “bounce” or cadence:** ${report.prosodicAnalysis.rhythmicBounceCadence || "[ ]"}  
- **Emotional or attitudinal prosody:** ${report.prosodicAnalysis.emotionalProsody || "[ ]"}

---

### SECTION 3: ACCENT & DIALECT

- **Primary accent / dialect classification:** ${report.dialectFeatures.primaryClassification || "[ ]"}  
- **Strength / consistency of accent features:** ${report.dialectFeatures.strengthConsistency || "[ ]"}  
- **Usage frequency of full accent features:** ${report.dialectFeatures.usageFrequency || "[ ]"}  
- **Key consonant features (with examples and realization rules):**  
  ${report.dialectFeatures.keyConsonantFeatures || "[ ]"}  
- **Key vowel features (with examples):**  
  ${report.dialectFeatures.keyVowelFeatures || "[ ]"}  
- **Prosodic / intonational accent features:** ${report.dialectFeatures.prosodicIntonationalFeatures || "[ ]"}  
- **Code-switching behavior:** ${report.dialectFeatures.codeSwitchingBehavior || "[ ]"}  
- **Phonological processes that are variable or optional:** ${report.dialectFeatures.variablePhonologicalProcesses || "[ ]"}

---

### SECTION 4: PRONUNCIATION & ARTICULATION

- **Overall articulatory precision:** ${report.phoneticArticulatory.overallPrecision || "[ ]"}  
- **Consonant production characteristics:** ${report.phoneticArticulatory.consonantProduction || "[ ]"}  
- **Vowel production & coarticulation:** ${report.phoneticArticulatory.vowelProductionCoarticulation || "[ ]"}  
- **Fluency & disfluencies:** ${report.phoneticArticulatory.fluencyDisfluencies || "[ ]"}  
- **Effort or tension in articulation:** ${report.phoneticArticulatory.effortTension || "[ ]"}  
- **Lip, jaw, and tongue movement characteristics (visible in video):** ${report.phoneticArticulatory.lipJawTongueMovement || "[ ]"}

---

### SECTION 5: VOCABULARY & WORD CHOICE

- **Vocabulary range & complexity:** ${report.lexicalVocabulary.vocabularyRangeComplexity || "[ ]"}  
- **Register & stylistic level:** ${report.lexicalVocabulary.registerStylisticLevel || "[ ]"}  
- **Use of slang, jargon, or in-group vocabulary:** ${report.lexicalVocabulary.useOfSlangJargon || "[ ]"}  
- **Idiosyncratic word choices or repeated lexical patterns:** ${report.lexicalVocabulary.idiosyncraticWordChoices || "[ ]"}  
- **Hedges, fillers, discourse markers:** ${report.lexicalVocabulary.hedgesFillersDiscourse || "[ ]"}  
- **Swearing / taboo language patterns:** ${report.lexicalVocabulary.swearingTabooPatterns || "[ ]"}  
- **Code-switching at lexical level:** ${report.lexicalVocabulary.codeSwitchingLexicalLevel || "[ ]"}

---

### SECTION 6: GRAMMAR & SENTENCE STRUCTURE

- **Average sentence length & complexity:** ${report.syntacticGrammatical.averageSentenceLengthComplexity || "[ ]"}  
- **Preferred sentence structures:** ${report.syntacticGrammatical.preferredSentenceStructures || "[ ]"}  
- **Grammatical accuracy & typical “errors” or non-standard patterns:** ${report.syntacticGrammatical.grammaticalAccuracyNonStandard || "[ ]"}  
- **Use of specific constructions:** ${report.syntacticGrammatical.useOfSpecificConstructions || "[ ]"}  
- **Ellipsis, deletion, or reduction patterns:** ${report.syntacticGrammatical.ellipsisDeletionReduction || "[ ]"}  
- **Discourse-level syntax:** ${report.syntacticGrammatical.discourseLevelSyntax || "[ ]"}

---

### SECTION 7: CONVERSATION STYLE

- **Turn-taking style:** ${report.pragmaticDiscourse.turnTakingStyle || "[ ]"}  
- **Topic management & coherence:** ${report.pragmaticDiscourse.topicManagementCoherence || "[ ]"}  
- **Politeness strategies, hedging, and face-saving:** ${report.pragmaticDiscourse.politenessStrategies || "[ ]"}  
- **Emotional expression through language:** ${report.pragmaticDiscourse.emotionalExpression || "[ ]"}  
- **Humor, sarcasm, irony usage:** ${report.pragmaticDiscourse.humorSarcasmIrony || "[ ]"}  
- **Narrative style (if observed):** ${report.pragmaticDiscourse.narrativeStyle || "[ ]"}  
- **Listener engagement techniques:** ${report.pragmaticDiscourse.listenerEngagement || "[ ]"}

---

### SECTION 8: OVERALL VOICE TONE & QUALITY

- **Core timbre descriptors:** ${report.vocalQualityTimbre.coreTimbreDescriptors || "[ ]"}  
- **Resonance balance:** ${report.vocalQualityTimbre.resonanceBalance || "[ ]"}  
- **Overall “sound” of the voice:**  
  ${report.vocalQualityTimbre.overallSoundParagraph || "[ ]"}  
- **Tone / attitudinal coloring:** ${report.vocalQualityTimbre.toneAttitudinalColoring || "[ ]"}  
- **Consistency of vocal quality across contexts:** ${report.vocalQualityTimbre.consistencyVocalQuality || "[ ]"}

---

### SECTION 9: PHYSICAL & HEALTH FACTORS

- **Known or inferred anatomical/physiological factors affecting voice/speech:**  
  ${report.physiologicalAnatomical.anatomicalFactors || "[ ]"}  
- **Impact of these factors on the parameters above:**  
  ${report.physiologicalAnatomical.impactOfFactorsOnParameters || "[ ]"}  
- **Any diagnosed or suspected voice/speech disorders:**  
  ${report.physiologicalAnatomical.diagnosedOrSuspectedDisorders || "[ ]"}

---

### SECTION 10: HOW THE VOICE CHANGES IN DIFFERENT SITUATIONS

- **How voice, accent, prosody, vocabulary, and syntax change across contexts:**  
  ${report.variabilityContext.contextVoiceChanges || "[ ]"}  
- **Fatigue, emotion, or health effects on speech:**  
  ${report.variabilityContext.fatigueEmotionHealthImpact || "[ ]"}  
- **Code-switching patterns (dialectal, stylistic, or bilingual):**  
  ${report.variabilityContext.codeSwitchingPatterns || "[ ]"}  
- **Consistency vs. strategic variation:**  
  ${report.variabilityContext.consistencyVsStrategic || "[ ]"}

---

### SECTION 11: VOICE CLONING SUMMARY

**Holistic Perceptual Impression:**  
${report.speechSignatureReplicable.holisticPerceptualImpression || "[ ]"}

**Key Replicable Parameters for Voice Synthesis / Cloning / AI Character Consistency:**  
- **Mean F0:** ${report.speechSignatureReplicable.replicableParams.meanF0 || "[ ]"}  
- **Spectral tilt:** ${report.speechSignatureReplicable.replicableParams.spectralTilt || "[ ]"}  
- **Key resonance / nasality features:** ${report.speechSignatureReplicable.replicableParams.keyResonanceNasality || "[ ]"}  
- **Prosodic signature (rate, pitch range, intonation style):** ${report.speechSignatureReplicable.replicableParams.prosodicSignature || "[ ]"}  
- **Accent / dialect features to prioritize:** ${report.speechSignatureReplicable.replicableParams.accentDialectFeatures || "[ ]"}  
- **Lexical & syntactic tendencies:** ${report.speechSignatureReplicable.replicableParams.lexicalSyntacticTendencies || "[ ]"}  
- **Vocal quality / timbre anchors:** ${report.speechSignatureReplicable.replicableParams.vocalQualityTimbreAnchors || "[ ]"}  
- **Movement / performance notes (if video):** ${report.speechSignatureReplicable.replicableParams.movementPerformanceNotes || "[ ]"}  
- **Any other critical “locking” details:** ${report.speechSignatureReplicable.replicableParams.otherCriticalLockingDetails || "[ ]"}

---

### SECTION 12: SUMMARY OF KEY FEATURES

| Parameter | Measured / Observed Value | Qualitative Note | Confidence | Source |
| --- | --- | --- | --- | --- |
${smTableText}

---

### FINAL NOTES, LIMITATIONS, CONFIDENCE & CITATIONS

**Overall Confidence in This Profile:** ${report.finalNotes.overallConfidence || "Moderate"}  
**Major Limitations of the Current Analysis:** ${report.finalNotes.majorLimitations || "[ ]"}  
**Recommended Additional Data for Higher Fidelity:** ${report.finalNotes.recommendedAdditionalData || "[ ]"}  
**Full Reference List / Citations:**  
${report.finalNotes.citationsList || "[ ]"}

${report.bodyMannerismsAnalysis ? `---

### DETAILED KINESICS & BODY MANNERISMS ANALYSIS (VIDEO ANALYSIS ONLY)
${report.bodyMannerismsAnalysis}` : ""}

---

**End of Template**`;
}

/**
 * Creates a blank structural skeleton report conforming to the template.
 */
export function createBlankReport(): VocalSyntaxReport {
  return {
    id: `report-${Date.now()}`,
    title: "Unlabelled Forensic Speech Profile",
    dateCreated: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    subjectMetadata: {
      fullName: "Subject Identifier",
      age: "Estimated 30s",
      gender: "Male / Female",
      demographics: "Unknown",
      dateOfAnalysis: new Date().toISOString().substring(0, 10),
      analyst: "Auditory Analyst",
      primaryGoal: "AI speech styling template calibration"
    },
    dataSourceMethodology: {
      audioVideoSources: "N/A",
      totalDuration: "N/A",
      recordingConditions: "N/A",
      contextsCaptured: "N/A",
      textTranscriptSources: "N/A",
      supplementaryResearch: "N/A",
      analysisMethodology: "Forensic listening protocol",
      limitationsOfData: "No clear raw audio sources uploaded yet"
    },
    acousticParameters: {
      meanF0: 120,
      sustainedPhonationRange: "80-240",
      f0StabilitySD: 8.5,
      coeffOfVariation: "N/A",
      organicPitchRangeSemitones: 8,
      glottalSourceType: "Modal",
      closedQuotientEstimate: "0.45",
      glottalPulseDescription: "Modal glottal wavefront with predictable asymmetric closure slope.",
      physiologicalNotes: "Regular vocal fold density and normal laryngeal proportions.",
      waveformPeriodicity: "Highly periodic",
      waveformShape: "Typical quasi-sinusoidal",
      amplitudeEnvelope: "Approx 15dB conversational span",
      peakToPeakSPL: "68 dB",
      shimmerContribution: "Minor",
      additiveNoiseSeverity: "Low",
      zeroCrossingBehavior: "Continuous",
      amplitudeDecay: "Standard",
      lowLevelRipples: "Minor",
      harmonicStructureStrength: "Strong spectrum up to 3kHz",
      spectralTilt: "-12 dB/Octave",
      hnrOnSustainedVowels: 20,
      vowelFormants: {
        vowelAH_F1: 730, vowelAH_F2: 1090, vowelAH_F3: 2440,
        vowelIY_F1: 270, vowelIY_F2: 2290, vowelIY_F3: 3010,
        vowelUW_F1: 300, vowelUW_F2: 870, vowelUW_F3: 2240
      },
      vowelSpaceDescription: "Balanced average vowel space.",
      resonanceProfile: "Mainly oral-chest",
      ltasShape: "Smooth spectral roll-off",
      additionalSpectralFeatures: "N/A",
      jitterLocal: 0.50,
      shimmerLocal: 1.50,
      cppValue: 16.0,
      otherPerturbationMeasures: "Normal H1-H2 bounds",
      grbasRatings: {
        grade: 0,
        roughness: 0,
        breathiness: 0,
        asthenia: 0,
        strain: 0
      },
      overallPerceptualDescriptors: "Standard balanced parameters."
    },
    prosodicAnalysis: {
      speakingRateWPM: 120,
      speakingRateSyllables: 3.0,
      rhythmType: "Stress-timed",
      pitchVariationSemitones: 6.0,
      intonationPatterns: "N/A",
      loudnessDynamicRange: "N/A",
      pauseStructure: "N/A",
      phrasingChunking: "N/A",
      stressProminence: "N/A",
      rhythmicBounceCadence: "N/A",
      emotionalProsody: "N/A"
    },
    dialectFeatures: {
      primaryClassification: "General Standard Accent",
      strengthConsistency: "Moderate",
      usageFrequency: "N/A",
      keyConsonantFeatures: "Standard consonant positioning",
      keyVowelFeatures: "Standard vowel lengths",
      prosodicIntonationalFeatures: "N/A",
      codeSwitchingBehavior: "N/A",
      variablePhonologicalProcesses: "N/A"
    },
    phoneticArticulatory: {
      overallPrecision: "Clear",
      consonantProduction: "N/A",
      vowelProductionCoarticulation: "N/A",
      fluencyDisfluencies: "N/A",
      effortTension: "N/A",
      lipJawTongueMovement: "N/A"
    },
    lexicalVocabulary: {
      vocabularyRangeComplexity: "Moderate",
      registerStylisticLevel: "Standard",
      useOfSlangJargon: "N/A",
      idiosyncraticWordChoices: "N/A",
      hedgesFillersDiscourse: "Standard",
      swearingTabooPatterns: "N/A",
      codeSwitchingLexicalLevel: "N/A"
    },
    syntacticGrammatical: {
      averageSentenceLengthComplexity: "Moderate",
      preferredSentenceStructures: "SVO structural",
      grammaticalAccuracyNonStandard: "Standard",
      useOfSpecificConstructions: "N/A",
      ellipsisDeletionReduction: "N/A",
      discourseLevelSyntax: "N/A"
    },
    pragmaticDiscourse: {
      turnTakingStyle: "Collaborative",
      topicManagementCoherence: "Standard",
      politenessStrategies: "Normal",
      emotionalExpression: "N/A",
      humorSarcasmIrony: "N/A",
      narrativeStyle: "N/A",
      listenerEngagement: "N/A"
    },
    vocalQualityTimbre: {
      coreTimbreDescriptors: "Neutral standard",
      resonanceBalance: "Oral",
      overallSoundParagraph: "Standard speaking voice profile with regular metrics.",
      toneAttitudinalColoring: "Neutral",
      consistencyVocalQuality: "Stable"
    },
    physiologicalAnatomical: {
      anatomicalFactors: "N/A",
      impactOfFactorsOnParameters: "N/A",
      diagnosedOrSuspectedDisorders: "None"
    },
    variabilityContext: {
      contextVoiceChanges: "N/A",
      fatigueEmotionHealthImpact: "N/A",
      codeSwitchingPatterns: "N/A",
      consistencyVsStrategic: "N/A"
    },
    speechSignatureReplicable: {
      holisticPerceptualImpression: "A typical neutral standard speaking voice profile.",
      replicableParams: {
        meanF0: "120 Hz",
        spectralTilt: "-12 dB/Octave",
        keyResonanceNasality: "Oral",
        prosodicSignature: "Rate of 120 WPM",
        accentDialectFeatures: "General Stan",
        lexicalSyntacticTendencies: "Regular syntax patterns",
        vocalQualityTimbreAnchors: "Stable modal vibration",
        movementPerformanceNotes: "N/A",
        otherCriticalLockingDetails: "None"
      }
    },
    summaryMetricsTable: [
      {
        parameter: "Mean F0",
        observedValue: "120 Hz",
        qualitativeNote: "Within average ranges",
        confidence: "Moderate",
        source: "Template baseline estimate"
      }
    ],
    finalNotes: {
      overallConfidence: "Moderate",
      confidenceJustification: "Standard default mock value structure.",
      majorLimitations: "None, baseline template model.",
      recommendedAdditionalData: "Upload raw files or transcription context.",
      citationsList: "Vocal Syntax Studio Core Template."
    }
  };
}

/**
 * Packs the clinical dialectal, biometric phonetic metrics into an industry-grade format 
 * designed for direct copy-and-pasting into voice generators and character builders.
 */
export function formatReportToVoicePrompt(report: VocalSyntaxReport): string {
  const { subjectMetadata, acousticParameters, prosodicAnalysis, dialectFeatures, vocalQualityTimbre, syntacticGrammatical, lexicalVocabulary } = report;
  
  return `### VOICE SYNTHESIS CRITERIA & STYLE CLONING INSTRUCTIONS

SPEECH CLONING MODEL TARGET: ${report.title || "Vocal Syntax Fingerprint"}
SUBJECT IDENTIFICATION: ${subjectMetadata.fullName || "Unnamed Subject"} (Estimated Age: ${subjectMetadata.age || "Adult"}, Gender: ${subjectMetadata.gender || "Not Specified"})

[1. PRIMARY ACOUSTIC BIOMETRICS]
- Pitch Center (Mean F0): ${acousticParameters.meanF0 || "120"} Hz
- Glottal Phonation Signature: ${acousticParameters.glottalSourceType || "Modal"} (Pitch range stability: ${acousticParameters.f0StabilitySD || "8.0"} Hz, total excursion: ${acousticParameters.organicPitchRangeSemitones || "6.0"} semitones)
- Spectral Timbre / Harmonic Contour: ${vocalQualityTimbre.coreTimbreDescriptors || "Balanced average density"}
- Resonance Profile: ${vocalQualityTimbre.resonanceBalance || "Mainly oral-chest"} resonance balance with pitch tilt of ${acousticParameters.spectralTilt || "-12 dB/Octave"}

[2. PROSODY, INTONATION & PACING]
- Cadence Tempo: ${prosodicAnalysis.speakingRateWPM || "120"} words per minute (${prosodicAnalysis.speakingRateSyllables || "3.0"} syllables/sec)
- Rhythm Structure: ${prosodicAnalysis.rhythmType || "Stress-timed"} rhythm type with a physical dynamic range profiled as ${prosodicAnalysis.loudnessDynamicRange || "Stable standard amplitude"}
- Accentuated Terminals: ${prosodicAnalysis.intonationPatterns || "Standard falling slopes with clear punctuation anchors"}
- Pause Pattern: ${prosodicAnalysis.pauseStructure || "Natural respiratory pause durations"}

[3. DIALECTAL POSTURE & SOCIOLECT FEATURES]
- Core Dialect / Accent: ${dialectFeatures.primaryClassification || "Neutral Standard"}
- Specific Phoneme Realizations: ${dialectFeatures.keyConsonantFeatures || "Clear consonantal enunciation"}
- Vocalic Shift Features: ${dialectFeatures.keyVowelFeatures || "Symmetric vowel triangular spans"}
- Code-Switching Contexts: ${dialectFeatures.codeSwitchingBehavior || "Maintains stable monolingual register consistency"}

[4. LEXICAL SYNTAX FOOTPRINT]
- Sentence Length & Grammar: ${syntacticGrammatical.averageSentenceLengthComplexity || "Moderate complexity ranges"} (Preferred structures: ${syntacticGrammatical.preferredSentenceStructures || "standard clauses"})
- Stylistic Register Level: ${lexicalVocabulary.registerStylisticLevel || "Standard collaborative dialogue"}
- Idiosyncratic Repeat Words: ${lexicalVocabulary.idiosyncraticWordChoices || "None, balanced lexical flow"}`;
}
