'use client';

import { MoreHorizontal, Share2, Pencil, Trash2, Eye, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SightingData {
  identification_id: number;
  public_id?: string; // URL-safe opaque identifier for shareable links
  common_name: string;
  scientific_name?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  exif_data?: {
    camera_body?: string;
    lens?: string;
    focal_length?: string;
    aperture?: string;
    iso?: string;
    shutter_speed?: string;
    date_taken?: string;
  };
  encyclopedia_opt_out?: boolean;
}

interface SightingActionsMenuProps {
  sighting: SightingData;
  onShare: (sighting: SightingData) => void;
  onEdit: (sighting: SightingData) => void;
  onDelete: (sighting: SightingData) => void;
}

export function SightingActionsMenu({
  sighting,
  onShare,
  onEdit,
  onDelete,
}: SightingActionsMenuProps) {
  // Generate encyclopedia link from species name
  const encyclopediaSlug = sighting.common_name
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onShare(sighting)}>
          <Share2 className="mr-2 h-4 w-4" />
          Share to Feed
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href={`/mybirds/${sighting.public_id ?? sighting.identification_id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Link>
        </DropdownMenuItem>

        {encyclopediaSlug && (
          <DropdownMenuItem asChild>
            <Link href={`/encyclopedia/${encyclopediaSlug}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View in Encyclopedia
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onEdit(sighting)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Sighting
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onDelete(sighting)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
