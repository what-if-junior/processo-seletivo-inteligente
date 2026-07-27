export type { EditalCard, DocUiRow, CronogramaRow, WizardCota, UiBadgeStatus } from "./types";
export {
  statusCandidaturaToBadge,
  isTerminalCandidaturaStatus,
} from "./status-candidatura";
export { statusDocumentoToUi } from "./status-documento";
export {
  cursoToEditalCard,
  cursoInscricaoStatus,
  inferCursoTipo,
  formatPrazoBr,
} from "./curso";
export { tipoVagaFromWizard } from "./tipo-vaga";
export {
  etapaProcessoToCronogramaRow,
  etapasToCronograma,
} from "./etapa";
export { documentoToDocUiRow } from "./documento";
