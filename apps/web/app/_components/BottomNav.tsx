import Image from "next/image";
import Link from "next/link";

export default function BottomNav() {
    return (
        <footer className="text-white w-full h-22 fixed bottom-0 left-0 right-0 flex items-center justify-center
      bg-[#fcfcfc] border-t border-gray-200 shadow-md">
            <div className="grid grid-cols-4 items-center max-w-md mx-auto w-full gap-2">
                <Link href={"/"} className="flex flex-col items-center justify-center bg-white rounded-md transition gap-0.5">
                    <Image
                        src="/bottom-nav/home.png"
                        alt="Home"
                        width={35}
                        height={35}
                    />
                    <span className="text-black text-center text-xs max-w-16 whitespace-normal leading-tight">Página Inicial</span>
                </Link>
                <Link href={"/processos/meus-processos"} className="flex flex-col items-center justify-center bg-white rounded-md transition max-w-20"
                >
                    <Image
                        src="/bottom-nav/meus-processos.png"
                        alt="Meus Processos"
                        width={42}
                        height={42}
                    />
                    <span className="text-black text-center text-xs">Meus Processos</span>
                </Link>
                <Link href={"/processos/abertos"} className="flex flex-col items-center justify-center bg-white rounded-md transition max-w-20"
                >
                    <Image
                        src="/bottom-nav/processos-abertos.png"
                        alt="Processos Abertos"
                        width={30}
                        height={30}
                    />
                    <span className="text-black text-center text-xs">Processos Abertos</span>
                </Link>
                <Link href={"/processos/finalizados"} className="flex flex-col items-center justify-center bg-white rounded-md transition max-w-20"
                >
                    <Image
                        src="/bottom-nav/processos-finalizados.png"
                        alt="Processos Finalizados"
                        width={30}
                        height={30}
                    />
                    <span className="text-black text-center text-xs">Processos Finalizados</span>
                </Link>
            </div>
        </footer>
    );
}
