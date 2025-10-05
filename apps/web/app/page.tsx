import Link from 'next/link';

// --- Dados de Simulação ---
const DADOS_CURSOS = [
  { id: 1, nome: "Curso Técnico" },
  { id: 2, nome: "Superior em Computação" },
  { id: 3, nome: "Ensino Médio Integrado" },
  { id: 4, nome: "Técnico em Vestuário" },
  { id: 5, nome: "Técnico em Moda" },
  { id: 6, nome: "Técnico em Hotelaria" },
];

// --- Subcomponente para os Botões de Cursos ---
interface CourseButtonProps {
  nome: string;
  href?: string;
}

function CourseButton({ nome, href = "#" }: CourseButtonProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-3xl bg-[#2f9e41] p-4 text-center text-lg font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-95 min-h-[90px]"
    >
      {nome}
    </Link>
  );
}

export default function Home() {
  const userName = "Usuário";// trazer de autenticacao no futuro

  return (
    <div className="mx-auto max-w-md px-6 py-8">
      {/* Seção de Saudação */}
      <section className="mb-8">
        <p className="text-xl text-gray-600">Olá,</p>
        <h1 className="text-4xl font-bold text-[#2f9e41]">{userName}</h1>
      </section>

      {/* Seção do Carrossel (Placeholder) */}
      <section className="mb-12">
        {/* usar uma biblioteca como Swiper.js ou Embla aqui */}
        <div className="flex h-48 items-center justify-center rounded-2xl bg-gray-200">
          <span className="text-gray-500">Destaques do Carrossel</span>
        </div>
        <div className="mt-4 flex justify-center items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-300"></div>
            <div className="h-2 w-2 rounded-full bg-gray-500"></div>
            <div className="h-2 w-2 rounded-full bg-gray-300"></div>
        </div>
      </section>

      {/* Seção de Cursos Disponíveis */}
      <section>
        <h2 className="mb-4 text-2xl font-bold text-gray-800">Cursos Disponíveis</h2>
        <div className="grid grid-cols-2 gap-4">
          {DADOS_CURSOS.map((curso) => (
            <CourseButton key={curso.id} nome={curso.nome} />
          ))}
        </div>
      </section>
    </div>
  );
}