import { useParams } from "react-router-dom";

export function PlantingDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1>Planting Detail</h1>
      <p>Planting #{id}</p>
    </div>
  );
}
