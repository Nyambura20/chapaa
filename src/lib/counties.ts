export interface County {
  name: string;
  lat: number;
  lng: number;
}

export const COUNTIES: County[] = [
  { name: 'Nairobi', lat: -1.2864, lng: 36.8172 },
  { name: 'Mombasa', lat: -4.0435, lng: 39.6682 },
  { name: 'Kisumu', lat: -0.0917, lng: 34.768 },
  { name: 'Nakuru', lat: -0.3031, lng: 36.08 },
  { name: 'Uasin Gishu', lat: 0.5143, lng: 35.2698 },
  { name: 'Kiambu', lat: -1.1714, lng: 36.8356 },
  { name: 'Machakos', lat: -1.5177, lng: 37.2634 },
  { name: 'Kakamega', lat: 0.2827, lng: 34.7519 },
  { name: 'Nyeri', lat: -0.4371, lng: 36.958 },
  { name: 'Meru', lat: 0.0463, lng: 37.6559 },
  { name: 'Kisii', lat: -0.6817, lng: 34.7667 },
  { name: 'Garissa', lat: -0.4532, lng: 39.6461 },
];

export const COUNTY_NAMES = COUNTIES.map((county) => county.name);

export function countyPoint(name: string): County | undefined {
  return COUNTIES.find((county) => county.name === name);
}
