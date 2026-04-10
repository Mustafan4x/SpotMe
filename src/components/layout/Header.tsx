interface HeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export function Header({ title, rightAction }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex min-h-[44px] items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      {rightAction && <div>{rightAction}</div>}
    </header>
  );
}
