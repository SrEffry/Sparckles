import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";
import { normalizarNota } from "@/lib/notaValidation";

// GET /api/notas → historial de notas del usuario
export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const notas = await prisma.nota.findMany({
    where: { usuarioId: sesion.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notas });
}

// POST /api/notas → crea una nota débito/crédito (consecutivo + afecta saldo de la factura)
export async function POST(request) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const n = normalizarNota(body);
  if (n.errors.length) {
    return NextResponse.json({ error: n.errors[0], errores: n.errors }, { status: 400 });
  }

  // Factura relacionada (opcional): snapshot de referencia + cliente
  let facturaId = null;
  let facturaRef = null;
  let clienteNombre = null;
  let clienteDocumento = null;
  if (body.facturaId) {
    const f = await prisma.factura.findUnique({ where: { id: body.facturaId } });
    if (f && f.usuarioId === sesion.id) {
      facturaId = f.id;
      facturaRef = f.numeroCompleto;
      clienteNombre = f.clienteNombre;
      clienteDocumento = `${f.clienteTipoDocumento || ""} ${f.clienteNumeroDocumento || ""}`.trim();
    }
  }

  try {
    const nota = await prisma.$transaction(async (tx) => {
      const count = await tx.nota.count({
        where: { usuarioId: sesion.id, tipo: n.tipo },
      });
      const prefijo = n.tipo === "credito" ? "NC" : "ND";
      const numero = `${prefijo}-${String(count + 1).padStart(4, "0")}`;

      const nota = await tx.nota.create({
        data: {
          usuarioId: sesion.id,
          numero,
          tipo: n.tipo,
          fecha: n.fecha,
          motivoCodigo: n.motivo.codigo,
          motivoLabel: n.motivo.label,
          facturaId,
          facturaRef,
          clienteNombre,
          clienteDocumento,
          subtotal: n.subtotal,
          totalDescuentos: n.totalDescuentos,
          totalIva: n.totalIva,
          totalNota: n.totalNota,
          observaciones: n.observaciones,
          items: { create: n.items },
        },
        include: { items: true },
      });

      if (facturaId) {
        await tx.factura.update({
          where: { id: facturaId },
          data:
            n.tipo === "credito"
              ? { saldoAplicadoNC: { increment: n.totalNota } }
              : { saldoAplicadoND: { increment: n.totalNota } },
        });
      }

      return nota;
    });

    return NextResponse.json({ nota }, { status: 201 });
  } catch (e) {
    if (e.code === "P2002")
      return NextResponse.json(
        { error: "Conflicto de numeración de la nota, intente de nuevo." },
        { status: 409 }
      );
    throw e;
  }
}
