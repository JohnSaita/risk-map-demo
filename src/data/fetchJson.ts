/** Fetches a JSON file from public/data/. */
export const fetchJson = async <T>(file: string): Promise<T> => {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!response.ok) throw new Error(`Could not load ${file} (HTTP ${response.status})`);
  return response.json() as Promise<T>;
};
