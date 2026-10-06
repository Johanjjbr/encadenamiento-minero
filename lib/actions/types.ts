/** Estado que devuelven las Server Actions usadas con useActionState. */
export interface FormState {
  ok?: boolean;
  error?: string;
  /** Valor a conservar en el formulario cuando la acción falla (React 19 resetea los campos). */
  email?: string;
}
