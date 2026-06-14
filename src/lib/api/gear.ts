import { api } from './client';

// Equipment types
export interface GearItem {
  id: number;
  equipment_type: string;
  brand: string;
  model: string;
  full_name: string;
  specs?: Record<string, unknown>;
  msrp_usd?: number;
  affiliate_url?: string;
  product_image_url?: string;
  release_year?: number;
}

export interface GearListResponse {
  equipment: GearItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface GearPhoto {
  identification_id: number;
  image_path: string;
  species: string;
  confidence: number;
  exif_data?: Record<string, unknown>;
  created_at: string;
  username: string;
  profile_photo_url?: string;
}

export interface GearPhotosResponse {
  equipment: {
    id: number;
    name: string;
    type: string;
  };
  photos: GearPhoto[];
  limit: number;
  offset: number;
}

// API functions
export async function getGearList(params?: {
  search?: string;
  equipment_type?: string;
  brand?: string;
  limit?: number;
  offset?: number;
}): Promise<GearListResponse> {
  const searchParams = new URLSearchParams();

  if (params?.search) searchParams.set('search', params.search);
  if (params?.equipment_type) searchParams.set('equipment_type', params.equipment_type);
  if (params?.brand) searchParams.set('brand', params.brand);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const query = searchParams.toString();
  return api.get(`equipment${query ? `?${query}` : ''}`).json<GearListResponse>();
}

export async function getGearItem(id: number): Promise<GearItem> {
  return api.get(`equipment/${id}`).json<GearItem>();
}

export async function getGearPhotos(
  id: number,
  limit: number = 20,
  offset: number = 0
): Promise<GearPhotosResponse> {
  return api.get(`equipment/${id}/photos?limit=${limit}&offset=${offset}`).json<GearPhotosResponse>();
}

// Get unique brands for filtering
export async function getGearBrands(): Promise<string[]> {
  // Fetch a larger list to extract unique brands
  const response = await getGearList({ limit: 200 });
  const brands = [...new Set(response.equipment.map(e => e.brand))].sort();
  return brands;
}

// Equipment type labels and icons
export const equipmentTypeLabels: Record<string, string> = {
  camera_body: 'Camera Bodies',
  camera_body_ff: 'Full Frame Cameras',
  camera_body_apsc: 'APS-C Cameras',
  camera_body_m43: 'Micro 4/3 Cameras',
  lens: 'Lenses',
  teleconverter: 'Teleconverters',
  extender: 'Extenders',
  tripod: 'Tripods',
  other: 'Other',
};

export function getEquipmentTypeLabel(type: string): string {
  return equipmentTypeLabels[type] || type;
}
