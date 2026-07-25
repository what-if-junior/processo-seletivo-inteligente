'use client';
import { useRouter } from "next/navigation";
import JobOpeningStepsTable from "../../_components/jobOpeningStepsTable";
import { use } from 'react';
import HeaderTitle from "../../_components/HeaderTitle";

export default function Curso({ params }: { params: Promise<{ slug: string }> }) {
    const router = useRouter();

    //  hook 'use' para "desembrulhar" a Promise de params
    const { slug } = use(params);

    return (
        <div className="mx-auto max-w-md px-6 py-4 bg-white">
            <HeaderTitle title={slug.toUpperCase()} />

            <JobOpeningStepsTable />
            <button
                className="flex items-center justify-center rounded-2xl bg-[#2f9e41] p-4 text-center text-lg font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-85 min-w-48 h-12 mt-8 mx-auto"
            >
                INSCREVER-SE
            </button>
        </div>
    );
}