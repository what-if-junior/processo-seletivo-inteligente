import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="text-white w-full h-40 relative flex items-center justify-center
      bg-[#2f9e41] bg-[url('/bg-header-effect.png')] bg-cover">
      <div className="grid grid-cols-[auto_1fr_auto] items-center w-90 gap-x-4">
        <Image
          src="/logo-branca.svg"
          alt="Logo"
          width={60}
          height={40}
        />
        <h1 className="text-sm font-normal text-justify leading-tight">
          PROCESSOS <br /> SELETIVOS
        </h1>

        <div className="flex gap-4 justify-end">
          <button className="flex items-center justify-center bg-white w-9 h-9 rounded-md hover:bg-gray-200 transition">
            <Image
              src="/search-icon-green.svg"
              alt="Pesquisar"
              width={20}
              height={20}
            />
          </button>

          <Link href="/perfil" className="flex items-center justify-center bg-white w-9 h-9 rounded-md hover:bg-gray-200 transition">
            <Image
              src="/user-icon-green.svg"
              alt="Usuário"
              width={20}
              height={20}
            />
          </Link>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-white rounded-t-4xl z-0"></div>
    </header>
  );
}
