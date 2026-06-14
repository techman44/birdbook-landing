'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteIdentification } from '@/lib/api/identification';
import { toast } from 'sonner';

interface SightingData {
  identification_id: number;
  common_name: string;
}

interface DeleteSightingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sighting: SightingData | null;
  onDeleted?: () => void;
}

export function DeleteSightingDialog({ 
  isOpen, 
  onClose, 
  sighting, 
  onDeleted 
}: DeleteSightingDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteIdentification(sighting!.identification_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-birds'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Sighting deleted successfully');
      onClose();
      onDeleted?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete sighting');
    },
  });

  if (!sighting) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Sighting?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete your <strong>{sighting.common_name}</strong> sighting?
            </p>
            <p className="text-sm text-muted-foreground">
              This will permanently delete:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>The identification and photo</li>
              <li>Any shared posts to the feed</li>
              <li>Contributions to the encyclopedia</li>
            </ul>
            <p className="text-sm font-medium text-red-600">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Sighting'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
