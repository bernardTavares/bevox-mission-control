/**
 * Generic optimistic update helper.
 *
 * Pattern:
 *   1. apply() muta o state local imediatamente (UI reflete)
 *   2. asyncOp() executa a chamada HTTP
 *   3. sucesso  -> retorna o resultado (caller pode chamar onSuccess)
 *   4. erro     -> revert() restaura state + onError recebe msg
 *
 * Não depende de React — funciona com qualquer setter externo.
 * Usado pelos handlers do kanban page (move/archive/create/edit/unarchive).
 *
 * Invariante: se asyncOp lança, revert() SEMPRE é chamado antes de
 * onError. Se asyncOp resolve, revert() nunca é chamado.
 */
export async function optimisticUpdate<T>(
  apply: () => void,
  revert: () => void,
  asyncOp: () => Promise<T>,
  onError?: (msg: string) => void,
): Promise<T | null> {
  apply();
  try {
    return await asyncOp();
  } catch (e) {
    revert();
    const msg = e instanceof Error ? e.message : String(e);
    onError?.(msg);
    return null;
  }
}
