'use client';
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@repo/types";
import HeaderTitle from "../_components/HeaderTitle";

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
const loggedUser: User = {
    id: "id-123",
    nome: "Gabriel Pinho",
    email: "gabriel@example.com",
    telefone: "(61) 99999-8888",
    cpf: "123.456.789-00",
    dataNascimento: "1995-10-26",
    endereco: {
        cep: '72315-000',
        logradouro: 'QNM 40 Conjunto J',
        numero: '123',
        bairro: 'Taguatinga Norte',
        cidade: 'Brasília',
        estado: 'DF'
    }
};

export default function PerfilPage() {
    const router = useRouter();

    const [user, setUser] = useState(loggedUser);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        cpf: user.cpf,
        dataNascimento: user.dataNascimento,
        cep: user.endereco.cep,
        logradouro: user.endereco.logradouro,
        bairro: user.endereco.bairro,
        cidade: user.endereco.cidade,
        estado: user.endereco.estado,
        numero: user.endereco.numero
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function handleSave() {
        setUser({
            ...user,
            nome: form.nome,
            email: form.email,
            telefone: form.telefone,
            cpf: form.cpf,
            dataNascimento: form.dataNascimento,
            endereco: {
                cep: form.cep,
                logradouro: form.logradouro,
                bairro: form.bairro,
                cidade: form.cidade,
                estado: form.estado,
                numero: form.numero,
            }
        });
        setEditing(false);
    }

    function handleCancel() {
        setForm({
            nome: user.nome,
            email: user.email,
            telefone: user.telefone,
            cpf: user.cpf,
            dataNascimento: user.dataNascimento,
            cep: user.endereco.cep,
            logradouro: user.endereco.logradouro,
            bairro: user.endereco.bairro,
            cidade: user.endereco.cidade,
            estado: user.endereco.estado,
            numero: user.endereco.numero
        });
        setEditing(false);
    }

    return (
            <div className="bg-white min-h-screen max-w-md mx-auto px-8">
                <HeaderTitle title="Perfil de Candidato" />

                {/* --- Campos do Formulário --- */}
                <form className="space-y-4">
                    <FormField label="Nome Completo:" name="nome" value={form.nome} editing={editing} onChange={handleChange} placeholder="Digite seu nome" />
                    <FormField label="Email:" name="email" value={form.email} editing={editing} onChange={handleChange} placeholder="seu@email.com" />
                    <FormField label="Telefone:" name="telefone" value={form.telefone} editing={editing} onChange={handleChange} placeholder="(00) 00000-0000" />
                    <FormField label="CPF:" name="cpf" value={form.cpf} editing={editing} onChange={handleChange} placeholder="000.000.000-00" />
                    <FormField label="Data de Nascimento:" name="dataNascimento" value={form.dataNascimento} editing={editing} onChange={handleChange} placeholder="DD/MM/AAAA" />
                    <h1 className="text-2xl font-bold text-[#2f9e41] mt-4">
                        Endereço de Candidato
                    </h1>
                    <FormField label="CEP:" name="cep" value={form.cep} editing={editing} onChange={handleChange} placeholder="00000-000" />
                    <FormField label="Logradouro:" name="logradouro" value={form.logradouro} editing={editing} onChange={handleChange} placeholder="Digite seu logradouro" />
                    <FormField label="Bairro:" name="bairro" value={form.bairro} editing={editing} onChange={handleChange} placeholder="Digite seu bairro" />
                    <FormField label="Estado:" name="estado" value={form.estado} editing={editing} onChange={handleChange} placeholder="Digite seu estado" />
                    <FormField label="Cidade:" name="cidade" value={form.cidade} editing={editing} onChange={handleChange} placeholder="Digite sua cidade" />
                    <FormField label="Número:" name="numero" value={form.numero} editing={editing} onChange={handleChange} placeholder="Digite o número de seu endereço" />
                </form>


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
                            className="w-full bg-blue-500 text-white font-bold px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Editar Perfil
                        </button>
                    )}
                </div>
            </div>
    );
}