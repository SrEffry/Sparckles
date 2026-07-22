# Skills del proyecto Sparkles

Las **skills** son instrucciones empaquetadas que Claude Code puede cargar para una tarea
concreta (un checklist de revisión, un flujo de despliegue, una convención del repo…). Viven en
esta carpeta y se comparten con todo el equipo vía git.

## Cómo agregar una skill

Cada skill es **una carpeta** con, como mínimo, un archivo `SKILL.md`:

```
.claude/skills/
├── mi-skill/
│   ├── SKILL.md            ← obligatorio (frontmatter + instrucciones)
│   ├── scripts/            ← opcional (código de apoyo)
│   └── references/         ← opcional (docs que la skill puede leer)
```

El `SKILL.md` lleva frontmatter YAML con **`name`** y **`description`**:

```markdown
---
name: mi-skill
description: Qué hace y CUÁNDO usarla. Esta línea es la que Claude lee para decidir si aplica,
  así que sé específico y menciona los disparadores (palabras/tareas) que la activan.
---

# Instrucciones

Aquí van los pasos que Claude debe seguir cuando se invoca esta skill.
Pueden referenciar archivos de la propia carpeta (scripts/, references/).
```

Reglas:
- El `name` debe coincidir con el nombre de la carpeta (kebab-case, sin espacios).
- La `description` es lo más importante: decide cuándo se activa. Escribe *cuándo* usarla.
- Todo lo que la skill necesite (scripts, plantillas, datos) va **dentro de su carpeta**.

## Cómo se usan

1. **Al iniciar la sesión**, Claude Code descubre las skills de esta carpeta. Si agregas una
   skill nueva mientras la sesión está abierta, **reinicia Claude Code** para que la vea
   (igual que pasa con los agentes de `.claude/agents/`).
2. Para invocarla explícitamente, escribe **`/nombre-de-la-skill`** en el chat.
3. También pueden activarse solas cuando la tarea coincide con su `description`.

## El flujo acordado con este proyecto

> Tú me subes la skill (o me dices dónde está) y, con un comando, me indicas cuál usar.
> Yo la coloco/valido en `.claude/skills/<nombre>/SKILL.md` con el formato correcto y, tras
> reiniciar, la invoco cuando me lo pidas.

Si me pasas el contenido de una skill "suelto" (sin estructura), yo me encargo de crear la
carpeta y el `SKILL.md` bien formado aquí.

## Plantilla

Copia `_plantilla/SKILL.md` como punto de partida (la carpeta `_plantilla` es solo ejemplo; su
`name` empieza con guion bajo para no activarse por accidente).
