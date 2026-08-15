import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarEmpleado } from "@/lib/empleadoValidation";

async function empleadoDelUsuario(id, usuarioId) {
  const e = await prisma.empleado.findUnique({ where: { id } });
  if (!e || e.usuarioId !== usuarioId) return null;
  return e;
}

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await params;
  const empleado = await empleadoDelUsuario(id, sesion.id);
  if (!empleado) return NextResponse.json({ error: "Empleado no encontrado." }, { status: 404 });
  return NextResponse.json({ empleado });
}

export async function PUT(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await empleadoDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Empleado no encontrado." }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const { data, errors, avisos } = normalizarEmpleado(body);
  if (errors.length) return NextResponse.json({ error: errors[0], errores: errors }, { status: 400 });

  const empleado = await prisma.empleado.update({ where: { id }, data });
  // Los avisos también en la edición: si solo salen al crear, el criterio de "avisar en vez de
  // bloquear" se pierde justo cuando alguien corrige un salario a la baja.
  return NextResponse.json({ empleado, avisos });
}

export async function DELETE(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const existente = await empleadoDelUsuario(id, sesion.id);
  if (!existente) return NextResponse.json({ error: "Empleado no encontrado." }, { status: 404 });

  // Un empleado con nóminas NO se borra. Esas nóminas generaron asientos y pasivos de seguridad
  // social que hay que conservar (art. 28 Ley 962/2005, art. 60 C.Co.; la UGPP fiscaliza cinco
  // años atrás). Y como en Postgres los NULL no chocan entre sí, dejar `empleadoId` en null
  // desactivaría de paso la unicidad que impide liquidar dos veces el mismo periodo.
  const liquidadas = await prisma.nomina.count({ where: { empleadoId: id } });
  if (liquidadas > 0) {
    return NextResponse.json(
      {
        error: `${existente.nombres} ${existente.apellidos} tiene ${liquidadas} nómina(s) liquidada(s) y no se puede eliminar: son soporte de asientos y de aportes ya causados. Márcalo como inactivo.`,
      },
      { status: 409 }
    );
  }

  await prisma.empleado.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
