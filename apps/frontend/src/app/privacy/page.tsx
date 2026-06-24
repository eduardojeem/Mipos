import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { PLATFORM_NAME, LEGAL_CONTACT_EMAIL } from '@/lib/legal/terms';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: `Cómo ${PLATFORM_NAME} recopila, usa y protege tus datos personales.`,
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidad">
      <p>
        Esta Política describe cómo {PLATFORM_NAME} recopila, usa y protege la
        información de quienes utilizan la plataforma. Al usarla, aceptás las
        prácticas aquí descritas.
      </p>

      <LegalSection heading="1. Datos que recopilamos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Datos de cuenta:</strong> nombre, correo, teléfono y datos del
            negocio al registrarte.
          </li>
          <li>
            <strong>Datos de uso:</strong> páginas visitadas, acciones en la
            plataforma y datos técnicos (dispositivo, navegador, IP).
          </li>
          <li>
            <strong>Datos de transacciones:</strong> información de pedidos y ventas
            gestionados a través de la plataforma.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. Cómo usamos los datos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Proveer y operar la plataforma.</li>
          <li>Procesar registros, pedidos y soporte.</li>
          <li>Mejorar el servicio y prevenir fraudes o abusos.</li>
          <li>Cumplir obligaciones legales.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Con quién compartimos datos">
        <p>
          Cuando interactuás con una Tienda (por ejemplo, al realizar un pedido),
          compartimos con esa Tienda los datos necesarios para gestionar la
          operación. Cada Tienda es responsable del tratamiento de los datos que
          recibe. También podemos usar proveedores tecnológicos (hosting, base de
          datos) que procesan datos por nuestra cuenta bajo confidencialidad.
        </p>
      </LegalSection>

      <LegalSection heading="4. Cookies y tecnologías similares">
        <p>
          Usamos cookies y almacenamiento local para mantener tu sesión, recordar
          preferencias y entender el uso de la plataforma. Podés gestionarlas desde
          la configuración de tu navegador.
        </p>
      </LegalSection>

      <LegalSection heading="5. Seguridad">
        <p>
          Aplicamos medidas razonables para proteger los datos. Ningún sistema es
          completamente seguro, por lo que no podemos garantizar seguridad absoluta.
        </p>
      </LegalSection>

      <LegalSection heading="6. Tus derechos">
        <p>
          Podés solicitar acceder, corregir o eliminar tus datos personales, así como
          retirar consentimientos, escribiéndonos al correo de contacto. Atenderemos
          tu solicitud conforme a la legislación aplicable.
        </p>
      </LegalSection>

      <LegalSection heading="7. Retención">
        <p>
          Conservamos los datos mientras tu cuenta esté activa y durante el tiempo
          necesario para cumplir obligaciones legales o resolver disputas.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contacto">
        <p>
          Para ejercer tus derechos o consultas sobre privacidad, escribinos a{' '}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
