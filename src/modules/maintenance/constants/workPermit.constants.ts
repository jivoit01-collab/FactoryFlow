// Coded reference catalogs for the work permit form (permit types, hazards, PPE,
// precautions). Kept as codes + labels so permits stay filterable/reportable rather
// than free text. Codes must match the backend choices.

import type {
  WorkPermitApprovalRole,
  WorkPermitType,
} from '../types';

export const PERMIT_TYPE_OPTIONS: Array<{ value: WorkPermitType; label: string }> = [
  { value: 'GENERAL', label: 'General' },
  { value: 'HEIGHT', label: 'Height Work (> 2 m)' },
  { value: 'HOT_WORK', label: 'Hot Work' },
  { value: 'COLD_WORK', label: 'Cold Work' },
  { value: 'CONFINED_SPACE', label: 'Confined Space' },
  { value: 'LINE_BREAKING', label: 'Line Breaking' },
  { value: 'HAZARDOUS_ENERGY_CONTROL', label: 'Hazardous Energy Control' },
  { value: 'EXCAVATION', label: 'Excavation' },
  { value: 'LOADING_UNLOADING_HAZMAT', label: 'Loading / Unloading of Hazardous Material' },
];

// Section 7 — hazards identified jointly by issuer and acceptor.
export const HAZARD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'CORROSIVE_CHEMICAL', label: 'Corrosive Chemical' },
  { value: 'FLAMMABLES', label: 'Flammables' },
  { value: 'EXPLOSIVES', label: 'Explosives' },
  { value: 'COMPRESSED_GAS', label: 'Compressed Gas' },
  { value: 'HOT_MATERIALS', label: 'Hot Materials' },
  { value: 'STEAM', label: 'Steam' },
  { value: 'FUMES_DUST', label: 'Fumes / Dust' },
  { value: 'LONE_WORK', label: 'Lone Work' },
  { value: 'MOVING_MACHINE', label: 'Moving Machine' },
  { value: 'AUTO_START_EQUIPMENT', label: 'Auto Start Equipment' },
  { value: 'TRAFFIC', label: 'Traffic' },
  { value: 'CONFINED_SPACE', label: 'Confined Space' },
  { value: 'LACK_OF_OXYGEN', label: 'Lack of Oxygen' },
  { value: 'HEIGHT_WORK', label: 'Height Work' },
  { value: 'UNSAFE_ACCESS', label: 'Unsafe Access' },
  { value: 'FRAGILE_ROOF', label: 'Fragile Roof' },
  { value: 'LIVE_ELECTRICAL', label: 'Live Electrical' },
  { value: 'OVERHEAD_DANGER', label: 'Overhead Danger' },
  { value: 'BURIED_CABLES', label: 'Buried Cables' },
  { value: 'BURIED_PIPELINES', label: 'Buried Pipelines' },
  { value: 'HIGH_LOW_PRESSURE', label: 'High / Low Pressure' },
  { value: 'HIGH_LOW_TEMPERATURE', label: 'High / Low Temperature' },
  { value: 'STATIC_CHARGE', label: 'Static Charge' },
];

// Section 10 — PPE to be used.
export const PPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'SAFETY_SHOES', label: 'Safety Shoes' },
  { value: 'GOGGLES', label: 'Goggles' },
  { value: 'EAR_PLUGS', label: 'Ear Plugs' },
  { value: 'EAR_MUFF', label: 'Ear Muff' },
  { value: 'MASK', label: 'Mask' },
  { value: 'NOSE_MASK', label: 'Nose Mask' },
  { value: 'HELMET', label: 'Helmet' },
  { value: 'GLOVES', label: 'Gloves (Cut Resistant)' },
  { value: 'LEATHER_GLOVES', label: 'Leather Gloves (Hot Work)' },
  { value: 'ELECTRICAL_GLOVES', label: 'Electrical Gloves' },
  { value: 'HIGH_VIS_JACKET', label: 'High Visibility Jacket' },
  { value: 'WELDING_SHIELD', label: 'Welding Shield' },
  { value: 'FACE_SHIELD', label: 'Face Shield' },
  { value: 'ELECTRICAL_SUIT', label: 'Electrical Suit' },
  { value: 'FULL_HARNESS_BELT', label: 'Full Harness Safety Belt' },
  { value: 'PVC_SUIT', label: 'PVC Suit' },
  { value: 'BREATHING_APPARATUS', label: 'Breathing Apparatus' },
];

