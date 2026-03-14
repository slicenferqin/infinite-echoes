// Core type definitions for Infinite Echoes

// ============ Episode & Location ============

export interface CulturalProfile {
  valueCore: string[];
  expressionStyle: 'restrained' | 'intense';
  taboo: string[];
}

export interface EpisodeMetaNarrativeHooks {
  postSettlement?: string[];
}

export interface EpisodeAfterLeaveEffect {
  routeType: RouteDefinition['type'];
  outcome: string[];
}

export interface EpisodeCivilizationFrame {
  civilizationSlice: string;
  philosophicalQuestion: string;
  institutionalCruelty: string[];
  historicalShadow: string[];
  metaNarrativeYield: string[];
  afterPlayerLeaves: EpisodeAfterLeaveEffect[];
}

export interface EpisodeEvaluationSignal {
  id: string;
  description: string;
}

export interface EpisodeEvaluationConfig {
  truthReference: string;
  signalDefinitions: EpisodeEvaluationSignal[];
  summaryInstruction?: string;
}

export interface RouteProgressCheckpoint {
  id: string;
  label: string;
  weight: number;
  trigger: {
    type: 'clue' | 'flag';
    key: string;
  };
}

export interface RouteProgressTrack {
  routeId: string;
  routeType: RouteDefinition['type'];
  name: string;
  checkpoints: RouteProgressCheckpoint[];
}

export type TimelineMode = 'round' | 'realtime_day';

export interface EpisodePacingConfig {
  mode: TimelineMode;
  dayDurationSec: number;
  totalDays: number;
  slotLabels: string[];
  heartbeatIntervalSec: number;
  heartbeatTimeoutSec: number;
  llmTimeMultiplier: number;
}

export interface IdentitySocialBias {
  npcId: string;
  trustDelta: number;
  threatDelta: number;
}

export interface IdentityDefinition {
  id: string;
  name: string;
  title: string;
  brief: string;
  hardUnlocks: string[];
  socialBiases: IdentitySocialBias[];
  riskHooks: string[];
}

export interface EpisodeIdentityConfig {
  mode: 'random_pool' | 'legacy_profession';
  allowReroll: boolean;
  pool: IdentityDefinition[];
}

export interface SocialLeadRule {
  id: string;
  npcIds: string[];
  leadFlag: string;
  minTrust: number;
  keywords: string[];
  unlockedHint: string;
  requiresClues?: string[];
  requiresFlags?: string[];
}

export interface SocialEligibilityRule {
  minimumUniqueContacts?: number;
  mustIncludeNpcIds?: string[];
  oneOfNpcIds?: string[];
  minimumNpcLeadCount?: number;
}

export interface GovernanceLedger {
  order: number;
  humanity: number;
  survival: number;
}

export interface WorldPressureState {
  publicHeat: number;
  evidenceDecay: number;
  rumorByNpc: Record<string, number>;
  locationPressure: Record<string, number>;
}

export interface PersistentNpcState {
  npcId: string;
  trust: number;
  suspicion: number;
  affinityTags: string[];
  revealedTopics: string[];
  memorySummary: string;
  lastEpisodeId?: string;
  lastUpdatedAt: number;
}

export interface ArchiveEntry {
  id: string;
  episodeId: string;
  routeId: string;
  routeType: RouteDefinition['type'];
  title: string;
  summary: string;
  learnedTruths: string[];
  unlockedAt: number;
}

export interface ArchiveLedgerState {
  entries: ArchiveEntry[];
  unlockedEpisodeIds: string[];
}

export interface AnomalyTrack {
  id: string;
  level: number;
  firstSeenEpisodeId: string;
  lastSeenEpisodeId: string;
  notes: string[];
  confirmed: boolean;
}

export interface AnomalyLedgerState {
  tracks: Record<string, AnomalyTrack>;
}

export interface CognitionNodeState {
  id: string;
  level: 0 | 1 | 2 | 3;
  sourceEpisodeIds: string[];
  lastUpdatedAt: number;
}

export interface PlayerCognitionState {
  nodes: Record<string, CognitionNodeState>;
}

export interface MetaWorldState {
  userId: string;
  version: number;
  updatedAt: number;
  worldFlags: Record<string, boolean>;
  unlockedHubAreas: string[];
  persistentNpcStates: Record<string, PersistentNpcState>;
  archive: ArchiveLedgerState;
  anomalies: AnomalyLedgerState;
  cognition: PlayerCognitionState;
}

