import Image from "next/image";

export default function Header() {
  return (
    <header className="text-white w-full h-32 flex items-center justify-center
      bg-[#2f9e41] bg-[url('/bg-header-effect.png')] bg-cover">
      <div className="grid grid-cols-[auto_1fr_auto] items-center w-90 gap-x-4">
        <Image
          src="/logo-branca.svg"
          alt="Logo"
          width={60}
          height={40}
        />

        <h1 className="text-lg font-light leading-tight text-left">
          Processos <br /> Seletivos
        </h1>

        <div className="flex gap-2 justify-end">
          <button
            className="flex items-center justify-center bg-white w-10 h-10 rounded-md hover:bg-gray-200 transition"
          >
            <Image
              src="/search-icon-green.svg"
              alt="Pesquisar"
              width={20}
              height={20}
            />
          </button>

          <button
            className="flex items-center justify-center bg-white w-10 h-10 rounded-md hover:bg-gray-200 transition"
          >
            <Image
              src="/user-icon-green.svg"
              alt="Usuário"
              width={20}
              height={20}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
