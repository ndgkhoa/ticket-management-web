import { Bookmark, Check, Globe, Lock, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
} from '~/components/ui';
import { useAuthStore } from '~/stores/auth';
import {
  useCreateSavedView,
  useRemoveSavedView,
  useSavedViews,
  useSetSavedViewShared,
} from '~/features/tickets/api/saved-view-queries';
import type { SavedView } from '~/features/tickets/schemas/saved-view-schema';
import type { TicketSearch } from '~/features/tickets/schemas/ticket-search-schema';

type Props = {
  /** The current list search — what "Save current view" snapshots. */
  search: TicketSearch;
  /** Navigate to a saved view's params (absolute, replaces the current search). */
  onApply: (search: TicketSearch) => void;
};

/**
 * Saved-views control: apply, save, share, and delete server-backed views. A view is the
 * owner's own or shared with everyone; the menu groups the caller's own views (which they
 * can share/delete) from others' shared views (apply only). State/UI lives here; the data
 * and mutations come from the `saved_views` queries.
 */
export function SavedViewsMenu({ search, onApply }: Props) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data: views = [] } = useSavedViews();
  const createView = useCreateSavedView();
  const setShared = useSetSavedViewShared();
  const removeView = useRemoveSavedView();

  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [shareOnSave, setShareOnSave] = useState(false);

  const myViews = views.filter((view) => view.userId === currentUserId);
  const sharedViews = views.filter((view) => view.isShared && view.userId !== currentUserId);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createView.mutate(
      { name: trimmed, search, isShared: shareOnSave },
      {
        onSuccess: () => {
          toast.success(t('Common.Saved'));
          setName('');
          setShareOnSave(false);
          setSaveOpen(false);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const renderView = (view: SavedView, owned: boolean) => (
    <DropdownMenuItem
      key={view.id}
      // Apply from page 1 — the snapshot's page may be past the end if the data shrank.
      onSelect={() => onApply({ ...view.search, page: 1 })}
      className="justify-between gap-2"
    >
      <span className="flex items-center gap-2 truncate">
        <Check className="text-muted-foreground size-4 shrink-0" />
        <span className="truncate">{view.name}</span>
      </span>
      {owned && (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={view.isShared ? t('SavedViews.Unshare') : t('SavedViews.Share')}
            title={view.isShared ? t('SavedViews.Unshare') : t('SavedViews.Share')}
            className={view.isShared ? 'text-primary' : 'text-muted-foreground hover:text-primary'}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              setShared.mutate(
                { id: view.id, isShared: !view.isShared },
                { onError: (error) => toast.error(error.message) }
              );
            }}
          >
            {view.isShared ? <Globe className="size-4" /> : <Lock className="size-4" />}
          </button>
          <button
            type="button"
            aria-label={t('SavedViews.Delete')}
            className="text-muted-foreground hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              removeView.mutate(view.id, { onError: (error) => toast.error(error.message) });
            }}
          >
            <Trash2 className="size-4" />
          </button>
        </span>
      )}
    </DropdownMenuItem>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Bookmark className="mr-2 size-4" />
            {t('SavedViews.Title')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-96 w-72 overflow-y-auto">
          {myViews.length === 0 && sharedViews.length === 0 ? (
            <div className="text-muted-foreground px-2 py-1.5 text-sm">{t('SavedViews.Empty')}</div>
          ) : (
            <>
              {myViews.length > 0 && (
                <>
                  <DropdownMenuLabel>{t('SavedViews.MyViews')}</DropdownMenuLabel>
                  {myViews.map((view) => renderView(view, true))}
                </>
              )}
              {sharedViews.length > 0 && (
                <>
                  {myViews.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel>{t('SavedViews.Shared')}</DropdownMenuLabel>
                  {sharedViews.map((view) => renderView(view, false))}
                </>
              )}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
            <Plus className="mr-2 size-4" />
            {t('SavedViews.Save')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {saveOpen && (
        <Dialog open onOpenChange={setSaveOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('SavedViews.Save')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="saved-view-name">{t('SavedViews.NameLabel')}</Label>
                <Input
                  id="saved-view-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSave()}
                  placeholder={t('SavedViews.NamePlaceholder')}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={shareOnSave}
                  onCheckedChange={(value) => setShareOnSave(value === true)}
                />
                {t('SavedViews.ShareLabel')}
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveOpen(false)}>
                {t('Common.Cancel')}
              </Button>
              <Button onClick={handleSave} disabled={!name.trim() || createView.isPending}>
                {t('Common.Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
