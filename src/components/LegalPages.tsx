import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldWarning, FileText } from '@phosphor-icons/react';
import Footer from './Footer';

// Páginas legales públicas (accesibles sin sesión). El contenido está
// redactado conforme a la Ley N° 21.719 sobre Protección y Tratamiento de
// Datos Personales de Chile y adaptado a los datos que la plataforma
// efectivamente trata. Los marcadores [POR COMPLETAR] son datos de la
// razón social que deben completarse antes de publicar, y el documento
// completo debe pasar por revisión jurídica profesional.

function Pendiente({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-amber-100 border border-amber-400 text-amber-950 text-xs font-mono font-bold px-1.5 py-0.5 align-middle">
      {children}
    </span>
  );
}

function LegalLayout({ titulo, icono, actualizado, children }: {
  titulo: string;
  icono: React.ReactNode;
  actualizado: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-slate-100 text-slate-900">
      <header className="bg-slate-950 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/login" className="flex items-center gap-2 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors min-h-11">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <span className="flex items-center gap-2 text-slate-400 text-[11px] font-mono uppercase tracking-wider">
          {icono}
          {titulo}
        </span>
      </header>
      <article className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight mb-1">{titulo}</h1>
        <p className="text-xs text-slate-500 font-mono mb-8">Última actualización: {actualizado}</p>
        <div className="space-y-7 [&_h2]:text-lg [&_h2]:font-black [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-slate-900 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-slate-700 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ul]:text-sm [&_ul]:leading-6 [&_ul]:text-slate-700 [&_li]:marker:text-slate-400 [&_strong]:text-slate-900">
          {children}
        </div>
        <p className="mt-10 pt-5 border-t border-slate-300 text-xs text-slate-500 leading-6">
          Este documento es una base redactada conforme a la Ley N° 21.719 y debe
          ser revisado y validado por un abogado antes de su publicación
          definitiva. <Pendiente>[POR COMPLETAR]</Pendiente> marca los datos de
          la razón social que deben llenarse.
        </p>
      </article>
      <Footer />
    </main>
  );
}

const AVISO_REVISION = (
  <p>
    <strong>Nota:</strong> este documento es una base redactada conforme a la
    Ley N° 21.719 y debe ser revisado por un abogado antes de su publicación
    definitiva. Los campos <Pendiente>[POR COMPLETAR]</Pendiente> corresponden a
    datos de la razón social que deben completarse.
  </p>
);

