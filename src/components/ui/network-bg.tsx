/**
 * The fixed ambient background: a quiet network of drifting dashed paths and
 * floating square nodes — the field every page renders above. Purely
 * decorative; carries no information.
 */

const NODES = [
  { w: 70, top: "8%", left: "5%", delay: "-1.4s" },
  { w: 42, top: "34%", left: "16%", delay: "-4.8s" },
  { w: 52, top: "28%", left: "88%", delay: "-2.6s" },
  { w: 58, top: "72%", left: "6%", delay: "-5.9s" },
  { w: 66, top: "9%", right: "5%", delay: "-3.4s" },
  { w: 44, top: "60%", right: "9%", delay: "-0.8s" },
  { w: 54, top: "80%", right: "22%", delay: "-4.1s" },
  { w: 36, top: "48%", left: "48%", delay: "-2.1s" },
];

export function NetworkBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1440 900">
        <path className="net-path" d="M-40 220 C 240 160, 420 320, 720 240 S 1240 120, 1520 260" />
        <path className="net-path net-path--dim" d="M-40 480 C 260 560, 560 380, 860 480 S 1300 620, 1520 480" />
        <path className="net-path" style={{ animationDuration: "12s" }} d="M180 -40 C 240 240, 120 520, 260 940" />
        <path className="net-path net-path--dim" d="M1220 -40 C 1120 260, 1300 560, 1180 940" />
        <path className="net-path net-path--dim" style={{ animationDuration: "7s" }} d="M-40 720 C 320 640, 620 820, 900 700 S 1360 760, 1520 700" />
      </svg>
      {NODES.map((n, i) => (
        <span
          key={i}
          className="net-node"
          style={{
            width: n.w,
            height: n.w,
            top: n.top,
            left: "left" in n ? n.left : undefined,
            right: "right" in n ? n.right : undefined,
            animationDelay: n.delay,
            opacity: 0.5,
          }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 520px at 50% -8%, rgba(53,213,180,0.05), transparent 65%), radial-gradient(closest-side at 50% 115%, rgba(7,17,14,0.92), transparent)",
        }}
      />
    </div>
  );
}
