import {
  Category,
  Urgency,
  Status,
  Role,
  type Ticket,
  type TicketEvent,
  AiSource,
  ok,
  type Result,
} from '@civicresolve/shared';
import {
  generateTicketId,
  computeDueAt,
  resolveDepartment,
} from '../domain/index.js';
import { WARDS } from './wards.js';
import type { TicketRepository, RepoError } from '../repo/types.js';

interface SeedTemplate {
  category: Category;
  urgency: Urgency;
  wardIndex: number;
  landmarkIndex: number;
  text: string;
  summary: string;
  status: Status;
  ageHours: number;
  duplicateCount?: number;
  reopenCount?: number;
  isEmergency?: boolean;
  escalated?: boolean;
  resolutionNote?: string;
  rejectionNote?: string;
  reopenNote?: string;
}

const SEED_TEMPLATES: SeedTemplate[] = [
  // 1. Emergency Critical
  {
    category: Category.PUBLIC_HAZARD,
    urgency: Urgency.CRITICAL,
    wardIndex: 0, // Indiranagar
    landmarkIndex: 0,
    text: 'Live wire hanging from electric pole sparking over pedestrian sidewalk on 100ft Road. Immediate risk of electrocution!',
    summary: 'Live sparking electric wire hanging on pedestrian walkway',
    status: Status.IN_PROGRESS,
    ageHours: 2,
    isEmergency: true,
  },
  // 2. Duplicate Cluster 1: Indiranagar School Pothole
  {
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    wardIndex: 0,
    landmarkIndex: 1,
    text: 'Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12. School buses and children are getting stuck.',
    summary: 'Deep dangerous pothole outside National Public School',
    status: Status.ASSIGNED,
    ageHours: 18,
    duplicateCount: 4,
  },
  {
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    wardIndex: 0,
    landmarkIndex: 1,
    text: 'Huge road crater and pothole near school gate on 100ft road. A scooter fell into it yesterday morning.',
    summary: 'Large road crater near school gate causing vehicle damage',
    status: Status.ASSIGNED,
    ageHours: 14,
    duplicateCount: 1,
  },
  // 3. Duplicate Cluster 2: Koramangala Garbage Dump
  {
    category: Category.GARBAGE,
    urgency: Urgency.MEDIUM,
    wardIndex: 1, // Koramangala
    landmarkIndex: 0,
    text: 'Garbage dump overflowing on pedestrian footpath near Sony World signal. Stray animals scattering plastic across the road.',
    summary: 'Overflowing garbage dump near Sony World Signal',
    status: Status.IN_PROGRESS,
    ageHours: 36,
    duplicateCount: 3,
  },
  {
    category: Category.GARBAGE,
    urgency: Urgency.MEDIUM,
    wardIndex: 1,
    landmarkIndex: 0,
    text: 'Piles of rotting food waste and uncollected dustbins blocking footpath at Sony World junction. Terrible foul odor.',
    summary: 'Food waste pile and uncollected dustbins on footpath',
    status: Status.IN_PROGRESS,
    ageHours: 28,
    duplicateCount: 2,
  },
  // 4. Overdue Tickets (Age exceeds SLA: critical=24h, high=72h, medium=168h)
  {
    category: Category.STREETLIGHT,
    urgency: Urgency.HIGH, // SLA: 72h
    wardIndex: 2, // Whitefield
    landmarkIndex: 0,
    text: 'Entire lane streetlights completely dark along ITPL Main Road for 5 consecutive nights. Commuters and pedestrians feel unsafe.',
    summary: 'Streetlight failure along ITPL Main Road corridor',
    status: Status.ASSIGNED,
    ageHours: 96, // > 72h -> Overdue and escalated
    escalated: true,
  },
  {
    category: Category.WATER_LEAKAGE,
    urgency: Urgency.HIGH, // SLA: 72h
    wardIndex: 3, // Malleshwaram
    landmarkIndex: 0,
    text: 'Potable water pipeline burst gushing clean drinking water down 8th Cross road, flooding basement entries.',
    summary: 'High pressure drinking water pipeline rupture',
    status: Status.UNDER_REVIEW,
    ageHours: 85, // > 72h -> Overdue pending lazy escalation
    escalated: false,
  },
  {
    category: Category.POTHOLE,
    urgency: Urgency.MEDIUM, // SLA: 168h
    wardIndex: 4, // Jayanagar
    landmarkIndex: 0,
    text: 'Series of multiple potholes along 4th Block commercial complex road damaging bus suspensions.',
    summary: 'Road surface degradation and multiple potholes in market area',
    status: Status.SUBMITTED,
    ageHours: 190, // > 168h -> Overdue pending lazy escalation
    escalated: false,
  },
  // 5. Reopened Tickets (Reopened once from resolved)
  {
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    wardIndex: 5, // HSR Layout
    landmarkIndex: 0,
    text: 'Sunken trench and asphalt caved in across Sector 1 Main road intersection after overnight thunderstorm.',
    summary: 'Sunken road trench caved in after rain',
    status: Status.REOPENED,
    ageHours: 40,
    reopenCount: 1,
    reopenNote: 'Temporary mud filling washed away during rain; crater is back.',
  },
  {
    category: Category.STREETLIGHT,
    urgency: Urgency.MEDIUM,
    wardIndex: 6, // MG Road
    landmarkIndex: 0,
    text: 'Street lamp pole fixture flickering violently and turning off intermittently near Mayo Hall bus stop.',
    summary: 'Flickering street lamp fixture near bus stop',
    status: Status.REOPENED,
    ageHours: 50,
    reopenCount: 1,
    reopenNote: 'Lamp bulb was replaced yesterday but continues to flicker and black out.',
  },
  // 6. Rejected Ticket (Non-civic / Private Property)
  {
    category: Category.OTHER_CIVIC,
    urgency: Urgency.LOW,
    wardIndex: 7, // Electronic City
    landmarkIndex: 0,
    text: 'Private company billboard erected inside private apartment premises blocking residential balcony sunlight.',
    summary: 'Private advertising structure dispute on apartment property',
    status: Status.REJECTED,
    ageHours: 12,
    rejectionNote: 'Commercial hoarding erected on private residential property is outside municipal jurisdiction. Advised civil tenancy dispute resolution.',
  },
  // 7. Resolved Tickets with realistic notes
  {
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    wardIndex: 0,
    landmarkIndex: 2,
    text: 'Pothole on Defense Colony 2nd Cross road causing water stagnation and mosquito breeding.',
    summary: 'Pothole and water logging on Defense Colony cross road',
    status: Status.RESOLVED,
    ageHours: 24,
    resolutionNote: 'Hot-mix asphalt laid and compacted using steam roller by PWD Sub-Division. Site cleared for traffic.',
  },
  {
    category: Category.GARBAGE,
    urgency: Urgency.MEDIUM,
    wardIndex: 1,
    landmarkIndex: 1,
    text: 'Construction debris and discarded dry waste dumped along 5th Block park boundary.',
    summary: 'Construction debris dumped beside neighborhood park',
    status: Status.RESOLVED,
    ageHours: 32,
    resolutionNote: 'Mechanical sweeper and tipper truck deployed. 1.2 metric tons of debris transferred to designated recycling facility.',
  },
  {
    category: Category.STREETLIGHT,
    urgency: Urgency.LOW,
    wardIndex: 2,
    landmarkIndex: 1,
    text: 'Sodium vapor lamp burned out on inner residential lane 3.',
    summary: 'Burned out sodium vapor street lamp on residential street',
    status: Status.RESOLVED,
    ageHours: 16,
    resolutionNote: 'Replaced defective sodium luminaire with energy-efficient 45W LED streetlight.',
  },
  {
    category: Category.SEWER_OVERFLOW,
    urgency: Urgency.MEDIUM,
    wardIndex: 3,
    landmarkIndex: 1,
    text: 'Sewage drain chamber overflowing onto footpath near temple gate.',
    summary: 'Sewer manhole backup and minor street overflow',
    status: Status.RESOLVED,
    ageHours: 18,
    resolutionNote: 'Suction jetting machine cleared grease blockage in main lateral sewer line. Disinfectant sprayed.',
  },
  {
    category: Category.FALLEN_TREE,
    urgency: Urgency.MEDIUM,
    wardIndex: 4,
    landmarkIndex: 1,
    text: 'Heavy tree branch cracked and leaning dangerously over pedestrian jogging track in public park.',
    summary: 'Cracked hanging tree limb over public park walking path',
    status: Status.RESOLVED,
    ageHours: 10,
    resolutionNote: 'Forestry squad pruned damaged limbs and removed fallen wood safely.',
  },
  {
    category: Category.PUBLIC_HAZARD,
    urgency: Urgency.HIGH,
    wardIndex: 5,
    landmarkIndex: 1,
    text: 'Broken concrete drain slab leaving an open 4-foot deep stormwater pit beside bus shelter.',
    summary: 'Uncovered 4-foot stormwater drain pit near transit stop',
    status: Status.RESOLVED,
    ageHours: 20,
    resolutionNote: 'Installed heavy-duty reinforced precast concrete slab cover and secured perimeter.',
  },
  // 8. In Progress Tickets
  {
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    wardIndex: 6,
    landmarkIndex: 1,
    text: 'Deep trench dug for optical fiber cable left unpaved on Church Street roadway.',
    summary: 'Unrestored telecom utility trench cutting across roadway',
    status: Status.IN_PROGRESS,
    ageHours: 8,
  },
  {
    category: Category.GARBAGE,
    urgency: Urgency.HIGH,
    wardIndex: 7,
    landmarkIndex: 1,
    text: 'Illegal dumping of commercial kitchen grease and plastic bags in open stormwater drain.',
    summary: 'Illegal commercial waste dumping in open drain',
    status: Status.IN_PROGRESS,
    ageHours: 15,
  },
  {
    category: Category.STREETLIGHT,
    urgency: Urgency.MEDIUM,
    wardIndex: 0,
    landmarkIndex: 0,
    text: 'Timer switch malfunctioning; streetlights remain ON during full daylight hours and turn off at dusk.',
    summary: 'Astronomical timer failure causing inverted streetlight cycle',
    status: Status.IN_PROGRESS,
    ageHours: 6,
  },
  {
    category: Category.WATER_LEAKAGE,
    urgency: Urgency.HIGH,
    wardIndex: 1,
    landmarkIndex: 0,
    text: 'Sewage contamination suspected in municipal tap water supply across 4 residential houses.',
    summary: 'Suspected sewage infiltration into drinking water pipeline',
    status: Status.IN_PROGRESS,
    ageHours: 5,
  },
  // 9. Assigned Tickets
  {
    category: Category.POTHOLE,
    urgency: Urgency.MEDIUM,
    wardIndex: 2,
    landmarkIndex: 0,
    text: 'Pothole cluster developing at entrance of residential tech park layout.',
    summary: 'Developing pothole cluster at tech park access road',
    status: Status.ASSIGNED,
    ageHours: 12,
  },
  {
    category: Category.GARBAGE,
    urgency: Urgency.LOW,
    wardIndex: 3,
    landmarkIndex: 0,
    text: 'Overfilled dry leaves and organic garden clippings overflowing from compost bin in circle park.',
    summary: 'Organic green waste overfilling community compost station',
    status: Status.ASSIGNED,
    ageHours: 22,
  },
  {
    category: Category.OTHER_CIVIC,
    urgency: Urgency.LOW,
    wardIndex: 4,
    landmarkIndex: 0,
    text: 'Children play area swing chain unhooked and bench broken in neighborhood recreation ground.',
    summary: 'Broken park play equipment and damaged public bench',
    status: Status.ASSIGNED,
    ageHours: 26,
  },
  {
    category: Category.STREETLIGHT,
    urgency: Urgency.MEDIUM,
    wardIndex: 5,
    landmarkIndex: 0,
    text: 'Two consecutive light poles knocked loose by delivery truck, hanging at 45 degree angle.',
    summary: 'Tilted light poles struck by vehicular collision',
    status: Status.ASSIGNED,
    ageHours: 14,
  },
  {
    category: Category.WATER_LEAKAGE,
    urgency: Urgency.MEDIUM,
    wardIndex: 6,
    landmarkIndex: 0,
    text: 'Slow water leakage from valve box pooling on road shoulder near Brigade Road junction.',
    summary: 'Sub-surface water valve leak pooling on roadway edge',
    status: Status.ASSIGNED,
    ageHours: 19,
  },
  // 10. Under Review Tickets
  {
    category: Category.POTHOLE,
    urgency: Urgency.MEDIUM,
    wardIndex: 7,
    landmarkIndex: 0,
    text: 'Rough road patch where underground gas line was laid last month, surface uneven.',
    summary: 'Uneven backfilled utility trench causing traffic slowdown',
    status: Status.UNDER_REVIEW,
    ageHours: 9,
  },
  {
    category: Category.GARBAGE,
    urgency: Urgency.MEDIUM,
    wardIndex: 0,
    landmarkIndex: 1,
    text: 'Biomedical packaging boxes and expired clinic bottles discarded behind pharmacy complex.',
    summary: 'Discarded clinic waste boxes dumped behind commercial strip',
    status: Status.UNDER_REVIEW,
    ageHours: 7,
  },
  {
    category: Category.PUBLIC_HAZARD,
    urgency: Urgency.HIGH,
    wardIndex: 1,
    landmarkIndex: 1,
    text: 'Corroded traffic sign pole leaning dangerously towards moving vehicular traffic on Ring Road.',
    summary: 'Unstable highway directional sign fixture leaning over traffic lane',
    status: Status.UNDER_REVIEW,
    ageHours: 4,
  },
  {
    category: Category.STREETLIGHT,
    urgency: Urgency.LOW,
    wardIndex: 2,
    landmarkIndex: 1,
    text: 'Dim yellow bulb on dead-end residential alley, visibility poor for evening walkers.',
    summary: 'Low-wattage luminaire requiring LED upgrade on cul-de-sac',
    status: Status.UNDER_REVIEW,
    ageHours: 16,
  },
  {
    category: Category.FALLEN_TREE,
    urgency: Urgency.LOW,
    wardIndex: 3,
    landmarkIndex: 1,
    text: 'Overgrown thorny shrubs protruding across sidewalk near senior citizens walking trail.',
    summary: 'Thorny hedge vegetation blocking pedestrian walking route',
    status: Status.UNDER_REVIEW,
    ageHours: 18,
  },
  // 11. Submitted Tickets (Freshly logged)
  {
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    wardIndex: 4,
    landmarkIndex: 1,
    text: 'Fresh pothole formed near roundabout after morning rain, two two-wheelers skidded today.',
    summary: 'Fresh road pothole causing two-wheeler slippage near roundabout',
    status: Status.SUBMITTED,
    ageHours: 1,
  },
  {
    category: Category.GARBAGE,
    urgency: Urgency.LOW,
    wardIndex: 5,
    landmarkIndex: 1,
    text: 'Empty cardboard boxes and plastic wrapping discarded on street corner by courier vendors.',
    summary: 'Packaging waste and cardboard accumulation on street corner',
    status: Status.SUBMITTED,
    ageHours: 2,
  },
  {
    category: Category.STREETLIGHT,
    urgency: Urgency.MEDIUM,
    wardIndex: 6,
    landmarkIndex: 1,
    text: 'Streetlight pole glass casing shattered, bulb exposed to rain and moisture.',
    summary: 'Broken glass diffuser on street lamp luminaire',
    status: Status.SUBMITTED,
    ageHours: 3,
  },
  {
    category: Category.WATER_LEAKAGE,
    urgency: Urgency.LOW,
    wardIndex: 7,
    landmarkIndex: 1,
    text: 'Public drinking water fountain button stuck in open position, constant trickle wasting water.',
    summary: 'Stuck push-valve on public drinking water facility',
    status: Status.SUBMITTED,
    ageHours: 4,
  },
  {
    category: Category.PUBLIC_HAZARD,
    urgency: Urgency.HIGH,
    wardIndex: 0,
    landmarkIndex: 2,
    text: 'Manhole cover displaced by heavy truck wheel, leaving gap on vehicle wheel path.',
    summary: 'Shifted cast iron manhole frame creating road hazard',
    status: Status.SUBMITTED,
    ageHours: 1,
  },
  {
    category: Category.OTHER_CIVIC,
    urgency: Urgency.LOW,
    wardIndex: 1,
    landmarkIndex: 0,
    text: 'Faded pedestrian zebra crossing markings outside neighborhood kindergarten school.',
    summary: 'Worn thermoplastic pedestrian crossing paint outside school',
    status: Status.SUBMITTED,
    ageHours: 5,
  },
  {
    category: Category.POTHOLE,
    urgency: Urgency.MEDIUM,
    wardIndex: 2,
    landmarkIndex: 0,
    text: 'Asphalt crumbling at edge of stormwater culvert bridge approach.',
    summary: 'Edge spalling on roadway culvert bridge wing wall',
    status: Status.SUBMITTED,
    ageHours: 3,
  },
  {
    category: Category.GARBAGE,
    urgency: Urgency.MEDIUM,
    wardIndex: 3,
    landmarkIndex: 0,
    text: 'Stray cattle rummaging through open community waste bin near milk distribution booth.',
    summary: 'Animal scavenging at uncovered community trash receptacle',
    status: Status.SUBMITTED,
    ageHours: 2,
  },
];

