import type { Metadata } from 'next';
import { LegalLayout, LegalSection } from '@/components/legal/LegalLayout';
import { PLATFORM_NAME, LEGAL_CONTACT_EMAIL } from '@/lib/legal/terms';

export const metadata: Metadata = {
  title: 'Términos de Servicio',
  description: `Términos y condiciones de uso de la plataforma ${PLATFORM_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalLayout title="Términos de Servicio">
      <p>
        Bienvenido a {PLATFORM_NAME}. Estos Términos de Servicio (los “Términos”)
        regulan el acceso y uso de la plataforma. Al crear una cuenta, navegar el
        catálogo o utilizar cualquier funcionalidad, aceptás estos Términos. Si no
        estás de acuerdo, no utilices la plataforma.
      </p>

      <LegalSection heading="1. Qué es la plataforma">
        <p>
          {PLATFORM_NAME} es una <strong>plataforma tecnológica</strong> que permite
          a comercios y tiendas independientes (las “Tiendas”) publicar sus
          productos y servicios, gestionar sus ventas y mostrar un catálogo público.
          {PLATFORM_NAME} provee el software; <strong>no es el vendedor</strong> de
          los productos o servicios ofrecidos por las Tiendas.
        </p>
      </LegalSection>

      <LegalSection heading="2. Rol de la plataforma y deslinde de responsabilidad">
        <p>
          {PLATFORM_NAME} actúa únicamente como <strong>intermediario tecnológico</strong>.
          En consecuencia, son <strong>responsabilidad exclusiva de cada Tienda</strong>,
          y no de {PLATFORM_NAME}:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>La existencia, calidad, seguridad y legalidad de los productos o servicios.</li>
          <li>La veracidad y exactitud de descripciones, precios, fotos y disponibilidad de stock.</li>
          <li>El cumplimiento de los pedidos, la facturación, los envíos y las entregas.</li>
          <li>Las garantías, cambios, devoluciones y atención postventa.</li>
          <li>El cumplimiento de las obligaciones tributarias y regulatorias de la Tienda.</li>
        </ul>
        <p>
          {PLATFORM_NAME} <strong>no garantiza</strong> la disponibilidad, exactitud
          ni actualización de la información publicada por las Tiendas, ni la
          concreción de ninguna transacción.
        </p>
      </LegalSection>

      <LegalSection heading="3. Relación entre comprador y Tienda">
        <p>
          Cualquier compra, reserva o contratación se celebra{' '}
          <strong>directamente entre el comprador y la Tienda</strong>. {PLATFORM_NAME}
          no es parte de esa relación. Los reclamos por productos o servicios deben
          dirigirse a la Tienda correspondiente.
        </p>
      </LegalSection>

      <LegalSection heading="4. Cuentas y registro">
        <p>
          Para usar ciertas funciones necesitás crear una cuenta. Sos responsable de
          la veracidad de los datos que proporcionás y de mantener la
          confidencialidad de tus credenciales. La actividad realizada desde tu
          cuenta es tu responsabilidad.
        </p>
      </LegalSection>

      <LegalSection heading="5. Uso aceptable">
        <p>Al usar la plataforma te comprometés a no:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Publicar contenido falso, ilegal, infractor o engañoso.</li>
          <li>Vulnerar la seguridad de la plataforma o acceder a datos de terceros.</li>
          <li>Usar la plataforma para fines fraudulentos o no autorizados.</li>
          <li>Realizar scraping masivo o sobrecargar el servicio de forma abusiva.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Disponibilidad del servicio">
        <p>
          {PLATFORM_NAME} se ofrece “tal cual” y “según disponibilidad”. No
          garantizamos que el servicio sea ininterrumpido o libre de errores.
          Podemos modificar, suspender o discontinuar funcionalidades en cualquier
          momento.
        </p>
      </LegalSection>

      <LegalSection heading="7. Limitación de responsabilidad">
        <p>
          En la máxima medida permitida por la ley aplicable, {PLATFORM_NAME} no será
          responsable por daños indirectos, incidentales o consecuentes derivados del
          uso o imposibilidad de uso de la plataforma, ni por las operaciones
          realizadas entre compradores y Tiendas.
        </p>
      </LegalSection>

      <LegalSection heading="8. Propiedad intelectual">
        <p>
          El software, la marca y los elementos de la plataforma pertenecen a
          {' '}{PLATFORM_NAME}. El contenido publicado por cada Tienda pertenece a
          dicha Tienda, que es responsable de contar con los derechos necesarios.
        </p>
      </LegalSection>

      <LegalSection heading="9. Modificaciones">
        <p>
          Podemos actualizar estos Términos. Cuando los cambios sean sustanciales, lo
          informaremos por medios razonables. El uso continuado de la plataforma tras
          la actualización implica la aceptación de los nuevos Términos.
        </p>
      </LegalSection>

      <LegalSection heading="10. Ley aplicable y contacto">
        <p>
          Estos Términos se rigen por las leyes de la República del Paraguay.
          Para consultas legales, escribinos a{' '}
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
