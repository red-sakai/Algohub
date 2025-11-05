import BackgroundDoodles from "../components/sections/BackgroundDoodles";
import IrisOpenOnMount from "../components/ui/IrisOpenOnMount";

export default function LearnPage() {
  // For now, we only render the animated background and play iris open on arrival.
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-sky-500 to-green-300 text-white">
      <BackgroundDoodles />
      <IrisOpenOnMount />
    </main>
  );
}
