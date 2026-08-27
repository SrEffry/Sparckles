// Registro de terceros: resolución al vuelo y consolidación de lo ya registrado.
//
// UN SOLO CAMINO PARA CREAR TERCEROS. Cada vez que se registra una compra o un documento
// soporte hay que enlazarlo con su tercero, y si no existe, crearlo. Eso pasa por
// `resolverTercero()` y por ningún otro sitio: dos rutas distintas normalizando el documento a
// su manera es exactamente cómo se acaba con el mismo NIT partido en dos filas, que es el
// defecto que este módulo viene a cerrar.
//
// LA CLAVE ES EL DOCUMENTO NORMALIZADO. `900123456`, `900.123.456` y `900123456-7` son el mismo
// tercero. El `@@unique([usuarioId, documento])` lo sostiene en la BD, pero la normalización
// tiene que ocurrir ANTES de consultar o el unique no sirve de nada.

import { normalizarDocumento } from "@/lib/retencionesPracticadas";
import { codigoDianDesdeTexto } from "@/lib/data/tiposDocumentoDian";

/**
 * Devuelve el `terceroId` para un documento, creándolo si hace falta.
 *
 * @param tx        cliente de Prisma (o la transacción en curso)
 * @param usuarioId
 * @param datos     { nombre, documento, tipoDocumento, telefono }
 * @returns {string|null} — `null` cuando no hay documento con el que identificarlo. NO se
 *          inventa un tercero por nombre: dos "Ferretería El Tornillo" escritos igual pueden
 *          ser dos empresas distintas, y un tercero mal fusionado es peor que uno sin enlazar.
 *          Los documentos sin tercero salen listados en el tablero de preparación.
 */
export async function resolverTercero(tx, usuarioId, datos) {
  const { numero, dv } = normalizarDocumento(datos?.documento);
  if (!numero) return null;

  const nombre = (datos.nombre || "").trim() || numero;
  const tipoDian = codigoDianDesdeTexto(datos.tipoDocumento);

  const existente = await tx.tercero.findUnique({
    where: { usuarioId_documento: { usuarioId, documento: numero } },
  });

  if (existente) {
    // Se COMPLETA lo que falte, pero no se pisa lo que ya está. Quien editó la ficha del
    // tercero sabe más que el snapshot que trae un documento nuevo: sobrescribir su dirección
    // con la que alguien tecleó de afán en una compra sería perder trabajo hecho.
    const parche = {};
    if (!existente.tipoDocumentoDian && tipoDian) parche.tipoDocumentoDian = tipoDian;
    if (!existente.dv && dv) parche.dv = dv;
    if (!existente.telefono && datos.telefono) parche.telefono = datos.telefono.trim();
    if (Object.keys(parche).length) {
      await tx.tercero.update({ where: { id: existente.id }, data: parche });
    }
    return existente.id;
  }

  // Un NIT colombiano tiene 9 dígitos; por debajo casi siempre es una cédula. Es una
  // suposición razonable para el valor inicial, y por eso queda editable en la ficha.
  const esNit = tipoDian === "31" || numero.length >= 9;

  const creado = await tx.tercero.create({
    data: {
      usuarioId,
      documento: numero,
      dv: dv || null,
      tipoDocumentoDian: tipoDian || (esNit ? "31" : null),
      tipo: esNit ? "juridica" : "natural",
      nombre,
      razonSocial: esNit ? nombre : null,
      telefono: datos.telefono?.trim() || null,
    },
  });
  return creado.id;
}

/**
 * Enlaza con su tercero las compras y los documentos soporte que todavía no lo tienen.
 *
 * Es idempotente y se puede repetir: solo mira los que tienen `terceroId: null`. Sirve como
 * backfill de todo lo registrado antes de que existiera el registro, y como red por si algún
 * documento quedó suelto.
 */
export async function consolidarTerceros(prisma, usuarioId) {
  const resumen = { comprasEnlazadas: 0, soportesEnlazados: 0, tercerosCreados: 0, sinDocumento: 0 };

  const antes = await prisma.tercero.count({ where: { usuarioId } });

  const compras = await prisma.compra.findMany({
    where: { usuarioId, terceroId: null },
    select: { id: true, proveedorNombre: true, proveedorNit: true, proveedorTipoDocumento: true, proveedorTel: true },
  });
  for (const c of compras) {
    const id = await resolverTercero(prisma, usuarioId, {
      nombre: c.proveedorNombre,
      documento: c.proveedorNit,
      tipoDocumento: c.proveedorTipoDocumento,
      telefono: c.proveedorTel,
    });
    if (!id) {
      resumen.sinDocumento += 1;
      continue;
    }
    await prisma.compra.update({ where: { id: c.id }, data: { terceroId: id } });
    resumen.comprasEnlazadas += 1;
  }

  const soportes = await prisma.documentoSoporte.findMany({
    where: { usuarioId, terceroId: null },
    select: { id: true, proveedorNombre: true, proveedorDocumento: true, proveedorTipoDocumento: true },
  });
  for (const s of soportes) {
    const id = await resolverTercero(prisma, usuarioId, {
      nombre: s.proveedorNombre,
      documento: s.proveedorDocumento,
      tipoDocumento: s.proveedorTipoDocumento,
    });
    if (!id) {
      resumen.sinDocumento += 1;
      continue;
    }
    await prisma.documentoSoporte.update({ where: { id: s.id }, data: { terceroId: id } });
    resumen.soportesEnlazados += 1;
  }

  resumen.tercerosCreados = (await prisma.tercero.count({ where: { usuarioId } })) - antes;
  return resumen;
}

/** Qué le falta a un tercero para poder reportarlo en exógena. */
export function pendientesDeTercero(t) {
  const criticos = [];
  const faltantes = [];

  if (!t.documento) criticos.push("Sin número de identificación");
  if (!t.tipoDocumentoDian) criticos.push("Sin tipo de documento DIAN");
  if (t.tipo === "natural") {
    if (!t.primerApellido || !t.primerNombre)
      criticos.push("Faltan apellidos y nombres separados");
  } else if (!t.razonSocial && !t.nombre) {
    criticos.push("Sin razón social");
  }

  if (!t.direccion) faltantes.push("Dirección");
  if (!t.codigoDepartamento || !t.codigoMunicipio)
    faltantes.push("Código DANE de departamento y municipio");
  if (!t.codigoPais) faltantes.push("País");

  return { criticos, faltantes };
}