/**
 * Builds a deterministic audit timeline following legal lifecycle transitions.
 */
function buildSeedTimeline(
  status: Status,
  createdAt: Date,
  t: SeedTemplate
): TicketEvent[] {
  const events: TicketEvent[] = [
    {
      id: `evt-${createdAt.getTime()}-1`,
      status: Status.SUBMITTED,
      actor_role: Role.CITIZEN,
      note: 'Grievance submitted by citizen',
      at: createdAt.toISOString(),
    },
  ];

  if (status === Status.SUBMITTED) return events;

  let currentMs = createdAt.getTime() + 15 * 60 * 1000; // 15 mins later

  if (status === Status.REJECTED) {
    events.push({
      id: `evt-${currentMs}-rej`,
      status: Status.REJECTED,
      actor_role: Role.AUTHORITY,
      note: t.rejectionNote || 'Grievance rejected upon authority review',
      at: new Date(currentMs).toISOString(),
    });
    return events;
  }

  // UNDER_REVIEW
  events.push({
    id: `evt-${currentMs}-ur`,
    status: Status.UNDER_REVIEW,
    actor_role: Role.AUTHORITY,
    note: 'Municipal investigator reviewed grievance and verified location',
    at: new Date(currentMs).toISOString(),
  });

  if (status === Status.UNDER_REVIEW) return events;

  currentMs += 30 * 60 * 1000; // 30 mins later
  // ASSIGNED
  events.push({
    id: `evt-${currentMs}-as`,
    status: Status.ASSIGNED,
    actor_role: Role.AUTHORITY,
    note: 'Dispatched to zonal field engineering maintenance crew',
    at: new Date(currentMs).toISOString(),
  });

  if (status === Status.ASSIGNED) return events;

  currentMs += 45 * 60 * 1000;
  // IN_PROGRESS
  events.push({
    id: `evt-${currentMs}-ip`,
    status: Status.IN_PROGRESS,
    actor_role: Role.AUTHORITY,
    note: 'Field crew arrived at location; maintenance works underway',
    at: new Date(currentMs).toISOString(),
  });

  if (status === Status.IN_PROGRESS) return events;

  currentMs += 120 * 60 * 1000;
  // RESOLVED
  events.push({
    id: `evt-${currentMs}-res`,
    status: Status.RESOLVED,
    actor_role: Role.AUTHORITY,
    note: t.resolutionNote || 'Repair and maintenance work concluded by zonal team.',
    at: new Date(currentMs).toISOString(),
  });

  if (status === Status.RESOLVED) return events;

  if (status === Status.REOPENED) {
    currentMs += 60 * 60 * 1000;
    events.push({
      id: `evt-${currentMs}-reopen`,
      status: Status.REOPENED,
      actor_role: Role.CITIZEN,
      note: t.reopenNote || 'Citizen reopened unresolved grievance',
      at: new Date(currentMs).toISOString(),
    });
  }

  return events;
}