export interface MetaWorldSummaryItem {
  id: string;
  label: string;
  level?: number;
  confirmed?: boolean;
  trust?: number;
  suspicion?: number;
  episodeId?: string;
  routeType?: RouteDefinition['type'];
}

export interface MetaWorldSummary {
  unlockedHubAreas: string[];
  npcRelations: MetaWorldSummaryItem[];
  anomalyHighlights: MetaWorldSummaryItem[];
  cognitionHighlights: MetaWorldSummaryItem[];
  recentArchives: MetaWorldSummaryItem[];
}

export interface MetaWorldNpcDetail {
  id: string;
  label: string;
  trust: number;
  suspicion: number;
  affinityTags: string[];
  revealedTopics: string[];
  memorySummary: string;
  lastEpisodeId?: string;
  lastUpdatedAt: number;
}

export interface MetaWorldAnomalyDetail {
  id: string;
  label: string;
  level: number;
  firstSeenEpisodeId: string;
  lastSeenEpisodeId: string;
  notes: string[];
  confirmed: boolean;
}

export interface MetaWorldCognitionDetail {
  id: string;
  label: string;
  level: 0 | 1 | 2 | 3;
  sourceEpisodeIds: string[];
  lastUpdatedAt: number;
}

export interface MetaWorldArchiveDetail {
  id: string;
  episodeId: string;
  routeId: string;
  routeType: RouteDefinition['type'];
  title: string;
  summary: string;
  learnedTruths: string[];
  unlockedAt: number;
}

export interface MetaWorldHubPayload {
  summary: MetaWorldSummary;
  persistentNpcs: MetaWorldNpcDetail[];
  anomalies: MetaWorldAnomalyDetail[];
  cognition: MetaWorldCognitionDetail[];
  archiveEntries: MetaWorldArchiveDetail[];
  recentArtifacts: Array<{
    id: string;
    episodeId: string;
    routeId: string;
    kind: string;
    title: string;
    createdAt: number;
  }>;
  recentChronicles: Array<{
    id: string;
    episodeId: string;
    routeId: string;
    routeType: string;
    title: string;
    createdAt: number;
  }>;
  novelProjects: Array<{
    id: string;
    chronicleEntryId: string;
    status: string;
    targetChapterCount: number;
    targetWordsPerChapter: number;
    createdAt: number;
    previewChapters: Array<{
      chapter: number;
      title: string;
      pov: string;
    }>;
  }>;
}

export interface RouteGovernanceCondition {
  orderMin?: number;
  humanityMin?: number;
  survivalMin?: number;
}

export interface EpisodeMetaEffectRule {
  whenRouteIds?: string[];
  whenRouteTypes?: Array<RouteDefinition['type']>;
  setWorldFlags?: string[];
  unlockHubAreas?: string[];
  anomalyDeltas?: Array<{
    id: string;
    delta: number;
    note: string;
    confirm?: boolean;
  }>;
  cognitionDeltas?: Array<{
    id: string;
    level: 0 | 1 | 2 | 3;
  }>;
  persistentNpcDeltas?: Array<{
    npcId: string;
    trustDelta?: number;
    suspicionDelta?: number;
    addTags?: string[];
    revealTopics?: string[];
    memorySummaryAppend?: string;
  }>;
  archiveEntry?: {
    title: string;
    summary: string;
    learnedTruths: string[];
  };
}

export interface EpisodeConfig {
  id: string;
  name: string;
  description: string;
  difficulty: number; // 1-5
  maxRounds: number;
  startLocationId?: string;
  locations: Location[];
  npcs: NpcProfile[];
  clues: ClueDefinition[];
  items: ItemDefinition[];
  routes: RouteDefinition[];
  progressTracks?: RouteProgressTrack[];
  identity?: EpisodeIdentityConfig;
  socialLeadRules?: SocialLeadRule[];
  socialEligibility?: SocialEligibilityRule;
  pacing?: EpisodePacingConfig;
  caseFacts: string; // shared facts all NPCs know about the case
  canonicalFacts?: string[]; // immutable lore facts that agents must not contradict
  culturalProfile?: CulturalProfile;
  metaNarrativeHooks?: EpisodeMetaNarrativeHooks;
  civilizationFrame?: EpisodeCivilizationFrame;
  metaStateEffects?: EpisodeMetaEffectRule[];
  evaluation: EpisodeEvaluationConfig;
  openingSequence?: Array<{
    type: NarrativeEntry['type'];
    content: string;
    speaker?: string;
  }>;
  openingNarrative: string;
  taskBriefing: string;
}

