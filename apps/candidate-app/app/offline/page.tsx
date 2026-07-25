export default function OfflinePage() {
  return (
    <main className="min-h-dvh bg-[#F5F8F5] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#2A7B3E] text-white flex items-center justify-center font-black mb-4">
        IFB
      </div>
      <h1 className="text-xl font-extrabold text-[#0D1E12]">Você está offline</h1>
      <p className="mt-2 text-sm text-[#4E6859] max-w-sm leading-relaxed">
        Sem conexão no momento. O shell do PSI continua disponível; seus rascunhos
        serão sincronizados quando a internet voltar.
      </p>
    </main>
  );
}
