import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { createCallable } from 'react-call';

export type SignFieldInitialAllDialogProps = {
  /** how many initials boxes are still empty, this one included */
  count: number;
  /** the page numbers they sit on, in order */
  pages: number[];
  /** some initials boxes are already filled — say "remaining" */
  remaining?: boolean;
};

/**
 * Asked once, on the first initials box. Yes = every empty initials box gets
 * the adopted initials (recorded as "initialed all at once" on the certificate). No = one box at a time. The signature,
 * dates and tick boxes are never filled this way.
 */
export const SignFieldInitialAllDialog = createCallable<SignFieldInitialAllDialogProps, boolean | null>(
  ({ call, count, pages, remaining }) => {
    const pageList =
      pages.length === 1 ? `page ${pages[0]}` : `pages ${pages.slice(0, -1).join(', ')} and ${pages[pages.length - 1]}`;

    return (
      <Dialog open={true} onOpenChange={(value) => (!value ? call.end(null) : null)}>
        <DialogContent position="center" data-testid="initial-all-dialog">
          <DialogHeader>
            <DialogTitle>
              Initial all {count} {remaining ? 'remaining ' : ''}boxes?
            </DialogTitle>
            <DialogDescription>
              {remaining ? `${count} initials boxes are still empty` : `This document has ${count} initials boxes`}, on{' '}
              {pageList}. Apply your initials to all of them now, or initial them one at a time as you read. Your
              signature, dates and tick boxes are not filled this way.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="secondary" data-testid="initial-all-no" onClick={() => call.end(false)}>
              No, one at a time
            </Button>
            <Button type="button" data-testid="initial-all-yes" onClick={() => call.end(true)}>
              Yes, initial all {count}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
