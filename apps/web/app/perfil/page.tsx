'use client';
import React, { useState } from "react";
import { useRouter } from "next/navigation";

// Simulação de usuário logado
const loggedUser = {
    id: 1,
    name: "Gabriel Pinho",
    email: "gabriel@example.com",
};

export default function PerfilPage() {
    const router = useRouter();

    const [user, setUser] = useState(loggedUser);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: user.name, email: user.email });

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function handleSave() {
        setUser({ ...user, ...form });
        setEditing(false);
    }

    return (
        <>
            <main className="bg-white min-h-screen max-w-md mx-auto px-8">
                {/* Cabecalho de form */}
                <div className="flex items-center mb-8 gap-3">
                    <button
                        onClick={() => router.back()}
                        className="flex justify-center w-12 h-12 text-3xl font-black text-[#2f9e41] transition rounded-full hover:bg-green-400"
                    >
                        &lt;
                    </button>
                    <h1 className="text-2xl font-bold text-[#2f9e41] -mt-2">
                        Perfil de Candidato
                    </h1>
                </div>


                <div className="mb-4">
                    <label className="block font-semibold">Nome:</label>
                    {editing ? (
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            className="border px-2 py-1 rounded w-full"
                        />
                    ) : (
                        <span>{user.name}</span>
                    )}
                </div>
                <div className="mb-4">
                    <label className="block font-semibold">Email:</label>
                    {editing ? (
                        <input
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="border px-2 py-1 rounded w-full"
                        />
                    ) : (
                        <span>{user.email}</span>
                    )}
                </div>
                {editing ? (
                    <div>
                        <button
                            onClick={handleSave}
                            className="bg-green-500 text-white px-4 py-2 rounded mr-2 hover:bg-green-600"
                        >
                            Salvar
                        </button>
                        <button
                            onClick={() => setEditing(false)}
                            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                        >
                            Cancelar
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setEditing(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Editar Perfil
                    </button>
                )}
            </main>
        </>
    );
}