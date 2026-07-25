export interface Endereco {
    id: number;
    id_usuario: number;
    estado: string;
    cidade: string;
    CEP: string;
    logradouro: string;
    bairro: string;
    numero_residencia: string;
    complemento?: string | null;
};
