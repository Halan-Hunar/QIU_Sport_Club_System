// Supabase's default row cap must not silently truncate sporting calculations.
// Stable ordering and bounded pages keep each response small. Large reports fail
// explicitly rather than returning plausible but incomplete totals.
export async function readAllRows(query, { pageSize = 500, maxRows = 100000 } = {}) {
  const rows = [];
  query.order('id', { ascending: true });
  for (let offset = 0; offset <= maxRows; offset += pageSize) {
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid database response');
    rows.push(...data);
    if (rows.length > maxRows) throw new Error('Report exceeds supported row count');
    if (data.length < pageSize) return { data: rows, error: null };
  }
  throw new Error('Report exceeds supported row count');
}
