import React, { useEffect, useState } from "react";

// PokedexApp.jsx
// App en React con TailwindCSS + PokeAPI
// Responsive: lista, búsqueda, cards, modal con stats, debilidades y evoluciones.

export default function PokedexApp() {
  const PAGE_LIMIT = 48;
  const [pokemons, setPokemons] = useState([]);
  const [offset, setOffset] = useState(0);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const cache = React.useRef({});

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://pokeapi.co/api/v2/pokemon?limit=${PAGE_LIMIT}&offset=${offset}`
      );
      const data = await res.json();
      setCount(data.count);

      const mapped = data.results.map((p) => {
        const id = extractIdFromUrl(p.url);
        return {
          name: p.name,
          url: p.url,
          id,
          image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        };
      });
      setPokemons((s) => [...s, ...mapped]);
      setOffset((o) => o + PAGE_LIMIT);
    } catch (err) {
      console.error(err);
      alert("Error al cargar Pokémon. Revisa tu conexión.");
    } finally {
      setLoading(false);
    }
  }

  function extractIdFromUrl(url) {
    const parts = url.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }

  async function openDetails(pokemon) {
    setSelected(null);
    setDetailLoading(true);
    try {
      const pokeRes = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${pokemon.id}`
      );
      const poke = await pokeRes.json();

      let species = cache.current[`species_${pokemon.id}`];
      if (!species) {
        const spRes = await fetch(poke.species.url);
        species = await spRes.json();
        cache.current[`species_${pokemon.id}`] = species;
      }

      let evolution = null;
      if (species?.evolution_chain?.url) {
        const evoUrl = species.evolution_chain.url;
        if (cache.current[evoUrl]) {
          evolution = cache.current[evoUrl];
        } else {
          const evoRes = await fetch(evoUrl);
          const evoJson = await evoRes.json();
          cache.current[evoUrl] = evoJson;
          evolution = evoJson;
        }
      }

      const typeNames = poke.types.map((t) => t.type.name);
      const weaknesses = await computeWeaknesses(typeNames);

      const stats = poke.stats.map((s) => ({
        name: s.stat.name,
        base: s.base_stat,
      }));
      const evolutions = parseEvolutionChain(evolution);

      setSelected({
        id: pokemon.id,
        name: poke.name,
        image: pokemon.image,
        stats,
        types: typeNames,
        weaknesses,
        evolutions,
        speciesData: species,
      });
    } catch (err) {
      console.error(err);
      alert("Error al cargar detalles del Pokémon.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function computeWeaknesses(typeNames) {
    const multipliers = {};
    for (const tname of typeNames) {
      const cacheKey = `type_${tname}`;
      let typeData = cache.current[cacheKey];
      if (!typeData) {
        const res = await fetch(`https://pokeapi.co/api/v2/type/${tname}`);
        typeData = await res.json();
        cache.current[cacheKey] = typeData;
      }
      const rel = typeData.damage_relations;
      rel.double_damage_from.forEach((t) => {
        multipliers[t.name] = (multipliers[t.name] || 1) * 2;
      });
      rel.half_damage_from.forEach((t) => {
        multipliers[t.name] = (multipliers[t.name] || 1) * 0.5;
      });
      rel.no_damage_from.forEach((t) => {
        multipliers[t.name] = 0;
      });
    }
    const arr = Object.entries(multipliers).map(([type, mul]) => ({
      type,
      multiplier: mul,
    }));
    arr.sort((a, b) => b.multiplier - a.multiplier);
    return arr;
  }

  function parseEvolutionChain(chainJson) {
    if (!chainJson) return [];
    const result = [];
    function walk(node, details = null) {
      if (!node) return;
      const speciesName = node.species.name;
      const id = extractIdFromUrl(node.species.url);
      const image = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

      result.push({ name: speciesName, id, image, details });

      if (node.evolves_to?.length) {
        node.evolves_to.forEach((n) =>
          walk(n, n.evolution_details?.[0] || null)
        );
      }
    }
    walk(chainJson.chain);
    return result;
  }

  function filteredPokemons() {
    if (!query) return pokemons;
    const q = query.toLowerCase();
    return pokemons.filter(
      (p) => p.name.includes(q) || `${p.id}` === q
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-center sm:text-left">
            🎮 Pokedex (PokeAPI)
          </h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o id..."
              className="w-full sm:w-64 border px-3 py-2 rounded-lg shadow-sm text-black"
            />
            <button
              onClick={() => {
                setPokemons([]);
                setOffset(0);
                loadMore();
              }}
              className="px-3 py-2 bg-sky-600 text-white rounded-lg w-full sm:w-auto"
            >
              Reiniciar
            </button>
          </div>
        </header>

        {/* Grid */}
        <main className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Lista de pokemons */}
          <section className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredPokemons().map((p) => (
                <article
                  key={p.id + p.name}
                  onClick={() => openDetails(p)}
                  className="cursor-pointer bg-gray-800 rounded-2xl p-3 shadow hover:shadow-lg transition flex flex-col items-center text-center"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain mb-2"
                  />
                  <div className="text-sm font-semibold capitalize">
                    {p.name}
                  </div>
                  <div className="text-xs text-gray-400">#{p.id}</div>
                </article>
              ))}
            </div>

            {/* Botón cargar más */}
            <div className="mt-6 flex items-center justify-center gap-3">
              {offset < (count || Infinity) && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg"
                >
                  {loading ? "Cargando..." : "Cargar más"}
                </button>
              )}
            </div>
          </section>

          {/* Aside */}
          <aside className="bg-gray-800 rounded-2xl p-4 shadow sticky top-6 text-sm">
            <h2 className="font-bold mb-2 text-base">Detalles rápidos</h2>
            <p className="text-gray-300 mb-4">
              Haz click en un Pokémon para ver sus estadísticas, debilidades y evolución.
            </p>
            <div>
              <div className="text-xs text-gray-400">Pokémon cargados</div>
              <div className="text-lg font-semibold">
                {pokemons.length}
                {count ? ` / ${count}` : ""}
              </div>
            </div>
            <div className="mt-4 text-gray-400">
              Datos de <strong>PokeAPI</strong>. Imágenes official-artwork.
            </div>
          </aside>
        </main>

        {/* Modal detalles */}
        {selected && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative text-white">
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
              >
                ✖
              </button>

              {detailLoading ? (
                <div>Cargando detalles...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Info básica */}
                  <div className="col-span-1 flex flex-col items-center">
                    <img
                      src={selected.image}
                      alt={selected.name}
                      className="w-40 h-40 sm:w-48 sm:h-48 object-contain"
                    />
                    <h3 className="capitalize text-2xl font-bold mt-2">
                      {selected.name}{" "}
                      <span className="text-gray-400">#{selected.id}</span>
                    </h3>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {selected.types.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-1 rounded-full border text-sm capitalize"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Info detallada */}
                  <div className="col-span-2">
                    {/* Stats */}
                    <section className="mb-4">
                      <h4 className="font-semibold">Estadísticas</h4>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {selected.stats.map((s) => (
                          <div
                            key={s.name}
                            className="flex items-center justify-between border rounded px-3 py-2"
                          >
                            <div className="capitalize text-sm">{s.name}</div>
                            <div className="font-mono">{s.base}</div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Debilidades */}
                    <section className="mb-4">
                      <h4 className="font-semibold">Debilidades</h4>
                      {selected.weaknesses.length === 0 ? (
                        <div className="text-sm text-gray-400 mt-2">
                          No hay datos de debilidades.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selected.weaknesses.map((w) => (
                            <div
                              key={w.type}
                              className="border rounded px-3 py-1 text-sm"
                            >
                              <span className="capitalize">{w.type}</span>:{" "}
                              <strong>{w.multiplier}×</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Evoluciones */}
                    <section className="mb-4">
                      <h4 className="font-semibold">Evoluciones</h4>
                      {selected.evolutions.length === 0 ? (
                        <div className="text-sm text-gray-400 mt-2">
                          Este Pokémon no tiene cadena de evolución.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-4 items-center mt-2">
                          {selected.evolutions.map((e, i) => (
                            <div
                              key={e.id}
                              className="flex flex-col items-center bg-gray-700 rounded-lg p-2"
                            >
                              <img
                                src={e.image}
                                alt={e.name}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                              />
                              <div className="capitalize text-sm">{e.name}</div>
                              {e.details && (
                                <div className="text-xs text-gray-300 mt-1 text-center">
                                  {e.details.trigger?.name === "level-up" &&
                                    e.details.min_level &&
                                    `Sube al nivel ${e.details.min_level}`}
                                  {e.details.trigger?.name === "use-item" &&
                                    `Usa ${e.details.item?.name}`}
                                  {e.details.trigger?.name === "trade" &&
                                    "Intercambio"}
                                </div>
                              )}
                              {i < selected.evolutions.length - 1 && (
                                <div className="text-xs text-gray-400">↓</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Datos especie */}
                    <section>
                      <h4 className="font-semibold">Datos de especie</h4>
                      <div className="text-sm text-gray-300 mt-2 max-h-40 overflow-auto">
                        {selected.speciesData ? (
                          <div>
                            <div>
                              <strong>Habitat:</strong>{" "}
                              {selected.speciesData.habitat
                                ? selected.speciesData.habitat.name
                                : "—"}
                            </div>
                            <div>
                              <strong>Color:</strong>{" "}
                              {selected.speciesData.color.name}
                            </div>
                            <div className="mt-2">
                              <strong>Genera:</strong>
                            </div>
                            <ul className="list-disc pl-5">
                              {selected.speciesData.genera.map((g, idx) => (
                                <li key={idx} className="capitalize text-xs">
                                  {g.genus} — {g.language.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div>No hay datos de especie.</div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
