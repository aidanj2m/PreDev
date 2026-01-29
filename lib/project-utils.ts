/**
 * Utility functions for project management
 */

/**
 * Generate a project name from an address.
 * Strategy: Use the street name without the house number for clean, concise naming.
 * 
 * Examples:
 * - "123 Oak Street" → "Oak Street"
 * - "456 Main St" → "Main St"
 * - Falls back to city if street name is unclear
 */
export function generateProjectName(address: {
  street: string;
  city: string;
  state: string;
  full_address: string;
}): string {
  // Remove house number from street (e.g., "123 Oak Street" → "Oak Street")
  const streetName = address.street.replace(/^\d+\s+/, '').trim();
  
  // If we have a clean street name, use it
  if (streetName && streetName.length > 0) {
    return streetName;
  }
  
  // Fallback to city if street name is unclear
  if (address.city && address.city.length > 0) {
    return `${address.city} Project`;
  }
  
  // Final fallback
  return 'Untitled Project';
}

/**
 * Generate a project name for multiple addresses.
 * Strategy: 
 * - Same street → "Oak Street (3 parcels)"
 * - Different streets, same city → "Boston Project"
 * - Multiple cities → "Multi-Site Project"
 */
export function generateProjectNameMultiple(
  addresses: Array<{ street: string; city: string; state: string }>
): string {
  if (addresses.length === 0) {
    return 'Untitled Project';
  }
  
  if (addresses.length === 1) {
    return generateProjectName(addresses[0] as any);
  }
  
  // Check if all addresses are on the same street
  const streets = new Set(
    addresses.map(a => a.street.replace(/^\d+\s+/, '').trim())
  );
  
  if (streets.size === 1) {
    // All on same street
    const streetName = Array.from(streets)[0];
    return `${streetName} (${addresses.length} parcels)`;
  }
  
  // Different streets: check if same city
  const cities = new Set(addresses.map(a => a.city));
  
  if (cities.size === 1) {
    // Same city
    return `${Array.from(cities)[0]} Project`;
  }
  
  // Multiple cities: generic name
  return 'Multi-Site Project';
}
