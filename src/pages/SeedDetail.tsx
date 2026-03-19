import { useParams } from "react-router-dom";

export function SeedDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1>Seed Detail</h1>
      <p>Seed #{id}</p>
    </div>
  );
}