export function PrivacyPolicyPage() {
  return (
    <LegalLayout
      titulo="Política de Privacidad y Protección de Datos Personales"
      icono={<ShieldWarning className="w-4 h-4" />}
      actualizado="21 de noviembre de 2026"
    >
      <p>
        Esta Política describe cómo <strong>Alerta Dealers</strong> — red privada
        de seguridad colaborativa para automotoras de la Región de Coquimbo,
        operada por Sistemas Pantera <Pendiente>[POR COMPLETAR: razón social,
        RUT y domicilio]</Pendiente> — trata los datos personales de sus
        operadores y de terceros cuyos datos ingresan a la plataforma, conforme
        a la <strong>Ley N° 21.719 sobre Protección y Tratamiento de Datos
        Personales</strong> y su reglamento, que reemplaza a la Ley N° 19.628.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable es <strong>Sistemas Pantera</strong>{' '}
        <Pendiente>[POR COMPLETAR: razón social, RUT, domicilio y correo
        electrónico de contacto]</Pendiente>, que decide sobre las finalidades y
        el tratamiento de los datos en la plataforma. Cada automotora adherida
        es además responsable del tratamiento de los datos que ella misma
        recaba y carga (reportes de su patio y registros de sus pruebas de
        ruta).
      </p>

      <h2>2. Datos personales que tratamos</h2>
      <ul>
        <li><strong>Cuenta de operador:</strong> nombre, correo electrónico, teléfono, RUT comercial de la automotora y rol asignado (ADMIN, OWNER, SECURITY).</li>
        <li><strong>Reportes de incidentes:</strong> descripción del hecho, patente del vehículo implicado, fotografías (que pueden contener la imagen de personas), ubicación GPS del patio o evento, fecha y hora.</li>
        <li><strong>Pruebas de ruta (test drive):</strong> registro fotográfico del vehículo, documento de licencia de conducir y datos del cliente proporcionados por la automotora.</li>
        <li><strong>Notificaciones:</strong> token del dispositivo para alertas push y estado de conexión del nodo.</li>
        <li><strong>Datos técnicos:</strong> conexiones al servicio, latencia de nodos y registros de auditoría de la plataforma.</li>
      </ul>

      <h2>3. Finalidades del tratamiento</h2>
      <ul>
        <li>Operar la red de seguridad colaborativa: difusión de alertas e incidentes entre las automotoras de la red.</li>
        <li>Disuasión del delito y trazabilidad de eventos para fiscalización y aseguradoras.</li>
        <li>Administrar cuentas, roles y accesos; enviar notificaciones operativas.</li>
        <li>Mejorar la plataforma y atender solicitudes de soporte.</li>
      </ul>

      <h2>4. Base de licitud</h2>
      <p>
        El tratamiento se apoya en: (i) la <strong>ejecución del contrato</strong>
        {' '}que une a la automotora con la red; (ii) el{' '}
        <strong>consentimiento</strong> del operador al aceptar estos términos y
        la política; y (iii) el <strong>interés legítimo</strong> del
        responsable en la seguridad de las personas y los bienes protegidos por
        la red.
      </p>

      <h2>5. Datos de terceros no usuarios</h2>
      <p>
        Los reportes pueden incluir imágenes e información de personas que no
        son usuarios de la plataforma (por ejemplo, presuntos implicados en un
        hecho sospechoso) y las pruebas de ruta pueden incluir documentos de
        clientes (licencia de conducir). La <strong>automotora que recaba e
        ingresa estos datos es responsable</strong> de contar con base válida
        para hacerlo e informar a las personas afectadas cuando corresponda. La
        plataforma los trata exclusivamente para las finalidades de seguridad
        descritas: <strong>no se utilizan para marketing, publicidad ni
        elaboración de perfiles comerciales</strong>.
      </p>

      <h2>6. Destinatarios y transferencias</h2>
      <ul>
        <li><strong>Otras automotoras de la red:</strong> la naturaleza del servicio implica que los reportes se comparten entre nodos verificados de la red. Los datos sensibles (pruebas de ruta) están restringidos a la automotora que los generó y al centro de administración.</li>
        <li><strong>Autoridades:</strong> Carabineros, PDI u otras autoridades pueden recibir información cuando el operador responsable la comparta en el marco de una denuncia.</li>
        <li><strong>Proveedores de infraestructura:</strong> el servicio se apoya en Google Firebase (autenticación, base de datos, almacenamiento y notificaciones), Vercel (hosting y despliegue) y servicios de imágenes. Estos proveedores operan infraestructura fuera de Chile; la transferencia internacional se realiza conforme a las garantías que establece la Ley N° 21.719 y los términos de cada proveedor.</li>
      </ul>

      <h2>7. Plazos de conservación</h2>
      <p>
        Los datos de la cuenta se conservan mientras esta esté activa. Los
        reportes de incidentes se conservan con fines de trazabilidad y
        fiscalización mientras la automotora mantenga su membresía; al
        cancelarla, la automotora puede solicitar la exportación de sus
        reportes y la eliminación de su cuenta. Ciertos registros de
        auditoría pueden conservarse durante los plazos que exija la ley.
      </p>

      <h2>8. Medidas de seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas proporcionadas al riesgo:
        acceso restringido por roles y verificado por el centro de
        administración, reglas de base de datos que limitan lectura y
        escritura por perfil, cifrado en tránsito (HTTPS/TLS), registro de
        eventos para trazabilidad y revisión periódica de accesos. Ningún
        sistema es infalible: ante un incidente de seguridad que afecte sus
        derechos, lo comunicaremos conforme a la ley.
      </p>

      <h2>9. Sus derechos</h2>
      <p>
        Conforme a la Ley N° 21.719 puede ejercer los derechos de{' '}
        <strong>acceso, rectificación, cancelación, oposición, portabilidad y
        bloqueo</strong> de sus datos personales, escribiendo a{' '}
        <Pendiente>[POR COMPLETAR: correo electrónico de contacto]</Pendiente>.
        La respuesta se entregará dentro del plazo legal. También puede
        solicitar información sobre el alcance y las características del
        tratamiento.
      </p>
      <p>
        Si estima que el tratamiento vulnera sus derechos, puede presentar un
        reclamo ante la <strong>Agencia de Protección de Datos Personal</strong>,
        autoridad fiscalizadora creada por la ley.
      </p>

      <h2>10. Menores de edad</h2>
      <p>
        El servicio está dirigido exclusivamente a automotoras y su personal.
        No tratamos deliberadamente datos de menores de edad; si detectamos un
        dato de esta naturaleza que carece de base válida, procederemos a su
        bloqueo o eliminación.
      </p>

      <h2>11. Actualizaciones</h2>
      <p>
        Esta política puede actualizarse para reflejar cambios en la
        plataforma o en la normativa. Publicaremos la versión vigente en esta
        página con su fecha de actualización; los cambios que afecten
        sustancialmente el tratamiento serán comunicados a los operadores por
        los canales de la red.
      </p>

      {AVISO_REVISION}
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout
      titulo="Términos y Condiciones de Uso"
      icono={<FileText className="w-4 h-4" />}
      actualizado="21 de noviembre de 2026"
    >
      <p>
        Estos Términos regulan el uso de <strong>Alerta Dealers</strong>, red
        privada de seguridad colaborativa para automotoras de la Región de
        Coquimbo, operada por Sistemas Pantera{' '}
        <Pendiente>[POR COMPLETAR: razón social y RUT]</Pendiente>. Al crear una
        cuenta o usar la plataforma, la automotora y sus operadores aceptan
        estos Términos y la <Link to="/privacidad" className="text-sky-700 underline underline-offset-4">Política de Privacidad</Link>.
      </p>

      <h2>1. Naturaleza del servicio</h2>
      <p>
        Alerta Dealers es una <strong>plataforma privada de seguridad
        colaborativa</strong>: permite a automotoras verificadas compartir
        reportes de incidentes, verificar patentes, registrar pruebas de ruta
        y coordinarse entre pares de la red.
      </p>
      <p>
        <strong>Alerta Dealers no es un servicio de emergencia y no reemplaza
        a las autoridades.</strong> Ante cualquier delito o emergencia, llame
        siempre primero a Carabineros (133), PDI (134) o Bomberos (132). La
        plataforma es un complemento de los protocolos de seguridad propios de
        cada automotora.
      </p>

      <h2>2. Cuenta y validación</h2>
      <ul>
        <li>El ingreso está reservado a automotoras validadas: el representante legal acredita el RUT comercial y el centro de administración aprueba la incorporación manualmente.</li>
        <li>Cada operador recibe credenciales individuales con un rol (propietario, administración o seguridad). Las credenciales son personales e intransferibles.</li>
        <li>La automotora es responsable de la administración de las cuentas de su personal, incluida su baja cuando el personal se desvincule.</li>
      </ul>

      <h2>3. Responsabilidades del operador</h2>
      <ul>
        <li>Garantizar la <strong>veracidad</strong> de los reportes que transmite a la red.</li>
        <li>Contar con base válida para los datos de terceros que ingresa (por ejemplo, informar a los clientes de test drive sobre el registro fotográfico) y tratarlos conforme a la Ley N° 21.719.</li>
        <li>No ingresar datos personales sin derecho a hacerlo ni datos ajenos a las finalidades de seguridad de la red.</li>
        <li>Guardarse confidencialidad sobre la información de la red a la que accede por su rol.</li>
      </ul>

      <h2>4. Uso aceptable</h2>
      <p>
        Está prohibido: transmitir reportes falsos o temerarios; usar la
        plataforma para fines ajenos a la seguridad de las automotoras;
        intentar eludir los roles y permisos; hostigar o difamar a personas;
        compartir credenciales; y cualquier uso que vulnere la ley chilena.
        El incumplimiento puede derivar en la suspensión de la cuenta.
      </p>

      <h2>5. Propiedad intelectual y datos</h2>
      <p>
        La marca, el software y la estructura de la plataforma pertenecen al
        operador. Cada automotora es titular de los reportes que genera; al
        transmitirlos, autoriza su difusión a la red para las finalidades de
        seguridad descritas en la Política de Privacidad.
      </p>

      <h2>6. Disponibilidad y limitaciones</h2>
      <p>
        Buscamos alta disponibilidad, pero no garantizamos continuidad
        absoluta: la plataforma depende de servicios de infraestructura
        (conectividad, Firestore, hosting) y de la conexión de cada nodo.
        La funcionalidad de verificación de patentes opera con un proveedor
        externo y puede degradarse con un estado explícito de no verificado.
      </p>

      <h2>7. Suspensión y término</h2>
      <p>
        El centro de administración puede suspender cuentas por incumplimiento
        de estos Términos o por decisión de la propia automotora. La
        automotora puede cancelar su membresía en cualquier momento; los
        efectos sobre sus datos se rigen por la Política de Privacidad.
      </p>

      <h2>8. Ley aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por las leyes de Chile. Cualquier controversia
        se someterá a los tribunales de{' '}
        <Pendiente>[POR COMPLETAR: ciudad, p. ej. La Serena]</Pendiente>.
      </p>

      <h2>9. Modificaciones</h2>
      <p>
        Podemos actualizar estos Términos publicando la versión vigente en
        esta página. Los cambios que afecten sustancialmente el servicio serán
        comunicados por los canales de la red con antelación razonable.
      </p>

      {AVISO_REVISION}
    </LegalLayout>
  );
}
