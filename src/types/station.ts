export type FacilityType = 'stairs' | 'escalator' | 'elevator';

export interface Facility {
  type: FacilityType;
  name: string;
  car: number;
  door: number;
  note?: string;
}

export interface Formation {
  cars: number;
  label: string;
  facilities: Facility[];
}

export interface Direction {
  directionId: string;
  directionName: string;
  formations: Formation[];
}

export interface Station {
  stationId: string;
  stationName: string;
  directions: Direction[];
}