/**
 * Pure generator function that produces deterministic, realistic civic grievance seed tickets.
 *
 * @param now - Reference anchor timestamp (defaults to current date)
 * @param randomBytes - Injected random bytes generator for deterministic ticket IDs
 * @returns Array of ~40 domain Ticket entities
 */
export function generateSeedTickets(
  now: Date = new Date(),
  randomBytes?: (n: number) => Uint8Array
): Ticket[] {
  let seedCounter = 1;
  const getRandomBytes =
    randomBytes ??
    ((n: number) => {
      const b = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        b[i] = (seedCounter * 37 + i * 13) & 0xff;
      }
      seedCounter++;
      return b;
    });

  const tickets: Ticket[] = [];

  for (let i = 0; i < SEED_TEMPLATES.length; i++) {
    const t = SEED_TEMPLATES[i]!;
    const ward = WARDS[t.wardIndex % WARDS.length]!;
    const landmark = ward.landmarks[t.landmarkIndex % ward.landmarks.length]!;

    const createdAt = new Date(now.getTime() - t.ageHours * 3600 * 1000);
    const dueAt = computeDueAt(t.urgency, createdAt);
    const department = resolveDepartment(t.category, ward.name);
    const ticketId = generateTicketId(getRandomBytes(16));

    const events = buildSeedTimeline(t.status, createdAt, t);

    const ticket: Ticket = {
      id: ticketId,
      description: t.text,
      category: t.category,
      urgency: t.urgency,
      department,
      ward: ward.name,
      location: {
        lat: landmark.lat,
        lng: landmark.lng,
        address: `${landmark.name}, ${ward.name}`,
      },
      status: t.status,
      events,
      duplicate_of: undefined,
      duplicate_count: t.duplicateCount ?? 0,
      reopen_count: t.reopenCount ?? 0,
      created_at: createdAt.toISOString(),
      due_at: dueAt.toISOString(),
      escalated: t.escalated ?? false,
      final_decision: {
        category: t.category,
        urgency: t.urgency,
        department,
        emergency_notice: Boolean(t.isEmergency),
        applied_rules: t.isEmergency
          ? [{ id: 'safety-critical', label: 'Safety Critical Emergency Hazard', effect: 'Urgency set to Critical' }]
          : [],
        ai_suggestion: {
          is_civic_issue: t.category !== Category.NOT_CIVIC,
          category: t.category,
          urgency: t.urgency,
          safety_critical: Boolean(t.isEmergency),
          confidence: 0.95,
          summary: t.summary,
          reasons: ['Seed fixture verified civic report'],
          missing_info: [],
        },
        ai_source: AiSource.MOCK,
        needs_manual_triage: false,
      },
      attachments: [],
      version: 1,
    };

    tickets.push(ticket);
  }

  return tickets;
}

interface Clearable {
  clear(): Promise<void>;
}

function isClearable(repo: unknown): repo is Clearable {
  return (
    typeof repo === 'object' &&
    repo !== null &&
    'clear' in repo &&
    typeof (repo as Clearable).clear === 'function'
  );
}

/**
 * Seeds a repository with realistic test tickets.
 *
 * @param repo - Ticket repository instance (in-memory or Firestore)
 * @param options - Seeding options (reset flag, anchor timestamp)
 * @returns Result with count of inserted tickets
 */
export async function seedTickets(
  repo: TicketRepository,
  options?: {
    reset?: boolean;
    now?: Date;
    randomBytes?: (n: number) => Uint8Array;
  }
): Promise<Result<{ inserted: number }, RepoError>> {
  if (options?.reset && isClearable(repo)) {
    await repo.clear();
  }

  const tickets = generateSeedTickets(options?.now, options?.randomBytes);
  let inserted = 0;

  for (const ticket of tickets) {
    const res = await repo.create(ticket);
    if (!res.ok) {
      return res;
    }
    inserted++;
  }

  return ok({ inserted });
}
