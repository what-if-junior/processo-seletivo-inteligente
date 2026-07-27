import type { Documento } from "@repo/types";
import { statusDocumentoToUi } from "./status-documento";
import type { DocUiRow } from "./types";

/** Map API documentos to docs-screen rows (upload stays mock for actions). */
export function documentoToDocUiRow(doc: Documento): DocUiRow {
  const nome = doc.tipo_documento || doc.nome_arquivo || `Documento ${doc.id}`;
  const isCamera = /foto|facial|autodeclara|ppi|c[aâ]mera/i.test(nome);
  return {
    id: String(doc.id),
    nome,
    obrigatorio: true,
    status: statusDocumentoToUi(doc.status_documento),
    tipo: isCamera ? "camera" : "upload",
  };
}
