import chunk from 'lodash.chunk';
import { update, sparqlEscapeUri, sparqlEscapeString } from 'mu';
import { Quad, Literal, Resource, ChangeSet } from './types';
import { BATCH_SIZE } from './cfg';

export async function moveTriples(changesets: ChangeSet[]) {
  const executeInChunks = async (operation, changeset) => {
    for (let { graph, quads } of groupQuadsByGraph(changeset)) {
      for (let quadChunk of chunk(quads, BATCH_SIZE)) {
        await update(`${operation} DATA {
          GRAPH ${toSparqlTerm(graph)} {
            ${quadChunk.map(toSparqlTriple).join("\n")}
          }
        }`, { sudo: true });
      }
    }
  }

  for (const { inserts, deletes } of changesets) {
    await executeInChunks('DELETE', deletes);
    await executeInChunks('INSERT', inserts);
  }
}

export function groupQuadsByGraph(quads: Quad[]): { graph: Resource, quads: Quad[] }[] {
  let graphMap = new Map<string, Quad[]>();

  for (let quad of quads) {
    const graph = quad.graph;

    if (!graphMap.has(graph.value))
      graphMap.set(graph.value, []);

    graphMap.get(graph.value).push(quad);
  }

  return Array.from(graphMap.entries())
    .map(([graphUri, quads]): { graph: Resource, quads: Quad[] } => ({
      graph: { value: graphUri, type: 'uri' },
      quads
    }));
}

export function toSparqlTriple(quad: Quad): string {
  return `${toSparqlTerm(quad.subject)} ${toSparqlTerm(quad.predicate)} ${toSparqlTerm(quad.object)}.`;
}

export function toSparqlTerm(thing: Literal | Resource): string {
  if (thing.type == 'uri')
    return sparqlEscapeUri(thing.value);
  else if (thing.lang)
    // TODO: Switch to template implementation once that exists
    return `${sparqlEscapeString(thing.value)}@${sparqlEscapeString(thing.lang)}`;
  else if (thing.datatype)
    return `${sparqlEscapeString(thing.value)}^^${sparqlEscapeUri(thing.datatype)}`;
  else
    return sparqlEscapeString(thing.value);
}
