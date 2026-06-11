import "server-only";
import { Resend } from "resend";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Envía un email transaccional vía Resend.
 *
 * Requiere RESEND_API_KEY y EMAIL_FROM en el entorno. Si falta alguna,
 * loguea y devuelve false sin lanzar — el envío de emails nunca debe
 * bloquear la operación que lo dispara (crear pedido, cambiar estado).
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const resend = getResendClient();
  const from = process.env.EMAIL_FROM;

  if (!resend || !from) {
    console.warn(
      "[email] RESEND_API_KEY o EMAIL_FROM no configurados; email omitido",
      { to: params.to, subject: params.subject },
    );
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });

    if (error) {
      console.error("[email] Resend rechazo el envio:", error);
      return false;
    }

    console.log("[email] enviado", { id: data?.id, to: params.to });
    return true;
  } catch (error) {
    console.error("[email] error enviando email:", error);
    return false;
  }
}
