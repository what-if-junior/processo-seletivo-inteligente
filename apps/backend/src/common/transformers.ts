import { ValueTransformer } from 'typeorm';

/** Postgres devolve DECIMAL e BIGINT como string; a API expoe number. */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value ?? null,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};
