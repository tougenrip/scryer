import Image from "next/image";


export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image src="/logo.png" alt="Scryer Logo" width={72} height={72} />
    </div>
  );
}