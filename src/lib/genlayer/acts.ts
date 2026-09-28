import { formatDateTime } from "@/lib/formatting/present";
import type { AccordRequest, ResultRecord } from "@/lib/genlayer/contract";

/**
 * Which writes a viewer can usefully send to a request right now, each with
 * the reason when it cannot. This mirrors the contract's own checks so the
 * interface offers only what would be accepted; it decides nothing. The clock
 * is the viewer's device, used only to offer an act: the contract checks every
 * one again against the transaction's own time and refuses in its own words.
 */

export const FINALITY_DELAY = 300;
export const MIN_OBSERVATION_INTERVAL = 900;
export const MAX_RESULTS = 100;

export type ActId = "observe" | "finalize" | "expire" | "close" | "refund" | "cancel";
export type VerbMethod =
  | "observe_accord"
  | "finalize_result"
  | "expire_result"
  | "close_accord"
  | "refund_bond"
  | "cancel_accord";

export type Act = {
  id: ActId;
  method: VerbMethod;
  label: string;
  explains: string;
  available: boolean;
  reason?: string;
  /** Anyone may send it; the caller gains nothing and chooses nothing. */
  permissionless: boolean;
};

export function actsFor(
  r: AccordRequest,
  latest: ResultRecord | null | undefined,
  now: number,
  viewer?: string,
): Act[] {
  const acts: Act[] = [];
  const open = r.status === "SUBMITTED" || r.status === "FINALIZED";

  // observe
  let why: string | undefined;
  if (!open)
    why = r.status === "PROPOSED" ? "A result is pending finality." : "The request is no longer open.";
  else if (now < r.observation_window_start)
    why = `The observation window opens ${formatDateTime(r.observation_window_start)}.`;
  else if (now > r.observation_window_end) why = "The observation window has closed.";
  else if (r.last_observed_at && now < r.last_observed_at + MIN_OBSERVATION_INTERVAL)
    why = `The next observation is possible ${formatDateTime(r.last_observed_at + MIN_OBSERVATION_INTERVAL)}.`;
  else if (r.result_count >= MAX_RESULTS) why = `A request holds at most ${MAX_RESULTS} results.`;
  acts.push({
    id: "observe",
    method: "observe_accord",
    label: "Observe now",
    explains: "Ask GenLayer to read every source, reconcile them under the policy and record the result.",
    available: !why,
    reason: why,
    permissionless: true,
  });

  // finalize
  if (r.status === "PROPOSED" && latest) {
    const ready = latest.observation_time + FINALITY_DELAY;
    acts.push({
      id: "finalize",
      method: "finalize_result",
      label: "Finalize the result",
      explains: "After the contract's finality delay, make the pending result the request's state.",
      available: now >= ready,
      reason: now >= ready ? undefined : `It can be finalized ${formatDateTime(ready)}.`,
      permissionless: true,
    });
  }

  // expire
  if (r.status === "FINALIZED" && latest && r.current_state !== "EXPIRED") {
    acts.push({
      id: "expire",
      method: "expire_result",
      label: "Record expiry",
      explains: "The latest result's validity has passed; record that its state is no longer current.",
      available: now >= latest.valid_until,
      reason: now >= latest.valid_until ? undefined : `The result is valid until ${formatDateTime(latest.valid_until)}.`,
      permissionless: true,
    });
  }

  // close
  if (open || r.status === "PROPOSED") {
    acts.push({
      id: "close",
      method: "close_accord",
      label: "Close the request",
      explains: "After the observation window, close the request so its bond can be refunded.",
      available: open && now > r.observation_window_end && r.status !== "PROPOSED",
      reason:
        r.status === "PROPOSED"
          ? "Finalize the pending result first."
          : now > r.observation_window_end
            ? undefined
            : `The window is open until ${formatDateTime(r.observation_window_end)}.`,
      permissionless: true,
    });
  }

  // refund
  if (r.bond_status === "REFUNDABLE") {
    acts.push({
      id: "refund",
      method: "refund_bond",
      label: "Refund the bond",
      explains: "Return the whole bond to the creator. It goes only to the creator, whoever sends this.",
      available: true,
      permissionless: true,
    });
  } else if (r.bond_status === "LOCKED") {
    acts.push({
      id: "refund",
      method: "refund_bond",
      label: "Refund the bond",
      explains: "Return the whole bond to the creator. It goes only to the creator, whoever sends this.",
      available: false,
      reason: "The bond stays locked until the request closes or is cancelled.",
      permissionless: true,
    });
  }

  // cancel
  if (r.status === "SUBMITTED" && r.result_count === 0) {
    const isCreator = !!viewer && viewer.toLowerCase() === r.creator.toLowerCase();
    acts.push({
      id: "cancel",
      method: "cancel_accord",
      label: "Cancel the request",
      explains: "Withdraw a request that has never been observed. The bond becomes refundable.",
      available: isCreator,
      reason: isCreator ? undefined : "Only the creator can cancel a request.",
      permissionless: false,
    });
  }
  return acts;
}

/** Is the request's recorded state past its validity without being marked expired? */
export function pastValidity(r: AccordRequest, latest: ResultRecord | null | undefined, now: number): boolean {
  return !!latest && latest.status === "FINALIZED" && r.current_state !== "EXPIRED" && now >= latest.valid_until;
}

export const inWindow = (r: AccordRequest, now: number) =>
  now >= r.observation_window_start && now <= r.observation_window_end;