export interface EpisodeSummary {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  maxRounds: number;
  identityMode?: EpisodeIdentityConfig['mode'];
  identityPoolSize?: number;
  identityAllowReroll?: boolean;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  connectedTo: string[]; // location IDs
  npcsPresent: string[]; // npc IDs (can change dynamically)
  searchableItems: SearchableItem[];
  requiresItem?: string; // item ID needed to enter this location
}

export interface SearchableItem {
  id: string;
  description: string;
  clueId?: string; // if searching this reveals a clue
  itemId?: string; // if searching this gives an item
  requiresFlag?: string; // only visible if this flag is set
  requiresItem?: string; // requires having this item to search
  hiddenUntilFlag?: string; // hidden until flag is set
  requiresLeads?: string[]; // requires social lead flags before clue can be found
  requiresNpcContact?: string[]; // requires player to have contacted certain NPCs
  blockedNarrative?: string; // world text when requirements are not met
}

// ============ Items ============

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  obtainedFrom: 'search' | 'npc' | 'auto'; // how the player gets it
  sourceId?: string; // searchable item ID or NPC ID
  usableAt?: string; // location or searchable item where it can be used
  setsFlag?: string; // flag to set when item is used
}

// ============ NPC ============

export interface NpcLifeCard {
  publicFace: string;
  privateNeed: string;
  coreFear: string;
  tabooTopics: string[];
  speechTraits: string[];
}

export interface NpcRelationshipEdge {
  targetNpcId: string;
  type: string;
  heat: number;
  dependency: string;
  sharedSecretId?: string;
}

export interface NpcLieLayer {
  topic: string;
  lowTrustClaim: string;
  midTrustClaim: string;
  highTrustTruth: string;
  revealThreshold: number;
  leadFlag?: string;
  topicKeywords?: string[];
}

export interface NpcProfile {
  id: string;
  name: string;
  age: number;
  appearance: string;
  personality: string;
  role: string;
  firstImpression?: string;
  emotionalStake?: string;
  approachHint?: string;
  signatureLine?: string;
  locationId: string; // default location
  initialTrust: number;
  knowledge: string; // what they know (for system prompt)
  ignorance: string; // what they don't know
  dialogueStyle: string;
  trustThresholds: TrustThreshold[];
  lifeCard?: NpcLifeCard;
  relationshipEdges?: NpcRelationshipEdge[];
  lieModel?: NpcLieLayer[];
  repairHooks?: string[];
  lies?: string; // what they lie about and why
  specialMechanics?: string;
  systemPrompt?: string; // full system prompt (generated from above)
}

export interface TrustThreshold {
  level: number;
  description: string;
  unlocksInfo: string;
}

// ============ Clues ============

export interface ClueDefinition {
  id: string;
  tier: 'A' | 'B' | 'C' | 'X'; // A=surface, B=core, C=deep, X=false
  name: string;
  description: string;
  obtainedFrom: string; // how to get it
  location?: string;
  requiredTrust?: { npcId: string; level: number };
  requiredFlag?: string;
  forbiddenFlags?: string[];
  setsFlags?: string[];
  isFalse?: boolean; // false/misleading clue
}

// ============ Routes ============

export interface RouteDefinition {
  id: string;
  name: string;
  subtitle: string;
  priority?: number;
  type: 'HE' | 'TE' | 'BE' | 'SE';
  conditions: RouteCondition;
  narrative: string;
  rewards: {
    echoPoints: number;
    destinyChange: number;
  };
}

export interface RouteCondition {
  requiredClues?: string[]; // clue IDs that must be discovered
  minClueCount?: { tier: string; count: number }[];
  requiredFlags?: string[];
  forbiddenFlags?: string[];
  requiredNpcContacts?: string[];
  requiredNpcLeadCount?: number;
  requiredGovernance?: RouteGovernanceCondition;
}

// ============ Game State ============

export type TimelinePauseReason = 'background' | 'offline' | 'settled';

export interface GameTimelineState {
  mode: TimelineMode;
  totalDays: number;
  dayDurationSec: number;
  slotLabels: string[];
  slotDurationSec: number;
  currentDay: number;
  currentSlotIndex: number;
  elapsedSecTotal: number;
  remainingSecTotal: number;
  remainingSecInDay: number;
  isPaused: boolean;
  pauseReason?: TimelinePauseReason;
  lastTickAt: number;
  lastHeartbeatAt: number;
}

