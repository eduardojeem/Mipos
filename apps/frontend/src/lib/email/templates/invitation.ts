/**
 * Template de email para invitaciones de equipo.
 * Inline HTML puro — no necesita React en runtime.
 */

export interface InvitationEmailData {
  inviteeName: string // Email o nombre de la persona invitada
  organizationName: string
  inviterName: string
  roleName: string
  inviteUrl: string
  expiresInDays?: number
}

export function buildInvitationEmail(data: InvitationEmailData): { subject: string; html: string; text: string } {
  const { inviteeName, organizationName, inviterName, roleName, inviteUrl, expiresInDays = 7 } = data

  const subject = `Te invitaron a ${organizationName} en MiPOS`

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#059669;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">MiPOS</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;font-weight:600;">
                ¡Hola${inviteeName ? `, ${inviteeName}` : ''}!
              </h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                <strong>${inviterName}</strong> te invitó a unirte a <strong>${organizationName}</strong> como <strong>${roleName}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Hacé click en el botón para aceptar la invitación y configurar tu acceso:
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display:inline-block;background-color:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
                      Aceptar invitación
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.5;">
                Este link vence en ${expiresInDays} días. Si no esperabas esta invitación, podés ignorar este mensaje.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                MiPOS — Sistema de gestión para tu negocio
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  const text = `¡Hola${inviteeName ? `, ${inviteeName}` : ''}!

${inviterName} te invitó a unirte a ${organizationName} como ${roleName}.

Aceptá la invitación acá: ${inviteUrl}

Este link vence en ${expiresInDays} días.

— MiPOS`

  return { subject, html, text }
}
