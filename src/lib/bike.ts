export const BIKE_SPEED_KMH = 12;

export function bikeRadiusKmFromMinutes(minutes: number) {
  return minutes * (BIKE_SPEED_KMH / 60);
}

export function bikeMinutesFromKm(km: number) {
  return Math.round((km / BIKE_SPEED_KMH) * 60);
}
