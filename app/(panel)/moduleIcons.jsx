// Iconos de línea compartidos por el dashboard y los hubs. Estilo uniforme:
// 20px, viewBox 24, stroke currentColor 1.75, caps/joins redondeados.
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function FacturaIcon() {
  return (
    <svg {...base}>
      <path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

export function ClientesIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M15.5 5.5a3 3 0 0 1 0 5.4" />
      <path d="M16.5 14a5.5 5.5 0 0 1 4 4.8" />
    </svg>
  );
}

export function ComprasIcon() {
  return (
    <svg {...base}>
      <path d="M5.5 8h13l-1 11.2a1 1 0 0 1-1 .8H7.5a1 1 0 0 1-1-.8L5.5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function NominaIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16a3 3 0 0 1 6 0" />
      <path d="M14 10.5h4M14 13.5h4" />
    </svg>
  );
}

export function AsientosIcon() {
  return (
    <svg {...base}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16" />
      <path d="M11 9v11" />
    </svg>
  );
}

export function NotasIcon() {
  return (
    <svg {...base}>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
      <path d="M16.5 2.5a2.1 2.1 0 0 1 3 3L13 12l-4 1 1-4 6.5-6.5z" />
    </svg>
  );
}

export function ProductoIcon() {
  return (
    <svg {...base}>
      <path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3z" />
      <path d="M4 7.5l8 4.2 8-4.2" />
      <path d="M12 11.7V21" />
    </svg>
  );
}

export function BilleteIcon() {
  return (
    <svg {...base}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6 10v4M18 10v4" />
    </svg>
  );
}

export function EmpresaIcon() {
  return (
    <svg {...base}>
      <path d="M4 21V6a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15" />
      <path d="M13 10h5a1 1 0 0 1 1 1v10" />
      <path d="M3 21h18" />
      <path d="M7 8.5h2.5M7 12h2.5M7 15.5h2.5M16 14h0M16 17.5h0" />
    </svg>
  );
}

export function ConfigIcon() {
  return (
    <svg {...base}>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}

export function SoporteIcon() {
  return (
    <svg {...base}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
