import Image from "next/image";
import Link from "next/link";

interface NavItemProps {
    href: string;
    src: string;
    alt: string;
    label: string;
    imgSize?: number;
    maxW?: string;
    gap?: string;
}

function NavItem({ href, src, alt, label, imgSize = 35, maxW = "max-w-20", gap = "gap-1" }: NavItemProps) {
    return (
        <Link href={href} className={`flex flex-col items-center justify-center bg-white rounded-md transition ${gap}`}>
            <div className={`${maxW} flex flex-col items-center justify-center`}>
                <Image src={src} alt={alt} width={imgSize} height={imgSize} />
                <span className="text-black text-center text-xs whitespace-normal leading-tight">{label}</span>
            </div>
        </Link>
    );
}

export default function BottomNav() {
    return (
        <footer className="text-white w-full h-22 fixed bottom-0 left-0 right-0 flex items-center justify-center
      bg-[#fcfcfc] border-t border-gray-200 shadow-md">
            <div className="grid grid-cols-4 items-center max-w-md mx-auto w-full">
                <NavItem
                    href={"/"}
                    src="/bottom-nav/home.png"
                    alt="Home"
                    label="Página Inicial"
                    maxW="max-w-16"
                    gap="gap-0.5"
                />
                <NavItem
                    href={"/processos/meus-processos"}
                    src="/bottom-nav/meus-processos.png"
                    alt="Meus Processos"
                    label="Meus Processos"
                    imgSize={42}

                />
                <NavItem
                    href={"/processos/abertos"}
                    src="/bottom-nav/processos-abertos.png"
                    alt="Processos Abertos"
                    label="Processos Abertos"
                    imgSize={30}
                />
                <NavItem
                    href={"/processos/finalizados"}
                    src="/bottom-nav/processos-finalizados.png"
                    alt="Processos Finalizados"
                    label="Processos Finalizados"
                    imgSize={30}
                />


            </div>
        </footer>
    );
}
