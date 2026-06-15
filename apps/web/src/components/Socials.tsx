// Reach-me links. One handle everywhere: @sebuzdugan.

export const SOCIALS = [
  { id: 'x', label: 'X', href: 'https://x.com/sebuzdugan' },
  { id: 'youtube', label: 'YouTube', href: 'https://youtube.com/@sebuzdugan' },
  { id: 'medium', label: 'Medium', href: 'https://medium.com/@sebuzdugan' },
  { id: 'github', label: 'GitHub', href: 'https://github.com/sebuzdugan' },
] as const;

function Icon({ id }: { id: string }): JSX.Element {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'currentColor' } as const;
  switch (id) {
    case 'x':
      return (
        <svg {...common} aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common} aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'medium':
      return (
        <svg {...common} aria-hidden>
          <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
        </svg>
      );
    case 'github':
    default:
      return (
        <svg {...common} aria-hidden>
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.005 2.045.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
  }
}

/** Icon-only row (for the top nav). */
export function SocialIcons({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {SOCIALS.map((s) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noreferrer"
          title={`${s.label} - @sebuzdugan`}
          aria-label={s.label}
          className="rounded-lg p-2 text-[#8a9197] transition hover:bg-[#15191b] hover:text-[#9fe870]"
        >
          <Icon id={s.id} />
        </a>
      ))}
    </div>
  );
}

/** Labelled buttons (for the footer). */
export function SocialButtons(): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {SOCIALS.map((s) => (
        <a
          key={s.id}
          href={s.href}
          target="_blank"
          rel="noreferrer"
          className="mono flex items-center gap-2 rounded-full border border-[#23282b] bg-[#0e1113] px-3.5 py-1.5 text-[12px] text-[#c4cacd] transition hover:border-[#2f5a32] hover:text-[#9fe870]"
        >
          <Icon id={s.id} />
          {s.label}
        </a>
      ))}
    </div>
  );
}
