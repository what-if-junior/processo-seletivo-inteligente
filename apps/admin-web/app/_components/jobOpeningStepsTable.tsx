export default function JobOpeningStepsTable() {
    // preenchimento da tabela

  const steps = [
    { date: "12/11/2024", step: "Publicação do edital" },
    { date: "14/11/2024 a 10/01/2025", step: "Abertura de Período de Inscrições" },
    { date: "06 a 13/01/2025", step: "Período para entrega da documentação comprobatória de reserva de vaga via on-line ou presencial (dias úteis), conforme o Campus" },
    { date: "16/01/2025", step: "Publicação de Resultado Preliminar da Análise da Documentação Comprobatória da Reserva de Vaga" },
    { date: "17/01/2025", step: "Período de apresentação de recurso" },
    { date: "22/01/2025", step: "Publicação da Convocação de todos os candidatos negros que tiveram a reserva comprovada documentalmente em resultado preliminar para Verificação Complementar da Autodeclaração dos Candidatos Negros (Pretos ou Pardos) por meio de Banca de Heteroidentificação" },
    { date: "26/01/2025", step: "Período para Interposição de Recursos contra o Resultado Preliminar da Verificação Complementar da Autodeclaração dos Candidatos Negros" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-green-800 text-sm rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-green-800 text-white">
            <th className="border-2 border-white px-4 py-2 text-left w-40">DATAS</th>
            <th className="border-2 border-white px-4 py-2 text-left">ETAPAS DO PROCESSO SELETIVO</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={i} className="even:bg-green-400 odd:bg-green-500 text-white font-bold">
              <td className="border-2 border-white text-center align-middle">{s.date}</td>
              <td className="border-2 border-white">{s.step}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
