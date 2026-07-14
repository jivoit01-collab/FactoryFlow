export interface VehicleHistoryVehicle {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  capacity_ton: string | null;
  length_m: string | null;
  width_m: string | null;
  height_m: string | null;
  transporter_name: string;
  transporter_contact: string;
  transporter_mobile: string;
  transporter_gstin: string;
  registered_on: string | null;
}

export interface VehicleHistoryDriver {
  name: string;
  mobile_no: string;
  license_no: string;
  id_proof_type: string;
  id_proof_number: string;
  photo: string | null;
}

export interface VehicleHistoryVisit {
  entry_no: string;
  entry_time: string | null;
  entry_type: string;
  status: string;
  driver_name: string;
  photo_count: number;
}

export interface VehicleHistoryPhoto {
  url: string;
  kind: 'driver' | 'gate' | 'dispatch';
  captured_at: string | null;
  label: string;
}

/** Response of GET /vehicles/by-number/{number}/history/. */
export interface VehicleHistory {
  found: boolean;
  vehicle_number?: string;
  vehicle?: VehicleHistoryVehicle;
  driver?: VehicleHistoryDriver | null;
  last_visit_date?: string | null;
  visit_count?: number;
  visits?: VehicleHistoryVisit[];
  photos?: VehicleHistoryPhoto[];
}
