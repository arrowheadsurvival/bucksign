import { Button } from '@documenso/ui/primitives/button';
import { useState } from 'react';

export type CloseTabButtonProps = {
  className?: string;
};

/**
 * The finished-signing pages end with Close, never a link
 * into the signing site. A browser only lets a script close a tab that a script opened, so a page opened from an email
 * link stays open — then the button turns into a note saying the tab can be closed.
 */
export const CloseTabButton = ({ className }: CloseTabButtonProps) => {
  const [stillOpen, setStillOpen] = useState(false);

  if (stillOpen) {
    return (
      <p className="text-center text-muted-foreground text-sm" data-testid="close-tab-note">
        You can close this tab now.
      </p>
    );
  }

  return (
    <Button
      type="button"
      className={className}
      data-testid="close-tab"
      onClick={() => {
        window.close();
        setTimeout(() => setStillOpen(true), 300);
      }}
    >
      Close
    </Button>
  );
};
