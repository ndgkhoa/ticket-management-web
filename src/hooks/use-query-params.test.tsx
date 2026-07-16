import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useQueryParams } from '~/hooks/use-query-params';
import { act, render, screen } from '~/testing/render';

const DEBOUNCE_MS = 500;

type Harnessprobe = {
  /** Every keyword that actually reached the URL. */
  writes: string[];
  /** Each distinct debounced setter instance the hook has handed out. */
  setters: Set<unknown>;
};

const Harness = ({ probe }: { probe: Harnessprobe }) => {
  const { queryParams, setQueryWithDebounce } = useQueryParams();
  const [, forceRender] = useState(0);

  probe.setters.add(setQueryWithDebounce);

  useEffect(() => {
    if (queryParams.keyword) probe.writes.push(queryParams.keyword);
  }, [queryParams.keyword, probe.writes]);

  return (
    <div>
      <button onClick={() => setQueryWithDebounce({ keyword: 'a' })}>type a</button>
      <button onClick={() => setQueryWithDebounce({ keyword: 'ab' })}>type ab</button>
      <button onClick={() => forceRender((n) => n + 1)}>re-render parent</button>
    </div>
  );
};

const makeProbe = (): Harnessprobe => ({ writes: [], setters: new Set() });

describe('useQueryParams', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('collapses keystrokes inside the debounce window into a single write', async () => {
    const probe = makeProbe();
    render(<Harness probe={probe} />);

    act(() => void screen.getByText('type a').click());
    act(() => void screen.getByText('type ab').click());

    // Nothing written yet — the window has not elapsed.
    expect(probe.writes).toEqual([]);

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(probe.writes).toEqual(['ab']);
  });

  /**
   * This is the regression test — the other two would pass against the original bug.
   *
   * The debounced setter used to be rebuilt on every render, so each render owned a
   * separate timer and a parent re-render mid-typing let *two* writes through. That
   * is invisible from the outside: both writes land in one React flush, so the
   * committed state ends on the last keystroke either way, and the final URL looks
   * correct. The observable difference is the setter's identity — one instance means
   * one timer means one write.
   *
   * It only ever looked correct in the app because the search input is uncontrolled
   * and does not re-render as you type: an accident, not a design.
   */
  it('keeps one debounced setter across re-renders', () => {
    const probe = makeProbe();
    render(<Harness probe={probe} />);

    act(() => void screen.getByText('type a').click());
    act(() => void screen.getByText('re-render parent').click());
    act(() => void screen.getByText('type ab').click());

    expect(probe.setters.size).toBe(1);
  });

  it('cancels a pending write when the consumer unmounts', () => {
    const probe = makeProbe();
    const { unmount } = render(<Harness probe={probe} />);

    const [setter] = [...probe.setters] as { cancel: () => void }[];
    const cancel = vi.spyOn(setter, 'cancel');

    act(() => void screen.getByText('type a').click());
    unmount();

    // Without the cleanup the timer outlives its component and fires a navigation
    // at a tree that no longer exists.
    expect(cancel).toHaveBeenCalled();
  });
});