export interface SocialLedgerState {
  npcContacted: string[];
  npcConflictFlags: Record<string, boolean>;
  npcRepairProgress: Record<string, number>;
  npcLedClueIds: string[];
  sociallyUnlockedSearchClueIds: string[];
  nonBeEligible: boolean;
  identityRisk: number;
  identityAppliedFlags: string[];
}

export interface GameState {
  sessionId: string;
  ownerUserId: string;
  episodeId: string;
  round: number;
  maxRounds: number;
  phase: 'intro' | 'exploration' | 'submission' | 'settlement';
  timeline: GameTimelineState;
  currentLocation: string;
  player: PlayerState;
  npcStates: Record<string, NpcState>;
  discoveredClues: string[];
  inventory: string[]; // item IDs the player has
  visitedLocations: string[];
  flags: Record<string, boolean>;
  narrativeLog: NarrativeEntry[];
  actionHistory: ActionRecord[];
  socialLedger: SocialLedgerState;
  governanceLedger?: GovernanceLedger;
  worldPressure?: WorldPressureState;
}

export interface PlayerState {
  name: string;
  identityId: string;
  identityName: string;
  identityBrief: string;
  profession?: string; // legacy field for old episodes
  professionTrait?: string; // legacy field for old episodes
}

export interface NpcState {
  trust: number;
  threat: number;
  stance: 'open' | 'guarded' | 'hostile';
  mood: string;
  conversationHistory: ConversationMessage[];
  conversationSummary?: string; // compressed summary of older turns
  revealedClues: string[];
  isAvailable: boolean; // can the player talk to them right now
  locationOverride?: string; // if NPC moved from default location
  cooldownUntil?: { day: number; slot: number };
}

export interface ConversationMessage {
  role: 'player' | 'npc';
  content: string;
  round: number;
}

export interface NarrativeEntry {
  type: 'gm' | 'npc' | 'player' | 'system' | 'clue';
  speaker?: string;
  content: string;
  round: number;
  timestamp: number;
}

export interface ActionRecord {
  round: number;
  type: 'move' | 'talk' | 'examine' | 'submit' | 'special';
  target?: string;
  detail?: string;
}

export interface ActiveSessionMeta {
  sessionId: string;
  episodeId: string;
  round: number;
  phase: GameState['phase'];
  updatedAt: number;
}

export interface SessionStore {
  create(state: GameState, ttlMs?: number): string;
  get(sessionId: string): GameState | null;
  set(sessionId: string, state: GameState, ttlMs?: number): void;
  delete(sessionId: string): void;
  listSessionIds(): string[];
  getActiveSession(userId: string): GameState | null;
  getActiveSessionMeta(userId: string): ActiveSessionMeta | null;
  setSessionActive(sessionId: string, isActive: boolean): void;
}

// ============ API Types ============

export interface GameAction {
  type: 'move' | 'talk' | 'examine' | 'look';
  target?: string; // location ID, NPC ID, or item ID
  content?: string; // player's dialogue or submission text
  approach?: 'neutral' | 'empathy' | 'pressure' | 'exchange' | 'present_evidence';
  presentedClueId?: string;
}

export type StartMode = 'new' | 'resume';

export interface ApiStartRequest {
  playerName?: string;
  profession?: string;
  episodeId?: string;
  mode?: StartMode;
}

export interface ApiStartResponse {
  sessionId: string;
  state: GameState;
  episodeMeta: EpisodeSummary;
  episodeConfig: EpisodeConfig;
  identity?: IdentityDefinition | null;
}

export interface ApiActionRequest {
  sessionId: string;
  action: GameAction;
}

export interface ApiActionResponse {
  state: GameState;
}

export interface ApiSubmitRequest {
  sessionId: string;
  submission: string;
}

export interface ApiHeartbeatRequest {
  sessionId: string;
  visible: boolean;
  focused: boolean;
  online: boolean;
}

export interface ApiHeartbeatResponse {
  state: GameState;
  shouldSettle: boolean;
}

export interface GameResponse {
  narrative: NarrativeEntry[];
  stateUpdate: Partial<GameState>;
  availableActions?: string[];
  roundConsumed: boolean;
}

export interface SettlementResult {
  route: RouteDefinition;
  truthScore: number;
  explorationScore: number;
  efficiencyScore: number;
  overallGrade: string;
  echoPoints: number;
  destinyChange: number;
  collectedClueCount: number;
  unlockedRoutes: string[];
  epilogue: string;
}
