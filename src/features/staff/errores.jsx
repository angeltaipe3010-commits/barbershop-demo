// ----------------------------------------------------------------------------
//  Traducción de errores de infraestructura al idioma del usuario.
//
//  Quien usa esta pantalla es el dueño de la barbería, no quien la instaló.
//  Decirle "despliega la Edge Function admin-barberos" es pedirle algo que no
//  entiende y que además no puede hacer. Así que el mensaje visible explica
//  QUÉ pasa y QUÉ puede hacer él; el detalle técnico queda plegado para quien
//  monta el sistema.
// ----------------------------------------------------------------------------

const ES_MODULO_AUSENTE =
  /Failed to (fetch|send)|Edge Function|FunctionsFetchError|FunctionsRelayError|not found|404/i

const ES_NO_AUTORIZADO = /No autorizado|401|403/i

export function interpretarErrorStaff(mensajeCrudo, accion = 'crear') {
  const msg = String(mensajeCrudo || '')

  // El registro público está cerrado (lo correcto) y la Edge Function no
  // respondió, así que el plan B —signUp— también fue rechazado. Solo puede
  // pasar si la función se cayó: el problema es esa, no el registro.
  if (/Signups? not allowed/i.test(msg)) {
    return {
      titulo: 'No se pudo crear la cuenta',
      mensaje:
        'El servicio que da de alta a los barberos no respondió y, por seguridad, esta instalación no permite el registro por otras vías.',
      queHacer: 'Inténtalo de nuevo en un momento. Si sigue igual, avisa a quien te instaló el sistema.',
      detalleTecnico: [
        'La Edge Function "admin-barberos" no respondió y el registro público',
        'está deshabilitado (Authentication → Providers → Allow new users to',
        'sign up = OFF), que es la configuración segura recomendada.',
        '',
        'Revisa el estado y los logs de la función en Supabase → Edge Functions.',
      ].join('\n'),
    }
  }

  // El proyecto exige confirmar la cuenta por correo. Aquí los correos son
  // internos y ficticios (barbero@demo.com), así que ese correo no llega a
  // ninguna parte y la cuenta quedaría inutilizable.
  if (msg === 'CONFIRMACION_CORREO_ACTIVA') {
    return {
      titulo: 'La cuenta se creó, pero no puede entrar todavía',
      mensaje:
        'El sistema exige confirmar cada cuenta nueva por correo electrónico. Como aquí se entra con un nombre de usuario y no con un correo real, ese mensaje de confirmación no llega a ninguna parte y la cuenta queda bloqueada.',
      queHacer:
        'Es un interruptor que se desactiva una sola vez. Pídeselo a quien te instaló el sistema; después, esta misma cuenta funcionará sin tener que volver a crearla.',
      detalleTecnico: [
        '1) Supabase → Authentication → Sign In / Providers → Email',
        '   Desactivar "Confirm email" y guardar.',
        '',
        '2) Activar las cuentas que quedaron pendientes:',
        '',
        '   update auth.users',
        '      set email_confirmed_at = now()',
        '    where email_confirmed_at is null;',
        '',
        'Desactivarlo es seguro aquí: las cuentas las crea un administrador desde',
        'la app y los correos son internos (usuario@' +
          (import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'dominio') +
          ').',
        '',
        'Alternativa más estricta: desplegar la Edge Function "admin-barberos",',
        'que crea las cuentas ya confirmadas y permite mantener el ajuste activo.',
      ].join('\n'),
    }
  }

  if (ES_MODULO_AUSENTE.test(msg)) {
    const verbo = { crear: 'crear', eliminar: 'eliminar', clave: 'cambiar contraseñas de' }[accion]
    return {
      titulo: `No se puede ${verbo} usuarios todavía`,
      mensaje:
        'Esta instalación aún no tiene activada la gestión de cuentas. Es un paso de la puesta en marcha, no un problema de tus datos.',
      queHacer:
        'Pídeselo a quien te instaló el sistema. Mientras tanto puedes editar el nombre, la comisión, el horario y el estado de los barberos que ya existen.',
      detalleTecnico: [
        'Falta desplegar la Edge Function "admin-barberos".',
        '',
        'npx supabase@latest login',
        'npx supabase@latest link --project-ref TU_PROJECT_REF',
        'npx supabase@latest functions deploy admin-barberos',
      ].join('\n'),
    }
  }

  if (ES_NO_AUTORIZADO.test(msg)) {
    return {
      titulo: 'No tienes permiso para esta acción',
      mensaje: 'Solo un administrador puede gestionar las cuentas del personal.',
      queHacer: 'Si crees que deberías poder, pide que revisen tu rol en el sistema.',
      detalleTecnico: msg,
    }
  }

  // Errores de negocio (correo repetido, contraseña corta…): el mensaje del
  // servidor ya es comprensible, se muestra tal cual.
  return { titulo: null, mensaje: msg, queHacer: null, detalleTecnico: null }
}

// ----------------------------------------------------------------------------
//  Aviso en pantalla. El detalle técnico va dentro de un <details> cerrado:
//  invisible para el usuario normal, a un clic para quien instala.
// ----------------------------------------------------------------------------
export function AvisoError({ info }) {
  if (!info) return null

  return (
    <div
      role="alert"
      className="animate-aparecer-bajar rounded-xl2 border border-aviso/40 bg-aviso/10 p-4"
    >
      <div className="flex gap-3">
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-5 w-5 shrink-0 text-aviso"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5m0 3h.01" strokeLinecap="round" />
        </svg>

        <div className="min-w-0 flex-1">
          {info.titulo && <p className="font-semibold text-aviso">{info.titulo}</p>}
          <p className={`text-sm text-ink-200 ${info.titulo ? 'mt-1' : ''}`}>{info.mensaje}</p>
          {info.queHacer && <p className="mt-2 text-sm text-ink-400">{info.queHacer}</p>}

          {info.detalleTecnico && (
            <details className="group mt-3">
              <summary
                className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs
                           font-medium text-ink-500 transition-colors duration-rapida
                           hover:text-ink-300"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3 transition-transform duration-rapida group-open:rotate-90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Información para quien instaló el sistema
              </summary>
              <pre
                className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border
                           border-ink-800 bg-ink-950 p-3 text-[11px] leading-relaxed text-ink-400"
              >
                {info.detalleTecnico}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
