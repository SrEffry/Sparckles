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
    //
    // AQUÍ ES DONDE SE UNIFICAN LOS ROLES: si este NIT ya existía como proveedor y ahora llega
    // como cliente (o al revés), se ENLAZA al mismo tercero y se le completan los huecos. Una
    // sola identidad por documento es justo lo que hace que el 1007 del receptor cruce contra
    // el 1001 del pagador.
    const parche = {};
    const completar = (campo, valor) => {
      if (!existente[campo] && valor) parche[campo] = typeof valor === "string" ? valor.trim() : valor;
    };
    completar("tipoDocumentoDian", tipoDian);
    completar("dv", dv);
    completar("telefono", datos.telefono);
    completar("email", datos.email);
    completar("direccion", datos.direccion);
    completar("codigoDepartamento", datos.codigoDepartamento);
    completar("codigoMunicipio", datos.codigoMunicipio);
    completar("codigoPais", datos.codigoPais);
    completar("primerApellido", datos.primerApellido);
    completar("segundoApellido", datos.segundoApellido);
    completar("primerNombre", datos.primerNombre);
    completar("otrosNombres", datos.otrosNombres);
    if (Object.keys(parche).length) {
      await tx.tercero.update({ where: { id: existente.id }, data: parche });
    }
    return existente.id;
  }

  // La longitud del número NO sirve para deducir el tipo de documento DIAN: las cédulas
  // emitidas desde ~1985 tienen 10 dígitos (serie 1.0xx.xxx.xxx), así que `>= 9 → NIT`
  // convierte en sociedad a la mayoría de las personas naturales de hoy. La exógena identifica
  // al tercero por el PAR (tipo, número) y ese par debe coincidir con el RUT: un tipo inventado
  // no falla aquí, falla cuando la DIAN no encuentra al tercero.
  //
  // Se usa solo como valor inicial del `tipo` (natural | juridica), que es una etiqueta de
  // presentación y la columna no admite null. El `tipoDocumentoDian` queda en NULL cuando nadie
  // lo dijo, y `pendientesDeTercero` lo saca como CRÍTICO hasta que alguien lo confirme: así el
  // tablero no declara listo a un tercero cuya identidad se adivinó.
  const esNit = tipoDian === "31" || numero.length >= 9;

  // El tipo puede venir dado (un cliente sabe si es natural o empresa); si no, se presume.
  const tipo = datos.tipo || (esNit ? "juridica" : "natural");

  const creado = await tx.tercero.create({
    data: {
      usuarioId,
      documento: numero,
      dv: dv || null,
      tipoDocumentoDian: tipoDian || null,
      tipo,
      nombre,
      razonSocial: tipo === "juridica" ? datos.razonSocial?.trim() || nombre : null,
      primerApellido: datos.primerApellido?.trim() || null,
      segundoApellido: datos.segundoApellido?.trim() || null,
      primerNombre: datos.primerNombre?.trim() || null,
      otrosNombres: datos.otrosNombres?.trim() || null,
      direccion: datos.direccion?.trim() || null,
      telefono: datos.telefono?.trim() || null,
      email: datos.email?.trim() || null,
      codigoDepartamento: datos.codigoDepartamento || null,
      codigoMunicipio: datos.codigoMunicipio || null,
      codigoPais: datos.codigoPais || null,
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
  const resumen = {
    comprasEnlazadas: 0,
    soportesEnlazados: 0,
    clientesEnlazados: 0,
    tercerosCreados: 0,
    sinDocumento: 0,
  };

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

  // Los CLIENTES también tienen identidad, y es la misma tabla. Si el NIT ya existía como
  // proveedor, se enlaza al mismo tercero en vez de crear un segundo: ese es el punto de la
  // unificación.
  const clientes = await prisma.cliente.findMany({
    where: { usuarioId, terceroId: null },
    select: {
      id: true, tipo: true, nombreCompleto: true, razonSocial: true, nit: true, dv: true,
      numeroDocumento: true, tipoDocumento: true, direccion: true, telefono: true, email: true,
    },
  });
  for (const c of clientes) {
    const esNatural = c.tipo === "natural";
    const id = await resolverTercero(prisma, usuarioId, {
      nombre: c.nombreCompleto,
      documento: esNatural ? c.numeroDocumento : c.nit,
      tipoDocumento: esNatural ? c.tipoDocumento : "NIT",
      tipo: esNatural ? "natural" : "juridica",
      razonSocial: c.razonSocial,
      direccion: c.direccion,
      telefono: c.telefono,
      email: c.email,
    });
    if (!id) {
      resumen.sinDocumento += 1;
      continue;
    }
    await prisma.cliente.update({ where: { id: c.id }, data: { terceroId: id } });
    resumen.clientesEnlazados += 1;
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
