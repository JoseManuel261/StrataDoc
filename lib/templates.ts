/**
 * Plantillas de contenido predefinidas para StrataDOC.
 * Cada plantilla es contenido Tiptap JSON listo para insertar en un documento nuevo.
 * El usuario puede elegirlas al crear un documento en vez de empezar desde cero.
 */
import type { DocumentTemplate } from '@/lib/types'

export interface ContentTemplate {
  id:          string
  label:       string
  description: string
  template:    DocumentTemplate
  content:     Record<string, unknown>
}

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const h = (level: 1 | 2 | 3, text: string) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] })
const hr = () => ({ type: 'horizontalRule' })

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'blank',
    label: 'En blanco',
    description: 'Documento vacío, empieza desde cero',
    template: 'free',
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  },
  {
    id: 'sprint-report',
    label: 'Informe de sprint',
    description: 'Estructura para resumir un sprint de desarrollo',
    template: 'free',
    content: {
      type: 'doc',
      content: [
        h(1, 'Informe de Sprint'),
        p('Equipo: · Periodo: · Fecha:'),
        hr(),
        h(2, 'Resumen ejecutivo'),
        p('Describe brevemente los logros más importantes del sprint.'),
        h(2, 'Objetivos del sprint'),
        { type: 'bulletList', content: [
          { type: 'listItem', content: [p('Objetivo 1')] },
          { type: 'listItem', content: [p('Objetivo 2')] },
        ]},
        h(2, 'Tareas completadas'),
        { type: 'bulletList', content: [
          { type: 'listItem', content: [p('Tarea completada 1')] },
        ]},
        h(2, 'Tareas pendientes'),
        { type: 'bulletList', content: [
          { type: 'listItem', content: [p('Tarea pendiente 1')] },
        ]},
        h(2, 'Impedimentos'),
        p('Describe los bloqueos encontrados y cómo se resolvieron o se planea resolverlos.'),
        h(2, 'Métricas'),
        { type: 'bulletList', content: [
          { type: 'listItem', content: [p('Velocidad del equipo:')] },
          { type: 'listItem', content: [p('Story points completados / planificados:')] },
        ]},
        h(2, 'Plan para el próximo sprint'),
        p('Describe los objetivos y prioridades del siguiente sprint.'),
      ],
    },
  },
  {
    id: 'meeting-minutes',
    label: 'Acta de reunión',
    description: 'Registro formal de una reunión de equipo',
    template: 'free',
    content: {
      type: 'doc',
      content: [
        h(1, 'Acta de Reunión'),
        p('Fecha: · Hora: · Lugar / Plataforma:'),
        p('Moderador: · Secretario:'),
        hr(),
        h(2, 'Asistentes'),
        { type: 'bulletList', content: [
          { type: 'listItem', content: [p('Nombre — Rol')] },
        ]},
        h(2, 'Agenda'),
        { type: 'orderedList', content: [
          { type: 'listItem', content: [p('Punto 1')] },
          { type: 'listItem', content: [p('Punto 2')] },
        ]},
        h(2, 'Desarrollo'),
        h(3, 'Punto 1'),
        p('Resumen de lo discutido.'),
        h(3, 'Punto 2'),
        p('Resumen de lo discutido.'),
        h(2, 'Acuerdos y compromisos'),
        { type: 'bulletList', content: [
          { type: 'listItem', content: [p('Acción — Responsable — Fecha límite')] },
        ]},
        h(2, 'Próxima reunión'),
        p('Fecha: · Hora: · Temas propuestos:'),
      ],
    },
  },
  {
    id: 'apa-article',
    label: 'Artículo APA',
    description: 'Estructura completa para informe en formato APA',
    template: 'apa',
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Título del Trabajo' }] },
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'Autor(es)' }] },
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'Institución — Curso — Docente — Fecha' }] },
        hr(),
        h(2, 'Resumen'),
        p('El resumen debe contener entre 150 y 250 palabras. Describe el problema, la metodología, los resultados principales y las conclusiones.'),
        p('Palabras clave: término1, término2, término3.'),
        h(2, 'Introducción'),
        p('Presenta el tema, su relevancia y el objetivo del trabajo. Incluye el planteamiento del problema y las preguntas de investigación.'),
        h(2, 'Marco teórico'),
        p('Desarrolla los fundamentos teóricos que sustentan el trabajo. Cita las fuentes según el formato APA 7.ª edición (Autor, año, p. X).'),
        h(2, 'Metodología'),
        p('Describe el tipo de investigación, las técnicas e instrumentos utilizados, y los procedimientos seguidos.'),
        h(2, 'Resultados'),
        p('Presenta los hallazgos de forma objetiva, sin interpretación. Puedes incluir tablas y figuras numeradas.'),
        h(2, 'Discusión'),
        p('Interpreta los resultados en relación con el marco teórico. Señala limitaciones y posibles investigaciones futuras.'),
        h(2, 'Conclusiones'),
        p('Resume los hallazgos principales y responde a las preguntas de investigación planteadas en la introducción.'),
        h(2, 'Referencias'),
        p('Apellido, A. A., & Apellido, B. B. (Año). Título del artículo. Nombre de la Revista, Volumen(Número), páginas. https://doi.org/xxxxx'),
      ],
    },
  },
  {
    id: 'tech-doc',
    label: 'Documentación técnica',
    description: 'Template para documentar un componente, API o módulo',
    template: 'scientific',
    content: {
      type: 'doc',
      content: [
        h(1, 'Nombre del Componente / Módulo'),
        p('Descripción breve de qué hace y por qué existe.'),
        hr(),
        h(2, 'Instalación'),
        { type: 'codeBlock', attrs: { language: 'bash' }, content: [{ type: 'text', text: 'npm install nombre-del-paquete' }] },
        h(2, 'Uso básico'),
        { type: 'codeBlock', attrs: { language: 'typescript' }, content: [{ type: 'text', text: 'import { Component } from \'./component\'\n\n// ejemplo de uso' }] },
        h(2, 'API / Props'),
        { type: 'table', content: [
          { type: 'tableRow', content: [
            { type: 'tableHeader', content: [p('Prop')] },
            { type: 'tableHeader', content: [p('Tipo')] },
            { type: 'tableHeader', content: [p('Requerido')] },
            { type: 'tableHeader', content: [p('Descripción')] },
          ]},
          { type: 'tableRow', content: [
            { type: 'tableCell', content: [p('prop')] },
            { type: 'tableCell', content: [p('string')] },
            { type: 'tableCell', content: [p('Sí')] },
            { type: 'tableCell', content: [p('Descripción de la prop')] },
          ]},
        ]},
        h(2, 'Ejemplos'),
        p('Describe casos de uso concretos con ejemplos de código.'),
        h(2, 'Notas y limitaciones'),
        p('Describe comportamientos especiales, edge cases y limitaciones conocidas.'),
      ],
    },
  },
]
