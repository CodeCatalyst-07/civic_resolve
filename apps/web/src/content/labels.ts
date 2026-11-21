import {
  Category,
  Urgency,
  Status,
  Department,
  type Category as CategoryType,
  type Urgency as UrgencyType,
  type Status as StatusType,
  type Department as DepartmentType,
} from '@civicresolve/shared';
import {
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  UserCheck,
  Hammer,
  Truck,
  Trash2,
  Lightbulb,
  Droplets,
  Trees,
  ShieldAlert,
  Building2,
  type LucideIcon,
} from 'lucide-react';

export interface TaxonomyLabelMeta {
  readonly label: string;
  readonly description: string;
  readonly icon: LucideIcon;
}

export interface DepartmentMeta {
  readonly label: string;
  readonly indianEquivalent: string;
  readonly icon: LucideIcon;
}

/**
 * Plain language category labels and descriptions.
 */
export const CATEGORY_LABELS: Record<CategoryType, TaxonomyLabelMeta> = {
  [Category.POTHOLE]: {
    label: 'Pothole & Road Damage',
    description: 'Crater, cracked road surface, or cave-in impeding traffic safety.',
    icon: Truck,
  },
  [Category.GARBAGE]: {
    label: 'Garbage & Waste Dump',
    description: 'Overflowing dustbins, unattended solid waste, or debris on footpaths.',
    icon: Trash2,
  },
  [Category.STREETLIGHT]: {
    label: 'Streetlight Failure',
    description: 'Dark streetlights, malfunctioning fixtures, or unlit public pathways.',
    icon: Lightbulb,
  },
  [Category.WATER_LEAKAGE]: {
    label: 'Water Pipe Leakage',
    description: 'Burst potable water mains, leaky distribution pipes, or water loss.',
    icon: Droplets,
  },
  [Category.SEWER_OVERFLOW]: {
    label: 'Drain & Sewer Overflow',
    description: 'Choked gutters, overflowing sewage, or blocked stormwater drainage.',
    icon: Droplets,
  },
  [Category.FALLEN_TREE]: {
    label: 'Fallen Tree or Heavy Branch',
    description: 'Uprooted tree or fallen branches obstructing roads or power lines.',
    icon: Trees,
  },
  [Category.PUBLIC_HAZARD]: {
    label: 'Public Safety Hazard',
    description: 'Exposed live wiring, open manhole cover, or dangerous structure.',
    icon: ShieldAlert,
  },
  [Category.OTHER_CIVIC]: {
    label: 'Other Civic Grievance',
    description: 'General public civic issue requiring municipal attention.',
    icon: Building2,
  },
  [Category.NOT_CIVIC]: {
    label: 'Non-Civic Matter',
    description: 'Private, commercial, or civil disputes outside municipal scope.',
    icon: HelpCircle,
  },
};

/**
 * Plain language urgency levels with target resolution expectations.
 */
export const URGENCY_LABELS: Record<
  UrgencyType,
  { label: string; description: string; icon: LucideIcon; badgeColor: string }
> = {
  [Urgency.CRITICAL]: {
    label: 'Immediate Danger',
    description: 'Threat to human life or severe public hazard (target 24 hours).',
    icon: Flame,
    badgeColor: 'bg-urgency-critical-bg text-urgency-critical border-urgency-critical-border',
  },
  [Urgency.HIGH]: {
    label: 'Urgent',
    description: 'Heavy public disruption, blockage, or near schools/hospitals (target 48 hours).',
    icon: AlertTriangle,
    badgeColor: 'bg-urgency-high-bg text-urgency-high border-urgency-high-border',
  },
  [Urgency.MEDIUM]: {
    label: 'Routine',
    description: 'Standard municipal maintenance issue (target 96 hours).',
    icon: Clock,
    badgeColor: 'bg-urgency-medium-bg text-urgency-medium border-urgency-medium-border',
  },
  [Urgency.LOW]: {
    label: 'Minor',
    description: 'Cosmetic or non-disruptive scheduled repair (target 168 hours).',
    icon: CheckCircle2,
    badgeColor: 'bg-urgency-low-bg text-urgency-low border-urgency-low-border',
  },
};

