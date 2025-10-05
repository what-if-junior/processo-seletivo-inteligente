'use client';
import { useRouter } from "next/navigation";

interface HeaderTitleProps {
    title: string;
}

export default function HeaderTitle({ title }: HeaderTitleProps) {
    const router = useRouter();

    return (
        <div className="flex items-center mb-4 gap-1">
            <button
                onClick={() => router.back()}
                className="flex justify-left w-12 h-12 text-3xl font-black text-[#2f9e41] transition rounded-full hover:bg-green-400"
            >
                &lt;
            </button>
            <h1 className="text-2xl font-bold text-[#2f9e41] -mt-2">
                {title}
            </h1>
        </div>
    )
};