import Image from "next/image";

export function CompanyLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return <Image src="/sunshine-logo-transparent.png" alt="Sunshine Engineering — Multi Engineering Service" width={1313} height={1198} className={`company-logo ${className}`} priority={priority} sizes="(max-width: 760px) 140px, 240px" />;
}
