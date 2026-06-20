import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY no está configurada");
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const from = process.env.FROM_EMAIL ?? "Simulador EDD <noreply@resend.dev>";
  const { error } = await getResend().emails.send({ from, to, subject, html });
  if (error) throw new Error(`Error al enviar email: ${error.message}`);
}
