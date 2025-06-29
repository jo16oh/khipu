export async function fetchYUpdates(id: string) {
  const res = await fetch(`bin://y_updates/${id}`);
  const blob = await res.blob();
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}
