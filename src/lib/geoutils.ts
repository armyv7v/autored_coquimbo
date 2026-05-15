import { geohashForLocation, distanceBetween } from 'geofire-common';

export const getGeofence = (center: [number, number], radiusInKm: number) => {
  // Simple implementation to check if a point is within radius
  // In a real app, you'd use geohash bounds for querying
  return (point: [number, number]) => {
    return distanceBetween(center, point) <= radiusInKm;
  };
};

export const getGeohash = (lat: number, lng: number) => {
  return geohashForLocation([lat, lng]);
};

export const COQUIMBO_CENTER: [number, number] = [-29.9533, -71.3395];
