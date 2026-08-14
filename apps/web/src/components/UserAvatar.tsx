import { useEffect, useState } from "react";
import { userInitials } from "../lib/userInitials";

type Props = Readonly<{
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  className?: string;
  initialsClassName?: string;
}>;

export function UserAvatar({
  name,
  email,
  picture,
  className = "",
  initialsClassName = "",
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = userInitials(name, email);

  useEffect(() => {
    setImgFailed(false);
  }, [picture]);

  if (picture && !imgFailed) {
    return (
      <img
        src={picture}
        alt=""
        className={className}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className={`grid place-items-center bg-[var(--nw-accent-soft)] font-bold text-[var(--nw-accent-dark)] ${className} ${initialsClassName}`.trim()}
      aria-hidden
    >
      {initials}
    </span>
  );
}
