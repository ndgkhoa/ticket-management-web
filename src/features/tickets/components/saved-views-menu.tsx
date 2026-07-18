import { Bookmark, Check, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
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
import { useSavedViewsStore } from '~/stores/saved-views';
import type { TicketSearch } from '~/features/tickets/schemas/ticket-search-schema';

type Props = {
  /** The current list search — what "Save current view" snapshots. */
  search: TicketSearch;
  /** Navigate to a saved view's params (absolute, replaces the current search). */
  onApply: (search: TicketSearch) => void;
};

/**
 * Saved-views control for the ticket list: a dropdown to apply or delete a stored view,
 * plus a small dialog to name and save the current filters. Views live in a persisted
 * Zustand store, so this component owns only the open/name UI state.
 */
export function SavedViewsMenu({ search, onApply }: Props) {
  const { t } = useTranslation();
  const views = useSavedViewsStore((state) => state.views);
  const addView = useSavedViewsStore((state) => state.addView);
  const removeView = useSavedViewsStore((state) => state.removeView);

  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addView(trimmed, search);
    setName('');
    setSaveOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Bookmark className="mr-2 size-4" />
            {t('SavedViews.Title')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t('SavedViews.Title')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {views.length === 0 ? (
            <div className="text-muted-foreground px-2 py-1.5 text-sm">{t('SavedViews.Empty')}</div>
          ) : (
            views.map((view) => (
              <DropdownMenuItem
                key={view.id}
                // Keep focus/close behaviour to the apply action; the delete button
                // stops propagation so removing a view doesn't also apply it. Apply from
                // page 1 — the snapshot's page may be past the end if the data shrank since
                // it was saved, which would land the user on an empty page.
                onSelect={() => onApply({ ...view.search, page: 1 })}
                className="justify-between gap-2"
              >
                <span className="flex items-center gap-2 truncate">
                  <Check className="text-muted-foreground size-4 shrink-0" />
                  <span className="truncate">{view.name}</span>
                </span>
                <button
                  type="button"
                  aria-label={t('SavedViews.Delete')}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    removeView(view.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </DropdownMenuItem>
            ))
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveOpen(false)}>
                {t('Common.Cancel')}
              </Button>
              <Button onClick={handleSave} disabled={!name.trim()}>
                {t('Common.Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
