export function coverKey(destination: string) {
  const text = destination.toLowerCase();
  if (text.includes("kenya") || text.includes("mara")) return "safari";
  if (text.includes("dubai") || text.includes("abu")) return "dubai";
  if (text.includes("france") || text.includes("europe") || text.includes("netherlands") || text.includes("germany")) return "europe";
  if (text.includes("cape") || text.includes("kakum") || text.includes("heritage") || text.includes("accra")) return "coast";
  return "accra";
}

export function Cover({ destination, label }: { destination: string; label?: string }) {
  return (
    <div className={`cover ${coverKey(destination)}`}>
      <span>{label ?? destination}</span>
    </div>
  );
}