// Section 11 — precautions checklist, grouped by task as on the form.
export const PRECAUTION_GROUPS: Array<{
  group: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    group: 'General',
    options: [
      { value: 'JOB_SITE_CHECKED', label: 'Job Site Checked' },
      { value: 'AREA_CORDONED', label: 'Area Cordoned' },
      { value: 'CAUTION_BOARDS', label: 'Caution Boards Displayed' },
      { value: 'ELCB_PORTABLE', label: 'ELCB for Portable Tools' },
      { value: 'PPE_PROVIDED', label: 'PPE Provided' },
      { value: 'LIFTING_TOOLS_CERTIFIED', label: 'Lifting Tools Certified' },
      { value: 'SUPERVISION_PROVIDED', label: 'Supervision Provided' },
      { value: 'DOUBLE_EARTHING', label: 'Double Earthing' },
    ],
  },
  {
    group: 'Hot Work',
    options: [
      { value: 'COMBUSTIBLES_REMOVED', label: 'Combustibles Removed' },
      { value: 'SPARKS_ISOLATED', label: 'Sparks Isolated' },
      { value: 'FLASH_BACK_ARRESTOR', label: 'Flash Back Arrestor Provided' },
      { value: 'FIRE_EQUIP_PROVIDED', label: 'Fire Fighting Equipment Provided' },
      { value: 'FIRE_TEAM_ALERTED', label: 'Fire Fighting Team Alerted' },
      { value: 'WELDING_EARTHED', label: 'Welding Sets Earthed' },
      { value: 'FIRE_WATCHER_30MIN', label: 'Fire Watcher Stays 30 min After' },
    ],
  },
  {
    group: 'Electrical / Hazardous Energy',
    options: [
      { value: 'DEENERGIZE_MACHINE', label: 'De-energize Machine' },
      { value: 'REMOVE_FUSE_ISOLATION', label: 'Remove Fuse / Service / Process Isolation' },
      { value: 'LOCKOUT', label: 'Lockout the Switch / Valve / Gate' },
      { value: 'TAGOUT', label: 'Tag Out the Switch / Valve / Gate' },
      { value: 'INSULATED_TOOLS', label: 'Insulated Tools to be Used' },
      { value: 'APPROVED_CONTRACTOR', label: 'Approved A-Class Contractor' },
    ],
  },
  {
    group: 'Work at Height',
    options: [
      { value: 'METALLIC_LADDER', label: 'Scaffolding / Ladder Metallic' },
      { value: 'LADDER_WORKING_COND', label: 'Ladder in Working Condition' },
      { value: 'BELT_TIED', label: 'Tying of Belt Ensured' },
      { value: 'BOTTOM_SUPPORT', label: 'Bottom Support Ensured' },
      { value: 'NO_HEIGHT_PHOBIA', label: 'Person Fit & No Height Phobia' },
      { value: 'WIND_SPEED_CHECK', label: 'Wind Speed Checked (Open)' },
    ],
  },
  {
    group: 'Confined Space',
    options: [
      { value: 'LEL_CHECKING', label: 'LEL Checking' },
      { value: 'FLAMEPROOF_LAMP', label: 'Flameproof 12V Hand Lamp Provided' },
      { value: 'FORCED_VENTILATION', label: 'Air Ventilation - Forced' },
      { value: 'OXYGEN_RANGE', label: 'O2 Between 19.5% and 23.5%' },
      { value: 'RESCUE_TEAM_ALERT', label: 'Rescue Team on Alert' },
      { value: 'ESCAPE_TOOLS', label: 'Escape Tools (Tripod Stand) Provided' },
    ],
  },
];

export const APPROVAL_ROLE_OPTIONS: Array<{ value: WorkPermitApprovalRole; label: string }> = [
  { value: 'ISSUER', label: 'Issuer' },
  { value: 'AREA_INCHARGE', label: 'Area Incharge' },
  { value: 'SAFETY_COORDINATOR', label: 'Safety Co-ordinator' },
  { value: 'FACTORY_MANAGER', label: 'Factory / Plant Manager' },
];

const HAZARD_LABELS = new Map(HAZARD_OPTIONS.map((o) => [o.value, o.label]));
const PPE_LABELS = new Map(PPE_OPTIONS.map((o) => [o.value, o.label]));
const PRECAUTION_LABELS = new Map(
  PRECAUTION_GROUPS.flatMap((g) => g.options).map((o) => [o.value, o.label]),
);
const PERMIT_TYPE_LABELS = new Map(PERMIT_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export const getHazardLabel = (code: string) => HAZARD_LABELS.get(code) ?? code;
export const getPpeLabel = (code: string) => PPE_LABELS.get(code) ?? code;
export const getPrecautionLabel = (code: string) => PRECAUTION_LABELS.get(code) ?? code;
export const getPermitTypeLabel = (code: string) => PERMIT_TYPE_LABELS.get(code) ?? code;
