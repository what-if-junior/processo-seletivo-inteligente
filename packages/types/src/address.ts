export interface Endereco {
    id_endereco: string; 
    id_usuario: string;
    estado: string;
    cidade: string;
    CEP: string;
    logradouro: string;
    bairro: string;
    numero_residencia: string;
    complemento?: string;
};