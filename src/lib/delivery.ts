// Haversine formula to calculate distance between two lat/lng points in km
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Delivery charge based on distance
export function getDeliveryCharge(distanceKm: number): number {
  if (distanceKm <= 5) return 20;
  if (distanceKm <= 10) return 40;
  if (distanceKm <= 20) return 80;
  return 120;
}

// Geocode an address using OpenStreetMap Nominatim (free, no API key)
export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'FarmFresh-App' } }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

// Reverse geocode coordinates to address using Nominatim
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
      { headers: { 'User-Agent': 'FarmFresh-App' } }
    );
    const data = await response.json();
    if (data?.address) {
      const a = data.address;
      const parts = [
        a.suburb || a.neighbourhood || a.village || a.hamlet || a.town || '',
        a.city || a.county || a.state_district || '',
        a.state || '',
        a.country || '',
      ].filter(Boolean);
      return parts.join(', ');
    }
    return data?.display_name || null;
  } catch {
    return null;
  }
}

// Thrissur district approximate bounding box
const THRISSUR_BOUNDS = {
  minLat: 10.15,
  maxLat: 10.65,
  minLon: 75.90,
  maxLon: 76.45,
};

export function isInThrissur(lat: number, lon: number): boolean {
  return (
    lat >= THRISSUR_BOUNDS.minLat && lat <= THRISSUR_BOUNDS.maxLat &&
    lon >= THRISSUR_BOUNDS.minLon && lon <= THRISSUR_BOUNDS.maxLon
  );
}
