/**
 * Template de email de bienvenida post-registro.
 */

export interface WelcomeEmailData {
  userName: string
  organizationName: string
  loginUrl: string
  verifyUrl?: string
}

export function buildWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const { userName, organizationName, loginUrl, verifyUrl } = data

  const subject = `¡Bienvenido a MITIENDA, ${userName}!`

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
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">MITIENDA</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;font-weight:600;">
                ¡Hola, ${userName}! 🎉
              </h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                Tu empresa <strong>${organizationName}</strong> ya está lista en MITIENDA.
              </p>
              ${verifyUrl ? `
              <div style="margin:24px 0;padding:16px;background-color:#f0fdf4;border:1px solid #dcfce7;border-radius:8px;">
                <p style="margin:0 0 12px;color:#1b7f3a;font-size:14px;font-weight:600;">
                  ⚠️ Verifica tu email antes de continuar
                </p>
                <p style="margin:0 0 12px;color:#4a7c59;font-size:13px;line-height:1.5;">
                  Por seguridad, necesitamos confirmar que este email es tuyo. Haz clic en el botón de abajo:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${verifyUrl}" style="display:inline-block;background-color:#16a34a;color:#ffffff;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">
                        Verificar email
                      </a>
                    </td>
                  </tr>
                </table>
              </div>
              ` : ''}
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                Próximos pasos:
              </p>
              <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
                <li>Verificá tu email</li>
                <li>Completá la configuración inicial de tu negocio</li>
                <li>Cargá tus productos o servicios</li>
                <li>Empezá a vender desde el punto de venta</li>
              </ul>
              <!-- Main CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display:inline-block;background-color:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
                      Ir a mi negocio
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.5;">
                Si tenés dudas, respondé a este email y te ayudamos.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                MITIENDA — Sistema de gestión para tu negocio
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  const text = `¡Hola, ${userName}!

Tu empresa ${organizationName} ya está lista en MITIENDA.

${verifyUrl ? `IMPORTANTE: Verifica tu email
Por seguridad, necesitamos confirmar que este email es tuyo.
Haz clic aquí: ${verifyUrl}\n` : ''}
Próximos pasos:
- Verifica tu email
- Completá la configuración inicial
- Cargá tus productos o servicios
- Empezá a vender

Ir a mi negocio: ${loginUrl}

— MITIENDA`

  return { subject, html, text }
}
