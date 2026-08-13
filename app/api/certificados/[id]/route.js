import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerSesion } from "@/lib/session";

export async function GET(_request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  const certificado = await prisma.certificadoRetencion.findFirst({
    where: { id, usuarioId: sesion.id },
  });
  if (!certificado) return NextResponse.json({ error: "Certificado no encontrado." }, { status: 404 });

  return NextResponse.json({ certificado });
}

// PATCH { accion: 'anular' }
//
// Un certificado entregado no se borra: queda anulado y su número sigue ocupado. Si los datos
// cambiaron (una compra corregida, una retención mal liquidada), se anula el anterior y se
// expide uno nuevo — que es como se corrige en la práctica.
export async function PATCH(request, { params }) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  if (body.accion !== "anular") {
    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  }

  const motivo = (body.motivo || "").trim();
  if (!motivo) {
    return NextResponse.json(
      { error: "Indica el motivo de la anulación: queda en el certificado que lo reemplaza." },
      { status: 400 }
    );
  }

  const existente = await prisma.certificadoRetencion.findFirst({
    where: { id, usuarioId: sesion.id },
  });
  if (!existente) return NextResponse.json({ error: "Certificado no encontrado." }, { status: 404 });
  if (existente.anulado) return NextResponse.json({ error: "El certificado ya está anulado." }, { status: 409 });

  // Con rastro: sin quién, cuándo y por qué, "no se borra, se anula" es solo una palabra.
  const certificado = await prisma.certificadoRetencion.update({
    where: { id },
    data: {
      anulado: true,
      anuladoPor: sesion.nombreCompleto || sesion.email,
      anuladoEn: new Date(),
      motivoAnulacion: motivo,
    },
  });

  return NextResponse.json({ certificado });
}