/**
 * Plain language status descriptions for citizens.
 */
export const STATUS_LABELS: Record<
  StatusType,
  { label: string; description: string; icon: LucideIcon; pillColor: string }
> = {
  [Status.SUBMITTED]: {
    label: 'Received',
    description: 'Logged into the city registry and queued for triage.',
    icon: Clock,
    pillColor: 'bg-status-submitted-bg text-status-submitted border-status-submitted-border',
  },
  [Status.UNDER_REVIEW]: {
    label: 'Under Review',
    description: 'Inspected by local engineering supervisors.',
    icon: HelpCircle,
    pillColor: 'bg-status-under_review-bg text-status-under_review border-status-under_review-border',
  },
  [Status.ASSIGNED]: {
    label: 'Assigned to Crew',
    description: 'Dispatched to the relevant field team or contractor.',
    icon: UserCheck,
    pillColor: 'bg-status-assigned-bg text-status-assigned border-status-assigned-border',
  },
  [Status.IN_PROGRESS]: {
    label: 'Work in Progress',
    description: 'Maintenance crew is actively working on-site to resolve the issue.',
    icon: Hammer,
    pillColor: 'bg-status-in_progress-bg text-status-in_progress border-status-in_progress-border',
  },
  [Status.RESOLVED]: {
    label: 'Resolved',
    description: 'Field repair completed and verified by municipal staff.',
    icon: CheckCircle2,
    pillColor: 'bg-status-resolved-bg text-status-resolved border-status-resolved-border',
  },
  [Status.CLOSED]: {
    label: 'Closed',
    description: 'Issue completed and citizen confirmation period concluded.',
    icon: CheckCircle2,
    pillColor: 'bg-status-closed-bg text-status-closed border-status-closed-border',
  },
  [Status.REJECTED]: {
    label: 'Not Actionable',
    description: 'Report could not be serviced as a municipal civic grievance.',
    icon: XCircle,
    pillColor: 'bg-status-rejected-bg text-status-rejected border-status-rejected-border',
  },
  [Status.REOPENED]: {
    label: 'Reopened by Citizen',
    description: 'Citizen requested re-inspection following incomplete resolution.',
    icon: RotateCcw,
    pillColor: 'bg-status-reopened-bg text-status-reopened border-status-reopened-border',
  },
};

/**
 * Municipal departments with Indian equivalent lookup.
 */
export const DEPARTMENT_LABELS: Record<DepartmentType, DepartmentMeta> = {
  [Department.ROADS]: {
    label: 'Roads & Infrastructure',
    indianEquivalent: 'BBMP / PWD / Municipal Engineering Division',
    icon: Truck,
  },
  [Department.SANITATION]: {
    label: 'Sanitation & Waste Management',
    indianEquivalent: 'Solid Waste Management (SWM) / Health Inspector Wing',
    icon: Trash2,
  },
  [Department.PUBLIC_LIGHTING]: {
    label: 'Public Street Lighting',
    indianEquivalent: 'Electrical Engineering & Streetlight Wing',
    icon: Lightbulb,
  },
  [Department.WATER_SEWERAGE]: {
    label: 'Water & Sewerage Board',
    indianEquivalent: 'BWSSB / DJB / Municipal Water Supply Board',
    icon: Droplets,
  },
  [Department.PARKS_HORTICULTURE]: {
    label: 'Parks & Horticulture',
    indianEquivalent: 'Tree Authority & Horticulture Department',
    icon: Trees,
  },
  [Department.PUBLIC_HEALTH_SAFETY]: {
    label: 'Public Health & Safety',
    indianEquivalent: 'Disaster Management & Public Hazard Cell',
    icon: ShieldAlert,
  },
  [Department.WARD_OFFICE]: {
    label: 'Local Ward Nodal Office',
    indianEquivalent: 'Ward Secretariat / Assistant Revenue Officer (ARO)',
    icon: Building2,
  },
};
