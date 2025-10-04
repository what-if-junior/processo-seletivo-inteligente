'use client';
import React, { useState } from "react";
import { useRouter } from "next/navigation";

type FormFieldProps = {
    label: string;
    name: string;
    value: string;
    editing: boolean;
    placeholder?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

// Componente reutilizável para os campos
function FormField({ label, name, value, editing, placeholder, onChange }: FormFieldProps) {
    return (
        <div className="mb-5 w-full text-lg">
            <label className="block font-semibold text-gray-800 mb-1">{label}</label>
            {editing ? (
                <input
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="border border-gray-300 bg-gray-100 text-gray-500 font-semibold px-3 py-2 rounded-md w-full 
               focus:outline-none focus:ring-2 focus:ring-green-500 transition 
               placeholder:text-gray-500 focus:placeholder:text-transparent"
                />
            ) : (
                <p className="bg-gray-100 text-gray-500 font-semibold px-3 py-2 rounded-md w-full min-h-[42px] flex items-center">{value}</p>
            )}
        </div>
    );
}

// Simulação de dados do candidato
const loggedUser = {
    id: 1,
    name: "Gabriel Pinho",
    email: "gabriel@example.com",
    telefone: "(61) 99999-8888",
    cpf: "123.456.789-00",
    dataNascimento: "1995-10-26"
};

export default function PerfilPage() {
    const router = useRouter();

    const [user, setUser] = useState(loggedUser);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        name: user.name,
        email: user.email,
        telefone: user.telefone,
        cpf: user.cpf,
        dataNascimento: user.dataNascimento,
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function handleSave() {
        setUser({ ...user, ...form });
        setEditing(false);
        // Aqui você faria a chamada para a API para salvar os dados
    }

    function handleCancel() {
        setForm({ ...user }); // Reseta o formulário para os dados originais
        setEditing(false);
    }

    return (
        <>
            <main className="bg-white min-h-screen max-w-md mx-auto px-8">
                {/* Cabecalho de form */}
                <div className="flex items-center mb-4 gap-3">
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

                {/* --- Campos do Formulário --- */}
                <FormField label="Nome Completo:" name="name" value={form.name} editing={editing} onChange={handleChange} placeholder="Digite seu nome" />
                <FormField label="Email:" name="email" value={form.email} editing={editing} onChange={handleChange} placeholder="seu@email.com" />
                <FormField label="Telefone:" name="telefone" value={form.telefone} editing={editing} onChange={handleChange} placeholder="(00) 00000-0000" />
                <FormField label="CPF:" name="cpf" value={form.cpf} editing={editing} onChange={handleChange} placeholder="000.000.000-00" />
                <FormField label="Data de Nascimento:" name="dataNascimento" value={form.dataNascimento} editing={editing} onChange={handleChange} placeholder="DD/MM/AAAA" />

                {/* --- Botões de Ação --- */}
                <div className="mt-8">
                    {editing ? (
                        <div className="flex gap-4">
                            <button
                                onClick={handleSave}
                                className="w-full bg-green-600 text-white font-bold px-4 py-3 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Salvar
                            </button>
                            <button
                                onClick={handleCancel}
                                className="w-full bg-gray-200 text-gray-800 font-bold px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setEditing(true)}
                            className="w-full bg-blue-600 text-white font-bold px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Editar Perfil
                        </button>
                    )}
                </div>
            </main>
        </>
    );
}