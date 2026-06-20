export function resetPasswordEmail(fullName: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">

        <!-- Header -->
        <tr><td style="background:#2563eb;padding:32px 40px">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">Simulador EDD</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px">
          <p style="margin:0 0 16px;color:#374151;font-size:15px">Hola <strong>${fullName}</strong>,</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
            Haz clic en el botón de abajo para crear una nueva contraseña.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
            <tr><td style="background:#2563eb;border-radius:6px">
              <a href="${resetUrl}" target="_blank"
                 style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">
                Restablecer contraseña
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;color:#6b7280;font-size:13px">
            Este enlace expira en <strong>1 hora</strong>.
          </p>
          <p style="margin:0;color:#6b7280;font-size:13px">
            Si no solicitaste este cambio, ignora este correo — tu contraseña no cambiará.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            <span style="color:#2563eb">${resetUrl}</span>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
