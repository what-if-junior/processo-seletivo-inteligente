'use client';
import { useRouter } from "next/navigation";
import JobOpeningStepsTable from "../../_components/jobOpeningStepsTable";

export default function PaginaCurso({ params }: { params: { slug: string } }) {
    const router = useRouter();

    // O 'params.slug' corresponderá ao valor na URL.
    const { slug } = params;

    return (
        <div className="mx-auto max-w-md px-6 py-8 bg-white">
            {/* Cabecalho de form */}
            <div className="flex items-center mb-4 gap-1">
                <button
                    onClick={() => router.back()}
                    className="flex justify-left w-12 h-12 text-3xl font-black text-[#2f9e41] transition rounded-full hover:bg-green-400"
                >
                    &lt;
                </button>
                <h1 className="text-2xl font-bold text-[#2f9e41] -mt-2">
                    {params.slug.toLocaleUpperCase()}
                </h1>
            </div>

            <JobOpeningStepsTable />
            <button
                className="flex items-center justify-center rounded-2xl bg-[#2f9e41] p-4 text-center text-lg font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-85 min-w-48 h-12 mt-8 mx-auto"
            >
                INSCREVER-SE
            </button>
        </div>
    );
}